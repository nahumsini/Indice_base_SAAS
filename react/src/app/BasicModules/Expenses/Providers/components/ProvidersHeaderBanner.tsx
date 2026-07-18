import type { ReactNode } from 'react';
import { Building2, Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import { LearningModeTitleBarBridge } from '../../../../learningMode';

export type ProvidersHeaderVariant = 'finance' | 'sales';

const headerVariantStyles: Record<ProvidersHeaderVariant, {
  addButton: string;
  banner: string;
  columnsButton: string;
  icon: string;
}> = {
  finance: {
    addButton: 'bg-[#147514] hover:bg-[#105010]',
    banner: 'border-[#147514]/20 bg-[#147514]/10 dark:border-emerald-400/20 dark:bg-emerald-400/10',
    columnsButton: 'text-[#147514] hover:bg-[#147514] hover:text-white',
    icon: 'text-[#147514]',
  },
  sales: {
    addButton: 'bg-[#FF6B5E] hover:bg-[#E8564B]',
    banner: 'border-[#FF6B5E]/25 bg-[#FF6B5E]/10 dark:border-[#FFB4AD]/20 dark:bg-[#FF6B5E]/10',
    columnsButton: 'text-[#B63B32] hover:bg-[#FF6B5E] hover:text-white dark:text-[#FFD8D4]',
    icon: 'text-[#B63B32] dark:text-[#FFD8D4]',
  },
};

export function ProvidersHeaderBanner({
  icon,
  onAddProvider,
  onConfigureColumns,
  subtitle,
  title,
  variant = 'finance',
}: {
  icon?: ReactNode;
  onAddProvider: () => void;
  onConfigureColumns: () => void;
  subtitle?: string;
  title?: string;
  variant?: ProvidersHeaderVariant;
}) {
  const t = useProvidersTranslations();
  const styles = headerVariantStyles[variant];
  const useRhIndent = variant === 'sales';
  const headerIcon = icon ?? <Building2 className="h-5 w-5" />;
  const actionLayout = (
    <div className={`${useRhIndent ? 'flex w-full flex-wrap items-center gap-3 sm:w-auto lg:justify-end' : 'grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center'}`}>
      <Button variant="outline" className={`h-11 w-full justify-center gap-2 rounded-lg border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-700 dark:bg-slate-800 sm:w-auto ${styles.columnsButton}`} onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />
        {t.common.columns}
      </Button>
      <Button className={`h-11 w-full justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm sm:w-auto ${styles.addButton}`} onClick={onAddProvider}>
        <Plus className="h-4 w-4" />
        {t.providers.add}
      </Button>
    </div>
  );

  return (
    <LearningModeTitleBarBridge actions={actionLayout}>
    <div className={`${useRhIndent ? 'rounded-lg border p-6' : 'rounded-lg border px-4 py-4 sm:px-6 sm:py-5'} shadow-sm ${styles.banner}`}>
      <div className={`flex flex-col gap-4 lg:flex-row lg:justify-between ${useRhIndent ? 'lg:items-start' : 'lg:items-center'}`}>
        <div className="min-w-0">
          <h2 className={`flex min-w-0 items-center gap-2 text-slate-900 dark:text-white ${useRhIndent ? 'mb-1 text-2xl font-semibold leading-tight' : 'text-2xl font-bold sm:text-[28px]'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-white/80 leading-none ${styles.icon}`} aria-hidden="true">
              {headerIcon}
            </span>
            {title ?? t.providers.headerTitle}
          </h2>
          <p className={`${useRhIndent ? 'text-sm leading-6' : 'mt-2 text-sm'} text-slate-600 dark:text-slate-400`}>
            {subtitle ?? t.providers.headerSubtitle}
          </p>
        </div>

        {actionLayout}
      </div>
    </div>
    </LearningModeTitleBarBridge>
  );
}
