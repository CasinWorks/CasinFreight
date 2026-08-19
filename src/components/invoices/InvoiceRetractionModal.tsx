import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  User, 
  Clock, 
  RotateCcw, 
  Ban, 
  Lock, 
  Unlock,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';
import { Invoice, RetractionReasonCategory } from '../../types';

interface InvoiceRetractionModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

const REASON_CATEGORIES: RetractionReasonCategory[] = [
  'Rate Calculation / Line Item Error',
  'Incorrect Billing Client Entity',
  'Duplicate Invoice Issued',
  'Accessorial / Demurrage Surcharge Dispute',
  'Waybill / Cargo Detail Correction',
  'Other Administrative Error'
];

export const InvoiceRetractionModal: React.FC<InvoiceRetractionModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { 
    currentUser, 
    requestInvoiceRetraction, 
    approveInvoiceRetraction, 
    rejectInvoiceRetraction, 
    clients, 
    trips 
  } = useFreight();

  const isOwner = currentUser.role === 'Owner';
  const activeReq = invoice.activeRetractionRequest;

  // State for Operator request submission
  const [reasonCategory, setReasonCategory] = useState<RetractionReasonCategory>('Rate Calculation / Line Item Error');
  const [detailedReason, setDetailedReason] = useState<string>('');
  const [operatorError, setOperatorError] = useState<string>('');

  // State for Owner executive review
  const [ownerNote, setOwnerNote] = useState<string>('');
  const [ownerAction, setOwnerAction] = useState<'revert_to_draft' | 'void_invoice'>('revert_to_draft');

  if (!isOpen) return null;

  const client = clients.find(c => c.id === invoice.clientId);
  const trip = trips.find(t => t.id === invoice.tripId);

  const handleOperatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedReason.trim() || detailedReason.trim().length < 10) {
      setOperatorError('Please provide a specific written reason explaining why this invoice was mistakenly issued (min. 10 characters).');
      return;
    }

    requestInvoiceRetraction(invoice.id, reasonCategory, detailedReason.trim());
    onClose();
  };

  const handleOwnerApprove = () => {
    const finalNote = ownerNote.trim() || `Approved by Owner ${currentUser.name}. ${ownerAction === 'revert_to_draft' ? 'Reverted to Draft for correction.' : 'Marked as VOID.'}`;
    approveInvoiceRetraction(invoice.id, finalNote, ownerAction);
    confetti({
      particleCount: 80,
      spread: 65,
      origin: { y: 0.6 }
    });
    onClose();
  };

  const handleOwnerReject = () => {
    if (!ownerNote.trim()) {
      alert('Please enter an executive note explaining why the retraction was rejected.');
      return;
    }
    rejectInvoiceRetraction(invoice.id, ownerNote.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Modal Header */}
        <div className="p-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {activeReq ? 'Invoice Retraction Review (Owner Clearance)' : 'Request Invoice Retraction / Correction'}
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Enterprise Dual-Control Financial Workflow & BIR Audit Trail Compliance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-4 md:p-6 space-y-5">
          
          {/* Invoice Summary Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-500">Shipper / Client:</span>{' '}
                <strong className="text-slate-900">{client?.name}</strong>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                invoice.status === 'Retraction_Pending' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                invoice.status === 'Sent' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                invoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                Status: {invoice.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <span className="text-slate-500">Grand Total:</span>{' '}
                <strong className="font-mono text-slate-900">₱{invoice.grandTotalPhp.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-500">Waybill Ref:</span>{' '}
                <span className="font-mono font-medium text-slate-700">{trip?.waybillNumber || 'WB-N/A'}</span>
              </div>
            </div>
          </div>

          {/* VIEW 1: Active Retraction Request Exists (Review Mode) */}
          {activeReq ? (
            <div className="space-y-4">
              {/* Operator's Written Request Details */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-amber-950 text-xs">
                      Operator Correction Request Pending Clearance
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-800">
                    {new Date(activeReq.requestedAt).toLocaleString()}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <div>
                      Submitted by: <strong>{activeReq.requestedBy}</strong> ({activeReq.requestedByRole})
                    </div>
                    <div className="text-amber-800 font-semibold">
                      Category: {activeReq.reasonCategory}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-slate-800">
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Written Justification:</div>
                    <p className="italic bg-slate-50 p-2 rounded border border-slate-200">
                      "{activeReq.detailedReason}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Action Panel vs Non-Owner Notice */}
              {isOwner ? (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    <span>Owner Executive Decision:</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Clearance Resolution Action:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setOwnerAction('revert_to_draft')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          ownerAction === 'revert_to_draft'
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <RotateCcw className="w-4 h-4 text-blue-600" />
                          <span>Revert to Draft</span>
                        </div>
                        <p className="text-[10px] font-normal text-slate-500">
                          Unlocks invoice line items so billing operator can edit rates & accessorials.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOwnerAction('void_invoice')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          ownerAction === 'void_invoice'
                            ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Ban className="w-4 h-4 text-rose-600" />
                          <span>Void Permanently</span>
                        </div>
                        <p className="text-[10px] font-normal text-slate-500">
                          Cancels invoice permanently with BIR Credit Note record.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Owner Review / Approval Note:
                    </label>
                    <textarea
                      rows={2}
                      value={ownerNote}
                      onChange={(e) => setOwnerNote(e.target.value)}
                      placeholder="e.g. Approved. Please correct demurrage rate and re-transmit to client accounting."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleOwnerReject}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors border border-rose-200 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Reject Retraction</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOwnerApprove}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & {ownerAction === 'revert_to_draft' ? 'Unlock to Draft' : 'Void Invoice'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-slate-900">
                    <Lock className="w-4 h-4 text-slate-600" />
                    <span>Awaiting Executive Decision by Owner (TJ Casin)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    You have submitted this retraction request. To preserve financial audit integrity, only the <strong>Owner (Tusherd "TJ" Casin)</strong> can accept or reject this request. Switch to the Owner role in the top user profile switcher to test the approval flow.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Operator Submitting a New Retraction Request */
            <form onSubmit={handleOperatorSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Strict Invoicing Rule:</strong> Once an invoice is issued or dispatched, operators cannot directly alter or delete line items. You must submit a formal retraction request with a written reason for <strong>Owner approval</strong>.
                </div>
              </div>

              {operatorError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{operatorError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Correction Category *
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as RetractionReasonCategory)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  {REASON_CATEGORIES.map((cat, i) => (
                    <option key={i} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Operator Written Reason & Mistake Justification *
                </label>
                <textarea
                  rows={4}
                  value={detailedReason}
                  onChange={(e) => {
                    setDetailedReason(e.target.value);
                    if (operatorError) setOperatorError('');
                  }}
                  placeholder="Explain exactly why this invoice needs retraction (e.g. 'Dispatched with 12 demurrage hours instead of 2 hours approved on waybill #WB-982049. Client requested revised billing before payment.')..."
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs leading-relaxed"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Logged by: <strong>{currentUser.name}</strong> ({currentUser.role}) • Permanent audit log entry.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-95"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit Retraction Request to Owner</span>
                </button>
              </div>
            </form>
          )}

          {/* Audit History (if any previous retractions occurred) */}
          {invoice.retractionAuditHistory && invoice.retractionAuditHistory.length > 0 && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase">
                Prior Retraction Audit Log:
              </div>
              <div className="space-y-2">
                {invoice.retractionAuditHistory.map((hist, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className={hist.status === 'Approved' ? 'text-emerald-700' : 'text-rose-700'}>
                        {hist.status}: {hist.reasonCategory}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {hist.reviewedAt ? new Date(hist.reviewedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="text-slate-600 italic">"{hist.detailedReason}"</div>
                    {hist.ownerReviewNote && (
                      <div className="text-slate-800 font-medium">
                        Owner Decision: <span>{hist.ownerReviewNote}</span> ({hist.reviewedBy})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
