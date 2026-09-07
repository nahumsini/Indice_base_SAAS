import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Gift, LoaderCircle, PlugZap, RefreshCw } from 'lucide-react';
import {
  humanResourcesApi,
  type PayrollLineIncentiveCandidate,
  type PayrollRunDetailResponse,
  type PayrollRunLine,
  type PayrollRunSummary,
} from '../../../../../api/humanResources';
import type { PayrollRunWorkspaceText } from './payrollRunWorkspaceText';

type PayrollIncentiveSelectorProps = {
  line: PayrollRunLine;
  locale: string;
  onApplied: (detail: PayrollRunDetailResponse) => void;
  run: PayrollRunSummary;
  text: PayrollRunWorkspaceText;
};

const formatCurrency = (value: number, locale: string, currency: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const toMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

export function PayrollIncentiveSelector({ line, locale, onApplied, run, text }: PayrollIncentiveSelectorProps) {
  const [items, setItems] = useState<PayrollLineIncentiveCandidate[]>([]);
  const [editable, setEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await humanResourcesApi.listPayrollRunLineIncentives(run.id, line.id);
      setItems(response.items);
      setEditable(response.editable);
    } catch (error) {
      setErrorMessage(toMessage(error, text.incentiveLoadError));
    } finally {
      setIsLoading(false);
    }
  }, [line.id, run.id, text.incentiveLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderedItems = useMemo(() => [...items].sort((left, right) => {
    if (left.applied_to_line !== right.applied_to_line) return left.applied_to_line ? -1 : 1;
    if (left.connector_status !== right.connector_status) return left.connector_status === 'ready' ? -1 : 1;
    return left.name.localeCompare(right.name, locale);
  }), [items, locale]);

  const apply = async (item: PayrollLineIncentiveCandidate) => {
    if (!editable || !item.can_apply || applyingId !== null) return;
    setApplyingId(item.application_id);
    setErrorMessage('');
    try {
      const detail = await humanResourcesApi.applyPayrollRunLineIncentive(run.id, line.id, item.application_id);
      onApplied(detail);
      await load();
    } catch (error) {
      setErrorMessage(toMessage(error, text.incentiveApplyError));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
              <Gift className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-medium text-slate-900 dark:text-white">{text.incentives}</h3>
              <p className="mt-0.5 truncate text-sm font-normal text-slate-500 dark:text-slate-400">{line.user_name}</p>
              <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{text.incentiveSourceNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading || applyingId !== null}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {text.refresh}
          </button>
        </div>
      </div>

      {!editable ? (
        <div className="mx-5 mt-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-normal text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200">
          {run.status === 'draft' ? text.incentivePermissionLocked : text.incentiveRunLocked}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mx-5 mt-4 shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-normal text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-normal text-slate-500 dark:text-slate-400">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {text.loadingIncentives}
          </div>
        ) : orderedItems.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center dark:border-slate-700">
            <Gift className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{text.noIncentives}</p>
            <p className="mt-1 max-w-xl text-xs font-normal text-slate-500 dark:text-slate-400">{text.noIncentivesDescription}</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {orderedItems.map((item) => {
              const isKpiPending = item.connector_status === 'awaiting_kpi_connector';
              const isFundShortageDeduction = item.incentive_type === 'external_deduction'
                && item.source_type === 'petty_cash_shortage';
              const isApplying = applyingId === item.application_id;
              return (
                <article key={item.application_id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.name}</h4>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">{item.incentive_code}</span>
                      </div>
                      {item.description ? <p className="mt-1 line-clamp-2 text-xs font-normal text-slate-500 dark:text-slate-400">{item.description}</p> : null}
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(item.amount, locale, item.currency_code || line.currency_code || 'USD')}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-normal">
                      <span className="rounded-full bg-white px-2 py-1 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {isFundShortageDeduction
                          ? text.fundShortageDeduction
                          : item.incentive_type === 'kpi' ? text.kpiIncentive : text.manualIncentive}
                      </span>
                      {item.applied_to_line ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                          <Check className="h-3.5 w-3.5" />{text.incentiveApplied}
                        </span>
                      ) : isKpiPending ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-950/30 dark:text-violet-200">
                          <PlugZap className="h-3.5 w-3.5" />{text.kpiConnectorPending}
                        </span>
                      ) : (
                        <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200">{text.incentiveAvailable}</span>
                      )}
                    </div>

                    {!item.applied_to_line ? (
                      <button
                        type="button"
                        disabled={!editable || !item.can_apply || applyingId !== null}
                        onClick={() => void apply(item)}
                        title={isKpiPending ? text.kpiConnectorDescription : undefined}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#59C3A5] px-3 text-xs font-medium text-white shadow-sm transition hover:bg-[#3EAF91] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                      >
                        {isApplying ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                        {isKpiPending ? text.kpiConnectorPending : text.applyIncentive}
                      </button>
                    ) : null}
                  </div>
                  {isKpiPending ? <p className="mt-2 text-xs font-normal text-violet-700 dark:text-violet-200">{text.kpiConnectorDescription}</p> : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
