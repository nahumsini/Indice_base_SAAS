import { Globe2, Landmark, MapPinned, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollSetupGuideCopy } from '../translations/types';

type PayrollSetupGuideProps = {
  copy: PayrollSetupGuideCopy;
  isBusy: boolean;
  onOpenPreferences: () => void;
};

const setupModeIcons = {
  single: Globe2,
  unit: MapPinned,
  business: Landmark,
} as const;

export function PayrollSetupGuide({
  copy,
  isBusy,
  onOpenPreferences,
}: PayrollSetupGuideProps) {
  const setupModes = [
    { key: 'single', ...copy.modes.single, Icon: setupModeIcons.single },
    { key: 'unit', ...copy.modes.unit, Icon: setupModeIcons.unit },
    { key: 'business', ...copy.modes.business, Icon: setupModeIcons.business },
  ] as const;

  return (
    <section className="mb-6 rounded-2xl border border-[#143675]/20 bg-white p-6 shadow-sm dark:border-blue-300/25 dark:bg-slate-800">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#143675] dark:text-blue-200">
            {copy.eyebrow}
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
            {copy.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {copy.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={isBusy}
            onClick={onOpenPreferences}
            className="h-11 gap-2 rounded-xl border-[#143675]/25 bg-white text-[#143675] hover:bg-[#143675]/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-300/30 dark:bg-slate-900 dark:text-blue-100"
          >
            <Settings className="h-4 w-4" />
            {copy.configurePreferences}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {setupModes.map((mode) => (
          <div key={mode.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#143675]/10 text-[#143675] dark:bg-blue-400/10 dark:text-blue-200">
                <mode.Icon className="h-5 w-5" />
              </span>
              <h4 className="text-base font-bold text-slate-950 dark:text-white">{mode.title}</h4>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{mode.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
