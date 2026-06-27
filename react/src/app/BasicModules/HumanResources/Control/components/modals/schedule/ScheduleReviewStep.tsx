import { Save } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { defaultScheduleTemplateName } from '../../../constants/scheduleConstants';
import type { ControlTranslations } from '../../../translations';
import type {
  HorarioDiaDraft,
  OperationalScheduleSummary,
  ScheduleLocationRule,
} from '../../../types/scheduleTypes';
import { formatEffectiveDate } from '../../../utils/scheduleDates';
import { firstSharedMinutes } from '../../../utils/scheduleFormatters';

interface ScheduleReviewStepProps {
  copy: ControlTranslations;
  effectiveStartDate: string;
  horarios: HorarioDiaDraft[];
  isOpenSchedule: boolean;
  isSubmitting: boolean;
  locationRule: ScheduleLocationRule;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeCount: number;
  selectedTemplateName: string;
  toleranciaIngreso: number;
  onOpenSaveTemplateModal: () => void;
}

export function ScheduleReviewStep({
  copy,
  effectiveStartDate,
  horarios,
  isOpenSchedule,
  isSubmitting,
  locationRule,
  operationalSummary,
  selectedEmployeeCount,
  selectedTemplateName,
  toleranciaIngreso,
  onOpenSaveTemplateModal,
}: ScheduleReviewStepProps) {
  const mealMinutes = firstSharedMinutes(horarios, 'comida');
  const breakMinutes = firstSharedMinutes(horarios, 'descanso');
  const hasNoEmployees = selectedEmployeeCount === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.review.eyebrow}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.review.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.review.description}
        </p>
      </div>

      {hasNoEmployees ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
          {copy.schedule.review.selectCollaborator}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#59C3A5]/20 bg-blue-50 p-4 text-[#59C3A5] dark:border-[#8FE0CA]/30 dark:bg-blue-950/20 dark:text-blue-100">
        <p className="text-sm font-semibold">{copy.schedule.review.willApply}</p>
        <p className="mt-2 text-lg font-semibold leading-7">{operationalSummary.compact}</p>
      </div>

      <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {operationalSummary.reviewItems.map((item) => (
          <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{item.label}</span>
            <span className="text-sm font-medium text-slate-950 dark:text-white">{item.value}</span>
          </div>
        ))}
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{copy.schedule.summary.labels.breaks}</span>
          <span className="text-sm font-medium text-slate-950 dark:text-white">
            {copy.schedule.summary.breakSummary(mealMinutes, breakMinutes)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {copy.schedule.summary.existingSchedulesProtected(formatEffectiveDate(effectiveStartDate))}
        {isOpenSchedule ? ` ${copy.schedule.summary.openScheduleNote}` : ` ${copy.schedule.summary.strictScheduleNote(toleranciaIngreso)}`}
        {selectedTemplateName && selectedTemplateName !== defaultScheduleTemplateName ? ` ${copy.schedule.summary.templateNote(selectedTemplateName)}` : ''}
        {locationRule === 'open' ? ` ${copy.schedule.summary.noExactLocationNote}` : ''}
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.saveTemplate.title}</h4>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.helper}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenSaveTemplateModal}
            disabled={isSubmitting}
            className="shrink-0 gap-2 text-[#59C3A5] hover:text-[#59C3A5] dark:text-[#8FE0CA]"
          >
            <Save className="h-4 w-4" />
            {copy.schedule.setup.saveAsTemplate}
          </Button>
        </div>
      </div>
    </section>
  );
}
