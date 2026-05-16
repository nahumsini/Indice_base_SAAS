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

type KioskType = 'business_unit' | 'contract_site' | 'head_office';

const kioskTypeOptions: KioskType[] = ['business_unit', 'contract_site', 'head_office'];

const kioskTypeFromMetadata = (metadata?: Record<string, unknown>): KioskType => {
  const value = typeof metadata?.kiosk_type === 'string' ? metadata.kiosk_type : '';
  return kioskTypeOptions.includes(value as KioskType) ? value as KioskType : 'business_unit';
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

const kioskTypeLabel = (device: AttendanceKioskDevice) => {
  const kioskType = kioskTypeFromMetadata(device.metadata);
  if (kioskType === 'contract_site') {
    return 'Temporary work site';
  }
  if (kioskType === 'head_office') {
    return 'Main office';
  }
  return 'Business or unit';
};

const scopeDescriptionForDevice = (device: AttendanceKioskDevice) => {
  const kioskType = kioskTypeFromMetadata(device.metadata);
  const unitName = device.unit_name || 'all units';
  const businessName = device.business_name || 'all businesses';

  if (kioskType === 'contract_site') {
    return `Available for ${unitName} / ${businessName}`;
  }

  if (kioskType === 'head_office') {
    return `Available for main office registration in ${unitName}`;
  }

  if (device.business_id) {
    return `Available for ${businessName} in ${unitName}`;
  }

  if (device.unit_id) {
    return `Available for ${unitName} and all businesses`;
  }

  return 'Available for all units and all businesses';
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
) => {
  const kioskType = kioskTypeFromMetadata(device.metadata);
  const locationName = locationNameForDevice(device, locations);

  if (kioskType === 'business_unit' && !device.location_id) {
    return "Uses each employee's assigned business location.";
  }

  if (!locationName) {
    return 'No check-in rule linked yet.';
  }

  if (kioskType === 'contract_site') {
    return `Employees register from ${locationName}.`;
  }

  if (kioskType === 'head_office') {
    return `Employees register from ${locationName}.`;
  }

  return `Check-ins use ${locationName}.`;
};

const usageLabelForDevice = (device: AttendanceKioskDevice) => {
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
    return 'No check-ins today';
  }

  return `${usageCount} check-in${usageCount === 1 ? '' : 's'} today`;
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
  const activeDevices = kioskDevices.filter((device) => device.status === 'active').length;
  const publicLinkDevices = kioskDevices.filter((device) => Boolean(device.public_access_token)).length;
  const inactiveDevices = kioskDevices.length - activeDevices;

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
        className="max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border border-slate-300 bg-white p-0 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-5xl"
      >
        <div className="shrink-0 bg-[#143675] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <MonitorSmartphone className="h-5 w-5" />
              </span>
              <DialogHeader className="gap-1 text-left">
                <DialogTitle className="text-xl font-semibold text-white">Attendance Points</DialogTitle>
                <DialogDescription className="text-sm text-white/80">
                  Manage where employees can clock in and out.
                </DialogDescription>
              </DialogHeader>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label="Close attendance points"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Attendance point control center</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review availability, access screens, and location rules for each point.
              </p>
            </div>
            <Button
              type="button"
              className="h-10 gap-2 rounded-lg bg-[#143675] px-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0f2855] hover:shadow-md"
              onClick={onNew}
            >
              <Plus className="h-4 w-4" />
              New attendance point
            </Button>
          </div>

          <div className="mt-5 grid gap-3 border-y border-slate-200 py-4 text-sm dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-2xl font-semibold text-slate-950 dark:text-white">{kioskDevices.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Total points</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{activeDevices}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Active today</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-300">{inactiveDevices}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Needs review</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#143675] dark:text-[#8bb3ff]">{publicLinkDevices}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Access screens ready</p>
            </div>
          </div>

          {kioskDevices.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {kioskDevices.map((device) => {
                const hasPublicLink = Boolean(device.public_access_token);
                return (
                  <KioskCard
                    key={device.id}
                    device={device}
                    hasPublicLink={hasPublicLink}
                    isSaving={isSaving}
                    kioskTypeLabel={kioskTypeLabel(device)}
                    locationRuleDescription={locationRuleForDevice(device, locations)}
                    publicLinkLabel={hasPublicLink ? 'Ready' : 'Not ready yet'}
                    scopeDescription={scopeDescriptionForDevice(device)}
                    statusClassName={statusClasses[device.status]}
                    statusLabel={device.status === 'active' ? 'Active' : 'Inactive'}
                    usageLabel={usageLabelForDevice(device)}
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
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#143675]/10 text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-950 dark:text-white">No attendance points yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Create an attendance point so employees can register from a clear access screen or QR.
              </p>
              <Button
                type="button"
                className="mt-5 h-10 gap-2 rounded-lg bg-[#143675] px-4 text-white hover:bg-[#0f2855]"
                onClick={onNew}
              >
                <Plus className="h-4 w-4" />
                New attendance point
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[#0f2855] bg-[#143675] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-white/30 bg-white text-[#143675] hover:bg-white/90 hover:text-[#143675]"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
