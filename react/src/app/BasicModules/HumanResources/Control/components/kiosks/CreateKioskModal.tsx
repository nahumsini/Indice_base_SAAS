import { CheckCircle2, Lock, MonitorSmartphone, Save, Unlock, type LucideIcon } from 'lucide-react';
import { type AttendanceKioskDevicePayload } from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
import type { ControlTranslations } from '../../translations';
import { KioskModalFrame } from '../../../../../components/kiosk-engine/KioskModalFrame';
import { KioskFormSection } from './KioskFormSection';
import type { KioskType } from './KioskTypeSelector';

export interface KioskOption {
  id: number;
  name: string;
  unitId?: number | null;
  unitName?: string;
}

export interface CreateKioskModalProps {
  allowedKioskTypes: readonly KioskType[];
  businessOptions: KioskOption[];
  canSave: boolean;
  copy: ControlTranslations;
  form: AttendanceKioskDevicePayload;
  hasScopedLocations: boolean;
  isEditing: boolean;
  isOpen: boolean;
  isSaving: boolean;
  kioskType: KioskType;
  selectedRadiusLabel: string;
  selectedScopeLabel: string;
  title: string;
  unitOptions: KioskOption[];
  onBusinessChange: (businessId: number | null) => void;
  onChange: (value: AttendanceKioskDevicePayload) => void;
  onClose: () => void;
  onKioskTypeChange: (value: KioskType) => void;
  onSave: () => void;
  onUnitChange: (unitId: number | null) => void;
}

const selectClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition focus:border-[#59C3A5] focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/15 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900';
const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-[#59C3A5] focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const referenceFromTitle = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${slug}-point` : '';
};

export function CreateKioskModal({
  allowedKioskTypes,
  businessOptions,
  canSave,
  copy,
  form,
  hasScopedLocations,
  isEditing,
  isOpen,
  isSaving,
  kioskType,
  selectedRadiusLabel,
  selectedScopeLabel,
  title,
  unitOptions,
  onBusinessChange,
  onChange,
  onClose,
  onKioskTypeChange,
  onSave,
  onUnitChange,
}: CreateKioskModalProps) {
  const notesValue = typeof form.metadata?.notes === 'string' ? form.metadata.notes : '';
  const modalTitle = isEditing ? title : copy.kiosk.form.newTitle;
  const modalDescription = isEditing
    ? copy.kiosk.form.editDescription
    : copy.kiosk.form.createDescription;
  const canUseOpenAttendance = allowedKioskTypes.includes('open_attendance');
  const canUseClosedAttendance = allowedKioskTypes.includes('business_unit');

  return (
    <KioskModalFrame
      busy={isSaving}
      closeLabel={copy.kiosk.form.closeAria}
      description={modalDescription}
      footer={(
        <Button type="button" disabled={!canSave} onClick={onSave}>
          <Save className="h-4 w-4" />
          {isSaving
            ? copy.kiosk.form.saving
            : isEditing
              ? copy.kiosk.form.saveAttendancePoint
              : copy.kiosk.form.createAttendancePoint}
        </Button>
      )}
      footerLeading={<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>{copy.labels.cancel}</Button>}
      footerSummary={`${selectedScopeLabel} · ${selectedRadiusLabel}`}
      icon={<MonitorSmartphone className="h-5 w-5" />}
      onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}
      open={isOpen}
      size="form"
      surface="administration"
      title={modalTitle}
      tone="aqua"
    >
          <div className="grid gap-4">
            <KioskFormSection
              title={copy.kiosk.form.typeSectionTitle}
              description={copy.kiosk.form.typeSectionDescription}
            >
              <AttendanceModeSelector
                copy={copy}
                canUseOpenAttendance={canUseOpenAttendance}
                canUseClosedAttendance={canUseClosedAttendance}
                hasScopedLocations={hasScopedLocations}
                value={kioskType === 'business_unit' ? 'closed' : 'open'}
                onChange={(value) => onKioskTypeChange(value === 'closed' ? 'business_unit' : 'open_attendance')}
              />
              <div className="mt-4 rounded-md border border-[#59C3A5]/20 bg-[#59C3A5]/8 px-4 py-3 text-sm text-slate-700 dark:border-[#8FE0CA]/25 dark:bg-[#8FE0CA]/10 dark:text-slate-200">
                <p className="font-semibold text-slate-950 dark:text-white">{copy.kiosk.form.attendanceModeHelpTitle}</p>
                <p className="mt-1 leading-6">
                  {hasScopedLocations
                    ? copy.kiosk.form.attendanceModeHelpDescription
                    : copy.kiosk.form.noActiveLocations}
                </p>
              </div>
            </KioskFormSection>

            {kioskType === 'business_unit' ? (
              <KioskFormSection
                title={copy.kiosk.form.closedAttendanceTitle}
                description={copy.kiosk.form.closedAttendanceDescription}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {copy.labels.unit} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.unit_id ?? ''}
                      onChange={(event) => onUnitChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">{copy.contractSites.basic.selectUnit}</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {copy.labels.business} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.business_id ?? ''}
                      disabled={!form.unit_id}
                      onChange={(event) => onBusinessChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">{copy.kiosk.form.selectBusiness}</option>
                      {businessOptions.map((business) => (
                        <option key={business.id} value={business.id}>{business.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {copy.kiosk.form.availableForLabel}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{selectedScopeLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {copy.kiosk.form.registrationDiameterLabel}
                    </p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-white">{selectedRadiusLabel}</p>
                  </div>
                </div>
              </KioskFormSection>
            ) : (
              <KioskFormSection
                title={copy.kiosk.form.openAttendanceTitle}
                description={copy.kiosk.form.openAttendanceDescription}
              >
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100">
                  <p className="font-semibold">{copy.kiosk.form.allEmployeesNoLocationScope}</p>
                  <p className="mt-1 leading-6">{copy.kiosk.form.openAttendanceDescription}</p>
                </div>
              </KioskFormSection>
            )}

            <KioskFormSection
              title={copy.kiosk.form.pointInformationTitle}
              description={copy.kiosk.form.pointInformationDescription}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {copy.kiosk.form.nameLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  placeholder={copy.kiosk.form.namePlaceholder}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    const currentGeneratedReference = referenceFromTitle(form.name);
                    const shouldSyncReference = !form.code || form.code === currentGeneratedReference;
                    onChange({
                      ...form,
                      name: nextTitle,
                      code: shouldSyncReference ? referenceFromTitle(nextTitle) : form.code,
                    });
                  }}
                  className={inputClassName}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {copy.kiosk.form.nameHint}
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {copy.kiosk.form.notesLabel}
                </label>
                <textarea
                  value={notesValue}
                  rows={3}
                  placeholder={copy.kiosk.form.notesPlaceholder}
                  onChange={(event) => onChange({
                    ...form,
                    metadata: {
                      ...(form.metadata ?? {}),
                      notes: event.target.value,
                    },
                  })}
                  className={`${inputClassName} min-h-[88px] resize-none`}
                />
              </div>
            </KioskFormSection>

            {isEditing ? (
              <KioskFormSection title={copy.labels.status} description={copy.kiosk.form.statusDescription}>
                <select
                  value={form.status}
                  onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                  className={selectClassName}
                >
                  <option value="active">{copy.statuses.active}</option>
                  <option value="inactive">{copy.statuses.inactive}</option>
                </select>
              </KioskFormSection>
            ) : null}
          </div>
    </KioskModalFrame>
  );
}

function AttendanceModeSelector({
  canUseClosedAttendance,
  canUseOpenAttendance,
  copy,
  hasScopedLocations,
  value,
  onChange,
}: {
  canUseClosedAttendance: boolean;
  canUseOpenAttendance: boolean;
  copy: ControlTranslations;
  hasScopedLocations: boolean;
  value: 'open' | 'closed';
  onChange: (value: 'open' | 'closed') => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AttendanceModeOption
        description={copy.kiosk.form.openAttendanceModeDescription}
        isDisabled={!canUseOpenAttendance}
        isSelected={value === 'open'}
        title={copy.kiosk.form.openAttendanceModeTitle}
        Icon={Unlock}
        onSelect={() => onChange('open')}
      />
      <AttendanceModeOption
        description={hasScopedLocations ? copy.kiosk.form.closedAttendanceModeDescription : copy.kiosk.form.closedAttendanceUnavailable}
        isDisabled={!canUseClosedAttendance}
        isSelected={value === 'closed'}
        title={copy.kiosk.form.closedAttendanceModeTitle}
        Icon={Lock}
        onSelect={() => onChange('closed')}
      />
    </div>
  );
}

function AttendanceModeOption({
  description,
  Icon,
  isDisabled = false,
  isSelected,
  title,
  onSelect,
}: {
  description: string;
  Icon: LucideIcon;
  isDisabled?: boolean;
  isSelected: boolean;
  title: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onSelect}
      className={`rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isSelected
          ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#18715D] ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]'
          : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5]/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          isSelected
            ? 'bg-[#59C3A5] text-white dark:bg-[#8FE0CA] dark:text-slate-950'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
        }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2 text-sm font-semibold">
            <span>{title}</span>
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              isSelected ? 'border-[#59C3A5] bg-white text-[#59C3A5]' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-950'
            }`}
            >
              {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            </span>
          </span>
          <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
        </span>
      </div>
    </button>
  );
}
