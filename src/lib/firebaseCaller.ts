export type FirebaseCaller = { uid: string; email?: string };

export async function requireFirebaseUser(authHeader: string): Promise<FirebaseCaller | null> {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const apiKey = (process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || '').trim();
  if (!apiKey) return null;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    }
  );
  if (!response.ok) return null;
  const payload = await response.json() as { users?: Array<{ localId?: string; email?: string }> };
  const user = payload.users?.[0];
  if (!user?.localId) return null;
  return { uid: user.localId, email: user.email };
}
