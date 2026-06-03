import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FailureToast } from '../../../../components/FailureToast';
import { type AttendanceControlAssignment } from '../../../../api/humanResources';
import { useScheduleEmployeeSelection } from '../hooks/useScheduleEmployeeSelection';
import { useControlTranslations } from '../hooks/useControlTranslations';
import { useScheduleCandidates } from '../hooks/useScheduleCandidates';
import { useScheduleDraftState } from '../hooks/useScheduleDraftState';
import { useScheduleLocationScope } from '../hooks/useScheduleLocationScope';
import { useScheduleOrganizationOptions } from '../hooks/useScheduleOrganizationOptions';
import { useScheduleTemplateActions } from '../hooks/useScheduleTemplateActions';
import { useScheduleTemplateCollection } from '../hooks/useScheduleTemplateCollection';
import { EmployeeSelectionTable, ScheduleBuilder, ScheduleModalFrame } from './modals/schedule';
import type { ScheduleModalProps } from '../types/scheduleTypes';
import { dateInputValue } from '../utils/scheduleDates';
import {
  buildOperationalScheduleSummary,
  getBusinessUnitId,
} from '../utils/scheduleFormatters';

export function ScheduleModal({
  isOpen,
  onClose,
  templates,
  locations,
  selectedTemplateId,
  effectiveStartDate,
  onApplied,
}: ScheduleModalProps) {
  const copy = useControlTranslations();
  const todayDate = dateInputValue();
  const requestedAvailabilityDate = effectiveStartDate?.trim() || todayDate;
  const defaultAvailabilityDate = requestedAvailabilityDate < todayDate ? todayDate : requestedAvailabilityDate;
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedEmployeeAssignments, setSelectedEmployeeAssignments] = useState<Record<number, AttendanceControlAssignment>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const leftPanelScrollRef = useRef<HTMLDivElement>(null);
  const rightPanelScrollRef = useRef<HTMLDivElement>(null);
  const showFailureToast = useCallback((message: string) => {
    setFailureToastMessage('');
    window.setTimeout(() => setFailureToastMessage(message), 0);
  }, []);
  const clearFailureToast = useCallback(() => {
    setFailureToastMessage('');
  }, []);
  const handleOrganizationLoadError = useCallback((message: string) => {
    setErrorMessage(message);
    showFailureToast(message);
  }, [showFailureToast]);
  const {
    organizationBusinesses,
    organizationUnits,
    resolveBusinessFilterForUnit,
    unitOptions,
  } = useScheduleOrganizationOptions({
    copy,
    isOpen,
    onLoadError: handleOrganizationLoadError,
  });
  const resetSelectedEmployees = useCallback(() => {
    setSelectedEmployeeIds([]);
    setSelectedEmployeeAssignments({});
  }, []);
  const scrollAvailableEmployeesToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      leftPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);
  const scrollScheduleBuilderToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);
  const clearScheduleError = useCallback(() => {
    setErrorMessage('');
  }, []);
  const handleCandidateLoadError = useCallback((message: string) => {
    setErrorMessage(message);
    showFailureToast(message);
  }, [showFailureToast]);
  const handleCandidateDateError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);
  const handleCandidateLoadingStart = useCallback(() => {
    setErrorMessage('');
  }, []);
  const {
    applySearchFilters,
    assignmentDateError,
    assignmentEffectiveStartDate,
    appliedNegocioFilter,
    appliedUnidadFilter,
    availabilityDate,
    candidateAssignments,
    candidateBusyCount,
    candidateTotalCount,
    changePage,
    currentPage: safeCurrentPage,
    handleAvailabilityDateChange,
    handleBusinessFilterChange,
    handleUnitFilterChange,
    isLoadingCandidates,
    negocioFilter,
    paginatedAssignments,
    paginationEnd,
    paginationItems,
    paginationStart,
    searchQuery,
    setSearchQuery,
    totalPages,
    unidadFilter,
  } = useScheduleCandidates({
    copy,
    defaultAvailabilityDate,
    isOpen,
    organizationBusinesses,
    todayDate,
    onAvailabilityDateApplied: resetSelectedEmployees,
    onDateError: handleCandidateDateError,
    onLoadError: handleCandidateLoadError,
    onLoadingStart: handleCandidateLoadingStart,
    onPageChanged: scrollAvailableEmployeesToTop,
    resolveBusinessFilterForUnit,
  });
  const businessOptions = useMemo(
    () => organizationBusinesses
      .filter((option) => !unidadFilter || String(getBusinessUnitId(option) ?? '') === unidadFilter)
      .map((option) => [String(option.id), option.name || copy.labels.business] as const),
    [copy, organizationBusinesses, unidadFilter],
  );
  const {
    addCreatedTemplate,
    availableTemplates,
    markTemplateDeleted,
    removeCreatedTemplate,
  } = useScheduleTemplateCollection({ templates });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedEmployeeIds([]);
    setSelectedEmployeeAssignments({});
    setErrorMessage('');
    setFailureToastMessage('');
  }, [isOpen, selectedTemplateId, templates]);

  const {
    allVisibleSelected,
    selectedAssignments,
    selectedLockedAssignments,
    setEmployeeSelection,
    toggleAll,
    toggleEmployee,
    visibleAssignableEmployeeIds,
  } = useScheduleEmployeeSelection({
    candidateAssignments,
    paginatedAssignments,
    selectedEmployeeAssignments,
    selectedEmployeeIds,
    setSelectedEmployeeAssignments,
    setSelectedEmployeeIds,
  });

  const activeLocationOptions = useMemo(
    () => locations.filter((location) => location.status !== 'inactive'),
    [locations],
  );
  const {
    employeeBusinessLocationSummary,
    exactLocationOptions,
    exactLocationWarning,
    locationScopeFallbackMessage,
    locationScopeSummary,
    selectedEmployeeBusinessWarning,
  } = useScheduleLocationScope({
    activeLocationOptions,
    appliedNegocioFilter,
    appliedUnidadFilter,
    copy,
    organizationBusinesses,
    organizationUnits,
    selectedAssignments,
    selectedEmployeeCount: selectedEmployeeIds.length,
  });
  const {
    builderStep,
    copyMondayToAllDays,
    handleLocationRuleChange,
    handleScheduleModeChange,
    handleScheduleTemplateChange,
    horarios,
    isOpenSchedule,
    locationRule,
    resetSchedule,
    selectedScheduleTemplateId,
    selectedTemplateName,
    setBuilderStep,
    setSelectedScheduleTemplateId,
    setSelectedTemplateName,
    setToleranciaIngreso,
    setUbicacionSeleccionada,
    toleranciaIngreso,
    ubicacionSeleccionada,
    updateHorario,
    updateWorkingDay,
  } = useScheduleDraftState({
    availableTemplates,
    exactLocationOptions,
    isOpen,
    selectedTemplateId,
    templates,
    onErrorClear: clearScheduleError,
    onScrollReset: scrollScheduleBuilderToTop,
  });
  const selectedTemplate = useMemo(
    () => availableTemplates.find((template) => template.id === selectedScheduleTemplateId) ?? null,
    [availableTemplates, selectedScheduleTemplateId],
  );
  const operationalSummary = useMemo(() => buildOperationalScheduleSummary({
    copy: copy.schedule,
    effectiveStartDate: assignmentEffectiveStartDate,
    horarios,
    isOpenSchedule,
    locationRule,
    selectedEmployeeCount: selectedEmployeeIds.length,
    selectedTemplateName,
    toleranciaIngreso,
  }), [
    assignmentEffectiveStartDate,
    copy,
    horarios,
    isOpenSchedule,
    locationRule,
    selectedEmployeeIds.length,
    selectedTemplateName,
    toleranciaIngreso,
  ]);
  const {
    applySchedule,
    closeSaveTemplateModal,
    deleteSelectedScheduleTemplate,
    isDeletingTemplate,
    isSaveTemplateModalOpen,
    isSavingTemplate,
    isSubmitting,
    openSaveTemplateModal,
    resetTemplateActionState,
    saveScheduleTemplate,
    setTemplateNameDraft,
    templateNameDraft,
    templateNameError,
  } = useScheduleTemplateActions({
    addCreatedTemplate,
    assignmentDateError,
    assignmentEffectiveStartDate,
    availableTemplates,
    copy: copy.schedule,
    horarios,
    isOpenSchedule,
    locationRule,
    markTemplateDeleted,
    onApplied,
    onClose,
    onErrorMessageChange: setErrorMessage,
    onFailureToastClear: clearFailureToast,
    onScrollReset: scrollScheduleBuilderToTop,
    removeCreatedTemplate,
    resetSchedule,
    selectedEmployeeIds,
    selectedLockedAssignments,
    selectedTemplate,
    selectedTemplateName,
    setSelectedScheduleTemplateId,
    setSelectedTemplateName,
    showFailureToast,
    toleranciaIngreso,
    ubicacionSeleccionada,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetTemplateActionState();
  }, [isOpen, resetTemplateActionState, selectedTemplateId, templates]);

  if (!isOpen) {
    return (
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={clearFailureToast}
      />
    );
  }

  return (
    <>
      <ScheduleModalFrame
        assignmentDateError={assignmentDateError}
        copy={copy}
        effectiveStartDate={assignmentEffectiveStartDate}
        errorMessage={errorMessage}
        failureToastMessage={failureToastMessage}
        isSaveTemplateModalOpen={isSaveTemplateModalOpen}
        isSavingTemplate={isSavingTemplate}
        isSubmitting={isSubmitting}
        operationalSummary={operationalSummary}
        selectedEmployeeCount={selectedEmployeeIds.length}
        templateNameDraft={templateNameDraft}
        templateNameError={templateNameError}
        onApply={() => void applySchedule()}
        onClose={onClose}
        onFailureToastClose={clearFailureToast}
        onSaveTemplate={() => void saveScheduleTemplate()}
        onSaveTemplateClose={closeSaveTemplateModal}
        onTemplateNameChange={setTemplateNameDraft}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
          <section className="order-2 flex min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:order-1">
            <div ref={leftPanelScrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              <EmployeeSelectionTable
                allVisibleSelected={allVisibleSelected}
                assignmentEffectiveStartDate={assignmentEffectiveStartDate}
                availabilityDate={availabilityDate}
                businessOptions={businessOptions}
                candidateBusyCount={candidateBusyCount}
                candidateTotalCount={candidateTotalCount}
                changePage={changePage}
                copy={copy}
                currentPage={safeCurrentPage}
                isLoadingCandidates={isLoadingCandidates}
                negocioFilter={negocioFilter}
                paginatedAssignments={paginatedAssignments}
                paginationEnd={paginationEnd}
                paginationItems={paginationItems}
                paginationStart={paginationStart}
                searchQuery={searchQuery}
                selectedEmployeeIds={selectedEmployeeIds}
                setEmployeeSelection={setEmployeeSelection}
                setSearchQuery={setSearchQuery}
                todayDate={todayDate}
                toggleAll={toggleAll}
                toggleEmployee={toggleEmployee}
                totalPages={totalPages}
                unidadFilter={unidadFilter}
                unitOptions={unitOptions}
                visibleAssignableEmployeeIds={visibleAssignableEmployeeIds}
                onApplySearchFilters={applySearchFilters}
                onAvailabilityDateChange={handleAvailabilityDateChange}
                onBusinessFilterChange={handleBusinessFilterChange}
                onUnitFilterChange={handleUnitFilterChange}
              />
            </div>
          </section>

          <section className="order-1 flex min-h-0 flex-col bg-white dark:bg-slate-950 lg:order-2">
            <div ref={rightPanelScrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pb-28">
              <ScheduleBuilder
                activeStep={builderStep}
                copy={copy}
                employeeBusinessLocationSummary={employeeBusinessLocationSummary}
                exactLocationOptions={exactLocationOptions}
                exactLocationWarning={exactLocationWarning}
                effectiveStartDate={assignmentEffectiveStartDate}
                horarios={horarios}
                isDeletingTemplate={isDeletingTemplate}
                isOpenSchedule={isOpenSchedule}
                isSubmitting={isSubmitting}
                locationRule={locationRule}
                locationScopeFallbackMessage={locationScopeFallbackMessage}
                locationScopeSummary={locationScopeSummary}
                operationalSummary={operationalSummary}
                selectedEmployeeBusinessWarning={selectedEmployeeBusinessWarning}
                selectedEmployeeCount={selectedEmployeeIds.length}
                selectedScheduleTemplateId={selectedScheduleTemplateId}
                selectedTemplateName={selectedTemplateName}
                templates={availableTemplates}
                toleranciaIngreso={toleranciaIngreso}
                ubicacionSeleccionada={ubicacionSeleccionada}
                onCopyMondayToAllDays={copyMondayToAllDays}
                onDeleteSelectedTemplate={deleteSelectedScheduleTemplate}
                onHorarioChange={updateHorario}
                onLocationRuleChange={handleLocationRuleChange}
                onModeChange={handleScheduleModeChange}
                onStepChange={setBuilderStep}
                onOpenSaveTemplateModal={openSaveTemplateModal}
                onResetSchedule={resetSchedule}
                onScheduleTemplateChange={handleScheduleTemplateChange}
                onToleranciaIngresoChange={setToleranciaIngreso}
                onUbicacionSeleccionadaChange={setUbicacionSeleccionada}
                onWorkingDayChange={updateWorkingDay}
              />
            </div>
          </section>
        </div>
      </ScheduleModalFrame>
    </>
  );
}
