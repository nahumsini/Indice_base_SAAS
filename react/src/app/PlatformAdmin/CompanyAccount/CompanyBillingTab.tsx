import { CreditCard, Download, ExternalLink, Receipt } from 'lucide-react';
import type { platformAdminApi, PlatformCompanyDetail } from '../../api/platformAdmin';
import { useCustomerAccountCopy } from '../Customers/useCustomerAccountCopy';
import { CompactEmptyState, StatusPill, SummaryDatum, WorkspaceSection } from './CompanyAccountPrimitives';
import { CompanyWorkspacePageState, CompanyWorkspacePagination } from './CompanyWorkspacePageState';
import { useCompanyWorkspacePage } from './useCompanyWorkspacePage';
import { formatDate, formatMoney, humanize } from './companyAccountUtils';

export function CompanyBillingTab({ company, loadInvoices, onRequestPayment }: {
  company: PlatformCompanyDetail;
  loadInvoices: typeof platformAdminApi.getCompanyInvoices;
  onRequestPayment?: () => void;
}) {
  const { t, locale } = useCustomerAccountCopy();
  const state = useCompanyWorkspacePage(company.id, loadInvoices);
  const nextDate = company.trial_source ? company.trial_ends_at : company.current_period_ends_at;
  return <div className="space-y-4">
    <WorkspaceSection title={t('workspaceBilling')} icon={CreditCard} action={onRequestPayment ? (
      <button type="button" onClick={onRequestPayment} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#177D66] px-4 text-sm font-medium text-white"><CreditCard aria-hidden="true" className="h-4 w-4" />{t('requestPayment')}</button>
    ) : undefined}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        <SummaryDatum label={t('plan')} value={humanize(company.offer_code || company.projected_offer_code, locale)} hint={company.billing_managed_by_stripe ? t('stripeSubscription') : t('noCommercialContract')} />
        <SummaryDatum label={t('rate')} value={formatMoney(company.billing_amount_cents, company.billing_currency, locale)} hint={company.billing_amount_kind === 'ESTIMATE' ? t('workspacePriceEstimate') : humanize(company.billing_amount_interval, locale)} />
        <SummaryDatum label={t('workspaceNextEvent')} value={formatDate(nextDate, locale)} hint={company.trial_source ? t('trial') : t('nextBillingDate')} />
        <SummaryDatum label={t('status')} value={<StatusPill status={company.billing_status} />} />
      </div>
    </WorkspaceSection>
    <WorkspaceSection title={t('billing')} icon={Receipt}>
      <CompanyWorkspacePageState {...state} />
      {!state.loading && state.data ? <>
        {state.data.invoices.length ? <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {state.data.invoices.map((invoice) => <article key={invoice.invoice_id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-900 dark:text-slate-100">{t('invoiceId', { id: invoice.invoice_id })}</p>
              <p className="mt-1 text-xs text-slate-500">{t('workspacePeriod')}: {formatDate(invoice.period_starts_at, locale)} – {formatDate(invoice.period_ends_at, locale)}</p>
              <div className="mt-2"><StatusPill status={invoice.status} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div><p className="text-xs text-slate-500">{t('workspaceBilled')}</p><p>{formatMoney(invoice.amount_due_cents, invoice.currency, locale)}</p></div>
              <div><p className="text-xs text-slate-500">{t('workspacePaidAmount')}</p><p>{formatMoney(invoice.amount_paid_cents, invoice.currency, locale)}</p></div>
              {invoice.hosted_invoice_url ? <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[#177D66]"><ExternalLink aria-hidden="true" className="h-4 w-4" />{t('openInvoice')}</a> : null}
              {invoice.invoice_pdf_url ? <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[#177D66]"><Download aria-hidden="true" className="h-4 w-4" />{t('workspaceDownload')}</a> : null}
            </div>
          </article>)}
        </div> : <CompactEmptyState icon={Receipt}>{t('noInvoices')}</CompactEmptyState>}
        <CompanyWorkspacePagination pagination={state.data.pagination} {...state} />
      </> : null}
    </WorkspaceSection>
  </div>;
}
