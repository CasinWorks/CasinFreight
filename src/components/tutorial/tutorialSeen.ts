const storageKey = (uid: string) => `casinfreight.has_seen_tutorial.${uid}`;

export function hasSeenTutorialLocally(uid?: string): boolean {
  if (!uid) return false;
  try {
    return window.localStorage.getItem(storageKey(uid)) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeenLocally(uid?: string): void {
  if (!uid) return;
  try {
    window.localStorage.setItem(storageKey(uid), '1');
  } catch {
    // Ignore private-mode storage failures; Firestore remains the server copy.
  }
}
