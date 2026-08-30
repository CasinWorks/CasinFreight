import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  Truck, 
  UserCheck, 
  Receipt, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  ExternalLink,
  Trash2,
  Filter,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { AppNotification, NotificationCategory } from '../../types';
import { FeatureHowTo } from '../help/FeatureHowTo';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrip: (tripId: string) => void;
  onSelectInvoice: (invoiceId: string) => void;
  onNavigateToDrivers: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTrip,
  onSelectInvoice,
  onNavigateToDrivers
}) => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    deleteNotification,
    approveDriver,
    updateInvoiceStatus,
    drivers,
    canAccess
  } = useFreight();

  const [activeTab, setActiveTab] = useState<'all' | NotificationCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [approvedDriversMap, setApprovedDriversMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Filter notifications
  const filteredNotifications = notifications.filter(notif => {
    const matchesTab = activeTab === 'all' || notif.category === activeTab;
    const matchesUnread = !showUnreadOnly || !notif.isRead;
    return matchesTab && matchesUnread;
  });

  const tripNotifsCount = notifications.filter(n => n.category === 'trip_update').length;
  const driverNotifsCount = notifications.filter(n => n.category === 'driver_approval').length;
  const invoiceNotifsCount = notifications.filter(n => n.category === 'invoice_payment').length;

  const handleApproveDriverClick = (e: React.MouseEvent, driverId?: string, notifId?: string) => {
    e.stopPropagation();
    if (!driverId) return;
    approveDriver(driverId);
    if (notifId) markNotificationAsRead(notifId);
    setApprovedDriversMap(prev => ({ ...prev, [driverId]: true }));
  };

  const handleMarkPaidClick = (e: React.MouseEvent, invoiceId?: string, notifId?: string) => {
    e.stopPropagation();
    if (!invoiceId) return;
    updateInvoiceStatus(invoiceId, 'Paid');
    if (notifId) markNotificationAsRead(notifId);
  };

  const getCategoryIcon = (category: NotificationCategory, severity?: string) => {
    switch (category) {
      case 'trip_update':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'driver_approval':
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case 'invoice_payment':
        return severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Receipt className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'trip_update':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Trip Dispatch</span>;
      case 'driver_approval':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Driver Approval</span>;
      case 'invoice_payment':
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Invoice & Billing</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 md:px-5 md:py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">Notifications & Alerts</h2>
                {unreadNotificationsCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {unreadNotificationsCount} unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Live operational dispatch, driver licenses & billing reminders</p>
              <div className="mt-2">
                <FeatureHowTo feature="notifications" compact />
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Category Tabs */}
        <div className="border-b border-slate-200 bg-white px-4 pt-3 pb-2 shrink-0 space-y-2.5">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{notifications.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('trip_update')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'trip_update'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Trips</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{tripNotifsCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('driver_approval')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'driver_approval'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Driver Approvals</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{driverNotifsCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('invoice_payment')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'invoice_payment'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3 h-3" />
              <span>Invoices</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{invoiceNotifsCount}</span>
            </button>
          </div>

          {/* Secondary Controls: Mark All Read + Unread Only Toggle */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span className="text-slate-600 font-medium text-[11px]">Unread only</span>
            </label>

            {unreadNotificationsCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-slate-300" />
              </div>
              <div className="font-semibold text-slate-700 text-sm">No notifications found</div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {showUnreadOnly ? 'No unread notifications in this category.' : 'You have no recent alerts or pending tasks.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isApproved = notif.driverId && (approvedDriversMap[notif.driverId] || drivers.find(d => d.id === notif.driverId)?.approvalStatus === 'Approved');

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    if (notif.tripId) {
                      onSelectTrip(notif.tripId);
                      onClose();
                    } else if (notif.invoiceId) {
                      onSelectInvoice(notif.invoiceId);
                      onClose();
                    } else if (notif.category === 'driver_approval') {
                      onNavigateToDrivers();
                      onClose();
                    }
                  }}
                  className={`relative p-3.5 rounded-xl border transition-all cursor-pointer group shadow-2xs ${
                    !notif.isRead 
                      ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-xs' 
                      : 'bg-white/80 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Unread indicator */}
                  {!notif.isRead && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                  )}

                  {/* Notification Content */}
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      notif.category === 'trip_update' ? 'bg-blue-50' :
                      notif.category === 'driver_approval' ? 'bg-purple-50' : 'bg-emerald-50'
                    }`}>
                      {getCategoryIcon(notif.category, notif.severity)}
                    </div>

                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getCategoryBadge(notif.category)}
                        {notif.metadata?.statusBadge && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {notif.metadata.statusBadge}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium ml-auto">
                          {notif.timestamp}
                        </span>
                      </div>

                      <h4 className={`text-xs font-bold leading-snug ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Metadata Pill Ribbon */}
                      {(notif.metadata?.plateNumber || notif.metadata?.clientName || notif.metadata?.amountPhp !== undefined) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                          {notif.metadata?.plateNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                              🚛 {notif.metadata.plateNumber}
                            </span>
                          )}
                          {notif.metadata?.clientName && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200 truncate max-w-[160px]">
                              🏢 {notif.metadata.clientName}
                            </span>
                          )}
                          {notif.metadata?.amountPhp !== undefined && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 font-mono">
                              ₱{notif.metadata.amountPhp.toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                        {/* 1. Trip View Action */}
                        {notif.category === 'trip_update' && notif.tripId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationAsRead(notif.id);
                              onSelectTrip(notif.tripId!);
                              onClose();
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <span>{notif.actionLabel || 'View Trip'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}

                        {/* 2. Driver Approval Action */}
                        {notif.category === 'driver_approval' && (
                          <>
                            {isApproved ? (
                              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approved & Active</span>
                              </div>
                            ) : (
                              canAccess('driver_crud') && (
                                <button
                                  onClick={(e) => handleApproveDriverClick(e, notif.driverId, notif.id)}
                                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md shadow-xs transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Approve Driver</span>
                                </button>
                              )
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notif.id);
                                onNavigateToDrivers();
                                onClose();
                              }}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              View Roster
                            </button>
                          </>
                        )}

                        {/* 3. Invoice Action */}
                        {notif.category === 'invoice_payment' && notif.invoiceId && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notif.id);
                                onSelectInvoice(notif.invoiceId!);
                                onClose();
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors"
                            >
                              <span>{notif.actionLabel || 'View Invoice'}</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>

                            {canAccess('invoice_manage') && (
                              <button
                                onClick={(e) => handleMarkPaidClick(e, notif.invoiceId, notif.id)}
                                className="text-[11px] font-semibold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                              >
                                Mark Paid
                              </button>
                            )}
                          </>
                        )}

                        {/* Dismiss action */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="ml-auto text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                          title="Dismiss notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-center shrink-0 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>CasinFreight Dispatch Engine</span>
          </div>
          <span>v2.4 Philippines</span>
        </div>

      </div>
    </div>
  );
};
