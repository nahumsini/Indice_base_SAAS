import type { ReactNode } from 'react';
import { Building2, Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceTitleBar } from '../../../../components/frontend-os';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';

export type ProvidersHeaderVariant = 'finance' | 'sales';

const headerVariantStyles: Record<ProvidersHeaderVariant, {
  addButton: string;
  columnsButton: string;
}> = {
  finance: {
    addButton: 'bg-[#147514] text-white hover:bg-[#105010]',
    columnsButton: 'text-[#147514] hover:bg-[#147514] hover:text-white',
  },
  sales: {
    addButton: 'bg-[#FF6B5E] text-[#222831] hover:bg-[#E8564B]',
    columnsButton: 'text-[#B63B32] hover:bg-[#FF6B5E] hover:text-[#222831] dark:text-[#FFD8D4]',
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
  const headerIcon = icon ?? <Building2 className="h-5 w-5" />;
  const actionLayout = (
    <>
      <Button variant="outline" className={`h-11 w-full justify-center gap-2 rounded-lg border-slate-200 bg-white px-4 text-sm font-medium shadow-none dark:border-slate-700 dark:bg-slate-800 sm:w-auto ${styles.columnsButton}`} onClick={onConfigureColumns}>
        <Columns3 className="h-4 w-4" />
        {t.common.columns}
      </Button>
      <Button className={`h-11 w-full justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm sm:w-auto ${styles.addButton}`} onClick={onAddProvider}>
        <Plus className="h-4 w-4" />
        {t.providers.add}
      </Button>
    </>
  );

  return (
    <IndiceTitleBar actions={actionLayout} icon={headerIcon} subtitle={subtitle ?? t.providers.headerSubtitle} title={title ?? t.providers.headerTitle} tone={variant === 'sales' ? 'coral' : 'green'} />
  );
}
