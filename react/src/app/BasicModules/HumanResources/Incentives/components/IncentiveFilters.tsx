import { Search } from 'lucide-react';
import type { RHIncentivo } from '../../mockData';
import type { IncentivesTranslations } from '../translations';

interface IncentiveFiltersProps {
  copy: IncentivesTranslations;
  searchQuery: string;
  selectedStatus: 'all' | RHIncentivo['estado'];
  selectedType: 'all' | RHIncentivo['tipo'];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'all' | RHIncentivo['estado']) => void;
  onTypeChange: (value: 'all' | RHIncentivo['tipo']) => void;
}

export function IncentiveFilters({
  copy,
  searchQuery,
  selectedStatus,
  selectedType,
  onSearchChange,
  onStatusChange,
  onTypeChange,
}: IncentiveFiltersProps) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">{copy.filters.title}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {copy.filters.searchLabel}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy.filters.searchPlaceholder}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.type}</label>
          <select
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value as 'all' | RHIncentivo['tipo'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allTypes}</option>
            <option value="Automatizado">{copy.types.Automatizado}</option>
            <option value="Manual">{copy.types.Manual}</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.filters.status}</label>
          <select
            value={selectedStatus}
            onChange={(event) => onStatusChange(event.target.value as 'all' | RHIncentivo['estado'])}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">{copy.filters.allStatuses}</option>
            <option value="Activo">{copy.statuses.Activo}</option>
            <option value="Programado">{copy.statuses.Programado}</option>
            <option value="Pausado">{copy.statuses.Pausado}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
