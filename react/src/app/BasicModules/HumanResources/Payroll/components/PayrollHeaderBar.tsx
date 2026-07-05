import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { PayrollHeaderCopy } from '../translations/types';

type PayrollHeaderBarProps = {
  copy: PayrollHeaderCopy;
  isBusy: boolean;
  isRegenerating: boolean;
  onRegenerateRuns: () => void;
  onOpenPreferences: () => void;
};

export function PayrollHeaderBar({
  copy,
  isBusy,
  isRegenerating,
  onRegenerateRuns,
  onOpenPreferences,
}: PayrollHeaderBarProps) {
  return (
    <section className="mb-6 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-4 shadow-sm dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10 sm:p-6">
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

        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onRegenerateRuns}
            className="h-11 w-full justify-center gap-2 rounded-xl border-[#59C3A5]/40 bg-white px-5 text-sm font-semibold text-[#177d66] shadow-sm transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/10 hover:text-[#102d63] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#59C3A5]/40 dark:bg-slate-900 dark:text-[#7ce0c4] dark:hover:bg-[#59C3A5]/10 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {copy.regenerateRuns}
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={onOpenPreferences}
            className="h-11 w-full justify-center gap-2 rounded-xl bg-[#59C3A5] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(89,195,165,0.24)] transition hover:bg-[#102d63] hover:shadow-[0_12px_28px_rgba(89,195,165,0.30)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Settings className="h-4 w-4" />
            {copy.preferences}
          </Button>
        </div>
      </div>
    </section>
  );
}
