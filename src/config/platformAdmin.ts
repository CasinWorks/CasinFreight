import type { User as FirebaseAuthUser } from 'firebase/auth';

/** Platform admin is `request.auth.token.admin`, stamped by POST /api/session. Not an email list in the bundle. */
export async function refreshPlatformAdminClaim(user: FirebaseAuthUser): Promise<boolean> {
  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (response.ok) {
      const data = (await response.json()) as { refreshed?: boolean };
      if (data.refreshed) {
        await user.getIdToken(true);
      }
    }
  } catch {
    // Local Vite without Admin SDK still works after prod has stamped the claim once.
  }
  const result = await user.getIdTokenResult();
  return result.claims.admin === true;
}
