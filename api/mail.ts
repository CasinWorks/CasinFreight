import { requireFirebaseUser } from './firebaseUser';

type MailBody = {
  kind?: string;
  to?: string;
  inviteName?: string;
  role?: string;
  companyName?: string;
  invitedBy?: string;
  inviteUrl?: string;
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendInviteEmail(input: {
  to: string;
  inviteName: string;
  role: string;
  companyName: string;
  invitedBy: string;
  inviteUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY is not set. Copy the invite link instead.' };
  }
  const from = (process.env.RESEND_FROM || 'CasinFreight <beth.t@example.com>').trim();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `You’re invited to ${input.companyName} on CasinFreight`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <h1 style="font-size:20px">Join ${escapeHtml(input.companyName)} on CasinFreight</h1>
          <p>${escapeHtml(input.invitedBy)} invited ${escapeHtml(input.inviteName || input.to)} as <strong>${escapeHtml(input.role)}</strong>.</p>
          <p>Create your password with this same email to open the workspace:</p>
          <p><a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">Accept invite</a></p>
          <p style="font-size:12px;color:#64748b">If the button does not work, paste this link:<br/>${escapeHtml(input.inviteUrl)}</p>
        </div>
      `,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    return { sent: false, error: payload.message || 'Could not send the invite email.' };
  }
  return { sent: true };
}

export async function runMailAction(
  body: MailBody,
  authHeader = ''
): Promise<{ status: number; data: unknown }> {
  const caller = await requireFirebaseUser(authHeader);
  if (!caller) {
    return { status: 401, data: { error: 'Sign in required.' } };
  }
  const kind = (body.kind || 'invite').toLowerCase();
  if (kind !== 'invite') {
    return { status: 400, data: { error: 'Unknown mail kind.' } };
  }
  const to = (body.to || '').trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return { status: 400, data: { error: 'A valid invite email is required.' } };
  }
  const result = await sendInviteEmail({
    to,
    inviteName: body.inviteName || to,
    role: body.role || 'Dispatcher',
    companyName: body.companyName || 'CasinFreight',
    invitedBy: body.invitedBy || caller.email || 'Your fleet owner',
    inviteUrl: body.inviteUrl || '',
  });
  return { status: result.sent ? 200 : 503, data: result };
}

export const config = { runtime: 'nodejs' };

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => ({})) as MailBody;
    const result = await runMailAction(body, request.headers.get('authorization') || '');
    return jsonResponse(result.data, result.status);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Mail request failed.' },
      500
    );
  }
}

export default async function handler(req: Request): Promise<Response> {
  return POST(req);
}
