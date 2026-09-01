import type { ReactNode } from 'react';
import { Activity, Bot, CheckCircle2, LoaderCircle, Power, ShieldCheck } from 'lucide-react';
import type { AiConnection, AiConnectionActivity } from '../../../../api/aiConnections';
import type { AiScopeCode } from '../constants';
import { scopeKindByCode } from '../constants';
import type { IntegrationsTranslations } from '../translations';
import { formatConnectionDate, getConnectionStatus } from '../utils';

type ConnectionDetailProps = {
  activity: AiConnectionActivity[];
  activityError: string;
  connection: AiConnection | null;
  copy: IntegrationsTranslations;
  isActivityLoading: boolean;
  locale: string;
  onRevoke: (connection: AiConnection) => void;
};

export function ConnectionDetail({
  activity,
  activityError,
  connection,
  copy,
  isActivityLoading,
  locale,
  onRevoke,
}: ConnectionDetailProps) {
  if (!connection) {
    return (
      <div className="flex min-h-[440px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <Bot className="h-10 w-10 text-[#59C3A5]" />
        <h3 className="mt-4 text-base font-medium text-slate-900 dark:text-white">{copy.connections.emptyTitle}</h3>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{copy.connections.emptyDescription}</p>
      </div>
    );
  }

  const status = getConnectionStatus(connection);
  const knownScopes = connection.scopes.filter((scope) => copy.scopes[scope as AiScopeCode]);
  const consultationScopes = knownScopes.filter((scope) => scopeKindByCode.get(scope) === 'read');
  const actionScopes = knownScopes.filter((scope) => scopeKindByCode.get(scope) === 'action');

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium text-slate-950 dark:text-white">{connection.label}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' : status === 'expired' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {copy.connections.status[status]}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {copy.connections.availableUntil}: {formatConnectionDate(connection.expiresAt, locale, copy.common.noDate)}
          </p>
        </div>
        {status === 'active' ? (
          <button
            type="button"
            onClick={() => onRevoke(connection)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            <Power className="h-4 w-4" /> {copy.detail.closeAccess}
          </button>
        ) : null}
      </div>

      <section className="py-5">
        <h4 className="text-base font-medium text-slate-950 dark:text-white">{copy.detail.helpsWith}</h4>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <PermissionGroup icon={<Activity />} title={copy.detail.consults} scopes={consultationScopes} copy={copy} tone="read" />
          {actionScopes.length ? (
            <PermissionGroup icon={<CheckCircle2 />} title={copy.detail.actions} scopes={actionScopes} copy={copy} tone="action" />
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/35 bg-[#59C3A5]/10 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#177D66]" />
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{copy.detail.noActions}</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5 dark:border-slate-700">
        <h4 className="flex items-center gap-2 text-base font-medium text-slate-950 dark:text-white"><Activity className="h-4 w-4" /> {copy.detail.activityTitle}</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">{copy.detail.activityDescription}</p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          {isActivityLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
          ) : activityError ? (
            <div className="px-4 py-8 text-center text-sm text-red-700 dark:text-red-300">{activityError}</div>
          ) : activity.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">{copy.detail.activityEmpty}</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {activity.map((event) => (
                <div key={event.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${event.kind === 'READ' ? 'bg-[#59C3A5]/15 text-[#177D66]' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200'}`}>
                    {event.kind === 'READ' ? <Activity className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{copy.detail.activityNames[event.toolName] ?? copy.detail.activityFallback}</span>
                    <span className="block text-xs text-slate-500">{event.kind === 'READ' ? copy.detail.activityRead : copy.detail.activityAction} · {formatConnectionDate(event.createdAt, locale, copy.common.noDate)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${event.outcome === 'FAILURE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'}`}>
                    {event.outcome === 'FAILURE' ? copy.detail.activityFailure : copy.detail.activitySuccess}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </article>
  );
}

function PermissionGroup({
  copy,
  icon,
  scopes,
  title,
  tone,
}: {
  copy: IntegrationsTranslations;
  icon: ReactNode;
  scopes: string[];
  title: string;
  tone: 'read' | 'action';
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <h5 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
        <span className={tone === 'read' ? 'text-[#177D66] [&>svg]:h-4 [&>svg]:w-4' : 'text-amber-700 [&>svg]:h-4 [&>svg]:w-4'}>{icon}</span>
        {title}
      </h5>
      <div className="mt-3 flex flex-wrap gap-2">
        {scopes.map((scopeCode) => (
          <span key={scopeCode} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone === 'read' ? 'border-[#59C3A5]/40 bg-[#59C3A5]/10 text-[#126553] dark:text-[#8FE0CA]' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'}`}>
            {copy.scopes[scopeCode as AiScopeCode].label}
          </span>
        ))}
      </div>
    </div>
  );
}
