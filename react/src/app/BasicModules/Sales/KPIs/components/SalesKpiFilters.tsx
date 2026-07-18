import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from '../../components/SalesFilterBar';
import type { SalesKpisTranslations } from '../translations';

type SalesKpiFilterOption = {
  id: string;
  name: string;
};

export function SalesKpiFilters({
  businessFilter,
  businessUnitFilter,
  businesses,
  copy,
  search,
  sellerFilter,
  sellers,
  units,
  onBusinessChange,
  onBusinessUnitChange,
  onSearchChange,
  onSellerChange,
}: {
  businessFilter: string;
  businessUnitFilter: string;
  businesses: SalesKpiFilterOption[];
  copy: SalesKpisTranslations;
  search: string;
  sellerFilter: string;
  sellers: string[];
  units: SalesKpiFilterOption[];
  onBusinessChange: (value: string) => void;
  onBusinessUnitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSellerChange: (value: string) => void;
}) {
  return (
    <SalesFilterBar
      title={copy.filters.title}
      gridClassName="xl:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]"
    >
      <SalesFilterSearch
        label={copy.filters.search}
        value={search}
        onValueChange={onSearchChange}
        placeholder={copy.filters.searchPlaceholder}
      />
      <SalesFilterSelect
        label={copy.filters.unit}
        value={businessUnitFilter}
        onValueChange={onBusinessUnitChange}
        options={[
          { value: 'all', label: copy.filters.allUnits },
          ...units.map((unit) => ({ value: unit.id, label: unit.name })),
        ]}
      />
      <SalesFilterSelect
        label={copy.filters.business}
        value={businessFilter}
        onValueChange={onBusinessChange}
        options={[
          { value: 'all', label: copy.filters.allBusinesses },
          ...businesses.map((business) => ({ value: business.id, label: business.name })),
        ]}
      />
      <SalesFilterSelect
        label={copy.filters.seller}
        value={sellerFilter}
        onValueChange={onSellerChange}
        options={[
          { value: 'all', label: copy.filters.allSellers },
          ...sellers.map((seller) => ({ value: seller, label: seller })),
        ]}
      />
    </SalesFilterBar>
  );
}
