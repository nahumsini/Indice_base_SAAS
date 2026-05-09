import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { dashboardApi } from '../../../api/dashboard';
import {
  hrAssetsApi,
  type HrAsset,
  type HrAssetsSummary,
  type HrAssetStatus,
} from '../../../api/HumanResources/assets';
import { humanResourcesApi } from '../../../api/humanResources';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { useLanguage } from '../../../shared/context';
import { AddNewAssests, type AddNewAssetDraft, type AddNewAssetOption, type AddNewAssetType } from './AddNewAssests';
import { AssetDetailsModal } from './AssetDetailsModal';
import { AssetColumnConfig, AssetColumnsModal } from './AssetColumnsModal';
import { AssetFilters } from './components/AssetFilters';
import { AssetHeaderBar } from './components/AssetHeaderBar';
import { AssetKpiStrip } from './components/AssetKpiStrip';
import { useAssetsTranslations } from './hooks/useAssetsTranslations';
import type { AssetsTranslations } from './translations';

type AssetType = AddNewAssetType;
type AssetTypeFilter = AssetType | 'other';
type AssetColumnId =
  | 'id'
  | 'type'
  | 'asset'
  | 'model'
  | 'serialNumber'
  | 'responsible'
  | 'unit'
  | 'status'
  | 'assignedAt'
  | 'value'
  | 'notes'
  | 'actions';

interface AssetRow {
  backendId: number;
  assetCode: string;
  assetType: string;
  assetTypeFilter: AssetTypeFilter;
  name: string;
  model: string;
  serialNumber: string;
  responsibleName: string;
  responsibleId: number | null;
  responsibleEmail: string | null;
  unitName: string;
  unitId: number | null;
  status: HrAssetStatus;
  assignedAt: string | null;
  valueAmount: number | null;
  notes: string;
}

const allAssetColumnIds: AssetColumnId[] = [
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
  'notes',
  'actions',
];

const lockedAssetColumnIds: AssetColumnId[] = ['asset', 'actions'];

const emptySummary: HrAssetsSummary = {
  total_count: 0,
  available_count: 0,
  assigned_count: 0,
  maintenance_count: 0,
  custody_count: 0,
  inactive_count: 0,
  total_value_amount: 0,
};

const assignableStatuses: HrAssetStatus[] = ['assigned', 'custody'];

const normalizeErrorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message ? error.message : fallback
);

const getAssetTypeFilter = (assetType: string): AssetTypeFilter => {
  const normalized = assetType.trim().toLowerCase();

  if (normalized === 'laptop') {
    return 'laptop';
  }
  if (normalized === 'attendance') {
    return 'attendance';
  }
  if (normalized === 'operations') {
    return 'operations';
  }
  if (normalized === 'maintenance') {
    return 'maintenance';
  }

  return 'other';
};

const getAssetTypeIcon = (assetType: string) => {
  const iconMap: Record<AssetTypeFilter, string> = {
    laptop: '💻',
    attendance: '🖥️',
    operations: '📱',
    maintenance: '🧰',
    other: '📦',
  };

  return iconMap[getAssetTypeFilter(assetType)];
};

const getAssetStatusClasses = (status: HrAssetStatus) => {
  const styles: Record<HrAssetStatus, string> = {
    available: 'bg-[#5c7cff]/15 text-[#89a0ff]',
    assigned: 'bg-emerald-500/15 text-emerald-400',
    maintenance: 'bg-amber-500/15 text-amber-400',
    custody: 'bg-slate-500/15 text-slate-300',
    inactive: 'bg-rose-500/15 text-rose-300',
  };

  return styles[status];
};

const getAssetTypeLabel = (assetType: string, t: AssetsTranslations) => {
  const labelMap: Partial<Record<AssetTypeFilter, string>> = {
    laptop: t.addNewAsset.options.laptop,
    attendance: t.filters.attendanceControl,
    operations: t.filters.operation,
    maintenance: t.filters.maintenance,
  };

  const normalizedType = getAssetTypeFilter(assetType);
  if (normalizedType !== 'other') {
    return labelMap[normalizedType] ?? assetType;
  }

  return assetType
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getAssetStatusLabel = (status: HrAssetStatus, t: AssetsTranslations) => {
  const labelMap: Record<HrAssetStatus, string> = {
    available: t.filters.available,
    assigned: t.filters.assigned,
    maintenance: t.filters.inMaintenance,
    custody: t.filters.custody,
    inactive: t.filters.inactive,
  };

  return labelMap[status];
};

const getAssetColumnConfig = (
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
  { id: 'notes', label: t.table.notes, visible: visibleIds.includes('notes') },
  { id: 'actions', label: t.table.actions, visible: visibleIds.includes('actions'), locked: true },
];

const formatAssetDate = (value: string | null, locale: string) => {
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

const formatAssetValue = (value: number | null, locale: string) => {
  if (value === null || value === undefined) {
    return '-';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const normalizeComparableDate = (value: string | null) => {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
};

const mapAssetRow = (asset: HrAsset): AssetRow => ({
  backendId: asset.id,
  assetCode: asset.asset_code,
  assetType: asset.asset_type,
  assetTypeFilter: getAssetTypeFilter(asset.asset_type),
  name: asset.name,
  model: asset.model ?? '',
  serialNumber: asset.serial_number ?? '',
  responsibleName: asset.responsible_name || '',
  responsibleId: asset.responsible_employee_id,
  responsibleEmail: asset.responsible_email ?? null,
  unitName: asset.unit_name ?? '',
  unitId: asset.unit_id,
  status: asset.status,
  assignedAt: asset.assigned_at,
  valueAmount: asset.value_amount,
  notes: asset.notes ?? '',
});

export default function Assets() {
  const t = useAssetsTranslations();
  const { currentLanguage } = useLanguage();
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [summary, setSummary] = useState<HrAssetsSummary>(emptySummary);
  const [responsibleOptions, setResponsibleOptions] = useState<AddNewAssetOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<AddNewAssetOption[]>([]);
  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorageState<AssetColumnId[]>(
    'indice.hr.assets.visibleColumns.v2',
    allAssetColumnIds,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | HrAssetStatus>('all');
  const [unitFilter, setUnitFilter] = useState<'all' | string>('all');
  const [toastMessage, setToastMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('');
  const [assetPendingDeactivate, setAssetPendingDeactivate] = useState<AssetRow | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<HrAsset | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [assetEditing, setAssetEditing] = useState<AssetRow | null>(null);

  const normalizedVisibleColumnIds = useMemo(() => {
    const nextVisible = allAssetColumnIds.filter(
      (columnId) => visibleColumnIds.includes(columnId) || lockedAssetColumnIds.includes(columnId),
    );
    return nextVisible.length ? nextVisible : allAssetColumnIds;
  }, [visibleColumnIds]);

  const visibleColumnSet = useMemo(() => new Set(normalizedVisibleColumnIds), [normalizedVisibleColumnIds]);
  const assetColumnConfig = useMemo(
    () => getAssetColumnConfig(t, normalizedVisibleColumnIds),
    [normalizedVisibleColumnIds, t],
  );

  const filteredAssets = useMemo(
    () =>
      assetRows.filter((asset) => {
        const haystack = [
          asset.assetCode,
          asset.name,
          asset.assetType,
          asset.model,
          asset.serialNumber,
          asset.responsibleName,
          asset.unitName,
          asset.notes,
        ]
          .join(' ')
          .toLowerCase();
        const matchesSearch = haystack.includes(searchQuery.trim().toLowerCase());
        const matchesType = typeFilter === 'all' || asset.assetTypeFilter === typeFilter;
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesUnit = unitFilter === 'all' || String(asset.unitId ?? '') === unitFilter;

        return matchesSearch && matchesType && matchesStatus && matchesUnit;
      }),
    [assetRows, searchQuery, statusFilter, typeFilter, unitFilter],
  );

  const runAssetOperation = async <T,>(title: string, task: () => Promise<T>) => {
    setIsSubmitting(true);
    setLoadingTitle(title);

    try {
      return await runWithMinimumDuration(task());
    } finally {
      setIsSubmitting(false);
      setLoadingTitle('');
    }
  };

  const loadAssets = async () => {
    const response = await hrAssetsApi.listAssets({ page: 1, size: 100 });
    setAssetRows(response.items.map(mapAssetRow));
    setSummary(response.summary ?? emptySummary);
  };

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsInitialLoading(true);
      setLoadError(null);

      const [assetsResult, employeesResult, unitsResult] = await Promise.allSettled([
        hrAssetsApi.listAssets({ page: 1, size: 100 }),
        humanResourcesApi.listEmployees(),
        dashboardApi.listUnits(),
      ]);

      if (!isMounted) {
        return;
      }

      if (assetsResult.status === 'fulfilled') {
        setAssetRows(assetsResult.value.items.map(mapAssetRow));
        setSummary(assetsResult.value.summary ?? emptySummary);
      } else {
        setAssetRows([]);
        setSummary(emptySummary);
        setLoadError(normalizeErrorMessage(assetsResult.reason, t.errors.load));
      }

      if (employeesResult.status === 'fulfilled') {
        const activeEmployees = employeesResult.value.items.filter((employee) => {
          const status = String(employee.status ?? '').trim().toLowerCase();
          return !status || status === 'active' || status === 'activo';
        });

        setResponsibleOptions(
          activeEmployees.map((employee) => ({
            value: String(employee.id),
            label: employee.full_name,
          })),
        );
      } else {
        setResponsibleOptions([]);
      }

      if (unitsResult.status === 'fulfilled') {
        const activeUnits = unitsResult.value.filter((unit) => {
          const status = String(unit.status ?? '').trim().toLowerCase();
          return !status || status === 'active' || status === 'activo';
        });

        setUnitOptions(
          activeUnits.map((unit) => ({
            value: String(unit.id),
            label: unit.name,
          })),
        );
      } else {
        setUnitOptions([]);
      }

      setIsInitialLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [t.errors.load]);

  const handleCreateAsset = () => {
    setAssetEditing(null);
    setIsAddAssetOpen(true);
  };

  const handleViewDetails = async (asset: AssetRow) => {
    try {
      const detail = await runAssetOperation(t.actionsMenu.viewDetails, () =>
        hrAssetsApi.getAssetDetails(asset.backendId),
      );
      setSelectedAssetDetails(detail);
      setIsDetailsModalOpen(true);
    } catch (error) {
      window.alert(normalizeErrorMessage(error, t.errors.details));
    }
  };

  const handleEditAsset = (asset: AssetRow) => {
    setAssetEditing(asset);
    setIsAddAssetOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!assetPendingDeactivate) {
      return;
    }

    try {
      await runAssetOperation(t.confirmDeactivate.confirm, () =>
        hrAssetsApi.changeAssetStatus(assetPendingDeactivate.backendId, {
          status: 'inactive',
          change_reason: 'deactivated',
        }),
      );
      await loadAssets();
      setToastMessage(t.actionAlerts.deactivated(assetPendingDeactivate.name));
      setAssetPendingDeactivate(null);
    } catch (error) {
      window.alert(normalizeErrorMessage(error, t.errors.status));
    }
  };

  const handleSaveAsset = async (draft: AddNewAssetDraft) => {
    const trimmedResponsible = draft.responsible.trim();
    const trimmedUnit = draft.unit.trim();
    const trimmedValue = draft.value.trim();
    const trimmedNotes = draft.notes.trim();

    try {
      if (assetEditing) {
        const desiredUnitId = trimmedUnit ? Number(trimmedUnit) : null;
        const desiredResponsibleId = trimmedResponsible ? Number(trimmedResponsible) : null;
        const desiredAssignedDate = draft.assignedDate || '';
        const currentAssignedDate = normalizeComparableDate(assetEditing.assignedAt);
        const currentIsAssignmentStatus = assignableStatuses.includes(assetEditing.status);
        const desiredIsAssignmentStatus = assignableStatuses.includes(draft.status);
        const lifecycleStatusChanged = assetEditing.status !== draft.status;
        const unitHandledByUpdate = !currentIsAssignmentStatus && !desiredIsAssignmentStatus && !lifecycleStatusChanged;

        const updatePayload = {
          asset_code: draft.id.trim(),
          asset_type: draft.assetType,
          name: draft.name.trim(),
          model: draft.model.trim() || null,
          serial_number: draft.serialNumber.trim() || null,
          unit_id: unitHandledByUpdate ? desiredUnitId : undefined,
          value: trimmedValue || null,
          notes: trimmedNotes || null,
        };

        const needsMetadataUpdate =
          updatePayload.asset_code !== assetEditing.assetCode
          || updatePayload.asset_type !== assetEditing.assetType
          || updatePayload.name !== assetEditing.name
          || (updatePayload.model ?? '') !== assetEditing.model
          || (updatePayload.serial_number ?? '') !== assetEditing.serialNumber
          || (trimmedValue ? Number(trimmedValue.replace(/[^0-9.-]/g, '')) : null) !== assetEditing.valueAmount
          || (trimmedNotes || '') !== assetEditing.notes
          || (unitHandledByUpdate && desiredUnitId !== assetEditing.unitId);

        await runAssetOperation(t.actionsMenu.edit, async () => {
          if (needsMetadataUpdate) {
            await hrAssetsApi.updateAsset(assetEditing.backendId, updatePayload);
          }

          if (desiredIsAssignmentStatus) {
            const assignmentStatus = draft.status as Extract<HrAssetStatus, 'assigned' | 'custody'>;
            const assignmentChanged =
              assetEditing.status !== draft.status
              || assetEditing.responsibleId !== desiredResponsibleId
              || assetEditing.unitId !== desiredUnitId
              || currentAssignedDate !== desiredAssignedDate;

            if (assignmentChanged) {
              await hrAssetsApi.reassignAsset(assetEditing.backendId, {
                responsible_employee_id: Number(desiredResponsibleId),
                unit_id: desiredUnitId ?? undefined,
                status: assignmentStatus,
                assigned_date: desiredAssignedDate || undefined,
                notes: trimmedNotes || undefined,
              });
            }
          } else if (assetEditing.status !== draft.status) {
            await hrAssetsApi.changeAssetStatus(assetEditing.backendId, {
              status: draft.status,
              unit_id: desiredUnitId,
              notes: trimmedNotes || undefined,
              change_reason: 'manual_update',
            });
          }
        });

        await loadAssets();
        setIsAddAssetOpen(false);
        setAssetEditing(null);
        setToastMessage(t.addNewAsset.successUpdated(draft.name));
        return true;
      }

      const payload = {
        asset_code: draft.id.trim(),
        asset_type: draft.assetType,
        name: draft.name.trim(),
        model: draft.model.trim() || undefined,
        serial_number: draft.serialNumber.trim() || undefined,
        unit_id: trimmedUnit ? Number(trimmedUnit) : undefined,
        status: draft.status,
        assigned_date: assignableStatuses.includes(draft.status) ? draft.assignedDate || undefined : undefined,
        responsible_employee_id:
          assignableStatuses.includes(draft.status) && trimmedResponsible
            ? Number(trimmedResponsible)
            : undefined,
        value: trimmedValue || undefined,
        notes: trimmedNotes || undefined,
      };

      await runAssetOperation(t.addNewAsset.buttons.save, () => hrAssetsApi.createAsset(payload));
      await loadAssets();
      setIsAddAssetOpen(false);
      setAssetEditing(null);
      setToastMessage(t.addNewAsset.success(draft.name));
      return true;
    } catch (error) {
      window.alert(normalizeErrorMessage(error, t.errors.save));
      return false;
    }
  };

  const handleApplyColumns = (columns: AssetColumnConfig[]) => {
    const nextVisibleIds = allAssetColumnIds.filter((columnId) => {
      const column = columns.find((item) => item.id === columnId);
      return column?.visible || lockedAssetColumnIds.includes(columnId);
    });

    setVisibleColumnIds(nextVisibleIds);
  };

  const assetDraftForModal = useMemo<AddNewAssetDraft | null>(
    () => (assetEditing
      ? {
          id: assetEditing.assetCode,
          assetType: assetEditing.assetTypeFilter === 'other' ? 'operations' : assetEditing.assetTypeFilter,
          name: assetEditing.name,
          model: assetEditing.model,
          serialNumber: assetEditing.serialNumber,
          responsible: assetEditing.responsibleId ? String(assetEditing.responsibleId) : '',
          unit: assetEditing.unitId ? String(assetEditing.unitId) : '',
          status: assetEditing.status,
          assignedDate: assetEditing.assignedAt ? assetEditing.assignedAt.slice(0, 10) : '',
          value: assetEditing.valueAmount === null ? '' : String(assetEditing.valueAmount),
          notes: assetEditing.notes,
        }
      : null),
    [assetEditing],
  );

  return (
    <>
      <AssetHeaderBar
        copy={t}
        onAdd={handleCreateAsset}
        onColumns={() => setIsColumnsModalOpen(true)}
      />

      <AssetFilters
        copy={t}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        unitFilter={unitFilter}
        unitOptions={unitOptions}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onUnitChange={setUnitFilter}
      />

      <AssetKpiStrip
        copy={t}
        assignedCount={summary.assigned_count}
        availableCount={summary.available_count}
        locale={currentLanguage.code}
        maintenanceCount={summary.maintenance_count}
        totalCount={summary.total_count}
        totalValueAmount={summary.total_value_amount}
        visibleCount={filteredAssets.length}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-sm dark:border-gray-700 dark:bg-gray-800/95">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-700/60">
              <tr>
                {assetColumnConfig
                  .filter((column) => column.visible)
                  .map((column) => (
                    <th
                      key={column.id}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400"
                    >
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isInitialLoading ? (
                <tr>
                  <td
                    colSpan={assetColumnConfig.filter((column) => column.visible).length}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t.loading}
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td
                    colSpan={assetColumnConfig.filter((column) => column.visible).length}
                    className="px-5 py-10 text-center text-sm text-rose-500 dark:text-rose-300"
                  >
                    {loadError}
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={assetColumnConfig.filter((column) => column.visible).length}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t.emptyState}
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr
                    key={asset.backendId}
                    className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                  >
                    {visibleColumnSet.has('id') ? (
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{asset.assetCode}</td>
                    ) : null}
                    {visibleColumnSet.has('type') ? (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getAssetTypeIcon(asset.assetType)}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{getAssetTypeLabel(asset.assetType, t)}</span>
                        </div>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('asset') ? (
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{asset.name}</p>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('model') ? (
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.model || t.emptyValue}</td>
                    ) : null}
                    {visibleColumnSet.has('serialNumber') ? (
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.serialNumber || t.emptyValue}</td>
                    ) : null}
                    {visibleColumnSet.has('responsible') ? (
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.responsibleName || t.emptyValue}</td>
                    ) : null}
                    {visibleColumnSet.has('unit') ? (
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{asset.unitName || t.emptyValue}</td>
                    ) : null}
                    {visibleColumnSet.has('status') ? (
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getAssetStatusClasses(
                            asset.status,
                          )}`}
                        >
                          {asset.status === 'assigned'
                            ? `✅ ${getAssetStatusLabel(asset.status, t)}`
                            : getAssetStatusLabel(asset.status, t)}
                        </span>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('assignedAt') ? (
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatAssetDate(asset.assignedAt, currentLanguage.code)}
                      </td>
                    ) : null}
                    {visibleColumnSet.has('value') ? (
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatAssetValue(asset.valueAmount, currentLanguage.code)}
                      </td>
                    ) : null}
                    {visibleColumnSet.has('notes') ? (
                      <td className="max-w-[14rem] px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <p className="line-clamp-2">{asset.notes || t.emptyValue}</p>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('actions') ? (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            type="button"
                            onClick={() => void handleViewDetails(asset)}
                            aria-label={t.actionsMenu.viewDetails}
                            title={t.actionsMenu.viewDetails}
                            className="text-gray-400 transition hover:text-gray-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditAsset(asset)}
                            aria-label={t.actionsMenu.edit}
                            title={t.actionsMenu.edit}
                            className="text-[#7b82ff] transition hover:text-[#9fa4ff]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssetPendingDeactivate(asset)}
                            aria-label={t.actionsMenu.delete}
                            title={t.actionsMenu.delete}
                            className="text-red-500 transition hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDeleteDialog
        isVisible={assetPendingDeactivate !== null}
        title={t.confirmDeactivate.title}
        itemName={assetPendingDeactivate?.name}
        description={t.confirmDeactivate.description}
        confirmLabel={t.confirmDeactivate.confirm}
        cancelLabel={t.confirmDeactivate.cancel}
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setAssetPendingDeactivate(null)}
      />

      <SuccessToast
        isVisible={Boolean(toastMessage)}
        message={toastMessage}
        onClose={() => setToastMessage('')}
      />

      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={loadingTitle || t.loading}
      />

      <AddNewAssests
        isOpen={isAddAssetOpen}
        onClose={() => {
          setIsAddAssetOpen(false);
          setAssetEditing(null);
        }}
        onSave={handleSaveAsset}
        responsibleOptions={responsibleOptions}
        unitOptions={unitOptions}
        mode={assetEditing ? 'edit' : 'create'}
        initialDraft={assetDraftForModal}
      />

      <AssetDetailsModal
        isOpen={isDetailsModalOpen}
        asset={selectedAssetDetails}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedAssetDetails(null);
        }}
      />

      <AssetColumnsModal
        copy={t.columnPicker}
        isOpen={isColumnsModalOpen}
        onClose={() => setIsColumnsModalOpen(false)}
        columns={assetColumnConfig}
        onApply={handleApplyColumns}
      />
    </>
  );
}
