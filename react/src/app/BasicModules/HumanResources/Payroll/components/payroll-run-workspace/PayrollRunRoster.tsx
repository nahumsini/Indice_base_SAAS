import {
  AlertTriangle,
  BadgeMinus,
  CheckCircle2,
  Gift,
  ReceiptText,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { PayrollRunLine } from '../../../../../api/humanResources';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../components/ui/dropdown-menu';
import type { PayrollTranslations } from '../../translations';
import { payrollLineWarningCount } from './payrollRunWorkspaceModel';
import type { PayrollRunWorkspaceText } from './payrollRunWorkspaceText';

export type PayrollRosterFilter = 'all' | 'warnings' | 'modified';

type PayrollRunRosterProps = {
  canEdit: boolean;
  copy: PayrollTranslations;
  currencyFallback: string;
  dirtyLineIds: ReadonlySet<number>;
  editDisabledReason: string;
  filter: PayrollRosterFilter;
  lines: PayrollRunLine[];
  locale: string;
  onChangeFilter: (filter: PayrollRosterFilter) => void;
  onChangeQuery: (query: string) => void;
  onNextPage: () => void;
  onOpenAdjustments: (lineId: number) => void;
  onOpenBreakdown: (lineId: number) => void;
  onOpenDeductions: (lineId: number) => void;
  onOpenIncentives: (lineId: number) => void;
  onPreviousPage: () => void;
  page: number;
  pageCount: number;
  query: string;
  text: PayrollRunWorkspaceText;
  totalFiltered: number;
};

const formatCurrency = (value: number, locale: string, currency: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const neutralActionClassName = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

export function PayrollRunRoster({
  canEdit,
  copy,
  currencyFallback,
  dirtyLineIds,
  editDisabledReason,
  filter,
  lines,
  locale,
  onChangeFilter,
  onChangeQuery,
  onNextPage,
  onOpenAdjustments,
  onOpenBreakdown,
  onOpenDeductions,
  onOpenIncentives,
  onPreviousPage,
  page,
  pageCount,
  query,
  text,
  totalFiltered,
}: PayrollRunRosterProps) {
  const filterOptions: Array<{ id: PayrollRosterFilter; label: string }> = [
    { id: 'all', label: text.all },
    { id: 'warnings', label: text.warnings },
    { id: 'modified', label: text.modified },
  ];

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {text.search}
            <span className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-950">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(event) => onChangeQuery(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
            </span>
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{text.filters}</p>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onChangeFilter(option.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === option.id
                    ? 'bg-white text-[#177D66] shadow-sm dark:bg-slate-800 dark:text-[#B8F2E3]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium text-slate-500 shadow-[0_1px_0_rgba(148,163,184,0.25)] dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{copy.labels.employee}</th>
              <th className="px-3 py-3">{copy.labels.unit}</th>
              <th className="px-3 py-3 text-right">{text.earningsTotal}</th>
              <th className="px-3 py-3 text-right">{text.deductionsTotal}</th>
              <th className="px-4 py-3 text-right">{copy.labels.net}</th>
              <th className="w-24 px-3 py-3 text-center">{text.warnings}</th>
              <th className="w-60 px-4 py-3 text-right">{text.actions}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const warnings = payrollLineWarningCount(line);
              const dirty = dirtyLineIds.has(line.id);
              const currency = line.currency_code || currencyFallback;

              return (
                <tr key={line.id} className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 align-middle">
                    <div className="block max-w-[260px] text-left">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">{line.user_name}</span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                        {line.position_title || '—'} · {line.department || '—'}
                      </span>
                      {dirty ? (
                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                          {text.dirty}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[180px] px-3 py-3 align-middle">
                    <span className="block truncate text-slate-700 dark:text-slate-200">{line.unit_name || copy.labels.noUnit}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{line.business_name || copy.labels.noBusiness}</span>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatCurrency(line.gross_amount, locale, currency)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {formatCurrency(line.deductions_amount, locale, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(line.net_amount, locale, currency)}
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    {warnings > 0 ? (
                      <button
                        type="button"
                        title={text.breakdown}
                        onClick={() => onOpenBreakdown(line.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {warnings}
                      </button>
                    ) : (
                      <span title="Sin alertas" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" title={text.breakdown} aria-label={`${text.breakdown}: ${line.user_name}`} onClick={() => onOpenBreakdown(line.id)} className={neutralActionClassName}>
                        <ReceiptText className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title={text.incentives}
                        aria-label={`${text.incentives}: ${line.user_name}`}
                        onClick={() => onOpenIncentives(line.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                      >
                        <Gift className="h-4 w-4" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            title={copy.editRun.manage}
                            aria-label={`${copy.editRun.manage}: ${line.user_name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#59C3A5] bg-[#59C3A5] text-white shadow-sm transition hover:bg-[#3EAF91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={6} className="z-[220] w-56">
                          {canEdit ? (
                            <>
                              <DropdownMenuItem onClick={() => onOpenDeductions(line.id)}>
                                <BadgeMinus className="mr-2 h-4 w-4 text-amber-600" />
                                {text.discounts}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onOpenAdjustments(line.id)}>
                                <SlidersHorizontal className="mr-2 h-4 w-4 text-[#177D66]" />
                                {text.adjustments}
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem disabled>{editDisabledReason}</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {lines.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center px-6 text-center text-sm font-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {text.noMatches}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs font-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{totalFiltered} {text.results}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={onPreviousPage} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
            {text.previous}
          </button>
          <span>{page} / {pageCount}</span>
          <button type="button" disabled={page >= pageCount} onClick={onNextPage} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">
            {text.next}
          </button>
        </div>
      </div>
    </section>
  );
}
