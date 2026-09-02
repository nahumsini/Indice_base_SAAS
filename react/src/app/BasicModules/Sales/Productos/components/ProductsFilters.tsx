import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { ProductsTranslations } from '../translations';
import { useEffect, useState } from 'react';
import {
  IndiceFilterAdvancedSection,
  IndiceFilterDisclosureActions,
  useIndiceFilterDisclosureCopy,
} from '../../../../components/frontend-os';

type ProductFilterOption = {
  value: string;
  label: string;
};

type ProductsFiltersProps = {
  t: ProductsTranslations;
  search: string;
  categoryFilter: string;
  typeFilter: string;
  statusFilter: string;
  readinessFilter: string;
  categoryOptions: ProductFilterOption[];
  typeOptions: ProductFilterOption[];
  statusOptions: ProductFilterOption[];
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onReadinessFilterChange: (value: string) => void;
};

export function ProductsFilters({
  t,
  search,
  categoryFilter,
  typeFilter,
  statusFilter,
  readinessFilter,
  categoryOptions,
  typeOptions,
  statusOptions,
  onSearchChange,
  onCategoryFilterChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onReadinessFilterChange,
}: ProductsFiltersProps) {
  const disclosureCopy = useIndiceFilterDisclosureCopy();
  const advancedCount = Number(categoryFilter !== 'all') + Number(typeFilter !== 'all');
  const [showAdvanced, setShowAdvanced] = useState(advancedCount > 0);
  useEffect(() => { if (advancedCount > 0) setShowAdvanced(true); }, [advancedCount]);
  const hasActiveFilters = Boolean(search) || statusFilter !== 'all' || readinessFilter !== 'all' || advancedCount > 0;
  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    onReadinessFilterChange('all');
    onCategoryFilterChange('all');
    onTypeFilterChange('all');
  };

  return (
    <SalesFilterBar
      title={t.filters.title}
      gridClassName="lg:grid-cols-[1.4fr_repeat(2,minmax(0,1fr))]"
      summary={<IndiceFilterDisclosureActions activeAdvancedCount={advancedCount} advancedLabel={disclosureCopy.moreFilters} clearLabel={disclosureCopy.clearFilters} hasActiveFilters={hasActiveFilters} isAdvancedOpen={showAdvanced} onClear={clearFilters} onToggleAdvanced={() => setShowAdvanced((current) => !current)} tone="coral" />}
    >
      <SalesFilterSearch
        label={t.filters.search}
        value={search}
        onValueChange={onSearchChange}
        placeholder={t.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={t.filters.status}
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={statusOptions}
      />
      <SalesFilterSelect
        label={t.filters.readiness}
        value={readinessFilter}
        onValueChange={onReadinessFilterChange}
        options={[
          { value: 'all', label: t.filters.allReadiness },
          { value: 'READY', label: t.filters.readinessOptions.READY },
          { value: 'REQUIRES_REVIEW', label: t.filters.readinessOptions.REQUIRES_REVIEW },
          { value: 'NOT_READY', label: t.filters.readinessOptions.NOT_READY },
        ]}
      />
      {showAdvanced ? <IndiceFilterAdvancedSection className="md:col-span-2 lg:col-span-3" gridClassName="lg:grid-cols-2">
      <SalesFilterSelect
        label={t.filters.category}
        value={categoryFilter}
        onValueChange={onCategoryFilterChange}
        options={categoryOptions}
      />
      <SalesFilterSelect
        label={t.filters.type}
        value={typeFilter}
        onValueChange={onTypeFilterChange}
        options={typeOptions}
      />
      </IndiceFilterAdvancedSection> : null}
    </SalesFilterBar>
  );
}

export type { ProductFilterOption };
