import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IndiceModuleTone } from '../../styles/moduleColors';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import { useLanguage } from '../../context/LanguageContext';

const disclosureCopyByLanguage = {
  en: { clearFilters: 'Clear filters', hideFilters: 'Hide filters', moreFilters: 'More filters' },
  es: { clearFilters: 'Limpiar filtros', hideFilters: 'Ocultar filtros', moreFilters: 'Más filtros' },
  fr: { clearFilters: 'Effacer les filtres', hideFilters: 'Masquer les filtres', moreFilters: 'Plus de filtres' },
  ko: { clearFilters: '필터 초기화', hideFilters: '필터 숨기기', moreFilters: '필터 더보기' },
  pt: { clearFilters: 'Limpar filtros', hideFilters: 'Ocultar filtros', moreFilters: 'Mais filtros' },
  zh: { clearFilters: '清除筛选条件', hideFilters: '隐藏筛选条件', moreFilters: '更多筛选条件' },
} as const;

/** Shared localized labels for the filter disclosure and factory reset controls. */
export function useIndiceFilterDisclosureCopy() {
  const { currentLanguage } = useLanguage();
  const language = currentLanguage.code.split('-')[0] as keyof typeof disclosureCopyByLanguage;
  return disclosureCopyByLanguage[language] ?? disclosureCopyByLanguage.en;
}

const activeCountClassNames: Record<IndiceModuleTone, string> = {
  aqua: 'bg-[#177D66] text-white',
  blue: 'bg-[var(--indice-brand-action)] text-[var(--indice-brand-shell-foreground)]',
  coral: 'bg-[#FF6B5E] text-[#222831]',
  gold: 'bg-[#C38A00] text-white',
  gray: 'bg-slate-700 text-white',
  green: 'bg-[#147514] text-white',
  orange: 'bg-[#FF6B5E] text-[#222831]',
  purple: 'bg-[var(--indice-brand-action)] text-[var(--indice-brand-shell-foreground)]',
  red: 'bg-[#EF4444] text-white',
  yellow: 'bg-[#C38A00] text-white',
};

export function IndiceFilterDisclosureActions({
  activeAdvancedCount,
  advancedLabel,
  clearLabel,
  hasActiveFilters,
  isAdvancedOpen,
  onClear,
  onToggleAdvanced,
  resultSummary,
  showAdvancedToggle = true,
  tone,
}: {
  activeAdvancedCount: number;
  advancedLabel: string;
  clearLabel: string;
  hasActiveFilters: boolean;
  isAdvancedOpen: boolean;
  onClear: () => void;
  onToggleAdvanced: () => void;
  resultSummary?: ReactNode;
  showAdvancedToggle?: boolean;
  tone: IndiceModuleTone;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {resultSummary ? <span>{resultSummary}</span> : null}
      {showAdvancedToggle ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          aria-expanded={isAdvancedOpen}
          onClick={onToggleAdvanced}
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          {advancedLabel}
          {activeAdvancedCount > 0 ? (
            <span className={cn('rounded-full px-1.5 py-0.5 text-xs leading-none', activeCountClassNames[tone])}>
              {activeAdvancedCount}
            </span>
          ) : null}
          {isAdvancedOpen
            ? <ChevronUp aria-hidden="true" className="h-4 w-4" />
            : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
        </Button>
      ) : null}
      {hasActiveFilters ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-3 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          onClick={onClear}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          {clearLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function IndiceFilterAdvancedSection({
  children,
  className,
  gridClassName,
}: {
  children: ReactNode;
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={cn('border-t border-slate-200 pt-4 dark:border-slate-700', className)}>
      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4', gridClassName)}>
        {children}
      </div>
    </div>
  );
}
