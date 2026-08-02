import { Copy, ExternalLink, Link2, MapPin, MonitorSmartphone, MoreHorizontal, Pencil, Plus, QrCode, RotateCw, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  type AttendanceControlLocation,
  type AttendanceKioskDevice,
} from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
import { KioskAdminPanelAction } from '../../../../../components/kiosk-engine/KioskAdminPrimitives';
import { KioskModalFrame } from '../../../../../components/kiosk-engine/KioskModalFrame';
import { useKioskQrCode } from '../../../../../components/kiosk-engine/useKioskQrCode';
import { IndiceModalSummary, IndiceModalValidation } from '../../../../../components/indice-modal';
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
  const [shareDeviceId, setShareDeviceId] = useState<number | null>(null);
  const [moreDeviceId, setMoreDeviceId] = useState<number | null>(null);
  const [qrDeviceId, setQrDeviceId] = useState<number | null>(null);
  const shareDevice = kioskDevices.find((device) => device.id === shareDeviceId) ?? null;
  const moreDevice = kioskDevices.find((device) => device.id === moreDeviceId) ?? null;
  const qrDevice = kioskDevices.find((device) => device.id === qrDeviceId) ?? null;
  const qrLink = qrDevice?.public_access_token && typeof window !== 'undefined'
    ? `${window.location.origin}/kiosk/${qrDevice.public_access_token}`
    : '';
  const qrDataUrl = useKioskQrCode(qrLink, '#3AAE90');
  const activeCount = kioskDevices.filter((device) => device.status === 'active').length;
  const readyCount = kioskDevices.filter((device) => Boolean(device.public_access_token)).length;
  const childViewOpen = Boolean(shareDevice || moreDevice || qrDevice);
  const closeAll = () => {
    setShareDeviceId(null);
    setMoreDeviceId(null);
    setQrDeviceId(null);
    onClose();
  };

  return (
    <>
      <KioskModalFrame
        busy={isSaving}
        closeLabel={copy.kiosk.management.closeAria}
        description={copy.kiosk.management.description}
        footer={<Button type="button" variant="outline" onClick={closeAll}>{copy.kiosk.management.closeButton}</Button>}
        footerSummary={`${activeCount} activos · ${readyCount} pantallas listas`}
        icon={<MonitorSmartphone className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) closeAll(); }}
        open={isOpen && !childViewOpen}
        size="workspace"
        surface="administration"
        title={copy.kiosk.management.title}
        tone="aqua"
      >
        <div className="space-y-4">
          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
            <div>
              <p className="text-sm font-medium text-slate-950 dark:text-white">{copy.kiosk.management.centerTitle}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {copy.kiosk.management.centerDescription}
              </p>
            </div>
            <Button
              type="button"
              className="h-10 gap-2 rounded-xl bg-[#59C3A5] px-4 text-slate-950 shadow-sm transition hover:bg-[#3AAE90]"
              onClick={() => { onClose(); onNew(); }}
            >
              <Plus className="h-4 w-4" />
              {copy.kiosk.management.newButton}
            </Button>
          </section>

          <IndiceModalSummary
            columns={3}
            items={[
              { label: copy.kiosk.management.totalPoints, value: kioskDevices.length, emphasized: true },
              { label: copy.kiosk.management.activeToday, value: activeCount },
              { label: copy.kiosk.management.accessScreensReady, value: readyCount },
            ]}
          />

          {kioskDevices.length > 0 ? (
            <div className="grid gap-3">
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
                    onEdit={() => { onClose(); onEdit(device); }}
                    onMore={() => setMoreDeviceId(device.id)}
                    onOpen={() => onOpen(device)}
                    onShare={() => setShareDeviceId(device.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
                <MonitorSmartphone className="h-6 w-6" />
              </div>
              <p className="mt-4 text-base font-medium text-slate-950 dark:text-white">{copy.kiosk.management.emptyTitle}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {copy.kiosk.management.emptyDescription}
              </p>
              <Button
                type="button"
                className="mt-5 h-10 gap-2 rounded-lg bg-[#59C3A5] px-4 text-slate-950 hover:bg-[#3AAE90]"
                onClick={() => { onClose(); onNew(); }}
              >
                <Plus className="h-4 w-4" />
                {copy.kiosk.management.newButton}
              </Button>
            </div>
          )}
        </div>
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.kiosk.management.closeAria}
        description={shareDevice ? shareDevice.name : copy.kiosk.card.accessLabel}
        footer={<Button type="button" variant="outline" onClick={() => setShareDeviceId(null)}>{copy.kiosk.management.closeButton}</Button>}
        icon={<Share2 className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setShareDeviceId(null); }}
        open={isOpen && Boolean(shareDevice)}
        size="compact"
        title={copy.kiosk.card.openAttendanceScreen}
        tone="aqua"
      >
        {shareDevice ? (
          <div className="space-y-4">
            {shareDevice.public_access_token ? (
              <>
                <IndiceModalValidation tone="info" title={copy.kiosk.card.publicLinkReady} messages={[scopeDescriptionForDevice(shareDevice, copy)]} />
                <div className="grid gap-2">
                  <KioskAdminPanelAction accent="aqua" primary icon={<ExternalLink className="h-4 w-4" />} label={copy.kiosk.card.openAttendanceScreen} onClick={() => onOpen(shareDevice)} />
                  <KioskAdminPanelAction accent="aqua" icon={<Copy className="h-4 w-4" />} label={copy.kiosk.actions.copyAccessLink} onClick={() => onCopy(shareDevice)} />
                  <KioskAdminPanelAction accent="aqua" icon={<QrCode className="h-4 w-4" />} label={copy.kiosk.actions.showAttendanceQr} onClick={() => { setShareDeviceId(null); setQrDeviceId(shareDevice.id); }} />
                  <KioskAdminPanelAction accent="aqua" icon={<RotateCw className="h-4 w-4" />} label={copy.kiosk.actions.resetAccessLink} onClick={() => { setShareDeviceId(null); onRotate(shareDevice); }} />
                </div>
              </>
            ) : (
              <>
                <IndiceModalValidation tone="warning" title={copy.kiosk.card.publicLinkPending} messages={[copy.kiosk.card.noAccessLink]} />
                <KioskAdminPanelAction accent="aqua" primary icon={<RotateCw className="h-4 w-4" />} label={copy.kiosk.actions.resetAccessLink} onClick={() => { setShareDeviceId(null); onRotate(shareDevice); }} />
              </>
            )}
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.kiosk.management.closeAria}
        description={moreDevice ? moreDevice.name : copy.kiosk.actions.openActions}
        footer={<Button type="button" variant="outline" onClick={() => setMoreDeviceId(null)}>{copy.kiosk.management.closeButton}</Button>}
        icon={<MoreHorizontal className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setMoreDeviceId(null); }}
        open={isOpen && Boolean(moreDevice)}
        size="compact"
        title={copy.kiosk.actions.openActions}
        tone="aqua"
      >
        {moreDevice ? (
          <div className="space-y-3">
            <KioskAdminPanelAction accent="aqua" icon={<MapPin className="h-4 w-4" />} label={kioskTypeLabel(moreDevice, copy)} description={locationRuleForDevice(moreDevice, locations, copy)} onClick={() => undefined} disabled />
            <KioskAdminPanelAction accent="aqua" primary icon={<Pencil className="h-4 w-4" />} label={copy.kiosk.actions.editAttendancePoint} onClick={() => { setMoreDeviceId(null); onClose(); onEdit(moreDevice); }} />
            <KioskAdminPanelAction accent="aqua" danger icon={<Trash2 className="h-4 w-4" />} label={copy.kiosk.actions.deleteAttendancePoint} description={copy.kiosk.management.deleteDescription} onClick={() => { setMoreDeviceId(null); onClose(); onDelete(moreDevice); }} />
          </div>
        ) : null}
      </KioskModalFrame>

      <KioskModalFrame
        closeLabel={copy.kiosk.management.closeAria}
        description={qrDevice ? qrDevice.name : copy.kiosk.card.qrTitle}
        footer={<Button type="button" variant="outline" onClick={() => setQrDeviceId(null)}>{copy.kiosk.management.closeButton}</Button>}
        icon={<QrCode className="h-5 w-5" />}
        onOpenChange={(nextOpen) => { if (!nextOpen) setQrDeviceId(null); }}
        open={isOpen && Boolean(qrDevice)}
        size="compact"
        title={copy.kiosk.card.qrTitle}
        tone="aqua"
      >
        <div className="flex flex-col items-center text-center">
          {qrDataUrl ? <img src={qrDataUrl} alt={`${copy.kiosk.card.qrTitle}: ${qrDevice?.name ?? ''}`} className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" /> : <p className="py-16 text-sm font-medium text-slate-600">{copy.loading}</p>}
          {qrDevice ? <p className="mt-4 text-xs leading-5 text-slate-500">{scopeDescriptionForDevice(qrDevice, copy)}</p> : null}
        </div>
      </KioskModalFrame>
    </>
  );
}
