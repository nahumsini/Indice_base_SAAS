import { MapPinned } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../../../components/indice-modal';
import type { AttendanceControlAssignment } from '../../../../../../api/humanResources';
import type { ContractSiteCopy, DraftLocation } from '../../../types/contractSiteTypes';
import {
  formatContractDays,
  formatDateLabel,
  formatDateTime,
} from '../../../utils/contractSiteUtils';

export interface ContractSiteActivityItem {
  assignment: AttendanceControlAssignment;
  assignedToSite: boolean;
  checkedInAtSite: boolean;
  checkedOutAtSite: boolean;
}

interface ContractSiteDetailModalProps {
  activity: ContractSiteActivityItem[];
  controlDate: string;
  copy: ContractSiteCopy;
  location: DraftLocation;
  onClose: () => void;
}

export function ContractSiteDetailModal({
  activity,
  controlDate,
  copy,
  location,
  onClose,
}: ContractSiteDetailModalProps) {
  return (
    <IndiceModalFrame
      closeLabel={copy.detail.closeAria}
      contentClassName="sm:max-w-5xl"
      description={`${location.nombre} · ${formatDateLabel(controlDate)}`}
      footer={<Button type="button" onClick={onClose}>{copy.actions.close}</Button>}
      icon={<MapPinned className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open
      title={copy.detail.title}
      tone="aqua"
    >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.unit}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{location.unitName || copy.detail.undefined}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.business}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{location.businessName || copy.detail.undefined}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.assignedEmployees}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{location.assignedEmployeeCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.status}</p>
              <p className={`mt-1 text-sm font-semibold ${location.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {location.status === 'active' ? copy.status.active : copy.status.inactive}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.contractWindow}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {location.contractStartDate} - {location.contractEndDate}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatContractDays(location.contractStartDate, location.contractEndDate, copy)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.table.radius}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{copy.meters(location.radio)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.coordinates}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {location.latitud}, {location.longitud}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{copy.detail.dailyActivity}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{copy.detail.dailyActivityDescription}</p>
            </div>
            {activity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-white dark:bg-gray-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.employee}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.assigned}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.checkIn}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.checkOut}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{copy.detail.registeredLocation}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
                    {activity.map(({ assignment, assignedToSite, checkedInAtSite, checkedOutAtSite }) => (
                      <tr key={assignment.user_company_id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.user_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.user_code || copy.detail.noEmployeeCode}
                            {assignment.position_title ? ` · ${assignment.position_title}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            assignedToSite
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {assignedToSite ? copy.detail.assigned : copy.detail.unassigned}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <p>{formatDateTime(assignment.first_check_in_at, copy)}</p>
                          <p className={checkedInAtSite ? 'text-xs text-emerald-700 dark:text-emerald-300' : 'text-xs text-gray-500 dark:text-gray-400'}>
                            {assignment.first_location?.name ?? copy.detail.noCheckInLocation}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <p>{formatDateTime(assignment.last_check_out_at, copy)}</p>
                          <p className={checkedOutAtSite ? 'text-xs text-emerald-700 dark:text-emerald-300' : 'text-xs text-gray-500 dark:text-gray-400'}>
                            {assignment.last_location?.name ?? copy.detail.noCheckOutLocation}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <p>{copy.detail.checkInLabel}: {checkedInAtSite ? copy.detail.thisLocation : assignment.first_location?.name ?? copy.detail.none}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {copy.detail.checkOutLabel}: {checkedOutAtSite ? copy.detail.thisLocation : assignment.last_location?.name ?? copy.detail.none}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {copy.detail.emptyActivity(formatDateLabel(controlDate))}
              </div>
            )}
          </div>
        </div>
    </IndiceModalFrame>
  );
}
