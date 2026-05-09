import { Save, X } from 'lucide-react';
import { type AttendanceKioskDevicePayload } from '../../../../../api/humanResources';
import { Button } from '../../../../../components/ui/button';
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
  form: AttendanceKioskDevicePayload;
  isBusinessUnitKiosk: boolean;
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

const emptyLocationMessage = 'No active locations available for this kiosk type. Create a location first.';

const selectClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition focus:border-[#143675] focus:outline-none focus:ring-2 focus:ring-[#143675]/15 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900';
const inputClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm transition placeholder:text-slate-400 focus:border-[#143675] focus:outline-none focus:ring-2 focus:ring-[#143675]/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const referenceFromTitle = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${slug}-kiosk` : '';
};

export function CreateKioskModal({
  canSave,
  form,
  isBusinessUnitKiosk,
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
  const modalTitle = isEditing ? title : 'New kiosk';
  const modalDescription = isEditing
    ? 'Update how this kiosk is presented and where attendance can be registered.'
    : 'Create a clear attendance kiosk for a business, temporary location, or main office.';

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
        <div className="bg-[#143675] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-xl font-semibold text-white">{modalTitle}</DialogTitle>
              <DialogDescription className="text-sm text-white/80">{modalDescription}</DialogDescription>
            </DialogHeader>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
              aria-label="Close kiosk form"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-50 px-6 py-5 dark:bg-slate-950">
          <div className="grid gap-4">
            <KioskFormSection
              title="Kiosk type"
              description="Choose the real-world context where this kiosk will be used."
            >
              <KioskTypeSelector value={kioskType} onChange={onKioskTypeChange} />
            </KioskFormSection>

            <KioskFormSection
              title="Kiosk information"
              description="Use human-readable details so the team understands this device later."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    placeholder="Front desk kiosk"
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
                    This is the visible name for HR and supervisors.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reference <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    placeholder="front-desk-kiosk"
                    onChange={(event) => onChange({ ...form, code: event.target.value })}
                    className={inputClassName}
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Auto-filled when possible. Use a short internal reference.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Notes</label>
                <textarea
                  value={notesValue}
                  rows={3}
                  placeholder="Optional context for this kiosk"
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
              title="Scope / Location"
              description="Define who can use this kiosk and where attendance will be registered."
            >
              {isBusinessUnitKiosk ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Unit</label>
                    <select
                      value={form.unit_id ?? ''}
                      onChange={(event) => onUnitChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">All units</option>
                      {unitOptions.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Business</label>
                    <select
                      value={form.business_id ?? ''}
                      disabled={!form.unit_id}
                      onChange={(event) => onBusinessChange(event.target.value ? Number(event.target.value) : null)}
                      className={selectClassName}
                    >
                      <option value="">All businesses</option>
                      {form.unit_id ? businessOptions.map((business) => (
                        <option key={business.id} value={business.id}>{business.name}</option>
                      )) : null}
                    </select>
                  </div>

                  {!hasBusinessStructureLocations ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2">
                      {emptyLocationMessage}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2">
                      Leave both fields as all to make this kiosk available for the full company scope.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {kioskType === 'head_office' ? 'Main office' : 'Temporary location'}
                  </label>
                  <select
                    value={form.location_id ?? ''}
                    onChange={(event) => onLocationChange(event.target.value ? Number(event.target.value) : null)}
                    className={selectClassName}
                  >
                    <option value="">Select location</option>
                    {availableLocations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                  {availableLocations.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                      {emptyLocationMessage}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      HR users will register attendance from the selected location.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-[#143675]/5 px-3 py-2 text-xs font-medium text-[#143675] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]">
                Current scope: {selectedScopeLabel}
              </div>
            </KioskFormSection>

            {isEditing ? (
              <KioskFormSection title="Status" description="Deactivate a kiosk without deleting its history.">
                <select
                  value={form.status}
                  onChange={(event) => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })}
                  className={selectClassName}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </KioskFormSection>
            ) : null}
          </div>
        </div>

        <DialogFooter className="border-t border-[#0f2855] bg-[#143675] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-white text-[#143675] hover:bg-white/90"
            disabled={!canSave}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create kiosk'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
