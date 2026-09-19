import type { PlatformBenefit } from '../../api/platformAdmin';
import { useCustomerAccountCopy } from '../Customers/useCustomerAccountCopy';
import { StatusPill } from './CompanyAccountPrimitives';
import { benefitEffectiveStatus } from './companyAccountState';
import { formatDate, humanize } from './companyAccountUtils';

export function CompanyBenefitDetails({ benefits }: { benefits: PlatformBenefit[] }) {
  const { t, locale } = useCustomerAccountCopy();
  if (!benefits.length) return null;
  return <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
    <summary className="flex min-h-11 cursor-pointer items-center text-[#177D66] dark:text-emerald-300">{t('accessDetails')}</summary>
    <ul className="space-y-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
      {benefits.map(benefit => <li key={benefit.reference}>
        <div className="flex flex-wrap items-center gap-2"><span>{humanize(benefit.source_type, locale)}</span><StatusPill status={benefitEffectiveStatus(benefit)} /></div>
        <p className="mt-1">{formatDate(benefit.starts_at, locale)} — {benefit.ends_at ? formatDate(benefit.ends_at, locale) : t('accessPermanent')}</p>
        {benefit.reason ? <p className="mt-1 whitespace-pre-line break-words">{benefit.reason}</p> : null}
      </li>)}
    </ul>
  </details>;
}
