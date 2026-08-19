import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  FileText,
  Building2,
  Truck,
  Calendar,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFreight } from '../../context/FreightContext';

interface NewJournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraftLine {
  id: string;
  accountCode: string;
  debitPhp: number | '';
  creditPhp: number | '';
  memo: string;
  truckPlate: string;
  clientName: string;
}

export const NewJournalEntryModal: React.FC<NewJournalEntryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { chartOfAccounts, addManualJournalEntry, clients, trucks, currentUser } = useFreight();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [entityName, setEntityName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [lines, setLines] = useState<DraftLine[]>([
    {
      id: 'line-1',
      accountCode: '5040', // Fleet Maintenance
      debitPhp: 5000,
      creditPhp: '',
      memo: 'Preventive PMS / Brake pad replacement',
      truckPlate: trucks[0]?.plateNumber || '',
      clientName: '',
    },
    {
      id: 'line-2',
      accountCode: '1010', // BDO Bank
      debitPhp: '',
      creditPhp: 5000,
      memo: 'Settled via BDO corporate checking wire',
      truckPlate: '',
      clientName: '',
    }
  ]);

  if (!isOpen) return null;

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debitPhp) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.creditPhp) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const difference = Math.abs(totalDebit - totalCredit);

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: `line-${Date.now()}`,
        accountCode: '5010',
        debitPhp: '',
        creditPhp: '',
        memo: '',
        truckPlate: '',
        clientName: '',
      }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: string, field: keyof DraftLine, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value };
      }
      return l;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    addManualJournalEntry({
      date,
      referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      entityName: entityName || undefined,
      notes: notes || undefined,
      lines: lines.map(l => ({
        accountCode: l.accountCode,
        debitPhp: Number(l.debitPhp) || 0,
        creditPhp: Number(l.creditPhp) || 0,
        memo: l.memo || undefined,
        truckPlate: l.truckPlate || undefined,
        clientName: l.clientName || undefined,
      })),
    });

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Post Manual Journal Voucher (JV)</h2>
              <p className="text-[11px] text-slate-300">
                Official double-entry adjustment voucher for General Ledger books of accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Header Meta Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Posting Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Reference / OR / Voucher #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. PMS-INV-9921 / OR-0491"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Payee / Entity / Vendor
              </label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g. Shell / Isuzu Service / BDO"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Double-Entry Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Double-Entry Debits & Credits Breakdown
              </span>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Entry Row</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Account Code & Name</th>
                    <th className="py-2.5 px-3">Particulars / Memo</th>
                    <th className="py-2.5 px-3 w-28 text-right">Debit (₱)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Credit (₱)</th>
                    <th className="py-2.5 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleUpdateLine(line.id, 'accountCode', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                        >
                          {chartOfAccounts.map(coa => (
                            <option key={coa.code} value={coa.code}>
                              {coa.code} - {coa.name} ({coa.normalBalance})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={line.memo}
                          onChange={(e) => handleUpdateLine(line.id, 'memo', e.target.value)}
                          placeholder="Particulars description..."
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debitPhp}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            handleUpdateLine(line.id, 'debitPhp', val);
                            if (val !== '' && val > 0) {
                              handleUpdateLine(line.id, 'creditPhp', '');
                            }
                          }}
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-right font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.creditPhp}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            handleUpdateLine(line.id, 'creditPhp', val);
                            if (val !== '' && val > 0) {
                              handleUpdateLine(line.id, 'debitPhp', '');
                            }
                          }}
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-right font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      <td className="py-2 px-2 text-center">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(line.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono font-bold">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-700 font-sans">
                      Total Balanced Verification:
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-black">
                      ₱{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-black">
                      ₱{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Balance Status Indicator */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            isBalanced 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold text-xs">
                {isBalanced 
                  ? 'Double-entry books are balanced and ready to post into the General Ledger.' 
                  : `Out of balance by ₱${difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Debits must exactly match Credits.`}
              </span>
            </div>

            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border">
              {isBalanced ? 'BALANCED' : 'UNBALANCED'}
            </span>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Internal Audit Voucher Notes & Justification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Authorized preventive maintenance expense for Truck NAK-8821 per fleet checklist..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Posting Officer: <strong>{currentUser.name} ({currentUser.role})</strong>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isBalanced}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
              >
                Post Journal Voucher
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
