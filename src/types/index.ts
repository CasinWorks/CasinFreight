export * from './rbac';

export type StandardUserRole = 'Owner' | 'Dispatcher' | 'Loading Staff' | 'Billing' | 'Fleet Manager' | 'Auditor' | 'Driver';
export type UserRole = string;

export interface RolePermissionCheck {
  allowed: boolean;
  reason?: string;
  allowedRoles: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  avatarUrl?: string;
  phone?: string;
  password?: string;
  department?: string;
  status?: 'active' | 'invited';
  has_seen_tutorial?: boolean;
}

export type SubscriptionTier = 'Free' | 'Starter' | 'Growth' | 'Fleet';

export interface Company {
  id: string;
  name: string;
  tin: string;
  address: string;
  contactNumber: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  currency: string;
  logoUrl?: string;
  registeredDate: string;
  storageUsedBytes?: number;
  salesAgentId?: string;
}

export type TruckType = 
  | '4-Wheeler Closed Van'
  | '6-Wheeler Closed Van'
  | '6-Wheeler Dropside/Wingvan'
  | '10-Wheeler Wingvan'
  | '10-Wheeler Dump Truck'
  | '20ft Container Chassis'
  | '40ft Container Chassis'
  | 'Tractor Head / 14-Wheeler';

export type TruckStatus = 'Available' | 'On Trip' | 'Loading' | 'Maintenance';

export interface Truck {
  id: string;
  companyId: string;
  plateNumber: string;
  type: TruckType;
  brandModel: string;
  gvwrKg: number; // Gross Vehicle Weight Rating
  tareWeightKg: number; // Empty truck weight
  netPayloadKg: number; // gvwrKg - tareWeightKg
  maxVolumeCbm: number; // Cubic meters capacity
  status: TruckStatus;
  assignedDriverId?: string;
  assignedHelperId?: string;
  currentTripId?: string;
  lastOdometerKm: number;
  fuelType: 'Diesel' | 'Euro 4 Diesel';
  yearModel: number;
  maintenanceNote?: string;
}

export type FuelPaymentMethod = 
  | 'Petron Fleet Card'
  | 'Shell Fleet Card'
  | 'Caltex StarCard'
  | 'Cash Advance'
  | 'Corporate GCash'
  | 'Company Credit Card';

export interface FuelLog {
  id: string;
  truckId: string;
  driverId?: string;
  tripId?: string;
  date: string;
  odometerKm: number;
  previousOdometerKm: number;
  distanceKm: number;
  liters: number;
  costPhp: number;
  pricePerLiterPhp: number;
  fuelStation: string;
  fuelGrade: string;
  fullTank: boolean;
  paymentMethod: FuelPaymentMethod;
  receiptNumber?: string;
  kmPerLiter: number;
  costPerKmPhp: number;
  notes?: string;
  loggedBy: string;
  createdAt: string;
}

export interface TruckFuelSummary {
  truckId: string;
  plateNumber: string;
  brandModel: string;
  truckType: TruckType;
  totalLogs: number;
  totalLiters: number;
  totalCostPhp: number;
  totalDistanceKm: number;
  avgKmPerLiter: number;
  avgCostPerKmPhp: number;
  avgPricePerLiterPhp: number;
  lastLogDate?: string;
  efficiencyRating: 'Optimal' | 'Normal' | 'High Consumption' | 'Needs Service';
  targetKmPerLiter: number;
}

export type DriverStatus = 'Available' | 'On Duty' | 'Off Duty' | 'Leave';
export type CrewRole = 'driver' | 'helper';

export interface Driver {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  /** Driver is the default. Helper / pahinante rides with the truck and does not drive. */
  crewRole?: CrewRole;
  licenseNo: string;
  licenseRestrictions: string; // e.g. "1, 2, 3" or "Heavy Articulated (8)"
  licenseExpiry: string;
  assignedTruckId?: string;
  /** Same email as the Company & Team invite so the driver app can log in. */
  email?: string;
  userId?: string;
  status: DriverStatus;
  approvalStatus?: 'Approved' | 'Pending' | 'Requires Review';
  clearanceNote?: string;
  emergencyContact: string;
  totalTripsCompleted: number;
  rating: number; // 1 to 5
}

export type NotificationCategory = 'trip_update' | 'driver_approval' | 'invoice_payment' | 'invoice_retraction' | 'ledger_entry';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  severity?: 'info' | 'success' | 'warning' | 'error';
  tripId?: string;
  driverId?: string;
  invoiceId?: string;
  actionType?: 'view_trip' | 'approve_driver' | 'view_invoice' | 'view_drivers' | 'view_ledger';
  actionLabel?: string;
  metadata?: {
    plateNumber?: string;
    clientName?: string;
    amountPhp?: number;
    driverName?: string;
    statusBadge?: string;
    licenseRestriction?: string;
  };
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  tin: string;
  contactPerson: string;
  phone: string;
  email: string;
  billingAddress: string;
  paymentTermsDays: number; // e.g. 15, 30, 45
  activeContractsCount: number;
}

export interface RateCard {
  id: string;
  companyId: string;
  originZone: string;
  destinationZone: string;
  truckType: TruckType;
  baseRatePhp: number;
  tollEstimatePhp: number;
  standardLeadHours: number;
  effectiveDate: string;
}

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface TruckBanWindow {
  startTime: string; // HH:mm, Asia/Manila
  endTime: string;
}

export interface TruckBan {
  id: string;
  companyId: string;
  name: string;
  area: string;
  cityOrLgu: string;
  roadsOrZone: string;
  days: Weekday[];
  windows: TruckBanWindow[];
  appliesToTruckTypes: TruckType[] | 'ALL';
  exemptionNote?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export type AccessorialType = 
  | 'fuel_surcharge'
  | 'demurrage'
  | 'overweight'
  | 'multi_stop'
  | 'port_wharfage'
  | 'toll_reimbursement'
  | 'helper_crew'
  | 'overnight_parking';

export interface TripAccessorial {
  id: string;
  tripId: string;
  type: AccessorialType;
  name: string;
  calculationDetail: string;
  amountPhp: number;
  isAutoTriggered: boolean;
  approved: boolean;
}

export type TripStatus = 'Pending' | 'Loaded' | 'In Transit' | 'Delivered' | 'Invoiced' | 'On Hold' | 'Cancelled';

export type TripRetractionReasonCategory =
  | 'Wrong status posted'
  | 'Loading not actually complete'
  | 'Truck did not depart'
  | 'Delivery not actually complete'
  | 'POD / paperwork correction'
  | 'Duplicate or mis-click'
  | 'Other operational error';

export interface TripStatusRetractionRequest {
  id: string;
  tripId: string;
  fromStatus: TripStatus;
  toStatus: TripStatus;
  requestedBy: string;
  requestedByRole: string;
  requestedAt: string;
  reasonCategory: TripRetractionReasonCategory;
  detailedReason: string;
  status: 'Pending_Approval' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type TripExceptionKind =
  | 'client_hold'
  | 'waiting_documents'
  | 'weather'
  | 'port_congestion'
  | 'breakdown'
  | 'accident'
  | 'refused_delivery'
  | 'checkpoint'
  | 'shipper_cancelled'
  | 'no_cargo'
  | 'duplicate'
  | 'other';

export const HOLD_EXCEPTION_KINDS: { id: TripExceptionKind; label: string }[] = [
  { id: 'client_hold', label: 'Client asked to hold' },
  { id: 'waiting_documents', label: 'Waiting documents / gate pass' },
  { id: 'weather', label: 'Weather / calamity' },
  { id: 'port_congestion', label: 'Port or road congestion' },
  { id: 'breakdown', label: 'Truck breakdown' },
  { id: 'accident', label: 'Accident or incident' },
  { id: 'refused_delivery', label: 'Consignee closed or refused' },
  { id: 'checkpoint', label: 'Checkpoint / LTO / overweight hold' },
  { id: 'other', label: 'Other operational problem' },
];

export const CANCEL_EXCEPTION_KINDS: { id: TripExceptionKind; label: string }[] = [
  { id: 'shipper_cancelled', label: 'Shipper cancelled the booking' },
  { id: 'no_cargo', label: 'No cargo at origin' },
  { id: 'duplicate', label: 'Duplicate or wrong booking' },
  { id: 'refused_delivery', label: 'Delivery refused, cannot recover' },
  { id: 'breakdown', label: 'Unit down, trip cannot continue' },
  { id: 'other', label: 'Other' },
];

export interface TripTimelineEvent {
  id: string;
  tripId: string;
  status: TripStatus;
  timestamp: string;
  note?: string;
  updatedBy: string;
  location?: string;
  kind?: 'status' | 'status_rollback' | 'status_rollback_rejected';
  retraction?: TripTimelineRetraction;
}

export interface TripTimelineRetraction {
  fromStatus: TripStatus;
  toStatus: TripStatus;
  requestedBy: string;
  requestedByRole: string;
  requestedAt: string;
  approvedBy: string;
  approvedByRole: string;
  approvedAt: string;
  reasonCategory: TripRetractionReasonCategory;
  reason: string;
  outcome: 'Approved' | 'Rejected';
}

export interface CustodySignoff {
  name: string;
  role?: string;
  signedAt: string;
  signatureDataUrl: string;
}

export interface POD {
  id: string;
  tripId: string;
  receiverName: string;
  receiverRole: string;
  receiverIdNumber?: string;
  signedAt: string;
  signatureDataUrl?: string;
  photoUrls: string[];
  notes?: string;
  conditionStatus: 'Good Condition' | 'Partial Damage' | 'Packaging Discrepancy';
}

export interface DeliveryPrerequisites {
  tareWeightVerified?: boolean;
  securitySealNumber?: string;
  loadingTallyDocRef?: string;
  deliveryNoteNumber?: string;
  deliveryNoteIssuedAt?: string;
  gatePassNumber?: string;
  departureOdometerKm?: number;
  podReceiverName?: string;
  podReceiverRole?: string;
  podReceiverIdNumber?: string;
  podSignedAt?: string;
  podCondition?: 'Good Condition' | 'Partial Damage' | 'Packaging Discrepancy';
  billingAuditApproved?: boolean;
}

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  tripId: string;
  waybillNumber: string;
  issuedDate: string;
  consignorName: string;
  consignorAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  truckPlateNumber: string;
  truckType: string;
  driverName: string;
  driverLicenseNo: string;
  cargoDescription: string;
  cargoWeightKg: number;
  cargoVolumeCbm: number;
  securitySealNumber: string;
  gatePassNumber: string;
  specialInstructions?: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  waybillNumber: string;
  companyId: string;
  truckId: string;
  driverId: string;
  helperId?: string;
  clientId: string;
  originZone: string;
  originAddress: string;
  destinationZone: string;
  destinationAddress: string;
  cargoDescription: string;
  cargoWeightKg: number;
  cargoVolumeCbm: number;
  scheduledPickup: string;
  scheduledDelivery: string;
  actualDelivery?: string;
  status: TripStatus;
  timeline: TripTimelineEvent[];
  accessorials: TripAccessorial[];
  rateCardId?: string;
  baseRatePhp: number;
  tollEstimatePhp: number;
  fuelSurchargePercent: number;
  multiStopCount: number;
  demurrageHours: number;
  demurrageRatePerHour: number;
  overweightSurchargePerKg: number;
  isOverweight: boolean;
  overweightKg: number;
  deliveryNoteNumber?: string;
  securitySealNumber?: string;
  gatePassNumber?: string;
  prerequisites?: DeliveryPrerequisites;
  dispatcherSignoff?: CustodySignoff;
  driverSignoff?: CustodySignoff;
  pod?: POD;
  notes?: string;
  createdAt: string;
  holdFromStatus?: TripStatus;
  exceptionKind?: TripExceptionKind;
  exceptionNote?: string;
  activeStatusRetraction?: TripStatusRetractionRequest | null;
  statusRetractionHistory?: TripStatusRetractionRequest[];
}

export type FieldEventKind =
  | 'dispatch_signature'
  | 'pod_signature'
  | 'seal_photo'
  | 'parcel_photo'
  | 'container_photo'
  | 'pickup_geo'
  | 'delivery_geo'
  | 'gps_disabled'
  | 'gps_mocked';

export interface FieldEvent {
  id: string;
  companyId: string;
  tripId: string;
  kind: FieldEventKind;
  createdAt: string;
  actorUid?: string;
  actorName?: string;
  lat?: number;
  lng?: number;
  accuracyM?: number;
  photoUrl?: string;
  signatureDataUrl?: string;
  note?: string;
  gpsEnabled: boolean;
  isMocked?: boolean;
}

export interface LiveTracking {
  id: string;
  tripId: string;
  companyId: string;
  truckId?: string;
  driverId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
  accuracyM?: number;
  updatedAt: string;
  gpsEnabled: boolean;
  isMocked: boolean;
  gpsDisabledAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  isAccessorial?: boolean;
  accessorialType?: AccessorialType;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Retraction_Pending' | 'Voided';

export type RetractionReasonCategory = 
  | 'Rate Calculation / Line Item Error'
  | 'Incorrect Billing Client Entity'
  | 'Duplicate Invoice Issued'
  | 'Accessorial / Demurrage Surcharge Dispute'
  | 'Waybill / Cargo Detail Correction'
  | 'Other Administrative Error';

export interface InvoiceRetractionRequest {
  id: string;
  invoiceId: string;
  requestedBy: string; // Operator name (e.g. Clarisse Anne Mendoza)
  requestedByRole: string;
  requestedAt: string;
  reasonCategory: RetractionReasonCategory;
  detailedReason: string; // Written justification by operator
  status: 'Pending_Owner_Approval' | 'Approved' | 'Rejected';
  reviewedBy?: string; // Owner (e.g. Tusherd "TJ" Casin)
  reviewedAt?: string;
  ownerReviewNote?: string;
}

export type PaymentMethodType = 
  | 'Bank Transfer (BDO)' 
  | 'Bank Transfer (BPI)' 
  | 'PDC Check' 
  | 'GCash Biz' 
  | 'Online Banking' 
  | 'BIR 2307 Withholding + Balance'
  | 'Bank Transfer (BDO/BPI)';

export interface ProofOfPayment {
  paymentReference: string; // e.g. BDO-FT-2026-94821 or Check #491028
  paymentMethod: PaymentMethodType;
  paymentDate: string;
  amountPaidPhp: number;
  ewtDeductedPhp?: number; // 2% EWT from the client’s Form 2307
  officialReceiptNo?: string; // Client or bank OR / payment reference, if they issued one
  popFileUrl?: string; // Image / screenshot of deposit slip or bank advice
  popFileName?: string;
  verifiedBy: string; // Finance / Billing Officer
  verifiedAt: string;
  bankAccountUsed?: string;
  reconciliationNotes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tripId: string;
  companyId: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotalPhp: number;
  vatPercent: number; // e.g. 12% in PH
  vatAmountPhp: number;
  withholdingTaxPercent?: number; // 2% EWT standard in PH freight
  withholdingTaxAmountPhp?: number;
  grandTotalPhp: number;
  status: InvoiceStatus;
  isLocked?: boolean; // Locked against line-item edits upon transmission/reconciliation
  activeRetractionRequest?: InvoiceRetractionRequest;
  retractionAuditHistory?: InvoiceRetractionRequest[];
  proofOfPayment?: ProofOfPayment;
  notes?: string;
  paidAt?: string;
  paymentMethod?: PaymentMethodType;
  paymentReference?: string;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export type AccountCategory = 
  | 'Current Assets' 
  | 'Non-Current Assets' 
  | 'Current Liabilities' 
  | 'Equity & Capital'
  | 'Operating Revenue' 
  | 'Direct Operating Expenses' 
  | 'Administrative Expenses'
  | 'Administrative & Operating Overhead';

export interface ChartOfAccount {
  code: string; // e.g. "1010", "1120", "1130", "2010", "2030", "4010", "4020", "5010", "5020", "5030"
  name: string;
  type: AccountType;
  category: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
  description: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debitPhp: number;
  creditPhp: number;
  memo?: string;
  truckPlate?: string;
  clientName?: string;
}

export type JournalReferenceType = 
  | 'Invoice_Issued' 
  | 'Payment_Received' 
  | 'Fuel_Disbursement' 
  | 'Toll_RFID' 
  | 'Driver_Payout' 
  | 'Invoice_Retracted' 
  | 'Manual_Adjustment';

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. "JV-2026-0081"
  date: string;
  referenceType: JournalReferenceType;
  referenceId?: string; // invoiceId, tripId, fuelLogId
  referenceNumber: string; // INV-2026-0418, BDO-FT-894102, FL-1029, etc.
  entityName?: string; // Client Name, Driver Name, Gas Station
  lines: JournalEntryLine[];
  totalDebitPhp: number;
  totalCreditPhp: number;
  postedBy: string;
  isLocked: boolean; // Immutable once posted
  notes?: string;
}

// ==============================================================================
// SAAS SUBSCRIPTION & PAYMONGO BILLING TYPES
// ==============================================================================

export interface Plan {
  id: string; // 'plan_free' | 'plan_founding'
  name: string;
  description: string;
  price_php: number;
  interval: 'month' | 'year';
  max_bookings_per_month: number | null; // null = unlimited
  max_storage_mb: number | null; // null = unlimited
  is_active: boolean;
  features: string[];
  paymongo_plan_id?: string;
  badge?: string;
  isRecommended?: boolean;
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export type PayMongoPaymentMethod = 'gcash' | 'paymaya' | 'card' | 'qrph' | 'dob' | 'billease';

export interface Subscription {
  id: string;
  user_id: string;
  company_id: string;
  plan_id: string; // FK to Plan.id
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  payment_provider: 'paymongo';
  payment_provider_customer_id?: string;
  payment_provider_subscription_id?: string;
  payment_provider_checkout_id?: string;
  last_payment_method?: PayMongoPaymentMethod;
  consumed_payment_ids?: string[];
  auto_renew?: boolean;
  billing_cycle?: 'monthly' | 'annual';
  billed_truck_count?: number;
  last_billed_amount_php?: number;
  grant_source?: 'paymongo' | 'promo';
  storage_addon_gb?: number;
  pricing_tier?: 'founding' | 'founding-rolled' | 'list';
  included_trucks?: number;
  base_rate_php?: number;
  lock_expires_at?: string;
  founding_signup_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingHistoryItem {
  id: string;
  subscription_id: string;
  user_id: string;
  paymongo_payment_id: string;
  amount_php: number;
  currency: string;
  status: 'paid' | 'failed' | 'refunded';
  payment_method: PayMongoPaymentMethod;
  receipt_number: string;
  billing_period_start: string;
  billing_period_end: string;
  invoice_pdf_url?: string;
  created_at: string;
}

export interface SubscriptionUsageStats {
  bookingsThisMonth: number;
  maxBookingsPerMonth: number | null;
  bookingCapPercentage: number;
  hasReachedBookingCap: boolean;
  isNearingBookingCap: boolean; // >= 80% of limit
  
  storageUsedMb: number;
  maxStorageMb: number | null;
  storageCapPercentage: number;
  hasReachedStorageCap: boolean;
  
  isFounding: boolean;
  isFreePlan: boolean;
  isFreeTrialExpired: boolean;
  isSubscriptionActive: boolean;
  daysRemainingInPeriod: number;

  trucksUsed: number;
  maxTrucks: number | null;
  accountsUsed: number;
  maxAccounts: number | null;
  rolesUsed: number;
  maxRoles: number | null;
  transactionsUsed: number;
  maxTransactions: number | null;
  hasReachedTruckCap: boolean;
  hasReachedAccountCap: boolean;
  hasReachedRoleCap: boolean;
  hasReachedTransactionCap: boolean;
}

export type SalesAgentStatus = 'active' | 'inactive';
export type AgentCommissionKind = 'saas' | 'perpetual' | 'support';

export interface SalesAgent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: SalesAgentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentCommissionEntry {
  id: string;
  agentId: string;
  companyId: string;
  companyName: string;
  kind: AgentCommissionKind;
  paymentId: string;
  paymentNumber?: number;
  billedPhp: number;
  rate: number;
  commissionPhp: number;
  createdAt: string;
}

export interface AgentPayout {
  id: string;
  agentId: string;
  amountPhp: number;
  paidAt: string;
  method?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export type PlatformNoticeKind = 'maintenance' | 'update';

export interface PlatformNotice {
  id: string;
  kind: PlatformNoticeKind;
  title: string;
  message: string;
  hasDowntime: boolean;
  downtimeStart?: string;
  downtimeEnd?: string;
  showUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}


