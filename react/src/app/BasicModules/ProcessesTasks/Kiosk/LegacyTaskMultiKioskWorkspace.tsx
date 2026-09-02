import { useState } from 'react';
import {
  Check,
  Clock3,
  ListChecks,
  LoaderCircle,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  isMultiKioskAuthorizationFailure,
  multiKioskPublicApi,
  type MultiKioskChildWorkspace,
} from '../../../api/multiKiosks';
import { ApiClientError } from '../../../lib/apiClient';
import { cn } from '../../../components/ui/utils';
import type { MultiKioskMobileCopy } from '../../../KioskCenter/multiKioskMobileTranslations';
import type {
  PublicTaskKioskCompleteResponse,
  PublicTaskKioskTask,
} from './processTaskKioskApi';
import { multiKioskCsrfFor } from './employeeTaskMultiKioskWorkspaceUtils';
import { getTaskKioskTranslations, resolveTaskKioskLocale } from './translations';

const legacyTaskCapabilities = {
  create: 'process-tasks.task.create@1',
  complete: 'process-tasks.task.complete@1',
} as const;

interface LegacyTaskMultiKioskWorkspaceProps {
  copy: MultiKioskMobileCopy;
  kioskId: number;
  locale: string;
  onAuthorizationFailure: (error: unknown) => boolean;
  onRefresh: () => Promise<void>;
  token: string;
  workspace: MultiKioskChildWorkspace;
}

function legacyTaskError(error: unknown, copy: MultiKioskMobileCopy) {
  if (error instanceof ApiClientError && error.status === 429) return copy.errors.rateLimit;
  if (isMultiKioskAuthorizationFailure(error)) return copy.errors.authorization;
  if (error instanceof ApiClientError && error.status === 404) return copy.errors.unavailable;
  return copy.errors.generic;
}

/**
 * Compatibility workspace for pre-catalogue TASKS kiosks. Its create + quick
 * complete workflow is intentionally preserved until those definitions are
 * migrated to the native employee.my-tasks@1 tool.
 */
export function LegacyTaskMultiKioskWorkspace({
  copy,
  kioskId,
  locale,
  onAuthorizationFailure,
  onRefresh,
  token,
  workspace,
}: LegacyTaskMultiKioskWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [pending, setPending] = useState<number | 'create' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const taskCopy = getTaskKioskTranslations(resolveTaskKioskLocale(locale));
  const tasks = workspace.bootstrap?.tasks ?? [];
  const granted = workspace.session.capabilities;
  const canCreateTask = granted.includes(legacyTaskCapabilities.create);
  const canCompleteTask = granted.includes(legacyTaskCapabilities.complete);
  const summaries: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: copy.tasks.pending, value: tasks.filter(task => task.status !== 'completed').length, icon: Clock3 },
    { label: copy.tasks.overdue, value: tasks.filter(task => task.is_overdue && task.status !== 'completed').length, icon: ListChecks },
    { label: copy.tasks.inScope, value: tasks.length, icon: ShieldCheck },
  ];
  const visible = tasks.filter(task => !query.trim() || [task.title, task.folio, task.assigned_name]
    .some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));

  const mutate = async <T = unknown,>(
    capability: string,
    payload: Record<string, unknown>,
    marker: number | 'create',
  ): Promise<T | null> => {
    setPending(marker);
    setError('');
    setSuccess('');
    try {
      const response = await multiKioskPublicApi.action<T>(
        token,
        kioskId,
        capability,
        payload,
        multiKioskCsrfFor(token),
      );
      await onRefresh();
      return response;
    } catch (failure) {
      if (!onAuthorizationFailure(failure)) setError(legacyTaskError(failure, copy));
      return null;
    } finally {
      setPending(null);
    }
  };

  const create = async () => {
    if (!canCreateTask || !quickTitle.trim()) return;
    const created = await mutate(legacyTaskCapabilities.create, {
      title: quickTitle.trim(),
      priority: 'medium',
      dueDate: new Date().toISOString().slice(0, 10),
    }, 'create');
    if (created !== null) setQuickTitle('');
  };

  const complete = async (task: PublicTaskKioskTask) => {
    if (!canCompleteTask) return;
    const contributionFlow = task.completion_action === 'CONTRIBUTION_READY';
    const result = await mutate<Partial<PublicTaskKioskCompleteResponse>>(legacyTaskCapabilities.complete, {
      resource_id: task.id,
      ...(contributionFlow ? {} : { completion_percent: 100 }),
    }, task.id);
    if (result?.action_outcome === 'CONTRIBUTION_READY') {
      setSuccess(taskCopy.success.contributionReady(task.title));
    }
  };

  return (
    <div className="space-y-4" data-multi-kiosk-workspace="legacy-tasks">
      <div className="grid grid-cols-3 gap-2">
        {summaries.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950">
            <Icon aria-hidden="true" className="mx-auto h-4 w-4 text-blue-600 dark:text-blue-300" />
            <p className="mt-2 text-xl text-slate-950 dark:text-white">{value}</p>
            <p className="mt-1 text-[10px] text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {canCreateTask ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{copy.tasks.quickCapture}</p>
          <input
            aria-label={copy.tasks.titlePlaceholder}
            value={quickTitle}
            onChange={event => setQuickTitle(event.target.value)}
            placeholder={copy.tasks.titlePlaceholder}
            className="mt-3 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => void create()}
            disabled={!quickTitle.trim() || pending !== null}
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending === 'create' ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {copy.tasks.add}
          </button>
        </section>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label={copy.tasks.searchPlaceholder}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={copy.tasks.searchPlaceholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="mt-3 space-y-2">
          {visible.map(task => (
            <article key={task.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', task.is_overdue ? 'bg-rose-500' : task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500')} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{task.folio}{task.due_date ? ` · ${task.due_date}` : ''}</p>
                </div>
              </div>
              {canCompleteTask && task.can_complete && task.status !== 'completed' ? (
                <button
                  type="button"
                  onClick={() => void complete(task)}
                  disabled={pending !== null}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 disabled:opacity-50"
                >
                  {pending === task.id
                    ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    : <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                  {task.completion_action === 'CONTRIBUTION_READY'
                    ? taskCopy.selectedTask.markContributionReady
                    : copy.tasks.complete}
                </button>
              ) : null}
            </article>
          ))}
          {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">{copy.tasks.empty}</p> : null}
        </div>
      </section>
    </div>
  );
}
