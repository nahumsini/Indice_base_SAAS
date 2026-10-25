import { AlertTriangle, Ban, CheckCircle2, Info, MoreHorizontal, PencilLine, Users, Wallet } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../../../components/ui/dropdown-menu';
import type { PayrollRunSummary } from '../../../../../api/humanResources';
import type { PayrollTranslations } from '../../translations';
import type { PayrollRosterFilter } from './PayrollRunRoster';
import type { PayrollRunWorkspaceText } from './payrollRunWorkspaceText';

type Props = {
  run: PayrollRunSummary;
  copy: PayrollTranslations;
  text: PayrollRunWorkspaceText;
  netSummary: string;
  grossSummary: string;
  deductionsSummary: string;
  warningCount: number;
  dirtyCount: number;
  filter: PayrollRosterFilter;
  busy: boolean;
  onCancel?: () => void;
  onChangeFilter: (filter: PayrollRosterFilter) => void;
};

export function PayrollRunSummaryPanel({ run, copy, text, netSummary, grossSummary, deductionsSummary,
  warningCount, dirtyCount, filter, busy, onCancel, onChangeFilter }: Props) {
  const statusStyle = run.status === 'cancelled'
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200'
    : run.status === 'draft'
      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
      : 'bg-[#59C3A5]/15 text-[#177D66] dark:text-[#B8F2E3]';
  return (
    <section className="px-4 pt-4 sm:px-5" aria-label={text.overview}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-sm">
            <span className={`rounded-full px-3 py-1 font-medium ${statusStyle}`}>{copy.statuses[run.status]}</span>
            <span className="break-words font-medium text-slate-700 dark:text-slate-200">{run.grouping_label || copy.groupingModes[run.grouping_mode]}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{copy.frequencies[run.pay_period]}</span>
            {onCancel ? <DropdownMenu>
              <DropdownMenuTrigger asChild><button type="button" aria-label={text.actions} disabled={busy} className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#269C82] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[220]">
                <DropdownMenuItem onClick={onCancel} className="min-h-11 text-rose-600 focus:text-rose-700 dark:text-rose-300"><Ban className="mr-2 h-4 w-4" />{text.review.cancelRun}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> : null}
          </div>
        </div>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="border-b border-[#59C3A5]/20 bg-[#59C3A5]/10 p-5 sm:col-span-2 lg:col-span-1 lg:border-b-0 lg:border-r dark:bg-[#59C3A5]/5">
            <dt className="flex items-center gap-2 text-sm font-medium text-[#177D66] dark:text-[#B8F2E3]"><Wallet className="h-4 w-4" />{text.review.netTotal}</dt>
            <dd className="mt-2 break-words text-2xl font-medium tracking-tight tabular-nums text-slate-900 dark:text-white">{netSummary}</dd>
          </div>
          {[[text.earningsTotal, grossSummary], [text.deductionsTotal, deductionsSummary]].map(([label, amount]) => (
            <div key={label} className="border-b border-slate-100 p-5 last:border-0 sm:border-b-0 sm:border-r dark:border-slate-800">
              <dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-2 break-words text-xl font-medium tabular-nums text-slate-800 dark:text-slate-100">{amount}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          {[
            { id: 'all' as const, label: text.collaborators, count: run.users_count, icon: Users },
            { id: 'warnings' as const, label: warningCount ? text.warnings : text.noWarnings, count: warningCount, icon: warningCount ? AlertTriangle : CheckCircle2 },
            { id: 'modified' as const, label: text.review.pendingChanges, count: dirtyCount, icon: PencilLine },
          ].map(({ id, label, count, icon: Icon }) => (
            <button key={id} type="button" aria-pressed={filter === id} disabled={busy} onClick={() => onChangeFilter(id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#269C82] disabled:opacity-50 ${filter === id ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#177D66] dark:text-[#B8F2E3]' : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'} ${id === 'warnings' && count > 0 ? 'text-amber-700 dark:text-amber-200' : ''}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span><span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium tabular-nums dark:bg-slate-800">{count}</span>
            </button>
          ))}
          <details className="relative flex items-center self-center sm:ml-auto">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#269C82] dark:text-slate-400"><Info className="h-4 w-4" />{text.review.currency}</summary>
            <p className="max-w-md px-3 pb-2 text-sm text-slate-600 dark:text-slate-300">{text.review.currencyHint}</p>
          </details>
        </div>
      </div>
    </section>
  );
}
