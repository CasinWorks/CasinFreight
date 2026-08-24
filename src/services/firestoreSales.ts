import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../lib/firebase';
import {
  PERPETUAL_COMMISSION_RATE,
  PERPETUAL_LICENSE_PHP,
  PERPETUAL_SUPPORT_PHP,
  saasCommissionPhp,
  saasCommissionRate,
} from '../lib/subscriptionPrice';
import type { AgentCommissionEntry, AgentCommissionKind, AgentPayout, SalesAgent } from '../types';
import type { CompanyDocument } from './firestoreCompany';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
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

function payMongoIds(subscription?: CompanyDocument['subscription']): string[] {
  const ids = [
    ...((subscription?.consumed_payment_ids || []) as string[]),
    subscription?.payment_provider_checkout_id,
  ].filter((id): id is string => Boolean(id) && String(id).startsWith('pay_'));
  return [...new Set(ids)];
}

export function newSalesAgentId() {
  return `agt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function listSalesAgents(): Promise<SalesAgent[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'salesAgents'));
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as SalesAgent) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveSalesAgent(agent: SalesAgent): Promise<void> {
  const now = new Date().toISOString();
  const payload: SalesAgent = {
    ...agent,
    name: agent.name.trim(),
    email: agent.email.trim().toLowerCase(),
    phone: agent.phone?.trim() || undefined,
    notes: agent.notes?.trim() || undefined,
    updatedAt: now,
    createdAt: agent.createdAt || now,
  };
  await setDoc(doc(getFirebaseDb(), 'salesAgents', payload.id), stripUndefined(payload));
}

export async function listAgentCommissions(agentId: string): Promise<AgentCommissionEntry[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'salesAgents', agentId, 'commissions'));
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as AgentCommissionEntry) }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listAgentPayouts(agentId: string): Promise<AgentPayout[]> {
  const snap = await getDocs(collection(getFirebaseDb(), 'salesAgents', agentId, 'payouts'));
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as AgentPayout) }))
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
}

export async function saveCommission(entry: AgentCommissionEntry): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), 'salesAgents', entry.agentId, 'commissions', entry.id),
    stripUndefined(entry)
  );
}

export async function savePayout(payout: AgentPayout): Promise<void> {
  await setDoc(
    doc(getFirebaseDb(), 'salesAgents', payout.agentId, 'payouts', payout.id),
    stripUndefined(payout)
  );
}

export async function setCompanySalesAgent(companyId: string, salesAgentId: string | null): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'companies', companyId), {
    salesAgentId: salesAgentId || deleteField(),
  });
}

export function summarizeLedger(commissions: AgentCommissionEntry[], payouts: AgentPayout[]) {
  const earnedPhp = commissions.reduce((sum, row) => sum + (Number(row.commissionPhp) || 0), 0);
  const paidPhp = payouts.reduce((sum, row) => sum + (Number(row.amountPhp) || 0), 0);
  return { earnedPhp, paidPhp, outstandingPhp: earnedPhp - paidPhp };
}

export function saasEntryFromPayment(params: {
  agentId: string;
  company: CompanyDocument;
  paymentId: string;
  billedPhp: number;
  paymentNumber: number;
}): AgentCommissionEntry | null {
  const billedPhp = Math.max(0, Number(params.billedPhp) || 0);
  const rate = saasCommissionRate(params.paymentNumber);
  const commissionPhp = saasCommissionPhp(params.paymentNumber, billedPhp);
  if (!params.agentId || !params.paymentId || billedPhp <= 0 || commissionPhp <= 0) return null;
  return {
    id: `saas-${params.paymentId}`,
    agentId: params.agentId,
    companyId: params.company.id,
    companyName: params.company.name || params.company.email || params.company.id,
    kind: 'saas',
    paymentId: params.paymentId,
    paymentNumber: params.paymentNumber,
    billedPhp,
    rate,
    commissionPhp,
    createdAt: new Date().toISOString(),
  };
}

/** If this company already paid via PayMongo, credit the latest payment once the agent is assigned. */
export async function backfillLatestSaasCommission(company: CompanyDocument): Promise<boolean> {
  const agentId = String(company.salesAgentId || '').trim();
  if (!agentId || company.subscription?.plan_id !== 'plan_founding') return false;
  const billedPhp = Number(company.subscription?.last_billed_amount_php || 0);
  const ids = payMongoIds(company.subscription);
  const paymentId = ids[ids.length - 1];
  const entry = saasEntryFromPayment({
    agentId,
    company,
    paymentId,
    billedPhp,
    paymentNumber: Math.max(1, ids.length),
  });
  if (!entry) return false;
  const agents = await listSalesAgents();
  for (const agent of agents) {
    const existing = await getDoc(doc(getFirebaseDb(), 'salesAgents', agent.id, 'commissions', entry.id));
    if (existing.exists()) return false;
  }
  await saveCommission(entry);
  return true;
}

export function licenseCommissionEntry(params: {
  agentId: string;
  company: CompanyDocument;
  kind: Extract<AgentCommissionKind, 'perpetual' | 'support'>;
  billedPhp?: number;
}): AgentCommissionEntry {
  const billedPhp = Math.max(
    0,
    Number(params.billedPhp) || (params.kind === 'support' ? PERPETUAL_SUPPORT_PHP : PERPETUAL_LICENSE_PHP)
  );
  const year = new Date().getFullYear();
  return {
    id: params.kind === 'perpetual' ? `perpetual-${params.company.id}` : `support-${params.company.id}-${year}`,
    agentId: params.agentId,
    companyId: params.company.id,
    companyName: params.company.name || params.company.email || params.company.id,
    kind: params.kind,
    paymentId: params.kind === 'perpetual' ? `license-${params.company.id}` : `support-${params.company.id}-${year}`,
    billedPhp,
    rate: PERPETUAL_COMMISSION_RATE,
    commissionPhp: Math.round(billedPhp * PERPETUAL_COMMISSION_RATE),
    createdAt: new Date().toISOString(),
  };
}
