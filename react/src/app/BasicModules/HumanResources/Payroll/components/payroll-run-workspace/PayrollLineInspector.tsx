import {
  AlertTriangle,
  Gift,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import type {
  PayrollLineItem,
  PayrollManualItemPayload,
  PayrollRunLine,
} from '../../../../../api/humanResources';
import type { PayrollTranslations } from '../../translations';
import {
  normalizePayrollTreatmentValue,
  type PayrollLineDraft,
} from './payrollRunWorkspaceModel';
import type { PayrollRunWorkspaceText } from './payrollRunWorkspaceText';

export type PayrollInspectorView = 'breakdown' | 'deductions' | 'adjustments';

type PayrollLineInspectorProps = {
  copy: PayrollTranslations;
  currencyFallback: string;
  draft: PayrollLineDraft | null;
  isDirty: boolean;
  isEditable: boolean;
  line: PayrollRunLine | null;
  locale: string;
  onChangeDraft: (draft: PayrollLineDraft) => void;
  text: PayrollRunWorkspaceText;
  view: PayrollInspectorView;
};

const formatCurrency = (value: number, locale: string, currency: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const itemSourceLabel = (item: PayrollLineItem, copy: PayrollTranslations) => {
  if (item.source_type === 'manual') return copy.labels.sourceManual;
  if (item.source_type === 'computed_tax') return copy.labels.sourceTax;
  if (item.source_type === 'incentive') return copy.labels.sourceIncentive;
  if (item.source_type === 'adjustment') return copy.labels.sourceAdjustment;
  return copy.labels.sourceComputed;
};

const itemSourceClassName = (item: PayrollLineItem) => {
  if (item.source_type === 'manual') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
  if (item.source_type === 'computed_tax') return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200';
  if (item.source_type === 'incentive') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200';
  if (item.source_type === 'adjustment') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200';
  return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const categoryLabel = (category: PayrollManualItemPayload['category'], copy: PayrollTranslations) => (
  copy.itemCategories[category] ?? category
);

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${emphasis
      ? 'border-[#59C3A5]/35 bg-[#59C3A5]/10'
      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
    }`}
    >
      <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function OverviewTab({
  copy,
  currency,
  line,
  locale,
  text,
}: {
  copy: PayrollTranslations;
  currency: string;
  line: PayrollRunLine;
  locale: string;
  text: PayrollRunWorkspaceText;
}) {
  const attendanceWarnings = line.attendance_warnings ?? [];
  const calculationWarnings = line.calculation_warnings ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Metric label={copy.labels.gross} value={formatCurrency(line.gross_amount, locale, currency)} />
        <Metric label={copy.labels.deductions} value={formatCurrency(line.deductions_amount, locale, currency)} />
        <Metric label={copy.labels.net} value={formatCurrency(line.net_amount, locale, currency)} emphasis />
      </div>

      <section>
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">{text.attendancePeriod}</h4>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={copy.labels.daysPayable} value={String(line.days_payable)} />
          <Metric label={copy.labels.regularHours} value={String(line.regular_hours)} />
          <Metric label={copy.labels.overtimeHours} value={String(line.overtime_hours)} />
          <Metric label={copy.labels.lateCount} value={String(line.late_count)} />
          <Metric label={copy.labels.leaveDays} value={String(line.leave_days)} />
          <Metric label={copy.labels.absenceDays} value={String(line.absence_days)} />
          <Metric label={copy.labels.noAttendanceRecords} value={String(line.missing_attendance_days ?? 0)} />
          <Metric label={copy.labels.salaryType} value={line.salary_type === 'daily' ? copy.labels.daily : copy.labels.hourly} />
        </div>
      </section>

      {attendanceWarnings.length > 0 || calculationWarnings.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/25">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {text.reviewRequired}
          </div>
          <ul className="mt-2 space-y-1 pl-6 text-xs font-normal text-amber-800 dark:text-amber-200">
            {[...attendanceWarnings, ...calculationWarnings].map((warning, index) => (
              <li key={`${warning}-${index}`} className="list-disc">{warning}</li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-normal text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200">
          {text.noLineWarnings}
        </div>
      )}
    </div>
  );
}

function ConceptsTab({
  copy,
  currency,
  line,
  locale,
}: {
  copy: PayrollTranslations;
  currency: string;
  line: PayrollRunLine;
  locale: string;
}) {
  if (line.items.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-normal text-slate-500 dark:border-slate-700">{copy.labels.noItems}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">{copy.labels.description}</th>
            <th className="px-3 py-3">{copy.labels.category}</th>
            <th className="px-4 py-3 text-right">{copy.labels.amount}</th>
          </tr>
        </thead>
        <tbody>
          {line.items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900 dark:text-white">{item.label || item.code}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${itemSourceClassName(item)}`}>
                    {itemSourceLabel(item, copy)}
                  </span>
                  <span className="text-xs font-normal text-slate-400">{item.code}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                {copy.itemCategories[item.category as keyof typeof copy.itemCategories] ?? item.category}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(item.amount, locale, item.currency_code || currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualItemsEditor({
  addLabel,
  allowedCategories,
  copy,
  defaultCategory,
  description,
  draft,
  emptyText,
  heading,
  isEditable,
  onChangeDraft,
  text,
}: {
  addLabel: string;
  allowedCategories: readonly PayrollManualItemPayload['category'][];
  copy: PayrollTranslations;
  defaultCategory: PayrollManualItemPayload['category'];
  description: string;
  draft: PayrollLineDraft;
  emptyText: string;
  heading: string;
  isEditable: boolean;
  onChangeDraft: (draft: PayrollLineDraft) => void;
  text: PayrollRunWorkspaceText;
}) {
  const inputClassName = 'h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
  const visibleItems = draft.manual_items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => allowedCategories.includes(item.category));
  const addItem = () => onChangeDraft({
    ...draft,
    manual_items: [...draft.manual_items, { category: defaultCategory, label: '', amount: 0 }],
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-900 dark:text-white">{heading}</h4>
          <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {isEditable ? (
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {visibleItems.length > 0 ? visibleItems.map(({ item, index }) => (
          <div
            key={`${item.category}-${index}`}
            className={`grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60 ${allowedCategories.length === 1
              ? 'sm:grid-cols-[minmax(0,1fr)_130px_auto]'
              : 'sm:grid-cols-[170px_minmax(0,1fr)_130px_auto]'
            }`}
          >
            {allowedCategories.length > 1 ? (
              <select
                value={item.category}
                disabled={!isEditable}
                onChange={(event) => onChangeDraft({
                  ...draft,
                  manual_items: draft.manual_items.map((current, currentIndex) => currentIndex === index
                    ? { ...current, category: event.target.value as PayrollManualItemPayload['category'] }
                    : current),
                })}
                className={inputClassName}
              >
                {allowedCategories.map((category) => (
                  <option key={category} value={category}>{categoryLabel(category, copy)}</option>
                ))}
              </select>
            ) : null}
              <input
                value={item.label}
                disabled={!isEditable}
                placeholder={copy.labels.description}
                onChange={(event) => onChangeDraft({
                  ...draft,
                  manual_items: draft.manual_items.map((current, currentIndex) => currentIndex === index
                    ? { ...current, label: event.target.value }
                    : current),
                })}
                className={inputClassName}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.amount}
                disabled={!isEditable}
                onChange={(event) => onChangeDraft({
                  ...draft,
                  manual_items: draft.manual_items.map((current, currentIndex) => currentIndex === index
                    ? { ...current, amount: Number(event.target.value) }
                    : current),
                })}
                className={inputClassName}
              />
              {isEditable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={text.removeAdjustment}
                  title={text.removeAdjustment}
                  onClick={() => onChangeDraft({
                    ...draft,
                    manual_items: draft.manual_items.filter((_, currentIndex) => currentIndex !== index),
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {emptyText}
            </div>
          )}
        </div>
    </section>
  );
}

function DeductionsTab({
  copy,
  currency,
  draft,
  isEditable,
  line,
  locale,
  onChangeDraft,
  text,
}: {
  copy: PayrollTranslations;
  currency: string;
  draft: PayrollLineDraft;
  isEditable: boolean;
  line: PayrollRunLine;
  locale: string;
  onChangeDraft: (draft: PayrollLineDraft) => void;
  text: PayrollRunWorkspaceText;
}) {
  const calculatedItems = line.items.filter((item) => item.category === 'deduction' && item.source_type !== 'manual');
  const originalManualTotal = line.items
    .filter((item) => item.category === 'deduction' && item.source_type === 'manual')
    .reduce((total, item) => total + item.amount, 0);
  const calculatedTotal = Math.max(0, line.deductions_amount - originalManualTotal);
  const manualTotal = draft.manual_items
    .filter((item) => item.category === 'deduction')
    .reduce((total, item) => total + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label={text.calculatedDeductions} value={formatCurrency(calculatedTotal, locale, currency)} />
        <Metric label={text.manualDiscounts} value={formatCurrency(manualTotal, locale, currency)} />
        <Metric label={text.deductionsTotal} value={formatCurrency(calculatedTotal + manualTotal, locale, currency)} emphasis />
      </div>

      <section>
        <h4 className="text-sm font-medium text-slate-900 dark:text-white">{text.calculatedDeductions}</h4>
        <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400">{text.calculatedDeductionsDescription}</p>
        {calculatedItems.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">{copy.labels.description}</th>
                  <th className="px-3 py-3">{copy.labels.category}</th>
                  <th className="px-4 py-3 text-right">{copy.labels.amount}</th>
                </tr>
              </thead>
              <tbody>
                {calculatedItems.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{item.label || item.code}</td>
                    <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{itemSourceLabel(item, copy)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(item.amount, locale, item.currency_code || currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-normal text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {text.noCalculatedDeductions}
          </div>
        )}
      </section>

      <ManualItemsEditor
        addLabel={text.addDeduction}
        allowedCategories={['deduction']}
        copy={copy}
        defaultCategory="deduction"
        description={text.manualDiscountsDescription}
        draft={draft}
        emptyText={text.noManualDiscounts}
        heading={text.manualDiscounts}
        isEditable={isEditable}
        onChangeDraft={onChangeDraft}
        text={text}
      />
    </div>
  );
}

function AdjustmentsTab({
  copy,
  draft,
  isEditable,
  onChangeDraft,
  text,
}: {
  copy: PayrollTranslations;
  draft: PayrollLineDraft;
  isEditable: boolean;
  onChangeDraft: (draft: PayrollLineDraft) => void;
  text: PayrollRunWorkspaceText;
}) {
  return (
    <div className="space-y-5">
      <ManualItemsEditor
        addLabel={text.addEarning}
        allowedCategories={['earning', 'employer_contribution', 'provision']}
        copy={copy}
        defaultCategory="earning"
        description={text.otherAdjustmentsDescription}
        draft={draft}
        emptyText={text.noOtherAdjustments}
        heading={text.otherAdjustments}
        isEditable={isEditable}
        onChangeDraft={onChangeDraft}
        text={text}
      />

      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {copy.labels.notes}
        <textarea
          value={draft.notes}
          disabled={!isEditable}
          onChange={(event) => onChangeDraft({ ...draft, notes: event.target.value })}
          className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </label>
    </div>
  );
}

export function PayrollLineInspector({
  copy,
  currencyFallback,
  draft,
  isDirty,
  isEditable,
  line,
  locale,
  onChangeDraft,
  text,
  view,
}: PayrollLineInspectorProps) {
  if (!line || !draft) {
    return (
      <section className="flex min-h-0 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm font-normal text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        {text.selectCollaborator}
      </section>
    );
  }

  const currency = line.currency_code || currencyFallback;
  const treatment = normalizePayrollTreatmentValue(draft.payroll_treatment, draft.include_in_fiscal);
  return (
    <section className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-medium text-slate-900 dark:text-white">{line.user_name}</h3>
              {isDirty ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">{text.dirty}</span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm font-normal text-slate-500 dark:text-slate-400">
              {line.position_title || '—'} · {line.department || '—'}
            </p>
            <p className="mt-1 truncate text-xs font-normal text-slate-400">
              {line.unit_name || copy.labels.noUnit} · {line.business_name || copy.labels.noBusiness}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-2.5 py-1 text-xs font-medium text-[#177D66] dark:text-[#B8F2E3]">
              {text.treatmentLabels[treatment]}
            </span>
          </div>
        </div>

      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {view === 'breakdown' ? (
          <div className="space-y-6">
            <OverviewTab copy={copy} currency={currency} line={line} locale={locale} text={text} />
            <section>
              <h4 className="mb-3 text-sm font-medium text-slate-900 dark:text-white">{text.concepts}</h4>
              <ConceptsTab copy={copy} currency={currency} line={line} locale={locale} />
            </section>
          </div>
        ) : null}
        {view === 'adjustments' ? (
          <AdjustmentsTab copy={copy} draft={draft} isEditable={isEditable} onChangeDraft={onChangeDraft} text={text} />
        ) : null}
        {view === 'deductions' ? (
          <DeductionsTab
            copy={copy}
            currency={currency}
            draft={draft}
            isEditable={isEditable}
            line={line}
            locale={locale}
            onChangeDraft={onChangeDraft}
            text={text}
          />
        ) : null}

        {line.items.some((item) => item.source_type === 'incentive') ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-normal text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{copy.labels.incentiveLockedNotice}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
