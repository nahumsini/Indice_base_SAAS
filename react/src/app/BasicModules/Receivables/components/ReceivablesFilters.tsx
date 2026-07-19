import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../components/frontend-os';
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
  businessOptions: string[];
  copy: ReceivablesTranslations;
  filters: FilterState;
  statusOptions: Array<{ value: string; label: string }>;
  unitOptions: string[];
  onChange: (filters: FilterState) => void;
}

export function ReceivablesFilters({
  businessOptions,
  copy,
  filters,
  statusOptions,
  unitOptions,
  onChange,
}: ReceivablesFiltersProps) {
  return (
    <IndiceFilterBar className="mb-6" gridClassName="xl:grid-cols-5" title={copy.filters.title}>
        <IndiceFilterSearch
          label={copy.filters.search}
          onValueChange={(search) => onChange({ ...filters, search })}
          placeholder={copy.filters.searchPlaceholder}
          tone="green"
          value={filters.search}
        />
        <FilterSelect
          label={copy.filters.period}
          value={filters.period}
          onChange={(value) => onChange({ ...filters, period: value as PeriodFilter })}
          options={periodFilterValues.map((period) => ({
            value: period,
            label: copy.filters.periodOptions[period],
          }))}
        />
        <FilterSelect
          label={copy.filters.status}
          value={filters.status}
          onChange={(value) => onChange({ ...filters, status: value })}
          options={[{ value: 'all', label: copy.filters.all }, ...statusOptions]}
        />
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
    </IndiceFilterBar>
  );
}
