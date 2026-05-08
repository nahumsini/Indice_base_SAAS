import { Search } from 'lucide-react';
import type { HrAssetStatus } from '../../../../api/HumanResources/assets';
import type { AddNewAssetOption, AddNewAssetType } from '../AddNewAssests';

type AssetTypeFilter = 'all' | AddNewAssetType;

interface AssetFiltersProps {
  searchQuery: string;
  statusFilter: 'all' | HrAssetStatus;
  typeFilter: AssetTypeFilter;
  unitFilter: string;
  unitOptions: AddNewAssetOption[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'all' | HrAssetStatus) => void;
  onTypeChange: (value: AssetTypeFilter) => void;
  onUnitChange: (value: string) => void;
}

export function AssetFilters({
  searchQuery,
  statusFilter,
  typeFilter,
  unitFilter,
  unitOptions,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onUnitChange,
}: AssetFiltersProps) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Filters</h3>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Search asset
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name, code, model or responsible"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Type</label>
          <select
            value={typeFilter}
            onChange={(event) => onTypeChange(event.target.value as AssetTypeFilter)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All types</option>
            <option value="laptop">Computer equipment</option>
            <option value="attendance">Attendance control</option>
            <option value="operations">Operations</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => onStatusChange(event.target.value as 'all' | HrAssetStatus)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="maintenance">Maintenance</option>
            <option value="custody">Custody</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Unit</label>
          <select
            value={unitFilter}
            onChange={(event) => onUnitChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#143675] focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">All units</option>
            {unitOptions.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
