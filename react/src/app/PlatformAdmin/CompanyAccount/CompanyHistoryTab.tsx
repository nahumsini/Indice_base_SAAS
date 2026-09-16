import { History } from 'lucide-react';
import type { platformAdminApi } from '../../api/platformAdmin';
import { useCustomerAccountCopy } from '../Customers/useCustomerAccountCopy';
import { CompactEmptyState, StatusPill, WorkspaceSection } from './CompanyAccountPrimitives';
import { CompanyWorkspacePageState, CompanyWorkspacePagination } from './CompanyWorkspacePageState';
import { useCompanyWorkspacePage } from './useCompanyWorkspacePage';
import { formatDate } from './companyAccountUtils';
import type { CustomerAccountMessage } from '../Customers/customerAccountTranslations';

const actionLabels: Record<string, CustomerAccountMessage> = {
  PAYMENT_REQUEST_STARTED: "requestPayment", PAYMENT_REQUEST_EXTENDED: "workspacePaymentExtension",
  BENEFIT_GRANTED: 'applyAccessAdjustment', BENEFIT_REVOKED: 'revoke',
  COMPANY_USER_INVITED: 'inviteUser', COMPANY_USER_INVITATION_CANCELLED: 'cancelInvitation',
  COMPANY_USER_INVITATION_RESENT: 'resendInvitation', COMPANY_USER_ROLE_UPDATED: 'workspaceChangeRole',
  COMPANY_USER_ACTIVATED: 'reactivateUser', COMPANY_USER_DEACTIVATED: 'deactivateUser', COMPANY_ACCOUNT_TYPE_UPDATED: 'workspaceAccountType',
};

export function CompanyHistoryTab({ companyId, loadHistory }: { companyId: number; loadHistory: typeof platformAdminApi.getCompanyHistory }) {
  const { t, locale } = useCustomerAccountCopy();
  const state = useCompanyWorkspacePage(companyId, loadHistory);
  return <WorkspaceSection title={t('workspaceHistory')} description={t('workspaceHistoryHelp')} icon={History}>
    <CompanyWorkspacePageState {...state} />
    {!state.loading && state.data ? <>
      {state.data.events.length ? <ol className="divide-y divide-slate-100 dark:divide-slate-700">
        {state.data.events.map((event) => <li key={event.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t(actionLabels[event.action] ?? (event.source === 'AUTH' ? 'workspaceLoginEvent' : event.source === 'BILLING' ? 'workspaceBillingEvent' : 'workspaceSupportEvent'))}</p>
            <StatusPill status={event.outcome} />
          </div>
          <p className="text-xs text-slate-500">{formatDate(event.occurred_at, locale)} · {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(event.occurred_at))} · {event.actor_name || t('workspaceUnknownActor')}</p>
          {event.reason && event.reason !== 'null' ? <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{t('workspaceHistoryReason')}: {event.reason}</p> : null}
        </li>)}
      </ol> : <CompactEmptyState icon={History}>{t('workspaceNoHistory')}</CompactEmptyState>}
      <CompanyWorkspacePagination pagination={state.data.pagination} {...state} />
    </> : null}
  </WorkspaceSection>;
}
