import React, { useState } from 'react';
import { 
  BookOpen, 
  Receipt, 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Building2, 
  Truck, 
  Users, 
  CreditCard, 
  Scale, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Lock,
  ChevronDown,
  Layers,
  DollarSign
} from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { JournalEntry, ChartOfAccount, AccountType } from '../../types';
import { NewJournalEntryModal } from './NewJournalEntryModal';
import { FeatureHowTo } from '../help/FeatureHowTo';

type LedgerSubTab = 
  | 'general_ledger' 
  | 'journal_entries' 
  | 'subsidiary_ar' 
  | 'subsidiary_fleet' 
  | 'income_statement'
  | 'trial_balance' 
  | 'chart_of_accounts';

export const FreightLedgerView: React.FC = () => {
  const { 
    chartOfAccounts, 
    journalEntries, 
    getAccountBalance, 
    getLedgerByAccount, 
    getTrialBalance,
    clients,
    trucks,
    company,
    currentUser,
    canAccess
  } = useFreight();

  const [activeSubTab, setActiveSubTab] = useState<LedgerSubTab>('general_ledger');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('1120'); // Default to Accounts Receivable
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [isNewEntryOpen, setIsNewEntryOpen] = useState<boolean>(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Financial Balances for quick KPIs
  const cashBalance = (getAccountBalance('1010').netBalance || 0) + (getAccountBalance('1020').netBalance || 0) + (getAccountBalance('1030').netBalance || 0);
  const arBalance = getAccountBalance('1120').netBalance || 0;
  const ewt2307Balance = getAccountBalance('1130').netBalance || 0;
  const outputVatBalance = getAccountBalance('2030').netBalance || 0;
  const freightRevenue = (getAccountBalance('4010').netBalance || 0) + (getAccountBalance('4020').netBalance || 0);
  const totalDirectCost = (getAccountBalance('5010').netBalance || 0) + (getAccountBalance('5020').netBalance || 0) + (getAccountBalance('5030').netBalance || 0) + (getAccountBalance('5040').netBalance || 0);

  const trialBalance = getTrialBalance();
  const selectedCoa = chartOfAccounts.find(c => c.code === selectedAccountCode);
  const selectedAccountLedger = getLedgerByAccount(selectedAccountCode);
  const selectedAccountBalance = getAccountBalance(selectedAccountCode);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div data-tutorial="ledger-page" className="flex-1 flex flex-col min-w-0 bg-slate-50 text-slate-900 overflow-y-auto">
      
      {/* Top Header Bar */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-4 border-b border-slate-200 bg-white print:border-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                General Ledger & Books of Accounts
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                Books of accounts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Internal double-entry books, chart of accounts, automated journal entries, client AR sub-ledgers, and trial balance.
            </p>
            <div className="mt-3 max-w-xl print:hidden">
              <FeatureHowTo feature="ledger" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <button
              onClick={() => setIsNewEntryOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Journal Voucher (JV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print books</span>
            </button>
          </div>
        </div>

        {/* Financial Health KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 print:hidden">
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Cash in Bank (1010/1020)</div>
            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">₱{cashBalance.toLocaleString()}</div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-blue-700 uppercase font-semibold">Trade AR (1120)</div>
            <div className="font-mono font-bold text-blue-900 text-xs mt-0.5">₱{arBalance.toLocaleString()}</div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-purple-700 uppercase font-semibold">2% BIR 2307 EWT (1130)</div>
            <div className="font-mono font-bold text-purple-900 text-xs mt-0.5">₱{ewt2307Balance.toLocaleString()}</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-amber-800 uppercase font-semibold">Output VAT 12% (2030)</div>
            <div className="font-mono font-bold text-amber-950 text-xs mt-0.5">₱{outputVatBalance.toLocaleString()}</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-emerald-700 uppercase font-semibold">Freight Revenue (4010)</div>
            <div className="font-mono font-bold text-emerald-900 text-xs mt-0.5">₱{freightRevenue.toLocaleString()}</div>
          </div>

          <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl shadow-2xs">
            <div className="text-[10px] text-rose-700 uppercase font-semibold">Direct Costs (5010-40)</div>
            <div className="font-mono font-bold text-rose-900 text-xs mt-0.5">₱{totalDirectCost.toLocaleString()}</div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 mt-5 border-b border-slate-200 overflow-x-auto pb-px text-xs print:hidden">
          {[
            { id: 'general_ledger', label: 'General Ledger (By Account)', icon: Layers },
            { id: 'journal_entries', label: 'General Journal (Vouchers)', icon: BookOpen },
            { id: 'subsidiary_ar', label: 'Accounts Receivable (AR Ledger)', icon: Building2 },
            { id: 'subsidiary_fleet', label: 'Truck Direct Cost Ledger', icon: Truck },
            { id: 'income_statement', label: 'Company P&L (OPEX, HR & Subscriptions)', icon: TrendingUp },
            { id: 'trial_balance', label: 'Trial Balance', icon: Scale },
            { id: 'chart_of_accounts', label: 'Chart of Accounts', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as LedgerSubTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 md:p-6 space-y-6">

        {/* ========================================================= */}
        {/* SUBTAB 1: GENERAL LEDGER (BY ACCOUNT)                     */}
        {/* ========================================================= */}
        {activeSubTab === 'general_ledger' && (
          <div className="space-y-4">
            
            {/* Account Selector & Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs print:hidden">
              <div className="flex items-center gap-3 flex-1">
                <label className="text-xs font-bold text-slate-600 uppercase shrink-0">
                  Select General Ledger Account:
                </label>
                <select
                  value={selectedAccountCode}
                  onChange={(e) => setSelectedAccountCode(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500 max-w-md w-full"
                >
                  {chartOfAccounts.map((coa) => (
                    <option key={coa.code} value={coa.code}>
                      [{coa.code}] {coa.name} ({coa.category} - Normal: {coa.normalBalance})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCoa && (
                <div className="flex items-center gap-4 text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500">Normal Balance: </span>
                    <strong className="text-slate-800">{selectedCoa.normalBalance}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Net Balance: </span>
                    <strong className="text-blue-700 font-bold text-sm">
                      ₱{selectedAccountBalance.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Printable Ledger Header */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Account Ledger: <span className="font-mono text-blue-600">{selectedAccountCode}</span> - {selectedCoa?.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCoa?.description}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500">Classification: </span>
                  <span className="font-bold text-slate-800">{selectedCoa?.category}</span>
                </div>
              </div>

              {/* Ledger Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-24">Date</th>
                      <th className="py-2.5 px-4 w-28">Voucher #</th>
                      <th className="py-2.5 px-4 w-32">Reference #</th>
                      <th className="py-2.5 px-4">Entity / Payee / Particulars</th>
                      <th className="py-2.5 px-4 text-right w-28">Debit (₱)</th>
                      <th className="py-2.5 px-4 text-right w-28">Credit (₱)</th>
                      <th className="py-2.5 px-4 text-right w-32 bg-slate-200/50">Running Balance (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedAccountLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          No transactions recorded yet for Account {selectedAccountCode}.
                        </td>
                      </tr>
                    ) : (
                      selectedAccountLedger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600">{row.date}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">{row.entryNumber}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{row.referenceNumber}</td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">
                              {row.entityName || '—'}
                              {row.truckPlate && (
                                <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                  {row.truckPlate}
                                </span>
                              )}
                            </div>
                            {row.memo && <div className="text-[11px] text-slate-500">{row.memo}</div>}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {row.debitPhp > 0 ? `₱${row.debitPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            {row.creditPhp > 0 ? `₱${row.creditPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                            ₱{row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono font-bold text-xs">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right uppercase text-slate-700 font-sans text-[11px]">
                        Account Total Summary:
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        ₱{selectedAccountBalance.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        ₱{selectedAccountBalance.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-blue-700 bg-slate-200/60">
                        ₱{selectedAccountBalance.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 2: GENERAL JOURNAL (CHRONOLOGICAL VOUCHERS)        */}
        {/* ========================================================= */}
        {activeSubTab === 'journal_entries' && (
          <div className="space-y-4">
            
            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs print:hidden">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search journal voucher #, memo, client, plate #..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                {(['ALL', 'Invoice_Issued', 'Payment_Received', 'Fuel_Disbursement', 'Driver_Payout', 'Manual_Adjustment'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      selectedTypeFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Vouchers List */}
            <div className="space-y-3">
              {journalEntries
                .filter(jv => {
                  const q = searchQuery.toLowerCase();
                  const matchesSearch = !q || (
                    jv.entryNumber.toLowerCase().includes(q) ||
                    jv.referenceNumber.toLowerCase().includes(q) ||
                    (jv.entityName && jv.entityName.toLowerCase().includes(q)) ||
                    (jv.notes && jv.notes.toLowerCase().includes(q)) ||
                    jv.lines.some(l => l.memo?.toLowerCase().includes(q) || l.accountName.toLowerCase().includes(q))
                  );
                  const matchesType = selectedTypeFilter === 'ALL' || jv.referenceType === selectedTypeFilter;
                  return matchesSearch && matchesType;
                })
                .map((jv) => (
                  <div 
                    key={jv.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                  >
                    {/* Voucher Header Banner */}
                    <div 
                      onClick={() => setExpandedEntryId(expandedEntryId === jv.id ? null : jv.id)}
                      className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-mono font-bold text-xs">
                          JV
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs">{jv.entryNumber}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-200/70 text-slate-700 border border-slate-300">
                              {jv.referenceType.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">Ref: {jv.referenceNumber}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Entity: <strong className="text-slate-800">{jv.entityName || 'General Freight Transaction'}</strong> • Date: <span className="font-mono">{jv.date}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right font-mono">
                          <div className="text-[10px] text-slate-400 uppercase">Voucher Total</div>
                          <div className="text-xs font-bold text-slate-900">
                            ₱{jv.totalDebitPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedEntryId === jv.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Voucher Details & Debits/Credits Table */}
                    <div className="p-4 space-y-3 text-xs">
                      {jv.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 italic">
                          "{jv.notes}"
                        </p>
                      )}

                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Account Code & Title</th>
                            <th className="py-2 px-3">Particulars / Sub-ledger Reference</th>
                            <th className="py-2 px-3 text-right w-28">Debit (₱)</th>
                            <th className="py-2 px-3 text-right w-28">Credit (₱)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {jv.lines.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-slate-900">{l.accountCode}</span>
                                <span className="text-slate-600 ml-2">{l.accountName}</span>
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {l.memo || '—'}
                                {l.truckPlate && (
                                  <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                    Truck: {l.truckPlate}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                {l.debitPhp > 0 ? `₱${l.debitPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                                {l.creditPhp > 0 ? `₱${l.creditPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-mono font-bold text-xs">
                          <tr>
                            <td colSpan={2} className="py-2 px-3 text-right uppercase text-[10px] text-slate-500 font-sans">
                              Balanced Verification:
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900">
                              ₱{jv.totalDebitPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900">
                              ₱{jv.totalCreditPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <div>Posted By: <strong>{jv.postedBy}</strong></div>
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Lock className="w-3 h-3 text-emerald-600" />
                          <span>General Ledger Sealed Record</span>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 3: SUBSIDIARY AR LEDGER (CLIENT AGING & BREAKDOWN) */}
        {/* ========================================================= */}
        {activeSubTab === 'subsidiary_ar' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Accounts Receivable Subsidiary Ledger (Trade Clients)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Sub-ledger reconciliation per corporate client entity: Total Billed vs Cash Collected vs 2% BIR 2307 Withheld vs Net Outstanding.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Client / Consignee Entity</th>
                      <th className="py-2.5 px-4">TIN & Terms</th>
                      <th className="py-2.5 px-4 text-right">Gross Invoiced (₱)</th>
                      <th className="py-2.5 px-4 text-right">Cash Remitted (₱)</th>
                      <th className="py-2.5 px-4 text-right">BIR 2307 EWT (₱)</th>
                      <th className="py-2.5 px-4 text-right bg-blue-50/60">Outstanding AR (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clients.map((c) => {
                      let billed = 0;
                      let collected = 0;
                      let ewt = 0;

                      journalEntries.forEach(jv => {
                        jv.lines.forEach(l => {
                          if (l.clientName === c.name || jv.entityName === c.name) {
                            if (l.accountCode === '1120') {
                              billed += l.debitPhp;
                              collected += l.creditPhp;
                            }
                            if (l.accountCode === '1130') {
                              ewt += l.debitPhp;
                            }
                          }
                        });
                      });

                      const outstanding = Math.max(0, billed - collected);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.name}
                            <div className="text-[11px] font-normal text-slate-500">{c.billingAddress}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            <div>{c.tin || 'N/A'}</div>
                            <div className="text-[10px] text-slate-400">{c.paymentTermsDays || 30} Days Term</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            ₱{billed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                            ₱{collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-purple-700">
                            ₱{ewt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 bg-blue-50/40">
                            ₱{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 4: TRUCK DIRECT OPERATING COST LEDGER              */}
        {/* ========================================================= */}
        {activeSubTab === 'subsidiary_fleet' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Truck Direct Operating Cost (Expense) Ledger
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Sub-ledger cost allocation per vehicle plate: Direct Diesel Fuel (`5010`), Tolls & RFID (`5020`), Driver Wages (`5030`), and PMS Maintenance (`5040`).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Plate Number & Model</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Fuel Expense (₱)</th>
                      <th className="py-2.5 px-4 text-right">Driver Wages (₱)</th>
                      <th className="py-2.5 px-4 text-right">Maintenance (₱)</th>
                      <th className="py-2.5 px-4 text-right bg-rose-50/60">Total Direct Cost (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trucks.map((t) => {
                      let fuel = 0;
                      let wages = 0;
                      let maint = 0;

                      journalEntries.forEach(jv => {
                        jv.lines.forEach(l => {
                          if (l.truckPlate === t.plateNumber || (jv.notes && jv.notes.includes(t.plateNumber))) {
                            if (l.accountCode === '5010') fuel += l.debitPhp;
                            if (l.accountCode === '5030') wages += l.debitPhp;
                            if (l.accountCode === '5040') maint += l.debitPhp;
                          }
                        });
                      });

                      const total = fuel + wages + maint;

                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {t.plateNumber}
                            <div className="text-[11px] font-normal text-slate-500 font-sans">{t.brandModel}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{t.type}</td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            ₱{fuel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            ₱{wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                            ₱{maint.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-900 bg-rose-50/40">
                            ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB: COMPANY P&L (DIRECT VS OVERHEAD & HR)            */}
        {/* ========================================================= */}
        {activeSubTab === 'income_statement' && (
          <div className="space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-2xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 mb-5 gap-2">
                <div>
                  <h3 className="font-black text-slate-950 text-base uppercase">
                    {company.name}
                  </h3>
                  <div className="font-bold text-slate-800 text-sm">
                    ENTERPRISE INCOME STATEMENT & P&L (PHILIPPINE PESO)
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    For the Period Ended August 31, 2026 • Full Operational & Administrative Expense Breakdown
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold">
                    Internal general ledger
                  </span>
                </div>
              </div>

              {/* P&L Statement Grid */}
              <div className="space-y-6 text-xs font-sans">
                
                {/* 1. Operating Revenue */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 border-b pb-1 text-sm">
                    <span className="uppercase tracking-wider">I. Gross Freight & Accessorial Revenues</span>
                    <span className="font-mono text-emerald-800">₱{freightRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pl-4 space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>4010 - Primary Linehaul Freight Hauling:</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('4010').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>4020 - Demurrage, FAF Fuel Surcharges & Toll Recoveries:</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('4020').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Hauling Costs (COGS) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 border-b pb-1 text-sm">
                    <span className="uppercase tracking-wider text-rose-800">II. Less: Direct Hauling Costs (Trip Level / COGS)</span>
                    <span className="font-mono text-rose-800">(₱{totalDirectCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                  </div>
                  <div className="pl-4 space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>5010 - Direct Diesel Fuel & Lubricants:</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('5010').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5020 - Expressway Tollways & RFID Pass-throughs:</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('5020').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5030 - Driver Trip Wages & Per Diem Allowances:</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('5030').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5040 - Preventive Truck Maintenance & Tires (PMS):</span>
                      <span className="font-mono text-slate-900 font-semibold">₱{(getAccountBalance('5040').netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Gross Margin Summary */}
                {(() => {
                  const grossProfit = freightRevenue - totalDirectCost;
                  const grossMargin = freightRevenue > 0 ? ((grossProfit / freightRevenue) * 100).toFixed(1) : '0.0';
                  
                  const opexSubscriptions = getAccountBalance('6010').netBalance || 0;
                  const opexSalaries = getAccountBalance('6020').netBalance || 0;
                  const opexStatutory = getAccountBalance('6030').netBalance || 0;
                  const opexDepreciation = getAccountBalance('6040').netBalance || 0;
                  const opexLicensing = getAccountBalance('6050').netBalance || 0;
                  const opexYard = getAccountBalance('6060').netBalance || 0;

                  const totalOpex = opexSubscriptions + opexSalaries + opexStatutory + opexDepreciation + opexLicensing + opexYard;
                  const netOperatingProfit = grossProfit - totalOpex;
                  const netMargin = freightRevenue > 0 ? ((netOperatingProfit / freightRevenue) * 100).toFixed(1) : '0.0';

                  return (
                    <>
                      <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-between font-mono font-bold text-xs">
                        <span className="font-sans uppercase text-slate-800">GROSS FREIGHT OPERATING MARGIN:</span>
                        <div className="text-right">
                          <span className="text-slate-950 font-black mr-2">₱{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-emerald-700 font-bold font-sans">({grossMargin}%)</span>
                        </div>
                      </div>

                      {/* 3. Operating Overhead, Subscriptions, HR & Depreciation (OPEX) */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between font-bold text-slate-900 border-b pb-1 text-sm">
                          <span className="uppercase tracking-wider text-purple-900">III. Less: Operating Overhead, HR & Subscriptions (OPEX)</span>
                          <span className="font-mono text-purple-900">(₱{totalOpex.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                        </div>
                        <div className="pl-4 space-y-1.5 text-slate-600">
                          <div className="flex justify-between">
                            <span>6010 - Fleet GPS Telematics, Starlink & Cloud Subscriptions:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexSubscriptions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6020 - Control Room Dispatch, Billing & Admin Staff Base Salaries:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexSalaries.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6030 - Government SSS, PhilHealth & Pag-IBIG HDMF Employer Share:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexStatutory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6040 - Commercial Fleet & Machinery Straight-Line Depreciation:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6050 - LTO MVUC Registration, Smoke Emission & LTFRB CPC Franchise:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexLicensing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>6060 - Truck Terminal Staging Yard Rental & Yard Utilities:</span>
                            <span className="font-mono text-slate-900 font-semibold">₱{opexYard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Final Net Operating Income Banner */}
                      <div className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                        netOperatingProfit >= 0 
                          ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950' 
                          : 'bg-rose-50/80 border-rose-500 text-rose-950'
                      }`}>
                        <div>
                          <div className="font-black text-sm uppercase">
                            NET OPERATING PROFIT (BOTTOM LINE):
                          </div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Comprehensive earnings after Direct Trip Hauling Costs and Administrative Enterprise Overhead
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-black text-lg">
                            ₱{netOperatingProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs font-bold font-sans">
                            Net Margin: {netMargin}%
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 5: TRIAL BALANCE (TB)                              */}
        {/* ========================================================= */}
        {activeSubTab === 'trial_balance' && (
          <div className="space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-xl border border-slate-200 shadow-2xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-900 pb-4 mb-4 gap-2">
                <div>
                  <h3 className="font-black text-slate-950 text-base uppercase">
                    {company.name}
                  </h3>
                  <div className="font-bold text-slate-800 text-sm">
                    GENERAL TRIAL BALANCE SUMMARY
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    As of Period Ending August 31, 2026 • Currency: Philippine Peso (PHP)
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                    trialBalance.isBalanced 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {trialBalance.isBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                    <span>{trialBalance.isBalanced ? 'TRIAL BALANCE IN BALANCE' : 'OUT OF BALANCE'}</span>
                  </div>
                </div>
              </div>

              {/* Trial Balance Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] border-b-2 border-slate-900">
                    <tr>
                      <th className="py-2.5 px-4 w-24">Account Code</th>
                      <th className="py-2.5 px-4">Account Title / Description</th>
                      <th className="py-2.5 px-4 w-44">Classification</th>
                      <th className="py-2.5 px-4 text-right w-36">Debit Balance (₱)</th>
                      <th className="py-2.5 px-4 text-right w-36">Credit Balance (₱)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trialBalance.accounts.map((acct) => (
                      <tr key={acct.code} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acct.code}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{acct.name}</td>
                        <td className="py-2.5 px-4 text-slate-500">{acct.category}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {acct.debitPhp > 0 ? `₱${acct.debitPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                          {acct.creditPhp > 0 ? `₱${acct.creditPhp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-b-2 border-slate-900 font-mono font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right uppercase text-slate-900 font-sans font-black text-xs">
                        TOTAL TRIAL BALANCE VERIFICATION:
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                        ₱{trialBalance.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                        ₱{trialBalance.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SUBTAB 6: CHART OF ACCOUNTS (COA REFERENCE)               */}
        {/* ========================================================= */}
        {activeSubTab === 'chart_of_accounts' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Standard Philippine Freight Logistics Chart of Accounts (COA)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Chart of accounts for Philippine freight (not a BIR-filed report).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-20">Code</th>
                      <th className="py-2.5 px-4">Account Title</th>
                      <th className="py-2.5 px-4 w-28">Type</th>
                      <th className="py-2.5 px-4 w-44">Category</th>
                      <th className="py-2.5 px-4 w-28">Normal Balance</th>
                      <th className="py-2.5 px-4">Functional Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chartOfAccounts.map((coa) => (
                      <tr key={coa.code} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">{coa.code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{coa.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            coa.type === 'Asset' ? 'bg-blue-100 text-blue-800' :
                            coa.type === 'Liability' ? 'bg-amber-100 text-amber-800' :
                            coa.type === 'Equity' ? 'bg-purple-100 text-purple-800' :
                            coa.type === 'Revenue' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {coa.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{coa.category}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{coa.normalBalance}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{coa.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* New Manual Journal Entry Modal */}
      {isNewEntryOpen && (
        <NewJournalEntryModal
          isOpen={isNewEntryOpen}
          onClose={() => setIsNewEntryOpen(false)}
        />
      )}

    </div>
  );
};
