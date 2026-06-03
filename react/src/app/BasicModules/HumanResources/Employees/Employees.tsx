import { useEffect, useState } from 'react';
import { EmployeesActionModals } from './components/EmployeesActionModals';
import { EmployeeKpiStrip } from './components/EmployeeKpiStrip';
import { EmployeesFilters } from './components/EmployeesFilters';
import { EmployeesFeedbackLayer } from './components/EmployeesFeedbackLayer';
import { EmployeesHeaderActions } from './components/EmployeesHeaderActions';
import { EmployeesTableSection } from './components/EmployeesTableSection';
import { useLanguage } from '../../../shared/context';
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
import { currencyFormatter } from './constants/employees.constants';
import { calculateEmployeesMonthlyPayroll } from './utils/employees.utils';

export default function Employees() {
  const { currentLanguage } = useLanguage();
  const copy = useEmployeesTranslations();

  const {
    attendanceLocations,
    businessOptions,
    employees,
    ensureAttendanceLocations,
    hydrateEmployeeDetails,
    isLoading,
    loadEmployees,
    loadError,
    replaceEmployee,
    refreshEmployees,
    summary,
    unitOptions,
  } = useEmployeesData(copy);
  const {
    columns,
    fixedColumns,
    setColumns,
    visibleColumns,
  } = useEmployeesColumns(copy);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [loadingOverlayTitle, setLoadingOverlayTitle] = useState<string>(copy.loadingTitle);
  const [loadingOverlayDescription, setLoadingOverlayDescription] = useState<string>(copy.loadingDescription);
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
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
    replaceEditingEmployeeId,
    resetEmployeeModal,
    setFailureToastMessage,
    setLoadingOverlayDescription,
    setLoadingOverlayTitle,
    setSuccessToastMessage,
  });
  const {
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
    pageEnd: paginationEnd,
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
  const visibleMonthlyPayroll = calculateEmployeesMonthlyPayroll(filteredEmployees);

  useEffect(() => {
    if (isLoading || paginatedEmployees.length === 0) {
      return;
    }

    void hydrateEmployeeDetails(paginatedEmployees.map((employee) => employee.id));
  }, [hydrateEmployeeDetails, isLoading, paginatedEmployees]);

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

      <EmployeeKpiStrip
        isLoading={isLoading}
        totalCount={summary.total_count}
        activeCount={summary.active_count}
        inactiveCount={summary.inactive_count}
        terminatedCount={summary.terminated_count}
        visibleCount={filteredEmployees.length}
        monthlyPayroll={currencyFormatter.format(visibleMonthlyPayroll)}
        labels={copy.summary}
      />

      <EmployeesTableSection
        columns={visibleColumns}
        copy={copy}
        currentPage={paginationCurrentPage}
        employeePositionOptions={employeePositionOptions}
        getBusinessOptionsForUnit={getInlineBusinessOptionsForUnit}
        inlineDepartmentOptions={inlineDepartmentOptions}
        inlineDrafts={inlineDrafts}
        inlineSavingKey={inlineSavingKey}
        inlineUnitOptions={inlineUnitOptions}
        isLoading={isLoading}
        locale={currentLanguage.code}
        onDeleteEmployee={(employee) => {
          void handleDeleteEmployee(employee);
        }}
        onEditEmployee={(employee) => {
          void openEditEmployeeModal(employee);
        }}
        onInlineEmployeeUpdate={handleInlineEmployeeUpdate}
        onPageChange={onPageChange}
        onSort={handleSort}
        pageEnd={paginationEnd}
        pageStart={paginationStart}
        resolveDefaultBusinessIdForUnit={resolveDefaultBusinessIdForUnit}
        rows={paginatedEmployees}
        sortState={sortState}
        totalCount={filteredEmployees.length}
        totalPages={totalPages}
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
    </>
  );
}
