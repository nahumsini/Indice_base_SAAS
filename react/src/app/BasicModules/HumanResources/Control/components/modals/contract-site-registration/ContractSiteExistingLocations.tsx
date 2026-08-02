import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type {
  ContractSiteCopy,
  ContractSiteFilter,
  DraftLocation,
} from '../../../types/contractSiteTypes';
import {
  formatContractDays,
  formatDateLabel,
} from '../../../utils/contractSiteUtils';

interface ContractSiteExistingLocationsProps {
  contractSiteFilter: ContractSiteFilter;
  controlDate: string;
  contractSitePaginationEnd: number;
  contractSitePaginationStart: number;
  contractSiteTotalPages: number;
  copy: ContractSiteCopy;
  filteredDraftLocations: DraftLocation[];
  paginatedDraftLocations: DraftLocation[];
  safeContractSitePage: number;
  onDelete: (location: DraftLocation) => void;
  onEdit: (location: DraftLocation) => void;
  onFilterChange: (value: ContractSiteFilter) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSelect: (locationId: string) => void;
}

export function ContractSiteExistingLocations({
  contractSiteFilter,
  controlDate,
  contractSitePaginationEnd,
  contractSitePaginationStart,
  contractSiteTotalPages,
  copy,
  filteredDraftLocations,
  paginatedDraftLocations,
  safeContractSitePage,
  onDelete,
  onEdit,
  onFilterChange,
  onNextPage,
  onPreviousPage,
  onSelect,
}: ContractSiteExistingLocationsProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60">
      <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/50 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-base font-medium text-gray-900 dark:text-white">{copy.existing.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {copy.existing.description}
            </p>
          </div>
          <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/5 px-3 py-2 dark:border-[#8FE0CA]/20 dark:bg-[#8FE0CA]/10">
            <span className="text-xs font-medium text-[#59C3A5] dark:text-[#8FE0CA]">{copy.existing.shownDate}</span>
            <span className="text-sm font-medium text-gray-950 dark:text-white">{formatDateLabel(controlDate)}</span>
            <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
              {controlDate}
            </span>
          </div>
        </div>
        <select
          value={contractSiteFilter}
          onChange={(event) => onFilterChange(event.target.value as ContractSiteFilter)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-48"
        >
          <option value="all">{copy.filters.all}</option>
          <option value="assigned">{copy.filters.assigned}</option>
          <option value="unassigned">{copy.filters.unassigned}</option>
          <option value="active">{copy.filters.active}</option>
          <option value="inactive">{copy.filters.inactive}</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.unit}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.business}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.location}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.contractWindow}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.assignment}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.status}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.radius}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/60">
            {paginatedDraftLocations.map((location) => (
              <tr
                key={location.id}
                className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-gray-700/50 dark:focus:bg-gray-700/50"
                role="button"
                tabIndex={0}
                onClick={() => onSelect(location.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(location.id);
                  }
                }}
              >
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.unitName || '--'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.businessName || '--'}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{location.nombre}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {location.contractStartDate} - {location.contractEndDate}
                  </span>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatContractDays(location.contractStartDate, location.contractEndDate, copy)}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className={location.assignedEmployeeCount > 0 ? 'font-medium text-emerald-700 dark:text-emerald-300' : ''}>
                    {location.assignedEmployeeCount > 0 ? copy.table.assignedCount(location.assignedEmployeeCount) : copy.table.unassigned}
                  </span>
                  {location.assignedEmployeeNames ? (
                    <p className="mt-1 max-w-56 truncate text-xs text-gray-500 dark:text-gray-400" title={location.assignedEmployeeNames}>
                      {location.assignedEmployeeNames}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    location.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {location.status === 'active' ? copy.status.active : copy.status.inactive}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{copy.meters(location.radio)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(location);
                      }}
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20"
                      aria-label={copy.actions.editAria(location.nombre)}
                      title={copy.actions.edit}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(location);
                      }}
                      variant="ghost"
                      size="icon"
                      type="button"
                      disabled={location.assignedEmployeeCount > 0}
                      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      aria-label={copy.actions.deleteAria(location.nombre)}
                      title={location.assignedEmployeeCount > 0 ? copy.actions.deleteDisabled : copy.actions.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredDraftLocations.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {copy.emptyFiltered}
        </div>
      ) : null}
      {filteredDraftLocations.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
          <span>
            {copy.pagination.showing(contractSitePaginationStart, contractSitePaginationEnd, filteredDraftLocations.length)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeContractSitePage <= 1}
              onClick={onPreviousPage}
            >
              {copy.pagination.previous}
            </Button>
            <span className="min-w-20 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {safeContractSitePage} / {contractSiteTotalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safeContractSitePage >= contractSiteTotalPages}
              onClick={onNextPage}
            >
              {copy.pagination.next}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
