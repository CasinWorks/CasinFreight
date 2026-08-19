import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Company, 
  User, 
  UserRole, 
  RolePermissionCheck,
  Truck, 
  Driver, 
  Client, 
  RateCard, 
  Trip, 
  TripStatus, 
  TripAccessorial, 
  POD, 
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
  RbacAuditEntry
} from '../types';
import { 
  RbacLocalDatabase, 
  DEFAULT_RBAC_ROLES 
} from '../services/rbacLocalDb';
import { 
  initialCompany, 
  initialUsers, 
  initialTrucks, 
  initialDrivers, 
  initialClients, 
  initialRateCards, 
  initialTrips, 
  initialInvoices,
  initialNotifications,
  initialFuelLogs,
  initialChartOfAccounts,
  initialJournalEntries,
  initialPlans,
  initialSubscription,
  initialBillingHistory
} from '../data/mockData';

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
  
  users: User[];
  currentUser: User;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  switchUserAccount: (userId: string) => void;
  switchUserRole: (role: UserRole) => void;
  addUser: (user: Omit<User, 'id' | 'companyId'>) => void;
  
  trucks: Truck[];
  addTruck: (truck: Omit<Truck, 'id' | 'companyId' | 'netPayloadKg'>) => Truck;
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
  
  rateCards: RateCard[];
  addRateCard: (card: Omit<RateCard, 'id' | 'companyId'>) => RateCard;
  updateRateCard: (id: string, updates: Partial<RateCard>) => void;
  deleteRateCard: (id: string) => void;
  suggestRateCard: (originZone: string, destinationZone: string, truckType: TruckType) => RateCard | undefined;
  
  trips: Trip[];
  addTrip: (tripData: Omit<Trip, 'id' | 'companyId' | 'tripNumber' | 'waybillNumber' | 'timeline' | 'createdAt' | 'isOverweight' | 'overweightKg'>) => Trip;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  updateTripStatus: (id: string, newStatus: TripStatus, note?: string, location?: string) => void;
  addAccessorialToTrip: (tripId: string, accessorial: Omit<TripAccessorial, 'id' | 'tripId'>) => void;
  removeAccessorialFromTrip: (tripId: string, accessorialId: string) => void;
  submitPOD: (tripId: string, podData: Omit<POD, 'id' | 'tripId' | 'signedAt'>) => void;
  
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

  // Dynamic RBAC & Role Management (Offline-First Local Database)
  roles: RbacRole[];
  createRole: (roleData: Omit<RbacRole, 'id' | 'createdAt' | 'updatedAt'>) => RbacRole;
  updateRole: (id: string, updates: Partial<RbacRole>) => void;
  deleteRole: (id: string) => boolean;
  resetRolesToDefault: () => void;
  updateUserRole: (userId: string, newRole: string) => void;
  hasPermission: (permissionId: string) => boolean;
  rbacAuditLogs: RbacAuditEntry[];
  exportRbacDb: () => string;
  importRbacDb: (jsonString: string) => { success: boolean; message: string };
  
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
  createPayMongoCheckout: (planId: string, paymentMethod?: PayMongoPaymentMethod) => Promise<{ checkoutUrl: string; checkoutSessionId: string }>;
  activateFoundingPlan: (paymentMethod: PayMongoPaymentMethod, refNumber?: string) => void;
  cancelSubscriptionAtPeriodEnd: () => Promise<void>;
  resumeSubscription: () => void;
  updatePlanDetails: (planId: string, updates: Partial<Plan>) => void;
}

const FreightContext = createContext<FreightContextType | undefined>(undefined);

export const FreightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // LocalStorage initialization
  const [company, setCompany] = useState<Company>(() => {
    const saved = localStorage.getItem('cf_company');
    return saved ? JSON.parse(saved) : initialCompany;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('cf_users');
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [roles, setRoles] = useState<RbacRole[]>(() => {
    return RbacLocalDatabase.getRoles();
  });

  const [rbacAuditLogs, setRbacAuditLogs] = useState<RbacAuditEntry[]>(() => {
    return RbacLocalDatabase.getAuditLogs();
  });

  const [currentRole, setCurrentRole] = useState<UserRole>('Owner');

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('cf_auth_user_id');
    return saved || 'user-01';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem('cf_auth_session');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('cf_auth_session', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('cf_auth_user_id', currentUserId);
  }, [currentUserId]);

  const [trucks, setTrucks] = useState<Truck[]>(() => {
    const saved = localStorage.getItem('cf_trucks');
    return saved ? JSON.parse(saved) : initialTrucks;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('cf_drivers');
    return saved ? JSON.parse(saved) : initialDrivers;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('cf_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });

  const [rateCards, setRateCards] = useState<RateCard[]>(() => {
    const saved = localStorage.getItem('cf_rateCards');
    return saved ? JSON.parse(saved) : initialRateCards;
  });

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('cf_trips');
    return saved ? JSON.parse(saved) : initialTrips;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('cf_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('cf_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => {
    const saved = localStorage.getItem('cf_fuelLogs');
    return saved ? JSON.parse(saved) : initialFuelLogs;
  });

  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => {
    const saved = localStorage.getItem('cf_chartOfAccounts');
    return saved ? JSON.parse(saved) : initialChartOfAccounts;
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('cf_journalEntries');
    return saved ? JSON.parse(saved) : initialJournalEntries;
  });

  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem('cf_plans');
    return saved ? JSON.parse(saved) : initialPlans;
  });

  const [subscription, setSubscription] = useState<Subscription>(() => {
    const saved = localStorage.getItem('cf_subscription');
    return saved ? JSON.parse(saved) : initialSubscription;
  });

  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>(() => {
    const saved = localStorage.getItem('cf_billingHistory');
    return saved ? JSON.parse(saved) : initialBillingHistory;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('cf_plans', JSON.stringify(plans));
  }, [plans]);

  useEffect(() => {
    localStorage.setItem('cf_subscription', JSON.stringify(subscription));
  }, [subscription]);

  useEffect(() => {
    localStorage.setItem('cf_billingHistory', JSON.stringify(billingHistory));
  }, [billingHistory]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('cf_company', JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem('cf_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    RbacLocalDatabase.saveRoles(roles);
  }, [roles]);

  useEffect(() => {
    RbacLocalDatabase.saveAuditLogs(rbacAuditLogs);
  }, [rbacAuditLogs]);

  useEffect(() => {
    localStorage.setItem('cf_trucks', JSON.stringify(trucks));
  }, [trucks]);

  useEffect(() => {
    localStorage.setItem('cf_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('cf_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('cf_rateCards', JSON.stringify(rateCards));
  }, [rateCards]);

  useEffect(() => {
    localStorage.setItem('cf_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('cf_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('cf_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('cf_fuelLogs', JSON.stringify(fuelLogs));
  }, [fuelLogs]);

  useEffect(() => {
    localStorage.setItem('cf_chartOfAccounts', JSON.stringify(chartOfAccounts));
  }, [chartOfAccounts]);

  useEffect(() => {
    localStorage.setItem('cf_journalEntries', JSON.stringify(journalEntries));
  }, [journalEntries]);

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

  const currentUser = users.find(u => u.id === currentUserId) || users.find(u => u.role === currentRole) || users[0] || {
    id: 'default-user',
    name: 'Admin User',
    email: 'admin@casinfreight.ph',
    role: currentRole,
    companyId: company.id,
  };

  const switchUserRole = (role: UserRole) => {
    setCurrentRole(role);
    const matchedUser = users.find(u => u.role.toLowerCase() === role.toLowerCase());
    if (matchedUser) {
      setCurrentUserId(matchedUser.id);
    }
  };

  const switchUserAccount = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUserId(user.id);
      setCurrentRole(user.role);
      setIsAuthenticated(true);
    }
  };

  const login = (email: string, password?: string): { success: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Operator account not found in local workstation database.' };
    }

    if (user.password && password && password.trim() && user.password !== password) {
      return { success: false, error: 'Invalid password. (Default demo password: password123)' };
    }

    setCurrentUserId(user.id);
    setCurrentRole(user.role);
    setIsAuthenticated(true);

    RbacLocalDatabase.logAction(
      user.name,
      user.role,
      'USER_ROLE_ASSIGNED',
      `Operator logged into local workstation session.`
    );

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const hasPermission = (permissionId: string): boolean => {
    return RbacLocalDatabase.checkPermission(currentUser.role, permissionId, roles);
  };

  const updateUserRole = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    const targetUser = users.find(u => u.id === userId);
    const entry = RbacLocalDatabase.logAction(
      currentUser.name,
      currentUser.role,
      'USER_ROLE_ASSIGNED',
      `Assigned user "${targetUser?.name || userId}" to role "${newRole}".`,
      newRole,
      targetUser?.name
    );
    setRbacAuditLogs(prev => [entry, ...prev]);
  };

  const createRole = (roleData: Omit<RbacRole, 'id' | 'createdAt' | 'updatedAt'>): RbacRole => {
    const slugId = roleData.name.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const newRole: RbacRole = {
      ...roleData,
      id: slugId || `role_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRoles(prev => [...prev, newRole]);
    const entry = RbacLocalDatabase.logAction(
      currentUser.name,
      currentUser.role,
      'ROLE_CREATED',
      `Created custom role "${newRole.name}" with ${newRole.permissions.length} permissions.`,
      newRole.id
    );
    setRbacAuditLogs(prev => [entry, ...prev]);
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
    const entry = RbacLocalDatabase.logAction(
      currentUser.name,
      currentUser.role,
      'ROLE_UPDATED',
      `Updated permissions and configuration for role "${targetRole?.name || id}".`,
      id
    );
    setRbacAuditLogs(prev => [entry, ...prev]);
  };

  const deleteRole = (id: string): boolean => {
    const target = roles.find(r => r.id === id);
    if (!target || target.isSystem) return false;

    // Reassign any users on this deleted role to 'Dispatcher'
    setUsers(prev => prev.map(u => u.role === id ? { ...u, role: 'Dispatcher' } : u));
    setRoles(prev => prev.filter(r => r.id !== id));

    if (currentRole === id) {
      setCurrentRole('Owner');
    }

    const entry = RbacLocalDatabase.logAction(
      currentUser.name,
      currentUser.role,
      'ROLE_DELETED',
      `Deleted custom role "${target.name}". Any assigned team members were reassigned to Dispatcher.`,
      id
    );
    setRbacAuditLogs(prev => [entry, ...prev]);
    return true;
  };

  const resetRolesToDefault = () => {
    setRoles(DEFAULT_RBAC_ROLES);
    RbacLocalDatabase.saveRoles(DEFAULT_RBAC_ROLES);
    const entry = RbacLocalDatabase.logAction(
      currentUser.name,
      currentUser.role,
      'PERMISSIONS_RESET',
      'Reset all RBAC roles and permissions to standard Philippine logistics system defaults.'
    );
    setRbacAuditLogs(prev => [entry, ...prev]);
  };

  const exportRbacDb = (): string => {
    return RbacLocalDatabase.exportDatabaseJson();
  };

  const importRbacDb = (jsonString: string) => {
    const res = RbacLocalDatabase.importDatabaseJson(jsonString);
    if (res.success) {
      setRoles(RbacLocalDatabase.getRoles());
      setRbacAuditLogs(RbacLocalDatabase.getAuditLogs());
    }
    return res;
  };

  const updateCompany = (updates: Partial<Company>) => {
    setCompany(prev => ({ ...prev, ...updates }));
  };

  const addUser = (userData: Omit<User, 'id' | 'companyId'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      companyId: company.id,
    };
    setUsers(prev => [...prev, newUser]);
  };

  const addTruck = (truckData: Omit<Truck, 'id' | 'companyId' | 'netPayloadKg'>): Truck => {
    const netPayloadKg = Math.max(0, truckData.gvwrKg - truckData.tareWeightKg);
    const newTruck: Truck = {
      ...truckData,
      id: `trk-${Date.now().toString().slice(-4)}`,
      companyId: company.id,
      netPayloadKg,
    };
    setTrucks(prev => [newTruck, ...prev]);
    return newTruck;
  };

  const updateTruck = (id: string, updates: Partial<Truck>) => {
    setTrucks(prev => prev.map(t => {
      if (t.id === id) {
        const gvwr = updates.gvwrKg !== undefined ? updates.gvwrKg : t.gvwrKg;
        const tare = updates.tareWeightKg !== undefined ? updates.tareWeightKg : t.tareWeightKg;
        const netPayloadKg = Math.max(0, gvwr - tare);
        return { ...t, ...updates, netPayloadKg };
      }
      return t;
    }));
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
    };
    setDrivers(prev => [newDriver, ...prev]);
    return newDriver;
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const deleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const addClient = (clientData: Omit<Client, 'id' | 'companyId' | 'activeContractsCount'>): Client => {
    const newClient: Client = {
      ...clientData,
      id: `clt-${Date.now().toString().slice(-4)}`,
      companyId: company.id,
      activeContractsCount: 1,
    };
    setClients(prev => [newClient, ...prev]);
    return newClient;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
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

  const addTrip = (tripData: Omit<Trip, 'id' | 'companyId' | 'tripNumber' | 'waybillNumber' | 'timeline' | 'createdAt' | 'isOverweight' | 'overweightKg'>): Trip => {
    const trk = trucks.find(t => t.id === tripData.truckId);
    const netCap = trk ? trk.netPayloadKg : 10000;
    const isOverweight = tripData.cargoWeightKg > netCap;
    const overweightKg = isOverweight ? (tripData.cargoWeightKg - netCap) : 0;
    
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const tripNumber = `CF-${new Date().getFullYear()}-${randomSeq}`;
    const waybillNumber = `WB-PH-${Date.now().toString().slice(-6)}`;
    const tripId = `trp-${Date.now()}`;

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
    setTrips(prev => prev.map(trip => {
      if (trip.id === id) {
        return { ...trip, ...updates };
      }
      return trip;
    }));
  };

  const updateTripStatus = (id: string, newStatus: TripStatus, note?: string, location?: string) => {
    setTrips(prev => prev.map(trip => {
      if (trip.id === id) {
        const newEvent = {
          id: `tl-${Date.now()}`,
          tripId: id,
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: note || `Trip status updated to ${newStatus}`,
          updatedBy: `${currentUser.name} (${currentUser.role})`,
          location: location || undefined,
        };

        let podUpdate = trip.pod;
        if ((newStatus === 'Delivered' || newStatus === 'Invoiced') && !podUpdate) {
          podUpdate = {
            id: `pod-auto-${Date.now()}`,
            tripId: id,
            receiverName: 'Warehouse Receiving Officer',
            receiverRole: 'Logistics Supervisor',
            receiverIdNumber: 'PH-RECEIVE-VERIFIED',
            notes: 'Goods received in full and inspected at unloading dock.',
            conditionStatus: 'Good Condition',
            signedAt: new Date().toISOString(),
            photoUrls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80']
          };
        }

        const updatedTrip = {
          ...trip,
          status: newStatus,
          actualDelivery: (newStatus === 'Delivered' || newStatus === 'Invoiced') ? (trip.actualDelivery || new Date().toISOString()) : trip.actualDelivery,
          pod: podUpdate,
          timeline: [...trip.timeline, newEvent],
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
        }

        // Emit notification for status change
        const trk = trucks.find(t => t.id === trip.truckId);
        const clt = clients.find(c => c.id === trip.clientId);
        addNotification({
          category: 'trip_update',
          title: `${trip.tripNumber}: Status updated to "${newStatus}"`,
          message: `${trk ? trk.plateNumber : 'Truck'} (${trip.originZone} ➔ ${trip.destinationZone}) is now marked as ${newStatus}.${note ? ` Note: ${note}` : ''}`,
          isRead: false,
          severity: newStatus === 'Delivered' ? 'success' : newStatus === 'In Transit' ? 'info' : 'info',
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

  const addAccessorialToTrip = (tripId: string, accessorial: Omit<TripAccessorial, 'id' | 'tripId'>) => {
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('fuel.log', roles);
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('fuel.delete', roles);
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
      case 'Delivered':
        requiredPerm = 'trips.status_delivered';
        label = 'receive shipments and capture digital e-POD signature';
        break;
      case 'Invoiced':
        requiredPerm = 'trips.status_invoiced';
        label = 'audit transport deliverables and issue official VAT billing invoices';
        break;
      default:
        requiredPerm = 'trips.edit';
        label = 'manipulate shipment status';
    }

    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission(requiredPerm, roles);
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('trips.create', roles);
    const allowed = currentUser.role === 'Owner' || hasPermission('trips.create');
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('trips.edit', roles);
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('trips.delete', roles);
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('trips.reassign_fleet', roles);
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
    const allowedRoles = RbacLocalDatabase.getAllowedRolesForPermission('invoices.create', roles);
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
    setCompany(initialCompany);
    setUsers(initialUsers);
    setTrucks(initialTrucks);
    setDrivers(initialDrivers);
    setClients(initialClients);
    setRateCards(initialRateCards);
    setTrips(initialTrips);
    setInvoices(initialInvoices);
    setNotifications(initialNotifications);
    setFuelLogs(initialFuelLogs);
    setChartOfAccounts(initialChartOfAccounts);
    setJournalEntries(initialJournalEntries);
    localStorage.clear();
  };

  return (
    <FreightContext.Provider value={{
      company,
      updateCompany,
      users,
      currentUser,
      isAuthenticated,
      login,
      logout,
      switchUserAccount,
      switchUserRole,
      addUser,
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
      rateCards,
      addRateCard,
      updateRateCard,
      deleteRateCard,
      suggestRateCard,
      trips,
      addTrip,
      updateTrip,
      updateTripStatus,
      addAccessorialToTrip,
      removeAccessorialFromTrip,
      submitPOD,
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

      // Dynamic RBAC local database
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
