import { useEffect, useState } from 'react';
import {
  Check,
  Compass,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { IndiceModalFrame } from '../../components/indice-modal';
import { cn } from '../../components/ui/utils';
import { useLanguage } from '../../shared/context';
import type { LearningModeSettings } from '../preferences';
import { getLearningModeSettingsCopy } from '../settingsCopy';

const JOURNEY_STAGE_COUNT = 6;

type LearningModeSettingsModalProps = {
  currentSettings: LearningModeSettings;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: LearningModeSettings) => void;
  open: boolean;
};

function PreferenceSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn('relative shrink-0', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span className="block h-7 w-12 rounded-full border border-slate-300 bg-slate-200 transition peer-checked:border-[var(--indice-brand-action)] peer-checked:bg-[var(--indice-brand-action)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--indice-brand-action)] peer-focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-700" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
    </label>
  );
}

export function LearningModeSettingsModal({
  currentSettings,
  onOpenChange,
  onSave,
  open,
}: LearningModeSettingsModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = getLearningModeSettingsCopy(currentLanguage.code);
  const [draft, setDraft] = useState<LearningModeSettings>(currentSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(currentSettings);
      setSaving(false);
    }
  }, [currentSettings.active, currentSettings.step, currentSettings.visible, open]);

  const safeStep = Math.min(
    Math.max(Math.trunc(draft.step), 0),
    JOURNEY_STAGE_COUNT - 1,
  );
  const currentStage = safeStep + 1;
  const progress = Math.round((currentStage / JOURNEY_STAGE_COUNT) * 100);
  const preview = !draft.active
    ? copy.previewInactive
    : draft.visible
      ? copy.previewWithJourney
      : copy.previewModules;

  const handleSave = () => {
    setSaving(true);
    onSave({
      ...draft,
      step: safeStep,
    });
    window.requestAnimationFrame(() => {
      setSaving(false);
      onOpenChange(false);
    });
  };

  return (
    <IndiceModalFrame
      open={open}
      busy={saving}
      onOpenChange={onOpenChange}
      modalType="standard-form"
      contentClassName="sm:max-w-2xl"
      tone="blue"
      icon={<GraduationCap className="h-5 w-5" />}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      footerSummary={copy.footerSummary}
      footer={(
        <>
          <button type="button" onClick={() => onOpenChange(false)} disabled={saving}>
            {copy.cancel}
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center gap-2">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? copy.saving : copy.save}
          </button>
        </>
      )}
    >
      <section className={cn(
        'rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-900',
        draft.active
          ? 'border-[var(--indice-brand-action)] ring-1 ring-[var(--indice-brand-action)]/20'
          : 'border-slate-200 dark:border-slate-700',
      )}>
        <div className="flex items-center gap-4">
          <span className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl',
            draft.active
              ? 'bg-[var(--indice-brand-soft)] shadow-inner'
              : 'bg-slate-100 grayscale dark:bg-slate-800',
          )} aria-hidden="true">
            🎓
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.activeLabel}</h3>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                draft.active
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
              )}>
                {draft.active ? copy.activeState : copy.inactiveState}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.activeDescription}</p>
          </div>
          <PreferenceSwitch
            checked={draft.active}
            label={copy.activeLabel}
            onChange={(active) => setDraft((current) => ({ ...current, active }))}
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className={cn(
          'rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-900',
          draft.active && draft.visible
            ? 'border-blue-300 dark:border-blue-700'
            : 'border-slate-200 dark:border-slate-700',
        )}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--indice-brand-action)] dark:bg-blue-950/60">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.journeyTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.journeyDescription}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{copy.journeyLabel}</p>
              {!draft.active ? <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{copy.journeyDisabledHint}</p> : null}
            </div>
            <PreferenceSwitch
              checked={draft.visible}
              disabled={!draft.active}
              label={copy.journeyLabel}
              onChange={(visible) => setDraft((current) => ({ ...current, visible }))}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg dark:bg-amber-950/40" aria-hidden="true">
              🧭
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.progressTitle}</h3>
                <span className="text-xs font-semibold text-[var(--indice-brand-action)]">
                  {copy.stageLabel(currentStage, JOURNEY_STAGE_COUNT)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.progressDescription}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[var(--indice-brand-action)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setDraft((current) => ({ ...current, step: 0 }))}
            disabled={safeStep === 0}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
            title={copy.restartHint}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.restart}
          </button>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 dark:border-blue-800 dark:from-blue-950/50 dark:to-slate-900" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--indice-brand-action)] shadow-sm dark:bg-slate-900">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.previewTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{preview}</p>
          </div>
        </div>
      </section>
    </IndiceModalFrame>
  );
}
