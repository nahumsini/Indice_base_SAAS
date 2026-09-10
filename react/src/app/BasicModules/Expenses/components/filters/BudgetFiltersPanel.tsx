import {
  getIndiceFilterControlClassName,
  IndiceFilterAdvancedSection,
  IndiceFilterBar,
  IndiceFilterDisclosureActions,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../../components/frontend-os';
import { useEffect, useState } from 'react';
import type { BudgetFutureFilter } from '../../Budgets/useBudgetLogic';
import { useBudgetsTranslations } from '../../Budgets/hooks/useBudgetsTranslations';
import type { FinanceReferenceOption } from '../../types/finance-reference.types';
import type { Provider } from '../../types/expenses.types';

type BudgetFiltersPanelProps = {
  accountingAccountFilter: string;
  accountingAccountOptions: FinanceReferenceOption[];
  businessOptions: FinanceReferenceOption[];
  businessFilter: string;
  businessUnitFilter: string;
  businessUnitOptions: FinanceReferenceOption[];
  customEndDate: string;
  customStartDate: string;
  futureFilter: BudgetFutureFilter;
  healthFilter: string;
  healthOptions: FinanceReferenceOption[];
  providerFilter: string;
  providers: Provider[];
  resultCount: number;
  searchTerm: string;
  statusFilter: string;
  statusOptions: FinanceReferenceOption[];
  onAccountingAccountChange: (value: string) => void;
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onCustomStartDateChange: (value: string) => void;
  onFutureFilterChange: (value: BudgetFutureFilter) => void;
  onHealthChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export function BudgetFiltersPanel({
  accountingAccountFilter,
  accountingAccountOptions,
  businessOptions,
  businessFilter,
  businessUnitFilter,
  businessUnitOptions,
  customEndDate,
  customStartDate,
  futureFilter,
  healthFilter,
  healthOptions,
  providerFilter,
  providers,
  resultCount,
  searchTerm,
  statusFilter,
  statusOptions,
  onAccountingAccountChange,
  onBusinessChange,
  onBusinessUnitChange,
  onCustomEndDateChange,
  onCustomStartDateChange,
  onFutureFilterChange,
  onHealthChange,
  onProviderChange,
  onSearchChange,
  onStatusChange,
}: BudgetFiltersPanelProps) {
  const t = useBudgetsTranslations();
  const advancedFilterCount = [
    businessUnitFilter !== 'all',
    businessFilter !== 'all',
    providerFilter !== 'all',
    accountingAccountFilter !== 'all',
  ].filter(Boolean).length;
  const hasActiveFilters = Boolean(
    searchTerm
    || futureFilter !== 'next_month'
    || healthFilter !== 'all'
    || statusFilter !== 'all'
    || advancedFilterCount > 0,
  );
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFilterCount > 0);

  useEffect(() => {
    if (advancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [advancedFilterCount]);

  const clearFilters = () => {
    onSearchChange('');
    onFutureFilterChange('next_month');
    onCustomStartDateChange('');
    onCustomEndDateChange('');
    onHealthChange('all');
    onStatusChange('all');
    onBusinessUnitChange('all');
    onBusinessChange('all');
    onProviderChange('all');
    onAccountingAccountChange('all');
    setShowAdvancedFilters(false);
  };

  return (
    <IndiceFilterBar
      gridClassName="md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      subtitle={t.budgets.filters.defaultHelp}
      summary={(
        <IndiceFilterDisclosureActions
          activeAdvancedCount={advancedFilterCount}
          advancedLabel={showAdvancedFilters ? t.common.hideMoreFilters : t.common.moreFilters}
          clearLabel={t.common.clearFilters}
          hasActiveFilters={hasActiveFilters}
          isAdvancedOpen={showAdvancedFilters}
          onClear={clearFilters}
          onToggleAdvanced={() => setShowAdvancedFilters(current => !current)}
          resultSummary={(
            <span className="inline-flex rounded-full border border-[#147514]/15 bg-[#147514]/10 px-3 py-1 text-xs text-[#147514] dark:text-emerald-300">
              {t.common.results(resultCount)}
            </span>
          )}
          tone="green"
        />
      )}
      title={t.filters.title}
    >
      <IndiceFilterSearch
        clearLabel={t.budgets.filters.clearSearch}
        label={t.common.search}
        onClear={() => onSearchChange('')}
        onValueChange={onSearchChange}
        placeholder={t.budgets.filters.searchPlaceholder}
        tone="green"
        value={searchTerm}
      />
      <IndiceFilterSelect
        label={t.budgets.filters.futurePeriod}
        onValueChange={(value) => onFutureFilterChange(value as BudgetFutureFilter)}
        options={[
          { value: 'this_month', label: t.budgets.filters.thisMonth },
          { value: 'next_month', label: t.budgets.filters.nextMonth },
          { value: 'next_quarter', label: t.budgets.filters.nextQuarter },
          { value: 'custom', label: t.budgets.filters.customFutureRange },
        ]}
        tone="green"
        value={futureFilter}
      />
      {futureFilter === 'custom' ? (
        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-4">
          <DateField label={t.budgets.filters.from} onChange={onCustomStartDateChange} value={customStartDate} />
          <DateField label={t.budgets.filters.to} onChange={onCustomEndDateChange} value={customEndDate} />
        </div>
      ) : null}
      <IndiceFilterSelect label={t.budgets.health} onValueChange={onHealthChange} options={healthOptions} tone="green" value={healthFilter} />
      <IndiceFilterSelect label={t.filters.status} onValueChange={onStatusChange} options={statusOptions} tone="green" value={statusFilter} />
      {showAdvancedFilters ? (
        <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3 xl:col-span-4">
          <IndiceFilterSelect label={t.filters.unit} onValueChange={onBusinessUnitChange} options={businessUnitOptions} tone="green" value={businessUnitFilter} />
          <IndiceFilterSelect label={t.filters.business} onValueChange={onBusinessChange} options={businessOptions} tone="green" value={businessFilter} />
          <IndiceFilterSelect
            label={t.filters.provider}
            onValueChange={onProviderChange}
            options={[{ value: 'all', label: t.common.all }, ...providers.map(provider => ({ value: provider.id, label: provider.name }))]}
            tone="green"
            value={providerFilter}
          />
          <IndiceFilterSelect label={t.budgets.filters.accountingAccount} onValueChange={onAccountingAccountChange} options={accountingAccountOptions} tone="green" value={accountingAccountFilter} />
        </IndiceFilterAdvancedSection>
      ) : null}
    </IndiceFilterBar>
  );
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <IndiceFilterField label={label}>
      <input className={getIndiceFilterControlClassName('green')} onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </IndiceFilterField>
  );
}
