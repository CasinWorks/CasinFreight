import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

/**
 * New hires join with the copied link `/?join=1&email=...` and choose a
 * password on that page. Do not pre-create a Firebase login with a random
 * password — that blocks the hire from setting their own password.
 */
export async function sendPasswordResetForExistingLogin(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}
