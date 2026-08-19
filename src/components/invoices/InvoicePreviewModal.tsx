import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Send, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Receipt, 
  Building2, 
  User, 
  FileText, 
  ArrowLeft,
  Calendar,
  Sparkles,
  Download,
  Lock,
  Unlock,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  Ban,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';
import { Invoice, InvoiceStatus, InvoiceLineItem } from '../../types';
import { PaymentReconciliationModal } from './PaymentReconciliationModal';
import { InvoiceRetractionModal } from './InvoiceRetractionModal';

interface InvoicePreviewModalProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoiceId,
  isOpen,
  onClose,
}) => {
  const { 
    invoices, 
    company, 
    clients, 
    trips, 
    trucks, 
    drivers, 
    updateInvoice, 
    updateInvoiceStatus, 
    unlockInvoiceForAdjustment,
    canAccess,
    currentUser
  } = useFreight();

  const invoice = invoices.find(i => i.id === invoiceId);

  const [isEditing, setIsEditing] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [vatPercent, setVatPercent] = useState<number>(12);
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [isRetractionOpen, setIsRetractionOpen] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  React.useEffect(() => {
    if (invoice) {
      setLineItems(invoice.lineItems);
      setVatPercent(invoice.vatPercent);
      setWithholdingTaxPercent(invoice.withholdingTaxPercent || 2);
      setNotes(invoice.notes || '');
      setIsEditing(false);
      setShowUnlockConfirm(false);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const isOwner = currentUser.role === 'Owner';
  const isSentOrPaid = invoice.status === 'Sent' || invoice.status === 'Paid';
  const isVoided = invoice.status === 'Voided';
  const isRetractionPending = invoice.status === 'Retraction_Pending';

  const client = clients.find(c => c.id === invoice.clientId);
  const trip = trips.find(t => t.id === invoice.tripId);
  const truck = trip ? trucks.find(t => t.id === trip.truckId) : undefined;
  const driver = trip ? drivers.find(d => d.id === trip.driverId) : undefined;

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = (subtotal * vatPercent) / 100;
  const withholdingTaxAmount = (subtotal * withholdingTaxPercent) / 100;
  const grandTotal = subtotal + vatAmount;

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    if (newStatus === 'Paid' && !invoice.isLocked) {
      setIsReconciliationOpen(true);
      return;
    }
    updateInvoiceStatus(invoice.id, newStatus);
  };

  const handleSaveEdits = () => {
    updateInvoice(invoice.id, {
      lineItems,
      vatPercent,
      withholdingTaxPercent,
      notes,
    });
    setIsEditing(false);
  };

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `li-${Date.now()}`,
      description: 'Additional logistics service charge',
      qty: 1,
      unitPrice: 1000,
      total: 1000,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unitPrice') {
          updated.total = (Number(updated.qty) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const handleDeleteLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUnlockInvoice = () => {
    if (!unlockReason.trim()) return;
    unlockInvoiceForAdjustment(invoice.id, unlockReason);
    setShowUnlockConfirm(false);
    setUnlockReason('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:bg-white print:text-black">
          
          {/* Top Controls Bar (Hidden during printing) */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-2xs border ${
                isVoided 
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : isRetractionPending
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : invoice.isLocked
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {isVoided ? <Ban className="w-4 h-4" /> : isRetractionPending ? <ShieldAlert className="w-4 h-4" /> : invoice.isLocked ? <Lock className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                    isVoided
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : isRetractionPending
                        ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                        : invoice.isLocked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : invoice.status === 'Draft' 
                            ? 'bg-slate-100 text-slate-700 border-slate-200' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {invoice.isLocked && <Lock className="w-3 h-3 text-emerald-600" />}
                    <span>{isVoided ? 'VOIDED / CANCELLED' : isRetractionPending ? 'Retraction Pending' : invoice.isLocked ? 'Paid & Reconciled' : invoice.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Billing Entity: <strong className="text-slate-800">{client?.name}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Payment Reconciliation Quick Trigger if Not Yet Reconciled & Not Voided */}
              {!invoice.isLocked && !isVoided && invoice.status !== 'Retraction_Pending' && (
                <button
                  onClick={() => setIsReconciliationOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Reconcile & Lock Payment</span>
                </button>
              )}

              {/* Retraction Workflow Trigger: If Invoiced (Sent) or Retraction is Pending */}
              {!isVoided && invoice.status !== 'Draft' && (
                <button
                  onClick={() => setIsRetractionOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs border ${
                    isRetractionPending
                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 animate-bounce'
                      : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                  title={isOwner ? "Review and Approve/Reject Retraction" : "Submit Correction / Retraction Request"}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>
                    {isRetractionPending 
                      ? (isOwner ? 'Review Retraction (Clearance Req)' : 'Retraction Pending Approval') 
                      : 'Request Retraction / Retract'}
                  </span>
                </button>
              )}

              {/* Status Selector (Only allowed during Draft stage) */}
              {invoice.status === 'Draft' && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-2xs">
                  <span className="text-slate-500 px-2 text-[11px]">Action:</span>
                  <button
                    onClick={() => handleStatusChange('Sent')}
                    className="px-2.5 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                  >
                    Transmit to Client (Lock as Sent)
                  </button>
                </div>
              )}

              {/* Edit Controls (Only available when DRAFT) */}
              {invoice.status === 'Draft' && canAccess('invoice_manage') && (
                <button
                  onClick={() => {
                    if (isEditing) handleSaveEdits();
                    else setIsEditing(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isEditing 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {isEditing ? 'Save Line Items' : 'Edit Line Items'}
                </button>
              )}

              {/* Unlock Action for Admin/Owner if Locked */}
              {invoice.isLocked && isOwner && (
                <button
                  onClick={() => setShowUnlockConfirm(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs"
                  title="Unlock for administrative billing correction"
                >
                  <Unlock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Owner Override</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Retraction Pending Banner */}
          {isRetractionPending && invoice.activeRetractionRequest && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 print:hidden">
              <div className="flex items-start sm:items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="font-bold text-amber-950">
                    Retraction / Correction Request Pending Owner Decision:
                  </div>
                  <div className="text-amber-800 text-[11px] mt-0.5">
                    Operator <strong>{invoice.activeRetractionRequest.requestedBy}</strong> requested retraction: <em>"{invoice.activeRetractionRequest.detailedReason}"</em>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsRetractionOpen(true)}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 self-start sm:self-center shadow-2xs"
              >
                {isOwner ? 'Review & Decide' : 'View Request Details'}
              </button>
            </div>
          )}

          {/* Voided Banner */}
          {isVoided && (
            <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-900 print:hidden">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>INVOICE VOIDED:</strong> This invoice was officially cancelled and retracted. It is non-payable and retained solely for BIR audit compliance.
                </span>
              </div>
              <span className="text-[10px] font-mono bg-white text-rose-800 px-2 py-0.5 rounded border border-rose-300 font-bold shrink-0">
                VOID
              </span>
            </div>
          )}

          {/* Sent Immutable Notice for Operators */}
          {invoice.status === 'Sent' && (
            <div className="bg-blue-50/70 border-b border-blue-200 px-6 py-2 flex items-center justify-between text-[11px] text-blue-900 print:hidden">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong>Immutable Invoiced State:</strong> Line items cannot be modified directly once issued. If an input error was made, use <strong>"Request Retraction / Retract"</strong> to submit written justification for Owner review.
                </span>
              </div>
            </div>
          )}

          {/* Locked Status Banner */}
          {invoice.isLocked && !isVoided && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 print:hidden">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Receivable Reconciled & Locked:</strong> Official proof of payment is permanently sealed on file (Ref: <span className="font-mono font-bold">{invoice.proofOfPayment?.paymentReference || invoice.paymentReference}</span>). Line items are immutable.
                </span>
              </div>
              <span className="text-[10px] font-mono bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 font-bold shrink-0">
                AUDIT SEALED
              </span>
            </div>
          )}

          {/* Unlock Confirmation Panel */}
          {showUnlockConfirm && (
            <div className="bg-amber-50 border-b border-amber-200 p-4 space-y-3 print:hidden text-xs">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Administrative Unlock Clearance (Owner Authority):</strong>
                  <p className="text-amber-800 mt-0.5">
                    Unlocking this invoice removes the permanent financial lock and allows line-item adjustments. Please log the accounting correction justification below for audit purposes.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="e.g. Correcting accessorial demurrage rate per billing dispute agreement..."
                  className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleUnlockInvoice}
                  disabled={!unlockReason.trim()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs"
                >
                  Confirm Unlock
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlockConfirm(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Printable Official Invoice Document */}
          <div className="overflow-y-auto p-6 md:p-8 flex-1 bg-white text-neutral-900 font-sans print:p-0 relative">
            
            {/* VOID Watermark if voided */}
            {isVoided && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-15">
                <div className="text-9xl font-black text-rose-600 uppercase -rotate-12 border-8 border-rose-600 px-12 py-4 rounded-3xl">
                  VOID
                </div>
              </div>
            )}

            {/* Header & Logo Section */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-neutral-900 pb-6 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-neutral-950 text-amber-400 flex items-center justify-center font-black text-base">
                    CF
                  </div>
                  <h1 className="text-xl font-black tracking-tight text-neutral-950 uppercase">
                    {company.name}
                  </h1>
                </div>
                <p className="text-xs text-neutral-600 mt-1 max-w-sm">
                  {company.address}
                </p>
                <div className="text-xs text-neutral-600 font-mono mt-1 space-y-0.5">
                  <div><strong>TIN:</strong> {company.tin} (VAT Registered)</div>
                  <div><strong>Contact:</strong> {company.contactNumber}</div>
                  <div><strong>Email:</strong> {company.email}</div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="flex items-center sm:justify-end gap-2">
                  <div className="text-2xl font-black text-neutral-900 tracking-tight uppercase">
                    FREIGHT INVOICE
                  </div>
                  {isVoided ? (
                    <span className="text-[10px] font-mono font-black bg-rose-100 text-rose-800 border border-rose-400 px-2 py-0.5 rounded uppercase">
                      VOID / CANCELLED
                    </span>
                  ) : invoice.isLocked ? (
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded uppercase">
                      PAID & RECONCILED
                    </span>
                  ) : null}
                </div>
                <div className="text-xs font-mono font-bold text-neutral-700 mt-1">
                  Invoice No: <span className="text-neutral-950 font-black">{invoice.invoiceNumber}</span>
                </div>
                <div className="text-xs text-neutral-600 mt-1 space-y-0.5">
                  <div>Date Issued: <strong>{invoice.issueDate}</strong></div>
                  <div>Payment Due: <strong>{invoice.dueDate}</strong></div>
                  <div>Waybill Ref: <span className="font-mono font-bold">{trip?.waybillNumber || 'WB-N/A'}</span></div>
                </div>
              </div>
            </div>

            {/* Billed To & Shipment Reference Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 bg-neutral-50 p-4 rounded-lg border border-neutral-200 text-xs">
              <div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  BILLED TO (CLIENT / CONSIGNEE)
                </div>
                <div className="font-bold text-neutral-900 text-sm">{client?.name}</div>
                <div className="text-neutral-600 mt-0.5">{client?.billingAddress}</div>
                <div className="text-neutral-600 font-mono mt-1">
                  <strong>Client TIN:</strong> {client?.tin}
                </div>
                <div className="text-neutral-600 mt-0.5">
                  <strong>Attention:</strong> {client?.contactPerson} ({client?.phone})
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  TRUCK & ROUTE LOGISTICS DETAILS
                </div>
                <div className="space-y-1 text-neutral-700">
                  <div><strong>Route:</strong> {trip?.originZone} → {trip?.destinationZone}</div>
                  <div><strong>Assigned Truck:</strong> <span className="font-mono font-bold">{truck?.plateNumber}</span> ({truck?.type})</div>
                  <div><strong>Authorized Driver:</strong> {driver?.name} (License: {driver?.licenseNo})</div>
                  <div><strong>Cargo Weight:</strong> {((trip?.cargoWeightKg || 0) / 1000).toFixed(2)} MT Palletized Freight</div>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-900 bg-neutral-100 text-neutral-900 font-bold uppercase text-[11px]">
                    <th className="py-2.5 px-3">Description / Accessorial Particulars</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Rate (₱)</th>
                    <th className="py-2.5 px-3 text-right w-32">Amount (₱)</th>
                    {isEditing && invoice.status === 'Draft' && <th className="py-2.5 px-2 w-10 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {lineItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3">
                        {isEditing && invoice.status === 'Draft' ? (
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                            className="w-full border border-neutral-300 rounded p-1 text-xs"
                          />
                        ) : (
                          <div className="font-medium text-neutral-900">
                            {item.description}
                            {item.isAccessorial && (
                              <span className="ml-2 text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.2 rounded font-mono font-normal">
                                Accessorial
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isEditing && invoice.status === 'Draft' ? (
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateLineItem(item.id, 'qty', Number(e.target.value))}
                            className="w-12 border border-neutral-300 rounded p-1 text-center text-xs"
                          />
                        ) : (
                          <span className="font-mono">{item.qty}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {isEditing && invoice.status === 'Draft' ? (
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                            className="w-24 border border-neutral-300 rounded p-1 text-right text-xs font-mono"
                          />
                        ) : (
                          item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                        ₱{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {isEditing && invoice.status === 'Draft' && (
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLineItem(item.id)}
                            className="text-rose-600 hover:text-rose-800 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {isEditing && invoice.status === 'Draft' && (
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="mt-2 text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Extra Line Item / Accessorial</span>
                </button>
              )}
            </div>

            {/* Totals & Tax Calculation Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 border-t-2 border-neutral-900 pt-4">
              <div className="sm:col-span-7 space-y-3 text-xs text-neutral-600">
                <div className="bg-neutral-50 p-3 rounded border border-neutral-200">
                  <div className="font-bold text-neutral-800 uppercase text-[10px] mb-1">
                    PAYMENT INSTRUCTIONS & BANK DETAILS
                  </div>
                  <div>Please make payment payable to: <strong>{company.name}</strong></div>
                  <div className="font-mono mt-0.5">BDO Unibank Account #: 0014-9982-1092</div>
                  <div className="font-mono">BPI Corporate Account #: 2419-0018-44</div>
                  <div className="mt-1 text-[11px] text-neutral-500">
                    {notes || 'Strictly 30-day payment term. Please email remittance advice to billing@casinfreight.ph'}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-5 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-700 py-1">
                  <span>Subtotal (Net of VAT):</span>
                  <span className="font-mono font-semibold">
                    ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-700 py-1 border-t border-neutral-200">
                  <span>12% Value Added Tax (VAT):</span>
                  <span className="font-mono font-semibold">
                    ₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-500 py-1 text-[11px]">
                  <span>Less 2% BIR EWT Withholding (Form 2307):</span>
                  <span className="font-mono">
                    (₱{withholdingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </div>

                <div className="flex justify-between text-base font-black text-neutral-950 py-2 border-t-2 border-neutral-900">
                  <span>TOTAL AMOUNT DUE:</span>
                  <span className="font-mono text-neutral-950">
                    ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Proof of Payment & BIR EWT Certification Box (Printed & Displayed when Reconciled) */}
            {invoice.isLocked && invoice.proofOfPayment && !isVoided && (
              <div className="mt-6 p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/40 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h4 className="font-black text-emerald-950 uppercase tracking-tight text-xs">
                        OFFICIAL PAYMENT RECEIPT & RECONCILIATION CERTIFICATE
                      </h4>
                      <p className="text-[10px] text-emerald-800 font-medium">
                        Proof of Payment Verified & Locked in General Ledger
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    VERIFIED PAID
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Payment Channel</div>
                    <div className="font-bold text-neutral-900 mt-0.5">{invoice.proofOfPayment.paymentMethod}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Bank / Check Ref #</div>
                    <div className="font-mono font-bold text-neutral-900 mt-0.5">{invoice.proofOfPayment.paymentReference}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Amount Remitted</div>
                    <div className="font-mono font-black text-emerald-900 mt-0.5">
                      ₱{invoice.proofOfPayment.amountPaidPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">2% BIR 2307 Withheld</div>
                    <div className="font-mono font-bold text-neutral-700 mt-0.5">
                      {invoice.proofOfPayment.ewtDeductedPhp ? `₱${invoice.proofOfPayment.ewtDeductedPhp.toLocaleString()}` : 'None'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60 text-xs">
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Official Receipt (OR) #</div>
                    <div className="font-mono font-bold text-neutral-800 mt-0.5">
                      {invoice.proofOfPayment.officialReceiptNo || 'OR-PENDING'}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      Date Paid: {invoice.proofOfPayment.paymentDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-800 uppercase font-semibold">Finance Verifier</div>
                    <div className="font-bold text-neutral-900 mt-0.5">{invoice.proofOfPayment.verifiedBy}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      {new Date(invoice.proofOfPayment.verifiedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {invoice.proofOfPayment.popFileUrl && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-[11px] font-medium text-emerald-950">
                        Attached POP Document: <strong>{invoice.proofOfPayment.popFileName || 'Deposit_Receipt.pdf'}</strong>
                      </span>
                    </div>
                    <a
                      href={invoice.proofOfPayment.popFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <span>View Receipt Image</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Signatures & Certification */}
            <div className="grid grid-cols-2 gap-8 mt-12 pt-6 border-t border-neutral-300 text-xs">
              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-neutral-700 pt-1 font-bold text-neutral-900 uppercase">
                  Clarisse Anne Mendoza, CPA
                </div>
                <div className="text-[10px] text-neutral-500">Billing & Accounting Lead</div>
              </div>

              <div className="text-center">
                <div className="h-10"></div>
                <div className="border-t border-neutral-700 pt-1 font-bold text-neutral-900 uppercase">
                  Authorized Client Representative
                </div>
                <div className="text-[10px] text-neutral-500">Conforme / Received by</div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Payment Reconciliation Modal */}
      {isReconciliationOpen && (
        <PaymentReconciliationModal
          invoice={invoice}
          isOpen={isReconciliationOpen}
          onClose={() => setIsReconciliationOpen(false)}
        />
      )}

      {/* Invoice Retraction / Correction Request Modal */}
      {isRetractionOpen && (
        <InvoiceRetractionModal
          invoice={invoice}
          isOpen={isRetractionOpen}
          onClose={() => setIsRetractionOpen(false)}
        />
      )}
    </>
  );
};
