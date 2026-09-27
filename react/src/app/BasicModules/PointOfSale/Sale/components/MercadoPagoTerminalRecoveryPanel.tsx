import { AlertTriangle, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useMercadoPagoTerminalCopy } from '../../CashRegisters/useMercadoPagoTerminalCopy';
import type { useMercadoPagoTerminalCheckout } from '../hooks/useMercadoPagoTerminalCheckout';
import { requiresMercadoPagoMerchantReview } from '../services/mercadoPagoMerchantReview';
import { MercadoPagoMerchantReviewForm } from './MercadoPagoMerchantReviewForm';

interface Props { payment: ReturnType<typeof useMercadoPagoTerminalCheckout>; formatCurrency: (amount: number) => string }
export function MercadoPagoTerminalRecoveryPanel({ payment, formatCurrency }: Props) {
  const { copy } = useMercadoPagoTerminalCopy();
  if (!payment.items.length && !payment.loading && !payment.error && !payment.unknownDelivery) return null;
  const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-3 text-xs font-medium text-amber-900 disabled:opacity-50 dark:border-amber-500/30 dark:bg-slate-950 dark:text-amber-100';
  return <section className="mt-2 space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />{copy.recovery}</h2><p className="mt-1 text-xs">{copy.recoveryHelp}</p></div><button type="button" className={buttonClass} disabled={payment.busy || payment.actionBusy || payment.loading} onClick={() => void payment.load()}><RefreshCw className="h-4 w-4" />{copy.refresh}</button></div>
    {payment.loading ? <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{copy.loading}</p> : null}
    {payment.error ? <p role="alert">{payment.error}</p> : null}
    {payment.unknownDelivery ? <div className="space-y-2"><p>{copy.uncertain}</p>{payment.canRecoverRequest ? <button type="button" className={buttonClass} disabled={payment.busy || payment.actionBusy} onClick={() => void payment.recoverRequest()}><RotateCcw className="h-4 w-4" />{copy.retryDelivery}</button> : null}{payment.canRecoverRequest ? <button type="button" className={buttonClass} disabled={payment.busy || payment.actionBusy} onClick={() => void payment.closeRequest()}><XCircle className="h-4 w-4" />{copy.closeRequest}</button> : null}</div> : null}
    {payment.items.map((item) => <div key={item.intentId} className="space-y-2 rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-500/30 dark:bg-slate-950"><p className="font-medium">Mercado Pago · {copy.intent} #{item.intentId} · {formatCurrency(Number(item.amount))} {item.currencyCode}</p><p className="text-xs">{item.status === 'waiting' ? copy.waiting : item.status === 'approved' ? copy.receiptPending : copy.uncertain}</p>{requiresMercadoPagoMerchantReview(item)
      ? <MercadoPagoMerchantReviewForm item={item} busy={payment.busy || payment.actionBusy} buttonClass={buttonClass} copy={copy} onSubmit={payment.merchantReview} />
      : <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} disabled={payment.busy || payment.actionBusy} onClick={() => void payment.recover(item.intentId)}><RotateCcw className="h-4 w-4" />{copy.recover}</button>{item.canCancel ? <button type="button" className={buttonClass} disabled={payment.actionBusy} onClick={() => void payment.cancel(item.intentId)}><XCircle className="h-4 w-4" />{copy.cancel}</button> : item.status === 'waiting' ? <p className="self-center text-xs">{copy.deviceCancel}</p> : null}</div>}</div>)}
  </section>;
}
