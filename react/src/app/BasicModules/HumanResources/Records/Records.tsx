import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import {
  type ApiClientError,
} from '../../../lib/apiClient';
import {
  humanResourcesApi,
  type BackendRecordItem,
  type BackendRecordWitness,
} from '../../../api/humanResources';
import { FailureToast } from '../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../components/SuccessToast';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../components/ui/pagination';
import { CreateRecordModal } from './components/CreateRecordModal';
import { RecordColumnsModal, type RecordColumn } from './components/RecordColumnsModal';
import { RecordDetailModal } from './components/RecordDetailModal';
import { RecordFilters } from './components/RecordFilters';
import { RecordHeaderBar } from './components/RecordHeaderBar';
import { RecordKpiStrip } from './components/RecordKpiStrip';
import { RecordsList, type RecordColumnId } from './components/RecordsList';
import { useRecordsResolvedLocale, useRecordsTranslations } from './hooks/useRecordsTranslations';
import type {
  CreateRecordData,
  EmployeeRecord,
  RecordEmployeeOption,
  RecordFiltersState,
} from './types/records.types';

const defaultFilters: RecordFiltersState = {
  search: '',
  unit: 'all',
  business: 'all',
  status: 'all',
  type: 'all',
  severity: 'all',
  dateFrom: '',
  dateTo: '',
};

const formatErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as ApiClientError).message === 'string') {
    return (error as ApiClientError).message;
  }
  return fallbackMessage;
};

const toIsoEventDate = (value: string) => (
  value.includes('T') ? value : `${value}T00:00:00`
);

const normalizeWitnesses = (witnesses: BackendRecordWitness[] | undefined) => (
  witnesses?.map((witness) => witness.name).filter(Boolean) ?? []
);

const sanitizeFileName = (value: string) => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'record'
);

const recordsPerPage = 10;

const defaultVisibleRecordColumns: RecordColumnId[] = [
  'id',
  'employee',
  'reportedBy',
  'unit',
  'business',
  'type',
  'severity',
  'date',
  'actions',
];

const mapBackendRecord = (record: BackendRecordItem): EmployeeRecord => ({
  id: String(record.id),
  recordNumber: record.record_number,
  user: {
    id: String(record.user.id),
    name: record.user.name,
    position: record.user.position ?? '',
    department: record.user.department ?? '',
  },
  unit: record.unit?.name ?? '',
  business: record.business?.name ?? '',
  type: record.type,
  severity: record.severity ?? undefined,
  status: record.status,
  title: record.title,
  description: record.description,
  actionsTaken: record.actions_taken || undefined,
  witnesses: normalizeWitnesses(record.witnesses),
  reportedBy: {
    id: String(record.reported_by.user_id ?? record.reported_by.user_company_id ?? ''),
    name: record.reported_by.name,
  },
  eventDate: record.event_date,
  createdAt: record.created_at ?? record.event_date,
  updatedAt: record.updated_at ?? record.created_at ?? record.event_date,
  attachments: record.attachments?.map((attachment) => ({
    id: String(attachment.id),
    name: attachment.original_filename,
    size: attachment.size_bytes,
    type: attachment.mime_type,
    url: attachment.download_url ?? '',
  })),
});

const buildRecordPayload = (
  data: CreateRecordData,
  employees: RecordEmployeeOption[],
  currentStatus?: EmployeeRecord['status'],
) => {
  const employee = employees.find((item) => item.id === data.employeeId);
  const witnesses = (data.witnesses ?? []).map((witnessName) => {
    const witnessEmployee = employees.find((item) => item.name === witnessName);
    return witnessEmployee
      ? { user_company_id: Number(witnessEmployee.id), name: witnessEmployee.name }
      : witnessName;
  });

  return {
    user_company_id: Number(data.employeeId),
    record_type: data.type,
    severity: data.severity,
    title: data.title.trim(),
    description: data.description.trim(),
    actions_taken: data.actionsTaken?.trim() || undefined,
    event_date: toIsoEventDate(data.eventDate),
    witnesses,
    status: data.status ?? currentStatus,
    employee_snapshot_hint: employee?.name,
  };
};

export default function Records() {
  const copy = useRecordsTranslations();
  const locale = useRecordsResolvedLocale();
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [employees, setEmployees] = useState<RecordEmployeeOption[]>([]);
  const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [filters, setFilters] = useState<RecordFiltersState>(defaultFilters);
  const [summary, setSummary] = useState({
    total_count: 0,
    pending_count: 0,
    reviewed_count: 0,
    resolved_count: 0,
    high_severity_count: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [visibleRecordColumns, setVisibleRecordColumns] = useState<RecordColumnId[]>(defaultVisibleRecordColumns);
  const [selectedRecord, setSelectedRecord] = useState<EmployeeRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<EmployeeRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingState, setLoadingState] = useState({
    isVisible: false,
    title: copy.loading.recordsTitle,
    description: copy.loading.recordsDescription,
  });

  const recordColumns = useMemo<RecordColumn[]>(
    () => [
      { id: 'id', label: copy.columns.id, locked: true },
      { id: 'employee', label: copy.columns.employee, locked: true },
      { id: 'reportedBy', label: copy.columns.reportedBy },
      { id: 'unit', label: copy.columns.unit },
      { id: 'business', label: copy.columns.business },
      { id: 'type', label: copy.columns.type },
      { id: 'severity', label: copy.columns.severity },
      { id: 'date', label: copy.columns.date },
      { id: 'actions', label: copy.columns.actions, locked: true },
    ],
    [copy],
  );

  const unitOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.unit).filter(Boolean))).sort(),
    [records],
  );
  const businessOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.business).filter(Boolean))).sort(),
    [records],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchLower = filters.search.toLowerCase().trim();
      if (searchLower) {
        const matchesSearch = [
          record.user.name,
          record.user.position,
          record.title,
          record.description,
          record.type,
          record.reportedBy.name,
        ].some((value) => value.toLowerCase().includes(searchLower));
        if (!matchesSearch) {
          return false;
        }
      }

      if (filters.unit !== 'all' && record.unit !== filters.unit) {
        return false;
      }

      if (filters.business !== 'all' && record.business !== filters.business) {
        return false;
      }

      if (filters.status !== 'all' && record.status !== filters.status) {
        return false;
      }

      if (filters.type !== 'all' && record.type !== filters.type) {
        return false;
      }

      if (filters.severity !== 'all' && record.severity !== filters.severity) {
        return false;
      }

      const recordDate = new Date(record.eventDate);
      if (filters.dateFrom && recordDate < new Date(filters.dateFrom)) {
        return false;
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        if (recordDate > dateTo) {
          return false;
        }
      }

      return true;
    });
  }, [filters, records]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    });
  }, [filteredRecords]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * recordsPerPage;
  const pageEndIndex = pageStartIndex + recordsPerPage;
  const paginatedRecords = sortedRecords.slice(pageStartIndex, pageEndIndex);
  const paginationStart = sortedRecords.length === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = sortedRecords.length === 0 ? 0 : Math.min(pageEndIndex, sortedRecords.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) {
      return;
    }

    setCurrentPage(page);
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, safeCurrentPage]);

    if (safeCurrentPage - 1 > 1) {
      pages.add(safeCurrentPage - 1);
    }
    if (safeCurrentPage + 1 < totalPages) {
      pages.add(safeCurrentPage + 1);
    }

    const orderedPages = Array.from(pages).sort((a, b) => a - b);
    const items: Array<number | 'ellipsis'> = [];

    orderedPages.forEach((page, index) => {
      if (index > 0 && page - orderedPages[index - 1] > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  }, [safeCurrentPage, totalPages]);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const loadEmployees = async () => {
    setIsEmployeesLoading(true);
    setEmployeeLoadError('');

    try {
      const employeesResponse = await humanResourcesApi.listHrUsers();
      setEmployees(
        employeesResponse.items.map((employee) => ({
          id: String(employee.id),
          name: employee.full_name,
          position: employee.position_title || employee.position || '',
          department: employee.department || '',
        })),
      );
    } catch (error) {
      setEmployeeLoadError(formatErrorMessage(error, copy.errors.loadEmployees));
    } finally {
      setIsEmployeesLoading(false);
    }
  };

  const loadRecords = async () => {
    const recordsResponse = await humanResourcesApi.listRecords();
    setRecords(recordsResponse.items.map(mapBackendRecord));
    setSummary(recordsResponse.summary);
  };

  const loadInitialData = async () => {
    setLoadingState({
      isVisible: true,
      title: copy.loading.recordsTitle,
      description: copy.loading.recordsDescription,
    });

    try {
      const [recordsResult, employeesResult] = await runWithMinimumDuration(Promise.allSettled([
        loadRecords(),
        loadEmployees(),
      ]));

      if (recordsResult.status === 'rejected') {
        setErrorMessage(formatErrorMessage(recordsResult.reason, copy.errors.loadRecords));
      }
      if (employeesResult.status === 'rejected') {
        setEmployeeLoadError(formatErrorMessage(employeesResult.reason, copy.errors.loadEmployees));
      }
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, copy.errors.loadRecords));
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const refreshRecords = async () => {
    await loadRecords();
  };

  const uploadAttachments = async (recordId: string, attachments: File[]) => {
    for (const file of attachments) {
      const presign = await humanResourcesApi.presignRecordAttachmentUpload(recordId, {
        file_name: file.name,
        content_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
      });

      await humanResourcesApi.uploadRecordAttachment(
        presign.upload_url,
        file,
        file.type || 'application/octet-stream',
        presign.upload_headers,
      );

      await humanResourcesApi.registerRecordAttachment(recordId, {
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        object_key: presign.object_key,
      });
    }
  };

  const handleSaveRecord = async (data: CreateRecordData) => {
    const fallbackMessage = editingRecord ? copy.errors.updateRecord : copy.errors.createRecord;

    setLoadingState({
      isVisible: true,
      title: editingRecord ? copy.loading.savingTitle : copy.loading.creatingTitle,
      description: editingRecord ? copy.loading.updatingDescription : copy.loading.creatingDescription,
    });

    try {
      await runWithMinimumDuration((async () => {
        const payload = buildRecordPayload(data, employees, editingRecord?.status);
        const savedRecord = editingRecord
          ? await humanResourcesApi.updateRecord(editingRecord.id, payload)
          : await humanResourcesApi.createRecord(payload);

        if (data.attachments?.length) {
          await uploadAttachments(String(savedRecord.id), data.attachments);
        }

        await refreshRecords();
      })());

      setIsCreateModalOpen(false);
      setEditingRecord(null);
      setSuccessMessage(editingRecord ? copy.success.updated : copy.success.created);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, fallbackMessage));
      throw error;
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleRecordClick = async (record: EmployeeRecord) => {
    setLoadingState({
      isVisible: true,
      title: copy.loading.recordTitle,
      description: copy.loading.recordDescription,
    });

    try {
      const detailResponse = await runWithMinimumDuration(humanResourcesApi.getRecordDetails(record.id));
      setSelectedRecord(mapBackendRecord(detailResponse.record));
      setIsDetailModalOpen(true);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, copy.errors.loadDetails));
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleEditRecord = async (record: EmployeeRecord) => {
    setLoadingState({
      isVisible: true,
      title: copy.loading.recordTitle,
      description: copy.loading.editingDescription,
    });

    try {
      const detailResponse = await runWithMinimumDuration(humanResourcesApi.getRecordDetails(record.id));
      setEditingRecord(mapBackendRecord(detailResponse.record));
      setIsDetailModalOpen(false);
      setIsCreateModalOpen(true);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, copy.errors.loadSelected));
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    setLoadingState({
      isVisible: true,
      title: copy.loading.deletingTitle,
      description: copy.loading.deletingDescription,
    });

    try {
      await runWithMinimumDuration(humanResourcesApi.deleteRecord(recordId));
      await refreshRecords();
      setSelectedRecord(null);
      setSuccessMessage(copy.success.deleted);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, copy.errors.deleteRecord));
      throw error;
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleDownloadRecord = (record: EmployeeRecord) => {
    try {
      const doc = new jsPDF();
      const left = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - left * 2;
      let cursorY = 20;

      const addSection = (label: string, value: string) => {
        if (!value.trim()) {
          return;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(label, left, cursorY);
        cursorY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(value, maxWidth);
        doc.text(lines, left, cursorY);
        cursorY += lines.length * 5 + 5;
      };

      const ensurePage = () => {
        if (cursorY <= 270) {
          return;
        }
        doc.addPage();
        cursorY = 20;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(record.title, left, cursorY);
      cursorY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(record.recordNumber || copy.pdf.recordNumber(record.id), left, cursorY);
      cursorY += 8;

      addSection(copy.pdf.employee, `${record.user.name}${record.user.position ? ` · ${record.user.position}` : ''}`);
      ensurePage();
      addSection(copy.pdf.reportedBy, record.reportedBy.name);
      ensurePage();
      addSection(copy.pdf.eventDate, new Date(record.eventDate).toLocaleString(locale));
      ensurePage();
      addSection(copy.pdf.type, copy.types[record.type]);
      ensurePage();
      addSection(copy.pdf.severity, record.severity ? copy.severity[record.severity] : copy.pdf.notAvailable);
      ensurePage();
      addSection(copy.pdf.status, copy.status[record.status]);
      ensurePage();
      addSection(copy.pdf.description, record.description);
      ensurePage();

      if (record.actionsTaken) {
        addSection(copy.pdf.actionsTaken, record.actionsTaken);
        ensurePage();
      }

      if (record.witnesses?.length) {
        addSection(copy.pdf.witnesses, record.witnesses.join(', '));
        ensurePage();
      }

      if (record.attachments?.length) {
        addSection(copy.pdf.attachments, record.attachments.map((attachment) => attachment.name).join(', '));
      }

      doc.save(`${sanitizeFileName(record.recordNumber || record.title)}.pdf`);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, copy.errors.exportRecord));
    }
  };

  const handleToggleColumn = (columnId: string) => {
    const column = recordColumns.find((item) => item.id === columnId);
    if (column?.locked) {
      return;
    }

    setVisibleRecordColumns((current) =>
      current.includes(columnId as RecordColumnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId as RecordColumnId],
    );
  };

  return (
    <div className="space-y-6">
      <RecordHeaderBar
        copy={copy}
        onColumns={() => setIsColumnsModalOpen(true)}
        onCreate={() => {
          setEditingRecord(null);
          setIsCreateModalOpen(true);
          if (employees.length === 0 && !isEmployeesLoading) {
            void loadEmployees();
          }
        }}
      />

      <RecordFilters
        copy={copy}
        filters={filters}
        onFiltersChange={setFilters}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
      />

      <RecordKpiStrip
        copy={copy.kpis}
        highSeverityCount={summary.high_severity_count}
        pendingCount={summary.pending_count}
        resolvedCount={summary.resolved_count}
        reviewedCount={summary.reviewed_count}
        totalCount={summary.total_count}
        visibleCount={sortedRecords.length}
      />

      <RecordsList
        copy={copy}
        locale={locale}
        records={paginatedRecords}
        visibleColumns={visibleRecordColumns}
        onRecordClick={(record) => {
          void handleRecordClick(record);
        }}
        onEdit={(record) => {
          void handleEditRecord(record);
        }}
        onDownload={handleDownloadRecord}
      />

      <RecordColumnsModal
        columns={recordColumns}
        copy={copy.columnsModal}
        isOpen={isColumnsModalOpen}
        visibleColumns={visibleRecordColumns}
        onClose={() => setIsColumnsModalOpen(false)}
        onToggleColumn={handleToggleColumn}
      />

      {sortedRecords.length > 0 ? (
        <div className="flex flex-col gap-4 border border-gray-200 rounded-lg bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {copy.pagination.showing(paginationStart, paginationEnd, sortedRecords.length)}
          </p>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {copy.pagination.page(safeCurrentPage, totalPages)}
            </p>
            <Pagination className="mx-0 w-auto justify-start md:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      changePage(safeCurrentPage - 1);
                    }}
                    aria-disabled={safeCurrentPage === 1}
                    className={safeCurrentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                {paginationItems.map((item, index) => (
                  item === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === safeCurrentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          changePage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  )
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      changePage(safeCurrentPage + 1);
                    }}
                    aria-disabled={safeCurrentPage === totalPages}
                    className={safeCurrentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      ) : null}

      <CreateRecordModal
        copy={copy}
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        employees={employees}
        isEmployeesLoading={isEmployeesLoading}
        employeeLoadError={employeeLoadError}
        onRetryEmployees={() => {
          void loadEmployees();
        }}
        editingRecord={editingRecord}
      />

      <RecordDetailModal
        copy={copy}
        locale={locale}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        record={selectedRecord}
        onEdit={(record) => {
          void handleEditRecord(record);
        }}
        onDelete={handleDeleteRecord}
      />

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
