import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type DocumentData,
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
  | 'trips'
  | 'invoices'
  | 'fuelLogs'
  | 'journalEntries'
  | 'notifications'
  | 'auditLogs';

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const next: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, val]) => {
    if (val !== undefined) next[key] = val;
  });
  return next as T;
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

export async function getCompanyDocument(companyId: string): Promise<CompanyDocument | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'companies', companyId));
  return snap.exists() ? (snap.data() as CompanyDocument) : null;
}

export async function saveCompanyDocument(company: CompanyDocument): Promise<void> {
  await setDoc(doc(getFirebaseDb(), 'companies', company.id), stripUndefined(company as unknown as Record<string, unknown>));
}

export async function getInviteByEmail(email: string): Promise<TeamInvite | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'invites', emailKey(email)));
  return snap.exists() ? (snap.data() as TeamInvite) : null;
}

export async function saveInvite(invite: TeamInvite): Promise<void> {
  await setDoc(doc(getFirebaseDb(), 'invites', emailKey(invite.email)), stripUndefined(invite as unknown as Record<string, unknown>));
}

export async function deleteInvite(email: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'invites', emailKey(email)));
}

export async function loadCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection
): Promise<T[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'companies', companyId, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function replaceCollection<T extends { id: string }>(
  companyId: string,
  name: WorkspaceCollection,
  items: T[]
): Promise<void> {
  if (!companyId) return;
  const db = getFirebaseDb();
  const colRef = collection(db, 'companies', companyId, name);
  const existing = await getDocs(colRef);
  const incomingIds = new Set(items.map((item) => item.id));

  let batch = writeBatch(db);
  let ops = 0;

  const commitIfNeeded = async () => {
    if (ops >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  for (const docSnap of existing.docs) {
    if (!incomingIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
      ops += 1;
      await commitIfNeeded();
    }
  }

  for (const item of items) {
    const { password: _password, ...rest } = item as T & { password?: string };
    batch.set(doc(colRef, item.id), stripUndefined(rest as unknown as Record<string, unknown>));
    ops += 1;
    await commitIfNeeded();
  }

  if (ops > 0) {
    await batch.commit();
  }
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

  await saveCompanyDocument(company);
  await saveUserProfile(profile);
  await replaceCollection<RbacRole>(companyId, 'roles', [params.role]);
  await replaceCollection<UserProfile>(companyId, 'members', [profile]);

  return { company, profile };
}

export async function joinCompanyFromInvite(params: {
  uid: string;
  email: string;
  name: string;
  invite: TeamInvite;
}): Promise<{ company: CompanyDocument; profile: UserProfile }> {
  const company = await getCompanyDocument(params.invite.companyId);
  if (!company) {
    throw new Error('The company on this invite no longer exists.');
  }

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

  await saveUserProfile(profile);
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
