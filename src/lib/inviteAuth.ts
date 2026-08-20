import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

/**
 * Firebase Auth has no custom “invite teammate” template. The working path is:
 * create the login (without switching the owner’s session), then send the same
 * password-setup email used by Forgot password.
 */
export async function sendFirebaseInviteEmail(email: string, continueUrl: string): Promise<void> {
  await ensureAuthUserExists(email);
  await sendPasswordResetEmail(getFirebaseAuth(), email, { url: continueUrl });
}

async function ensureAuthUserExists(email: string): Promise<void> {
  const apiKey = getFirebaseAuth().app.options.apiKey;
  if (!apiKey) {
    throw new Error('Firebase API key is missing.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: `${crypto.randomUUID()}Aa1!`,
        returnSecureToken: false,
      }),
    }
  );

  if (response.ok) return;

  const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
  const message = payload.error?.message || '';
  if (message.includes('EMAIL_EXISTS')) return;
  throw new Error(humanizeIdentityError(message) || 'Could not prepare the invited Firebase login.');
}

function humanizeIdentityError(message: string): string {
  if (message.includes('INVALID_EMAIL')) return 'Enter a valid work email.';
  if (message.includes('TOO_MANY_ATTEMPTS')) return 'Too many invite attempts. Wait a minute and try again.';
  return message.replace(/_/g, ' ').trim();
}
