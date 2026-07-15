import { Search, SlidersHorizontal } from 'lucide-react';
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#B63B32] dark:text-[#FFB0AA]">
        <SlidersHorizontal className="h-4 w-4" />
        {copy.filters.title}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={copy.filters.searchPlaceholder}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <select
          value={businessUnitFilter}
          onChange={(event) => onBusinessUnitChange(event.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="all">{copy.filters.allUnits}</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.name}</option>
          ))}
        </select>

        <select
          value={businessFilter}
          onChange={(event) => onBusinessChange(event.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="all">{copy.filters.allBusinesses}</option>
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>{business.name}</option>
          ))}
        </select>

        <select
          value={sellerFilter}
          onChange={(event) => onSellerChange(event.target.value)}
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          <option value="all">{copy.filters.allSellers}</option>
          {sellers.map((seller) => (
            <option key={seller} value={seller}>{seller}</option>
          ))}
        </select>
      </div>
    </section>
  );
}
