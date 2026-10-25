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
import { normalizePayrollTreatmentValue, payrollLineWarningCount } from './payrollRunWorkspaceModel';
import type { PayrollRunWorkspaceText } from './payrollRunWorkspaceText';

export type PayrollRosterFilter = 'all' | 'warnings' | 'modified';

type PayrollRunRosterProps = {
  canEdit: boolean;
  busy: boolean;
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
  currencyDisplay: 'code',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

export function PayrollRunRoster({
  canEdit,
  busy,
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
  const renderActions = (line: PayrollRunLine) => (
    <div className="flex items-center justify-end gap-2">
      <button type="button" disabled={busy} aria-label={`${text.review.review}: ${line.user_name}`}
        onClick={() => onOpenBreakdown(line.id)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#59C3A5]/50 bg-[#59C3A5]/10 px-3 text-sm font-medium text-[#177D66] transition hover:bg-[#59C3A5]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#269C82] disabled:opacity-50 dark:text-[#B8F2E3]">
        <ReceiptText className="h-4 w-4" />{text.review.review}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={busy} title={copy.editRun.manage} aria-label={`${copy.editRun.manage}: ${line.user_name}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#269C82] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="z-[220] w-64">
          <DropdownMenuItem onClick={() => onOpenIncentives(line.id)} className="min-h-11"><Gift className="mr-2 h-4 w-4" />{text.review.pendingConcepts}</DropdownMenuItem>
          {canEdit ? <>
            <DropdownMenuItem onClick={() => onOpenDeductions(line.id)} className="min-h-11"><BadgeMinus className="mr-2 h-4 w-4" />{text.discounts}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAdjustments(line.id)} className="min-h-11"><SlidersHorizontal className="mr-2 h-4 w-4" />{text.adjustments}</DropdownMenuItem>
          </> : <DropdownMenuItem disabled>{editDisabledReason}</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  const renderIdentity = (line: PayrollRunLine) => (
    <div className="min-w-0">
      <span className="block font-medium text-slate-900 dark:text-white">{line.user_name}</span>
      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{line.position_title || '—'} · {line.department || '—'}</span>
      <span className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{text.treatmentLabels[normalizePayrollTreatmentValue(line.payroll_treatment, line.include_in_fiscal)]}</span>
      {dirtyLineIds.has(line.id) ? <span className="ml-1 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{text.dirty}</span> : null}
    </div>
  );
  const renderWarnings = (line: PayrollRunLine) => {
    const warnings = payrollLineWarningCount(line);
    return warnings ? (
      <button type="button" disabled={busy} aria-label={`${text.warnings}: ${warnings} · ${line.user_name}`} onClick={() => onOpenBreakdown(line.id)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-50 px-2 text-xs font-medium text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4" />{warnings} {text.warnings.toLocaleLowerCase()}
      </button>
    ) : <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{text.noWarnings}</span>;
  };

  return (
    <section className="min-w-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label={text.collaborators}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-700">
        <div className="min-w-0 flex-1 basis-72">
          <h3 className="font-medium text-slate-900 dark:text-white">{text.collaborators} <span className="ml-1 text-sm font-normal text-slate-500">({totalFiltered})</span></h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.review.reviewHint}</p>
        </div>
        <label className="w-full sm:w-80 text-xs font-medium text-slate-600 dark:text-slate-300">
          {text.search}
          <span className="mt-1.5 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 focus-within:border-[#269C82] focus-within:ring-1 focus-within:ring-[#269C82] dark:border-slate-700">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => onChangeQuery(event.target.value)} placeholder={text.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 sm:text-sm dark:text-white" />
          </span>
        </label>
        {filter !== 'all' || query ? <button type="button" onClick={() => { onChangeFilter('all'); onChangeQuery(''); }} className="min-h-11 px-3 text-sm font-medium text-[#177D66] dark:text-[#B8F2E3]">{text.all}</button> : null}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3">{copy.labels.employee}</th>
              <th scope="col" className="px-3 py-3">{copy.labels.unit}</th>
              <th scope="col" className="px-3 py-3 text-right">{text.earningsTotal}</th>
              <th scope="col" className="px-3 py-3 text-right">{text.deductionsTotal}</th>
              <th scope="col" className="px-3 py-3 text-right">{copy.labels.net}</th>
              <th scope="col" className="px-3 py-3">{text.warnings}</th>
              <th scope="col" className="px-4 py-3 text-right">{text.actions}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(line => {
              const currency = line.currency_code || currencyFallback;
              return <tr key={line.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
                <td className="max-w-64 px-4 py-4">{renderIdentity(line)}</td>
                <td className="max-w-44 px-3 py-4 text-slate-600 dark:text-slate-300"><span className="block">{line.unit_name || copy.labels.noUnit}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{line.business_name || copy.labels.noBusiness}</span></td>
                <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(line.gross_amount, locale, currency)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{formatCurrency(line.deductions_amount, locale, currency)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-right font-medium tabular-nums text-slate-900 dark:text-white">{formatCurrency(line.net_amount, locale, currency)}</td>
                <td className="px-3 py-4">{renderWarnings(line)}</td>
                <td className="px-4 py-4">{renderActions(line)}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800 lg:hidden">
        {lines.map(line => {
          const currency = line.currency_code || currencyFallback;
          return <li key={line.id} className="space-y-4 p-4">
            {renderIdentity(line)}
            <p className="text-xs text-slate-500 dark:text-slate-400">{line.unit_name || copy.labels.noUnit} · {line.business_name || copy.labels.noBusiness}</p>
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
              {[[text.earningsTotal, line.gross_amount], [text.deductionsTotal, line.deductions_amount], [copy.labels.net, line.net_amount]].map(([label, value], index) => (
                <div key={String(label)} className={index === 2 ? 'col-span-2 border-t border-slate-200 pt-3 dark:border-slate-700' : ''}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className={`mt-1 break-words tabular-nums text-slate-900 dark:text-white ${index === 2 ? 'text-lg font-medium' : 'text-sm'}`}>{formatCurrency(Number(value), locale, currency)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3">{renderWarnings(line)}{renderActions(line)}</div>
          </li>;
        })}
      </ul>
      {lines.length === 0 ? <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{text.noMatches}</div> : null}
      {pageCount > 1 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>{totalFiltered} {text.results}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || busy} onClick={onPreviousPage} className="min-h-11 rounded-lg border border-slate-200 px-3 disabled:opacity-40 dark:border-slate-700">{text.previous}</button>
          <span>{page} / {pageCount}</span>
          <button type="button" disabled={page >= pageCount || busy} onClick={onNextPage} className="min-h-11 rounded-lg border border-slate-200 px-3 disabled:opacity-40 dark:border-slate-700">{text.next}</button>
        </div>
      </div> : null}
    </section>
  );
}
