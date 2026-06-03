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
import type { AnnouncementColumn } from './components/AnnouncementColumnsModal';
import { AnnouncementFilters } from './components/AnnouncementFilters';
import { AnnouncementHeaderBar } from './components/AnnouncementHeaderBar';
import { AnnouncementKpiStrip } from './components/AnnouncementKpiStrip';
import { AnnouncementTable } from './components/AnnouncementTable';
import { AnnouncementDetailPanel } from './components/AnnouncementDetailPanel';
import { useAnnouncementsResolvedLocale, useAnnouncementsTranslations } from './hooks/useAnnouncementsTranslations';
import type { AnnouncementsTranslations } from './translations';
import {
  filterAnnouncements,
  getAnnouncementStatusClasses,
  getAnnouncementTypeClasses,
} from './utils/announcements.filters';

const LazyAnnouncementColumnsModal = lazy(() =>
  import('./components/AnnouncementColumnsModal').then((module) => ({ default: module.AnnouncementColumnsModal })),
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
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...defaultVisibleColumnIds]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementView | null>(null);
  const [pendingDeleteAnnouncement, setPendingDeleteAnnouncement] = useState<AnnouncementView | null>(null);
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
      setAnnouncements(announcementsResponse.items.map((item) => toAnnouncementView(item, locale)));
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
      setUnitOptions(audienceResponse.units.map(toAnnouncementUnitOption));
      setEmployees(
        audienceResponse.employees
          .map(toAnnouncementAudienceEmployeeOption)
          .filter((item): item is AnnouncementEmployeeOption => item !== null),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load announcements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, [locale]);

  const announcementColumns = useMemo<AnnouncementColumn[]>(
    () => [
      { id: 'type', label: copy.table.columns.type },
      { id: 'audience', label: copy.table.columns.audience },
      { id: 'publication', label: copy.table.columns.publication },
      { id: 'status', label: copy.table.columns.status },
      { id: 'author', label: copy.table.columns.author },
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

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId],
    );
  };

  const handleSaveAnnouncement = async (data: CreateAnnouncementFormData) => {
    if (!canManage) {
      const message = 'You are not allowed to manage announcements.';
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
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save announcement.');
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
      'Unable to delete announcement.',
    );
    if (!success) {
      return;
    }
    setPendingDeleteAnnouncement(null);
    if (selectedAnnouncement?.id === announcement.id) {
      setSelectedAnnouncement(null);
    }
  };

  const handleMarkRead = async (announcement: AnnouncementView) => {
    const success = await guardedMutation(
      () => humanResourcesApi.markAnnouncementRead(announcement.backendId),
      'Unable to mark announcement as read.',
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
          readSummary: current.deliveryCount > 0 ? `${readCount}/${current.deliveryCount} read` : 'Read',
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
        setSelectedAnnouncement(toAnnouncementView(result as Parameters<typeof toAnnouncementView>[0], locale));
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
        readRate={copy.kpis.notTracked}
        scheduledCount={summary.scheduled_count}
        totalCount={summary.total_count}
        visibleCount={filteredAnnouncements.length}
      />

      <AnnouncementTable
        announcements={isLoading ? [] : filteredAnnouncements}
        copy={copy}
        getAudienceLabel={(announcement) => announcement.audienceSummary}
        getStatusClasses={getAnnouncementStatusClasses}
        getTypeClasses={getAnnouncementTypeClasses}
        visibleColumns={visibleColumns}
        canManage={canManage}
        onDelete={handleDeleteAnnouncement}
        onEdit={handleEditAnnouncement}
        onOpen={handleOpenAnnouncement}
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
          <LazyAnnouncementColumnsModal
            columns={announcementColumns}
            copy={copy.columnsModal}
            isOpen={isColumnsModalOpen}
            visibleColumns={visibleColumns}
            onClose={() => setIsColumnsModalOpen(false)}
            onToggleColumn={handleToggleColumn}
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
    </>
  );
}
