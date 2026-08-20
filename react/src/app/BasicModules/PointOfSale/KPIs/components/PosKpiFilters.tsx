import {
  getIndiceFilterControlClassName,
  IndiceFilterBar,
  IndiceFilterField,
  IndiceFilterSearch,
  IndiceFilterSelect,
  type IndiceFilterOption,
} from '../../../../components/frontend-os';
import type { PosKpiCopy } from '../posKpiTranslations';
import {
  getDateRangeForPeriod,
  type PosKpiFiltersState,
  type PosKpiPeriod,
} from '../utils/posKpiAnalytics';

export function PosKpiFilters({
  cashiers,
  cashRegisters,
  copy,
  filters,
  onChange,
  warehouses,
}: {
  cashiers: IndiceFilterOption[];
  cashRegisters: IndiceFilterOption[];
  copy: PosKpiCopy;
  filters: PosKpiFiltersState;
  onChange: <Key extends keyof PosKpiFiltersState>(key: Key, value: PosKpiFiltersState[Key]) => void;
  warehouses: IndiceFilterOption[];
}) {
  const allOption = { label: copy.common.all, value: 'all' };

  const handlePeriodChange = (value: string) => {
    const period = value as PosKpiPeriod;
    onChange('period', period);
    if (period !== 'custom') {
      const range = getDateRangeForPeriod(period);
      onChange('dateFrom', range.dateFrom);
      onChange('dateTo', range.dateTo);
    }
  };

  const handleDateChange = (key: 'dateFrom' | 'dateTo', value: string) => {
    onChange('period', 'custom');
    onChange(key, value);
  };

  return (
    <IndiceFilterBar
      title={copy.filters.title}
      gridClassName="lg:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_repeat(4,minmax(10rem,1fr))]"
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
        onValueChange={handlePeriodChange}
        options={[...copy.period.options]}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.warehouse}
        value={filters.warehouseId || 'all'}
        onValueChange={(value) => {
          onChange('warehouseId', value === 'all' ? '' : value);
          onChange('cashRegisterId', '');
        }}
        options={[allOption, ...warehouses]}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.cashRegister}
        value={filters.cashRegisterId || 'all'}
        onValueChange={(value) => onChange('cashRegisterId', value === 'all' ? '' : value)}
        options={[allOption, ...cashRegisters]}
        tone="coral"
      />
      <IndiceFilterSelect
        label={copy.filters.cashier}
        value={filters.userId || 'all'}
        onValueChange={(value) => onChange('userId', value === 'all' ? '' : value)}
        options={[allOption, ...cashiers]}
        tone="coral"
      />

      {filters.period === 'custom' ? (
        <>
          <DateInput label={copy.filters.from} value={filters.dateFrom} onChange={(value) => handleDateChange('dateFrom', value)} />
          <DateInput label={copy.filters.to} value={filters.dateTo} onChange={(value) => handleDateChange('dateTo', value)} />
        </>
      ) : null}
    </IndiceFilterBar>
  );
}

function DateInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
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
