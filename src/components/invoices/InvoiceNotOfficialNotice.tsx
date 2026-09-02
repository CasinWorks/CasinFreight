import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { INVOICE_NOT_OFFICIAL, VAT_EWT_DISCLAIMER } from '../../content/taxCopy';

export const InvoiceNotOfficialNotice: React.FC<{ variant?: 'banner' | 'print' }> = ({
  variant = 'banner',
}) => {
  if (variant === 'print') {
    return (
      <div className="mt-4 border-2 border-amber-500 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 leading-relaxed print:mt-2 print:py-1 print:px-2 print:text-[10px] print:leading-snug print:border">
        <strong className="uppercase tracking-wide">Not an official invoice. </strong>
        {INVOICE_NOT_OFFICIAL} {VAT_EWT_DISCLAIMER}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>{INVOICE_NOT_OFFICIAL}</strong> {VAT_EWT_DISCLAIMER} Use these as billing summaries for your bookkeeper.
      </p>
    </div>
  );
};
