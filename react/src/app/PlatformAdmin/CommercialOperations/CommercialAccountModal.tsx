import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { platformAdminApi, type PlatformCompanyDetail } from '../../api/platformAdmin';
import { IndiceModalFrame } from '../../components/indice-modal';
import { IndiceViewState, IndiceWorkspaceNavigation } from '../../components/frontend-os';
import { CompanyHistoryTab } from '../CompanyAccount/CompanyHistoryTab';
import type { CompanyAccountTab } from '../CompanyAccountDrawer';
import { commercialCopy } from './copy';
import { attentionFor, registeredCountry, trialDeadline } from './model';
import { isAccessDenied } from './useCommercialAccounts';

export const commercialButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

export type CommercialActions = {
  onOpenCompany: (id: number, tab: CompanyAccountTab) => void;
  onOpenCare?: (name: string) => void;
  onOpenConsulting: (name: string) => void;
};

export function CommercialAccountModal({ companyId, locale, onClose, ...actions }: CommercialActions & {
  companyId: number; locale: string; onClose: () => void;
}) {
  const c = commercialCopy(locale);
  const [company, setCompany] = useState<PlatformCompanyDetail | null>(null);
  const [error, setError] = useState<'error' | 'denied' | null>(null);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<'summary' | 'history'>('summary');
  useEffect(() => {
    let current = true;
    setCompany(null);
    setError(null);
    platformAdminApi.getCompany(companyId).then(result => { if (current) setCompany(result); })
      .catch(cause => { if (current) setError(isAccessDenied(cause) ? 'denied' : 'error'); });
    return () => { current = false; };
  }, [companyId, revision]);
  const open = (action: () => void) => { onClose(); action(); };
  const date = company ? trialDeadline(company) : null;
  return <IndiceModalFrame open onOpenChange={value => { if (!value) onClose(); }} modalType="operational-workspace" tone="blue"
    title={company?.name || c.details} description={c.noChanges} icon={<Building2 />} closeLabel={c.close}
    contentClassName="sm:max-w-5xl" bodyClassName="space-y-5 p-4 sm:p-6"
    footer={<button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-white/40 px-5 py-2 text-white">{c.close}</button>}>
    {error ? <IndiceViewState tone="blue" variant={error === 'denied' ? 'restricted' : 'error'} title={c[error]}
      action={<button className={commercialButton} onClick={() => setRevision(value => value + 1)}>{c.refresh}</button>} /> : !company ? <IndiceViewState tone="blue" variant="loading" title={c.loading} /> : <>
      <IndiceWorkspaceNavigation<'summary' | 'history'> ariaLabel={c.details} tone="blue" variant="sections" value={tab} onValueChange={setTab}
        items={[{ id: 'summary', label: c.summary }, { id: 'history', label: c.history }]} />
      {tab === 'history' ? <CompanyHistoryTab companyId={companyId} loadHistory={platformAdminApi.getCompanyHistory} /> : <>
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
          <h3 className="font-semibold">{c.suggested}: {c[attentionFor(company, Date.now())]}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.nextActionHelp}</p>
        </section>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [c.contact, company.owner_email], [c.registeredCountry, registeredCountry(company)],
            [c.plan, company.product_names?.join(', ')], [c.version, company.catalog_version],
            [c.currency, company.currency || company.billing_currency], [c.distributor, company.distributor_company_name],
            [c.deadline, date === null ? null : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)],
          ].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || c.missing}</dd>
          </div>)}
        </dl>
        <p className="text-sm text-slate-500 dark:text-slate-400">{c.countryHelp}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {([['overview', c.account], ['activity', c.users], ['billing', c.invoices]] as const).map(([value, label]) =>
            <button type="button" className={commercialButton} key={value} onClick={() => open(() => actions.onOpenCompany(company.id, value))}>{label}</button>)}
          {actions.onOpenCare ? <button type="button" className={commercialButton} onClick={() => open(() => actions.onOpenCare?.(company.name))}>{c.care}</button> : null}
          <button type="button" className={commercialButton} onClick={() => open(() => actions.onOpenConsulting(company.name))}>{c.consulting}</button>
        </div>
      </>}
    </>}
  </IndiceModalFrame>;
}
