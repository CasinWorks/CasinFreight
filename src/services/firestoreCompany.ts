import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import { Company, Subscription, User } from '../types';
import { RbacAuditEntry, RbacRole } from '../types/rbac';

export type WorkspaceCollection =
  | 'roles'
  | 'members'
  | 'trucks'
  | 'drivers'
  | 'clients'
  | 'rateCards'
  | 'truckBans'
  | 'trips'
  | 'invoices'
  | 'fuelLogs'
  | 'journalEntries'
  | 'notifications'
  | 'auditLogs'
  | 'liveTracking'
  | 'fieldEvents';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const next: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val === undefined) return;
      next[key] = stripUndefined(val);
    });
    return next as T;
  }
  return value;
}

function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export interface CompanyDocument extends Company {
  createdBy: string;
  onboardingComplete: boolean;
  subscription: Subscription;
  chartOfAccounts?: DocumentData[];
}

export interface UserProfile extends User {
  uid: string;
  status: 'active' | 'invited';
  has_seen_tutorial?: boolean;
}

export interface TeamInvite {
  email: string;
  name: string;
  role: string;
  companyId: string;
  invitedBy: string;
  createdAt: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const { password: _password, ...safe } = profile;
  await setDoc(doc(getFirebaseDb(), 'users', profile.uid || profile.id), stripUndefined(safe as unknown as Record<string, unknown>));
}

export async function saveMemberProfile(companyId: string, profile: UserProfile): Promise<void> {
  const { password: _password, ...safe } = profile;
  await setDoc(
    doc(getFirebaseDb(), 'companies', companyId, 'members', profile.id),
    stripUndefined(safe as unknown as Record<string, unknown>)
  );
}

export async function deleteOwnAccountRecords(params: { uid: string; companyId: string }): Promise<void> {
  if (!params.companyId || !params.uid) {
    throw new Error('Account records are incomplete. Sign in again and try again.');
  }
  await deleteDoc(doc(getFirebaseDb(), 'companies', params.companyId, 'members', params.uid));
  await deleteDoc(doc(getFirebaseDb(), 'users', params.uid));
}

export async function getCompanyDocument(companyId: string): Promise<CompanyDocument | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'companies', companyId));
  return snap.exists() ? (snap.data() as CompanyDocument) : null;
}

export async function saveCompanyDocument(
  company: CompanyDocument,
  options?: { writeBilling?: boolean }
): Promise<void> {
  const payload = stripUndefined(company as unknown as Record<string, unknown>) as Record<string, unknown>;
  if (!options?.writeBilling) {
    delete payload.subscription;
    delete payload.subscriptionTier;
  }
  // Usage is incremented atomically on upload. Never overwrite it from a stale client snapshot.
  delete payload.storageUsedBytes;
  // Sales attribution is platform-admin only. Workspace persist must not clear or spoof it.
  delete payload.salesAgentId;
  await setDoc(doc(getFirebaseDb(), 'companies', company.id), payload, { merge: true });
}

export function listenCompanyBilling(
  companyId: string,
  onData: (billing: {
    subscription?: Subscription;
    subscriptionTier?: Company['subscriptionTier'];
    storageUsedBytes?: number;
  }) => void
): Unsubscribe {
  return onSnapshot(doc(getFirebaseDb(), 'companies', companyId), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as CompanyDocument;
    onData({
      subscription: data.subscription,
      subscriptionTier: data.subscriptionTier,
      storageUsedBytes: Number(data.storageUsedBytes) || 0,
    });
  });
}

export async function getInviteByEmail(email: string): Promise<TeamInvite | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'invites', emailKey(email)));
    return snap.exists() ? (snap.data() as TeamInvite) : null;
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code.includes('permission-denied')) return null;
    throw error;
  }
}

export async function saveInvite(invite: TeamInvite): Promise<void> {
  if (String(invite.role || '').toLowerCase() === 'owner') {
    throw new Error('Invite a working role such as Dispatcher or Driver. Owner cannot be invited.');
  }
  await setDoc(doc(getFirebaseDb(), 'invites', emailKey(invite.email)), stripUndefined(invite as unknown as Record<string, unknown>));
}

export async function deleteInvite(email: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'invites', emailKey(email)));
}

export async function removeCompanyMember(params: {
  companyId: string;
  memberId: string;
  email?: string;
}): Promise<void> {
  const { companyId, memberId, email } = params;
  if (!companyId || !memberId) {
    throw new Error('That teammate record is incomplete.');
  }

  if (email) {
    try {
      await deleteInvite(email);
    } catch {
      // Pending invite may already be gone.
    }
  }

  try {
    await deleteDoc(doc(getFirebaseDb(), 'companies', companyId, 'members', memberId));
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code.includes('permission-denied')) {
      throw new Error('Firestore blocked removing this teammate. In Firebase Console → Firestore → Rules, paste firestore.rules from this project, click Publish, then try Remove again.');
    }
    if (!code.includes('not-found')) throw error;
  }

  if (memberId.startsWith('invite-')) return;

  const userRef = doc(getFirebaseDb(), 'users', memberId);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists() && String(snap.data()?.companyId || '') === companyId) {
      await deleteDoc(userRef);
    }
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code.includes('permission-denied')) {
      throw new Error('They were taken off the roster, but their login is still tied to this company. Publish firestore.rules, then Remove again.');
    }
    if (!code.includes('not-found')) throw error;
  }
}

export async function listCompanyUserProfiles(companyId: string): Promise<UserProfile[]> {
  if (!companyId) return [];
  const snap = await getDocs(
    query(collection(getFirebaseDb(), 'users'), where('companyId', '==', companyId))
  );
  return snap.docs.map((d) => ({ ...(d.data() as UserProfile), id: d.id, uid: d.id }));
}

export async function untieCompanyLogin(params: { companyId: string; uid: string }): Promise<void> {
  const { companyId, uid } = params;
  if (!companyId || !uid) {
    throw new Error('That login record is incomplete.');
  }
  const userRef = doc(getFirebaseDb(), 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  if (String(snap.data()?.companyId || '') !== companyId) {
    throw new Error('That login is not tied to this company.');
  }
  try {
    await deleteDoc(userRef);
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
    if (code.includes('permission-denied')) {
      throw new Error('Firestore blocked untying this login. Publish firestore.rules, then try again.');
    }
    throw error;
  }
}

export async function loadCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection
): Promise<T[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'companies', companyId, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export function listenCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection,
  onData: (items: T[]) => void
): Unsubscribe {
  const colRef = collection(getFirebaseDb(), 'companies', companyId, name);
  return onSnapshot(
    colRef,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
    },
    (error) => {
      console.error(`Firestore listen failed for ${name}`, error);
    }
  );
}

export async function replaceCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection,
  items: T[],
  options?: { merge?: boolean; previousIds?: Iterable<string>; incomingIds?: Iterable<string> }
): Promise<void> {
  if (!companyId) return;
  const merge = Boolean(options?.merge);
  const db = getFirebaseDb();
  const colRef = collection(db, 'companies', companyId, name);
  const incomingIds = new Set(
    options?.incomingIds
      ? [...options.incomingIds]
      : items.map((item) => item.id).filter(Boolean)
  );
  const previousIds = options?.previousIds
    ? [...options.previousIds]
    : (await getDocs(colRef)).docs.map((docSnap) => docSnap.id);

  let batch = writeBatch(db);
  let ops = 0;

  const commitIfNeeded = async () => {
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  for (const id of previousIds) {
    if (!incomingIds.has(id)) {
      batch.delete(doc(colRef, id));
      ops += 1;
      await commitIfNeeded();
    }
  }

  for (const item of items) {
    if (!item.id) continue;
    const { password: _password, ...rest } = item as T & { password?: string };
    batch.set(
      doc(colRef, item.id),
      stripUndefined(rest as unknown as Record<string, unknown>),
      { merge }
    );
    ops += 1;
    await commitIfNeeded();
  }

  if (ops > 0) {
    await batch.commit();
  }
}

export async function upsertCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection,
  items: T[]
): Promise<void> {
  if (!companyId || items.length === 0) return;
  const db = getFirebaseDb();
  const colRef = collection(db, 'companies', companyId, name);
  let batch = writeBatch(db);
  let ops = 0;

  for (const item of items) {
    if (!item.id) continue;
    const { password: _password, ...rest } = item as T & { password?: string };
    batch.set(
      doc(colRef, item.id),
      stripUndefined(rest as unknown as Record<string, unknown>),
      { merge: true }
    );
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) await batch.commit();
}

export async function seedCompanyWorkspace(params: {
  uid: string;
  email: string;
  name: string;
  companyName: string;
  role: RbacRole;
  subscription: Subscription;
}): Promise<{ company: CompanyDocument; profile: UserProfile }> {
  const companyId = `comp-${params.uid.slice(0, 10)}`;
  const now = new Date().toISOString();

  const company: CompanyDocument = {
    id: companyId,
    name: params.companyName,
    tin: '',
    address: '',
    contactNumber: '',
    email: params.email,
    subscriptionTier: 'Free',
    currency: 'PHP',
    registeredDate: now.slice(0, 10),
    storageUsedBytes: 0,
    createdBy: params.uid,
    onboardingComplete: false,
    subscription: { ...params.subscription, company_id: companyId, user_id: params.uid },
  };

  const profile: UserProfile = {
    id: params.uid,
    uid: params.uid,
    name: params.name,
    email: params.email,
    role: 'Owner',
    companyId,
    department: 'Executive Board',
    status: 'active',
    has_seen_tutorial: false,
  };

  // Company first so user create can prove createdBy, without letting a new account join an arbitrary companyId.
  await saveCompanyDocument(company, { writeBilling: true });
  await saveUserProfile(profile);
  await setDoc(
    doc(getFirebaseDb(), 'companies', companyId, 'roles', params.role.id),
    stripUndefined(params.role as unknown as Record<string, unknown>)
  );
  await setDoc(
    doc(getFirebaseDb(), 'companies', companyId, 'members', profile.id),
    stripUndefined(profile as unknown as Record<string, unknown>)
  );

  return { company, profile };
}

export async function joinCompanyFromInvite(params: {
  uid: string;
  email: string;
  name: string;
  invite: TeamInvite;
}): Promise<{ company: CompanyDocument; profile: UserProfile }> {
  const profile: UserProfile = {
    id: params.uid,
    uid: params.uid,
    name: params.name || params.invite.name,
    email: params.email,
    role: params.invite.role,
    companyId: params.invite.companyId,
    status: 'active',
    has_seen_tutorial: false,
  };

  const userRef = doc(getFirebaseDb(), 'users', params.uid);
  const existing = await getDoc(userRef);
  const existingCompanyId = existing.exists() ? String(existing.data()?.companyId || '') : '';
  if (!existing.exists()) {
    await saveUserProfile(profile);
  } else if (existingCompanyId && existingCompanyId !== params.invite.companyId) {
    throw new Error('This login is still tied to another company. Ask that owner to Untie login, then open this join link again.');
  }

  const company = await getCompanyDocument(params.invite.companyId);
  if (!company) {
    throw new Error('The company on this invite no longer exists.');
  }

  await setDoc(
    doc(getFirebaseDb(), 'companies', params.invite.companyId, 'members', params.uid),
    stripUndefined(profile as unknown as Record<string, unknown>)
  );
  await deleteInvite(params.email);
  return { company, profile };
}

export function createAuditLog(companyId: string, entry: RbacAuditEntry): Promise<void> {
  return setDoc(
    doc(getFirebaseDb(), 'companies', companyId, 'auditLogs', entry.id),
    stripUndefined(entry as unknown as Record<string, unknown>)
  );
}

export async function listCompanyDocuments(): Promise<CompanyDocument[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'companies'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as CompanyDocument) }));
}

const WORKSPACE_COLLECTIONS: WorkspaceCollection[] = [
  'roles',
  'members',
  'trucks',
  'drivers',
  'clients',
  'rateCards',
  'truckBans',
  'trips',
  'invoices',
  'fuelLogs',
  'journalEntries',
  'notifications',
  'auditLogs',
  'liveTracking',
  'fieldEvents',
];

async function deleteCollectionDocs(companyId: string, name: WorkspaceCollection): Promise<void> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, 'companies', companyId, name));
  let batch = writeBatch(db);
  let ops = 0;
  for (const item of snap.docs) {
    batch.delete(item.ref);
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
}

export async function deleteCompanyWorkspace(params: {
  companyId: string;
  memberIds: string[];
  memberEmails: string[];
}): Promise<void> {
  const db = getFirebaseDb();
  const { companyId, memberIds, memberEmails } = params;

  for (const uid of memberIds.filter(Boolean)) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      console.error('Could not remove user profile during company delete', uid, error);
    }
  }

  for (const email of memberEmails.filter(Boolean)) {
    try {
      await deleteInvite(email);
    } catch {
      // Pending invites may already be gone.
    }
  }

  for (const name of WORKSPACE_COLLECTIONS) {
    await deleteCollectionDocs(companyId, name);
  }

  await deleteDoc(doc(db, 'companies', companyId));
}

export async function saveCompanySubscription(
  companyId: string,
  subscription: Subscription,
  subscriptionTier: Company['subscriptionTier']
): Promise<void> {
  const existing = await getCompanyDocument(companyId);
  if (!existing) throw new Error('Company workspace was not found.');
  await saveCompanyDocument({
    ...existing,
    subscription,
    subscriptionTier,
  }, { writeBilling: true });
}

export async function incrementCompanyStorage(companyId: string, bytes: number): Promise<void> {
  if (!companyId || !bytes) return;
  await updateDoc(doc(getFirebaseDb(), 'companies', companyId), {
    storageUsedBytes: increment(bytes),
  });
}
