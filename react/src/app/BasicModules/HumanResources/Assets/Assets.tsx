import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Eye, Images, Pencil, Trash2 } from 'lucide-react';
import { isHrManagementRole } from '../../../access/accessRules';
import { authApi } from '../../../api/auth';
import { dashboardApi } from '../../../api/dashboard';
import {
  hrAssetsApi,
  type HrAsset,
  type HrAssetPhoto,
  type HrAssetsSummary,
  type HrAssetStatus,
} from '../../../api/HumanResources/assets';
import { humanResourcesApi } from '../../../api/humanResources';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { FailureToast } from '../../../components/FailureToast';
import { SuccessToast } from '../../../components/SuccessToast';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import { useLanguage } from '../../../shared/context';
import {
  StandardActionButton,
  StandardPaginationFooter,
  StandardSortIcon,
  type StandardSortDirection,
} from '../shared/StandardTableControls';
import {
  convertBusinessCurrencyAmount,
  formatBusinessCurrencyAmount,
  formatBusinessCurrencyBreakdown,
  normalizeBusinessCurrencyCode,
} from '../../shared/businessCurrency';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import type { AddNewAssetDraft, AddNewAssetOption } from './AddNewAssests';
import type { AssetColumnConfig } from './AssetColumnsModal';
import { assetTypeOptionByValue } from './constants/assetCatalog';
import { AssetFilters } from './components/AssetFilters';
import { AssetHeaderBar } from './components/AssetHeaderBar';
import { AssetKpiStrip } from './components/AssetKpiStrip';
import { HrMobileDataCard } from '../shared/HrMobileDataCard';
import { useAssetsTranslations } from './hooks/useAssetsTranslations';
import type { AssetColumnId, AssetRow, AssetType } from './types/assets.types';
import {
  allAssetColumnIds,
  assignableAssetStatuses,
  emptyAssetSummary,
  formatAssetDate,
  formatAssetNativeValue,
  getAssetColumnConfig,
  getAssetStatusClasses,
  getAssetStatusLabel,
  getAssetTypeIcon,
  getAssetTypeLabel,
  lockedAssetColumnIds,
  mapAssetRow,
  normalizeAssetErrorMessage,
  normalizeComparableAssetDate,
} from './utils/assets.utils';

const LazyAddNewAssests = lazy(() =>
  import('./AddNewAssests').then((module) => ({ default: module.AddNewAssests })),
);
const LazyAssetDetailsModal = lazy(() =>
  import('./AssetDetailsModal').then((module) => ({ default: module.AssetDetailsModal })),
);
const LazyAssetColumnsModal = lazy(() =>
  import('./AssetColumnsModal').then((module) => ({ default: module.AssetColumnsModal })),
);
const LazyAssetPhotosModal = lazy(() =>
  import('./AssetPhotosModal').then((module) => ({ default: module.AssetPhotosModal })),
);

type AssetSortField = Exclude<AssetColumnId, 'actions'>;

const defaultAssetsPageSize = 10;

export default function Assets() {
  const t = useAssetsTranslations();
  const { currentLanguage } = useLanguage();
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [summary, setSummary] = useState<HrAssetsSummary>(emptyAssetSummary);
  const [responsibleOptions, setResponsibleOptions] = useState<AddNewAssetOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<AddNewAssetOption[]>([]);
  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorageState<AssetColumnId[]>(
    'indice.hr.assets.visibleColumns.v2',
    allAssetColumnIds,
  );
  const { exchangeRatesPerUsd, preferredCurrency } = usePreferredBusinessCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | AssetType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | HrAssetStatus>('all');
  const [unitFilter, setUnitFilter] = useState<'all' | string>('all');
  const [toastMessage, setToastMessage] = useState('');
  const [errorToastMessage, setErrorToastMessage] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTitle, setLoadingTitle] = useState('');
  const [assetPendingDeactivate, setAssetPendingDeactivate] = useState<AssetRow | null>(null);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<HrAsset | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPhotosAsset, setSelectedPhotosAsset] = useState<AssetRow | null>(null);
  const [selectedAssetPhotos, setSelectedAssetPhotos] = useState<HrAssetPhoto[]>([]);
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [isPhotosLoading, setIsPhotosLoading] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [assetEditing, setAssetEditing] = useState<AssetRow | null>(null);
  const [canManageAssets, setCanManageAssets] = useState(false);
  const [sortField, setSortField] = useState<AssetSortField>('asset');
  const [sortDirection, setSortDirection] = useState<StandardSortDirection>('asc');
  const [pageSize, setPageSize] = useState(defaultAssetsPageSize);
  const [currentPage, setCurrentPage] = useState(1);
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
        const matchesType = typeFilter === 'all' || asset.assetType === typeFilter;
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesUnit = unitFilter === 'all' || String(asset.unitId ?? '') === unitFilter;

        return matchesSearch && matchesType && matchesStatus && matchesUnit;
      }),
    [assetRows, searchQuery, statusFilter, typeFilter, unitFilter],
  );

  const assetValueSummary = useMemo(() => {
    const assetsWithValue = filteredAssets.filter((asset) => asset.valueAmount !== null && asset.valueAmount !== undefined);
    const preferredTotal = assetsWithValue.reduce(
      (total, asset) =>
        total
        + convertBusinessCurrencyAmount(
          asset.valueAmount ?? 0,
          asset.valueCurrency,
          preferredCurrency,
          exchangeRatesPerUsd,
        ),
      0,
    );

    return {
      currencyCount: new Set(assetsWithValue.map((asset) => asset.valueCurrency)).size,
      nativeBreakdownLabel: formatBusinessCurrencyBreakdown(
        assetsWithValue,
        (asset) => asset.valueAmount ?? 0,
        (asset) => asset.valueCurrency,
      ),
      preferredTotalLabel: formatBusinessCurrencyAmount(preferredTotal, preferredCurrency, {
        maximumFractionDigits: 0,
      }),
    };
  }, [exchangeRatesPerUsd, filteredAssets, preferredCurrency]);

  const handleSort = (field: AssetSortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  };

  const sortedAssets = useMemo(() => {
    const getValue = (asset: AssetRow): number | string => {
      switch (sortField) {
        case 'id':
          return asset.assetCode.toLowerCase();
        case 'type':
          return getAssetTypeLabel(asset.assetType, t).toLowerCase();
        case 'asset':
          return asset.name.toLowerCase();
        case 'model':
          return asset.model.toLowerCase();
        case 'serialNumber':
          return asset.serialNumber.toLowerCase();
        case 'responsible':
          return asset.responsibleName.toLowerCase();
        case 'unit':
          return asset.unitName.toLowerCase();
        case 'status':
          return getAssetStatusLabel(asset.status, t).toLowerCase();
        case 'assignedAt':
          return asset.assignedAt ? new Date(asset.assignedAt).getTime() : 0;
        case 'value':
          return asset.valueAmount ?? 0;
        case 'photos':
          return asset.photoCount;
        case 'notes':
          return asset.notes.toLowerCase();
      }
    };

    return [...filteredAssets].sort((left, right) => {
      const leftValue = getValue(left);
      const rightValue = getValue(right);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        const comparison = leftValue - rightValue;
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), currentLanguage.code, {
        numeric: true,
        sensitivity: 'base',
      });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [currentLanguage.code, filteredAssets, sortDirection, sortField, t]);

  const totalPages = Math.max(1, Math.ceil(sortedAssets.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = pageStartIndex + pageSize;
  const paginatedAssets = sortedAssets.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedAssets.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedAssets.length === 0 ? 0 : Math.min(pageEndIndex, sortedAssets.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery, sortDirection, sortField, statusFilter, typeFilter, unitFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
    setSummary(response.summary ?? emptyAssetSummary);
  };

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setIsInitialLoading(true);
      setLoadError(null);

      const session = await authApi.getSessionOrNull();
      const nextCanManageAssets = isHrManagementRole(session?.user.role);
      const [assetsResult, employeesResult, unitsResult] = await Promise.allSettled([
        hrAssetsApi.listAssets({ page: 1, size: 100 }),
        nextCanManageAssets ? humanResourcesApi.listHrUsers() : Promise.resolve(null),
        nextCanManageAssets ? dashboardApi.listUnits() : Promise.resolve(null),
      ] as const);

      if (!isMounted) {
        return;
      }
      setCanManageAssets(nextCanManageAssets);

      if (assetsResult.status === 'fulfilled') {
        setAssetRows(assetsResult.value.items.map(mapAssetRow));
        setSummary(assetsResult.value.summary ?? emptyAssetSummary);
      } else {
        setAssetRows([]);
        setSummary(emptyAssetSummary);
        setLoadError(normalizeAssetErrorMessage(assetsResult.reason, t.errors.load));
      }

      if (nextCanManageAssets && employeesResult.status === 'fulfilled' && employeesResult.value) {
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

      if (nextCanManageAssets && unitsResult.status === 'fulfilled' && unitsResult.value) {
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
    if (!canManageAssets) {
      return;
    }
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
      setErrorToastMessage(normalizeAssetErrorMessage(error, t.errors.details));
    }
  };

  const handleViewPhotos = async (asset: AssetRow) => {
    setSelectedPhotosAsset(asset);
    setSelectedAssetPhotos([]);
    setIsPhotosModalOpen(true);
    setIsPhotosLoading(true);

    try {
      const response = await hrAssetsApi.getAssetPhotos(asset.backendId);
      setSelectedAssetPhotos(response.photos ?? []);
    } catch (error) {
      setErrorToastMessage(normalizeAssetErrorMessage(error, t.errors.photos));
      setIsPhotosModalOpen(false);
      setSelectedPhotosAsset(null);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  const handleEditAsset = (asset: AssetRow) => {
    if (!canManageAssets) {
      return;
    }
    setAssetEditing(asset);
    setIsAddAssetOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!assetPendingDeactivate) {
      return;
    }
    if (!canManageAssets) {
      setAssetPendingDeactivate(null);
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
      setErrorToastMessage(normalizeAssetErrorMessage(error, t.errors.status));
    }
  };

  const handleSaveAsset = async (draft: AddNewAssetDraft) => {
    if (!canManageAssets) {
      return false;
    }
    const trimmedResponsible = draft.responsible.trim();
    const trimmedUnit = draft.unit.trim();
    const trimmedValue = draft.value.trim();
    const trimmedNotes = draft.notes.trim();
    const normalizedValueCurrency = normalizeBusinessCurrencyCode(draft.currency, preferredCurrency);
    const photoPayload = draft.photos.map((photo) => ({
      file_name: photo.fileName,
      mime_type: photo.mimeType,
      size_bytes: photo.sizeBytes,
      data_url: photo.dataUrl,
      caption: photo.caption,
    }));

    try {
      if (assetEditing) {
        const desiredUnitId = trimmedUnit ? Number(trimmedUnit) : null;
        const desiredResponsibleId = trimmedResponsible ? Number(trimmedResponsible) : null;
        const desiredAssignedDate = draft.assignedDate || '';
        const currentAssignedDate = normalizeComparableAssetDate(assetEditing.assignedAt);
        const currentIsAssignmentStatus = assignableAssetStatuses.includes(assetEditing.status);
        const desiredIsAssignmentStatus = assignableAssetStatuses.includes(draft.status);
        const lifecycleStatusChanged = assetEditing.status !== draft.status;
        const unitHandledByUpdate = !currentIsAssignmentStatus && !desiredIsAssignmentStatus && !lifecycleStatusChanged;

        const updatePayload = {
          asset_type: draft.assetType,
          name: draft.name.trim(),
          model: draft.model.trim() || null,
          serial_number: draft.serialNumber.trim() || null,
          unit_id: unitHandledByUpdate ? desiredUnitId : undefined,
          value: trimmedValue || null,
          value_currency: normalizedValueCurrency,
          notes: trimmedNotes || null,
          photos: photoPayload.length ? photoPayload : undefined,
        };

        const needsMetadataUpdate =
          updatePayload.asset_type !== assetEditing.assetType
          || updatePayload.name !== assetEditing.name
          || (updatePayload.model ?? '') !== assetEditing.model
          || (updatePayload.serial_number ?? '') !== assetEditing.serialNumber
          || (trimmedValue ? Number(trimmedValue.replace(/[^0-9.-]/g, '')) : null) !== assetEditing.valueAmount
          || normalizedValueCurrency !== assetEditing.valueCurrency
          || (trimmedNotes || '') !== assetEditing.notes
          || (unitHandledByUpdate && desiredUnitId !== assetEditing.unitId)
          || photoPayload.length > 0;

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
                responsible_user_company_id: Number(desiredResponsibleId),
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
        asset_type: draft.assetType,
        name: draft.name.trim(),
        model: draft.model.trim() || undefined,
        serial_number: draft.serialNumber.trim() || undefined,
        unit_id: trimmedUnit ? Number(trimmedUnit) : undefined,
        status: draft.status,
        assigned_date: assignableAssetStatuses.includes(draft.status) ? draft.assignedDate || undefined : undefined,
        responsible_user_company_id:
          assignableAssetStatuses.includes(draft.status) && trimmedResponsible
            ? Number(trimmedResponsible)
            : undefined,
        value: trimmedValue || undefined,
        value_currency: normalizedValueCurrency,
        photos: photoPayload.length ? photoPayload : undefined,
        notes: trimmedNotes || undefined,
      };

      await runAssetOperation(t.addNewAsset.buttons.save, () => hrAssetsApi.createAsset(payload));
      await loadAssets();
      setIsAddAssetOpen(false);
      setAssetEditing(null);
      setToastMessage(t.addNewAsset.success(draft.name));
      return true;
    } catch (error) {
      setErrorToastMessage(normalizeAssetErrorMessage(error, t.errors.save));
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
          assetType: (
            assetTypeOptionByValue.has(assetEditing.assetType)
              ? assetEditing.assetType
              : 'other'
          ) as AddNewAssetDraft['assetType'],
          name: assetEditing.name,
          model: assetEditing.model,
          serialNumber: assetEditing.serialNumber,
          responsible: assetEditing.responsibleId ? String(assetEditing.responsibleId) : '',
          unit: assetEditing.unitId ? String(assetEditing.unitId) : '',
          status: assetEditing.status,
          assignedDate: assetEditing.assignedAt ? assetEditing.assignedAt.slice(0, 10) : '',
          value: assetEditing.valueAmount === null ? '' : String(assetEditing.valueAmount),
          currency: assetEditing.valueCurrency,
          photos: [],
          notes: assetEditing.notes,
        }
      : null),
    [assetEditing],
  );

  return (
    <>
      <AssetHeaderBar
        canManage={canManageAssets}
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
        assetValueLabel={assetValueSummary.preferredTotalLabel}
        availableCount={summary.available_count}
        currencyCount={assetValueSummary.currencyCount}
        maintenanceCount={summary.maintenance_count}
        nativeBreakdownLabel={assetValueSummary.nativeBreakdownLabel}
        totalCount={summary.total_count}
        visibleCount={filteredAssets.length}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
        <div className="grid grid-cols-1 gap-3 bg-slate-50/60 p-3 lg:grid-cols-2 xl:hidden dark:bg-slate-900/30">
          {isInitialLoading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-[22px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" />)
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{loadError}</div>
          ) : paginatedAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">{t.emptyState}</div>
          ) : paginatedAssets.map((asset) => (
            <HrMobileDataCard
              key={asset.backendId}
              leading={<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EAF8F4] text-2xl dark:bg-[#13362F]">{getAssetTypeIcon(asset.assetType)}</div>}
              title={asset.name}
              subtitle={`${asset.assetCode} · ${getAssetTypeLabel(asset.assetType, t)}`}
              badges={<span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getAssetStatusClasses(asset.status)}`}>{getAssetStatusLabel(asset.status, t)}</span>}
              details={[
                { label: assetColumnConfig.find((column) => column.id === 'responsible')?.label ?? '—', value: asset.responsibleName || t.emptyValue },
                { label: assetColumnConfig.find((column) => column.id === 'unit')?.label ?? '—', value: asset.unitName || t.emptyValue },
                { label: assetColumnConfig.find((column) => column.id === 'model')?.label ?? '—', value: asset.model || t.emptyValue },
                { label: assetColumnConfig.find((column) => column.id === 'value')?.label ?? '—', value: formatAssetNativeValue(asset.valueAmount, asset.valueCurrency) },
                { label: assetColumnConfig.find((column) => column.id === 'assignedAt')?.label ?? '—', value: formatAssetDate(asset.assignedAt, currentLanguage.code) },
                { label: assetColumnConfig.find((column) => column.id === 'photos')?.label ?? '—', value: asset.photoCount },
              ]}
              actions={(
                <>
                  <StandardActionButton onClick={() => void handleViewDetails(asset)} label={t.actionsMenu.viewDetails}><Eye className="h-4 w-4" /></StandardActionButton>
                  <StandardActionButton onClick={() => void handleViewPhotos(asset)} label={t.actionsMenu.viewPhotos}><Images className="h-4 w-4" /></StandardActionButton>
                  {canManageAssets ? <StandardActionButton onClick={() => handleEditAsset(asset)} label={t.actionsMenu.edit}><Pencil className="h-4 w-4" /></StandardActionButton> : null}
                  {canManageAssets ? <StandardActionButton onClick={() => setAssetPendingDeactivate(asset)} label={t.actionsMenu.delete} tone="danger"><Trash2 className="h-4 w-4" /></StandardActionButton> : null}
                </>
              )}
            />
          ))}
        </div>
        <div className="hidden max-w-full overflow-x-auto xl:block">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60">
              <tr>
                {assetColumnConfig
                  .filter((column) => column.visible)
                  .map((column) => (
                    <th
                      key={column.id}
                      className={`px-5 py-4 ${column.id === 'actions' ? 'text-right' : 'text-left'} text-[11px] font-medium text-slate-500 dark:text-slate-400`}
                    >
                      {column.id === 'actions' ? (
                        column.label
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSort(column.id as AssetSortField)}
                          className="inline-flex items-center gap-2 text-left text-[11px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                          <span>{column.label}</span>
                          <StandardSortIcon
                            active={sortField === column.id}
                            direction={sortDirection}
                          />
                        </button>
                      )}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
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
              ) : sortedAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={assetColumnConfig.filter((column) => column.visible).length}
                    className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    {t.emptyState}
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((asset) => (
                  <tr
                    key={asset.backendId}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/35"
                  >
                    {visibleColumnSet.has('id') ? (
                      <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{asset.assetCode}</td>
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
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</p>
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
                      <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatAssetNativeValue(asset.valueAmount, asset.valueCurrency)}
                      </td>
                    ) : null}
                    {visibleColumnSet.has('photos') ? (
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          aria-label={`${t.actionsMenu.viewPhotos}: ${asset.name}`}
                          title={t.actionsMenu.viewPhotos}
                          onClick={() => void handleViewPhotos(asset)}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-[#bfeee3] bg-[#f0fbf8] px-3 text-sm font-medium text-[#137F68] transition hover:border-[#59C3A5] hover:bg-[#e4f8f2] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10 dark:text-[#82e2cb]"
                        >
                          <Images className="h-4 w-4" />
                          {asset.photoCount}
                        </button>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('notes') ? (
                      <td className="max-w-[14rem] px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <p className="line-clamp-2">{asset.notes || t.emptyValue}</p>
                      </td>
                    ) : null}
                    {visibleColumnSet.has('actions') ? (
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                          <StandardActionButton
                            onClick={() => void handleViewDetails(asset)}
                            label={t.actionsMenu.viewDetails}
                          >
                            <Eye className="h-4 w-4" />
                          </StandardActionButton>
                          {canManageAssets ? (
                            <>
                              <StandardActionButton
                                onClick={() => handleEditAsset(asset)}
                                label={t.actionsMenu.edit}
                              >
                                <Pencil className="h-4 w-4" />
                              </StandardActionButton>
                              <StandardActionButton
                                onClick={() => setAssetPendingDeactivate(asset)}
                                label={t.actionsMenu.delete}
                                tone="danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </StandardActionButton>
                            </>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <StandardPaginationFooter
          currentPage={safeCurrentPage}
          labels={t.pagination}
          onPageChange={setCurrentPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setCurrentPage(1);
          }}
          pageEnd={paginationEnd}
          pageSize={pageSize}
          pageStart={paginationStart}
          totalCount={sortedAssets.length}
          totalPages={totalPages}
        />
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
      <FailureToast
        isVisible={Boolean(errorToastMessage)}
        message={errorToastMessage}
        onClose={() => setErrorToastMessage('')}
      />

      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={loadingTitle || t.loading}
      />

      <Suspense fallback={null}>
        {isAddAssetOpen ? (
          <LazyAddNewAssests
            isOpen={isAddAssetOpen}
            onClose={() => {
              setIsAddAssetOpen(false);
              setAssetEditing(null);
            }}
            onSave={handleSaveAsset}
            preferredCurrency={preferredCurrency}
            responsibleOptions={responsibleOptions}
            unitOptions={unitOptions}
            mode={assetEditing ? 'edit' : 'create'}
            initialDraft={assetDraftForModal}
          />
        ) : null}

        {isDetailsModalOpen ? (
          <LazyAssetDetailsModal
            isOpen={isDetailsModalOpen}
            asset={selectedAssetDetails}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedAssetDetails(null);
            }}
          />
        ) : null}

        {isColumnsModalOpen ? (
          <LazyAssetColumnsModal
            copy={t.columnPicker}
            isOpen={isColumnsModalOpen}
            onClose={() => setIsColumnsModalOpen(false)}
            columns={assetColumnConfig}
            onApply={handleApplyColumns}
          />
        ) : null}

        {isPhotosModalOpen ? (
          <LazyAssetPhotosModal
            isOpen={isPhotosModalOpen}
            asset={selectedPhotosAsset}
            photos={selectedAssetPhotos}
            isLoading={isPhotosLoading}
            onClose={() => {
              setIsPhotosModalOpen(false);
              setSelectedPhotosAsset(null);
              setSelectedAssetPhotos([]);
            }}
          />
        ) : null}
      </Suspense>
    </>
  );
}
