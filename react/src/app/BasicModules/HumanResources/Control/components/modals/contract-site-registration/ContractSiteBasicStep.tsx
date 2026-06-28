import { Building2 } from 'lucide-react';
import type { RefObject } from 'react';
import type {
  BackendBusiness,
  BackendUnit,
} from '../../../../../../api/dashboard';
import type { ContractSiteCopy } from '../../../types/contractSiteTypes';
import { formatContractDays } from '../../../utils/contractSiteUtils';

interface ContractSiteBasicStepProps {
  businessOptions: BackendBusiness[];
  contractDaysForForm: number | null;
  contractEndDate: string;
  contractStartDate: string;
  copy: ContractSiteCopy;
  isLoadingScopeOptions: boolean;
  nameInputRef: RefObject<HTMLInputElement | null>;
  nombre: string;
  selectedBusiness: BackendBusiness | null;
  selectedBusinessId: string;
  selectedUnit: BackendUnit | null;
  selectedUnitId: string;
  units: BackendUnit[];
  onBusinessChange: (value: string) => void;
  onContractEndDateChange: (value: string) => void;
  onContractStartDateChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onUnitChange: (value: string) => void;
}

export function ContractSiteBasicStep({
  businessOptions,
  contractDaysForForm,
  contractEndDate,
  contractStartDate,
  copy,
  isLoadingScopeOptions,
  nameInputRef,
  nombre,
  selectedBusiness,
  selectedBusinessId,
  selectedUnit,
  selectedUnitId,
  units,
  onBusinessChange,
  onContractEndDateChange,
  onContractStartDateChange,
  onNameChange,
  onUnitChange,
}: ContractSiteBasicStepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-md border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
        <div>
          <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">{copy.basic.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {copy.basic.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.unitLabel}</label>
          <select
            value={selectedUnitId}
            onChange={(event) => onUnitChange(event.target.value)}
            disabled={isLoadingScopeOptions}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
          >
            <option value="">{isLoadingScopeOptions ? copy.basic.loadingUnits : copy.basic.selectUnit}</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.businessLabel}</label>
          <select
            value={selectedBusinessId}
            onChange={(event) => onBusinessChange(event.target.value)}
            disabled={isLoadingScopeOptions || !selectedUnitId}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
          >
            <option value="">
              {!selectedUnitId
                ? copy.basic.selectUnitFirst
                : businessOptions.length > 0
                  ? copy.basic.selectBusiness
                  : copy.basic.noBusinesses}
            </option>
            {businessOptions.map((business) => (
              <option key={business.id} value={business.id}>{business.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.locationNameLabel}</label>
        <input
          ref={nameInputRef}
          type="text"
          value={nombre}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={copy.basic.locationNamePlaceholder}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {copy.basic.locationNameHint}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.contractStart}</label>
          <input
            type="date"
            value={contractStartDate}
            onChange={(event) => onContractStartDateChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.contractEnd}</label>
          <input
            type="date"
            value={contractEndDate}
            min={contractStartDate}
            onChange={(event) => onContractEndDateChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.basic.duration}</label>
          <input
            type="text"
            value={contractDaysForForm ? formatContractDays(contractStartDate, contractEndDate, copy) : copy.days.invalidRange}
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {selectedUnit && selectedBusiness ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {copy.basic.willSaveTo(selectedUnit.name, selectedBusiness.name)}
        </div>
      ) : null}
    </div>
  );
}
