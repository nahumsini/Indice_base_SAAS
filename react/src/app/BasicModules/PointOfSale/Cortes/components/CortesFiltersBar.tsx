import {
  getIndiceFilterControlClassName,
  IndiceFilterBar,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from '../../../../components/frontend-os';
import {
  type CortesDifferenceFilter,
  type CortesFilters,
  type CortesPeriodFilter,
  getCortesPeriodRange,
} from '../utils/cortesUtils';
import type { CortesCopy } from '../cortesTranslations';

export type CortesFilterOption = {
  label: string;
  value: string;
};

interface CortesFiltersBarProps {
  cashiers: CortesFilterOption[];
  cashRegisters: CortesFilterOption[];
  copy: CortesCopy;
  filters: CortesFilters;
  onChange: <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => void;
  warehouses: CortesFilterOption[];
}

export function CortesFiltersBar({
  cashiers,
  cashRegisters,
  copy,
  filters,
  onChange,
  warehouses,
}: CortesFiltersBarProps) {
  const handlePeriodChange = (period: CortesPeriodFilter) => {
    onChange('period', period);

    if (period !== 'custom') {
      const range = getCortesPeriodRange(period);
      onChange('dateFrom', range.dateFrom);
      onChange('dateTo', range.dateTo);
    }
  };

  const handleCustomDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    onChange('period', 'custom');
    onChange(key, value);
  };

  return (
    <IndiceFilterBar
      title={copy.filters.title}
      gridClassName="lg:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_repeat(4,minmax(9rem,1fr))]"
    >
      <IndiceFilterSearch
        label={copy.filters.search}
        value={filters.search}
        onValueChange={(value) => onChange('search', value)}
        onClear={() => onChange('search', '')}
        clearLabel={copy.filters.search}
        placeholder={copy.filters.searchPlaceholder}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.period}
        value={filters.period}
        options={periodOptions(copy)}
        onValueChange={(value) => handlePeriodChange(value as CortesPeriodFilter)}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.warehouse}
        value={filters.warehouseId || 'all'}
        options={[allOption(copy.common.all), ...warehouses]}
        onValueChange={(value) => onChange('warehouseId', value === 'all' ? '' : value)}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.cashRegister}
        value={filters.cashRegisterId || 'all'}
        options={[allOption(copy.common.all), ...cashRegisters]}
        onValueChange={(value) => onChange('cashRegisterId', value === 'all' ? '' : value)}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.cashier}
        value={filters.userId || 'all'}
        options={[allOption(copy.common.all), ...cashiers]}
        onValueChange={(value) => onChange('userId', value === 'all' ? '' : value)}
        tone="coral"
      />

      {filters.period === 'custom' ? (
        <>
          <DateInput label={copy.filters.from} value={filters.dateFrom} onChange={(value) => handleCustomDateChange('dateFrom', value)} />
          <DateInput label={copy.filters.to} value={filters.dateTo} onChange={(value) => handleCustomDateChange('dateTo', value)} />
        </>
      ) : null}
    </IndiceFilterBar>
  );
}

const periodOptions = (copy: CortesCopy): Array<{ label: string; value: CortesPeriodFilter }> => [
  { label: copy.filters.periods.today, value: 'today' },
  { label: copy.filters.periods.yesterday, value: 'yesterday' },
  { label: copy.filters.periods.week, value: 'week' },
  { label: copy.filters.periods.month, value: 'month' },
  { label: copy.filters.periods.custom, value: 'custom' },
];

const differenceOptions: Array<{ label: string; value: CortesDifferenceFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Cuadrados', value: 'balanced' },
  { label: 'Con diferencia', value: 'withDifference' },
  { label: 'Faltantes', value: 'short' },
  { label: 'Sobrantes', value: 'over' },
];

const allOption = (label: string): CortesFilterOption => ({ label, value: 'all' });

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <IndiceFilterField label={label}>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={getIndiceFilterControlClassName('coral')}
      />
    </IndiceFilterField>
  );
}
