import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { cn } from '../../../components/ui/utils';
import { useHRLanguage } from '../HRLanguage';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';

export type AddNewAssetType = 'laptop' | 'attendance' | 'operations' | 'maintenance';
export type AddNewAssetStatus = 'available' | 'assigned' | 'maintenance' | 'custody' | 'inactive';

export interface AddNewAssetOption {
  value: string;
  label: string;
}

export interface AddNewAssetDraft {
  id: string;
  assetType: AddNewAssetType;
  name: string;
  model: string;
  serialNumber: string;
  responsible: string;
  unit: string;
  status: AddNewAssetStatus;
  assignedDate: string;
  value: string;
  notes: string;
}

interface AddNewAssestsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: AddNewAssetDraft) => Promise<boolean | void> | boolean | void;
  responsibleOptions: AddNewAssetOption[];
  unitOptions: AddNewAssetOption[];
  mode?: 'create' | 'edit';
  initialDraft?: AddNewAssetDraft | null;
}

const emptyDraft: AddNewAssetDraft = {
  id: '',
  assetType: 'laptop',
  name: '',
  model: '',
  serialNumber: '',
  responsible: '',
  unit: '',
  status: 'available',
  assignedDate: '',
  value: '',
  notes: '',
};

export function AddNewAssests({
  isOpen,
  onClose,
  onSave,
  responsibleOptions,
  unitOptions,
  mode = 'create',
  initialDraft = null,
}: AddNewAssestsProps) {
  const t = useHRLanguage().assets.addNewAsset;
  const baseDraft = initialDraft ?? emptyDraft;
  const [draft, setDraft] = useState<AddNewAssetDraft>(baseDraft);
  const isDarkMode = useAssetsPortalTheme();
  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (isOpen) {
      setDraft(baseDraft);
      return;
    }

    setDraft(emptyDraft);
  }, [baseDraft, isOpen]);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseDraft),
    [baseDraft, draft],
  );

  const canSave = useMemo(
    () =>
      Boolean(
        draft.id.trim()
        && draft.assetType
        && draft.name.trim()
        && (!['assigned', 'custody'].includes(draft.status) || draft.responsible)
        && (!isEditMode || hasChanges)
      ),
    [draft.assetType, draft.id, draft.name, draft.responsible, draft.status, hasChanges, isEditMode],
  );

  const handleFieldChange = <K extends keyof AddNewAssetDraft>(field: K, value: AddNewAssetDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleCancel = () => {
    setDraft(emptyDraft);
    onClose();
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const result = await onSave(draft);
    if (result === false) {
      return;
    }

    setDraft(emptyDraft);
  };

  const inputClassName = cn(
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#6d5dfc] focus:ring-2',
    isDarkMode
      ? 'border-gray-700 bg-gray-900/70 text-white placeholder:text-slate-400/80 focus:ring-[#6d5dfc]/25 [color-scheme:dark]'
      : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-[#6d5dfc]/20 [color-scheme:light]',
  );

  const selectClassName = `${inputClassName} appearance-none cursor-pointer`;
  const labelClassName = cn('mb-1.5 block text-sm font-medium', isDarkMode ? 'text-slate-200' : 'text-gray-700');
  const sectionClassName = cn(
    'rounded-xl border p-4',
    isDarkMode ? 'border-gray-700 bg-gray-900/35' : 'border-gray-200 bg-gray-50/90',
  );
  const isAssignmentStatus = ['assigned', 'custody'].includes(draft.status);
  const modalTitle = isEditMode ? t.editTitle : t.title;
  const modalSubtitle = isEditMode ? t.editSubtitle : t.subtitle;
  const saveLabel = isEditMode ? t.buttons.saveChanges : t.buttons.save;

  const handleStatusChange = (nextStatus: AddNewAssetStatus) => {
    setDraft((current) => ({
      ...current,
      status: nextStatus,
      responsible: ['assigned', 'custody'].includes(nextStatus) ? current.responsible : '',
      assignedDate: ['assigned', 'custody'].includes(nextStatus) ? current.assignedDate : '',
    }));
  };

  const handleResponsibleChange = (value: string) => {
    setDraft((current) => ({
      ...current,
      responsible: value,
      status: value && !['assigned', 'custody'].includes(current.status) ? 'assigned' : current.status,
    }));
  };

  const handleAssignedDateChange = (value: string) => {
    setDraft((current) => ({
      ...current,
      assignedDate: value,
      status: value && !['assigned', 'custody'].includes(current.status) ? 'assigned' : current.status,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleCancel() : undefined)}>
      <DialogContent
        className={cn(
          'max-w-3xl p-0 sm:rounded-2xl',
          isDarkMode
            ? 'border border-gray-700 bg-gray-800/95 text-white shadow-[0_28px_60px_rgba(4,10,30,0.5)]'
            : 'border border-gray-200 bg-white text-gray-900 shadow-[0_28px_60px_rgba(15,23,42,0.18)]',
        )}
      >
        <DialogHeader
          className={cn(
            'border-b px-6 py-5 text-left',
            isDarkMode
              ? 'border-gray-700 bg-[linear-gradient(135deg,rgba(20,54,117,0.18)_0%,rgba(37,24,130,0.22)_100%)]'
              : 'border-gray-200 bg-[linear-gradient(135deg,#f7faff_0%,#eef3ff_100%)]',
          )}
        >
          <DialogTitle className={cn('flex items-center gap-2 text-2xl font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
            <span className="text-xl">🏢</span>
            {modalTitle}
          </DialogTitle>
          <DialogDescription className={cn('text-sm', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
            {modalSubtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className={cn('mb-4 border-b pb-2', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
                <h3 className={cn('text-sm font-semibold uppercase tracking-[0.14em]', isDarkMode ? 'text-slate-300' : 'text-gray-500')}>
                  {t.sections.general}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>
                    {t.fields.assetId} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.id}
                    onChange={(event) => handleFieldChange('id', event.target.value)}
                    placeholder={t.placeholders.assetId}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>
                    {t.fields.assetType} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={draft.assetType}
                    onChange={(event) => handleFieldChange('assetType', event.target.value as AddNewAssetType)}
                    className={selectClassName}
                  >
                    <option value="laptop">{t.options.laptop}</option>
                    <option value="attendance">{t.options.attendanceTerminal}</option>
                    <option value="operations">{t.options.mobileDevice}</option>
                    <option value="maintenance">{t.options.maintenanceKit}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>
                    {t.fields.assetName} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    placeholder={t.placeholders.assetName}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.model}</label>
                  <input
                    type="text"
                    value={draft.model}
                    onChange={(event) => handleFieldChange('model', event.target.value)}
                    placeholder={t.placeholders.model}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.serialNumber}</label>
                  <input
                    type="text"
                    value={draft.serialNumber}
                    onChange={(event) => handleFieldChange('serialNumber', event.target.value)}
                    placeholder={t.placeholders.serialNumber}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className={cn('mb-4 border-b pb-2', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
                <h3 className={cn('text-sm font-semibold uppercase tracking-[0.14em]', isDarkMode ? 'text-slate-300' : 'text-gray-500')}>
                  {t.sections.assignment}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>{t.fields.responsible}</label>
                  <select
                    value={draft.responsible}
                    onChange={(event) => handleResponsibleChange(event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">{t.placeholders.responsible}</option>
                    {responsibleOptions.map((responsible) => (
                      <option key={responsible.value} value={responsible.value}>
                        {responsible.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.unit}</label>
                  <select
                    value={draft.unit}
                    onChange={(event) => handleFieldChange('unit', event.target.value)}
                    className={selectClassName}
                  >
                    <option value="">{t.placeholders.unit}</option>
                    {unitOptions.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.status}</label>
                  <select
                    value={draft.status}
                    onChange={(event) => handleStatusChange(event.target.value as AddNewAssetStatus)}
                    className={selectClassName}
                  >
                    <option value="available">{t.options.available}</option>
                    <option value="assigned">{t.options.assigned}</option>
                    <option value="maintenance">{t.options.maintenance}</option>
                    <option value="custody">{t.options.custody}</option>
                    <option value="inactive">{t.options.inactive}</option>
                  </select>
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.assignedDate}</label>
                  <input
                    type="date"
                    value={draft.assignedDate}
                    onChange={(event) => handleAssignedDateChange(event.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            <section className={sectionClassName}>
              <div className={cn('mb-4 border-b pb-2', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
                <h3 className={cn('text-sm font-semibold uppercase tracking-[0.14em]', isDarkMode ? 'text-slate-300' : 'text-gray-500')}>
                  {t.sections.valueDetails}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelClassName}>{t.fields.value}</label>
                  <input
                    type="text"
                    value={draft.value}
                    onChange={(event) => handleFieldChange('value', event.target.value)}
                    placeholder={t.placeholders.value}
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className={labelClassName}>{t.fields.notes}</label>
                  <textarea
                    value={draft.notes}
                    onChange={(event) => handleFieldChange('notes', event.target.value)}
                    placeholder={t.placeholders.notes}
                    rows={4}
                    className={`${inputClassName} resize-none`}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <DialogFooter
          className={cn(
            'border-t px-6 py-4 sm:justify-end',
            isDarkMode ? 'border-gray-700 bg-gray-900/55' : 'border-gray-200 bg-gray-50',
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className={cn(
              'hover:text-white',
              isDarkMode
                ? 'border-gray-600 bg-gray-800 text-slate-200 hover:bg-gray-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            )}
          >
            {t.buttons.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="bg-[#5d35ff] text-white hover:bg-[#4e29ef] disabled:cursor-not-allowed disabled:bg-[#3c365f] disabled:text-slate-400"
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
