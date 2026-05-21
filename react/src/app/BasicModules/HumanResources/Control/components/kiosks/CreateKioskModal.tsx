import { Save, X } from 'lucide-react';
import { type AttendanceKioskDevicePayload } from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
import type { ControlTranslations } from '../../translations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../components/ui/dialog';
import { KioskFormSection } from './KioskFormSection';
import { KioskTypeSelector, type KioskType } from './KioskTypeSelector';

export interface KioskOption {
  id: number;
  name: string;
  unitId?: number | null;
  unitName?: string;
}

export interface CreateKioskModalProps {
  canSave: boolean;
  copy: ControlTranslations;
  form: AttendanceKioskDevicePayload;
  isBusinessUnitKiosk: boolean;
  isOpenAttendanceKiosk: boolean;
  isEditing: boolean;
  isOpen: boolean;
  isSaving: boolean;
  kioskType: KioskType;
  title: string;
  availableLocations: KioskOption[];
  businessOptions: KioskOption[];
  hasBusinessStructureLocations: boolean;
  selectedScopeLabel: string;
  unitOptions: KioskOption[];
  onChange: (value: AttendanceKioskDevicePayload) => void;
  onClose: () => void;
  onKioskTypeChange: (value: KioskType) => void;
  onLocationChange: (locationId: number | null) => void;
  onBusinessChange: (businessId: number | null) => void;
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
  canSave,
  copy,
  form,
  isBusinessUnitKiosk,
  isOpenAttendanceKiosk,
  isEditing,
  isOpen,
  isSaving,
  kioskType,
  title,
  availableLocations,
  businessOptions,
  hasBusinessStructureLocations,
  selectedScopeLabel,
  unitOptions,
  onChange,
  onClose,
  onKioskTypeChange,
  onLocationChange,
  onBusinessChange,
  onSave,
  onUnitChange,
}: CreateKioskModalProps) {
  const notesValue = typeof form.metadata?.notes === 'string' ? form.metadata.notes : '';
  const modalTitle = isEditing ? title : copy.kiosk.form.newTitle;
  const modalDescription = isEditing
    ? copy.kiosk.form.editDescription
    : copy.kiosk.form.createDescription;

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
        className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border border-slate-300 bg-white p-0 text-slate-950 shadow-2xl dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-3xl"
      >
        <div className="bg-[#59C3A5] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-xl font-semibold text-white">{modalTitle}</DialogTitle>
              <DialogDescription className="text-sm text-white/80">{modalDescription}</DialogDescription>
            </DialogHeader>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label={copy.kiosk.form.closeAria}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-50 px-6 py-5 dark:bg-slate-950">
          <div className="grid gap-4">
            <KioskFormSection
              title={copy.kiosk.form.typeSectionTitle}
              description={copy.kiosk.form.typeSectionDescription}
            >
              <KioskTypeSelector copy={copy} value={kioskType} onChange={onKioskTypeChange} />
            </KioskFormSection>

            <KioskFormSection
              title={copy.kiosk.form.pointInformationTitle}
              description={copy.kiosk.form.pointInformationDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2">
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

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {copy.kiosk.form.internalReferenceLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    placeholder={copy.kiosk.form.internalReferencePlaceholder}
                    onChange={(event) => onChange({ ...form, code: event.target.value })}
                    className={inputClassName}
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {copy.kiosk.form.internalReferenceHint}
                  </p>
                </div>
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

            <KioskFormSection
              title={copy.kiosk.form.scopeSectionTitle}
              description={copy.kiosk.form.scopeSectionDescription}
            >
              {isBusinessUnitKiosk ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.labels.unit}</label>
                    <select
                      value={form.unit_id ?? ''}
                      onChange={(event) => onUnitChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">{copy.labels.allUnits}</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{copy.labels.business}</label>
                    <select
                      value={form.business_id ?? ''}
                      disabled={!form.unit_id}
                      onChange={(event) => onBusinessChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">{copy.labels.allBusinesses}</option>
                      {form.unit_id ? businessOptions.map((business) => (
                        <option key={business.id} value={business.id}>{business.name}</option>
                      )) : null}
                    </select>
                  </div>

                  {!hasBusinessStructureLocations ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
                      {copy.kiosk.form.noActiveLocations}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                      {copy.kiosk.form.allScopeHint}
                    </p>
                  )}
                </div>
              ) : isOpenAttendanceKiosk ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100">
                  <p className="font-semibold">{copy.kiosk.form.openAttendanceTitle}</p>
                  <p className="mt-1 leading-6">
                    {copy.kiosk.form.openAttendanceDescription}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {kioskType === 'head_office' ? copy.kiosk.form.mainOfficeLabel : copy.kiosk.form.temporaryWorkSiteLabel}
                  </label>
                  <select
                    value={form.location_id ?? ''}
                    onChange={(event) => onLocationChange(event.target.value ? Number(event.target.value) : null)}
                    className={selectClassName}
                  >
                    <option value="">{copy.kiosk.form.selectLocation}</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  {availableLocations.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                      {copy.kiosk.form.noActiveLocations}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {copy.kiosk.form.selectedLocationHint}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-[#59C3A5]/5 px-3 py-3 text-sm font-medium text-[#59C3A5] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{copy.kiosk.form.availableForLabel}</p>
                <p className="mt-1">{selectedScopeLabel}</p>
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
        </div>

        <DialogFooter className="border-t border-[#3AAE90] bg-[#59C3A5] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            {copy.labels.cancel}
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-white text-[#59C3A5] hover:bg-white/90"
            disabled={!canSave}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            {isSaving
              ? copy.kiosk.form.saving
              : isEditing
                ? copy.kiosk.form.saveAttendancePoint
                : copy.kiosk.form.createAttendancePoint}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
