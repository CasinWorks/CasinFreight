import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  CheckCircle2, 
  Receipt, 
  Building2, 
  Calendar, 
  FileText, 
  UploadCloud, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles,
  ExternalLink,
  Coins,
  CreditCard,
  FileCheck2,
  Paperclip,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';
import { closeIfBackdrop } from '../../lib/modal';
import { Invoice, PaymentMethodType, ProofOfPayment } from '../../types';

interface PaymentReconciliationModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentReconciliationModal: React.FC<PaymentReconciliationModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { clients, trips, reconcileAndLockInvoice, currentUser, company, uploadWorkspaceFile } = useFreight();

  const client = clients.find(c => c.id === invoice.clientId);
  const trip = trips.find(t => t.id === invoice.tripId);

  // EWT Calculation (2% of Subtotal)
  const defaultEwt = invoice.withholdingTaxAmountPhp || (invoice.subtotalPhp * 0.02);
  const netOfEwtTotal = Math.max(0, invoice.grandTotalPhp - defaultEwt);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Bank Transfer (BDO)');
  const [paymentReference, setPaymentReference] = useState<string>(
    `BDO-FT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hasEwtDeduction, setHasEwtDeduction] = useState<boolean>(true);
  const [amountPaid, setAmountPaid] = useState<number>(netOfEwtTotal);
  const [officialReceiptNo, setOfficialReceiptNo] = useState<string>(
    `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [bankAccountUsed, setBankAccountUsed] = useState<string>('BDO Corporate #0014-9982-1092');
  const [reconciliationNotes, setReconciliationNotes] = useState<string>(
    'Payment reconciled against bank daily statement. 2% BIR 2307 Creditable Withholding Tax certificate validated.'
  );
  const [attachedFileUrl, setAttachedFileUrl] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [isUploadingPop, setIsUploadingPop] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleApplyExactDue = () => {
    setAmountPaid(invoice.grandTotalPhp);
    setHasEwtDeduction(false);
  };

  const handleApplyNetEwt = () => {
    setAmountPaid(netOfEwtTotal);
    setHasEwtDeduction(true);
  };

  const handleUploadPop = async (file: File) => {
    setErrorMsg('');
    setIsUploadingPop(true);
    try {
      const uploaded = await uploadWorkspaceFile(`payments/${invoice.id}`, file);
      setAttachedFileUrl(uploaded.url);
      setAttachedFileName(uploaded.name);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not upload the proof of payment.');
    } finally {
      setIsUploadingPop(false);
    }
  };

  const handleSubmitReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentReference.trim()) {
      setErrorMsg('Please provide a valid Bank Reference, Deposit Slip #, or Check #.');
      return;
    }
    if (amountPaid <= 0) {
      setErrorMsg('Payment amount must be greater than ₱0.');
      return;
    }

    const popRecord: ProofOfPayment = {
      paymentReference: paymentReference.trim(),
      paymentMethod,
      paymentDate,
      amountPaidPhp: Number(amountPaid),
      ewtDeductedPhp: hasEwtDeduction ? defaultEwt : 0,
      officialReceiptNo: officialReceiptNo.trim() || undefined,
      popFileUrl: attachedFileUrl || undefined,
      popFileName: attachedFileName || undefined,
      verifiedBy: `${currentUser.name} (${currentUser.role})`,
      verifiedAt: new Date().toISOString(),
      bankAccountUsed,
      reconciliationNotes: reconciliationNotes.trim() || undefined,
    };

    reconcileAndLockInvoice(invoice.id, popRecord);
    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.6 }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto" onClick={closeIfBackdrop(onClose)}>
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        
        {/* Modal Header */}
        <div className="p-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
              <Lock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Payment Reconciliation & Invoice Locking
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Attach Proof of Payment (POP) and seal this receivable record to prevent unauthorized line-item edits.
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmitReconciliation} className="overflow-y-auto p-4 md:p-6 space-y-5">
          
          {/* Invoice Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Client / Billed Entity:</span>{' '}
                <strong className="text-slate-900">{client?.name}</strong>
              </div>
              <div className="font-mono text-slate-600 text-[11px]">
                Due: {invoice.dueDate}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Subtotal (Net VAT)</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">₱{invoice.subtotalPhp.toLocaleString()}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">12% VAT</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">₱{invoice.vatAmountPhp.toLocaleString()}</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Gross Total Due</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">₱{invoice.grandTotalPhp.toLocaleString()}</div>
              </div>
              <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                <div className="text-[10px] text-emerald-800 uppercase font-bold">Net (Less 2% EWT)</div>
                <div className="font-mono font-black text-emerald-900 mt-0.5">₱{netOfEwtTotal.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields: Payment Mode & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Payment Channel / Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              >
                <option value="Bank Transfer (BDO)">Bank Transfer (BDO Unibank)</option>
                <option value="Bank Transfer (BPI)">Bank Transfer (BPI Corporate)</option>
                <option value="PDC Check">Post-Dated Check (PDC)</option>
                <option value="GCash Biz">GCash for Business / QR Ph</option>
                <option value="Online Banking">Direct Online Banking Wire / InstaPay</option>
                <option value="BIR 2307 Withholding + Balance">BIR 2307 Withholding + Balance</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Bank Transfer / Deposit Slip / Check Ref # *
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => {
                  setPaymentReference(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="e.g. BDO-FT-2026-948102"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Amount Paid & 2% EWT Deduction Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                Actual Amount Received (₱) *
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleApplyNetEwt}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    hasEwtDeduction 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Net of 2% EWT (₱{netOfEwtTotal.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={handleApplyExactDue}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    !hasEwtDeduction 
                      ? 'bg-blue-50 text-blue-800 border-blue-300 font-bold' 
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Full Invoice (₱{invoice.grandTotalPhp.toLocaleString()})
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xs">₱</span>
              <input
                type="number"
                step="any"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEwtDeduction}
                onChange={(e) => {
                  setHasEwtDeduction(e.target.checked);
                  if (e.target.checked) {
                    setAmountPaid(netOfEwtTotal);
                  } else {
                    setAmountPaid(invoice.grandTotalPhp);
                  }
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span>
                Client provided BIR Form 2307 (2% Creditable Withholding Tax Certificate for <strong>₱{defaultEwt.toLocaleString()}</strong>)
              </span>
            </label>
          </div>

          {/* Dates & Official Receipt # */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Payment Clearing Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Client / bank reference (OR # if they issued one)
              </label>
              <input
                type="text"
                value={officialReceiptNo}
                onChange={(e) => setOfficialReceiptNo(e.target.value)}
                placeholder="e.g. OR-2026-8910"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Proof of Payment (POP) Attachment Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                <span>Proof of Payment (POP) Document Attachment</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Deposit Slip / Bank Receipt / BIR 2307</span>
            </div>

            {attachedFileUrl ? (
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg bg-white border border-emerald-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                    {attachedFileUrl.match(/\.pdf($|\?)/i) || attachedFileName.toLowerCase().endsWith('.pdf') ? (
                      <FileText className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <img src={attachedFileUrl} alt="POP Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{attachedFileName}</div>
                    <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Ready for permanent attachment</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFileUrl('');
                      setAttachedFileName('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center space-y-2 bg-slate-50 block cursor-pointer hover:border-emerald-400">
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  {isUploadingPop ? 'Uploading proof of payment…' : 'Upload deposit slip, remittance advice, or BIR 2307'}
                </div>
                <div className="text-[10px] text-slate-500">JPG, PNG, WebP, or PDF up to 8 MB</div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  disabled={isUploadingPop}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void handleUploadPop(file);
                  }}
                />
              </label>
            )}
          </div>

          {/* Reconciliation Audit Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Internal Reconciliation & Audit Notes
            </label>
            <textarea
              rows={2}
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              placeholder="e.g. Cleared via BDO corporate account ending in 1092. Client remittance confirmed."
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Security & Immutability Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Audit Notice:</strong> Submitting this reconciliation will mark the invoice as <strong>Paid</strong> and <strong>Lock</strong> the invoice line items from accidental modifications. Only an authorized Administrator can unlock it.
            </div>
          </div>

          {/* Modal Actions */}
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Verify POP & Lock Invoice (Paid)</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
