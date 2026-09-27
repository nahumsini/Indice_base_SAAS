import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { MercadoPagoTerminalCopy } from '../../CashRegisters/mercadoPagoTerminalCopy';
import { isValidMercadoPagoMerchantReview } from '../services/mercadoPagoMerchantReview';
import type { MercadoPagoPaymentResponse } from '../services/mercadoPagoTerminalTypes';

interface Props {
  item: MercadoPagoPaymentResponse;
  busy: boolean;
  buttonClass: string;
  copy: MercadoPagoTerminalCopy;
  onSubmit: (intentId: number, providerOrderId: string, reason: string) => Promise<void>;
}

export function MercadoPagoMerchantReviewForm({ item, busy, buttonClass, copy, onSubmit }: Props) {
  const [providerOrderId, setProviderOrderId] = useState('');
  const [reason, setReason] = useState('');
  const valid = isValidMercadoPagoMerchantReview(providerOrderId, reason);
  const headingId = `mp-review-heading-${item.intentId}`;
  const helpId = `mp-review-help-${item.intentId}`;
  return <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10" aria-labelledby={headingId}>
    <div><h3 id={headingId} className="font-medium">{copy.reviewTitle}</h3><p id={helpId} className="mt-1 text-xs">{copy.reviewHelp}</p></div>
    <label className="block text-xs font-medium">{copy.reviewOrder}<input value={providerOrderId} onChange={(event) => setProviderOrderId(event.target.value)} maxLength={128} disabled={busy} aria-describedby={helpId} placeholder={copy.reviewOrderPlaceholder} autoComplete="off" className="mt-1 min-h-11 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 disabled:opacity-60 dark:border-amber-500/50 dark:bg-slate-950 dark:text-white" /></label>
    <label className="block text-xs font-medium">{copy.reviewReason}<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} disabled={busy} aria-describedby={helpId} placeholder={copy.reviewReasonPlaceholder} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 disabled:opacity-60 dark:border-amber-500/50 dark:bg-slate-950 dark:text-white" /></label>
    <p className="text-xs">{copy.reviewInvalid}</p>
    <button type="button" className={buttonClass} disabled={busy || !valid} onClick={() => void onSubmit(item.intentId, providerOrderId, reason)}><ShieldCheck className="h-4 w-4" />{copy.reviewSubmit}</button>
  </section>;
}
