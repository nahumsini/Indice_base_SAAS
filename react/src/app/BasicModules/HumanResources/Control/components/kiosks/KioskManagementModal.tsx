import { MonitorSmartphone, Plus, X } from 'lucide-react';
import {
  type AttendanceControlLocation,
  type AttendanceKioskDevice,
} from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../components/ui/dialog';
import { type AttendanceControlCopy, statusClasses } from '../ControlAttendanceWidgets';
import { KioskCard } from './KioskCard';

type KioskType = 'business_unit' | 'contract_site' | 'head_office' | 'open_attendance';

const kioskTypeOptions: KioskType[] = ['business_unit', 'contract_site', 'head_office', 'open_attendance'];

const kioskTypeForDevice = (device: AttendanceKioskDevice): KioskType => {
  const value = typeof device.metadata?.kiosk_type === 'string' ? device.metadata.kiosk_type : '';
  if (kioskTypeOptions.includes(value as KioskType)) {
    return value as KioskType;
  }

  return device.unit_id || device.business_id || device.location_id ? 'business_unit' : 'open_attendance';
};

const valueFromMetadata = (metadata: Record<string, unknown> | undefined, keys: string[]) => {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  const todayUsage = metadata.today_usage ?? metadata.todayUsage;
  if (todayUsage && typeof todayUsage === 'object') {
    const value = (todayUsage as Record<string, unknown>).employees
      ?? (todayUsage as Record<string, unknown>).employee_count
      ?? (todayUsage as Record<string, unknown>).employeeCount;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return null;
};

const kioskTypeLabel = (device: AttendanceKioskDevice, copy: AttendanceControlCopy) => {
  const kioskType = kioskTypeForDevice(device);
  if (kioskType === 'contract_site') {
    return copy.kiosk.messages.typeLabelContractSite;
  }
  if (kioskType === 'head_office') {
    return copy.kiosk.messages.typeLabelHeadOffice;
  }
  if (kioskType === 'open_attendance') {
    return copy.kiosk.messages.typeLabelOpenAttendance;
  }
  return copy.kiosk.messages.typeLabelBusinessUnit;
};

const scopeDescriptionForDevice = (device: AttendanceKioskDevice, copy: AttendanceControlCopy) => {
  const kioskType = kioskTypeForDevice(device);
  const unitName = device.unit_name || copy.labels.allUnits;
  const businessName = device.business_name || copy.labels.allBusinesses;

  if (kioskType === 'contract_site') {
    return copy.kiosk.messages.availableForUnitBusiness(unitName, businessName);
  }

  if (kioskType === 'head_office') {
    return copy.kiosk.messages.availableForMainOffice(unitName);
  }
  if (kioskType === 'open_attendance') {
    return copy.kiosk.messages.allEmployeesAvailable;
  }

  if (device.business_id) {
    return copy.kiosk.messages.availableForBusinessInUnit(businessName, unitName);
  }

  if (device.unit_id) {
    return copy.kiosk.messages.availableForUnitAllBusinesses(unitName);
  }

  return copy.kiosk.messages.allUnitsAllBusinessesAvailable;
};

const locationNameForDevice = (
  device: AttendanceKioskDevice,
  locations: AttendanceControlLocation[],
) => (
  device.location_name
  || locations.find((location) => location.id === device.location_id)?.name
  || ''
);

const locationRuleForDevice = (
  device: AttendanceKioskDevice,
  locations: AttendanceControlLocation[],
  copy: AttendanceControlCopy,
) => {
  const kioskType = kioskTypeForDevice(device);
  const locationName = locationNameForDevice(device, locations);

  if (kioskType === 'business_unit' && !device.location_id) {
    return copy.kiosk.messages.employeeLocationRule;
  }
  if (kioskType === 'open_attendance') {
    return copy.kiosk.messages.openAttendanceLocationRule;
  }

  if (!locationName) {
    return copy.kiosk.messages.noCheckInRule;
  }

  if (kioskType === 'contract_site') {
    return copy.kiosk.messages.employeesRegisterFrom(locationName);
  }

  if (kioskType === 'head_office') {
    return copy.kiosk.messages.employeesRegisterFrom(locationName);
  }

  return copy.kiosk.messages.checkInsUseLocation(locationName);
};

const usageLabelForDevice = (device: AttendanceKioskDevice, copy: AttendanceControlCopy) => {
  const usageCount = valueFromMetadata(device.metadata, [
    'today_employee_count',
    'todayEmployeeCount',
    'today_usage_count',
    'todayUsageCount',
    'used_by_employees_today',
    'usedByEmployeesToday',
    'employees_today',
    'employeesToday',
  ]);

  if (!usageCount) {
    return copy.kiosk.messages.noCheckInsToday;
  }

  return copy.kiosk.messages.checkInsToday(usageCount);
};

export interface KioskManagementModalProps {
  copy: AttendanceControlCopy;
  isOpen: boolean;
  isSaving: boolean;
  kioskDevices: AttendanceKioskDevice[];
  locations: AttendanceControlLocation[];
  onClose: () => void;
  onNew: () => void;
  onEdit: (device: AttendanceKioskDevice) => void;
  onOpen: (device: AttendanceKioskDevice) => void;
  onCopy: (device: AttendanceKioskDevice) => void;
  onQr: (device: AttendanceKioskDevice) => void;
  onRotate: (device: AttendanceKioskDevice) => void;
  onDelete: (device: AttendanceKioskDevice) => void;
}

export function KioskManagementModal(props: KioskManagementModalProps) {
  const {
    copy,
    isOpen,
    isSaving,
    kioskDevices,
    locations,
    onClose,
    onNew,
    onEdit,
    onOpen,
    onCopy,
    onQr,
    onRotate,
    onDelete,
  } = props;
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        hideCloseButton
        className="max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg border border-slate-300 bg-white p-0 text-slate-950 shadow-lg dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-5xl"
      >
        <div className="shrink-0 bg-[#59C3A5] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <DialogHeader className="gap-1 text-left">
                <DialogTitle className="text-xl font-semibold text-white">{copy.kiosk.management.title}</DialogTitle>
                <DialogDescription className="text-sm text-white/80">
                  {copy.kiosk.management.description}
                </DialogDescription>
              </DialogHeader>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label={copy.kiosk.management.closeAria}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{copy.kiosk.management.centerTitle}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.kiosk.management.centerDescription}
              </p>
            </div>
            <Button
              type="button"
              className="h-10 gap-2 rounded-lg bg-[#59C3A5] px-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#3AAE90] hover:shadow-md"
              onClick={onNew}
            >
              <Plus className="h-4 w-4" />
              {copy.kiosk.management.newButton}
            </Button>
          </div>

          {kioskDevices.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {kioskDevices.map((device) => {
                const hasPublicLink = Boolean(device.public_access_token);
                return (
                  <KioskCard
                    key={device.id}
                    device={device}
                    copy={copy}
                    hasPublicLink={hasPublicLink}
                    isSaving={isSaving}
                    kioskTypeLabel={kioskTypeLabel(device, copy)}
                    locationRuleDescription={locationRuleForDevice(device, locations, copy)}
                    publicLinkLabel={hasPublicLink ? copy.kiosk.card.publicLinkReady : copy.kiosk.card.publicLinkPending}
                    scopeDescription={scopeDescriptionForDevice(device, copy)}
                    statusClassName={statusClasses[device.status]}
                    statusLabel={copy.statuses[device.status]}
                    usageLabel={usageLabelForDevice(device, copy)}
                    onCopy={() => onCopy(device)}
                    onDelete={() => onDelete(device)}
                    onEdit={() => onEdit(device)}
                    onOpen={() => onOpen(device)}
                    onRotate={() => onRotate(device)}
                    onShowQr={() => onQr(device)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{copy.kiosk.management.emptyTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {copy.kiosk.management.emptyDescription}
              </p>
              <Button
                type="button"
                className="mt-5 h-10 gap-2 rounded-lg bg-[#59C3A5] px-4 text-white hover:bg-[#3AAE90]"
                onClick={onNew}
              >
                <Plus className="h-4 w-4" />
                {copy.kiosk.management.newButton}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[#3AAE90] bg-[#59C3A5] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-white/30 bg-white text-[#59C3A5] hover:bg-white/90 hover:text-[#59C3A5]"
            onClick={onClose}
          >
            {copy.kiosk.management.closeButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
