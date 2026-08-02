import { ListChecks, Settings2 } from 'lucide-react';
import type {
  BackendBusiness,
  BackendUnit,
} from '../../../../../../api/dashboard';
import type { ContractSiteCopy } from '../../../types/contractSiteTypes';
import { formatContractDays } from '../../../utils/contractSiteUtils';

interface ContractSiteReviewStepProps {
  contractEndDate: string;
  contractStartDate: string;
  contractStatus: 'active' | 'inactive';
  contractDaysForForm: number | null;
  copy: ContractSiteCopy;
  hasValidLocationInformation: boolean;
  latitud: string;
  longitud: string;
  nombre: string;
  radio: string;
  selectedBusiness: BackendBusiness | null;
  selectedUnit: BackendUnit | null;
  onStatusChange: (value: 'active' | 'inactive') => void;
}

export function ContractSiteReviewStep({
  contractEndDate,
  contractStartDate,
  contractStatus,
  contractDaysForForm,
  copy,
  hasValidLocationInformation,
  latitud,
  longitud,
  nombre,
  radio,
  selectedBusiness,
  selectedUnit,
  onStatusChange,
}: ContractSiteReviewStepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
        <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
        <div>
          <p className="text-sm font-medium text-[#59C3A5] dark:text-blue-200">{copy.review.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {copy.review.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.review.location}</p>
          <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{nombre || copy.review.noName}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedUnit?.name ?? copy.review.noUnit} / {selectedBusiness?.name ?? copy.review.noBusiness}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.review.contractWindow}</p>
          <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{contractStartDate} - {contractEndDate}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contractDaysForForm ? formatContractDays(contractStartDate, contractEndDate, copy) : copy.days.invalidRange}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.review.locationRegistration}</p>
          <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{hasValidLocationInformation ? copy.review.radiusSummary(radio) : copy.review.locationPending}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hasValidLocationInformation ? `${latitud}, ${longitud}` : copy.review.useMaps}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.review.statusTitle}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.review.statusDescription}
              </p>
            </div>
          </div>
          <select
            value={contractStatus}
            onChange={(event) => onStatusChange(event.target.value as 'active' | 'inactive')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-44"
          >
            <option value="active">{copy.status.active}</option>
            <option value="inactive">{copy.status.inactive}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
