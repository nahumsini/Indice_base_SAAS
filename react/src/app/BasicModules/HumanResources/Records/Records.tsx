import { useEffect, useMemo, useState } from 'react';
import { FileWarning, Plus } from 'lucide-react';
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
import { Button } from '../../../components/ui/button';
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
import { RecordDetailModal } from './components/RecordDetailModal';
import { RecordFilters } from './components/RecordFilters';
import { RecordsList } from './components/RecordsList';
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

const mapBackendRecord = (record: BackendRecordItem): EmployeeRecord => ({
  id: String(record.id),
  recordNumber: record.record_number,
  employee: {
    id: String(record.employee.id),
    name: record.employee.name,
    position: record.employee.position ?? '',
    department: record.employee.department ?? '',
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
    id: String(record.reported_by.user_id ?? record.reported_by.employee_id ?? ''),
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
      ? { employee_id: Number(witnessEmployee.id), name: witnessEmployee.name }
      : witnessName;
  });

  return {
    employee_id: Number(data.employeeId),
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
  const [selectedRecord, setSelectedRecord] = useState<EmployeeRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<EmployeeRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingState, setLoadingState] = useState({
    isVisible: false,
    title: 'Loading records',
    description: 'Preparing the records workspace.',
  });

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
          record.employee.name,
          record.employee.position,
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
      const employeesResponse = await humanResourcesApi.listEmployees();
      setEmployees(
        employeesResponse.items.map((employee) => ({
          id: String(employee.id),
          name: employee.full_name,
          position: employee.position_title || employee.position || '',
          department: employee.department || '',
        })),
      );
    } catch (error) {
      setEmployeeLoadError(formatErrorMessage(error, 'Unable to load employees for this record.'));
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
      title: 'Loading records',
      description: 'Preparing the records workspace.',
    });

    try {
      const [recordsResult, employeesResult] = await runWithMinimumDuration(Promise.allSettled([
        loadRecords(),
        loadEmployees(),
      ]));

      if (recordsResult.status === 'rejected') {
        setErrorMessage(formatErrorMessage(recordsResult.reason, 'Unable to load records.'));
      }
      if (employeesResult.status === 'rejected') {
        setEmployeeLoadError(formatErrorMessage(employeesResult.reason, 'Unable to load employees for this record.'));
      }
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Unable to load records.'));
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
    const fallbackMessage = editingRecord ? 'Unable to update record.' : 'Unable to create record.';

    setLoadingState({
      isVisible: true,
      title: editingRecord ? 'Saving record' : 'Creating record',
      description: editingRecord
        ? 'Updating record details and attachments.'
        : 'Saving the new record and any attachments.',
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
      setSuccessMessage(editingRecord ? 'Record updated successfully.' : 'Record created successfully.');
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
      title: 'Loading record',
      description: 'Fetching the full record details.',
    });

    try {
      const detailResponse = await runWithMinimumDuration(humanResourcesApi.getRecordDetails(record.id));
      setSelectedRecord(mapBackendRecord(detailResponse.record));
      setIsDetailModalOpen(true);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Unable to load record details.'));
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleEditRecord = async (record: EmployeeRecord) => {
    setLoadingState({
      isVisible: true,
      title: 'Loading record',
      description: 'Preparing the record for editing.',
    });

    try {
      const detailResponse = await runWithMinimumDuration(humanResourcesApi.getRecordDetails(record.id));
      setEditingRecord(mapBackendRecord(detailResponse.record));
      setIsDetailModalOpen(false);
      setIsCreateModalOpen(true);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Unable to load the selected record.'));
    } finally {
      setLoadingState((current) => ({ ...current, isVisible: false }));
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    setLoadingState({
      isVisible: true,
      title: 'Deleting record',
      description: 'Removing the record from the active history.',
    });

    try {
      await runWithMinimumDuration(humanResourcesApi.deleteRecord(recordId));
      await refreshRecords();
      setSelectedRecord(null);
      setSuccessMessage('Record deleted successfully.');
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Unable to delete record.'));
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
      doc.text(record.recordNumber || `Record #${record.id}`, left, cursorY);
      cursorY += 8;

      addSection('Employee', `${record.employee.name}${record.employee.position ? ` · ${record.employee.position}` : ''}`);
      ensurePage();
      addSection('Reported By', record.reportedBy.name);
      ensurePage();
      addSection('Event Date', new Date(record.eventDate).toLocaleString());
      ensurePage();
      addSection('Type', record.type);
      ensurePage();
      addSection('Severity', record.severity ?? 'N/A');
      ensurePage();
      addSection('Status', record.status);
      ensurePage();
      addSection('Description', record.description);
      ensurePage();

      if (record.actionsTaken) {
        addSection('Actions Taken', record.actionsTaken);
        ensurePage();
      }

      if (record.witnesses?.length) {
        addSection('Witnesses', record.witnesses.join(', '));
        ensurePage();
      }

      if (record.attachments?.length) {
        addSection('Attachments', record.attachments.map((attachment) => attachment.name).join(', '));
      }

      doc.save(`${sanitizeFileName(record.recordNumber || record.title)}.pdf`);
    } catch (error) {
      setErrorMessage(formatErrorMessage(error, 'Unable to export this record.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gray-100 px-6 py-8 dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="mb-2 flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white">
              <FileWarning className="h-8 w-8" />
              Records
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Track incidents, reports and employee history
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingRecord(null);
              setIsCreateModalOpen(true);
              if (employees.length === 0 && !isEmployeesLoading) {
                void loadEmployees();
              }
            }}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Record
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          📋 <span className="font-medium text-gray-900 dark:text-white">{summary.total_count}</span> total records
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          ⏳ <span className="font-medium text-orange-600 dark:text-orange-400">{summary.pending_count}</span> pending
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          ✓ <span className="font-medium text-green-600 dark:text-green-400">{summary.resolved_count}</span> resolved
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span className="flex items-center gap-1.5">
          🔴 <span className="font-medium text-red-600 dark:text-red-400">{summary.high_severity_count}</span> high severity
        </span>
      </div>

      <RecordFilters
        filters={filters}
        onFiltersChange={setFilters}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
      />

      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {sortedRecords.length} of {records.length} records
      </div>

      <RecordsList
        records={paginatedRecords}
        onRecordClick={(record) => {
          void handleRecordClick(record);
        }}
        onEdit={(record) => {
          void handleEditRecord(record);
        }}
        onDownload={handleDownloadRecord}
      />

      {sortedRecords.length > 0 ? (
        <div className="flex flex-col gap-4 border border-gray-200 rounded-lg bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {paginationStart}-{paginationEnd} of {sortedRecords.length} records
          </p>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {safeCurrentPage} of {totalPages}
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
