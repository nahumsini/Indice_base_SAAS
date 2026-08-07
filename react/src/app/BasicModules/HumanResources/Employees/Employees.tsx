import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { EmployeesActionModals } from './components/EmployeesActionModals';
import { EmployeeBulkAssignmentControls } from './components/EmployeeBulkAssignmentControls';
import { EmployeeKpiStrip } from './components/EmployeeKpiStrip';
import { EmployeesFilters } from './components/EmployeesFilters';
import { EmployeesFeedbackLayer } from './components/EmployeesFeedbackLayer';
import { EmployeesHeaderActions } from './components/EmployeesHeaderActions';
import { EmployeesTableSection } from './components/EmployeesTableSection';
import type { EmployeeDocumentType } from './components/CreateEmployeeModal';
import { OperationalBulkActionsBar, useRowSelection } from '../../shared/operational';
import { EmployeeAccessActions } from '../Control/components/EmployeeAccessActions';
import { useLanguage } from '../../../shared/context';
import {
  humanResourcesApi,
  type AttendanceAccessProfile,
  type AttendanceControlAssignment,
} from '../../../api/humanResources';
import { useEmployeeInlineEditing } from './hooks/useEmployeeInlineEditing';
import { useEmployeeInlineJobOptions } from './hooks/useEmployeeInlineJobOptions';
import { useEmployeeInlineOrganization } from './hooks/useEmployeeInlineOrganization';
import { useEmployeeModalFlow } from './hooks/useEmployeeModalFlow';
import { useEmployeeMutations } from './hooks/useEmployeeMutations';
import { useEmployeesColumns } from './hooks/useEmployeesColumns';
import { useEmployeesData } from './hooks/useEmployeesData';
import { useEmployeesFilters } from './hooks/useEmployeesFilters';
import { useEmployeesPagination } from './hooks/useEmployeesPagination';
import { useEmployeesSorting } from './hooks/useEmployeesSorting';
import { useEmployeesTranslations } from './hooks/useEmployeesTranslations';
import {
  allFilterValue,
  documentTypeOrder,
  employeePageSizeOptions,
} from './constants/employees.constants';
import { usePreferredBusinessCurrency } from '../../shared/BusinessCurrencyContext';
import { uploadEmployeeDocument } from './utils/employees.documents';
import { downloadEmployeesCsv } from './utils/employees.export';
import { useKpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import { formatBusinessCurrencyAmount } from '../../shared/businessCurrency';
import { normalizeErrorMessage } from './utils/employees.utils';
import type { EmployeeViewModel } from './types/employees.types';
import {
  OperationalModuleGuide,
  useHumanResourcesGuidanceTranslations,
} from '../operationalGuidance';

const toNullableNumber = (value: string) => {
  if (!value || value === allFilterValue) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

interface EmployeesProps {
  learningModeActive?: boolean;
}

export default function Employees({ learningModeActive = false }: EmployeesProps) {
  const { currentLanguage } = useLanguage();
  const copy = useEmployeesTranslations();
  const guidanceCopy = useHumanResourcesGuidanceTranslations();
  const employeesContentRef = useRef<HTMLDivElement | null>(null);
  const { preferredCurrency } = usePreferredBusinessCurrency();

  const {
    attendanceLocations,
    businessOptions,
    employees,
    ensureAttendanceLocations,
    hydrateEmployeeDetails,
    isLoading,
    loadEmployees,
    loadError,
    rememberCreatedEmployee,
    replaceEmployee,
    refreshEmployees,
    summary,
    unitOptions,
  } = useEmployeesData(copy);
  const {
    getColumnWidth,
    handleResizeStart,
    columns,
    fixedColumns,
    resizingColumn,
    setColumns,
    selectionColumnWidth,
    tableMinWidth,
    visibleColumns,
  } = useEmployeesColumns(copy);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [loadingOverlayTitle, setLoadingOverlayTitle] = useState<string>(copy.loadingTitle);
  const [loadingOverlayDescription, setLoadingOverlayDescription] = useState<string>(copy.loadingDescription);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const [uploadingDocumentKey, setUploadingDocumentKey] = useState<string | null>(null);
  const [accessProfiles, setAccessProfiles] = useState<AttendanceAccessProfile[]>([]);
  const {
    closeEmployeeModal,
    editingEmployee,
    isModalOpen,
    isPreparingModal,
    modalInitialData,
    openCreateEmployeeModal,
    openEditEmployeeModal,
    replaceEditingEmployeeId,
    resetEmployeeModal,
  } = useEmployeeModalFlow({
    copy,
    setFailureToastMessage,
    setLoadingOverlayDescription,
    setLoadingOverlayTitle,
  });
  const {
    handleConfirmDeleteEmployee,
    handleConfirmTermination,
    handleDeleteEmployee,
    handleSaveEmployee,
    isSubmitting,
    pendingDeleteEmployee,
    setPendingDeleteEmployee,
    setTerminatingEmployee,
    terminatingEmployee,
  } = useEmployeeMutations({
    copy,
    editingEmployee,
    refreshEmployees,
    rememberCreatedEmployee,
    replaceEditingEmployeeId,
    resetEmployeeModal,
    setFailureToastMessage,
    setLoadingOverlayDescription,
    setLoadingOverlayTitle,
    setSuccessToastMessage,
  });
  const {
    handleBulkEmployeeUpdate,
    handleInlineEmployeeUpdate,
    inlineDrafts,
    inlineSavingKey,
  } = useEmployeeInlineEditing({
    copy,
    employees,
    refreshEmployees,
    replaceEmployee,
    setFailureToastMessage,
    setSuccessToastMessage,
  });

  const {
    businessFilter,
    businessFilterOptions,
    departmentFilter,
    departmentFilterOptions,
    departmentOptions,
    filteredEmployees,
    filtersKey,
    searchQuery,
    setBusinessFilter,
    setDepartmentFilter,
    setSearchQuery,
    setStatusFilter,
    setUnitFilter,
    statusFilter,
    statusFilterOptions,
    unitFilter,
    unitFilterOptions,
  } = useEmployeesFilters({
    businessOptions,
    copy,
    employees,
    unitOptions,
  });
  const {
    handleSort,
    sortedEmployees,
    sortState,
  } = useEmployeesSorting(filteredEmployees);
  const {
    currentPage: paginationCurrentPage,
    onPageChange,
    onPageSizeChange,
    pageEnd: paginationEnd,
    pageSize,
    pageStart: paginationStart,
    paginatedEmployees,
    totalPages,
  } = useEmployeesPagination({
    resetKey: filtersKey,
    rows: sortedEmployees,
    totalCount: filteredEmployees.length,
  });
  const {
    employeePositionOptions,
    inlineDepartmentOptions,
  } = useEmployeeInlineJobOptions({
    departmentOptions,
    employees,
    locale: currentLanguage.code,
  });
  const {
    getInlineBusinessOptionsForUnit,
    inlineUnitOptions,
    resolveDefaultBusinessIdForUnit,
  } = useEmployeeInlineOrganization({
    businessOptions,
    locale: currentLanguage.code,
    organizationCopy: copy.modal.belonging,
    unitOptions,
  });
  const payrollAggregate = useKpiMonetaryAggregate({
    metric: 'HR_EMPLOYEE_MONTHLY_PAYROLL',
    preferredCurrency,
    ids: filteredEmployees.map((employee) => employee.id),
  });
  const payrollSummary = {
    currencyCount: payrollAggregate.data?.nativeTotals.length ?? 0,
    nativeBreakdownLabel: payrollAggregate.data?.nativeTotals.map(({ amount, currency }) => formatBusinessCurrencyAmount(amount, currency)).join(' / ') ?? '—',
    preferredTotalLabel: payrollAggregate.data && !payrollAggregate.loading
      ? formatBusinessCurrencyAmount(payrollAggregate.data.preferredTotal, preferredCurrency)
      : '—',
  };
  const rowSelection = useRowSelection<number>();
  const { pruneSelection } = rowSelection;
  const paginatedEmployeeIds = useMemo(
    () => paginatedEmployees.map((employee) => employee.id),
    [paginatedEmployees],
  );
  const selectionState = rowSelection.visibleSelectionState(paginatedEmployeeIds);
  const selectedEmployees = useMemo(
    () => filteredEmployees.filter((employee) => rowSelection.selectedIds.has(employee.id)),
    [filteredEmployees, rowSelection.selectedIds],
  );
  const noScheduleCount = useMemo(
    () =>
      filteredEmployees.filter((employee) =>
        employee.status === 'active' && (!employee.scheduleStartTime || !employee.scheduleEndTime),
      ).length,
    [filteredEmployees],
  );
  const missingDocumentsCount = useMemo(
    () =>
      filteredEmployees.filter((employee) =>
        documentTypeOrder.some((documentType) => !employee.documents[documentType]),
      ).length,
    [filteredEmployees],
  );
  const accessProfileByEmployeeId = useMemo(
    () => new Map(accessProfiles.map((profile) => [profile.user_company_id, profile])),
    [accessProfiles],
  );
  const toAttendanceAssignment = useCallback((employee: EmployeeViewModel): AttendanceControlAssignment => ({
    user_company_id: employee.id,
    user_code: employee.code,
    user_name: employee.fullName,
    position_title: employee.position,
    department: employee.department,
    user_status: employee.status,
    unit_id: toNullableNumber(employee.unitId),
    unit_name: employee.unitLabel,
    business_id: toNullableNumber(employee.businessId),
    business_name: employee.businessLabel,
    hire_date: employee.joinDate || null,
    today_status: 'pending',
    system_status: 'pending',
    minutes_late: 0,
    access_profile: accessProfileByEmployeeId.get(employee.id) ?? null,
  }), [accessProfileByEmployeeId]);
  const accessAssignments = useMemo(
    () => filteredEmployees.map(toAttendanceAssignment),
    [filteredEmployees, toAttendanceAssignment],
  );
  const handleExportSelectedEmployees = useCallback(() => {
    downloadEmployeesCsv({
      copy,
      employees: selectedEmployees,
    });
  }, [copy, selectedEmployees]);
  const loadEmployeeAccessProfiles = useCallback(async () => {
    try {
      const response = await humanResourcesApi.listAttendanceAccessProfiles();
      setAccessProfiles(response.items);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.load));
    }
  }, [copy.errorMessages.load]);
  const handleTableDocumentUpload = useCallback(async (
    employee: EmployeeViewModel,
    documentType: EmployeeDocumentType,
    file: File,
  ) => {
    const documentKey = `${employee.id}:${documentType}`;
    setUploadingDocumentKey(documentKey);
    setFailureToastMessage('');

    try {
      await uploadEmployeeDocument({
        copy,
        documentType,
        employeeId: employee.id,
        file,
      });
      await hydrateEmployeeDetails([employee.id], { force: true });
      setSuccessToastMessage(copy.successMessages.updated);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.save));
    } finally {
      setUploadingDocumentKey(null);
    }
  }, [
    copy,
    hydrateEmployeeDetails,
    setFailureToastMessage,
    setSuccessToastMessage,
  ]);

  useEffect(() => {
    if (isLoading || paginatedEmployees.length === 0) {
      return;
    }

    void hydrateEmployeeDetails(paginatedEmployees.map((employee) => employee.id));
  }, [hydrateEmployeeDetails, isLoading, paginatedEmployees]);

  useEffect(() => {
    pruneSelection(filteredEmployees.map((employee) => employee.id));
  }, [filteredEmployees, pruneSelection]);

  useEffect(() => {
    void loadEmployeeAccessProfiles();
  }, [loadEmployeeAccessProfiles]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    void ensureAttendanceLocations();
  }, [ensureAttendanceLocations, isModalOpen]);

  return (
    <>
      <EmployeesFeedbackLayer
        failureMessage={failureToastMessage}
        isBusy={isSubmitting || isPreparingModal}
        loadError={loadError}
        loadingDescription={loadingOverlayDescription}
        loadingTitle={loadingOverlayTitle}
        onCloseFailure={() => setFailureToastMessage('')}
        onCloseSuccess={() => setSuccessToastMessage('')}
        onRetryLoad={() => void loadEmployees()}
        retryLoadLabel={copy.retryLoad}
        successMessage={successToastMessage}
      />

      {learningModeActive ? (
        <div className="mb-4">
          <OperationalModuleGuide
            copy={guidanceCopy}
            activeTabId="collaborators"
            onPrimaryAction={() => {
              employeesContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>
      ) : null}

      <div ref={employeesContentRef} className="scroll-mt-24">
      <EmployeesHeaderActions
        addEmployeeLabel={copy.addEmployee}
        configureColumnsLabel={copy.configureColumns}
        headingIcon={<span className="text-2xl">👥</span>}
        onConfigureColumns={() => setIsColumnsModalOpen(true)}
        onCreateEmployee={openCreateEmployeeModal}
        subtitle={copy.subtitle}
        title={copy.title}
      />

      <EmployeesFilters
        businessFilter={businessFilter}
        businessFilterOptions={businessFilterOptions}
        departmentFilter={departmentFilter}
        departmentFilterOptions={departmentFilterOptions}
        filtersCopy={copy.filters}
        onBusinessFilterChange={setBusinessFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onUnitFilterChange={setUnitFilter}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        statusFilterOptions={statusFilterOptions}
        unitFilter={unitFilter}
        unitFilterOptions={unitFilterOptions}
      />

      {!learningModeActive ? (
        <EmployeeKpiStrip
          isLoading={isLoading}
          totalCount={summary.total_count}
          activeCount={summary.active_count}
          inactiveCount={summary.inactive_count}
          terminatedCount={summary.terminated_count}
          visibleCount={filteredEmployees.length}
          missingDocumentsCount={missingDocumentsCount}
          monthlyPayroll={payrollSummary.preferredTotalLabel}
          nativePayroll={payrollSummary.nativeBreakdownLabel}
          noScheduleCount={noScheduleCount}
          payrollCurrencyCount={payrollSummary.currencyCount}
          labels={copy.summary}
        />
      ) : null}

      {rowSelection.selectedCount > 0 ? (
        <OperationalBulkActionsBar
          actions={[
            {
              id: 'export',
              icon: <Download className="h-4 w-4" />,
              label: copy.bulk.exportSelected,
              onClick: handleExportSelectedEmployees,
              tone: 'brand',
            },
            {
              id: 'clear',
              icon: <X className="h-4 w-4" />,
              label: copy.bulk.clear,
              onClick: rowSelection.clearSelection,
            },
          ]}
          selectedLabel={copy.bulk.selected(rowSelection.selectedCount)}
          title={copy.bulk.title}
        >
          <EmployeeBulkAssignmentControls
            copy={copy}
            employeePositionOptions={employeePositionOptions}
            getBusinessOptionsForUnit={getInlineBusinessOptionsForUnit}
            inlineDepartmentOptions={inlineDepartmentOptions}
            inlineUnitOptions={inlineUnitOptions}
            isSaving={Boolean(inlineSavingKey?.startsWith('bulk:'))}
            locale={currentLanguage.code}
            onBulkEmployeeUpdate={(field, overrides) =>
              handleBulkEmployeeUpdate(selectedEmployees, field, overrides)
            }
            resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
            selectedEmployees={selectedEmployees}
          />
        </OperationalBulkActionsBar>
      ) : null}

      <EmployeesTableSection
        columns={visibleColumns}
        copy={copy}
        currentPage={paginationCurrentPage}
        employeePositionOptions={employeePositionOptions}
        getColumnWidth={getColumnWidth}
        getBusinessOptionsForUnit={getInlineBusinessOptionsForUnit}
        inlineDepartmentOptions={inlineDepartmentOptions}
        inlineDrafts={inlineDrafts}
        inlineSavingKey={inlineSavingKey}
        inlineUnitOptions={inlineUnitOptions}
        isLoading={isLoading}
        isRowSelected={rowSelection.isSelected}
        locale={currentLanguage.code}
        onDeleteEmployee={(employee) => {
          void handleDeleteEmployee(employee);
        }}
        onDocumentUpload={handleTableDocumentUpload}
        onEditEmployee={(employee) => {
          void openEditEmployeeModal(employee);
        }}
        onInlineEmployeeUpdate={handleInlineEmployeeUpdate}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onResizeStart={handleResizeStart}
        onSort={handleSort}
        onToggleAllRows={(checked) => rowSelection.toggleAllVisible(paginatedEmployeeIds, checked)}
        onToggleRowSelection={rowSelection.toggleSelection}
        pageEnd={paginationEnd}
        pageSize={pageSize}
        pageSizeOptions={employeePageSizeOptions}
        pageStart={paginationStart}
        renderPinAction={(employee) => {
          const accessProfile = accessProfileByEmployeeId.get(employee.id) ?? null;
          const assignment = accessAssignments.find((item) => item.user_company_id === employee.id)
            ?? toAttendanceAssignment(employee);

          return (
            <EmployeeAccessActions
              key={`employee-pin-${employee.id}`}
              actionBarLayout
              assignments={accessAssignments}
              faceEnrollment={null}
              onError={setFailureToastMessage}
              onFaceEnrollmentChange={() => undefined}
              onReload={async () => {
                await loadEmployeeAccessProfiles();
                await hydrateEmployeeDetails([employee.id], { force: true });
              }}
              onSuccess={setSuccessToastMessage}
              pinLabelOverride="PIN"
              selectedAccessProfile={accessProfile}
              selectedEmployee={{
                ...assignment,
                access_profile: accessProfile,
              }}
              showFaceAction={false}
            />
          );
        }}
        resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
        resizingColumn={resizingColumn}
        rows={paginatedEmployees}
        selectionColumnWidth={selectionColumnWidth}
        selectionState={selectionState}
        sortState={sortState}
        tableMinWidth={tableMinWidth}
        totalCount={filteredEmployees.length}
        totalPages={totalPages}
        uploadingDocumentKey={uploadingDocumentKey}
      />

      <EmployeesActionModals
        attendanceLocations={attendanceLocations}
        businessOptions={businessOptions}
        columns={columns}
        deleteCancelLabel={copy.modal.buttons.cancel}
        deleteConfirmLabel={copy.table.deleteHrUserLabel}
        deleteDescription={copy.table.deleteConfirm}
        deleteTitle={copy.table.deleteHrUserLabel}
        employeeInitialData={modalInitialData}
        employeeModalMode={editingEmployee ? 'edit' : 'create'}
        fixedColumns={fixedColumns}
        isColumnsModalOpen={isColumnsModalOpen}
        isDeleteDialogOpen={pendingDeleteEmployee !== null}
        isEmployeeModalOpen={isModalOpen}
        isSubmitting={isSubmitting}
        isTerminationModalOpen={terminatingEmployee !== null}
        onCancelDelete={() => setPendingDeleteEmployee(null)}
        onCloseColumns={() => setIsColumnsModalOpen(false)}
        onCloseEmployeeModal={closeEmployeeModal}
        onCloseTermination={() => setTerminatingEmployee(null)}
        onConfirmDelete={() => {
          void handleConfirmDeleteEmployee();
        }}
        onConfirmTermination={(data) => {
          void handleConfirmTermination(data);
        }}
        onSaveColumns={setColumns}
        onSaveEmployee={handleSaveEmployee}
        pendingDeleteEmployeeName={pendingDeleteEmployee?.fullName ?? ''}
        terminatingEmployeeName={terminatingEmployee?.fullName ?? ''}
        unitOptions={unitOptions}
      />
      </div>
    </>
  );
}
