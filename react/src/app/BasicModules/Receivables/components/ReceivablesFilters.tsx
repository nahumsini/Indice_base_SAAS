import {
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../components/frontend-os';
import { useEffect, useState, type ReactNode } from 'react';
import {
  periodFilterValues,
  type FilterState,
} from '../constants/receivables.constants';
import type { ReceivablesTranslations } from '../translations';
import type { PeriodFilter } from '../types';

interface FilterSelectProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}

export function FilterSelect({
  label,
  options,
  value,
  onChange,
}: FilterSelectProps) {
  return (
    <IndiceFilterSelect
      label={label}
      onValueChange={onChange}
      options={options}
      tone="green"
      value={value}
    />
  );
}

interface ReceivablesFiltersProps {
  advancedContent?: ReactNode;
  businessOptions: string[];
  copy: ReceivablesTranslations;
  extraAdvancedFilterCount?: number;
  filters: FilterState;
  resultLabel?: string;
  statusOptions: Array<{ value: string; label: string }>;
  unitOptions: string[];
  showOrganization?: boolean;
  showPeriod?: boolean;
  showStatus?: boolean;
  onChange: (filters: FilterState) => void;
  onClearAdvanced?: () => void;
}

export function ReceivablesFilters({
  advancedContent,
  businessOptions,
  copy,
  extraAdvancedFilterCount = 0,
  filters,
  resultLabel,
  statusOptions,
  unitOptions,
  showOrganization = true,
  showPeriod = true,
  showStatus = true,
  onChange,
  onClearAdvanced,
}: ReceivablesFiltersProps) {
  const organizationFilterCount = showOrganization
    ? [filters.unit !== 'all', filters.business !== 'all'].filter(Boolean).length
    : 0;
  const advancedFilterCount = organizationFilterCount + extraAdvancedFilterCount;
  const hasAdvancedFilters = showOrganization || Boolean(advancedContent);
  const hasActiveFilters = Boolean(
    filters.search
    || (showPeriod && filters.period !== 'all')
    || (showStatus && filters.status !== 'all')
    || advancedFilterCount > 0,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [advancedFilterCount]);

  const clearFilters = () => {
    onChange({ search: '', period: 'all', status: 'all', unit: 'all', business: 'all' });
    onClearAdvanced?.();
    setShowAdvancedFilters(false);
  };
  const primaryColumnCount = 1 + Number(showPeriod) + Number(showStatus);
  const primaryGridClassName = primaryColumnCount === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2';

  return (
    <IndiceFilterBar
      className="mb-6"
      gridClassName={primaryGridClassName}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={advancedFilterCount}
          advancedLabel={showAdvancedFilters ? copy.filters.hideMore : copy.filters.more}
          clearLabel={copy.filters.clear}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={clearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(current => !current)}
          resultSummary={resultLabel ? (
            <span className="rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-[#147514] dark:border-emerald-900/50 dark:bg-emerald-400/10 dark:text-emerald-300">
              {resultLabel}
            </span>
          ) : undefined}
          showAdvancedToggle={hasAdvancedFilters}
          tone="green"
        />
      )}
      title={copy.filters.title}
    >
        <IndiceFilterSearch
          label={copy.filters.search}
          onClear={() => onChange({ ...filters, search: '' })}
          onValueChange={(search) => onChange({ ...filters, search })}
          placeholder={copy.filters.searchPlaceholder}
          tone="green"
          value={filters.search}
        />
        {showPeriod ? (
          <FilterSelect
            label={copy.filters.period}
            value={filters.period}
            onChange={(value) => onChange({ ...filters, period: value as PeriodFilter })}
            options={periodFilterValues.map((period) => ({
              value: period,
              label: copy.filters.periodOptions[period],
            }))}
          />
        ) : null}
        {showStatus ? (
          <FilterSelect
            label={copy.filters.status}
            value={filters.status}
            onChange={(value) => onChange({ ...filters, status: value })}
            options={[{ value: 'all', label: copy.filters.all }, ...statusOptions]}
          />
        ) : null}
        {hasAdvancedFilters && showAdvancedFilters ? (
          <IndiceFilterAdvancedSection
            className={primaryColumnCount === 3 ? 'md:col-span-2 xl:col-span-3' : 'md:col-span-2 xl:col-span-2'}
            gridClassName={showOrganization && advancedContent ? 'xl:grid-cols-4' : 'xl:grid-cols-2'}
          >
            {showOrganization ? (
              <>
                <FilterSelect
                  label={copy.filters.unit}
                  value={filters.unit}
                  onChange={(value) => onChange({ ...filters, unit: value })}
                  options={[{ value: 'all', label: copy.filters.allUnits }, ...unitOptions.map((unit) => ({ value: unit, label: unit }))]}
                />
                <FilterSelect
                  label={copy.filters.business}
                  value={filters.business}
                  onChange={(value) => onChange({ ...filters, business: value })}
                  options={[{ value: 'all', label: copy.filters.all }, ...businessOptions.map((business) => ({ value: business, label: business }))]}
                />
              </>
            ) : null}
            {advancedContent}
          </IndiceFilterAdvancedSection>
        ) : null}
    </IndiceFilterBar>
  );
}
