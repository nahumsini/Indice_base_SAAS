import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

type IndiceAdminWorkspaceHeaderProps = {
  actions?: ReactNode;
  backBusy?: boolean;
  backDisabled?: boolean;
  backLabel: string;
  className?: string;
  icon: ReactNode;
  navigation?: ReactNode;
  onBack: () => void;
  subtitle: ReactNode;
  title: ReactNode;
};

/** Shared compact identity and navigation header for authenticated administrative workspaces. */
export function IndiceAdminWorkspaceHeader({
  actions,
  backBusy = false,
  backDisabled = false,
  backLabel,
  className,
  icon,
  navigation,
  onBack,
  subtitle,
  title,
}: IndiceAdminWorkspaceHeaderProps) {
  return (
    <section data-indice-admin-workspace-header className={cn('min-w-0', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={backDisabled}
          aria-label={backLabel}
          className="h-10 shrink-0 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:border-[var(--indice-brand-action)]/45 hover:bg-[var(--indice-brand-soft)] hover:text-[var(--indice-brand-action)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <ArrowLeft aria-hidden="true" className={cn('h-4 w-4 sm:mr-2', backBusy && 'animate-pulse')} />
          <span className="hidden sm:inline">{backLabel}</span>
        </Button>

        <div className="flex min-w-[min(100%,18rem)] flex-1 items-center gap-3">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#60A5FA] to-[var(--indice-brand-action)] text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.85)]" aria-hidden="true">
            <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
            <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white/80 bg-blue-200" />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-semibold text-slate-950 dark:text-white sm:text-lg">{title}</h1>
              <span className="hidden items-center gap-1.5 sm:inline-flex" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--indice-brand-action)]" />
              </span>
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        {actions ? <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">{actions}</div> : null}
      </div>

      {navigation ? (
        <div className="mt-3 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navigation}
        </div>
      ) : null}
    </section>
  );
}
