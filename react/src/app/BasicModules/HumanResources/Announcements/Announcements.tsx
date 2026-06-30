import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { ConfirmDeleteDialog } from '../../../components/ConfirmDeleteDialog';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { humanResourcesApi } from '../../../api/humanResources';
import {
  buildCreateAnnouncementPayload,
  toAnnouncementAudienceEmployeeOption,
  toAnnouncementDepartmentOption,
  toAnnouncementUnitOption,
  toAnnouncementView,
} from './announcementMapping';
import type {
  AnnouncementDepartmentOption,
  AnnouncementEmployeeOption,
  AnnouncementUnitOption,
  AnnouncementView,
  CreateAnnouncementFormData,
} from './announcementTypes';
import {
  type AnnouncementAudienceFilter,
  type AnnouncementStatusFilter,
  type AnnouncementTypeFilter,
  audienceFilterValues,
  defaultVisibleColumnIds,
  emptyAnnouncementSummary,
  statusFilterValues,
  typeFilterValues,
} from './constants/announcements.constants';
import type { ColumnConfig } from '../../../components/rh/ColumnasConfigModal';
import { AnnouncementFilters } from './components/AnnouncementFilters';
import { AnnouncementHeaderBar } from './components/AnnouncementHeaderBar';
import { AnnouncementKpiStrip } from './components/AnnouncementKpiStrip';
import { AnnouncementTable } from './components/AnnouncementTable';
import { AnnouncementDetailPanel } from './components/AnnouncementDetailPanel';
import { AnnouncementBulkActionsBar } from './components/AnnouncementBulkActionsBar';
import { useAnnouncementsResolvedLocale, useAnnouncementsTranslations } from './hooks/useAnnouncementsTranslations';
import type { AnnouncementsTranslations } from './translations';
import {
  filterAnnouncements,
  getAnnouncementStatusClasses,
  getAnnouncementTypeClasses,
} from './utils/announcements.filters';

const LazyColumnasConfigModal = lazy(() =>
  import('../../../components/rh/ColumnasConfigModal').then((module) => ({ default: module.ColumnasConfigModal })),
);
const LazyCreateAnnouncementModal = lazy(() =>
  import('./components/CreateAnnouncementModal').then((module) => ({ default: module.CreateAnnouncementModal })),
);

export default function Announcements() {
  const copy = useAnnouncementsTranslations();
  const locale = useAnnouncementsResolvedLocale();
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
  const [summary, setSummary] = useState(emptyAnnouncementSummary);
  const [employees, setEmployees] = useState<AnnouncementEmployeeOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<AnnouncementDepartmentOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<AnnouncementUnitOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AnnouncementTypeFilter>('all');
  const [selectedStatus, setSelectedStatus] = useState<AnnouncementStatusFilter>('all');
  const [selectedAudience, setSelectedAudience] = useState<AnnouncementAudienceFilter>('all');
  const [selectedAnnouncementIds, setSelectedAnnouncementIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...defaultVisibleColumnIds]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementView | null>(null);
  const [pendingDeleteAnnouncement, setPendingDeleteAnnouncement] = useState<AnnouncementView | null>(null);
  const [isBulkDeletePending, setIsBulkDeletePending] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementView | null>(null);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canManage = Boolean(summary.can_manage);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const announcementsResponse = await humanResourcesApi.listAnnouncements();
      const nextCanManage = Boolean(announcementsResponse.summary.can_manage);
      setAnnouncements(announcementsResponse.items.map((item) => toAnnouncementView(item, locale, copy.view)));
      setSummary({
        can_manage: nextCanManage,
        draft_count: announcementsResponse.summary.draft_count,
        published_count: announcementsResponse.summary.published_count,
        scheduled_count: announcementsResponse.summary.scheduled_count,
        total_count: announcementsResponse.summary.total_count,
      });

      if (!nextCanManage) {
        setEmployees([]);
        setDepartmentOptions([]);
        setUnitOptions([]);
        return;
      }

      const audienceResponse = await humanResourcesApi.getAnnouncementAudienceOptions();
      setDepartmentOptions(audienceResponse.departments.map(toAnnouncementDepartmentOption));
      setUnitOptions(audienceResponse.units.map((option) => toAnnouncementUnitOption(option, copy.view)));
      setEmployees(
        audienceResponse.employees
          .map((employee) => toAnnouncementAudienceEmployeeOption(employee, copy.view))
          .filter((item): item is AnnouncementEmployeeOption => item !== null),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.feedback.loadAnnouncementsFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, [locale]);

  const announcementColumns = useMemo<ColumnConfig[]>(
    () => [
      { id: 'type', label: copy.table.columns.type, visible: visibleColumns.includes('type') },
      { id: 'audience', label: copy.table.columns.audience, visible: visibleColumns.includes('audience') },
      { id: 'publication', label: copy.table.columns.publication, visible: visibleColumns.includes('publication') },
      { id: 'reads', label: copy.table.columns.reads, visible: visibleColumns.includes('reads') },
      { id: 'status', label: copy.table.columns.status, visible: visibleColumns.includes('status') },
      { id: 'author', label: copy.table.columns.author, visible: visibleColumns.includes('author') },
    ],
    [copy, visibleColumns],
  );

  const fixedAnnouncementColumns = useMemo<ColumnConfig[]>(
    () => [
      { id: 'announcement', label: copy.table.columns.announcement, visible: true, locked: true },
      { id: 'actions', label: copy.table.columns.actions, visible: true, locked: true },
    ],
    [copy],
  );

  const audienceFilterOptions = useMemo(
    () => audienceFilterValues.map((value) => ({ value, label: copy.filters.audienceOptions[value] })),
    [copy],
  );

  const typeFilterOptions = useMemo(
    () => typeFilterValues.map((value) => ({ value, label: copy.filters.typeOptions[value] })),
    [copy],
  );

  const statusFilterOptions = useMemo(
    () => statusFilterValues.map((value) => ({ value, label: copy.filters.statusOptions[value] })),
    [copy],
  );

  const filteredAnnouncements = useMemo(
    () =>
      filterAnnouncements({
        announcements,
        searchQuery,
        selectedAudience,
        selectedStatus,
        selectedType,
      }),
    [announcements, searchQuery, selectedAudience, selectedStatus, selectedType],
  );

  const selectedAnnouncements = useMemo(
    () => filteredAnnouncements.filter((announcement) => selectedAnnouncementIds.includes(announcement.id)),
    [filteredAnnouncements, selectedAnnouncementIds],
  );

  const readSelectedCount = useMemo(
    () => selectedAnnouncements.filter((announcement) => announcement.isRead).length,
    [selectedAnnouncements],
  );

  const readRate = useMemo(() => {
    const deliveryCount = filteredAnnouncements.reduce((total, announcement) => total + announcement.deliveryCount, 0);
    const readCount = filteredAnnouncements.reduce((total, announcement) => total + announcement.readCount, 0);
    if (deliveryCount === 0) {
      return copy.kpis.notTracked;
    }
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      style: 'percent',
    }).format(readCount / deliveryCount);
  }, [copy.kpis.notTracked, filteredAnnouncements, locale]);

  useEffect(() => {
    setSelectedAnnouncementIds((current) => current.filter((id) => announcements.some((announcement) => announcement.id === id)));
  }, [announcements]);

  const handleSaveColumns = (nextColumns: ColumnConfig[]) => {
    setVisibleColumns(nextColumns.filter((column) => column.visible).map((column) => column.id));
  };

  const handleToggleAnnouncementSelection = (announcementId: string) => {
    setSelectedAnnouncementIds((current) =>
      current.includes(announcementId)
        ? current.filter((id) => id !== announcementId)
        : [...current, announcementId],
    );
  };

  const handleTogglePageAnnouncementSelection = (pageAnnouncements: AnnouncementView[], isSelected: boolean) => {
    const pageIds = pageAnnouncements.map((announcement) => announcement.id);
    setSelectedAnnouncementIds((current) => {
      if (!isSelected) {
        return current.filter((id) => !pageIds.includes(id));
      }
      return [...new Set([...current, ...pageIds])];
    });
  };

  const handleMarkSelectedUnread = async () => {
    const readAnnouncements = selectedAnnouncements.filter((announcement) => announcement.isRead);
    if (readAnnouncements.length === 0) {
      return;
    }
    const success = await guardedMutation(
      () => Promise.all(readAnnouncements.map((announcement) => humanResourcesApi.markAnnouncementUnread(announcement.backendId))),
      copy.feedback.markUnreadFailed,
    );
    if (success) {
      setSelectedAnnouncementIds([]);
    }
  };

  const handleConfirmBulkDeleteAnnouncements = async () => {
    if (selectedAnnouncements.length === 0) {
      setIsBulkDeletePending(false);
      return;
    }
    const announcementsToDelete = selectedAnnouncements;
    const success = await guardedMutation(
      () => Promise.all(announcementsToDelete.map((announcement) => humanResourcesApi.deleteAnnouncement(announcement.backendId))),
      copy.feedback.deleteAnnouncementFailed,
    );
    if (success) {
      setSelectedAnnouncementIds([]);
      setIsBulkDeletePending(false);
      if (selectedAnnouncement && announcementsToDelete.some((announcement) => announcement.id === selectedAnnouncement.id)) {
        setSelectedAnnouncement(null);
      }
    }
  };

  const handleSaveAnnouncement = async (data: CreateAnnouncementFormData) => {
    if (!canManage) {
      const message = copy.feedback.manageNotAllowed;
      setErrorMessage(message);
      throw new Error(message);
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const payload = buildCreateAnnouncementPayload(data);
      const task = editingAnnouncement
        ? humanResourcesApi.updateAnnouncement(editingAnnouncement.backendId, payload)
        : humanResourcesApi.createAnnouncement(payload);
      await runWithMinimumDuration(task, 850);
      await loadAnnouncements();
      setIsModalOpen(false);
      setEditingAnnouncement(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.feedback.saveAnnouncementFailed);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAnnouncement = (announcement: AnnouncementView) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.isRead) {
      void handleMarkRead(announcement);
    }
  };

  const handleEditAnnouncement = (announcement: AnnouncementView) => {
    setEditingAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleDeleteAnnouncement = (announcement: AnnouncementView) => {
    setPendingDeleteAnnouncement(announcement);
  };

  const handleConfirmDeleteAnnouncement = async () => {
    if (!pendingDeleteAnnouncement) {
      return;
    }
    const announcement = pendingDeleteAnnouncement;
    const success = await guardedMutation(
      () => humanResourcesApi.deleteAnnouncement(announcement.backendId),
      copy.feedback.deleteAnnouncementFailed,
    );
    if (!success) {
      return;
    }
    setPendingDeleteAnnouncement(null);
    setSelectedAnnouncementIds((current) => current.filter((id) => id !== announcement.id));
    if (selectedAnnouncement?.id === announcement.id) {
      setSelectedAnnouncement(null);
    }
  };

  const handleMarkRead = async (announcement: AnnouncementView) => {
    const success = await guardedMutation(
      () => humanResourcesApi.markAnnouncementRead(announcement.backendId),
      copy.feedback.markReadFailed,
    );
    if (success) {
      setSelectedAnnouncement((current) => {
        if (!current || current.id !== announcement.id) {
          return current;
        }
        const readCount = current.isRead ? current.readCount : current.readCount + 1;
        return {
          ...current,
          isRead: true,
          readAt: new Date().toISOString(),
          readCount,
          readSummary: current.deliveryCount > 0 ? copy.view.readRatio(readCount, current.deliveryCount) : copy.view.read,
        };
      });
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!selectedAnnouncement) {
      return;
    }
    await guardedMutation(async () => {
      const upload = await humanResourcesApi.presignAnnouncementAttachmentUpload(selectedAnnouncement.backendId, {
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });
      await humanResourcesApi.uploadAnnouncementAttachment(upload.upload_url, file, file.type, upload.upload_headers);
      return humanResourcesApi.registerAnnouncementAttachment(selectedAnnouncement.backendId, {
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        object_key: upload.object_key,
      });
    }, copy.feedback.uploadAttachmentFailed);
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!selectedAnnouncement) {
      return;
    }
    await guardedMutation(
      () => humanResourcesApi.deleteAnnouncementAttachment(selectedAnnouncement.backendId, attachmentId),
      copy.feedback.removeAttachmentFailed,
    );
  };

  const guardedMutation = async (task: () => Promise<unknown>, failureMessage: string) => {
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const result = await runWithMinimumDuration(task(), 650);
      if (result && typeof result === 'object' && 'id' in result) {
        setSelectedAnnouncement(toAnnouncementView(result as Parameters<typeof toAnnouncementView>[0], locale, copy.view));
      }
      await loadAnnouncements();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : failureMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isSubmitting}
        title={copy.feedback.processingTitle}
        description={copy.feedback.processingDescription}
      />

      <AnnouncementHeaderBar
        canManage={canManage}
        copy={{
          pageTitle: copy.pageTitle,
          pageSubtitle: copy.pageSubtitle,
          ...copy.actions,
        }}
        onAdd={() => {
          setEditingAnnouncement(null);
          setIsModalOpen(true);
        }}
        onColumns={() => setIsColumnsModalOpen(true)}
      />

      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={() => void loadAnnouncements()}>
              {copy.feedback.retry}
            </Button>
          </div>
        </div>
      ) : null}

      <AnnouncementFilters
        copy={copy.filters}
        audienceOptions={audienceFilterOptions}
        searchQuery={searchQuery}
        selectedAudience={selectedAudience}
        selectedStatus={selectedStatus}
        selectedType={selectedType}
        statusOptions={statusFilterOptions}
        typeOptions={typeFilterOptions}
        onAudienceChange={(value) => setSelectedAudience(value as AnnouncementAudienceFilter)}
        onSearchChange={setSearchQuery}
        onStatusChange={(value) => setSelectedStatus(value as AnnouncementStatusFilter)}
        onTypeChange={(value) => setSelectedType(value as AnnouncementTypeFilter)}
      />

      <AnnouncementKpiStrip
        copy={copy.kpis}
        draftCount={summary.draft_count}
        progressCopy={copy.progress}
        publishedCount={summary.published_count}
        readRate={readRate}
        scheduledCount={summary.scheduled_count}
        totalCount={summary.total_count}
        visibleCount={filteredAnnouncements.length}
      />

      <AnnouncementBulkActionsBar
        copy={copy.bulk}
        canDelete={canManage}
        readCount={readSelectedCount}
        selectedCount={selectedAnnouncements.length}
        onClearSelection={() => setSelectedAnnouncementIds([])}
        onDeleteSelected={() => setIsBulkDeletePending(true)}
        onMarkUnread={() => void handleMarkSelectedUnread()}
      />

      <AnnouncementTable
        announcements={isLoading ? [] : filteredAnnouncements}
        copy={copy}
        getAudienceLabel={(announcement) => announcement.audienceSummary}
        getStatusClasses={getAnnouncementStatusClasses}
        getTypeClasses={getAnnouncementTypeClasses}
        visibleColumns={visibleColumns}
        canManage={canManage}
        selectedIds={selectedAnnouncementIds}
        onDelete={handleDeleteAnnouncement}
        onEdit={handleEditAnnouncement}
        onOpen={handleOpenAnnouncement}
        onTogglePageSelection={handleTogglePageAnnouncementSelection}
        onToggleSelection={handleToggleAnnouncementSelection}
      />

      <AnnouncementDetailPanel
        announcement={selectedAnnouncement}
        canManage={canManage}
        copy={copy.detail}
        isBusy={isSubmitting}
        onClose={() => setSelectedAnnouncement(null)}
        onDeleteAttachment={handleDeleteAttachment}
        onMarkRead={handleMarkRead}
        onUploadAttachment={handleUploadAttachment}
      />

      <Suspense fallback={null}>
        {isColumnsModalOpen ? (
          <LazyColumnasConfigModal
            columns={announcementColumns}
            isOpen={isColumnsModalOpen}
            fixedColumns={fixedAnnouncementColumns}
            theme="humanResources"
            onClose={() => setIsColumnsModalOpen(false)}
            onSave={handleSaveColumns}
          />
        ) : null}

        {canManage && isModalOpen ? (
          <LazyCreateAnnouncementModal
            copy={copy.modal}
            departments={departmentOptions}
            employees={employees}
            initialData={editingAnnouncement?.editData}
            isEdit={Boolean(editingAnnouncement)}
            isOpen={isModalOpen}
            isSubmitting={isSubmitting}
            units={unitOptions}
            onClose={() => {
              setIsModalOpen(false);
              setEditingAnnouncement(null);
            }}
            onSave={handleSaveAnnouncement}
          />
        ) : null}
      </Suspense>

      <ConfirmDeleteDialog
        isVisible={pendingDeleteAnnouncement !== null}
        title={copy.deleteDialog.title}
        itemName={pendingDeleteAnnouncement?.title}
        description={copy.deleteDialog.description}
        confirmLabel={copy.deleteDialog.confirm}
        cancelLabel={copy.deleteDialog.cancel}
        confirmDisabled={isSubmitting}
        onConfirm={() => void handleConfirmDeleteAnnouncement()}
        onCancel={() => setPendingDeleteAnnouncement(null)}
      />

      <ConfirmDeleteDialog
        isVisible={isBulkDeletePending}
        title={copy.bulk.deleteSelected}
        itemName={copy.bulk.selectedBadge(selectedAnnouncements.length)}
        description={copy.bulk.deleteDescription}
        confirmLabel={copy.deleteDialog.confirm}
        cancelLabel={copy.deleteDialog.cancel}
        confirmDisabled={isSubmitting}
        onConfirm={() => void handleConfirmBulkDeleteAnnouncements()}
        onCancel={() => setIsBulkDeletePending(false)}
      />
    </>
  );
}
