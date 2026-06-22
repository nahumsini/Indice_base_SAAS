import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { authApi } from '../../../api/auth';
import {
  permissionsApi,
  type PermissionDetailsResponse,
  type PermissionsListResponse,
} from '../../../api/HumanResources/permissions';
import { setCachedAuthSession } from '../../../api/authSessionStore';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import { ApiClientError } from '../../../lib/apiClient';
import type { PermissionFormData } from './components/CreatePermissionModal';
import type { PermissionColumn } from './components/PermissionColumnsModal';
import { PermissionFilters } from './components/PermissionFilters';
import { PermissionHeaderBar } from './components/PermissionHeaderBar';
import { PermissionKpiStrip } from './components/PermissionKpiStrip';
import { PermissionsTable, type PermissionColumnId } from './components/PermissionsTable';
import { usePermissionsResolvedLocale, usePermissionsTranslations } from './hooks/usePermissionsTranslations';
import { emptyPermissionSummary, formatPermissionError, isPermissionManagementRole, mapBackendPermission } from './support/permissionsSupport';
import type { PermissionItem, PermissionFilterState } from './types/permissions.types';
import { inferAttachmentContentType } from './utils/permissions.attachments';

const LazyCreatePermissionModal = lazy(() =>
  import('./components/CreatePermissionModal').then((module) => ({ default: module.CreatePermissionModal })),
);
const LazyPermissionColumnsModal = lazy(() =>
  import('./components/PermissionColumnsModal').then((module) => ({ default: module.PermissionColumnsModal })),
);
const LazyPermissionDetailModal = lazy(() =>
  import('./components/PermissionDetailModal').then((module) => ({ default: module.PermissionDetailModal })),
);

const defaultFilters: PermissionFilterState = {
  search: '',
  status: 'all',
  type: 'all',
  employee: 'all',
};

const defaultVisiblePermissionColumns: PermissionColumnId[] = [
  'folio',
  'employee',
  'type',
  'startDate',
  'endDate',
  'days',
  'status',
  'actions',
];

type PermissionViewMode = 'management' | 'self';

export default function Permissions() {
  const copy = usePermissionsTranslations();
  const locale = usePermissionsResolvedLocale();
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [summary, setSummary] = useState(emptyPermissionSummary);
  const [viewMode, setViewMode] = useState<PermissionViewMode>('self');
  const [filters, setFilters] = useState<PermissionFilterState>(defaultFilters);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [visiblePermissionColumns, setVisiblePermissionColumns] = useState<PermissionColumnId[]>(
    defaultVisiblePermissionColumns,
  );
  const [selectedPermission, setSelectedPermission] = useState<PermissionItem | null>(null);
  const [busyPermissionId, setBusyPermissionId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState({
    isVisible: false,
    title: copy.loading.title,
    description: copy.loading.description,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const isManager = viewMode === 'management';

  const permissionColumns = useMemo<PermissionColumn[]>(
    () => [
      { id: 'folio', label: copy.columns.folio, locked: true },
      { id: 'employee', label: copy.columns.employee, locked: true },
      { id: 'type', label: copy.columns.type },
      { id: 'startDate', label: copy.columns.startDate },
      { id: 'endDate', label: copy.columns.endDate },
      { id: 'days', label: copy.columns.days },
      { id: 'status', label: copy.columns.status },
      { id: 'actions', label: copy.columns.actions, locked: true },
    ],
    [copy],
  );

  const filteredPermissions = useMemo(() => permissions.filter((permission) => {
    const searchLower = filters.search.toLowerCase().trim();
    if (searchLower) {
      const matchesSearch = permission.employee.name.toLowerCase().includes(searchLower)
        || permission.folio.toLowerCase().includes(searchLower);
      if (!matchesSearch) {
        return false;
      }
    }

    if (filters.status !== 'all' && permission.status !== filters.status) {
      return false;
    }

    if (filters.type !== 'all' && permission.type !== filters.type) {
      return false;
    }

    if (filters.employee !== 'all' && permission.employee.name !== filters.employee) {
      return false;
    }

    return true;
  }), [filters, permissions]);

  const redirectToLogin = () => {
    setCachedAuthSession(null);
    window.location.assign('/login');
  };

  const resolveErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error instanceof ApiClientError && error.status === 401) {
      redirectToLogin();
    }
    return formatPermissionError(error, fallbackMessage);
  };

  const runWithOverlay = async <T,>(
    title: string,
    description: string,
    task: () => Promise<T>,
  ) => {
    setLoadingState({ isVisible: true, title, description });

    try {
      return await runWithMinimumDuration(task());
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const applyPermissionsResponse = (
    response: PermissionsListResponse,
    nextViewMode: PermissionViewMode,
  ) => {
    setPermissions(response.items.map(mapBackendPermission));
    setSummary(response.summary ?? emptyPermissionSummary);
    setViewMode(nextViewMode);
  };

  const fetchPermissions = async () => {
    const session = await authApi.getSessionOrNull();
    if (!session) {
      redirectToLogin();
      throw new Error(copy.errors.load);
    }

    if (isPermissionManagementRole(session.user.role)) {
      try {
        const response = await permissionsApi.listPermissions();
        applyPermissionsResponse(response, 'management');
        return response;
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.status !== 403) {
          throw error;
        }
      }
    }

    const response = await permissionsApi.listMyPermissions();
    applyPermissionsResponse(response, 'self');
    return response;
  };

  const loadPermissions = async () => {
    try {
      await runWithOverlay(copy.loading.title, copy.loading.description, fetchPermissions);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, copy.errors.load));
    }
  };

  useEffect(() => {
    void loadPermissions();
  }, [copy.errors.load, copy.loading.description, copy.loading.title]);

  const refreshPermissions = async () => {
    try {
      await fetchPermissions();
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, copy.errors.load));
    }
  };

  const fetchPermissionDetails = async (permissionId: string) => {
    const response = isManager
      ? await permissionsApi.getPermission(permissionId)
      : await permissionsApi.getMyPermission(permissionId);
    return mapBackendPermission(response.permission);
  };

  const handleViewPermission = async (permission: PermissionItem) => {
    setSelectedPermission(permission);
    setIsDetailModalOpen(true);

    try {
      const detailedPermission = await runWithOverlay(
        copy.loading.detailsTitle,
        copy.loading.detailsDescription,
        () => fetchPermissionDetails(permission.id),
      );
      setSelectedPermission(detailedPermission);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, copy.errors.details));
    }
  };

  const uploadAttachmentIfNeeded = async (
    response: PermissionDetailsResponse,
    attachment?: File,
  ) => {
    if (!attachment) {
      return response;
    }

    try {
      const contentType = inferAttachmentContentType(attachment);
      const presign = await permissionsApi.presignMyPermissionAttachmentUpload(response.permissionId, {
        fileName: attachment.name,
        contentType,
        sizeBytes: attachment.size,
      });
      await permissionsApi.uploadMyPermissionAttachment(
        presign.upload_url,
        attachment,
        contentType,
        presign.upload_headers,
      );
      return await permissionsApi.registerMyPermissionAttachment(response.permissionId, {
        original_filename: attachment.name,
        mime_type: contentType,
        size_bytes: attachment.size,
        object_key: presign.object_key,
      });
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, copy.errors.attachment));
      return response;
    }
  };

  const handleCreatePermission = async (data: PermissionFormData) => {
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await runWithOverlay(
        copy.loading.savingTitle,
        copy.loading.savingDescription,
        async () => {
          const created = await permissionsApi.createMyPermission({
            type: data.type,
            startDate: data.startDate,
            endDate: data.endDate,
            halfDay: data.halfDay,
            reason: data.reason,
          });
          const detailed = await uploadAttachmentIfNeeded(created, data.attachment);
          setSelectedPermission(mapBackendPermission(detailed.permission));
          await refreshPermissions();
          return detailed;
        },
      );

      setSelectedPermission(mapBackendPermission(response.permission));
      setSuccessMessage(copy.success.created);
    } catch (error) {
      const message = resolveErrorMessage(error, copy.errors.create);
      setErrorMessage(message);
      throw new Error(message);
    }
  };

  const handleReviewAction = async (
    permissionId: string,
    action: 'approve' | 'reject',
  ) => {
    setBusyPermissionId(permissionId);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await runWithOverlay(
        copy.loading.reviewingTitle,
        copy.loading.reviewingDescription,
        () => (
          action === 'approve'
            ? permissionsApi.approvePermission(permissionId)
            : permissionsApi.rejectPermission(permissionId)
        ),
      );
      const updatedPermission = mapBackendPermission(response.permission);
      setSelectedPermission((current) => (current?.id === permissionId ? updatedPermission : current));
      await refreshPermissions();
      setSuccessMessage(action === 'approve' ? copy.success.approved : copy.success.rejected);
    } catch (error) {
      const message = resolveErrorMessage(
        error,
        action === 'approve' ? copy.errors.approve : copy.errors.reject,
      );
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setBusyPermissionId(null);
    }
  };

  const handleApprove = (permissionId: string) => handleReviewAction(permissionId, 'approve');
  const handleReject = (permissionId: string) => handleReviewAction(permissionId, 'reject');

  const handleDelete = async (permissionId: string) => {
    setBusyPermissionId(permissionId);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await runWithOverlay(
        copy.loading.deletingTitle,
        copy.loading.deletingDescription,
        () => permissionsApi.deleteMyPermission(permissionId),
      );
      setSelectedPermission((current) => (current?.id === permissionId ? null : current));
      await refreshPermissions();
      setSuccessMessage(copy.success.deleted);
    } catch (error) {
      const message = resolveErrorMessage(error, copy.errors.delete);
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setBusyPermissionId(null);
    }
  };

  const handleToggleColumn = (columnId: string) => {
    const column = permissionColumns.find((item) => item.id === columnId);
    if (column?.locked) {
      return;
    }

    setVisiblePermissionColumns((current) => (
      current.includes(columnId as PermissionColumnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId as PermissionColumnId]
    ));
  };

  return (
    <div className="space-y-6">
      <PermissionHeaderBar
        canCreate
        copy={copy}
        onColumns={() => setIsColumnsModalOpen(true)}
        onCreate={() => setIsCreateModalOpen(true)}
      />

      <PermissionFilters
        copy={copy}
        filters={filters}
        onFiltersChange={setFilters}
        isManager={isManager}
        permissions={permissions}
      />

      <PermissionKpiStrip
        copy={copy}
        approved={summary.approved}
        pending={summary.pending}
        rejected={summary.rejected}
        total={summary.total}
        visible={filteredPermissions.length}
      />

      <PermissionsTable
        copy={copy}
        permissions={filteredPermissions}
        visibleColumns={visiblePermissionColumns}
        onView={(permission) => { void handleViewPermission(permission); }}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
        isManager={isManager}
        busyPermissionId={busyPermissionId}
      />

      <Suspense fallback={null}>
        {isColumnsModalOpen ? (
          <LazyPermissionColumnsModal
            columns={permissionColumns}
            copy={copy.columnsModal}
            isOpen={isColumnsModalOpen}
            visibleColumns={visiblePermissionColumns}
            onClose={() => setIsColumnsModalOpen(false)}
            onToggleColumn={handleToggleColumn}
          />
        ) : null}

        {isCreateModalOpen ? (
          <LazyCreatePermissionModal
            copy={copy}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreatePermission}
          />
        ) : null}

        {isDetailModalOpen ? (
          <LazyPermissionDetailModal
            copy={copy}
            locale={locale}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            permission={selectedPermission}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
            isManager={isManager}
            isReviewing={busyPermissionId === selectedPermission?.id}
          />
        ) : null}
      </Suspense>

      <LoadingBarOverlay
        isVisible={loadingState.isVisible}
        title={loadingState.title}
        description={loadingState.description}
      />
      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
      <FailureToast
        isVisible={Boolean(errorMessage)}
        message={errorMessage}
        onClose={() => setErrorMessage('')}
      />
    </div>
  );
}
