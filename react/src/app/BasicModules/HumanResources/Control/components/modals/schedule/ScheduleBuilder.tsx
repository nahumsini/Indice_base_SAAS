import { useMemo } from 'react';
import { Button } from '../../../../../../components/ui/button';
import type {
  AttendanceControlLocation,
  AttendanceControlTemplate,
} from '../../../../../../api/humanResources';
import type { ControlTranslations } from '../../../translations';
import type {
  HorarioDiaDraft,
  OperationalScheduleSummary,
  ScheduleBuilderStep,
  ScheduleLocationRule,
  ScheduleMode,
} from '../../../types/scheduleTypes';
import { getScheduleBuilderSteps } from '../../../utils/scheduleFormatters';
import { ScheduleReviewStep } from './ScheduleReviewStep';
import { ScheduleRulesStep } from './ScheduleRulesStep';
import { ScheduleSetupStep } from './ScheduleSetupStep';
import { ScheduleWorkflowTabs } from './ScheduleWorkflowTabs';
import { ScheduleWorkdaysStep } from './ScheduleWorkdaysStep';

export function ScheduleBuilder({
  activeStep,
  copy,
  employeeBusinessLocationSummary,
  exactLocationOptions,
  exactLocationWarning,
  effectiveStartDate,
  horarios,
  isDeletingTemplate,
  isOpenSchedule,
  isSubmitting,
  locationRule,
  locationScopeFallbackMessage,
  locationScopeSummary,
  operationalSummary,
  selectedEmployeeBusinessWarning,
  selectedEmployeeCount,
  selectedScheduleTemplateId,
  selectedTemplateName,
  templates,
  toleranciaIngreso,
  ubicacionSeleccionada,
  onCopyMondayToAllDays,
  onDeleteSelectedTemplate,
  onHorarioChange,
  onLocationRuleChange,
  onModeChange,
  onOpenSaveTemplateModal,
  onStepChange,
  onResetSchedule,
  onScheduleTemplateChange,
  onToleranciaIngresoChange,
  onUbicacionSeleccionadaChange,
  onWorkingDayChange,
}: {
  activeStep: ScheduleBuilderStep;
  copy: ControlTranslations;
  employeeBusinessLocationSummary: string;
  exactLocationOptions: AttendanceControlLocation[];
  exactLocationWarning: string;
  effectiveStartDate: string;
  horarios: HorarioDiaDraft[];
  isDeletingTemplate: boolean;
  isOpenSchedule: boolean;
  isSubmitting: boolean;
  locationRule: ScheduleLocationRule;
  locationScopeFallbackMessage: string;
  locationScopeSummary: string;
  operationalSummary: OperationalScheduleSummary;
  selectedEmployeeBusinessWarning: string;
  selectedEmployeeCount: number;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  templates: AttendanceControlTemplate[];
  toleranciaIngreso: number;
  ubicacionSeleccionada: string;
  onCopyMondayToAllDays: () => void;
  onDeleteSelectedTemplate: () => void;
  onHorarioChange: (index: number, field: keyof HorarioDiaDraft, value: string | number | boolean) => void;
  onLocationRuleChange: (value: string) => void;
  onModeChange: (value: ScheduleMode) => void;
  onOpenSaveTemplateModal: () => void;
  onStepChange: (step: ScheduleBuilderStep) => void;
  onResetSchedule: () => void;
  onScheduleTemplateChange: (value: string) => void;
  onToleranciaIngresoChange: (value: number) => void;
  onUbicacionSeleccionadaChange: (value: string) => void;
  onWorkingDayChange: (index: number, isWorkingDay: boolean) => void;
}) {
  const scheduleBuilderSteps = useMemo(() => getScheduleBuilderSteps(copy.schedule), [copy]);
  const activeTemplates = templates.filter((template) => template.status !== 'inactive');
  const currentStepIndex = scheduleBuilderSteps.findIndex((step) => step.id === activeStep);
  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex >= 0 && currentStepIndex < scheduleBuilderSteps.length - 1;

  const goBack = () => {
    if (!canGoBack) {
      return;
    }
    onStepChange(scheduleBuilderSteps[currentStepIndex - 1].id);
  };

  const goNext = () => {
    if (!canGoNext) {
      return;
    }
    onStepChange(scheduleBuilderSteps[currentStepIndex + 1].id);
  };

  return (
    <section aria-labelledby="schedule-details-heading" className="flex min-h-full flex-col gap-5">
      <div className="rounded-lg border border-[#59C3A5]/20 bg-blue-50/60 p-4 shadow-sm dark:border-[#8FE0CA]/30 dark:bg-blue-950/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="schedule-details-heading" className="text-sm font-medium text-slate-950 dark:text-white">
              {copy.schedule.builder.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {copy.schedule.builder.description}
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#59C3A5] shadow-sm dark:bg-slate-950 dark:text-[#8FE0CA]">
            {currentStepIndex + 1}/{scheduleBuilderSteps.length}
          </span>
        </div>

        <ScheduleWorkflowTabs activeStep={activeStep} copy={copy} onStepChange={onStepChange} />
      </div>

      {activeStep === 'setup' ? (
        <ScheduleSetupStep
          activeTemplates={activeTemplates}
          copy={copy}
          isDeletingTemplate={isDeletingTemplate}
          isOpenSchedule={isOpenSchedule}
          isSubmitting={isSubmitting}
          selectedScheduleTemplateId={selectedScheduleTemplateId}
          selectedTemplateName={selectedTemplateName}
          onDeleteSelectedTemplate={onDeleteSelectedTemplate}
          onModeChange={onModeChange}
          onResetSchedule={onResetSchedule}
          onScheduleTemplateChange={onScheduleTemplateChange}
        />
      ) : null}

      {activeStep === 'workdays' ? (
        <ScheduleWorkdaysStep
          copy={copy}
          horarios={horarios}
          isOpenSchedule={isOpenSchedule}
          onCopyMondayToAllDays={onCopyMondayToAllDays}
          onHorarioChange={onHorarioChange}
          onWorkingDayChange={onWorkingDayChange}
        />
      ) : null}

      {activeStep === 'rules' ? (
        <ScheduleRulesStep
          copy={copy}
          employeeBusinessLocationSummary={employeeBusinessLocationSummary}
          exactLocationOptions={exactLocationOptions}
          exactLocationWarning={exactLocationWarning}
          isOpenSchedule={isOpenSchedule}
          locationRule={locationRule}
          locationScopeFallbackMessage={locationScopeFallbackMessage}
          locationScopeSummary={locationScopeSummary}
          selectedEmployeeBusinessWarning={selectedEmployeeBusinessWarning}
          toleranciaIngreso={toleranciaIngreso}
          ubicacionSeleccionada={ubicacionSeleccionada}
          onLocationRuleChange={onLocationRuleChange}
          onToleranciaIngresoChange={onToleranciaIngresoChange}
          onUbicacionSeleccionadaChange={onUbicacionSeleccionadaChange}
        />
      ) : null}

      {activeStep === 'review' ? (
        <ScheduleReviewStep
          copy={copy}
          effectiveStartDate={effectiveStartDate}
          horarios={horarios}
          isOpenSchedule={isOpenSchedule}
          isSubmitting={isSubmitting}
          locationRule={locationRule}
          operationalSummary={operationalSummary}
          selectedEmployeeCount={selectedEmployeeCount}
          selectedTemplateName={selectedTemplateName}
          toleranciaIngreso={toleranciaIngreso}
          onOpenSaveTemplateModal={onOpenSaveTemplateModal}
        />
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={!canGoBack}
          className="rounded-md"
        >
          {copy.schedule.builder.back}
        </Button>
        <div className="min-w-0 text-center text-xs text-slate-500 dark:text-slate-400">
          {operationalSummary.compact}
        </div>
        <Button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-md bg-[#59C3A5] text-slate-950 hover:bg-[#3AAE90]"
        >
          {canGoNext ? copy.schedule.builder.continue : copy.schedule.builder.readyToSave}
        </Button>
      </div>
    </section>
  );
}
