import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Send, 
  Coins, 
  Building2, 
  Plus, 
  ArrowRight,
  Sparkles,
  Lock,
  Paperclip,
  ShieldCheck,
  CreditCard,
  FileCheck2,
  ShieldAlert,
  Ban,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';
import { Invoice, InvoiceStatus } from '../../types';
import { PaymentReconciliationModal } from './PaymentReconciliationModal';
import { InvoiceRetractionModal } from './InvoiceRetractionModal';

interface InvoiceListProps {
  onSelectInvoice: (invoiceId: string) => void;
  onSelectTrip: (tripId: string) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ 
  onSelectInvoice,
  onSelectTrip
}) => {
  const { 
    invoices, 
    clients, 
    trips, 
    updateInvoiceStatus, 
    createInvoiceForTrip,
    currentUser
  } = useFreight();

  const isOwner = currentUser.role === 'Owner';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus | 'Locked'>('ALL');
  const [selectedInvoiceForReconciliation, setSelectedInvoiceForReconciliation] = useState<Invoice | null>(null);
  const [selectedInvoiceForRetraction, setSelectedInvoiceForRetraction] = useState<Invoice | null>(null);

  // Trips that are delivered but not yet invoiced
  const unbilledDeliveredTrips = trips.filter(
    t => t.status === 'Delivered' && !invoices.some(inv => inv.tripId === t.id && inv.status !== 'Voided')
  );

  const filteredInvoices = invoices.filter(inv => {
    const clt = clients.find(c => c.id === inv.clientId);
    const trip = trips.find(t => t.id === inv.tripId);
    const q = search.toLowerCase();

    const matchesSearch = !q || (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (clt?.name.toLowerCase().includes(q)) ||
      (trip?.tripNumber.toLowerCase().includes(q)) ||
      (trip?.waybillNumber.toLowerCase().includes(q)) ||
      (inv.proofOfPayment?.paymentReference.toLowerCase().includes(q)) ||
      (inv.activeRetractionRequest?.detailedReason.toLowerCase().includes(q)) ||
      (inv.paymentReference?.toLowerCase().includes(q))
    );

    let matchesStatus = true;
    if (statusFilter === 'Locked') {
      matchesStatus = !!inv.isLocked && inv.status !== 'Voided';
    } else if (statusFilter !== 'ALL') {
      matchesStatus = inv.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Financial Stats
  const validInvoices = invoices.filter(i => i.status !== 'Voided');
  const totalBilled = validInvoices.reduce((sum, i) => sum + i.grandTotalPhp, 0);
  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  const totalCashCollected = paidInvoices.reduce((sum, i) => sum + (i.proofOfPayment?.amountPaidPhp || (i.grandTotalPhp - (i.withholdingTaxAmountPhp || 0))), 0);
  const totalEwtWithheld = paidInvoices.reduce((sum, i) => sum + (i.proofOfPayment?.ewtDeductedPhp || i.withholdingTaxAmountPhp || 0), 0);
  const totalReceivables = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Voided').reduce((sum, i) => sum + i.grandTotalPhp, 0);
  const pendingRetractionsCount = invoices.filter(i => i.status === 'Retraction_Pending').length;

  const handleSendDraft = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    updateInvoiceStatus(inv.id, 'Sent');
  };

  const handleOpenReconciliation = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    setSelectedInvoiceForReconciliation(inv);
  };

  const handleOpenRetraction = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    setSelectedInvoiceForRetraction(inv);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Freight Invoicing & Receivables</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                {invoices.length} invoices
              </span>
              {pendingRetractionsCount > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono border border-amber-300 font-bold flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span>{pendingRetractionsCount} Retraction Pending</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              BIR-compliant tax billing, dual-control retraction governance with mandatory operator justification, and payment verification locking.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap gap-2">
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Invoiced (Gross)</div>
              <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">
                ₱{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <div className="text-[10px] text-emerald-700 uppercase font-semibold">Net Cash Received</div>
              <div className="font-mono font-bold text-emerald-800 text-xs mt-0.5">
                ₱{totalCashCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <div className="text-[10px] text-purple-700 uppercase font-semibold flex items-center gap-1">
                <span>2% BIR 2307 Withheld</span>
              </div>
              <div className="font-mono font-bold text-purple-900 text-xs mt-0.5">
                ₱{totalEwtWithheld.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <div className="text-[10px] text-blue-700 uppercase font-semibold">Outstanding AR</div>
              <div className="font-mono font-bold text-blue-800 text-xs mt-0.5">
                ₱{totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer name, waybill, POP ref, retraction notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1 text-xs flex-wrap gap-1">
            {(['ALL', 'Draft', 'Sent', 'Retraction_Pending', 'Paid', 'Voided'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  statusFilter === st 
                    ? 'bg-white text-blue-600 shadow-2xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'Retraction_Pending' && <ShieldAlert className="w-3 h-3 text-amber-600" />}
                {st === 'Voided' && <Ban className="w-3 h-3 text-rose-600" />}
                <span>{st === 'Retraction_Pending' ? 'Retractions' : st}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 space-y-6">
        
        {/* Pending Retractions Banner for Owner */}
        {pendingRetractionsCount > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-amber-950 text-xs">
                  {pendingRetractionsCount} Invoice Retraction Request(s) Pending Clearance
                </div>
                <div className="text-[11px] text-amber-800">
                  Operators reported input mistakes and requested invoice retract/reversion. Executive review required by Owner.
                </div>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter('Retraction_Pending')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-2xs self-start sm:self-center"
            >
              Filter Retractions
            </button>
          </div>
        )}

        {/* Unbilled Delivered Shipments Alert Banner */}
        {unbilledDeliveredTrips.length > 0 && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  {unbilledDeliveredTrips.length} Delivered Shipment(s) Ready for Invoicing
                </div>
                <div className="text-[11px] text-slate-500">
                  Consignee Proof of Delivery (e-POD) signed. Issue tax invoices to initiate collection terms.
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {unbilledDeliveredTrips.slice(0, 2).map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    const inv = createInvoiceForTrip(t.id);
                    onSelectInvoice(inv.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs"
                >
                  Bill {t.tripNumber} (₱{t.baseRatePhp.toLocaleString()})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Client / Shipper</th>
                <th className="py-3 px-4">Trip / Waybill</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4">Proof of Payment / Retraction Status</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Grand Total (PHP)</th>
                <th className="py-3 px-4 text-right">Governance & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No invoices match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const clt = clients.find(c => c.id === inv.clientId);
                  const trip = trips.find(t => t.id === inv.tripId);
                  const pop = inv.proofOfPayment;
                  const retReq = inv.activeRetractionRequest;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onSelectInvoice(inv.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] truncate">
                        {clt?.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800">{trip?.tripNumber || '—'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{trip?.waybillNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div>{inv.issueDate}</div>
                        <div className="text-[10px] text-slate-400">Due: {inv.dueDate}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {retReq ? (
                          <div className="space-y-0.5">
                            <div className="font-semibold text-amber-800 text-[11px] flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Retraction Req: {retReq.reasonCategory}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                              "{retReq.detailedReason}"
                            </div>
                          </div>
                        ) : pop ? (
                          <div className="space-y-0.5">
                            <div className="font-mono text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{pop.paymentReference}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {pop.paymentMethod.replace('Bank Transfer ', '')} • {pop.paymentDate}
                            </div>
                          </div>
                        ) : inv.status === 'Sent' ? (
                          <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Dispatched & Locked
                          </span>
                        ) : inv.status === 'Voided' ? (
                          <span className="text-[11px] text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Voided Record
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Draft (Unsent)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          inv.status === 'Draft' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          inv.status === 'Sent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          inv.status === 'Retraction_Pending' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          inv.status === 'Voided' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                          'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {inv.isLocked && <Lock className="w-3 h-3 text-emerald-600" />}
                          {inv.status === 'Retraction_Pending' && <ShieldAlert className="w-3 h-3 text-amber-600" />}
                          {inv.status === 'Voided' && <Ban className="w-3 h-3 text-rose-600" />}
                          <span>{inv.status === 'Retraction_Pending' ? 'Retraction Pending' : inv.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ₱{inv.grandTotalPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {inv.status === 'Draft' && (
                            <button
                              onClick={(e) => handleSendDraft(e, inv)}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                            >
                              Send
                            </button>
                          )}
                          {inv.status === 'Retraction_Pending' && (
                            <button
                              onClick={(e) => handleOpenRetraction(e, inv)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>{isOwner ? 'Review' : 'View Req'}</span>
                            </button>
                          )}
                          {inv.status === 'Sent' && (
                            <>
                              <button
                                onClick={(e) => handleOpenReconciliation(e, inv)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Reconcile POP</span>
                              </button>
                              <button
                                onClick={(e) => handleOpenRetraction(e, inv)}
                                className="px-2 py-1 rounded bg-white hover:bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200"
                                title="Request invoice retraction / mistake correction"
                              >
                                Retract
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onSelectInvoice(inv.id)}
                            className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Payment Reconciliation Modal */}
      {selectedInvoiceForReconciliation && (
        <PaymentReconciliationModal
          invoice={selectedInvoiceForReconciliation}
          isOpen={!!selectedInvoiceForReconciliation}
          onClose={() => setSelectedInvoiceForReconciliation(null)}
        />
      )}

      {/* Invoice Retraction / Correction Request Modal */}
      {selectedInvoiceForRetraction && (
        <InvoiceRetractionModal
          invoice={selectedInvoiceForRetraction}
          isOpen={!!selectedInvoiceForRetraction}
          onClose={() => setSelectedInvoiceForRetraction(null)}
        />
      )}
    </div>
  );
};
