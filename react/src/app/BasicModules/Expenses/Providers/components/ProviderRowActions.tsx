import { CheckCircle2, Copy, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';

type ProviderRowActionsProps = {
  providerId: string;
  onActivateProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  onDuplicateProvider: (providerId: string) => void;
  onEditProvider: () => void;
};

const buttonBase = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/80';

export function ProviderRowActions({
  providerId,
  onActivateProvider,
  onDeleteProvider,
  onDuplicateProvider,
  onEditProvider,
}: ProviderRowActionsProps) {
  const t = useProvidersTranslations();

  return (
    <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
      <ActionButton label={t.common.duplicate} className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60" onClick={() => onDuplicateProvider(providerId)}><Copy className="h-4 w-4 text-blue-600" /></ActionButton>
      <ActionButton label={t.common.delete} className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60" onClick={() => onDeleteProvider(providerId)}><Trash2 className="h-4 w-4 text-red-600" /></ActionButton>
      <ActionButton label={t.providers.edit} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60" onClick={onEditProvider}><Pencil className="h-4 w-4 text-amber-600" /></ActionButton>
      <ActionButton label={t.common.active} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60" onClick={() => onActivateProvider(providerId)}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></ActionButton>
    </div>
  );
}

function ActionButton({ children, className, label, onClick }: { children: ReactNode; className: string; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`${buttonBase} ${className}`} title={label} aria-label={label} type="button">{children}</button>;
}
