import { useEffect, useState } from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type { AttendanceControlTemplate } from '../../../../../../api/humanResources';
import { defaultScheduleTemplateName } from '../../../constants/scheduleConstants';
import type { ControlTranslations } from '../../../translations';
import type { ScheduleMode } from '../../../types/scheduleTypes';

type ScheduleSetupSource = 'template' | 'manual';

interface ScheduleSetupStepProps {
  activeTemplates: AttendanceControlTemplate[];
  copy: ControlTranslations;
  isDeletingTemplate: boolean;
  isOpenSchedule: boolean;
  isSubmitting: boolean;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  onDeleteSelectedTemplate: () => void;
  onModeChange: (value: ScheduleMode) => void;
  onResetSchedule: () => void;
  onScheduleTemplateChange: (value: string) => void;
}

export function ScheduleSetupStep({
  activeTemplates,
  copy,
  isDeletingTemplate,
  isOpenSchedule,
  isSubmitting,
  selectedScheduleTemplateId,
  selectedTemplateName,
  onDeleteSelectedTemplate,
  onModeChange,
  onResetSchedule,
  onScheduleTemplateChange,
}: ScheduleSetupStepProps) {
  const [setupSource, setSetupSource] = useState<ScheduleSetupSource>(
    selectedScheduleTemplateId ? 'template' : 'manual'
  );
  const hasTemplates = activeTemplates.length > 0;

  useEffect(() => {
    if (selectedScheduleTemplateId) {
      setSetupSource('template');
    }
  }, [selectedScheduleTemplateId]);

  const chooseTemplateSource = () => {
    if (!hasTemplates) {
      return;
    }
    setSetupSource('template');
  };

  const chooseManualSource = () => {
    setSetupSource('manual');
    if (selectedScheduleTemplateId) {
      onResetSchedule();
    }
  };

  const handleTemplateChange = (value: string) => {
    if (!value) {
      setSetupSource('manual');
    } else {
      setSetupSource('template');
    }
    onScheduleTemplateChange(value);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.setup.eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {copy.schedule.setup.description}
          </p>
        </div>
        <ScheduleSourceSelector
          copy={copy}
          hasTemplates={hasTemplates}
          setupSource={setupSource}
          onManualSelect={chooseManualSource}
          onTemplateSelect={chooseTemplateSource}
        />
      </div>

      {setupSource === 'template' ? (
        <ScheduleTemplateSelector
          activeTemplates={activeTemplates}
          copy={copy}
          isDeletingTemplate={isDeletingTemplate}
          isSubmitting={isSubmitting}
          selectedScheduleTemplateId={selectedScheduleTemplateId}
          selectedTemplateName={selectedTemplateName}
          onDeleteSelectedTemplate={onDeleteSelectedTemplate}
          onScheduleTemplateChange={handleTemplateChange}
        />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ScheduleTypeSelector
            copy={copy}
            isOpenSchedule={isOpenSchedule}
            onModeChange={onModeChange}
          />
        </div>
      )}
    </section>
  );
}

function ScheduleSourceSelector({
  copy,
  hasTemplates,
  setupSource,
  onManualSelect,
  onTemplateSelect,
}: {
  copy: ControlTranslations;
  hasTemplates: boolean;
  setupSource: ScheduleSetupSource;
  onManualSelect: () => void;
  onTemplateSelect: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <SourceOptionButton
        description={hasTemplates ? copy.schedule.setup.sourceTemplateDescription : copy.schedule.setup.sourceTemplateUnavailable}
        isDisabled={!hasTemplates}
        isSelected={setupSource === 'template'}
        title={copy.schedule.setup.sourceTemplateTitle}
        onClick={onTemplateSelect}
      />
      <SourceOptionButton
        description={copy.schedule.setup.sourceManualDescription}
        isSelected={setupSource === 'manual'}
        title={copy.schedule.setup.sourceManualTitle}
        onClick={onManualSelect}
      />
    </div>
  );
}

function SourceOptionButton({
  description,
  isDisabled = false,
  isSelected,
  title,
  onClick,
}: {
  description: string;
  isDisabled?: boolean;
  isSelected: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`rounded-lg border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
        isSelected
          ? 'border-[#59C3A5] bg-white ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
          : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          isSelected ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
        }`}
        >
          {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

function ScheduleTypeSelector({
  copy,
  isOpenSchedule,
  onModeChange,
}: {
  copy: ControlTranslations;
  isOpenSchedule: boolean;
  onModeChange: (value: ScheduleMode) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{copy.schedule.setup.scheduleType}</span>
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange('strict')}
          className={`rounded-lg border p-4 text-left transition-all ${
            !isOpenSchedule
              ? 'border-[#59C3A5] bg-white ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
              : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              !isOpenSchedule ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
            >
              {!isOpenSchedule ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.strictTitle}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {copy.schedule.setup.strictDescription}
              </p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('open')}
          className={`rounded-lg border p-4 text-left transition-all ${
            isOpenSchedule
              ? 'border-[#59C3A5] bg-white ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
              : 'border-slate-200 bg-white/80 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              isOpenSchedule ? 'border-[#59C3A5] bg-[#59C3A5] text-white' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
            }`}
            >
              {isOpenSchedule ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.setup.openTitle}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {copy.schedule.setup.openDescription}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function ScheduleTemplateSelector({
  activeTemplates,
  copy,
  isDeletingTemplate,
  isSubmitting,
  selectedScheduleTemplateId,
  selectedTemplateName,
  onDeleteSelectedTemplate,
  onScheduleTemplateChange,
}: {
  activeTemplates: AttendanceControlTemplate[];
  copy: ControlTranslations;
  isDeletingTemplate: boolean;
  isSubmitting: boolean;
  selectedScheduleTemplateId: number | null;
  selectedTemplateName: string;
  onDeleteSelectedTemplate: () => void;
  onScheduleTemplateChange: (value: string) => void;
}) {
  const canDeleteSelectedTemplate = Boolean(selectedScheduleTemplateId) && !isDeletingTemplate && !isSubmitting;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.schedule.template.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.schedule.template.description}</p>
        </div>
        <span className="inline-flex max-w-[14rem] shrink-0 truncate rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:bg-blue-950/40 dark:text-[#8FE0CA]">
          {selectedTemplateName === defaultScheduleTemplateName ? copy.schedule.defaultTemplateName : selectedTemplateName}
        </span>
      </div>
      <select
        value={selectedScheduleTemplateId ? String(selectedScheduleTemplateId) : ''}
        onChange={(event) => onScheduleTemplateChange(event.target.value)}
        disabled={isDeletingTemplate || isSubmitting}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        <option value="">{copy.schedule.defaultTemplateOption}</option>
        {activeTemplates.map((template) => (
          <option key={template.id} value={template.id}>{template.name}</option>
        ))}
      </select>
      <details className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
        <summary className="cursor-pointer text-xs font-semibold text-slate-500 dark:text-slate-400">
          {copy.schedule.template.manage}
        </summary>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {selectedScheduleTemplateId
              ? copy.schedule.template.removeSelected
              : copy.schedule.template.selectToRemove}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDeleteSelectedTemplate}
            disabled={!canDeleteSelectedTemplate}
            className="shrink-0 gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 disabled:text-slate-400 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingTemplate ? copy.schedule.template.removing : copy.schedule.template.remove}
          </Button>
        </div>
      </details>
    </div>
  );
}
