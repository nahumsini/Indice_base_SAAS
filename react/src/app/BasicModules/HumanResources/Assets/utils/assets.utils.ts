import type {
  HrAsset,
  HrAssetsSummary,
  HrAssetStatus,
} from '../../../../api/HumanResources/assets';
import {
  formatBusinessCurrencyAmount,
  normalizeBusinessCurrencyCode,
} from '../../../shared/businessCurrency';
import type { AssetColumnConfig } from '../AssetColumnsModal';
import {
  assetTypeOptionByValue,
  type AddNewAssetType,
} from '../constants/assetCatalog';
import type { AssetsTranslations } from '../translations';
import type { AssetColumnId, AssetRow, AssetTypeFilter } from '../types/assets.types';

export const allAssetColumnIds: AssetColumnId[] = [
  'id',
  'type',
  'asset',
  'model',
  'serialNumber',
  'responsible',
  'unit',
  'status',
  'assignedAt',
  'value',
  'photos',
  'notes',
  'actions',
];

export const lockedAssetColumnIds: AssetColumnId[] = ['asset', 'actions'];

export const emptyAssetSummary: HrAssetsSummary = {
  total_count: 0,
  available_count: 0,
  assigned_count: 0,
  maintenance_count: 0,
  custody_count: 0,
  inactive_count: 0,
  total_value_amount: 0,
  value_totals_by_currency: {},
};

export const assignableAssetStatuses: HrAssetStatus[] = ['assigned', 'custody'];

export const normalizeAssetErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

export const getAssetTypeFilter = (assetType: string): AssetTypeFilter => {
  const normalized = assetType.trim().toLowerCase();

  if (assetTypeOptionByValue.has(normalized)) {
    return normalized as AddNewAssetType;
  }

  return 'other';
};

export const getAssetTypeIcon = (assetType: string) => {
  return assetTypeOptionByValue.get(getAssetTypeFilter(assetType))?.icon ?? '📦';
};

export const getAssetStatusClasses = (status: HrAssetStatus) => {
  const styles: Record<HrAssetStatus, string> = {
    available: 'bg-[#5c7cff]/15 text-[#89a0ff]',
    assigned: 'bg-emerald-500/15 text-emerald-400',
    maintenance: 'bg-amber-500/15 text-amber-400',
    custody: 'bg-slate-500/15 text-slate-300',
    inactive: 'bg-rose-500/15 text-rose-300',
  };

  return styles[status];
};

export const getAssetTypeLabel = (assetType: string, t: AssetsTranslations) => {
  const normalizedType = getAssetTypeFilter(assetType);
  const option = assetTypeOptionByValue.get(normalizedType);
  if (option) {
    return t.addNewAsset.options[option.labelKey];
  }

  return assetType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const getAssetStatusLabel = (status: HrAssetStatus, t: AssetsTranslations) => {
  const labelMap: Record<HrAssetStatus, string> = {
    available: t.filters.available,
    assigned: t.filters.assigned,
    maintenance: t.filters.inMaintenance,
    custody: t.filters.custody,
    inactive: t.filters.inactive,
  };

  return labelMap[status];
};

export const getAssetColumnConfig = (
  t: AssetsTranslations,
  visibleIds: AssetColumnId[],
): AssetColumnConfig[] => [
  { id: 'id', label: t.table.id, visible: visibleIds.includes('id') },
  { id: 'type', label: t.table.type, visible: visibleIds.includes('type') },
  { id: 'asset', label: t.table.asset, visible: visibleIds.includes('asset'), locked: true },
  { id: 'model', label: t.table.model, visible: visibleIds.includes('model') },
  { id: 'serialNumber', label: t.table.serialNumber, visible: visibleIds.includes('serialNumber') },
  { id: 'responsible', label: t.table.responsible, visible: visibleIds.includes('responsible') },
  { id: 'unit', label: t.table.unit, visible: visibleIds.includes('unit') },
  { id: 'status', label: t.table.status, visible: visibleIds.includes('status') },
  { id: 'assignedAt', label: t.table.assignedAt, visible: visibleIds.includes('assignedAt') },
  { id: 'value', label: t.table.value, visible: visibleIds.includes('value') },
  { id: 'photos', label: t.table.photos, visible: visibleIds.includes('photos') },
  { id: 'notes', label: t.table.notes, visible: visibleIds.includes('notes') },
  { id: 'actions', label: t.table.actions, visible: visibleIds.includes('actions'), locked: true },
];

export const formatAssetDate = (value: string | null, locale: string) => {
  if (!value) {
    return '-';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsedDate);
};

export const formatAssetNativeValue = (
  value: number | null,
  currency: string | null | undefined,
) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return formatBusinessCurrencyAmount(value, normalizeBusinessCurrencyCode(currency, 'USD'), {
    maximumFractionDigits: 0,
  });
};

export const normalizeComparableAssetDate = (value: string | null) => {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
};

export const mapAssetRow = (asset: HrAsset): AssetRow => ({
  backendId: asset.id,
  assetCode: asset.asset_code,
  assetType: asset.asset_type,
  assetTypeFilter: getAssetTypeFilter(asset.asset_type),
  name: asset.name,
  model: asset.model ?? '',
  serialNumber: asset.serial_number ?? '',
  responsibleName: asset.responsible_name || '',
  responsibleId: asset.responsible_user_company_id,
  responsibleEmail: asset.responsible_email ?? null,
  unitName: asset.unit_name ?? '',
  unitId: asset.unit_id,
  status: asset.status,
  assignedAt: asset.assigned_at,
  valueAmount: asset.value_amount,
  valueCurrency: normalizeBusinessCurrencyCode(asset.value_currency, 'USD'),
  photoCount: asset.photo_count ?? 0,
  notes: asset.notes ?? '',
});
