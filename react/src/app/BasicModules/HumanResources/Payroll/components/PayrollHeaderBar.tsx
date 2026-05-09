import { Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollHeaderCopy } from '../translations/types';

type PayrollHeaderBarProps = {
  copy: PayrollHeaderCopy;
  isBusy: boolean;
  onOpenPreferences: () => void;
};

export function PayrollHeaderBar({
  copy,
  isBusy,
  onOpenPreferences,
}: PayrollHeaderBarProps) {
  return (
    <section className="mb-6 rounded-lg border border-[#143675]/20 bg-[#143675]/5 p-6 shadow-sm dark:border-[#143675]/30 dark:bg-[#143675]/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-950 dark:text-white">
            <span className="text-2xl">💰</span>
            {copy.title}
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {copy.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={isBusy}
            onClick={onOpenPreferences}
            className="h-11 gap-2 rounded-xl bg-[#143675] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(20,54,117,0.24)] transition hover:bg-[#102d63] hover:shadow-[0_12px_28px_rgba(20,54,117,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Settings className="h-4 w-4" />
            {copy.preferences}
          </Button>
        </div>
      </div>
    </section>
  );
}
