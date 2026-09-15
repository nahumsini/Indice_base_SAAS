import { useEffect, useState } from 'react';
import { Check, Columns2, LayoutPanelTop, LoaderCircle, PanelLeft } from 'lucide-react';
import { useLanguage } from '../../shared/context';
import { IndiceModalFrame } from '../indice-modal';
import { cn } from '../ui/utils';
import { useWorkbarLayout, type WorkbarPosition } from './WorkbarLayoutContext';
import { getWorkbarLayoutCopy } from './translations';

type WorkbarLayoutModalProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function LayoutPreview({ position }: { position: WorkbarPosition }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid h-28 overflow-hidden rounded-xl border border-blue-200 bg-slate-50 shadow-inner dark:border-blue-800 dark:bg-slate-950',
        position === 'top' ? 'grid-rows-[18px_28px_1fr]' : 'grid-cols-[42px_1fr] grid-rows-[18px_1fr]',
      )}
    >
      <div className={cn('bg-[var(--indice-brand-action)]', position === 'left' && 'col-span-2')} />
      <div className={cn(
        'border-blue-100 bg-white dark:border-slate-700 dark:bg-slate-800',
        position === 'top' ? 'border-b' : 'row-start-2 border-r',
      )}>
        <div className={cn('flex gap-1 p-2', position === 'left' ? 'flex-col' : 'items-center')}>
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className={cn(
                'rounded-full',
                item === 0 ? 'bg-amber-400' : 'bg-blue-100 dark:bg-blue-900/50',
                position === 'left' ? 'h-2 w-full' : 'h-2 w-8',
              )}
            />
          ))}
        </div>
      </div>
      <div className="m-2 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}

export function WorkbarLayoutModal({ onOpenChange, open }: WorkbarLayoutModalProps) {
  const { currentLanguage } = useLanguage();
  const {
    dualScreenAvailable,
    dualScreenEnabled,
    position,
    setDualScreenEnabled,
    setPosition,
  } = useWorkbarLayout();
  const [selectedPosition, setSelectedPosition] = useState<WorkbarPosition>(position);
  const [enableDualScreen, setEnableDualScreen] = useState(dualScreenEnabled);
  const [applying, setApplying] = useState(false);
  const copy = getWorkbarLayoutCopy(currentLanguage.code);

  useEffect(() => {
    if (open) {
      setSelectedPosition(position);
      setEnableDualScreen(dualScreenEnabled);
    }
  }, [dualScreenEnabled, open, position]);

  const applySelection = () => {
    setApplying(true);
    setPosition(selectedPosition);
    if (!dualScreenEnabled && enableDualScreen && dualScreenAvailable) {
      setDualScreenEnabled(true);
    }
    window.requestAnimationFrame(() => {
      setApplying(false);
      onOpenChange(false);
    });
  };

  return (
    <IndiceModalFrame
      open={open}
      busy={applying}
      onOpenChange={onOpenChange}
      modalType="standard-form"
      contentClassName="sm:max-w-2xl"
      tone="blue"
      icon={<PanelLeft className="h-5 w-5" />}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
      footer={(
        <>
          <button type="button" onClick={() => onOpenChange(false)} disabled={applying}>
            {copy.cancel}
          </button>
          <button type="button" onClick={applySelection} disabled={applying} className="inline-flex items-center justify-center gap-2">
            {applying ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {applying ? copy.applying : copy.apply}
          </button>
        </>
      )}
    >
      <fieldset>
        <legend className="sr-only">{copy.description}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {([
            { position: 'top' as const, label: copy.top, description: copy.topDescription, icon: LayoutPanelTop },
            { position: 'left' as const, label: copy.left, description: copy.leftDescription, icon: PanelLeft },
          ]).map((option) => {
            const selected = selectedPosition === option.position;
            const Icon = option.icon;
            return (
              <label
                key={option.position}
                className={cn(
                  'relative cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-[var(--indice-brand-action)] focus-within:ring-offset-2 dark:bg-slate-900',
                  selected
                    ? 'border-[var(--indice-brand-action)] ring-1 ring-[var(--indice-brand-action)]'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/20',
                )}
              >
                <input
                  type="radio"
                  name="workbar-position"
                  value={option.position}
                  checked={selected}
                  onChange={() => setSelectedPosition(option.position)}
                  className="sr-only"
                />
                <LayoutPreview position={option.position} />
                <div className="mt-4 flex items-start gap-3">
                  <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    selected ? 'bg-[var(--indice-brand-action)] text-white' : 'bg-blue-50 text-[var(--indice-brand-action)] dark:bg-blue-950/60',
                  )}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">
                      {option.label}
                      {selected ? <Check className="h-4 w-4 text-[var(--indice-brand-action)]" aria-hidden="true" /> : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {option.description}
                    </span>
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          {copy.responsive}
        </p>
      </fieldset>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--indice-brand-soft)] text-[var(--indice-brand-action)]">
            <Columns2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.dualScreenTitle}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.dualScreenDescription}</p>
          </div>
        </div>

        <label className={cn(
          'mt-4 flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 py-3 transition',
          dualScreenEnabled
            ? 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-soft)]'
            : dualScreenAvailable
              ? 'cursor-pointer border-slate-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-700'
              : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70 dark:border-slate-700 dark:bg-slate-800',
        )}>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-900 dark:text-white">
              {dualScreenEnabled ? copy.dualScreenActive : copy.dualScreenEnable}
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
              {dualScreenAvailable ? copy.dualScreenCloseHint : copy.dualScreenUnavailable}
            </span>
          </span>
          <span className={cn(
            'relative h-7 w-12 shrink-0 rounded-full border transition',
            enableDualScreen
              ? 'border-[var(--indice-brand-action)] bg-[var(--indice-brand-action)]'
              : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700',
          )}>
            <span className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition',
              enableDualScreen ? 'left-[22px]' : 'left-0.5',
            )} />
          </span>
          <input
            type="checkbox"
            checked={enableDualScreen}
            disabled={dualScreenEnabled || !dualScreenAvailable}
            onChange={(event) => setEnableDualScreen(event.target.checked)}
            className="sr-only"
          />
        </label>
      </section>
    </IndiceModalFrame>
  );
}
