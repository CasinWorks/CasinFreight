import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { 
  Company, 
  User, 
  UserRole, 
  RolePermissionCheck,
  Truck, 
  Driver, 
  Client, 
  RateCard, 
  TruckBan, 
  Trip, 
  TripStatus, 
  TripAccessorial, 
  TripRetractionReasonCategory,
  TripStatusRetractionRequest,
  POD, 
  FieldEvent,
  LiveTracking, 
  Invoice, 
  InvoiceStatus,
  InvoiceRetractionRequest,
  RetractionReasonCategory,
  ProofOfPayment,
  TruckType,
  AppNotification,
  FuelLog,
  TruckFuelSummary,
  FuelPaymentMethod,
  ChartOfAccount,
  JournalEntry,
  JournalEntryLine,
  Plan,
  Subscription,
  BillingHistoryItem,
  SubscriptionUsageStats,
  PayMongoPaymentMethod,
  RbacRole,
  RbacAuditEntry,
  PlatformNotice,
} from '../types';
import { DEFAULT_RBAC_ROLES, OWNER_RBAC_ROLE, buildAuditEntry, checkPermission, ensureDefaultSystemRoles, getAllowedRolesForPermission, isTripRetractionApprover } from '../services/rbac';
import { initialChartOfAccounts } from '../data/mockData';
import { getFirebaseAuth, isFirebaseConfigured, setAuthRememberMe } from '../lib/firebase';
import { METRO_MANILA_TRUCK_BAN_PRESETS } from '../lib/truckBans';
import { 
  CompanyDocument,
  UserProfile,
  createAuditLog,
  getCompanyDocument,
  getInviteByEmail,
  getUserProfile,
  joinCompanyFromInvite,
  ensureDriverRosterForLogin,
  isClientPortalInvite,
  listCompanyDocuments,
  loadCollection,
  loadCollectionWhere,
  listenCollection,
  listenCollectionWhere,
  listenCompanyBilling,
  replaceCollection,
  upsertCollection,
  incrementCompanyStorage,
  saveCompanyDocument,
  saveCompanySubscription,
  saveInvite,
  saveUserProfile,
  saveMemberProfile,
  stampUserPresence,
  deleteOwnAccountRecords,
  removeCompanyMember,
  listCompanyUserProfiles,
  untieCompanyLogin,
  seedCompanyWorkspace,
  deleteCompanyWorkspace as deleteCompanyWorkspaceDocs,
  type WorkspaceCollection,
} from '../services/firestoreCompany';
import { deletePlatformNotice as deletePlatformNoticeDoc, listenPlatformNotices, savePlatformNotice as savePlatformNoticeDoc, activeDowntimeNotice } from '../services/firestoreNotices';
import { saveWeeklyBackup } from '../lib/weeklyBackupStore';
import { syncDeviceEvidence } from '../lib/deviceEvidence';
import { 
  BACKUP_COLLECTIONS,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  mergeChartOfAccounts,
  remapCompanyId,
  stripSecrets,
  type BackupRecord,
  type WorkspaceBackup,
} from '../lib/workspaceBackup';
import { PLAN_FOUNDING_ID, PLAN_FREE_ID, PLAN_PROMO_ID, SAAS_PLANS, ALL_PLANS, addBillingMonths, getPlanLimits, getSaasPlans, hasReachedLimit, isFoundingPeriodExpired, isFreeTrialExpired, isUnlockedPlanId, makeFreeSubscription, makePromoSubscription, type AdminPlanGrant } from '../config/plans';
import { MIN_SIGNUP_PASSWORD_LENGTH } from '../config/auth';
import { paidTruckLimit, FOUNDING_INCLUDED_TRUCKS, FOUNDING_BASE_PHP, storageLimitBytes, storageLimitGb, withHostedRollover, hostedPricingForCheckout, hostedPricingFields, addCalendarYears, calculateSubscriptionPrice } from '../lib/subscriptionPrice';
import { nextSlotId, TRIP_SLOT_PREFIX, TRUCK_SLOT_PREFIX } from '../lib/planSlots';
import { uploadCompanyFile } from '../lib/uploads';
import { refreshPlatformAdminClaim } from '../config/platformAdmin';
import { hasSeenTutorialLocally, markTutorialSeenLocally } from '../components/tutorial/tutorialSeen';
import { hasSignedInk, isStatusRetraction, missingSignaturesForStatus } from '../lib/stageGates';
import { shrinkSignatureDataUrl } from '../lib/podSignoff';
import { timelineRetractionFromRequest } from '../lib/tripAudit';
import { isHelperCrew, isDriverSeatRole } from '../lib/crew';

function isFieldDriverRole(role: string): boolean {
  return isDriverSeatRole(role);
}

function resolveDriverRosterId(
  roster: { id: string; email?: string; userId?: string; crewRole?: string }[],
  uid: string,
  email?: string
): string | null {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const match = roster.find((d) => {
    if (String(d.crewRole || 'driver').toLowerCase() === 'helper') return false;
    const rowUid = String(d.userId || '');
    const rowEmail = String(d.email || '').trim().toLowerCase();
    return (uid && rowUid === uid) || (Boolean(cleanEmail) && rowEmail === cleanEmail);
  });
  return match?.id || null;
}

export const getTargetKmPerLiter = (type: TruckType): number => {
  switch (type) {
    case '4-Wheeler Closed Van': return 7.0;
    case '6-Wheeler Closed Van': return 5.5;
    case '6-Wheeler Dropside/Wingvan': return 5.0;
    case '10-Wheeler Wingvan': return 3.2;
    case '10-Wheeler Dump Truck': return 2.8;
    case '20ft Container Chassis': return 3.0;
    case '40ft Container Chassis': return 2.5;
    case 'Tractor Head / 14-Wheeler': return 2.4;
    default: return 3.5;
  }
};

export interface FleetFuelAnalytics {
  totalCostPhp: number;
  totalLiters: number;
  totalDistanceKm: number;
  avgKmPerLiter: number;
  avgCostPerKmPhp: number;
  avgPricePerLiterPhp: number;
  highestEfficiencyTruck?: { plateNumber: string; kmPerLiter: number; type: TruckType };
  lowestEfficiencyTruck?: { plateNumber: string; kmPerLiter: number; type: TruckType };
  totalLogsCount: number;
}

interface FreightContextType {
  company: Company;
  updateCompany: (updates: Partial<Company>) => void;
  uploadWorkspaceFile: (folder: string, file: File) => Promise<{ url: string; name: string; bytes: number }>;
  
  users: User[];
  currentUser: User;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isFirebaseReady: boolean;
  login: (email: string, password?: string, options?: { rememberMe?: boolean }) => Promise<{ success: boolean; error?: string; clientPortal?: boolean }>;
  signup: (payload: { name: string; email: string; password: string; companyName: string }) => Promise<{ success: boolean; error?: string }>;
  joinTeam: (payload: { name: string; email: string; password: string }) => Promise<{ success: boolean; error?: string; clientPortal?: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUserAccount: (userId: string) => void;
  switchUserRole: (role: UserRole) => void;
  addUser: (user: Omit<User, 'id' | 'companyId'>) => Promise<{ success: boolean; error?: string; emailed?: boolean; inviteUrl?: string }>;
  inviteClientPortal: (clientId: string, email: string, contactName?: string) => Promise<{ success: boolean; error?: string; inviteUrl?: string }>;
  removeUserFromCompany: (userId: string) => Promise<{ success: boolean; error?: string }>;
  tiedCompanyLogins: User[];
  refreshTiedCompanyLogins: () => Promise<void>;
  untieTiedCompanyLogin: (uid: string) => Promise<{ success: boolean; error?: string }>;
  updateCurrentUserProfile: (updates: Partial<Pick<User, 'name' | 'phone' | 'department' | 'avatarUrl'>>) => Promise<void>;
  isSoleOwnerAccount: boolean;
  deleteCurrentUserAccount: (password: string) => Promise<void>;
  
  trucks: Truck[];
  addTruck: (truck: Omit<Truck, 'id' | 'companyId' | 'netPayloadKg'>) => Truck | null;
  updateTruck: (id: string, updates: Partial<Truck>) => void;
  deleteTruck: (id: string) => void;
  
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, 'id' | 'companyId' | 'totalTripsCompleted' | 'rating'>) => Driver;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  approveDriver: (driverId: string) => void;
  
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'companyId' | 'activeContractsCount'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  rateCards: RateCard[];
  addRateCard: (card: Omit<RateCard, 'id' | 'companyId'>) => RateCard;
  updateRateCard: (id: string, updates: Partial<RateCard>) => void;
  deleteRateCard: (id: string) => void;
  suggestRateCard: (originZone: string, destinationZone: string, truckType: TruckType) => RateCard | undefined;

  truckBans: TruckBan[];
  addTruckBan: (ban: Omit<TruckBan, 'id' | 'companyId' | 'createdAt'>) => TruckBan;
  updateTruckBan: (id: string, updates: Partial<TruckBan>) => void;
  deleteTruckBan: (id: string) => void;
  seedMetroManilaTruckBans: () => number;
  
  trips: Trip[];
  liveTracking: LiveTracking[];
  fieldEvents: FieldEvent[];
  addTrip: (tripData: Omit<Trip, 'id' | 'companyId' | 'tripNumber' | 'waybillNumber' | 'timeline' | 'createdAt' | 'isOverweight' | 'overweightKg'>) => Trip | null;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  updateTripStatus: (id: string, newStatus: TripStatus, note?: string, location?: string, extras?: Partial<Trip>, options?: { allowRetraction?: boolean; retraction?: TripStatusRetractionRequest }) => void;
  addAccessorialToTrip: (tripId: string, accessorial: Omit<TripAccessorial, 'id' | 'tripId'>) => void;
  removeAccessorialFromTrip: (tripId: string, accessorialId: string) => void;
  submitPOD: (tripId: string, podData: Omit<POD, 'id' | 'tripId' | 'signedAt'>) => void;
  /** Field driver browser/app actions on assigned trips only. */
  isFieldDriverSession: boolean;
  assignedDriverRosterId: string | null;
  saveAssignedDriverSignoff: (tripId: string, signatureDataUrl: string) => Promise<void>;
  markAssignedDriverArrived: (tripId: string) => Promise<void>;
  saveAssignedDriverWarehousePod: (params: {
    tripId: string;
    signatureDataUrl: string;
    receiverName: string;
    receiverRole: string;
    conditionStatus?: POD['conditionStatus'];
  }) => Promise<void>;
  addAssignedDriverFieldEvent: (params: {
    tripId: string;
    kind: FieldEvent['kind'];
    note?: string;
    photoUrl?: string;
    signatureDataUrl?: string;
  }) => Promise<FieldEvent>;
  requestTripStatusRetraction: (tripId: string, toStatus: TripStatus, reasonCategory: TripRetractionReasonCategory, detailedReason: string) => void;
  applyOwnTripStatusRetraction: (tripId: string, toStatus: TripStatus, reasonCategory: TripRetractionReasonCategory, detailedReason: string) => void;
  approveTripStatusRetraction: (tripId: string, reviewNote: string) => void;
  rejectTripStatusRetraction: (tripId: string, reviewNote: string) => void;
  canApproveTripStatusRetraction: boolean;
  
  invoices: Invoice[];
  createInvoiceForTrip: (tripId: string) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  reconcileAndLockInvoice: (id: string, pop: ProofOfPayment) => void;
  unlockInvoiceForAdjustment: (id: string, reason: string) => void;
  requestInvoiceRetraction: (id: string, reasonCategory: RetractionReasonCategory, detailedReason: string) => void;
  approveInvoiceRetraction: (id: string, ownerReviewNote: string, action: 'revert_to_draft' | 'void_invoice') => void;
  rejectInvoiceRetraction: (id: string, ownerReviewNote: string) => void;
  getInvoiceByTripId: (tripId: string) => Invoice | undefined;

  // Fuel Tracking
  fuelLogs: FuelLog[];
  addFuelLog: (logData: {
    truckId: string;
    driverId?: string;
    tripId?: string;
    date: string;
    odometerKm: number;
    previousOdometerKm?: number;
    liters: number;
    costPhp: number;
    pricePerLiterPhp?: number;
    fuelStation: string;
    fuelGrade?: string;
    fullTank?: boolean;
    paymentMethod: FuelPaymentMethod;
    receiptNumber?: string;
    notes?: string;
  }) => FuelLog;
  updateFuelLog: (id: string, updates: Partial<FuelLog>) => void;
  deleteFuelLog: (id: string) => void;
  getFuelLogsByTruckId: (truckId: string) => FuelLog[];
  getTruckFuelSummary: (truckId: string) => TruckFuelSummary;
  getFleetFuelAnalytics: () => FleetFuelAnalytics;
  canLogFuel: () => RolePermissionCheck;
  canDeleteFuelLog: () => RolePermissionCheck;

  // General Ledger & Accounting Books
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  addManualJournalEntry: (entryData: {
    date: string;
    referenceNumber: string;
    entityName?: string;
    lines: Array<{
      accountCode: string;
      debitPhp: number;
      creditPhp: number;
      memo?: string;
      truckPlate?: string;
      clientName?: string;
    }>;
    notes?: string;
  }) => JournalEntry;
  getAccountBalance: (accountCode: string) => { totalDebit: number; totalCredit: number; netBalance: number; normalBalance: 'Debit' | 'Credit' };
  getLedgerByAccount: (accountCode: string) => Array<{
    id: string;
    date: string;
    entryNumber: string;
    referenceType: string;
    referenceNumber: string;
    entityName?: string;
    memo?: string;
    debitPhp: number;
    creditPhp: number;
    runningBalance: number;
    truckPlate?: string;
  }>;
  getTrialBalance: () => {
    accounts: Array<{
      code: string;
      name: string;
      category: string;
      debitPhp: number;
      creditPhp: number;
    }>;
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
  };

  // Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  
  // Role-Based Manipulation Permissions
  canManipulateTripStatus: (targetStatus: TripStatus, currentStatus?: TripStatus) => RolePermissionCheck;
  canCreateTrip: () => RolePermissionCheck;
  canEditTrip: () => RolePermissionCheck;
  canDeleteTrip: () => RolePermissionCheck;
  canReassignFleet: () => RolePermissionCheck;
  canManageFinancials: () => RolePermissionCheck;
  canAccess: (permission: 'dashboard' | 'new_trip' | 'trip_edit' | 'pod_upload' | 'truck_crud' | 'driver_crud' | 'invoice_manage' | 'ratecard_crud' | 'settings' | 'fuel_tracking' | 'ledger_view' | 'rbac') => boolean;
  getTruckById: (id: string) => Truck | undefined;
  getDriverById: (id: string) => Driver | undefined;
  getClientById: (id: string) => Client | undefined;
  getTripById: (id: string) => Trip | undefined;

  // Dynamic RBAC & Role Management (Firebase)
  roles: RbacRole[];
  createRole: (roleData: Omit<RbacRole, 'id' | 'createdAt' | 'updatedAt'>) => RbacRole | null;
  updateRole: (id: string, updates: Partial<RbacRole>) => void;
  deleteRole: (id: string) => boolean;
  resetRolesToDefault: () => void;
  updateUserRole: (userId: string, newRole: string) => void;
  hasPermission: (permissionId: string) => boolean;
  rbacAuditLogs: RbacAuditEntry[];
  exportRbacDb: () => string;
  importRbacDb: (jsonString: string) => { success: boolean; message: string };
  firebaseProjectId: string;
  
  // Onboarding
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  resetToSampleData: () => void;

  // SaaS Subscription & PayMongo Billing
  plans: Plan[];
  subscription: Subscription;
  billingHistory: BillingHistoryItem[];
  activePlan: Plan;
  subscriptionUsage: SubscriptionUsageStats;
  canCreateBooking: boolean;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  isBillingProviderReady: boolean;
  isPayMongoTestMode: boolean;
  createPayMongoCheckout: (planId: string, billingCycle?: 'monthly' | 'annual', truckCount?: number) => Promise<{ checkoutUrl: string; checkoutSessionId: string }>;
  activateFoundingPlan: (paymentMethod: PayMongoPaymentMethod, paymentId: string) => void;
  subscribeToFoundingPlan: (billingCycle?: 'monthly' | 'annual', truckCount?: number) => Promise<void>;
  confirmFoundingPayment: (paymentId?: string) => Promise<void>;
  isWaitingForPayMongo: boolean;
  cancelSubscriptionAtPeriodEnd: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  updatePlanDetails: (planId: string, updates: Partial<Plan>) => void;
  canAddTruck: boolean;
  canAddAccount: boolean;
  canAddRole: boolean;
  canAddTransaction: boolean;
  markTutorialSeen: () => void;
  isPlatformAdmin: boolean;
  canManageBilling: boolean;
  /** Company Owner only — Manage subscription / Reset to Free in the account menu. */
  canManageCompanyBilling: boolean;
  listPlatformSubscriptions: () => Promise<CompanyDocument[]>;
  setCompanyPlanByAdmin: (companyId: string, planId: string, grant?: AdminPlanGrant) => Promise<void>;
  resetCurrentPlanToFree: () => Promise<void>;
  deleteCompanyWorkspace: () => Promise<void>;
  captureWorkspaceBackup: () => WorkspaceBackup;
  restoreWorkspaceBackup: (backup: WorkspaceBackup) => Promise<void>;
  saveWeeklyBackupNow: () => Promise<void>;
  platformNotices: PlatformNotice[];
  savePlatformNotice: (notice: PlatformNotice) => Promise<void>;
  deletePlatformNotice: (id: string) => Promise<void>;
  endActiveDowntime: () => Promise<void>;
  activeDowntime: PlatformNotice | null;
}

const FreightContext = createContext<FreightContextType | undefined>(undefined);

const BLANK_COMPANY: Company = {
  id: '',
  name: '',
  tin: '',
  address: '',
  contactNumber: '',
  email: '',
  subscriptionTier: 'Free',
  currency: 'PHP',
  registeredDate: new Date().toISOString().slice(0, 10),
  storageUsedBytes: 0,
};

function asPayMongoMethod(value?: string): PayMongoPaymentMethod {
  const method = (value || '').toLowerCase();
  if (method.includes('gcash')) return 'gcash';
  if (method.includes('maya') || method.includes('paymaya')) return 'paymaya';
  if (method.includes('card')) return 'card';
  return 'qrph';
}

async function readPayMongoJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const hint = text.replace(/\s+/g, ' ').trim().slice(0, 160);
    throw new Error(
      hint.includes('FUNCTION_INVOCATION_FAILED')
        ? 'PayMongo billing API crashed on Vercel. Redeploy the latest /api/paymongo.js CommonJS function, then retry checkout.'
        : `PayMongo checkout failed (${response.status})${hint ? `: ${hint}` : '. Check Vercel logs.'}`
    );
  }
}

async function paymongoRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (isFirebaseConfigured()) {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isPayMongoWired(): boolean {
  return true;
}

const PENDING_FOUNDING_KEY = 'casinfreight_pending_founding';

function mapAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
  if (code.includes('email-already-in-use')) return 'That email already has a CasinFreight account. Sign in instead.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a minute and try again.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('invalid-login')) {
    return 'Wrong email or password. If you were invited as a new hire, open the join link from your owner and choose a password there. Do not create a new company.';
  }
  if (code.includes('weak-password')) return `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.`;
  if (code.includes('invalid-email')) return 'Enter a valid work email.';
  if (code.includes('unauthorized-continue-uri') || code.includes('invalid-continue-uri')) {
    return 'Add casin-freight.vercel.app to Firebase Authentication → Settings → Authorized domains.';
  }
  if (code.includes('permission-denied')) {
    return 'Firestore blocked this request. Open Firebase Console → Firestore → Rules, paste firestore.rules from this project, then Publish.';
  }
  if (error instanceof Error) return error.message.replace(/^FirebaseError:\s*/i, '');
  return 'Authentication failed.';
}

export const FreightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const persistReadyRef = useRef(false);
  const persistHashRef = useRef<Record<string, string>>({});
  const persistIdsRef = useRef<Record<string, string[]>>({});
  const persistDocHashRef = useRef<Record<string, Record<string, string>>>({});
  const seedingRef = useRef(false);
  const companyCreatedByRef = useRef('');
  const tripsDirtyRef = useRef(false);
  const tripsPersistTokenRef = useRef(0);
  /** Keeps driver status/signoff from being clobbered by a stale trips snapshot. */
  const pinnedTripPatchesRef = useRef<
    Map<
      string,
      {
        status?: Trip['status'];
        driverSignoff?: Trip['driverSignoff'];
        pod?: Trip['pod'];
        actualDelivery?: string;
        until: number;
      }
    >
  >(new Map());
  const workspaceUnsubsRef = useRef<Array<() => void>>([]);
  const [company, setCompany] = useState<Company>(BLANK_COMPANY);
  const [users, setUsers] = useState<User[]>([]);
  const [tiedCompanyLogins, setTiedCompanyLogins] = useState<User[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [rbacAuditLogs, setRbacAuditLogs] = useState<RbacAuditEntry[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('Owner');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [truckBans, setTruckBans] = useState<TruckBan[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [liveTracking, setLiveTracking] = useState<LiveTracking[]>([]);
  const [fieldEvents, setFieldEvents] = useState<FieldEvent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(initialChartOfAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [plans, setPlans] = useState<Plan[]>(ALL_PLANS);
  const [subscription, setSubscription] = useState<Subscription>(() => makeFreeSubscription('', ''));
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isWaitingForPayMongo, setIsWaitingForPayMongo] = useState(false);
  const [platformNotices, setPlatformNotices] = useState<PlatformNotice[]>([]);
  const unlockingFoundingRef = useRef(false);

  const resetWorkspace = () => {
    persistReadyRef.current = false;
    persistHashRef.current = {};
    persistIdsRef.current = {};
    persistDocHashRef.current = {};
    companyCreatedByRef.current = '';
    tripsDirtyRef.current = false;
    tripsPersistTokenRef.current += 1;
    pinnedTripPatchesRef.current.clear();
    workspaceUnsubsRef.current.forEach((unsub) => unsub());
    workspaceUnsubsRef.current = [];
    setCompany(BLANK_COMPANY);
    setUsers([]);
    setTiedCompanyLogins([]);
    setRoles([]);
    setRbacAuditLogs([]);
    setCurrentRole('Owner');
    setCurrentUserId('');
    setIsPlatformAdmin(false);
    setTrucks([]);
    setDrivers([]);
    setClients([]);
    setRateCards([]);
    setTruckBans([]);
    setTrips([]);
    setLiveTracking([]);
    setFieldEvents([]);
    setInvoices([]);
    setNotifications([]);
    setFuelLogs([]);
    setChartOfAccounts(initialChartOfAccounts);
    setJournalEntries([]);
    setPlans(ALL_PLANS);
    setSubscription(makeFreeSubscription('', ''));
    setBillingHistory([]);
    setIsOnboardingOpen(false);
    setIsWaitingForPayMongo(false);
  };

  const snapshotCollection = (name: WorkspaceCollection, items: { id: string }[]) => {
    persistHashRef.current[name] = JSON.stringify(items);
    persistIdsRef.current[name] = items.map((item) => item.id).filter(Boolean);
    persistDocHashRef.current[name] = Object.fromEntries(
      items
        .filter((item) => item.id)
        .map((item) => {
          const { password: _password, ...rest } = item as { id: string; password?: string };
          return [item.id, JSON.stringify(rest)];
        })
    );
  };

  const pinDriverTrip = (
    tripId: string,
    patch: {
      status?: Trip['status'];
      driverSignoff?: Trip['driverSignoff'];
      pod?: Trip['pod'];
      actualDelivery?: string;
    },
    holdMs = 12000
  ) => {
    pinnedTripPatchesRef.current.set(tripId, { ...patch, until: Date.now() + holdMs });
  };

  const applyPinnedTrips = (remote: Trip[]): Trip[] => {
    const now = Date.now();
    const pins = pinnedTripPatchesRef.current;
    for (const [id, pin] of [...pins.entries()]) {
      if (pin.until <= now) pins.delete(id);
    }
    if (pins.size === 0) return remote;
    return remote.map((trip) => {
      const pin = pins.get(trip.id);
      if (!pin) return trip;
      const statusCaughtUp = !pin.status || trip.status === pin.status;
      const signCaughtUp =
        !pin.driverSignoff || hasSignedInk(trip.driverSignoff?.signatureDataUrl);
      const podCaughtUp = !pin.pod || hasSignedInk(trip.pod?.signatureDataUrl);
      if (statusCaughtUp && signCaughtUp && podCaughtUp) {
        pins.delete(trip.id);
        return trip;
      }
      return {
        ...trip,
        ...(pin.status ? { status: pin.status } : {}),
        ...(pin.driverSignoff ? { driverSignoff: pin.driverSignoff } : {}),
        ...(pin.pod ? { pod: pin.pod } : {}),
        ...(pin.actualDelivery ? { actualDelivery: pin.actualDelivery } : {}),
      };
    });
  };

  const persistWorkspaceCollection = <T extends { id: string }>(
    name: WorkspaceCollection,
    items: T[],
    options?: { merge?: boolean }
  ) => {
    if (!persistReadyRef.current || !company.id) return;
    const hash = JSON.stringify(items);
    if (persistHashRef.current[name] === hash) return;

    const previousCollectionHash = persistHashRef.current[name] || '';
    const previousIds = persistIdsRef.current[name] || [];
    const previousDocHashes = persistDocHashRef.current[name] || {};
    const nextIds = items.map((item) => item.id).filter(Boolean);
    const nextDocHashes: Record<string, string> = {};
    const dirty: T[] = [];
    items.forEach((item) => {
      if (!item.id) return;
      const { password: _password, ...rest } = item as T & { password?: string };
      const itemHash = JSON.stringify(rest);
      nextDocHashes[item.id] = itemHash;
      if (previousDocHashes[item.id] !== itemHash) dirty.push(item);
    });
    const deleted = previousIds.filter((id) => !nextDocHashes[id]);
    persistHashRef.current[name] = hash;
    persistIdsRef.current[name] = nextIds;
    persistDocHashRef.current[name] = nextDocHashes;
    if (dirty.length === 0 && deleted.length === 0) return;

    replaceCollection(company.id, name, dirty, {
      ...options,
      previousIds,
      incomingIds: nextIds,
    }).catch((error) => {
      persistHashRef.current[name] = previousCollectionHash;
      persistIdsRef.current[name] = previousIds;
      persistDocHashRef.current[name] = previousDocHashes;
      console.error(error);
    });
  };

  const persistTripsNow = (items: Trip[]): Promise<void> => {
    if (!persistReadyRef.current || !company.id) return Promise.resolve();
    const hash = JSON.stringify(items);
    if (persistHashRef.current.trips === hash) return Promise.resolve();

    const previousCollectionHash = persistHashRef.current.trips || '';
    const previousIds = persistIdsRef.current.trips || [];
    const previousDocHashes = persistDocHashRef.current.trips || {};
    const nextIds = items.map((item) => item.id).filter(Boolean);
    const nextDocHashes: Record<string, string> = {};
    const dirty: Trip[] = [];
    items.forEach((item) => {
      if (!item.id) return;
      const { password: _password, ...rest } = item as Trip & { password?: string };
      const itemHash = JSON.stringify(rest);
      nextDocHashes[item.id] = itemHash;
      if (previousDocHashes[item.id] !== itemHash) dirty.push(item);
    });
    const deleted = previousIds.filter((id) => !nextDocHashes[id]);
    persistHashRef.current.trips = hash;
    persistIdsRef.current.trips = nextIds;
    persistDocHashRef.current.trips = nextDocHashes;
    if (dirty.length === 0 && deleted.length === 0) return Promise.resolve();

    return replaceCollection(company.id, 'trips', dirty, {
      merge: true,
      previousIds,
      incomingIds: nextIds,
    }).catch((error) => {
      persistHashRef.current.trips = previousCollectionHash;
      persistIdsRef.current.trips = previousIds;
      persistDocHashRef.current.trips = previousDocHashes;
      console.error(error);
      throw error;
    });
  };

  const refreshTiedCompanyLogins = async (companyId?: string, roster?: User[]) => {
    const id = companyId || company.id;
    if (!id || !isFirebaseConfigured()) {
      setTiedCompanyLogins([]);
      return;
    }
    try {
      const profiles = await listCompanyUserProfiles(id);
      const onRoster = new Set((roster || users).map((member) => member.id));
      setTiedCompanyLogins(
        profiles.filter((profile) => profile.id && !onRoster.has(profile.id))
      );
    } catch {
      setTiedCompanyLogins([]);
    }
  };

  const hydrateCompany = async (companyId: string, uid: string, profile?: UserProfile | null) => {
    const companyDoc = await getCompanyDocument(companyId);
    if (!companyDoc) {
      throw new Error('Company workspace was not found for this account.');
    }

    const [
      loadedRoles,
      loadedMembers,
      loadedTrucks,
      loadedDrivers,
      loadedClients,
      loadedRateCards,
      loadedTruckBans,
      loadedInvoices,
      loadedFuelLogs,
      loadedJournal,
      loadedNotifications,
      loadedAudit,
    ] = await Promise.all([
      loadCollection<RbacRole>(companyId, 'roles'),
      loadCollection<User>(companyId, 'members'),
      loadCollection<Truck>(companyId, 'trucks'),
      loadCollection<Driver>(companyId, 'drivers'),
      loadCollection<Client>(companyId, 'clients'),
      loadCollection<RateCard>(companyId, 'rateCards'),
      loadCollection<TruckBan>(companyId, 'truckBans'),
      loadCollection<Invoice>(companyId, 'invoices'),
      loadCollection<FuelLog>(companyId, 'fuelLogs'),
      loadCollection<JournalEntry>(companyId, 'journalEntries'),
      loadCollection<AppNotification>(companyId, 'notifications'),
      loadCollection<RbacAuditEntry>(companyId, 'auditLogs'),
    ]);

    const memberRole = String(
      (profile?.role as string) ||
        loadedMembers.find((m) => m.id === uid)?.role ||
        ''
    );
    const driverRosterId = isFieldDriverRole(memberRole)
      ? resolveDriverRosterId(loadedDrivers, uid, profile?.email)
      : null;
    const loadedTrips = isFieldDriverRole(memberRole)
      ? driverRosterId
        ? await loadCollectionWhere<Trip>(companyId, 'trips', 'driverId', driverRosterId)
        : []
      : await loadCollection<Trip>(companyId, 'trips');

    const { subscription: savedSub, chartOfAccounts: savedAccounts, onboardingComplete, createdBy, ...companyFields } = companyDoc;
    companyCreatedByRef.current = createdBy || uid;
    let nextSub = savedSub || makeFreeSubscription(uid, companyId);
    let persistSub = !savedSub;
    const rolled = withHostedRollover(nextSub);
    if (rolled !== nextSub) {
      nextSub = rolled;
      persistSub = true;
    }
    if (isFoundingPeriodExpired(nextSub)) {
      nextSub = makeFreeSubscription(uid, companyId, nextSub);
      persistSub = true;
    }
    if (persistSub) {
      try {
        await saveCompanySubscription(companyId, nextSub, isUnlockedPlanId(nextSub.plan_id) ? 'Growth' : 'Free');
      } catch (error) {
        console.error('Could not persist subscription period or Founding rollover', error);
      }
    }
    const nextRoles = ensureDefaultSystemRoles(
      loadedRoles.length ? loadedRoles : [OWNER_RBAC_ROLE]
    );
    const seenTutorial = Boolean(profile?.has_seen_tutorial) || hasSeenTutorialLocally(uid);
    const uniqueMembers = Object.values(
      loadedMembers.reduce<Record<string, User>>((acc, member) => {
        const key = (member.email || member.id).toLowerCase();
        if (!acc[key] || member.status === 'active' || member.id === uid) {
          acc[key] = member;
        }
        return acc;
      }, {})
    ).map((member) => (
      member.id === uid ? { ...member, has_seen_tutorial: Boolean(member.has_seen_tutorial) || seenTutorial } : member
    ));
    if (
      !uniqueMembers.some((member) => member.id === uid)
      && createdBy !== uid
    ) {
      throw new Error('You no longer have a seat on this company. Ask the owner to invite you again.');
    }
    if (seenTutorial) {
      markTutorialSeenLocally(uid);
    }

    // Backfill Drivers & Helpers when a Driver / Field Operator seat has no roster row yet.
    let driversForWorkspace = loadedDrivers;
    const canBackfillRoster =
      createdBy === uid
      || memberRole === 'Owner'
      || memberRole.toLowerCase().includes('owner')
      || checkPermission(memberRole, 'drivers.crud', nextRoles);
    if (canBackfillRoster) {
      const rosterEmails = new Set(
        loadedDrivers.map((d) => String(d.email || '').trim().toLowerCase()).filter(Boolean)
      );
      const missingDriverSeats = uniqueMembers.filter((member) => {
        if (!isDriverSeatRole(String(member.role || ''), nextRoles)) return false;
        const email = String(member.email || '').trim().toLowerCase();
        return Boolean(email) && !rosterEmails.has(email);
      });
      if (missingDriverSeats.length > 0) {
        for (const member of missingDriverSeats) {
          try {
            const linkedUid =
              member.status === 'invited' || String(member.id).startsWith('invite-')
                ? undefined
                : member.id;
            await ensureDriverRosterForLogin({
              companyId,
              email: member.email,
              name: member.name || member.email.split('@')[0],
              uid: linkedUid,
            });
          } catch (error) {
            console.error('Could not backfill Driver Roster for', member.email, error);
          }
        }
        try {
          driversForWorkspace = await loadCollection<Driver>(companyId, 'drivers');
        } catch (error) {
          console.error('Could not reload drivers after roster backfill', error);
        }
      }
    }

    snapshotCollection('roles', loadedRoles);
    snapshotCollection('members', uniqueMembers);
    snapshotCollection('trucks', loadedTrucks);
    snapshotCollection('drivers', driversForWorkspace);
    snapshotCollection('clients', loadedClients);
    snapshotCollection('rateCards', loadedRateCards);
    snapshotCollection('truckBans', loadedTruckBans);
    snapshotCollection('trips', loadedTrips);
    snapshotCollection('invoices', loadedInvoices);
    snapshotCollection('fuelLogs', loadedFuelLogs);
    snapshotCollection('journalEntries', loadedJournal);
    snapshotCollection('notifications', loadedNotifications);
    snapshotCollection('auditLogs', loadedAudit);

    setCompany({
      ...companyFields,
      subscriptionTier: isUnlockedPlanId(nextSub.plan_id) ? 'Growth' : 'Free',
    });
    setSubscription(nextSub);
    setRoles(nextRoles);
    setUsers(uniqueMembers);
    setTrucks(loadedTrucks);
    setDrivers(driversForWorkspace);
    setClients(loadedClients);
    setRateCards(loadedRateCards);
    setTruckBans(loadedTruckBans);
    setTrips(loadedTrips);
    setInvoices(loadedInvoices);
    setFuelLogs(loadedFuelLogs);
    setJournalEntries(loadedJournal);
    setNotifications(loadedNotifications);
    setRbacAuditLogs(loadedAudit);
    if (Array.isArray(savedAccounts) && savedAccounts.length) {
      setChartOfAccounts(savedAccounts as ChartOfAccount[]);
    }
    setCurrentUserId(uid);
    setCurrentRole((loadedMembers.find((m) => m.id === uid)?.role as UserRole) || 'Owner');
    setIsAuthenticated(true);
    setIsOnboardingOpen(!onboardingComplete);
    persistReadyRef.current = true;
    refreshTiedCompanyLogins(companyId, uniqueMembers).catch(() => setTiedCompanyLogins([]));
  };

  useEffect(() => {
    if (!isAuthenticated || !company.id) return;
    const role = String(currentRole || '');
    const memberEmail = users.find((u) => u.id === currentUserId)?.email || '';
    const driverOnly = isFieldDriverRole(role);
    const rosterId = driverOnly
      ? resolveDriverRosterId(drivers, currentUserId, memberEmail)
      : null;

    workspaceUnsubsRef.current.forEach((unsub) => unsub());
    const unsubs: Array<() => void> = [
      listenCompanyBilling(company.id, (billing) => {
        if (billing.subscription) setSubscription(billing.subscription);
        setCompany((prev) => {
          const nextTier = billing.subscriptionTier as Company['subscriptionTier'] | undefined;
          const nextUsed = Number(billing.storageUsedBytes);
          const usedChanged = Number.isFinite(nextUsed) && prev.storageUsedBytes !== nextUsed;
          const tierChanged = Boolean(nextTier) && prev.subscriptionTier !== nextTier;
          if (!usedChanged && !tierChanged) return prev;
          return {
            ...prev,
            ...(tierChanged ? { subscriptionTier: nextTier } : {}),
            ...(usedChanged ? { storageUsedBytes: nextUsed } : {}),
          };
        });
      }),
    ];

    if (driverOnly) {
      if (!rosterId) {
        setTrips([]);
        setLiveTracking([]);
        setFieldEvents([]);
      } else {
        unsubs.push(
          listenCollectionWhere<Trip>(company.id, 'trips', 'driverId', rosterId, (remote) => {
            if (tripsDirtyRef.current) return;
            setTrips(applyPinnedTrips(remote));
          }),
          listenCollectionWhere<LiveTracking>(company.id, 'liveTracking', 'driverId', rosterId, setLiveTracking)
        );
      }
    } else {
      unsubs.push(
        listenCollection<LiveTracking>(company.id, 'liveTracking', setLiveTracking),
        listenCollection<FieldEvent>(company.id, 'fieldEvents', setFieldEvents),
        listenCollection<Trip>(company.id, 'trips', (remote) => {
          if (tripsDirtyRef.current) return;
          setTrips(applyPinnedTrips(remote));
        })
      );
    }

    workspaceUnsubsRef.current = unsubs;
    return () => {
      workspaceUnsubsRef.current.forEach((unsub) => unsub());
      workspaceUnsubsRef.current = [];
    };
  }, [isAuthenticated, company.id, currentRole, currentUserId, users, drivers]);

  // Drivers may only read fieldEvents for their assigned trips (rules), so listen per tripId.
  const driverTripIdsKey = isFieldDriverRole(currentRole || '')
    ? trips.map((t) => t.id).filter(Boolean).sort().join('|')
    : '';

  useEffect(() => {
    if (!isAuthenticated || !company.id || !driverTripIdsKey) {
      if (isFieldDriverRole(currentRole || '')) setFieldEvents([]);
      return;
    }
    const tripIds = driverTripIdsKey.split('|');
    const unsubs = tripIds.map((tripId) =>
      listenCollectionWhere<FieldEvent>(company.id, 'fieldEvents', 'tripId', tripId, (remote) => {
        setFieldEvents((prev) => {
          const others = prev.filter((e) => e.tripId !== tripId);
          return [...others, ...remote];
        });
      })
    );
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [isAuthenticated, company.id, currentRole, driverTripIdsKey]);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsAuthLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      if (!fbUser) {
        resetWorkspace();
        setIsAuthenticated(false);
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      try {
        setIsPlatformAdmin(await refreshPlatformAdminClaim(fbUser));
        // Wait out join/signup seeding so we never signOut mid client-portal claim.
        for (let wait = 0; wait < 200 && seedingRef.current; wait += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        let profile = await getUserProfile(fbUser.uid);
        for (let attempt = 0; attempt < 12 && !profile?.companyId; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          profile = await getUserProfile(fbUser.uid);
        }
        if (!profile?.companyId) {
          resetWorkspace();
          setIsAuthenticated(false);
          setIsAuthLoading(false);
          return;
        }
        // Client portal is phone-app only. Never tear down Firebase Auth while join/login
        // is still writing the profile / invite (that caused endless Join spinners).
        if (profile.kind === 'client_portal') {
          if (!seedingRef.current) {
            await signOut(getFirebaseAuth());
          }
          resetWorkspace();
          setIsAuthenticated(false);
          setIsAuthLoading(false);
          return;
        }
        const loginAt = fbUser.metadata.lastSignInTime
          ? new Date(fbUser.metadata.lastSignInTime).toISOString()
          : new Date().toISOString();
        const seenAt = new Date().toISOString();
        const prevSeen = Date.parse(profile.lastSeenAt || '');
        const shouldStampSeen = !Number.isFinite(prevSeen) || Date.now() - prevSeen > 30 * 60 * 1000;
        if (profile.lastLoginAt !== loginAt || shouldStampSeen) {
          stampUserPresence({
            uid: fbUser.uid,
            lastLoginAt: loginAt,
            ...(shouldStampSeen ? { lastSeenAt: seenAt } : {}),
          }).catch(() => {});
        }
        await hydrateCompany(profile.companyId, fbUser.uid, profile);
      } catch (error) {
        console.error('Failed to hydrate Firebase workspace', error);
        resetWorkspace();
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = listenPlatformNotices(setPlatformNotices);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => {
      if (!persistReadyRef.current) return;
      const companyDoc: CompanyDocument = {
        ...company,
        createdBy: companyCreatedByRef.current || currentUserId,
        onboardingComplete: !isOnboardingOpen,
        subscription,
        chartOfAccounts,
      };
      saveCompanyDocument(companyDoc).catch((err) => console.error('Failed to save company', err));
    }, 500);
    return () => clearTimeout(timer);
  }, [company, subscription, chartOfAccounts, isOnboardingOpen, currentUserId]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    if (currentUserId !== companyCreatedByRef.current) return;
    const timer = setTimeout(() => persistWorkspaceCollection('roles', roles), 500);
    return () => clearTimeout(timer);
  }, [roles, company.id, currentUserId]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    if (currentUserId !== companyCreatedByRef.current) return;
    const timer = setTimeout(() => persistWorkspaceCollection('members', users), 500);
    return () => clearTimeout(timer);
  }, [users, company.id, currentUserId]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('trucks', trucks), 500);
    return () => clearTimeout(timer);
  }, [trucks, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('drivers', drivers), 500);
    return () => clearTimeout(timer);
  }, [drivers, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('clients', clients), 500);
    return () => clearTimeout(timer);
  }, [clients, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('rateCards', rateCards), 500);
    return () => clearTimeout(timer);
  }, [rateCards, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('truckBans', truckBans), 500);
    return () => clearTimeout(timer);
  }, [truckBans, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    if (!tripsDirtyRef.current) return;
    const token = ++tripsPersistTokenRef.current;
    const snapshot = trips;
    const timer = setTimeout(() => {
      void persistTripsNow(snapshot)
        .catch(() => undefined)
        .finally(() => {
          // Only release the dirty lock for this persist generation.
          if (tripsPersistTokenRef.current === token) {
            tripsDirtyRef.current = false;
          }
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [trips, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('invoices', invoices), 500);
    return () => clearTimeout(timer);
  }, [invoices, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('fuelLogs', fuelLogs), 500);
    return () => clearTimeout(timer);
  }, [fuelLogs, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('journalEntries', journalEntries), 500);
    return () => clearTimeout(timer);
  }, [journalEntries, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('notifications', notifications), 500);
    return () => clearTimeout(timer);
  }, [notifications, company.id]);

  useEffect(() => {
    if (!persistReadyRef.current || !company.id) return;
    const timer = setTimeout(() => persistWorkspaceCollection('auditLogs', rbacAuditLogs), 500);
    return () => clearTimeout(timer);
  }, [rbacAuditLogs, company.id]);

  const captureWorkspaceBackup = (): WorkspaceBackup => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    companyId: company.id,
    companyName: company.name,
    company: {
      id: company.id,
      name: company.name,
      tin: company.tin,
      address: company.address,
      contactNumber: company.contactNumber,
      email: company.email,
      currency: company.currency,
      logoUrl: company.logoUrl,
      registeredDate: company.registeredDate,
    },
    chartOfAccounts,
    collections: {
      trucks: trucks.map((item) => stripSecrets(item as unknown as BackupRecord)),
      drivers: drivers.map((item) => stripSecrets(item as unknown as BackupRecord)),
      clients: clients.map((item) => stripSecrets(item as unknown as BackupRecord)),
      rateCards: rateCards.map((item) => stripSecrets(item as unknown as BackupRecord)),
      truckBans: truckBans.map((item) => stripSecrets(item as unknown as BackupRecord)),
      trips: trips.map((item) => stripSecrets(item as unknown as BackupRecord)),
      invoices: invoices.map((item) => stripSecrets(item as unknown as BackupRecord)),
      fuelLogs: fuelLogs.map((item) => stripSecrets(item as unknown as BackupRecord)),
      journalEntries: journalEntries.map((item) => stripSecrets(item as unknown as BackupRecord)),
      roles: roles.map((item) => stripSecrets(item as unknown as BackupRecord)),
      members: users.map((item) => stripSecrets(item as unknown as BackupRecord)),
      auditLogs: rbacAuditLogs.map((item) => stripSecrets(item as unknown as BackupRecord)),
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !company.id) return;
    const timer = window.setTimeout(() => {
      if (!persistReadyRef.current) return;
      const backup = captureWorkspaceBackup();
      saveWeeklyBackup(backup).catch((err) => console.warn('Could not save weekly local backup', err));
      syncDeviceEvidence({
        company,
        trips,
        invoices,
        fieldEvents,
        backup,
        userGesture: false,
      }).catch((err) => console.warn('Could not auto-save BIR copies to this device', err));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, company.id]);

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const approveDriver = (driverId: string) => {
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return { ...d, approvalStatus: 'Approved', status: 'Available' };
      }
      return d;
    }));

    const drv = drivers.find(d => d.id === driverId);
    const driverName = drv ? drv.name : 'Driver';

    // Update or mark related notification
    setNotifications(prev => prev.map(n => {
      if (n.driverId === driverId) {
        return {
          ...n,
          isRead: true,
          title: `Approved: ${driverName}`,
          severity: 'success',
          metadata: { ...n.metadata, statusBadge: 'Approved & Active' }
        };
      }
      return n;
    }));

    addNotification({
      category: 'driver_approval',
      title: `Driver Roster Approved: ${driverName}`,
      message: `${driverName} has been officially approved by Owner. Authorized for linehaul assignment.`,
      isRead: false,
      severity: 'success',
      driverId,
      actionType: 'view_drivers',
      actionLabel: 'View Driver Fleet',
      metadata: {
        driverName,
        statusBadge: 'Approved'
      }
    });
  };

  const authEmail = isFirebaseConfigured() ? (getFirebaseAuth().currentUser?.email || '') : '';
  const foundUser = users.find(u => u.id === currentUserId);
  const currentUser = {
    ...(foundUser || {
      id: currentUserId || '',
      name: '',
      email: authEmail,
    role: currentRole,
    companyId: company.id,
    }),
    role: (currentRole || foundUser?.role || 'Owner') as UserRole,
    email: foundUser?.email || authEmail || '',
    has_seen_tutorial: Boolean(foundUser?.has_seen_tutorial) || hasSeenTutorialLocally(currentUserId),
  };

  const markTutorialSeen = () => {
    if (!currentUserId) return;
    markTutorialSeenLocally(currentUserId);
    setUsers((prev) => {
      const exists = prev.some((user) => user.id === currentUserId);
      if (!exists) {
        return [...prev, { ...currentUser, id: currentUserId, has_seen_tutorial: true }];
      }
      return prev.map((user) => (
        user.id === currentUserId ? { ...user, has_seen_tutorial: true } : user
      ));
    });
    const member = users.find((user) => user.id === currentUserId) || currentUser;
    saveUserProfile({
      ...(member as UserProfile),
      id: currentUserId,
      uid: currentUserId,
      companyId: company.id,
      status: member.status || 'active',
      has_seen_tutorial: true,
    }).catch(console.error);
  };

  const isOwnerLikeRole = (role: string) => role === 'Owner' || role.toLowerCase().includes('owner');

  const isSoleOwnerAccount = Boolean(
    currentUserId
    && isOwnerLikeRole(currentUser.role)
    && users.filter((user) => user.status !== 'invited' && isOwnerLikeRole(user.role)).length <= 1
  );

  const persistSelfProfile = async (next: User) => {
    const profile: UserProfile = {
      ...(next as UserProfile),
      id: currentUserId,
      uid: currentUserId,
      companyId: company.id,
      role: currentUser.role,
      email: currentUser.email,
      status: next.status || 'active',
    };
    await saveUserProfile(profile);
    if (company.id) {
      await saveMemberProfile(company.id, profile);
    }
  };

  const updateCurrentUserProfile = async (updates: Partial<Pick<User, 'name' | 'phone' | 'department' | 'avatarUrl'>>) => {
    if (!currentUserId) {
      throw new Error('You are not signed in.');
    }
    const name = (updates.name ?? currentUser.name ?? '').trim();
    if (!name) {
      throw new Error('Enter your name.');
    }
    const next: User = {
      ...currentUser,
      id: currentUserId,
      name,
      phone: updates.phone !== undefined ? (updates.phone || undefined) : currentUser.phone,
      department: updates.department !== undefined ? (updates.department || undefined) : currentUser.department,
      avatarUrl: updates.avatarUrl !== undefined ? (updates.avatarUrl || undefined) : currentUser.avatarUrl,
      role: currentUser.role,
      email: currentUser.email,
      companyId: company.id,
    };
    setUsers((prev) => {
      const exists = prev.some((user) => user.id === currentUserId);
      if (!exists) return [...prev, next];
      return prev.map((user) => (user.id === currentUserId ? { ...user, ...next } : user));
    });
    if (isFirebaseConfigured()) {
      await persistSelfProfile(next);
    }
  };

  const deleteCurrentUserAccount = async (password: string) => {
    if (!currentUserId) {
      throw new Error('You are not signed in.');
    }
    if (isSoleOwnerAccount) {
      throw new Error('You are the only Owner. Delete the company in Company setup instead, or assign another Owner first.');
    }
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      if (!fbUser?.email) {
        throw new Error('Sign in again, then delete your account.');
      }
      const trimmed = password.trim();
      if (!trimmed) {
        throw new Error('Enter your password to confirm.');
      }
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, trimmed));
      try {
        await deleteOwnAccountRecords({ uid: currentUserId, companyId: company.id });
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : '';
        const message = err instanceof Error ? err.message : '';
        if (code.includes('permission-denied') || message.toLowerCase().includes('insufficient permissions')) {
          throw new Error('This login cannot remove its own seat yet. The updated Firestore rules must be deployed to Firebase, then try Delete forever again.');
        }
        throw err;
      }
      await deleteUser(fbUser);
    }
    resetWorkspace();
    setIsAuthenticated(false);
  };

  const canManageCompanyBilling =
    currentUser.role === 'Owner'
    || String(currentUser.role || '').toLowerCase().includes('owner');
  /** Platform admin console + company Owner billing. */
  const canManageBilling = isPlatformAdmin || canManageCompanyBilling;

  useEffect(() => {
    if (!isAuthenticated || isPlatformAdmin || !canManageCompanyBilling) return;
    if (isFreeTrialExpired(subscription)) setIsUpgradeModalOpen(true);
  }, [isAuthenticated, isPlatformAdmin, canManageCompanyBilling, subscription.plan_id, subscription.current_period_end, subscription.created_at]);

  const listPlatformSubscriptions = async () => {
    if (!isPlatformAdmin) {
      const existing = await getCompanyDocument(company.id);
      return existing ? [existing] : [];
    }
    return listCompanyDocuments();
  };

  const setCompanyPlanByAdmin = async (companyId: string, planId: string, grant?: AdminPlanGrant) => {
    if ((planId === PLAN_FOUNDING_ID || planId === PLAN_PROMO_ID) && !isPlatformAdmin) {
      throw new Error('Only the platform admin can grant this plan.');
    }
    if (!canManageBilling) {
      throw new Error('Only the company owner can change the plan.');
    }
    const existing = await getCompanyDocument(companyId);
    if (!existing) {
      throw new Error('Company workspace was not found.');
    }
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    const ownerId = existing.createdBy || existing.subscription?.user_id || '';
    let nextSub: Subscription;
    if (planId === PLAN_PROMO_ID) {
      nextSub = makePromoSubscription(ownerId, companyId, grant || {}, existing.subscription);
    } else if (planId === PLAN_FOUNDING_ID) {
      const signup = now;
      const keepSignup = existing.subscription?.founding_signup_at
        && existing.subscription?.pricing_tier !== 'list'
        ? existing.subscription.founding_signup_at
        : signup.toISOString();
      const hosted = {
        pricingTier: 'founding' as const,
        basePhp: FOUNDING_BASE_PHP,
        includedTrucks: FOUNDING_INCLUDED_TRUCKS,
        lockExpiresAt: addCalendarYears(signup, 1),
        foundingSignupAt: keepSignup,
      };
      const fields = hostedPricingFields(hosted);
      nextSub = {
        id: existing.subscription?.id || `sub-${companyId.slice(0, 8)}`,
        user_id: ownerId,
        company_id: companyId,
        plan_id: PLAN_FOUNDING_ID,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
        cancel_at_period_end: false,
        auto_renew: true,
        payment_provider: 'paymongo',
        grant_source: 'paymongo',
        ...(existing.subscription?.payment_provider_checkout_id
          ? { payment_provider_checkout_id: existing.subscription.payment_provider_checkout_id }
          : {}),
        ...(existing.subscription?.last_payment_method
          ? { last_payment_method: existing.subscription.last_payment_method }
          : {}),
        ...(existing.subscription?.consumed_payment_ids?.length
          ? { consumed_payment_ids: existing.subscription.consumed_payment_ids }
          : {}),
        created_at: existing.subscription?.created_at || now.toISOString(),
        updated_at: now.toISOString(),
        billed_truck_count: Math.max(
          existing.subscription?.billed_truck_count || 0,
          hosted.includedTrucks
        ),
        ...fields,
      };
    } else {
      nextSub = makeFreeSubscription(ownerId, companyId, existing.subscription);
    }
    const tier = isUnlockedPlanId(nextSub.plan_id) ? 'Growth' : 'Free';
    await saveCompanySubscription(companyId, nextSub, tier);
    if (companyId === company.id) {
      setSubscription(nextSub);
      setCompany((prev) => ({ ...prev, subscriptionTier: tier }));
    }
  };

  const resetCurrentPlanToFree = async () => {
    if (!canManageCompanyBilling) {
      throw new Error('Only the company Owner can change the subscription.');
    }
    if (!company.id) {
      throw new Error('No company workspace is loaded.');
    }
    sessionStorage.removeItem(PENDING_FOUNDING_KEY);
    sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
    setIsWaitingForPayMongo(false);
    await setCompanyPlanByAdmin(company.id, PLAN_FREE_ID);
  };

  const deleteCompanyWorkspace = async () => {
    const isOwner = currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner') || companyCreatedByRef.current === currentUserId;
    if (!isOwner) {
      throw new Error('Only the company owner can delete this company.');
    }
    const companyId = company.id;
    if (!companyId) {
      throw new Error('No company workspace is loaded.');
    }
    persistReadyRef.current = false;
    await deleteCompanyWorkspaceDocs({
      companyId,
      memberIds: users.map((member) => member.id).filter(Boolean),
      memberEmails: users.map((member) => member.email).filter(Boolean),
    });
    await logout();
  };

  const restoreWorkspaceBackup = async (backup: WorkspaceBackup) => {
    const isOwner = currentUser.role === 'Owner' || currentUser.role.toLowerCase().includes('owner') || companyCreatedByRef.current === currentUserId;
    if (!isOwner) {
      throw new Error('Only the company owner can restore a workspace backup.');
    }
    const companyId = company.id;
    if (!companyId) {
      throw new Error('No company workspace is loaded.');
    }
    persistReadyRef.current = false;
    tripsDirtyRef.current = false;
    let wrote = false;
    try {
      const existing = await getCompanyDocument(companyId);
      if (!existing) {
        throw new Error('Company workspace was not found.');
      }

      const mergedAccounts = mergeChartOfAccounts(
        (Array.isArray(existing.chartOfAccounts) ? existing.chartOfAccounts as ChartOfAccount[] : chartOfAccounts),
        backup.chartOfAccounts || []
      );

      await saveCompanyDocument({
        ...existing,
        name: backup.company.name || existing.name,
        tin: backup.company.tin ?? existing.tin,
        address: backup.company.address ?? existing.address,
        contactNumber: backup.company.contactNumber ?? existing.contactNumber,
        email: backup.company.email ?? existing.email,
        currency: backup.company.currency || existing.currency,
        logoUrl: backup.company.logoUrl ?? existing.logoUrl,
        registeredDate: backup.company.registeredDate || existing.registeredDate,
        chartOfAccounts: mergedAccounts,
      });
      wrote = true;

      for (const name of BACKUP_COLLECTIONS) {
        const items = (backup.collections[name] || []).map((item) => remapCompanyId(item, companyId));
        await upsertCollection(companyId, name, items);
      }

      await hydrateCompany(companyId, currentUserId);
    } catch (error) {
      if (wrote) {
        try {
          await hydrateCompany(companyId, currentUserId);
        } catch {
          persistReadyRef.current = false;
        }
      } else {
        persistReadyRef.current = true;
      }
      throw error;
    }
  };

  const saveWeeklyBackupNow = async () => {
    if (!company.id) {
      throw new Error('No company workspace is loaded.');
    }
    const backup = captureWorkspaceBackup();
    const saved = await saveWeeklyBackup(backup, true);
    if (!saved) {
      throw new Error('Could not save a local weekly snapshot in this browser.');
    }
  };

  const savePlatformNotice = async (notice: PlatformNotice) => {
    if (!isPlatformAdmin) {
      throw new Error('Only the CasinFreight owner can publish notices.');
    }
    await savePlatformNoticeDoc(notice);
  };

  const deletePlatformNotice = async (id: string) => {
    if (!isPlatformAdmin) {
      throw new Error('Only the CasinFreight owner can delete notices.');
    }
    await deletePlatformNoticeDoc(id);
  };

  const endActiveDowntime = async () => {
    if (!isPlatformAdmin) {
      throw new Error('Only the CasinFreight owner can end downtime.');
    }
    const current = activeDowntimeNotice(platformNotices);
    if (!current) return;
    await savePlatformNoticeDoc({
      ...current,
      isActive: false,
      hasDowntime: false,
      updatedAt: new Date().toISOString(),
    });
  };

  const activeDowntime = activeDowntimeNotice(platformNotices) || null;

  const activePlan = subscription.plan_id === PLAN_FOUNDING_ID
    ? (getSaasPlans(subscription).find((p) => p.id === PLAN_FOUNDING_ID) || SAAS_PLANS[1])
    : (plans.find((p) => p.id === subscription.plan_id) || SAAS_PLANS[0]);
  const planLimits = getPlanLimits(subscription.plan_id);
  const truckLimit = paidTruckLimit(subscription);
  const trialExpired = isFreeTrialExpired(subscription);
  const canAddTruck = !trialExpired && !hasReachedLimit(trucks.length, truckLimit);
  const canAddAccount = !trialExpired && !hasReachedLimit(users.length, planLimits.maxAccounts);
  const canAddRole = !trialExpired && !hasReachedLimit(roles.length, planLimits.maxRoles);
  const canAddTransaction = !trialExpired && !hasReachedLimit(trips.length, planLimits.maxTransactions);
  const canCreateBooking = canAddTransaction;

  const periodEnd = new Date(subscription.current_period_end || Date.now());
  const daysRemainingInPeriod = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86400000));
  const bookingCapPercentage = planLimits.maxTransactions ? Math.min(100, Math.round((trips.length / planLimits.maxTransactions) * 100)) : 0;
  const storageUsedBytes = Math.max(0, Number(company.storageUsedBytes) || 0);
  const storageMaxBytes = storageLimitBytes(subscription);
  const storageUsedMb = Math.round((storageUsedBytes / (1024 * 1024)) * 10) / 10;
  const storageMaxMb = storageLimitGb(subscription) * 1024;
  const storageCapPercentage = storageMaxBytes
    ? Math.min(100, Math.round((storageUsedBytes / storageMaxBytes) * 100))
    : 0;

  const subscriptionUsage: SubscriptionUsageStats = {
    bookingsThisMonth: trips.length,
    maxBookingsPerMonth: planLimits.maxTransactions,
    bookingCapPercentage,
    hasReachedBookingCap: !canAddTransaction,
    isNearingBookingCap: Boolean(planLimits.maxTransactions) && bookingCapPercentage >= 80,
    storageUsedMb,
    maxStorageMb: storageMaxMb,
    storageCapPercentage,
    hasReachedStorageCap: storageUsedBytes >= storageMaxBytes,
    isFounding: subscription.plan_id === PLAN_FOUNDING_ID,
    isFreePlan: subscription.plan_id === PLAN_FREE_ID,
    isFreeTrialExpired: trialExpired,
    isSubscriptionActive: !trialExpired && (subscription.status === 'active' || subscription.status === 'trialing'),
    daysRemainingInPeriod,
    trucksUsed: trucks.length,
    maxTrucks: truckLimit,
    accountsUsed: users.length,
    maxAccounts: planLimits.maxAccounts,
    rolesUsed: roles.length,
    maxRoles: planLimits.maxRoles,
    transactionsUsed: trips.length,
    maxTransactions: planLimits.maxTransactions,
    hasReachedTruckCap: !canAddTruck,
    hasReachedAccountCap: !canAddAccount,
    hasReachedRoleCap: !canAddRole,
    hasReachedTransactionCap: !canAddTransaction,
  };

  const requireUpgrade = (blocked: boolean) => {
    if (blocked) {
      if (canManageCompanyBilling) {
        setIsUpgradeModalOpen(true);
      }
      return true;
    }
    return false;
  };

  const pushAudit = (
    action: RbacAuditEntry['action'],
    details: string,
    targetRole?: string,
    targetUser?: string
  ) => {
    const entry = buildAuditEntry(currentUser.name || 'Owner', currentUser.role, action, details, targetRole, targetUser);
    setRbacAuditLogs((prev) => [entry, ...prev]);
    if (company.id) {
      createAuditLog(company.id, entry).catch(console.error);
    }
    return entry;
  };

  const switchUserRole = (_role: UserRole) => {
    // Role impersonation was a demo control. Live sessions use the signed-in Firebase user.
  };

  const switchUserAccount = (_userId: string) => {
    // Account switching was a demo control. Live sessions use Firebase Auth.
  };

  const login = async (
    email: string,
    password?: string,
    options?: { rememberMe?: boolean }
  ): Promise<{ success: boolean; error?: string; clientPortal?: boolean }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase is not configured. Add your project keys to .env and restart the app.' };
    }
    // Keep BootSplash up through hydrate so the Sign In button does not look idle mid-login.
    setIsAuthLoading(true);
    try {
      await setAuthRememberMe(options?.rememberMe !== false);
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password || '');
      const profile = await getUserProfile(cred.user.uid);
      if (profile?.kind === 'client_portal') {
        await signOut(getFirebaseAuth());
        setIsAuthLoading(false);
        return {
          success: false,
          error:
            'Warehouse portal logins are discontinued. e-POD is signed on the driver’s phone at delivery (hand the phone to the warehouse officer). Ask the fleet office if you need anything else.',
        };
      }
      if (profile?.companyId) return { success: true };

      const invite = await getInviteByEmail(email.trim());
      if (!invite) {
        setIsAuthLoading(false);
        return {
          success: false,
          error: 'This login exists, but the company workspace was never created. Open Create company and submit again with the same details.',
        };
      }

      if (isClientPortalInvite(invite)) {
        await signOut(getFirebaseAuth());
        setIsAuthLoading(false);
        return {
          success: false,
          error:
            'Warehouse portal invites are discontinued. e-POD is collected on the driver’s phone after Inbound — no separate warehouse login.',
        };
      }

      seedingRef.current = true;
      try {
        await joinCompanyFromInvite({
          uid: cred.user.uid,
          email: email.trim(),
          name: invite.name,
          invite,
        });
      } finally {
        seedingRef.current = false;
      }
      return { success: true };
    } catch (error) {
      setIsAuthLoading(false);
      return { success: false, error: mapAuthError(error) };
    }
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase is not configured. Add your project keys to .env and restart the app.' };
    }
    try {
      // Use Firebase's hosted reset page. A custom continue URL fails when the
      // current origin is not on Authorized domains (preview deploys).
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  };

  const signup = async (payload: {
    name: string;
    email: string;
    password: string;
    companyName: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase is not configured. Add your project keys to .env and restart the app.' };
    }

    if (payload.password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
      return { success: false, error: `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.` };
    }

    seedingRef.current = true;
    try {
      const email = payload.email.trim();
      let uid = '';
      try {
        const cred = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          payload.password
        );
        uid = cred.user.uid;
      } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
        if (!code.includes('email-already-in-use')) throw error;
        const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, payload.password);
        uid = cred.user.uid;
        const existing = await getUserProfile(uid);
        if (existing?.companyId) return { success: true };
      }

      const invite = await getInviteByEmail(email);
      if (invite) {
        await joinCompanyFromInvite({
          uid,
          email,
          name: payload.name.trim(),
          invite,
        });
        return { success: true };
      }

      const { company: createdCompany } = await seedCompanyWorkspace({
        uid,
        email,
        name: payload.name.trim(),
        companyName: payload.companyName.trim() || `${payload.name.trim()}'s Fleet`,
        role: { ...OWNER_RBAC_ROLE, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        subscription: makeFreeSubscription(uid, ''),
      });
      await saveCompanyDocument({
        ...createdCompany,
        chartOfAccounts: initialChartOfAccounts,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    } finally {
      seedingRef.current = false;
    }
  };

  const joinTeam = async (payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; clientPortal?: boolean }> => {
    if (!isFirebaseConfigured()) {
      return { success: false, error: 'Firebase is not configured. Add your project keys to .env and restart the app.' };
    }
    if (payload.password.length < MIN_SIGNUP_PASSWORD_LENGTH) {
      return { success: false, error: `Password must be at least ${MIN_SIGNUP_PASSWORD_LENGTH} characters.` };
    }

    seedingRef.current = true;
    try {
      const email = payload.email.trim();
      const name = payload.name.trim() || email.split('@')[0];
      let uid = '';
      try {
        const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, payload.password);
        uid = cred.user.uid;
      } catch (error) {
        const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
        if (!code.includes('email-already-in-use')) throw error;
        try {
          const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, payload.password);
          uid = cred.user.uid;
        } catch {
          return {
            success: false,
            error: 'This email already has a leftover login from an older invite. Ask the owner to delete it in Firebase Console → Authentication → Users, then open this same join link again. Do not use Create company.',
          };
        }
      }

      const existing = await getUserProfile(uid);
      const invite = await getInviteByEmail(email);

      if (existing?.companyId) {
        if (invite && existing.companyId === invite.companyId) {
          if (isClientPortalInvite(invite)) {
            await signOut(getFirebaseAuth());
            return {
              success: false,
              error:
                'Warehouse portal invites are discontinued. e-POD is signed on the driver’s phone at delivery.',
            };
          }
          await joinCompanyFromInvite({ uid, email, name, invite });
          return { success: true };
        }
        if (invite && existing.companyId !== invite.companyId) {
          await signOut(getFirebaseAuth());
          return {
            success: false,
            error: 'This login is still tied to another company. Ask that owner to Untie login on Roles & permissions, then open this join link again.',
          };
        }
        if (existing.kind === 'client_portal') {
          await signOut(getFirebaseAuth());
          return {
            success: false,
            error:
              'Warehouse portal logins are discontinued. e-POD is signed on the driver’s phone at delivery.',
          };
        }
        return { success: true };
      }

      if (!invite) {
        await signOut(getFirebaseAuth());
        return {
          success: false,
          error: 'No company invite was found for this email. Ask the owner to invite you again and send the new join link.',
        };
      }

      if (isClientPortalInvite(invite)) {
        await signOut(getFirebaseAuth());
        return {
          success: false,
          error:
            'Warehouse portal invites are discontinued. e-POD is signed on the driver’s phone after Inbound — no separate warehouse account.',
        };
      }

      await joinCompanyFromInvite({ uid, email, name, invite });
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    } finally {
      seedingRef.current = false;
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured()) {
      await signOut(getFirebaseAuth());
    }
    resetWorkspace();
    setIsAuthenticated(false);
  };

  const hasPermission = (permissionId: string): boolean => {
    return checkPermission(currentUser.role, permissionId, roles);
  };

  const updateUserRole = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const targetUser = users.find(u => u.id === userId);
    if (userId === currentUserId) {
      setCurrentRole(newRole);
    }
    pushAudit(
      'USER_ROLE_ASSIGNED',
      `Assigned user "${targetUser?.name || userId}" to role "${newRole}".`,
      newRole,
      targetUser?.name
    );
    const member = users.find((u) => u.id === userId);
    if (member) {
      saveUserProfile({
        ...(member as UserProfile),
        uid: userId,
        role: newRole,
        status: member.status || 'active',
      }).catch(console.error);
    }
    if (company.id && targetUser?.email && isDriverSeatRole(newRole, roles)) {
      const linkedUid = userId.startsWith('invite-') ? undefined : userId;
      ensureDriverRosterForLogin({
        companyId: company.id,
        email: targetUser.email,
        name: targetUser.name || targetUser.email.split('@')[0],
        uid: linkedUid,
      })
        .then(async () => {
          const refreshed = await loadCollection<Driver>(company.id, 'drivers');
          snapshotCollection('drivers', refreshed);
          setDrivers(refreshed);
        })
        .catch((error) => console.error('Could not sync Driver Roster after role change', error));
    }
  };

  const createRole = (roleData: Omit<RbacRole, 'id' | 'createdAt' | 'updatedAt'>): RbacRole | null => {
    if (requireUpgrade(!canAddRole)) return null;
    const slugId = roleData.name.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const newRole: RbacRole = {
      ...roleData,
      id: slugId || `role_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRoles(prev => [...prev, newRole]);
    pushAudit(
      'ROLE_CREATED',
      `Created custom role "${newRole.name}" with ${newRole.permissions.length} permissions.`,
      newRole.id
    );
    return newRole;
  };

  const updateRole = (id: string, updates: Partial<RbacRole>) => {
    setRoles(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, ...updates, updatedAt: new Date().toISOString() };
      }
      return r;
    }));
    const targetRole = roles.find(r => r.id === id);
    pushAudit(
      'ROLE_UPDATED',
      `Updated permissions and configuration for role "${targetRole?.name || id}".`,
      id
    );
  };

  const deleteRole = (id: string): boolean => {
    const target = roles.find(r => r.id === id);
    if (!target || target.isSystem) return false;

    setUsers(prev => prev.map(u => u.role === id ? { ...u, role: 'Owner' } : u));
    setRoles(prev => prev.filter(r => r.id !== id));

    if (currentRole === id) {
      setCurrentRole('Owner');
    }

    pushAudit(
      'ROLE_DELETED',
      `Deleted custom role "${target.name}". Assigned team members were reassigned to Owner.`,
      id
    );
    return true;
  };

  const resetRolesToDefault = () => {
    if (subscription.plan_id === PLAN_FREE_ID) {
      setRoles([OWNER_RBAC_ROLE]);
    } else {
    setRoles(DEFAULT_RBAC_ROLES);
    }
    pushAudit(
      'PERMISSIONS_RESET',
      'Reset RBAC roles to the plan default.'
    );
  };

  const exportRbacDb = (): string => {
    return JSON.stringify({ version: '3.0.0', exportedAt: new Date().toISOString(), roles, auditLogs: rbacAuditLogs }, null, 2);
  };

  const importRbacDb = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.roles || !Array.isArray(parsed.roles)) {
        return { success: false, message: 'Invalid format: missing roles array.' };
      }
      if (requireUpgrade(hasReachedLimit(parsed.roles.length, planLimits.maxRoles))) {
        return { success: false, message: 'Imported role count exceeds your plan. Subscribe to import a full RBAC matrix.' };
      }
      setRoles(parsed.roles);
      if (Array.isArray(parsed.auditLogs)) {
        setRbacAuditLogs(parsed.auditLogs);
      }
      return { success: true, message: `Imported ${parsed.roles.length} roles into Firebase.` };
    } catch (e: any) {
      return { success: false, message: `Import error: ${e.message}` };
    }
  };

  const updateCompany = (updates: Partial<Company>) => {
    setCompany(prev => ({ ...prev, ...updates }));
  };

  const uploadWorkspaceFile = async (folder: string, file: File) => {
    if (!company.id) {
      throw new Error('Company workspace is missing. Refresh and try again.');
    }
    const used = Math.max(0, Number(company.storageUsedBytes) || 0);
    const max = storageLimitBytes(subscription);
    let uploaded: { url: string; name: string; bytes: number };
    try {
      uploaded = await uploadCompanyFile({
        companyId: company.id,
        folder,
        file,
        usedBytes: used,
        maxBytes: max,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('storage is full')) {
        setIsUpgradeModalOpen(true);
      }
      throw error;
    }
    try {
      await incrementCompanyStorage(company.id, uploaded.bytes);
    } catch (error) {
      console.error('Could not record photo storage usage', error);
    }
    setCompany((prev) => ({
      ...prev,
      storageUsedBytes: Math.max(0, Number(prev.storageUsedBytes) || 0) + uploaded.bytes,
    }));
    return uploaded;
  };

  const addUser = async (userData: Omit<User, 'id' | 'companyId'>): Promise<{ success: boolean; error?: string; emailed?: boolean; inviteUrl?: string }> => {
    if (requireUpgrade(!canAddAccount)) {
      return { success: false, error: 'Team seat limit reached (100 on Free trial). Remove unused invites or subscribe for unlimited seats.' };
    }
    if (String(userData.role || '').toLowerCase() === 'owner') {
      return { success: false, error: 'Invite a working role such as Dispatcher or Driver. Owner cannot be invited.' };
    }

    const inviteId = `invite-${Date.now()}`;
    const newUser: User = {
      ...userData,
      id: inviteId,
      companyId: company.id,
      status: 'invited',
    };
    setUsers((prev) => [...prev, newUser]);
    const inviteUrl = `${window.location.origin}/?join=1&email=${encodeURIComponent(userData.email.trim())}`;
    if (company.id) {
      try {
        await saveInvite({
          email: userData.email,
          name: userData.name,
          role: userData.role,
          companyId: company.id,
          invitedBy: currentUserId,
          createdAt: new Date().toISOString(),
        });
        if (isDriverSeatRole(userData.role, roles)) {
          try {
            await ensureDriverRosterForLogin({
              companyId: company.id,
              email: userData.email,
              name: userData.name.trim() || userData.email.split('@')[0],
            });
            const refreshed = await loadCollection<Driver>(company.id, 'drivers');
            snapshotCollection('drivers', refreshed);
            setDrivers(refreshed);
          } catch (error) {
            console.error('Could not sync Driver Roster for invite', error);
            // Fallback: keep a local roster row so the Owner still sees them in Drivers & Helpers.
            const email = userData.email.trim().toLowerCase();
            const existingRoster = drivers.find(
              (d) => (d.email || '').trim().toLowerCase() === email
            );
            if (!existingRoster) {
              addDriver({
                name: userData.name.trim() || userData.email.split('@')[0],
                phone: '',
                crewRole: 'driver',
                licenseNo: '',
                licenseRestrictions: '',
                licenseExpiry: '',
                email,
                status: 'Available',
                emergencyContact: '',
              });
            } else {
              updateDriver(existingRoster.id, {
                email,
                name: userData.name || existingRoster.name,
                crewRole: 'driver',
              });
            }
          }
        }
      } catch (error) {
        return { success: false, error: mapAuthError(error) };
      }
    }
    pushAudit('USER_ROLE_ASSIGNED', `Invited ${userData.name} (${userData.email}) as ${userData.role}.`, userData.role, userData.name);
    return { success: true, emailed: false, inviteUrl };
  };

  const inviteClientPortal = async (
    _clientId: string,
    _email: string,
    _contactName?: string
  ): Promise<{ success: boolean; error?: string; inviteUrl?: string }> => {
    return {
      success: false,
      error:
        'Warehouse portal accounts are discontinued. After the driver taps I have arrived, hand the driver phone to the warehouse officer to sign e-POD (name + role).',
    };
  };

  const removeUserFromCompany = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerLikeRole(currentUser.role)) {
      return { success: false, error: 'Only the Owner can remove a teammate from this company.' };
    }
    if (userId === currentUserId) {
      return { success: false, error: 'You cannot remove yourself here. Use My profile to delete your own account.' };
    }
    const target = users.find((user) => user.id === userId);
    if (!target) {
      return { success: false, error: 'That teammate is not on this company.' };
    }
    const remainingOwners = users.filter(
      (user) => user.id !== userId && user.status !== 'invited' && isOwnerLikeRole(user.role)
    );
    if (target.status !== 'invited' && isOwnerLikeRole(target.role) && remainingOwners.length === 0) {
      return { success: false, error: 'You cannot remove the only Owner. Assign another Owner first.' };
    }

    setUsers((prev) => prev.filter((user) => user.id !== userId));
    if (isFirebaseConfigured() && company.id) {
      try {
        await removeCompanyMember({
          companyId: company.id,
          memberId: userId,
          email: target.status === 'invited' ? target.email : undefined,
        });
      } catch (error) {
        setUsers((prev) => (prev.some((user) => user.id === userId) ? prev : [...prev, target]));
        return { success: false, error: mapAuthError(error) };
      }
    }
    pushAudit(
      'USER_REMOVED',
      target.status === 'invited'
        ? `Cancelled invite for ${target.name} (${target.email}).`
        : `Removed ${target.name} (${target.email}) from this company.`,
      target.role,
      target.name
    );
    refreshTiedCompanyLogins(
      company.id,
      users.filter((user) => user.id !== userId)
    ).catch(() => {});
    return { success: true };
  };

  const untieTiedCompanyLogin = async (uid: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwnerLikeRole(currentUser.role)) {
      return { success: false, error: 'Only the Owner can untie a leftover login.' };
    }
    if (!company.id || !uid) {
      return { success: false, error: 'That login record is incomplete.' };
    }
    try {
      await untieCompanyLogin({ companyId: company.id, uid });
      setTiedCompanyLogins((prev) => prev.filter((row) => row.id !== uid));
      pushAudit('USER_REMOVED', `Untied leftover login ${uid} from this company.`, undefined, uid);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  };

  const addTruck = (truckData: Omit<Truck, 'id' | 'companyId' | 'netPayloadKg'>): Truck | null => {
    if (requireUpgrade(!canAddTruck)) return null;
    const truckId = nextSlotId(TRUCK_SLOT_PREFIX, trucks.map((t) => t.id), truckLimit);
    if (!truckId) return null;
    const netPayloadKg = Math.max(0, truckData.gvwrKg - truckData.tareWeightKg);
    const helperId = truckData.assignedHelperId && truckData.assignedHelperId !== truckData.assignedDriverId
      ? truckData.assignedHelperId
      : undefined;
    const newTruck: Truck = {
      ...truckData,
      id: truckId,
      companyId: company.id,
      netPayloadKg,
      assignedHelperId: helperId,
    };
    setTrucks(prev => [newTruck, ...prev]);
    if (newTruck.assignedDriverId || helperId) {
      setDrivers((prev) => prev.map((d) => {
        if (d.id === newTruck.assignedDriverId || d.id === helperId) {
          return { ...d, assignedTruckId: truckId };
        }
        return d;
      }));
    }
    return newTruck;
  };

  const updateTruck = (id: string, updates: Partial<Truck>) => {
    const current = trucks.find((t) => t.id === id);
    const nextDriver = 'assignedDriverId' in updates ? (updates.assignedDriverId || undefined) : current?.assignedDriverId;
    const nextHelperRaw = 'assignedHelperId' in updates ? (updates.assignedHelperId || undefined) : current?.assignedHelperId;
    const nextHelper = nextHelperRaw && nextHelperRaw !== nextDriver ? nextHelperRaw : undefined;
    const crewChanged = 'assignedDriverId' in updates || 'assignedHelperId' in updates;

    setTrucks((prev) => prev.map((t) => {
      if (t.id === id) {
        const gvwr = updates.gvwrKg !== undefined ? updates.gvwrKg : t.gvwrKg;
        const tare = updates.tareWeightKg !== undefined ? updates.tareWeightKg : t.tareWeightKg;
        const netPayloadKg = Math.max(0, gvwr - tare);
        return {
          ...t,
          ...updates,
          assignedDriverId: crewChanged ? nextDriver : t.assignedDriverId,
          assignedHelperId: crewChanged ? nextHelper : t.assignedHelperId,
          netPayloadKg,
        };
      }
      if (!crewChanged) return t;
      return {
        ...t,
        assignedDriverId: nextDriver && t.assignedDriverId === nextDriver ? undefined : t.assignedDriverId,
        assignedHelperId: nextHelper && t.assignedHelperId === nextHelper ? undefined : t.assignedHelperId,
      };
    }));

    if (crewChanged) {
      setDrivers((prev) => prev.map((d) => {
        if (d.id === nextDriver || d.id === nextHelper) {
          return { ...d, assignedTruckId: id };
        }
        if (d.assignedTruckId === id) {
          return { ...d, assignedTruckId: undefined };
        }
        return d;
      }));
    }
  };

  const deleteTruck = (id: string) => {
    setTrucks(prev => prev.filter(t => t.id !== id));
  };

  const addDriver = (driverData: Omit<Driver, 'id' | 'companyId' | 'totalTripsCompleted' | 'rating'>): Driver => {
    const newDriver: Driver = {
      ...driverData,
      id: `drv-${Date.now().toString().slice(-4)}`,
      companyId: company.id,
      totalTripsCompleted: 0,
      rating: 5.0,
      crewRole: driverData.crewRole === 'helper' ? 'helper' : 'driver',
    };
    setDrivers(prev => [newDriver, ...prev]);
    if (newDriver.assignedTruckId) {
      const asHelper = isHelperCrew(newDriver);
      const truckId = newDriver.assignedTruckId;
      setTrucks((prev) => prev.map((t) => {
        if (t.id !== truckId) {
          return {
            ...t,
            assignedDriverId: t.assignedDriverId === newDriver.id ? undefined : t.assignedDriverId,
            assignedHelperId: t.assignedHelperId === newDriver.id ? undefined : t.assignedHelperId,
          };
        }
        const assignedDriverId = asHelper ? t.assignedDriverId : newDriver.id;
        const assignedHelperId = asHelper ? newDriver.id : t.assignedHelperId;
        return {
          ...t,
          assignedDriverId,
          assignedHelperId: assignedHelperId === assignedDriverId ? undefined : assignedHelperId,
        };
      }));
    }
    return newDriver;
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    const previous = drivers.find((d) => d.id === id);
    const nextRole = updates.crewRole !== undefined ? updates.crewRole : previous?.crewRole;
    const nextTruckId = updates.assignedTruckId !== undefined ? (updates.assignedTruckId || undefined) : previous?.assignedTruckId;
    const asHelper = nextRole === 'helper';
    setDrivers((prev) => prev.map((d) => (
      d.id === id ? { ...d, ...updates, crewRole: asHelper ? 'helper' : 'driver' } : d
    )));
    if (updates.assignedTruckId !== undefined || updates.crewRole !== undefined) {
      setTrucks((prev) => prev.map((t) => {
        let assignedDriverId = t.assignedDriverId === id ? undefined : t.assignedDriverId;
        let assignedHelperId = t.assignedHelperId === id ? undefined : t.assignedHelperId;
        if (nextTruckId && t.id === nextTruckId) {
          if (asHelper) assignedHelperId = id;
          else assignedDriverId = id;
          if (assignedDriverId && assignedHelperId === assignedDriverId) assignedHelperId = undefined;
        }
        return { ...t, assignedDriverId, assignedHelperId };
      }));
    }
  };

  const deleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'companyId' | 'activeContractsCount'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `clt-${Date.now().toString(36)}`,
      companyId: company.id,
      activeContractsCount: 1,
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addRateCard = (cardData: Omit<RateCard, 'id' | 'companyId'>): RateCard => {
    const newCard: RateCard = {
      ...cardData,
      id: `rc-${Date.now().toString().slice(-4)}`,
      companyId: company.id,
    };
    setRateCards(prev => [newCard, ...prev]);
    return newCard;
  };

  const updateRateCard = (id: string, updates: Partial<RateCard>) => {
    setRateCards(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRateCard = (id: string) => {
    setRateCards(prev => prev.filter(r => r.id !== id));
  };

  const suggestRateCard = (originZone: string, destinationZone: string, truckType: TruckType): RateCard | undefined => {
    return rateCards.find(r => 
      (r.originZone.toLowerCase().includes(originZone.toLowerCase()) || originZone.toLowerCase().includes(r.originZone.toLowerCase())) &&
      (r.destinationZone.toLowerCase().includes(destinationZone.toLowerCase()) || destinationZone.toLowerCase().includes(r.destinationZone.toLowerCase())) &&
      r.truckType === truckType
    );
  };

  const addTruckBan = (banData: Omit<TruckBan, 'id' | 'companyId' | 'createdAt'>): TruckBan => {
    const newBan: TruckBan = {
      ...banData,
      id: `tb-${Date.now().toString(36)}`,
      companyId: company.id,
      createdAt: new Date().toISOString(),
    };
    setTruckBans((prev) => [newBan, ...prev]);
    return newBan;
  };

  const updateTruckBan = (id: string, updates: Partial<TruckBan>) => {
    setTruckBans((prev) => prev.map((ban) => (ban.id === id ? { ...ban, ...updates } : ban)));
  };

  const deleteTruckBan = (id: string) => {
    setTruckBans((prev) => prev.filter((ban) => ban.id !== id));
  };

  const seedMetroManilaTruckBans = (): number => {
    const existing = new Set(truckBans.map((ban) => ban.name.toLowerCase()));
    const now = Date.now();
    const next = METRO_MANILA_TRUCK_BAN_PRESETS
      .filter((preset) => !existing.has(preset.name.toLowerCase()))
      .map((preset, index) => ({
        ...preset,
        id: `tb-preset-${now.toString(36)}-${index}`,
        companyId: company.id,
        createdAt: new Date().toISOString(),
      }));
    if (next.length === 0) return 0;
    setTruckBans((prev) => [...next, ...prev]);
    return next.length;
  };

  const addTrip = (tripData: Omit<Trip, 'id' | 'companyId' | 'tripNumber' | 'waybillNumber' | 'timeline' | 'createdAt' | 'isOverweight' | 'overweightKg'>): Trip | null => {
    if (requireUpgrade(!canAddTransaction)) return null;
    const trk = trucks.find(t => t.id === tripData.truckId);
    const netCap = trk ? trk.netPayloadKg : 10000;
    const isOverweight = tripData.cargoWeightKg > netCap;
    const overweightKg = isOverweight ? (tripData.cargoWeightKg - netCap) : 0;
    
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const tripNumber = `CF-${new Date().getFullYear()}-${randomSeq}`;
    const waybillNumber = `WB-PH-${Date.now().toString().slice(-6)}`;
    const tripId = subscription.plan_id === PLAN_FREE_ID
      ? nextSlotId(TRIP_SLOT_PREFIX, trips.map((t) => t.id), planLimits.maxTransactions || 10)
      : `trp-${Date.now()}`;
    if (!tripId) return null;
    tripsDirtyRef.current = true;

    // Auto-calculate accessorials if overweight or fuel surcharge
    const accessorialsList = [...tripData.accessorials];
    
    if (isOverweight) {
      const overweightFee = overweightKg * (tripData.overweightSurchargePerKg || 12);
      accessorialsList.push({
        id: `acc-ow-${Date.now()}`,
        tripId,
        type: 'overweight',
        name: `DPWH Axle / Overweight Surcharge (${overweightKg.toLocaleString()} kg excess)`,
        calculationDetail: `${overweightKg.toLocaleString()} kg excess payload @ ₱${tripData.overweightSurchargePerKg || 12}/kg`,
        amountPhp: overweightFee,
        isAutoTriggered: true,
        approved: true,
      });
    }

    if (tripData.fuelSurchargePercent > 0) {
      const fuelFee = (tripData.baseRatePhp * tripData.fuelSurchargePercent) / 100;
      accessorialsList.push({
        id: `acc-fuel-${Date.now()}`,
        tripId,
        type: 'fuel_surcharge',
        name: `Diesel Fuel Adjustment Factor (${tripData.fuelSurchargePercent}%)`,
        calculationDetail: `${tripData.fuelSurchargePercent}% on ₱${tripData.baseRatePhp.toLocaleString()} base freight`,
        amountPhp: fuelFee,
        isAutoTriggered: true,
        approved: true,
      });
    }

    if (tripData.tollEstimatePhp > 0) {
      accessorialsList.push({
        id: `acc-toll-${Date.now()}`,
        tripId,
        type: 'toll_reimbursement',
        name: 'Expressway Electronic RFID Tollway Pass-through',
        calculationDetail: `Estimated route toll charges`,
        amountPhp: tripData.tollEstimatePhp,
        isAutoTriggered: true,
        approved: true,
      });
    }

    if (tripData.multiStopCount > 0) {
      const multiStopFee = tripData.multiStopCount * 2500;
      accessorialsList.push({
        id: `acc-multi-${Date.now()}`,
        tripId,
        type: 'multi_stop',
        name: `Multi-Stop Drop Charge (${tripData.multiStopCount} additional location${tripData.multiStopCount > 1 ? 's' : ''})`,
        calculationDetail: `${tripData.multiStopCount} intermediate drops @ ₱2,500/drop`,
        amountPhp: multiStopFee,
        isAutoTriggered: true,
        approved: true,
      });
    }

    const newTrip: Trip = {
      ...tripData,
      id: tripId,
      companyId: company.id,
      tripNumber,
      waybillNumber,
      isOverweight,
      overweightKg,
      accessorials: accessorialsList,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          tripId,
          status: tripData.status,
          timestamp: new Date().toISOString(),
          note: 'Trip booking registered in CasinFreight system.',
          updatedBy: `${currentUser.name} (${currentUser.role})`,
        }
      ],
      createdAt: new Date().toISOString(),
    };

    setTrips(prev => [newTrip, ...prev]);

    // Update truck status
    if (trk) {
      updateTruck(trk.id, { 
        status: tripData.status === 'Pending' ? 'Available' : (tripData.status === 'Loaded' ? 'Loading' : 'On Trip'),
        currentTripId: tripId 
      });
    }

    return newTrip;
  };

  const updateTrip = (id: string, updates: Partial<Trip>) => {
    tripsDirtyRef.current = true;
    setTrips(prev => prev.map(trip => {
      if (trip.id === id) {
        return { ...trip, ...updates };
      }
      return trip;
    }));
  };

  const updateTripStatus = (id: string, newStatus: TripStatus, note?: string, location?: string, extras?: Partial<Trip>, options?: { allowRetraction?: boolean; retraction?: TripStatusRetractionRequest }) => {
    setTrips(prev => prev.map(trip => {
      if (trip.id === id) {
        const previousStatus = trip.status;
        const merged = { ...trip, ...extras };
        if (
          isStatusRetraction(previousStatus, newStatus, merged.holdFromStatus || trip.holdFromStatus)
          && !options?.allowRetraction
        ) {
          window.alert('Shipment status cannot be rolled back directly. Submit a reason for Owner or General Manager approval.');
          return trip;
        }
        if (!options?.allowRetraction) {
          const blocked = missingSignaturesForStatus(merged, newStatus);
          if (blocked) {
            window.alert(blocked);
            return trip;
          }
        }
        tripsDirtyRef.current = true;

        const retraction = options?.retraction;
        const newEvent = {
          id: `tl-${Date.now()}`,
          tripId: id,
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: retraction
            ? `Status rollback: ${retraction.fromStatus} → ${retraction.toStatus}.`
            : (note || `Trip status updated to ${newStatus}`),
          updatedBy: `${currentUser.name} (${currentUser.role})`,
          location: location || undefined,
          ...(retraction
            ? {
                kind: 'status_rollback' as const,
                retraction: timelineRetractionFromRequest(retraction),
              }
            : {}),
        };

        const updatedTrip = {
          ...merged,
          status: newStatus,
          actualDelivery: (newStatus === 'Delivered' || newStatus === 'Invoiced') ? (merged.actualDelivery || new Date().toISOString()) : merged.actualDelivery,
          timeline: [...merged.timeline, newEvent],
        };

        // If delivered or invoiced, free the truck
        if (newStatus === 'Delivered' || newStatus === 'Invoiced') {
          const trk = trucks.find(t => t.id === trip.truckId);
          if (trk) {
            updateTruck(trk.id, { status: 'Available', currentTripId: undefined });
          }

          // If transitioning to Invoiced, ensure an invoice is created
          if (newStatus === 'Invoiced') {
            setTimeout(() => {
              setInvoices(currInvoices => {
                const existing = currInvoices.find(inv => inv.tripId === id);
                if (existing) return currInvoices;

                const trkObj = trucks.find(t => t.id === trip.truckId);
                const lineItems = [
                  {
                    id: `li-${Date.now()}-base`,
                    description: `Freight Hauling: ${trip.originZone} to ${trip.destinationZone} (${trkObj ? trkObj.type : 'Standard Truck'} / Waybill #${trip.waybillNumber})`,
                    qty: 1,
                    unitPrice: trip.baseRatePhp,
                    total: trip.baseRatePhp,
                  },
                  ...trip.accessorials.filter(a => a.approved).map((acc, idx) => ({
                    id: `li-${Date.now()}-${idx}`,
                    description: `${acc.name} (${acc.calculationDetail})`,
                    qty: 1,
                    unitPrice: acc.amountPhp,
                    total: acc.amountPhp,
                    isAccessorial: true,
                    accessorialType: acc.type,
                  }))
                ];

                const subtotalPhp = lineItems.reduce((sum, item) => sum + item.total, 0);
                const vatPercent = 12;
                const vatAmountPhp = (subtotalPhp * vatPercent) / 100;
                const grandTotalPhp = subtotalPhp + vatAmountPhp;

                const newInvoice: Invoice = {
                  id: `inv-${Date.now()}`,
                  tripId: id,
                  companyId: company.id,
                  clientId: trip.clientId,
                  invoiceNumber: `INV-2026-${String(currInvoices.length + 101).padStart(4, '0')}`,
                  issueDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'Sent',
                  lineItems,
                  subtotalPhp,
                  vatPercent,
                  vatAmountPhp,
                  withholdingTaxPercent: 2,
                  withholdingTaxAmountPhp: (subtotalPhp * 2) / 100,
                  grandTotalPhp,
                  notes: 'Thank you for your business. Payment terms 30 days net.',
                  paymentMethod: 'Bank Transfer (BDO/BPI)',
                };

                return [newInvoice, ...currInvoices];
              });
            }, 0);
          }
        } else if (newStatus === 'In Transit') {
          const trk = trucks.find(t => t.id === trip.truckId);
          if (trk) {
            updateTruck(trk.id, { status: 'On Trip', currentTripId: id });
          }
        } else if (newStatus === 'Cancelled') {
          const trk = trucks.find(t => t.id === trip.truckId);
          if (trk) {
            updateTruck(trk.id, { status: 'Available', currentTripId: undefined });
          }
        } else if (newStatus === 'On Hold') {
          const trk = trucks.find(t => t.id === trip.truckId);
          if (trk) {
            const kind = merged.exceptionKind;
            if (kind === 'breakdown' || kind === 'accident') {
              updateTruck(trk.id, { status: 'Maintenance', currentTripId: id });
            } else if (previousStatus === 'In Transit') {
              updateTruck(trk.id, { status: 'On Trip', currentTripId: id });
            } else {
              updateTruck(trk.id, { status: 'Available', currentTripId: undefined });
            }
          }
        }

        // Emit notification for status change
        const trk = trucks.find(t => t.id === trip.truckId);
        const clt = clients.find(c => c.id === trip.clientId);
        addNotification({
          category: 'trip_update',
          title: `${trip.tripNumber}: Status updated to "${newStatus}"`,
          message: `${trk ? trk.plateNumber : 'Truck'} (${trip.originZone} ➔ ${trip.destinationZone}) is now marked as ${newStatus}.${note ? ` Note: ${note}` : ''}`,
          isRead: false,
          severity: newStatus === 'Delivered' ? 'success' : newStatus === 'Cancelled' || newStatus === 'On Hold' ? 'warning' : 'info',
          tripId: id,
          actionType: 'view_trip',
          actionLabel: 'View Trip Dispatch',
          metadata: {
            plateNumber: trk?.plateNumber,
            clientName: clt?.name,
            statusBadge: newStatus
          }
        });

        return updatedTrip;
      }
      return trip;
    }));
  };

  const requestTripStatusRetraction = (
    tripId: string,
    toStatus: TripStatus,
    reasonCategory: TripRetractionReasonCategory,
    detailedReason: string
  ) => {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) {
      throw new Error('Shipment was not found.');
    }
    if (trip.activeStatusRetraction?.status === 'Pending_Approval') {
      throw new Error('This shipment already has a status rollback waiting for Owner or General Manager review.');
    }
    if (!isStatusRetraction(trip.status, toStatus, trip.holdFromStatus)) {
      throw new Error('That is not a status rollback.');
    }
    const reason = detailedReason.trim();
    if (reason.length < 10) {
      throw new Error('Write a specific reason (at least 10 characters) before submitting.');
    }

    const req: TripStatusRetractionRequest = {
      id: `trip-retract-${Date.now()}`,
      tripId,
      fromStatus: trip.status,
      toStatus,
      requestedBy: currentUser.name || currentUser.email,
      requestedByRole: currentUser.role,
      requestedAt: new Date().toISOString(),
      reasonCategory,
      detailedReason: reason,
      status: 'Pending_Approval',
    };

    tripsDirtyRef.current = true;
    setTrips((prev) => prev.map((item) => (
      item.id === tripId ? { ...item, activeStatusRetraction: req } : item
    )));

    addNotification({
      category: 'trip_update',
      title: `${trip.tripNumber}: Status rollback requested`,
      message: `${req.requestedBy} (${req.requestedByRole}) wants to move this shipment from ${req.fromStatus} back to ${req.toStatus}. Reason: "${reason}". Owner or General Manager must read the reason before approving.`,
      isRead: false,
      severity: 'warning',
      tripId,
      actionType: 'view_trip',
      actionLabel: 'Review rollback request',
      metadata: {
        statusBadge: 'Rollback pending',
      },
    });
  };

  const applyOwnTripStatusRetraction = (
    tripId: string,
    toStatus: TripStatus,
    reasonCategory: TripRetractionReasonCategory,
    detailedReason: string
  ) => {
    if (!isTripRetractionApprover(currentUser.role, roles)) {
      throw new Error('Only the Owner or General Manager can roll back status without a pending request.');
    }
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) {
      throw new Error('Shipment was not found.');
    }
    if (!isStatusRetraction(trip.status, toStatus, trip.holdFromStatus)) {
      throw new Error('That is not a status rollback.');
    }
    const reason = detailedReason.trim();
    if (reason.length < 10) {
      throw new Error('Write a specific reason (at least 10 characters) before rolling back.');
    }

    const resolved: TripStatusRetractionRequest = {
      id: `trip-retract-${Date.now()}`,
      tripId,
      fromStatus: trip.status,
      toStatus,
      requestedBy: currentUser.name || currentUser.email,
      requestedByRole: currentUser.role,
      requestedAt: new Date().toISOString(),
      reasonCategory,
      detailedReason: reason,
      status: 'Approved',
      reviewedBy: currentUser.name || currentUser.email,
      reviewedByRole: currentUser.role,
      reviewedAt: new Date().toISOString(),
      reviewNote: `Applied directly by ${currentUser.role}.`,
    };

    updateTripStatus(
      tripId,
      toStatus,
      `Status rollback: ${trip.status} → ${toStatus}.`,
      undefined,
      {
        activeStatusRetraction: null,
        statusRetractionHistory: [...(trip.statusRetractionHistory || []), resolved],
      },
      { allowRetraction: true, retraction: resolved }
    );
  };

  const approveTripStatusRetraction = (tripId: string, reviewNote: string) => {
    if (!isTripRetractionApprover(currentUser.role, roles)) {
      throw new Error('Only the Owner or General Manager can approve a shipment status rollback.');
    }
    const trip = trips.find((item) => item.id === tripId);
    const req = trip?.activeStatusRetraction;
    if (!trip || !req || req.status !== 'Pending_Approval') {
      throw new Error('There is no pending status rollback to approve.');
    }

    const resolved: TripStatusRetractionRequest = {
      ...req,
      status: 'Approved',
      reviewedBy: currentUser.name || currentUser.email,
      reviewedByRole: currentUser.role,
      reviewedAt: new Date().toISOString(),
      reviewNote: reviewNote.trim() || `Approved by ${currentUser.role} ${currentUser.name}.`,
    };

    updateTripStatus(
      tripId,
      req.toStatus,
      `Status rollback: ${req.fromStatus} → ${req.toStatus}.`,
      undefined,
      {
        activeStatusRetraction: null,
        statusRetractionHistory: [...(trip.statusRetractionHistory || []), resolved],
      },
      { allowRetraction: true, retraction: resolved }
    );

    addNotification({
      category: 'trip_update',
      title: `${trip.tripNumber}: Status rollback approved`,
      message: `${resolved.reviewedBy} approved moving this shipment back to ${req.toStatus}. Original reason: "${req.detailedReason}"`,
      isRead: false,
      severity: 'success',
      tripId,
      actionType: 'view_trip',
      actionLabel: 'View shipment',
      metadata: { statusBadge: req.toStatus },
    });
  };

  const rejectTripStatusRetraction = (tripId: string, reviewNote: string) => {
    if (!isTripRetractionApprover(currentUser.role, roles)) {
      throw new Error('Only the Owner or General Manager can reject a shipment status rollback.');
    }
    const note = reviewNote.trim();
    if (!note) {
      throw new Error('Enter a note explaining why the rollback was rejected.');
    }
    const trip = trips.find((item) => item.id === tripId);
    const req = trip?.activeStatusRetraction;
    if (!trip || !req || req.status !== 'Pending_Approval') {
      throw new Error('There is no pending status rollback to reject.');
    }

    const resolved: TripStatusRetractionRequest = {
      ...req,
      status: 'Rejected',
      reviewedBy: currentUser.name || currentUser.email,
      reviewedByRole: currentUser.role,
      reviewedAt: new Date().toISOString(),
      reviewNote: note,
    };

    const rejectEvent = {
      id: `tl-${Date.now()}`,
      tripId,
      status: trip.status,
      timestamp: new Date().toISOString(),
      note: `Status rollback rejected. Kept at ${trip.status}.`,
      updatedBy: `${currentUser.name} (${currentUser.role})`,
      kind: 'status_rollback_rejected' as const,
      retraction: timelineRetractionFromRequest(resolved),
    };

    tripsDirtyRef.current = true;
    setTrips((prev) => prev.map((item) => (
      item.id === tripId
        ? {
            ...item,
            activeStatusRetraction: null,
            statusRetractionHistory: [...(item.statusRetractionHistory || []), resolved],
            timeline: [...item.timeline, rejectEvent],
          }
        : item
    )));

    addNotification({
      category: 'trip_update',
      title: `${trip.tripNumber}: Status rollback rejected`,
      message: `${resolved.reviewedBy} kept the shipment at ${trip.status}. Note: "${note}"`,
      isRead: false,
      severity: 'warning',
      tripId,
      actionType: 'view_trip',
      actionLabel: 'View shipment',
      metadata: { statusBadge: trip.status },
    });
  };

  const addAccessorialToTrip = (tripId: string, accessorial: Omit<TripAccessorial, 'id' | 'tripId'>) => {
    tripsDirtyRef.current = true;
    setTrips(prev => prev.map(trip => {
      if (trip.id === tripId) {
        const newAcc: TripAccessorial = {
          ...accessorial,
          id: `acc-${Date.now()}`,
          tripId,
        };
        return {
          ...trip,
          accessorials: [...trip.accessorials, newAcc],
        };
      }
      return trip;
    }));
  };

  const removeAccessorialFromTrip = (tripId: string, accessorialId: string) => {
    tripsDirtyRef.current = true;
    setTrips(prev => prev.map(trip => {
      if (trip.id === tripId) {
        return {
          ...trip,
          accessorials: trip.accessorials.filter(a => a.id !== accessorialId),
        };
      }
      return trip;
    }));
  };

  const submitPOD = (tripId: string, podData: Omit<POD, 'id' | 'tripId' | 'signedAt'>) => {
    if (isFieldDriverRole(currentUser.role)) {
      window.alert(
        'Drivers cannot stamp warehouse e-POD in the browser. Use the CasinFreight Driver phone app after Inbound (hand the phone to the warehouse officer), or have office staff stamp it here.'
      );
      return;
    }
    const current = trips.find((t) => t.id === tripId);
    if (current && current.status !== 'Inbound' && current.status !== 'Delivered' && current.status !== 'Invoiced') {
      window.alert('Mark the trip Inbound first (driver taps “I have arrived” at the warehouse), then capture e-POD.');
      return;
    }
    tripsDirtyRef.current = true;
    const pod: POD = {
      ...podData,
      id: `pod-${Date.now()}`,
      tripId,
      signedAt: new Date().toISOString(),
    };

    setTrips(prev => prev.map(trip => {
      if (trip.id === tripId) {
        const newEvent = {
          id: `tl-${Date.now()}`,
          tripId,
          status: 'Delivered' as TripStatus,
          timestamp: new Date().toISOString(),
          note: `Digital POD signed by ${podData.receiverName} (${podData.receiverRole}). Condition: ${podData.conditionStatus}.`,
          updatedBy: `${currentUser.name} (${currentUser.role})`,
        };
        return {
          ...trip,
          status: 'Delivered',
          actualDelivery: new Date().toISOString(),
          pod,
          timeline: [...trip.timeline, newEvent],
        };
      }
      return trip;
    }));
  };

  const assignedDriverRosterId = isFieldDriverRole(currentUser.role)
    ? resolveDriverRosterId(
        drivers,
        currentUserId,
        users.find((u) => u.id === currentUserId)?.email || currentUser.email
      )
    : null;
  const isFieldDriverSession = isFieldDriverRole(currentUser.role);

  const assertAssignedDriverTrip = (tripId: string): Trip => {
    if (!isFieldDriverSession) {
      throw new Error('Only the assigned driver can use field actions.');
    }
    if (!assignedDriverRosterId) {
      throw new Error('Your login is not linked to a Driver Roster row. Ask dispatch to save your email on your driver record.');
    }
    const trip = trips.find((t) => t.id === tripId);
    if (!trip || trip.driverId !== assignedDriverRosterId) {
      throw new Error('This trip is not assigned to you.');
    }
    return trip;
  };

  const addAssignedDriverFieldEvent = async (params: {
    tripId: string;
    kind: FieldEvent['kind'];
    note?: string;
    photoUrl?: string;
    signatureDataUrl?: string;
  }): Promise<FieldEvent> => {
    const trip = assertAssignedDriverTrip(params.tripId);
    if (!company.id) throw new Error('Company workspace is missing.');
    const event: FieldEvent = {
      id: `fe-${Date.now()}`,
      companyId: company.id,
      tripId: params.tripId,
      kind: params.kind,
      createdAt: new Date().toISOString(),
      actorUid: currentUserId,
      actorName: currentUser.name || currentUser.email,
      photoUrl: params.photoUrl,
      signatureDataUrl: params.signatureDataUrl,
      note: params.note,
      gpsEnabled: true,
      isMocked: false,
    };
    await upsertCollection(company.id, 'fieldEvents', [
      trip.clientId ? ({ ...event, clientId: trip.clientId } as FieldEvent & { clientId: string }) : event,
    ]);
    setFieldEvents((prev) => {
      if (prev.some((row) => row.id === event.id)) return prev;
      return [...prev, event];
    });
    return event;
  };

  const saveAssignedDriverSignoff = async (tripId: string, signatureDataUrl: string) => {
    const trip = assertAssignedDriverTrip(tripId);
    if (!company.id) throw new Error('Company workspace is missing.');
    if (!signatureDataUrl.startsWith('data:image') || signatureDataUrl.length < 120) {
      throw new Error('Sign on the pad first.');
    }
    const hasDocs =
      Boolean(trip.deliveryNoteNumber?.trim()) && Boolean(trip.gatePassNumber?.trim());
    const sealed =
      Boolean(trip.securitySealNumber?.trim()) ||
      hasDocs ||
      trip.status === 'Loaded' ||
      trip.status === 'In Transit' ||
      trip.status === 'Inbound' ||
      fieldEvents.some((e) => e.tripId === tripId && e.kind === 'seal_photo');
    if (!sealed) {
      throw new Error(
        'Take a seal photo first, or wait for dispatch to post the seal number / official DN and gate pass.'
      );
    }

    // Keep trip docs lean — oversized data URLs are a common Firestore write failure.
    let compactSignature = signatureDataUrl;
    try {
      compactSignature = await shrinkSignatureDataUrl(compactSignature);
    } catch {
      // Keep original if re-encode fails; length check below still applies.
    }
    if (compactSignature.length > 220_000) {
      compactSignature = await shrinkSignatureDataUrl(compactSignature, 560, 0.45);
    }
    if (!compactSignature.startsWith('data:image') || compactSignature.length < 120) {
      throw new Error('Could not read that signature. Use “Sign full screen”, then tap Use this signature.');
    }

    const signedAt = new Date().toISOString();
    const driverSignoff = {
      name: currentUser.name || currentUser.email || 'Driver',
      role: 'Driver',
      signedAt,
      signatureDataUrl: compactSignature,
    };
    const dispatcherSigned = hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl);
    const shouldGoInTransit = dispatcherSigned && (trip.status === 'Loaded' || trip.status === 'Pending');
    const nextStatus = shouldGoInTransit ? ('In Transit' as const) : trip.status;
    const timelineNote = shouldGoInTransit
      ? 'Driver signed cargo receipt. Dispatcher yard release already on file — trip is In Transit.'
      : 'Driver signed received sealed cargo (browser).';
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      tripId,
      status: nextStatus,
      timestamp: signedAt,
      note: timelineNote,
      updatedBy: `${currentUser.name} (Driver)`,
    };
    const patchedTrip: Trip = {
      ...trip,
      driverSignoff,
      status: nextStatus,
      timeline: [...(trip.timeline || []), timelineEntry],
    };

    // Await a lean merge write immediately (do not rely on the 500ms debounce).
    try {
      await upsertCollection(company.id, 'trips', [
        {
          id: tripId,
          driverSignoff,
          status: nextStatus,
          timeline: patchedTrip.timeline,
        } as Trip,
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not save your signature to the trip. ${detail}`);
    }

    pinDriverTrip(tripId, { status: nextStatus, driverSignoff });
    tripsDirtyRef.current = true;
    tripsPersistTokenRef.current += 1;
    setTrips((prev) => prev.map((row) => (row.id === tripId ? patchedTrip : row)));

    // Field event is audit-only — never block cargo signoff if this fails.
    try {
      await addAssignedDriverFieldEvent({
        tripId,
        kind: 'dispatch_signature',
        note: 'Driver cargo receipt signed in browser',
      });
    } catch (error) {
      console.warn('Driver signoff saved on trip; field event audit failed', error);
    }
  };

  const markAssignedDriverArrived = async (tripId: string) => {
    const trip = assertAssignedDriverTrip(tripId);
    if (!company.id) throw new Error('Company workspace is missing.');
    if (trip.status !== 'In Transit' && trip.status !== 'Inbound') {
      throw new Error('Trip must be In Transit before you can mark arrival.');
    }
    if (!hasSignedInk(trip.driverSignoff?.signatureDataUrl) || !hasSignedInk(trip.dispatcherSignoff?.signatureDataUrl)) {
      throw new Error('Dispatcher and driver signatures must both be on file before arrival.');
    }

    const signedAt = new Date().toISOString();
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      tripId,
      status: 'Inbound' as const,
      timestamp: signedAt,
      note: 'Driver marked I have arrived at the warehouse (Inbound). Warehouse e-POD can be signed on the Driver phone app or by office on the web.',
      updatedBy: `${currentUser.name} (Driver)`,
    };
    const timeline = [...(trip.timeline || []), timelineEntry];
    const patchedTrip: Trip = {
      ...trip,
      status: 'Inbound',
      timeline,
    };

    try {
      await upsertCollection(company.id, 'trips', [
        {
          id: tripId,
          status: 'Inbound',
          timeline,
        } as Trip,
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not set Inbound. ${detail}`);
    }

    pinDriverTrip(tripId, { status: 'Inbound' });
    tripsDirtyRef.current = true;
    tripsPersistTokenRef.current += 1;
    setTrips((prev) => prev.map((row) => (row.id === tripId ? patchedTrip : row)));

    try {
      await addAssignedDriverFieldEvent({
        tripId,
        kind: 'delivery_geo',
        note: 'I have arrived (Inbound) — browser',
      });
    } catch (error) {
      console.warn('Inbound saved on trip; arrival field event failed', error);
    }
  };

  const saveAssignedDriverWarehousePod = async (params: {
    tripId: string;
    signatureDataUrl: string;
    receiverName: string;
    receiverRole: string;
    conditionStatus?: POD['conditionStatus'];
  }) => {
    const trip = assertAssignedDriverTrip(params.tripId);
    if (!company.id) throw new Error('Company workspace is missing.');
    if (trip.status !== 'Inbound' && trip.status !== 'Delivered') {
      throw new Error('Mark I have arrived (Inbound) before warehouse e-POD.');
    }
    if (!hasSignedInk(trip.driverSignoff?.signatureDataUrl)) {
      throw new Error('Driver must sign cargo receipt before warehouse e-POD.');
    }
    const receiverName = params.receiverName.trim();
    const receiverRole = params.receiverRole.trim() || 'Warehouse receiving officer';
    if (!receiverName || receiverName.length < 2) {
      throw new Error('Enter the warehouse signer’s full name.');
    }
    if (!params.signatureDataUrl.startsWith('data:image') || params.signatureDataUrl.length < 120) {
      throw new Error('Warehouse must sign on the pad first.');
    }

    let compactSignature = params.signatureDataUrl;
    try {
      compactSignature = await shrinkSignatureDataUrl(compactSignature);
    } catch {
      // keep original
    }
    if (compactSignature.length > 220_000) {
      compactSignature = await shrinkSignatureDataUrl(compactSignature, 560, 0.45);
    }

    const signedAt = new Date().toISOString();
    const conditionStatus = params.conditionStatus || 'Good Condition';
    const pod: POD = {
      id: trip.pod?.id || `pod-${params.tripId}`,
      tripId: params.tripId,
      receiverName,
      receiverRole,
      signedAt,
      signatureDataUrl: compactSignature,
      photoUrls: trip.pod?.photoUrls || [],
      conditionStatus,
      notes: trip.pod?.notes,
    };
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      tripId: params.tripId,
      status: 'Delivered' as const,
      timestamp: signedAt,
      note: `e-POD signed on driver browser by ${receiverName} (${receiverRole}).`,
      updatedBy: `${currentUser.name} (Driver)`,
    };
    const timeline = [...(trip.timeline || []), timelineEntry];
    const patchedTrip: Trip = {
      ...trip,
      pod,
      status: 'Delivered',
      actualDelivery: trip.actualDelivery || signedAt,
      timeline,
    };

    try {
      await upsertCollection(company.id, 'trips', [
        {
          id: params.tripId,
          pod,
          status: 'Delivered',
          actualDelivery: patchedTrip.actualDelivery,
          timeline,
        } as Trip,
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not save warehouse e-POD. ${detail}`);
    }

    pinDriverTrip(params.tripId, {
      status: 'Delivered',
      pod,
      actualDelivery: patchedTrip.actualDelivery,
    });
    tripsDirtyRef.current = true;
    tripsPersistTokenRef.current += 1;
    setTrips((prev) => prev.map((row) => (row.id === params.tripId ? patchedTrip : row)));

    try {
      await addAssignedDriverFieldEvent({
        tripId: params.tripId,
        kind: 'pod_signature',
        note: `Warehouse e-POD by ${receiverName} (${receiverRole}) — browser`,
      });
    } catch (error) {
      console.warn('Warehouse e-POD saved on trip; field event audit failed', error);
    }
  };

  const createInvoiceForTrip = (tripId: string): Invoice => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip) throw new Error('Trip not found');

    const trk = trucks.find(t => t.id === trip.truckId);
    const existing = invoices.find(inv => inv.tripId === tripId);
    if (existing) return existing;

    const lineItems = [
      {
        id: `li-${Date.now()}-base`,
        description: `Freight Hauling: ${trip.originZone} to ${trip.destinationZone} (${trk ? trk.type : 'Standard Truck'} / Waybill #${trip.waybillNumber})`,
        qty: 1,
        unitPrice: trip.baseRatePhp,
        total: trip.baseRatePhp,
      },
      ...trip.accessorials.filter(a => a.approved).map((acc, idx) => ({
        id: `li-${Date.now()}-${idx}`,
        description: `${acc.name} (${acc.calculationDetail})`,
        qty: 1,
        unitPrice: acc.amountPhp,
        total: acc.amountPhp,
        isAccessorial: true,
        accessorialType: acc.type,
      }))
    ];

    const subtotalPhp = lineItems.reduce((sum, item) => sum + item.total, 0);
    const vatPercent = 12;
    const vatAmountPhp = (subtotalPhp * vatPercent) / 100;
    const withholdingTaxPercent = 2; // PH EWT standard
    const withholdingTaxAmountPhp = (subtotalPhp * withholdingTaxPercent) / 100;
    const grandTotalPhp = subtotalPhp + vatAmountPhp; // Net receivable

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice: Invoice = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tripId,
      companyId: company.id,
      clientId: trip.clientId,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      lineItems,
      subtotalPhp,
      vatPercent,
      vatAmountPhp,
      withholdingTaxPercent,
      withholdingTaxAmountPhp,
      grandTotalPhp,
      status: 'Draft',
      notes: `Standard payment terms apply. Remit via BDO / BPI Bank Transfer to ${company.name}.`,
    };

    setInvoices(prev => [newInvoice, ...prev]);
    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated = { ...inv, ...updates };
        if (updates.lineItems) {
          const subtotal = updates.lineItems.reduce((sum, item) => sum + item.total, 0);
          const vat = (subtotal * (updated.vatPercent || 12)) / 100;
          const grand = subtotal + vat;
          return { ...updated, subtotalPhp: subtotal, vatAmountPhp: vat, grandTotalPhp: grand };
        }
        return updated;
      }
      return inv;
    }));
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const paidAt = status === 'Paid' ? new Date().toISOString() : inv.paidAt;
        return { ...inv, status, paidAt };
      }
      return inv;
    }));
  };

  const reconcileAndLockInvoice = (id: string, pop: ProofOfPayment) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated: Invoice = {
          ...inv,
          status: 'Paid',
          isLocked: true,
          proofOfPayment: pop,
          paidAt: pop.paymentDate || new Date().toISOString(),
          paymentMethod: pop.paymentMethod,
          paymentReference: pop.paymentReference,
        };

        const clt = clients.find(c => c.id === inv.clientId);
        
        // Auto-post double-entry Journal Entry for payment reconciliation & 2% BIR 2307 EWT
        const netCash = Number(pop.amountPaidPhp) || 0;
        const ewtTax = Number(pop.ewtDeductedPhp) || 0;
        const grossReceivable = netCash + ewtTax;

        const newJv: JournalEntry = {
          id: `jv-${Date.now()}`,
          entryNumber: `JV-${new Date().getFullYear()}-${(journalEntries.length + 1).toString().padStart(4, '0')}`,
          date: pop.paymentDate || new Date().toISOString().split('T')[0],
          referenceType: 'Payment_Received',
          referenceId: inv.id,
          referenceNumber: pop.paymentReference,
          entityName: clt?.name,
          postedBy: `${pop.verifiedBy} (Payment Reconciled)`,
          isLocked: true,
          notes: `Official payment receipt lock for invoice ${inv.invoiceNumber}. OR #${pop.officialReceiptNo || 'N/A'}.`,
          lines: [
            {
              id: `jvl-pr-${Date.now()}-1`,
              accountCode: pop.bankAccountUsed?.includes('BPI') ? '1020' : '1010',
              accountName: pop.bankAccountUsed?.includes('BPI') ? 'Cash in Bank - BPI Corporate (Acct #2419-0018-44)' : 'Cash in Bank - BDO Corporate (Acct #0014-9982-1092)',
              debitPhp: netCash,
              creditPhp: 0,
              memo: `Net remittance received via ${pop.paymentMethod}`,
              clientName: clt?.name,
            },
            ...(ewtTax > 0 ? [{
              id: `jvl-pr-${Date.now()}-2`,
              accountCode: '1130',
              accountName: 'BIR Form 2307 Creditable Withholding Tax (2% EWT Asset)',
              debitPhp: ewtTax,
              creditPhp: 0,
              memo: `2% BIR Form 2307 Creditable Tax Withheld`,
              clientName: clt?.name,
            }] : []),
            {
              id: `jvl-pr-${Date.now()}-3`,
              accountCode: '1120',
              accountName: 'Accounts Receivable - Trade (Shippers & Logistics Clients)',
              debitPhp: 0,
              creditPhp: grossReceivable,
              memo: `Settlement of invoice ${inv.invoiceNumber}`,
              clientName: clt?.name,
            }
          ],
          totalDebitPhp: grossReceivable,
          totalCreditPhp: grossReceivable,
        };

        setJournalEntries(prev => [newJv, ...prev]);

        // Emit audit notification
        addNotification({
          category: 'invoice_payment',
          title: `Payment Locked: ${inv.invoiceNumber} (₱${(pop.amountPaidPhp || inv.grandTotalPhp).toLocaleString()})`,
          message: `Proof of Payment attached (Ref: ${pop.paymentReference}). Reconciled & locked by ${pop.verifiedBy}.`,
          isRead: false,
          severity: 'success',
          invoiceId: inv.id,
          actionType: 'view_invoice',
          actionLabel: 'Inspect Reconciled Invoice',
          metadata: {
            clientName: clt?.name,
            amountPhp: pop.amountPaidPhp || inv.grandTotalPhp,
            statusBadge: 'Locked & Paid',
          }
        });

        return updated;
      }
      return inv;
    }));
  };

  const unlockInvoiceForAdjustment = (id: string, reason: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated: Invoice = {
          ...inv,
          isLocked: false,
          notes: `${inv.notes || ''}\n[Unlocked on ${new Date().toLocaleDateString()} by ${currentUser.name}: ${reason}]`.trim(),
        };

        addNotification({
          category: 'invoice_payment',
          title: `Invoice Unlocked: ${inv.invoiceNumber}`,
          message: `Unlocked for administrative billing adjustment by ${currentUser.name}. Reason: "${reason}"`,
          isRead: false,
          severity: 'warning',
          invoiceId: inv.id,
          actionType: 'view_invoice',
          actionLabel: 'Review Invoice',
        });

        return updated;
      }
      return inv;
    }));
  };

  const requestInvoiceRetraction = (id: string, reasonCategory: RetractionReasonCategory, detailedReason: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const req: InvoiceRetractionRequest = {
          id: `retract-${Date.now()}`,
          invoiceId: id,
          requestedBy: currentUser.name,
          requestedByRole: currentUser.role,
          requestedAt: new Date().toISOString(),
          reasonCategory,
          detailedReason,
          status: 'Pending_Owner_Approval',
        };

        const updated: Invoice = {
          ...inv,
          status: 'Retraction_Pending',
          activeRetractionRequest: req,
        };

        // Notify Owner / Executive
        addNotification({
          category: 'invoice_retraction',
          title: `Retraction Requested: ${inv.invoiceNumber}`,
          message: `Operator ${currentUser.name} (${currentUser.role}) requested to retract ${inv.invoiceNumber}. Reason: "${detailedReason}". Requires Owner Approval.`,
          isRead: false,
          severity: 'warning',
          invoiceId: inv.id,
          actionType: 'view_invoice',
          actionLabel: 'Review Retraction Request',
          metadata: {
            amountPhp: inv.grandTotalPhp,
            statusBadge: 'Retraction Pending',
          }
        });

        return updated;
      }
      return inv;
    }));
  };

  const approveInvoiceRetraction = (id: string, ownerReviewNote: string, action: 'revert_to_draft' | 'void_invoice') => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const currentReq = inv.activeRetractionRequest;
        const resolvedReq: InvoiceRetractionRequest = currentReq ? {
          ...currentReq,
          status: 'Approved',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          ownerReviewNote,
        } : {
          id: `retract-${Date.now()}`,
          invoiceId: id,
          requestedBy: 'Direct Owner Override',
          requestedByRole: currentUser.role,
          requestedAt: new Date().toISOString(),
          reasonCategory: 'Other Administrative Error',
          detailedReason: ownerReviewNote,
          status: 'Approved',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          ownerReviewNote,
        };

        const newStatus: InvoiceStatus = action === 'revert_to_draft' ? 'Draft' : 'Voided';

        const updated: Invoice = {
          ...inv,
          status: newStatus,
          isLocked: action === 'revert_to_draft' ? false : true, // If voided, lock it; if draft, unlock for corrections
          activeRetractionRequest: undefined,
          retractionAuditHistory: [...(inv.retractionAuditHistory || []), resolvedReq],
          notes: `${inv.notes || ''}\n[Retraction APPROVED on ${new Date().toLocaleDateString()} by Owner ${currentUser.name}: ${ownerReviewNote} -> Status: ${newStatus}]`.trim(),
        };

        // If reverted to draft, allow trip status adjustments or corrections
        addNotification({
          category: 'invoice_retraction',
          title: `Retraction APPROVED: ${inv.invoiceNumber} -> ${newStatus}`,
          message: `Owner ${currentUser.name} approved the invoice retraction (${action === 'revert_to_draft' ? 'Unlocked to Draft for Correction' : 'Marked as VOID'}). Note: "${ownerReviewNote}"`,
          isRead: false,
          severity: 'success',
          invoiceId: inv.id,
          actionType: 'view_invoice',
          actionLabel: 'Open Draft Invoice',
          metadata: {
            amountPhp: inv.grandTotalPhp,
            statusBadge: newStatus,
          }
        });

        return updated;
      }
      return inv;
    }));
  };

  const rejectInvoiceRetraction = (id: string, ownerReviewNote: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const currentReq = inv.activeRetractionRequest;
        const resolvedReq: InvoiceRetractionRequest = currentReq ? {
          ...currentReq,
          status: 'Rejected',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          ownerReviewNote,
        } : {
          id: `retract-${Date.now()}`,
          invoiceId: id,
          requestedBy: 'Direct Owner Override',
          requestedByRole: currentUser.role,
          requestedAt: new Date().toISOString(),
          reasonCategory: 'Other Administrative Error',
          detailedReason: ownerReviewNote,
          status: 'Rejected',
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          ownerReviewNote,
        };

        const updated: Invoice = {
          ...inv,
          status: 'Sent', // Restore to Sent
          activeRetractionRequest: undefined,
          retractionAuditHistory: [...(inv.retractionAuditHistory || []), resolvedReq],
          notes: `${inv.notes || ''}\n[Retraction REJECTED on ${new Date().toLocaleDateString()} by Owner ${currentUser.name}: ${ownerReviewNote}]`.trim(),
        };

        addNotification({
          category: 'invoice_retraction',
          title: `Retraction REJECTED: ${inv.invoiceNumber}`,
          message: `Owner ${currentUser.name} rejected the retraction request. Invoice remains active and in effect. Note: "${ownerReviewNote}"`,
          isRead: false,
          severity: 'error',
          invoiceId: inv.id,
          actionType: 'view_invoice',
          actionLabel: 'View Invoice',
        });

        return updated;
      }
      return inv;
    }));
  };

  const getInvoiceByTripId = (tripId: string) => {
    return invoices.find(inv => inv.tripId === tripId);
  };

  // Fuel Tracking Management
  const addFuelLog = (logData: {
    truckId: string;
    driverId?: string;
    tripId?: string;
    date: string;
    odometerKm: number;
    previousOdometerKm?: number;
    liters: number;
    costPhp: number;
    pricePerLiterPhp?: number;
    fuelStation: string;
    fuelGrade?: string;
    fullTank?: boolean;
    paymentMethod: FuelPaymentMethod;
    receiptNumber?: string;
    notes?: string;
  }): FuelLog => {
    const truck = trucks.find(t => t.id === logData.truckId);
    const truckLogs = fuelLogs
      .filter(l => l.truckId === logData.truckId)
      .sort((a, b) => b.odometerKm - a.odometerKm);

    const prevOdo = logData.previousOdometerKm !== undefined && logData.previousOdometerKm > 0
      ? logData.previousOdometerKm
      : (truckLogs.length > 0 ? truckLogs[0].odometerKm : (truck ? Math.max(0, truck.lastOdometerKm - 350) : 0));

    const distanceKm = Math.max(0, logData.odometerKm - prevOdo);
    const liters = Math.max(0.1, Number(logData.liters));
    const costPhp = Number(logData.costPhp);
    const pricePerLiterPhp = logData.pricePerLiterPhp || (liters > 0 ? costPhp / liters : 0);
    const kmPerLiter = distanceKm > 0 && liters > 0 ? Number((distanceKm / liters).toFixed(2)) : 0;
    const costPerKmPhp = distanceKm > 0 ? Number((costPhp / distanceKm).toFixed(2)) : 0;

    const newLog: FuelLog = {
      id: `fuel-${Date.now().toString().slice(-5)}`,
      truckId: logData.truckId,
      driverId: logData.driverId,
      tripId: logData.tripId,
      date: logData.date,
      odometerKm: logData.odometerKm,
      previousOdometerKm: prevOdo,
      distanceKm,
      liters,
      costPhp,
      pricePerLiterPhp: Number(pricePerLiterPhp.toFixed(2)),
      fuelStation: logData.fuelStation,
      fuelGrade: logData.fuelGrade || (truck?.fuelType || 'Diesel'),
      fullTank: logData.fullTank !== undefined ? logData.fullTank : true,
      paymentMethod: logData.paymentMethod,
      receiptNumber: logData.receiptNumber,
      kmPerLiter,
      costPerKmPhp,
      notes: logData.notes,
      loggedBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    setFuelLogs(prev => [newLog, ...prev]);

    // Auto-post Fuel Disbursement Journal Voucher
    const fuelJv: JournalEntry = {
      id: `jv-fuel-${Date.now()}`,
      entryNumber: `JV-${new Date().getFullYear()}-${(journalEntries.length + 1).toString().padStart(4, '0')}`,
      date: logData.date,
      referenceType: 'Fuel_Disbursement',
      referenceId: newLog.id,
      referenceNumber: logData.receiptNumber || `FUEL-${newLog.id}`,
      entityName: logData.fuelStation,
      postedBy: `${currentUser.name} (${currentUser.role})`,
      isLocked: true,
      notes: `Diesel fill-up ${liters}L @ ₱${pricePerLiterPhp}/L for truck ${truck?.plateNumber || ''}`,
      lines: [
        {
          id: `jvl-fl-${Date.now()}-1`,
          accountCode: '5010',
          accountName: 'Direct Fuel, Diesel & Oil Expense',
          debitPhp: costPhp,
          creditPhp: 0,
          memo: `${liters}L Diesel for ${truck?.plateNumber || ''}`,
          truckPlate: truck?.plateNumber,
        },
        {
          id: `jvl-fl-${Date.now()}-2`,
          accountCode: logData.paymentMethod.includes('Cash') ? '1030' : (logData.paymentMethod.includes('Credit') ? '2010' : '1010'),
          accountName: logData.paymentMethod.includes('Cash') 
            ? 'Petty Cash & Fleet Fuel Float' 
            : (logData.paymentMethod.includes('Credit') ? 'Accounts Payable - Fuel Stations & Fleet Suppliers' : 'Cash in Bank - BDO Corporate (Acct #0014-9982-1092)'),
          debitPhp: 0,
          creditPhp: costPhp,
          memo: `Settled via ${logData.paymentMethod}`,
          truckPlate: truck?.plateNumber,
        }
      ],
      totalDebitPhp: costPhp,
      totalCreditPhp: costPhp,
    };

    setJournalEntries(prev => [fuelJv, ...prev]);

    // Update truck odometer if this reading is higher than current recorded last odometer
    if (truck && logData.odometerKm > truck.lastOdometerKm) {
      updateTruck(truck.id, { lastOdometerKm: logData.odometerKm });
    }

    // Check for abnormal consumption warning alert
    if (truck && kmPerLiter > 0) {
      const targetKml = getTargetKmPerLiter(truck.type);
      if (kmPerLiter < targetKml * 0.70) {
        addNotification({
          category: 'trip_update',
          title: `⚠️ Fuel Inefficiency Alert: ${truck.plateNumber}`,
          message: `${truck.plateNumber} logged an unusually low ${kmPerLiter} km/L at ${logData.fuelStation} (${distanceKm} km on ${liters}L). Target standard is ${targetKml} km/L. Engine maintenance audit recommended.`,
          isRead: false,
          severity: 'warning',
          metadata: {
            plateNumber: truck.plateNumber,
            statusBadge: 'High Fuel Consumption'
          }
        });
      }
    }

    return newLog;
  };

  const updateFuelLog = (id: string, updates: Partial<FuelLog>) => {
    setFuelLogs(prev => prev.map(log => {
      if (log.id === id) {
        const merged = { ...log, ...updates };
        const prevOdo = merged.previousOdometerKm || 0;
        const dist = Math.max(0, merged.odometerKm - prevOdo);
        const ltr = Math.max(0.1, Number(merged.liters));
        const cost = Number(merged.costPhp);
        const ppl = merged.pricePerLiterPhp || (ltr > 0 ? cost / ltr : 0);
        const kml = dist > 0 && ltr > 0 ? Number((dist / ltr).toFixed(2)) : 0;
        const cpkm = dist > 0 ? Number((cost / dist).toFixed(2)) : 0;

        return {
          ...merged,
          distanceKm: dist,
          liters: ltr,
          costPhp: cost,
          pricePerLiterPhp: Number(ppl.toFixed(2)),
          kmPerLiter: kml,
          costPerKmPhp: cpkm,
        };
      }
      return log;
    }));
  };

  const deleteFuelLog = (id: string) => {
    setFuelLogs(prev => prev.filter(log => log.id !== id));
  };

  const getFuelLogsByTruckId = (truckId: string): FuelLog[] => {
    return fuelLogs
      .filter(l => l.truckId === truckId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.odometerKm - a.odometerKm);
  };

  const getTruckFuelSummary = (truckId: string): TruckFuelSummary => {
    const truck = trucks.find(t => t.id === truckId);
    const logs = fuelLogs.filter(l => l.truckId === truckId);
    const targetKmPerLiter = truck ? getTargetKmPerLiter(truck.type) : 3.5;

    if (!truck || logs.length === 0) {
      return {
        truckId: truckId,
        plateNumber: truck?.plateNumber || 'Unknown',
        brandModel: truck?.brandModel || '',
        truckType: truck?.type || '10-Wheeler Wingvan',
        totalLogs: 0,
        totalLiters: 0,
        totalCostPhp: 0,
        totalDistanceKm: 0,
        avgKmPerLiter: 0,
        avgCostPerKmPhp: 0,
        avgPricePerLiterPhp: 0,
        efficiencyRating: 'Normal',
        targetKmPerLiter,
      };
    }

    const totalLiters = logs.reduce((sum, l) => sum + l.liters, 0);
    const totalCostPhp = logs.reduce((sum, l) => sum + l.costPhp, 0);
    const totalDistanceKm = logs.reduce((sum, l) => sum + l.distanceKm, 0);
    const avgKmPerLiter = totalLiters > 0 && totalDistanceKm > 0 ? Number((totalDistanceKm / totalLiters).toFixed(2)) : 0;
    const avgCostPerKmPhp = totalDistanceKm > 0 ? Number((totalCostPhp / totalDistanceKm).toFixed(2)) : 0;
    const avgPricePerLiterPhp = totalLiters > 0 ? Number((totalCostPhp / totalLiters).toFixed(2)) : 0;

    const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastLogDate = sortedLogs[0]?.date;

    let efficiencyRating: 'Optimal' | 'Normal' | 'High Consumption' | 'Needs Service' = 'Normal';
    if (avgKmPerLiter >= targetKmPerLiter * 0.95) {
      efficiencyRating = 'Optimal';
    } else if (avgKmPerLiter >= targetKmPerLiter * 0.80) {
      efficiencyRating = 'Normal';
    } else if (avgKmPerLiter >= targetKmPerLiter * 0.65) {
      efficiencyRating = 'High Consumption';
    } else {
      efficiencyRating = 'Needs Service';
    }

    return {
      truckId: truck.id,
      plateNumber: truck.plateNumber,
      brandModel: truck.brandModel,
      truckType: truck.type,
      totalLogs: logs.length,
      totalLiters: Number(totalLiters.toFixed(1)),
      totalCostPhp: Number(totalCostPhp.toFixed(2)),
      totalDistanceKm,
      avgKmPerLiter,
      avgCostPerKmPhp,
      avgPricePerLiterPhp,
      lastLogDate,
      efficiencyRating,
      targetKmPerLiter,
    };
  };

  const getFleetFuelAnalytics = (): FleetFuelAnalytics => {
    const totalCostPhp = fuelLogs.reduce((sum, l) => sum + l.costPhp, 0);
    const totalLiters = fuelLogs.reduce((sum, l) => sum + l.liters, 0);
    const totalDistanceKm = fuelLogs.reduce((sum, l) => sum + l.distanceKm, 0);
    const avgKmPerLiter = totalLiters > 0 && totalDistanceKm > 0 ? Number((totalDistanceKm / totalLiters).toFixed(2)) : 0;
    const avgCostPerKmPhp = totalDistanceKm > 0 ? Number((totalCostPhp / totalDistanceKm).toFixed(2)) : 0;
    const avgPricePerLiterPhp = totalLiters > 0 ? Number((totalCostPhp / totalLiters).toFixed(2)) : 0;

    const summaries = trucks
      .map(t => getTruckFuelSummary(t.id))
      .filter(s => s.totalLogs > 0);

    const sortedByKml = [...summaries].sort((a, b) => b.avgKmPerLiter - a.avgKmPerLiter);

    return {
      totalCostPhp: Number(totalCostPhp.toFixed(2)),
      totalLiters: Number(totalLiters.toFixed(1)),
      totalDistanceKm,
      avgKmPerLiter,
      avgCostPerKmPhp,
      avgPricePerLiterPhp,
      highestEfficiencyTruck: sortedByKml.length > 0 ? {
        plateNumber: sortedByKml[0].plateNumber,
        kmPerLiter: sortedByKml[0].avgKmPerLiter,
        type: sortedByKml[0].truckType,
      } : undefined,
      lowestEfficiencyTruck: sortedByKml.length > 0 ? {
        plateNumber: sortedByKml[sortedByKml.length - 1].plateNumber,
        kmPerLiter: sortedByKml[sortedByKml.length - 1].avgKmPerLiter,
        type: sortedByKml[sortedByKml.length - 1].truckType,
      } : undefined,
      totalLogsCount: fuelLogs.length,
    };
  };

  const canLogFuel = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('fuel.log', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('fuel.log');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Logging fuel fill-ups requires ${allowedRoles.join(', ')} authorization.`,
      allowedRoles
    };
  };

  const canDeleteFuelLog = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('fuel.delete', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('fuel.delete');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Deleting official fuel audit expense logs requires ${allowedRoles.join(', ')} executive authorization.`,
      allowedRoles
    };
  };

  // General Ledger & Accounting Books Management
  const addManualJournalEntry = (entryData: {
    date: string;
    referenceNumber: string;
    entityName?: string;
    lines: Array<{
      accountCode: string;
      debitPhp: number;
      creditPhp: number;
      memo?: string;
      truckPlate?: string;
      clientName?: string;
    }>;
    notes?: string;
  }): JournalEntry => {
    const totalDebitPhp = entryData.lines.reduce((sum, l) => sum + (Number(l.debitPhp) || 0), 0);
    const totalCreditPhp = entryData.lines.reduce((sum, l) => sum + (Number(l.creditPhp) || 0), 0);

    const formattedLines: JournalEntryLine[] = entryData.lines.map((line, idx) => {
      const coa = chartOfAccounts.find(c => c.code === line.accountCode);
      return {
        id: `jvl-${Date.now()}-${idx}`,
        accountCode: line.accountCode,
        accountName: coa?.name || line.accountCode,
        debitPhp: Number(line.debitPhp) || 0,
        creditPhp: Number(line.creditPhp) || 0,
        memo: line.memo,
        truckPlate: line.truckPlate,
        clientName: line.clientName,
      };
    });

    const newEntry: JournalEntry = {
      id: `jv-${Date.now()}`,
      entryNumber: `JV-${new Date().getFullYear()}-${(journalEntries.length + 1).toString().padStart(4, '0')}`,
      date: entryData.date,
      referenceType: 'Manual_Adjustment',
      referenceNumber: entryData.referenceNumber,
      entityName: entryData.entityName,
      lines: formattedLines,
      totalDebitPhp: Number(totalDebitPhp.toFixed(2)),
      totalCreditPhp: Number(totalCreditPhp.toFixed(2)),
      postedBy: `${currentUser.name} (${currentUser.role})`,
      isLocked: true,
      notes: entryData.notes,
    };

    setJournalEntries(prev => [newEntry, ...prev]);

    addNotification({
      category: 'ledger_entry',
      title: `Journal Voucher Posted: ${newEntry.entryNumber}`,
      message: `Manual adjustment entry posted by ${currentUser.name}. Total: ₱${totalDebitPhp.toLocaleString()}.`,
      isRead: false,
      severity: 'info',
      actionType: 'view_ledger',
      actionLabel: 'View General Ledger',
    });

    return newEntry;
  };

  const getAccountBalance = (accountCode: string) => {
    const coa = chartOfAccounts.find(c => c.code === accountCode);
    const normalBalance = coa?.normalBalance || 'Debit';

    let totalDebit = 0;
    let totalCredit = 0;

    journalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode === accountCode) {
          totalDebit += (Number(line.debitPhp) || 0);
          totalCredit += (Number(line.creditPhp) || 0);
        }
      });
    });

    const netBalance = normalBalance === 'Debit' 
      ? totalDebit - totalCredit 
      : totalCredit - totalDebit;

    return {
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      netBalance: Number(netBalance.toFixed(2)),
      normalBalance,
    };
  };

  const getLedgerByAccount = (accountCode: string) => {
    const coa = chartOfAccounts.find(c => c.code === accountCode);
    const normalBalance = coa?.normalBalance || 'Debit';

    const ledgerRows: Array<{
      id: string;
      date: string;
      entryNumber: string;
      referenceType: string;
      referenceNumber: string;
      entityName?: string;
      memo?: string;
      debitPhp: number;
      creditPhp: number;
      runningBalance: number;
      truckPlate?: string;
    }> = [];

    // Sort chronologically ascending for running ledger balances
    const sortedEntries = [...journalEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.entryNumber.localeCompare(b.entryNumber));

    let runningBalance = 0;

    sortedEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode === accountCode) {
          if (normalBalance === 'Debit') {
            runningBalance += (line.debitPhp - line.creditPhp);
          } else {
            runningBalance += (line.creditPhp - line.debitPhp);
          }

          ledgerRows.push({
            id: `${entry.id}-${line.id}`,
            date: entry.date,
            entryNumber: entry.entryNumber,
            referenceType: entry.referenceType,
            referenceNumber: entry.referenceNumber,
            entityName: line.clientName || entry.entityName,
            memo: line.memo || entry.notes,
            debitPhp: line.debitPhp,
            creditPhp: line.creditPhp,
            runningBalance: Number(runningBalance.toFixed(2)),
            truckPlate: line.truckPlate,
          });
        }
      });
    });

    return ledgerRows;
  };

  const getTrialBalance = () => {
    let totalDebits = 0;
    let totalCredits = 0;

    const accounts = chartOfAccounts.map(coa => {
      let debitSum = 0;
      let creditSum = 0;

      journalEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.accountCode === coa.code) {
            debitSum += (Number(line.debitPhp) || 0);
            creditSum += (Number(line.creditPhp) || 0);
          }
        });
      });

      let debitPhp = 0;
      let creditPhp = 0;

      if (coa.normalBalance === 'Debit') {
        const net = debitSum - creditSum;
        if (net >= 0) {
          debitPhp = net;
        } else {
          creditPhp = Math.abs(net);
        }
      } else {
        const net = creditSum - debitSum;
        if (net >= 0) {
          creditPhp = net;
        } else {
          debitPhp = Math.abs(net);
        }
      }

      totalDebits += debitPhp;
      totalCredits += creditPhp;

      return {
        code: coa.code,
        name: coa.name,
        category: coa.category,
        debitPhp: Number(debitPhp.toFixed(2)),
        creditPhp: Number(creditPhp.toFixed(2)),
      };
    });

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.05;

    return {
      accounts,
      totalDebits: Number(totalDebits.toFixed(2)),
      totalCredits: Number(totalCredits.toFixed(2)),
      isBalanced,
    };
  };

  const getTruckById = (id: string) => trucks.find(t => t.id === id);
  const getDriverById = (id: string) => drivers.find(d => d.id === id);
  const getClientById = (id: string) => clients.find(c => c.id === id);
  const getTripById = (id: string) => trips.find(t => t.id === id);

  const canApproveTripStatusRetraction = isTripRetractionApprover(currentUser.role, roles);

  const canManipulateTripStatus = (targetStatus: TripStatus, currentStatus?: TripStatus): RolePermissionCheck => {
    const role = currentUser.role;
    let requiredPerm = 'trips.status_pending';
    let label = 'transition to Pending status';

    switch (targetStatus) {
      case 'Pending':
        requiredPerm = 'trips.status_pending';
        label = 'create or reset shipments to Pending status';
        break;
      case 'Loaded':
        requiredPerm = 'trips.status_loaded';
        label = 'certify cargo loading and weighbridge tare weight';
        break;
      case 'In Transit':
        requiredPerm = 'trips.status_in_transit';
        label = 'dispatch shipments and issue official Delivery Notes';
        break;
      case 'Inbound':
        requiredPerm = 'trips.status_in_transit';
        label = 'mark arrival at the warehouse (Inbound)';
        break;
      case 'Delivered':
        requiredPerm = 'trips.status_delivered';
        label = 'receive shipments and capture digital e-POD signature';
        break;
      case 'Invoiced':
        requiredPerm = 'trips.status_invoiced';
        label = 'audit transport deliverables and create a freight bill (not an official invoice)';
        break;
      case 'On Hold':
        requiredPerm = 'trips.edit';
        label = 'put shipments on hold';
        break;
      case 'Cancelled':
        requiredPerm = 'trips.edit';
        label = 'cancel shipments';
        break;
      default:
        requiredPerm = 'trips.edit';
        label = 'manipulate shipment status';
    }

    // Field drivers may mark Inbound / Delivered (warehouse e-POD) on assigned trips.
    if (
      (targetStatus === 'Inbound' || targetStatus === 'Delivered') &&
      isFieldDriverRole(role)
    ) {
      return { allowed: true, allowedRoles: getAllowedRolesForPermission(requiredPerm, roles) };
    }

    const allowedRoles = getAllowedRolesForPermission(requiredPerm, roles);
    const allowed = role === 'Owner' || hasPermission(requiredPerm);

    if (allowed) {
      return { allowed: true, allowedRoles };
    }

    return {
      allowed: false,
      reason: `Requires ${allowedRoles.join(', ')} authorization to ${label}.`,
      allowedRoles,
    };
  };

  const canCreateTrip = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('trips.create', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('trips.create');
    if (!canAddTransaction) {
      return {
        allowed: false,
        reason: 'Free plan includes 10 transactions. Subscribe to book additional trips.',
        allowedRoles,
      };
    }
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Creating new shipments and waybills is restricted to ${allowedRoles.join(', ')}.`,
      allowedRoles
    };
  };

  const canEditTrip = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('trips.edit', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('trips.edit');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Editing shipment route, cargo specifications, and schedule is restricted to ${allowedRoles.join(', ')}.`,
      allowedRoles
    };
  };

  const canDeleteTrip = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('trips.delete', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('trips.delete');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Canceling or deleting confirmed shipment records requires ${allowedRoles.join(', ')} executive authorization.`,
      allowedRoles
    };
  };

  const canReassignFleet = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('trips.reassign_fleet', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('trips.reassign_fleet');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Assigning or changing trucks and drivers is restricted to ${allowedRoles.join(', ')}.`,
      allowedRoles
    };
  };

  const canManageFinancials = (): RolePermissionCheck => {
    const allowedRoles = getAllowedRolesForPermission('invoices.create', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('invoices.create') || hasPermission('ratecards.manage');
    if (allowed) {
      return { allowed: true, allowedRoles };
    }
    return {
      allowed: false,
      reason: `Financial rate adjustment and surcharge management is restricted to ${allowedRoles.join(', ')}.`,
      allowedRoles
    };
  };

  const canAccess = (permission: 'dashboard' | 'new_trip' | 'trip_edit' | 'pod_upload' | 'truck_crud' | 'driver_crud' | 'invoice_manage' | 'ratecard_crud' | 'settings' | 'fuel_tracking' | 'ledger_view' | 'rbac'): boolean => {
    if (currentUser.role === 'Owner') return true;

    switch (permission) {
      case 'dashboard':
        return hasPermission('dashboard.view');
      case 'new_trip':
        return hasPermission('trips.create');
      case 'trip_edit':
        return hasPermission('trips.edit');
      case 'pod_upload':
        return hasPermission('trips.status_delivered') || hasPermission('trips.view');
      case 'truck_crud':
        return hasPermission('fleet.view') || hasPermission('fleet.crud');
      case 'driver_crud':
        return hasPermission('drivers.view') || hasPermission('drivers.crud');
      case 'ratecard_crud':
        return hasPermission('ratecards.view') || hasPermission('ratecards.manage');
      case 'invoice_manage':
        return hasPermission('invoices.view') || hasPermission('invoices.create');
      case 'ledger_view':
        return hasPermission('ledger.view');
      case 'fuel_tracking':
        return hasPermission('fuel.view');
      case 'settings':
        return hasPermission('settings.manage');
      case 'rbac':
        return hasPermission('rbac.manage');
      default:
        return false;
    }
  };

  const resetToSampleData = () => {
    setIsUpgradeModalOpen(true);
  };

  const activateFoundingPlan = (paymentMethod: PayMongoPaymentMethod, paymentId: string) => {
    if (!paymentId.trim()) {
      throw new Error('Founding plan unlocks only after PayMongo confirms payment.');
    }
    const now = new Date();
    const existingEnd = new Date(subscription.current_period_end || now);
    const stillFounding = subscription.plan_id === PLAN_FOUNDING_ID && existingEnd.getTime() > now.getTime();
    const periodStart = stillFounding ? new Date(subscription.current_period_start || now) : now;
    const cycle = sessionStorage.getItem(`${PENDING_FOUNDING_KEY}_cycle`) === 'annual' ? 'annual' : 'monthly';
    const hosted = hostedPricingForCheckout(subscription, now);
    const fields = hostedPricingFields(hosted);
    const months = cycle === 'annual' ? 12 : 1;
    const periodEnd = addBillingMonths(stillFounding ? existingEnd : now, months);
    const quote = calculateSubscriptionPrice(
      Math.max(trucks.length, hosted.includedTrucks, subscription.billed_truck_count || 0),
      cycle,
      hosted
    );
    const consumed = [
      ...(subscription.consumed_payment_ids || []),
      paymentId,
    ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);
    const nextSub: Subscription = {
      ...subscription,
      plan_id: PLAN_FOUNDING_ID,
      status: 'active',
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      auto_renew: true,
      payment_provider: 'paymongo',
      payment_provider_checkout_id: paymentId,
      last_payment_method: paymentMethod,
      consumed_payment_ids: consumed,
      billing_cycle: cycle,
      billed_truck_count: quote.truckCount,
      last_billed_amount_php: quote.chargePhp,
      updated_at: now.toISOString(),
      ...fields,
    };
    setSubscription(nextSub);
    setBillingHistory((prev) => [
      {
        id: `bill-${paymentId}`,
        subscription_id: nextSub.id,
        user_id: currentUserId,
        paymongo_payment_id: paymentId,
        amount_php: quote.chargePhp,
        currency: 'PHP',
        status: 'paid',
        payment_method: paymentMethod,
        receipt_number: paymentId,
        billing_period_start: stillFounding ? existingEnd.toISOString() : now.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        created_at: now.toISOString(),
      },
      ...prev.filter((item) => item.paymongo_payment_id !== paymentId),
    ]);
    setSubscription(nextSub);
    setCompany((prev) => ({ ...prev, subscriptionTier: 'Growth' }));
    setRoles((prev) => {
      const existingIds = new Set(prev.map((r) => r.id.toLowerCase()));
      const missing = DEFAULT_RBAC_ROLES.filter((r) => !existingIds.has(r.id.toLowerCase()));
      return [...prev, ...missing];
    });
    pushAudit('PERMISSIONS_RESET', `Activated ${hosted.pricingTier === 'list' ? 'List' : 'Founding'} plan after PayMongo payment ${paymentId}.`);
    setIsWaitingForPayMongo(false);
    setIsUpgradeModalOpen(false);
  };

  const createPayMongoCheckout = async (
    planId: string,
    billingCycle: 'monthly' | 'annual' = 'monthly',
    truckCount = trucks.length
  ) => {
    if (!canManageCompanyBilling) {
      throw new Error('Only the company Owner can manage the subscription.');
    }
    const successUrl = `${window.location.origin}/?billing=success`;
    const cancelUrl = `${window.location.origin}/?billing=cancel`;
    sessionStorage.setItem(PENDING_FOUNDING_KEY, planId);
    sessionStorage.setItem(`${PENDING_FOUNDING_KEY}_cycle`, billingCycle);

    const endpoint = import.meta.env.VITE_PAYMONGO_CHECKOUT_URL || '/api/paymongo';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: await paymongoRequestHeaders(),
      body: JSON.stringify({
        action: 'checkout',
        planId,
        companyId: company.id,
        billingCycle,
        truckCount,
        customerName: currentUser.name,
        successUrl,
        cancelUrl,
      }),
    });
    const data = await readPayMongoJson(response) as { checkoutUrl?: string; checkoutSessionId?: string; error?: string };
    if (!response.ok || !data.checkoutUrl || !data.checkoutSessionId) {
      sessionStorage.removeItem(PENDING_FOUNDING_KEY);
      throw new Error(data.error || 'PayMongo checkout is not available. Set PAYMONGO_SECRET_KEY on Vercel, then Redeploy.');
    }
    sessionStorage.setItem(`${PENDING_FOUNDING_KEY}_session`, data.checkoutSessionId);
    const checkoutHost = (() => {
      try {
        return new URL(data.checkoutUrl).hostname.toLowerCase();
      } catch {
        return '';
      }
    })();
    if (checkoutHost !== 'checkout.paymongo.com' && !checkoutHost.endsWith('.paymongo.com')) {
      sessionStorage.removeItem(PENDING_FOUNDING_KEY);
      sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
      throw new Error('PayMongo did not return a valid checkout URL.');
    }
    return { checkoutUrl: data.checkoutUrl, checkoutSessionId: data.checkoutSessionId };
  };

  const subscribeToFoundingPlan = async (
    billingCycle: 'monthly' | 'annual' = 'monthly',
    truckCount = trucks.length
  ) => {
    if (!canManageCompanyBilling) {
      throw new Error('Only the company Owner can manage the subscription.');
    }
    const checkoutWindow = window.open('about:blank', `casinfreight-paymongo-${Date.now()}`);
    try {
      const result = await createPayMongoCheckout(PLAN_FOUNDING_ID, billingCycle, truckCount);
      setIsWaitingForPayMongo(true);
      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.location.replace(result.checkoutUrl);
      } else {
        window.location.assign(result.checkoutUrl);
      }
    } catch (error) {
      checkoutWindow?.close();
      sessionStorage.removeItem(PENDING_FOUNDING_KEY);
      sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
      setIsWaitingForPayMongo(false);
      throw error;
    }
  };

  const consumedPaymentIds = () => [
    ...(subscription.consumed_payment_ids || []),
    subscription.payment_provider_checkout_id || '',
  ].filter((id, index, all) => Boolean(id) && all.indexOf(id) === index);

  const tryUnlockFounding = async (_paymentId?: string): Promise<boolean> => {
    if (unlockingFoundingRef.current) return false;
    const checkoutSessionId = sessionStorage.getItem(`${PENDING_FOUNDING_KEY}_session`) || '';
    if (!checkoutSessionId.startsWith('cs_')) return false;
    unlockingFoundingRef.current = true;
    try {
      const response = await fetch('/api/paymongo', {
        method: 'POST',
        headers: await paymongoRequestHeaders(),
        body: JSON.stringify({
          action: 'verify',
          checkoutSessionId,
          excludePaymentIds: consumedPaymentIds().join(','),
        }),
      });
      const data = await readPayMongoJson(response) as {
        paid?: boolean;
        paymentId?: string;
        method?: string;
        error?: string;
        subscription?: Subscription;
        subscriptionTier?: Company['subscriptionTier'];
      };
      if (!response.ok || !data.paid || !data.paymentId) return false;
      if (consumedPaymentIds().includes(data.paymentId) && !data.subscription) return false;
      if (data.subscription) {
        setSubscription(data.subscription);
        setCompany((prev) => ({ ...prev, subscriptionTier: data.subscriptionTier || 'Growth' }));
        setIsWaitingForPayMongo(false);
        setIsUpgradeModalOpen(false);
        sessionStorage.removeItem(PENDING_FOUNDING_KEY);
        sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
        return true;
      }
      activateFoundingPlan(asPayMongoMethod(data.method), data.paymentId);
      sessionStorage.removeItem(PENDING_FOUNDING_KEY);
      sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
      return true;
    } catch (error) {
      console.error('PayMongo verify failed', error);
      return false;
    } finally {
      unlockingFoundingRef.current = false;
    }
  };

  const confirmFoundingPayment = async (paymentId?: string) => {
    const unlocked = await tryUnlockFounding(paymentId);
    if (!unlocked) {
      throw new Error('PayMongo has not confirmed a Founding payment yet.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !company.id) {
      setIsWaitingForPayMongo(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'cancel') {
      sessionStorage.removeItem(PENDING_FOUNDING_KEY);
      sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_session`);
      sessionStorage.removeItem(`${PENDING_FOUNDING_KEY}_cycle`);
      setIsWaitingForPayMongo(false);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const pending = Boolean(sessionStorage.getItem(PENDING_FOUNDING_KEY));
    const checkoutSessionId = sessionStorage.getItem(`${PENDING_FOUNDING_KEY}_session`) || '';
    const billingSuccess = params.get('billing') === 'success';
    if (!pending && !billingSuccess && !checkoutSessionId.startsWith('cs_')) {
      return;
    }

    if (pending || billingSuccess) {
      setIsWaitingForPayMongo(true);
    }

    if (!checkoutSessionId.startsWith('cs_')) {
      return;
    }

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      void tryUnlockFounding().then((unlocked) => {
        if (unlocked) window.history.replaceState({}, '', window.location.pathname);
      });
    };

    run();

    const shouldPoll = pending || isWaitingForPayMongo || billingSuccess;
    const interval = shouldPoll ? window.setInterval(run, 3000) : undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);

    const stop = window.setTimeout(() => {
      if (interval) window.clearInterval(interval);
    }, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      window.clearTimeout(stop);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, company.id, subscription.plan_id, isWaitingForPayMongo]);

  const persistSubscriptionFlags = async (cancelAtPeriodEnd: boolean) => {
    if (!canManageCompanyBilling) {
      throw new Error('Only the company Owner can manage the subscription.');
    }
    if (!company.id) return;
    const response = await fetch('/api/paymongo', {
      method: 'POST',
      headers: await paymongoRequestHeaders(),
      body: JSON.stringify({ action: cancelAtPeriodEnd ? 'cancel' : 'resume' }),
    });
    const data = await readPayMongoJson(response) as { error?: string; subscription?: Subscription; subscriptionTier?: Company['subscriptionTier'] };
    if (!response.ok || !data.subscription) {
      throw new Error(data.error || 'Could not update the subscription.');
    }
    setSubscription(data.subscription);
    if (data.subscriptionTier) {
      setCompany((prev) => ({ ...prev, subscriptionTier: data.subscriptionTier as Company['subscriptionTier'] }));
    }
  };

  const cancelSubscriptionAtPeriodEnd = async () => {
    await persistSubscriptionFlags(true);
  };

  const resumeSubscription = async () => {
    await persistSubscriptionFlags(false);
  };

  const updatePlanDetails = (planId: string, updates: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...updates } : p)));
  };

  return (
    <FreightContext.Provider value={{
      company,
      updateCompany,
      uploadWorkspaceFile,
      users,
      currentUser,
      isAuthenticated,
      isAuthLoading,
      isFirebaseReady: isFirebaseConfigured(),
      login,
      signup,
      joinTeam,
      requestPasswordReset,
      logout,
      switchUserAccount,
      switchUserRole,
      addUser,
      inviteClientPortal,
      removeUserFromCompany,
      tiedCompanyLogins,
      refreshTiedCompanyLogins,
      untieTiedCompanyLogin,
      updateCurrentUserProfile,
      isSoleOwnerAccount,
      deleteCurrentUserAccount,
      trucks,
      addTruck,
      updateTruck,
      deleteTruck,
      drivers,
      addDriver,
      updateDriver,
      deleteDriver,
      approveDriver,
      clients,
      addClient,
      updateClient,
      deleteClient,
      rateCards,
      addRateCard,
      updateRateCard,
      deleteRateCard,
      suggestRateCard,
      truckBans,
      addTruckBan,
      updateTruckBan,
      deleteTruckBan,
      seedMetroManilaTruckBans,
      trips,
      liveTracking,
      fieldEvents,
      addTrip,
      updateTrip,
      updateTripStatus,
      requestTripStatusRetraction,
      applyOwnTripStatusRetraction,
      approveTripStatusRetraction,
      rejectTripStatusRetraction,
      canApproveTripStatusRetraction,
      addAccessorialToTrip,
      removeAccessorialFromTrip,
      submitPOD,
      isFieldDriverSession,
      assignedDriverRosterId,
      saveAssignedDriverSignoff,
      markAssignedDriverArrived,
      saveAssignedDriverWarehousePod,
      addAssignedDriverFieldEvent,
      invoices,
      createInvoiceForTrip,
      updateInvoice,
      updateInvoiceStatus,
      reconcileAndLockInvoice,
      unlockInvoiceForAdjustment,
      requestInvoiceRetraction,
      approveInvoiceRetraction,
      rejectInvoiceRetraction,
      getInvoiceByTripId,
      fuelLogs,
      addFuelLog,
      updateFuelLog,
      deleteFuelLog,
      getFuelLogsByTruckId,
      getTruckFuelSummary,
      getFleetFuelAnalytics,
      canLogFuel,
      canDeleteFuelLog,
      chartOfAccounts,
      journalEntries,
      addManualJournalEntry,
      getAccountBalance,
      getLedgerByAccount,
      getTrialBalance,
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      addNotification,
      canManipulateTripStatus,
      canCreateTrip,
      canEditTrip,
      canDeleteTrip,
      canReassignFleet,
      canManageFinancials,
      canAccess,
      getTruckById,
      getDriverById,
      getClientById,
      getTripById,
      isOnboardingOpen,
      setIsOnboardingOpen,
      resetToSampleData,
      roles,
      createRole,
      updateRole,
      deleteRole,
      resetRolesToDefault,
      updateUserRole,
      hasPermission,
      rbacAuditLogs,
      exportRbacDb,
      importRbacDb,
      firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      plans,
      subscription,
      billingHistory,
      activePlan,
      subscriptionUsage,
      canCreateBooking,
      isUpgradeModalOpen,
      setIsUpgradeModalOpen,
      isBillingProviderReady: isPayMongoWired(),
      isPayMongoTestMode: import.meta.env.VITE_PAYMONGO_TEST_MODE === 'true',
      createPayMongoCheckout,
      activateFoundingPlan,
      subscribeToFoundingPlan,
      confirmFoundingPayment,
      isWaitingForPayMongo,
      cancelSubscriptionAtPeriodEnd,
      resumeSubscription,
      updatePlanDetails,
      canAddTruck,
      canAddAccount,
      canAddRole,
      canAddTransaction,
      markTutorialSeen,
      isPlatformAdmin,
      canManageBilling,
      canManageCompanyBilling,
      listPlatformSubscriptions,
      setCompanyPlanByAdmin,
      resetCurrentPlanToFree,
      deleteCompanyWorkspace,
      captureWorkspaceBackup,
      restoreWorkspaceBackup,
      saveWeeklyBackupNow,
      platformNotices,
      savePlatformNotice,
      deletePlatformNotice,
      endActiveDowntime,
      activeDowntime,
    }}>
      {children}
    </FreightContext.Provider>
  );
};

export const useFreight = () => {
  const context = useContext(FreightContext);
  if (!context) {
    throw new Error('useFreight must be used within a FreightProvider');
  }
  return context;
};
