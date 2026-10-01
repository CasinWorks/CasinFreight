import React from 'react';
import { Printer, X } from 'lucide-react';
import { useFreight } from '../../context/FreightContext';
import { formatPhp, statementMonthLabel } from '../../lib/statementOfAccount';
import { printIsolatedElement } from '../../lib/printDocument';
import { closeIfBackdrop } from '../../lib/modal';
import { CasinFreightLogo } from '../brand/CasinFreightLogo';
import { InvoiceNotOfficialNotice } from './InvoiceNotOfficialNotice';
import type { StatementOfAccount } from '../../types';

interface StatementPreviewModalProps {
  statement: StatementOfAccount;
  onClose: () => void;
  onOpenInvoice: (invoiceId: string) => void;
  onOpenTrip: (tripId: string) => void;
  onRemove: (id: string) => void;
}

export const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({
  statement,
  onClose,
  onOpenInvoice,
  onOpenTrip,
  onRemove,
}) => {
  const { company, clients } = useFreight();
  const client = clients.find((item) => item.id === statement.clientId);
  const printRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white"
      onClick={closeIfBackdrop(onClose)}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <div className="font-bold text-slate-900">{statement.statementNumber}</div>
            <div className="text-[11px] text-slate-500">Statement of account · {statementMonthLabel(statement.period)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (printRef.current) printIsolatedElement(printRef.current);
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={() => onRemove(statement.id)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200"
            >
              Remove
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={printRef} className="print-document overflow-y-auto p-6 md:p-8 flex-1 bg-white text-neutral-900 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-neutral-900 pb-4 gap-4 print:flex-row">
            <div>
              <div className="flex items-center gap-2">
                <CasinFreightLogo className="h-8 w-8 rounded" />
                <h1 className="text-xl font-black tracking-tight text-neutral-950 uppercase">{company.name}</h1>
              </div>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm">{company.address}</p>
              <div className="text-xs text-neutral-600 font-mono mt-1">TIN: {company.tin || '—'}</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl font-black text-neutral-900 tracking-tight uppercase print:text-lg">Statement of account</div>
              <div className="text-xs font-mono font-bold text-neutral-700 mt-1">
                No: <span className="text-neutral-950 font-black">{statement.statementNumber}</span>
              </div>
              <div className="text-xs text-neutral-600 mt-1">
                <div>Month: <strong>{statementMonthLabel(statement.period)}</strong></div>
                <div>Issued: <strong>{statement.issueDate}</strong></div>
              </div>
            </div>
          </div>

          <InvoiceNotOfficialNotice variant="print" />

          <div className="my-4 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="text-[10px] uppercase font-semibold text-neutral-500">Bill to</div>
            <div className="font-bold text-neutral-950 mt-0.5">{client?.name || 'Shipper'}</div>
            <div className="text-neutral-600">{client?.billingAddress}</div>
            {client?.tin ? <div className="font-mono text-neutral-600">TIN: {client.tin}</div> : null}
          </div>

          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Waybill</th>
                <th className="py-2 px-2">Route</th>
                <th className="py-2 px-2">Freight bill</th>
                <th className="py-2 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {statement.lines.map((line) => (
                <tr key={line.tripId}>
                  <td className="py-2 px-2 font-mono">{line.serviceDate || '—'}</td>
                  <td className="py-2 px-2">
                    <button type="button" onClick={() => onOpenTrip(line.tripId)} className="font-mono font-bold text-blue-700 hover:underline print:text-neutral-950 print:no-underline">
                      {line.waybillNumber}
                    </button>
                    <div className="text-[10px] text-neutral-400 font-mono">{line.tripNumber}</div>
                  </td>
                  <td className="py-2 px-2">{line.description}</td>
                  <td className="py-2 px-2">
                    {line.invoiceId && line.invoiceNumber ? (
                      <button type="button" onClick={() => onOpenInvoice(line.invoiceId!)} className="font-mono font-bold text-blue-700 hover:underline print:text-neutral-950 print:no-underline">
                        {line.invoiceNumber}
                      </button>
                    ) : (
                      <span className="text-neutral-400">No bill yet</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{formatPhp(line.grandTotalPhp)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-sm space-y-1 border-t-2 border-neutral-900 pt-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">{formatPhp(statement.subtotalPhp)}</span>
            </div>
            <div className="flex justify-between">
              <span>12% VAT</span>
              <span className="font-mono font-semibold">{formatPhp(statement.vatAmountPhp)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>2% EWT on these bills</span>
              <span className="font-mono">({formatPhp(statement.withholdingTaxAmountPhp)})</span>
            </div>
            <div className="flex justify-between text-base font-black border-t-2 border-neutral-900 pt-2">
              <span>Amount due</span>
              <span className="font-mono">{formatPhp(statement.grandTotalPhp)}</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-neutral-500 leading-relaxed">
            This statement adds up the trip bills for {statementMonthLabel(statement.period)}. Each waybill keeps its own freight bill.
            The 2% EWT figure is the same computation already on those bills. This page does not record a Form 2307 or a payment.
          </p>
        </div>
      </div>
    </div>
  );
};
