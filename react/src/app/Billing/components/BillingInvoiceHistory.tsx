import { Download, ExternalLink, FileText, ReceiptText, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { BillingInvoiceRecord, BillingSelectionResponse } from '../../api/billing';
import type { BillingCopy } from '../translations';

type Props = {
  copy: BillingCopy;
  invoices: BillingInvoiceRecord[];
  selection: BillingSelectionResponse;
  languageCode: string;
  action: string;
  hasChanges: boolean;
  readOnly: boolean;
  onOpenPortal: () => void;
};

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  open: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  void: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  uncollectible: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200',
};

export function BillingInvoiceHistory(props: Props) {
  const canOpenPortal = props.selection.payment_management_available;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_46px_-40px_rgba(37,99,235,0.45)] dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-medium text-slate-950 dark:text-white">{props.copy.invoiceHistory}</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{props.copy.invoiceHistoryDescription}</p>
          </div>
        </div>
        {canOpenPortal && !props.readOnly ? (
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(props.action) || props.hasChanges}
            onClick={props.onOpenPortal}
            className="h-10 shrink-0 rounded-xl bg-white dark:bg-slate-900"
          >
            {props.copy.manageInvoices}<ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </header>

      {props.invoices.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{props.copy.invoicePeriod}</th>
                <th className="px-4 py-3">{props.copy.invoiceReference}</th>
                <th className="px-4 py-3">{props.copy.invoiceAmount}</th>
                <th className="px-4 py-3">{props.copy.invoiceStatus}</th>
                <th className="px-4 py-3 text-right">{props.copy.invoiceDocument}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {props.invoices.map((invoice) => (
                <InvoiceRow key={invoice.invoice_id} copy={props.copy} invoice={invoice} languageCode={props.languageCode} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid place-items-center px-4 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <FileText className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{props.copy.noInvoices}</h3>
          <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-slate-400">{props.copy.noInvoicesDescription}</p>
        </div>
      )}

      <footer className="flex items-start gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--indice-brand-action)] dark:text-blue-300" />
        {props.copy.invoiceStorageNote}
      </footer>
    </section>
  );
}

function InvoiceRow({ copy, invoice, languageCode }: { copy: BillingCopy; invoice: BillingInvoiceRecord; languageCode: string }) {
  const status = invoice.status?.toLowerCase() || 'draft';
  const amount = status === 'paid' ? invoice.amount_paid_cents : invoice.amount_due_cents;
  const pdfUrl = safeStripeUrl(invoice.invoice_pdf_url);
  const hostedUrl = safeStripeUrl(invoice.hosted_invoice_url);

  return (
    <tr className="text-slate-700 dark:text-slate-200">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900 dark:text-white">{dateLabel(invoice.period_ends_at ?? invoice.updated_at, languageCode)}</p>
        {invoice.period_starts_at && invoice.period_ends_at ? (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{dateRange(invoice.period_starts_at, invoice.period_ends_at, languageCode)}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 font-mono text-xs">{shortInvoiceId(invoice.invoice_id)}</td>
      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{money(amount, invoice.currency, languageCode)}</td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${statusStyles[status] ?? statusStyles.draft}`}>{statusLabel(copy, status)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {hostedUrl ? <InvoiceLink href={hostedUrl} label={copy.viewInvoice} icon={ExternalLink} /> : null}
          {pdfUrl ? <InvoiceLink href={pdfUrl} label={copy.downloadPdf} icon={Download} /> : null}
          {!hostedUrl && !pdfUrl ? <span className="text-xs text-slate-400">—</span> : null}
        </div>
      </td>
    </tr>
  );
}

function InvoiceLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Download }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
      <Icon className="h-3.5 w-3.5" />{label}
    </a>
  );
}

function safeStripeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function shortInvoiceId(value: string) {
  return value.length > 18 ? `…${value.slice(-14)}` : value;
}

function dateLabel(value: string | null, languageCode: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(languageCode, { dateStyle: 'medium' }).format(new Date(value));
}

function dateRange(start: string, end: string, languageCode: string) {
  const formatter = new Intl.DateTimeFormat(languageCode, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

function money(value: number | null, currency: string, languageCode: string) {
  if (value == null) return '—';
  return new Intl.NumberFormat(languageCode, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(value / 100);
}

function statusLabel(copy: BillingCopy, status: string) {
  if (status === 'paid') return copy.paid;
  if (status === 'open') return copy.open;
  if (status === 'void') return copy.void;
  if (status === 'uncollectible') return copy.uncollectible;
  return copy.draft;
}
