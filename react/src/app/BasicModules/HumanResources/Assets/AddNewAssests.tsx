import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, PackageCheck, PackagePlus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { IndiceModalFrame } from '../../../components/indice-modal';
import { cn } from '../../../components/ui/utils';
import {
  businessCurrencyOptions,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import {
  assetTypeOptions,
  type AddNewAssetType,
} from './constants/assetCatalog';
import { useAssetsTranslations } from './hooks/useAssetsTranslations';
import { useAssetsPortalTheme } from './useAssetsPortalTheme';

export type { AddNewAssetType } from './constants/assetCatalog';
export type AddNewAssetStatus = 'available' | 'assigned' | 'maintenance' | 'custody' | 'inactive';

export interface AddNewAssetOption {
  value: string;
  label: string;
}

export interface AddNewAssetPhotoDraft {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  caption?: string;
}

export interface AddNewAssetDraft {
  assetType: AddNewAssetType;
  name: string;
  model: string;
  serialNumber: string;
  responsible: string;
  unit: string;
  status: AddNewAssetStatus;
  assignedDate: string;
  value: string;
  currency: string;
  photos: AddNewAssetPhotoDraft[];
  notes: string;
}

interface AddNewAssestsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: AddNewAssetDraft) => Promise<boolean | void> | boolean | void;
  responsibleOptions: AddNewAssetOption[];
  unitOptions: AddNewAssetOption[];
  preferredCurrency: string;
  mode?: 'create' | 'edit';
  initialDraft?: AddNewAssetDraft | null;
}

const emptyDraft: AddNewAssetDraft = {
  assetType: 'laptop',
  name: '',
  model: '',
  serialNumber: '',
  responsible: '',
  unit: '',
  status: 'available',
  assignedDate: '',
  value: '',
  currency: 'USD',
  photos: [],
  notes: '',
};

const maxAssetPhotoCount = 8;
const maxAssetPhotoSize = 2_500_000;
const acceptedAssetPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const readPhotoAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

export function AddNewAssests({
  isOpen,
  onClose,
  onSave,
  responsibleOptions,
  unitOptions,
  preferredCurrency,
  mode = 'create',
  initialDraft = null,
}: AddNewAssestsProps) {
  const t = useAssetsTranslations().addNewAsset;
  const defaultCurrency = normalizeBusinessCurrencyCode(preferredCurrency, 'USD');
  const emptyDraftForCurrency = useMemo<AddNewAssetDraft>(
    () => ({ ...emptyDraft, currency: defaultCurrency }),
    [defaultCurrency],
  );
  const baseDraft = initialDraft ?? emptyDraftForCurrency;
  const [draft, setDraft] = useState<AddNewAssetDraft>(baseDraft);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDarkMode = useAssetsPortalTheme();
  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (isOpen) {
      setDraft(baseDraft);
      setPhotoError('');
      return;
    }

    setDraft(emptyDraftForCurrency);
    setPhotoError('');
  }, [baseDraft, emptyDraftForCurrency, isOpen]);

  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(baseDraft),
    [baseDraft, draft],
  );

  const canSave = useMemo(
    () =>
      Boolean(
        draft.assetType
        && draft.name.trim()
        && (!['assigned', 'custody'].includes(draft.status) || draft.responsible)
        && (!isEditMode || hasChanges)
      ),
    [draft.assetType, draft.name, draft.responsible, draft.status, hasChanges, isEditMode],
  );

  const handleFieldChange = <K extends keyof AddNewAssetDraft>(field: K, value: AddNewAssetDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleCancel = () => {
    setDraft(emptyDraftForCurrency);
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

    setDraft(emptyDraftForCurrency);
  };

  const inputClassName = cn(
    'w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#59C3A5] focus:ring-2',
    isDarkMode
      ? 'border-gray-700 bg-gray-900/70 text-white placeholder:text-slate-400/80 focus:ring-[#59C3A5]/25 [color-scheme:dark]'
      : 'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-[#59C3A5]/20 [color-scheme:light]',
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

  const handleSelectPhotos = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    const availableSlots = Math.max(0, maxAssetPhotoCount - draft.photos.length);
    if (availableSlots === 0) {
      setPhotoError(t.photoUploader.tooMany);
      return;
    }

    const filesToRead = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      setPhotoError(t.photoUploader.tooMany);
    } else {
      setPhotoError('');
    }

    const nextPhotos: AddNewAssetPhotoDraft[] = [];
    for (const file of filesToRead) {
      if (!acceptedAssetPhotoTypes.has(file.type)) {
        setPhotoError(t.photoUploader.unsupported);
        continue;
      }
      if (file.size > maxAssetPhotoSize) {
        setPhotoError(t.photoUploader.tooLarge);
        continue;
      }

      const dataUrl = await readPhotoAsDataUrl(file);
      nextPhotos.push({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        dataUrl,
      });
    }

    if (nextPhotos.length) {
      setDraft((current) => ({
        ...current,
        photos: [...current.photos, ...nextPhotos].slice(0, maxAssetPhotoCount),
      }));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoError('');
    setDraft((current) => ({
      ...current,
      photos: current.photos.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  return (
    <IndiceModalFrame
      closeLabel={t.buttons.cancel}
      description={modalSubtitle}
      footer={(
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {saveLabel}
        </Button>
      )}
      footerLeading={(
        <Button type="button" variant="outline" onClick={handleCancel}>
          {t.buttons.cancel}
        </Button>
      )}
      icon={isEditMode ? <PackageCheck className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={(open) => (!open ? handleCancel() : undefined)}
      open={isOpen}
      title={modalTitle}
      tone="aqua"
    >
          <div className="space-y-6">
            <section className={sectionClassName}>
              <div className={cn('mb-4 border-b pb-2', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
                <h3 className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
                  {t.sections.general}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName}>
                    {t.fields.assetType} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={draft.assetType}
                    onChange={(event) => handleFieldChange('assetType', event.target.value as AddNewAssetType)}
                    className={selectClassName}
                  >
                    {assetTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t.options[option.labelKey]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
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
                <h3 className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
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
                <h3 className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
                  {t.sections.valueDetails}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(9rem,12rem)]">
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
                  <label className={labelClassName}>{t.fields.currency}</label>
                  <select
                    value={draft.currency}
                    onChange={(event) => handleFieldChange('currency', event.target.value)}
                    className={selectClassName}
                  >
                    {businessCurrencyOptions.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
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

            <section className={sectionClassName}>
              <div className={cn('mb-4 border-b pb-2', isDarkMode ? 'border-white/10' : 'border-gray-200')}>
                <h3 className={cn('text-sm font-medium', isDarkMode ? 'text-slate-300' : 'text-gray-600')}>
                  {t.sections.photos}
                </h3>
              </div>

              <div className={cn(
                'rounded-2xl border p-4',
                isDarkMode ? 'border-[#59C3A5]/25 bg-[#59C3A5]/10' : 'border-[#bfeee3] bg-[#f0fbf8]',
              )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium', isDarkMode ? 'text-white' : 'text-slate-900')}>
                      {t.photoUploader.title}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
                      {t.photoUploader.subtitle}
                    </p>
                    <p className={cn('mt-1 text-xs leading-5', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                      {t.photoUploader.hint}
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      void handleSelectPhotos(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 rounded-xl bg-[#59C3A5] font-medium text-slate-950 hover:bg-[#43ad90]"
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {t.photoUploader.browse}
                  </Button>
                </div>

                {photoError ? (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {photoError}
                  </p>
                ) : null}

                {draft.photos.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {draft.photos.map((photo, index) => (
                      <div
                        key={`${photo.fileName}-${photo.sizeBytes}-${index}`}
                        className={cn(
                          'group overflow-hidden rounded-2xl border',
                          isDarkMode ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white',
                        )}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <img
                            src={photo.dataUrl}
                            alt={`${t.photoUploader.preview} ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            aria-label={t.photoUploader.remove}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-600 shadow-sm transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="px-3 py-2">
                          <p className={cn('truncate text-xs font-medium', isDarkMode ? 'text-white' : 'text-slate-800')}>
                            {photo.fileName}
                          </p>
                          <p className={cn('mt-0.5 text-[11px]', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
                            {(photo.sizeBytes / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn(
                    'mt-4 rounded-2xl border border-dashed px-4 py-6 text-center text-sm font-medium',
                    isDarkMode ? 'border-white/15 text-slate-400' : 'border-slate-300 text-slate-500',
                  )}
                  >
                    {t.photoUploader.empty}
                  </div>
                )}
              </div>
            </section>
          </div>
    </IndiceModalFrame>
  );
}
