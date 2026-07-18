import { useCallback, useEffect } from 'react';
import { useControlTranslations } from '../hooks/useControlTranslations';
import { useContractSiteDirectory } from '../hooks/useContractSiteDirectory';
import { useContractSiteDraftForm } from '../hooks/useContractSiteDraftForm';
import { useContractSiteRegistrationMetrics } from '../hooks/useContractSiteRegistrationMetrics';
import { useContractSiteRegistrationOperations } from '../hooks/useContractSiteRegistrationOperations';
import { useContractSiteScopeOptions } from '../hooks/useContractSiteScopeOptions';
import type {
  ContractSiteRegistrationModalProps,
} from '../types/contractSiteTypes';
import { ContractSiteDetailModal } from './modals/contract-site-registration/ContractSiteDetailModal';
import { ContractSiteDraftFormPanel } from './modals/contract-site-registration/ContractSiteDraftFormPanel';
import { ContractSiteExistingLocations } from './modals/contract-site-registration/ContractSiteExistingLocations';
import { ContractSiteRegistrationFrame } from './modals/contract-site-registration/ContractSiteRegistrationFrame';

export function ContractSiteRegistrationModal({
  isOpen,
  onClose,
  locations,
  assignments,
  controlDate,
  onReload,
  onSaved,
}: ContractSiteRegistrationModalProps) {
  const { contractSites: copy } = useControlTranslations();
  const draftForm = useContractSiteDraftForm({ controlDate, copy });
  const {
    addOrUpdateDraft,
    altitud,
    buildDraftFromForm,
    contractEndDate,
    contractStartDate,
    contractStatus,
    draftLocations,
    editingLocationId,
    enlaceGoogleMaps,
    formSectionRef,
    handleContractStartDateChange,
    latitud,
    longitud,
    nameInputRef,
    nombre,
    populateDraftForm,
    radio,
    removedLocationIds,
    removeDraft,
    resetDraftForm,
    resetModalDraftState,
    scrollContainerRef,
    selectedBusinessId,
    selectedUnitId,
    setAltitud,
    setContractEndDate,
    setContractStatus,
    setDraftLocations,
    setEnlaceGoogleMaps,
    setLatitud,
    setLongitud,
    setNombre,
    setRadio,
    setSelectedBusinessId,
    setSelectedUnitId,
    setShowAdvancedLocationFields,
    setWizardStep,
    showAdvancedLocationFields,
    wizardStep,
  } = draftForm;
  const {
    clearFeedback,
    errorMessage,
    extractCoordinates,
    failureToastMessage,
    getCurrentLocation,
    handleGuardar,
    isExtractingCoordinates,
    isSaving,
    loadingOverlayCopy,
    locationAction,
    setErrorMessage,
    setFailureToastMessage,
    setSuccessToastMessage,
    successToastMessage,
  } = useContractSiteRegistrationOperations({
    copy,
    onClose,
    onReload,
    onSaved,
    setAltitud,
    setDraftLocations,
    setLatitud,
    setLongitud,
  });
  const resetSelectedBusiness = useCallback(() => setSelectedBusinessId(''), [setSelectedBusinessId]);
  const {
    activeLocationsCount,
    assignedLocationsCount,
    contractSiteFilter,
    contractSitePaginationEnd,
    contractSitePaginationStart,
    contractSiteTotalPages,
    filteredDraftLocations,
    goToNextContractSitePage,
    goToPreviousContractSitePage,
    locationDrafts,
    paginatedDraftLocations,
    resetContractSiteDirectory,
    safeContractSitePage,
    selectedContractSite,
    selectedContractSiteActivity,
    setContractSiteFilter,
    setSelectedContractSiteId,
  } = useContractSiteDirectory({
    assignments,
    draftLocations,
    locations,
  });
  const {
    filteredBusinessOptions,
    isLoadingScopeOptions,
    selectedBusiness,
    selectedUnit,
    units,
  } = useContractSiteScopeOptions({
    isOpen,
    loadErrorMessage: copy.errors.loadScopeOptions,
    selectedBusinessId,
    selectedUnitId,
    onBusinessReset: resetSelectedBusiness,
    onError: setErrorMessage,
  });
  const {
    canContinueWizard,
    contractDaysForForm,
    contractSiteWizardSteps,
    currentWizardStepIndex,
    getWizardStepErrorMessage,
    hasChanges,
    hasCompleteFormInput,
    hasPendingFormInput,
    hasValidLocationInformation,
    parsedRadiusForForm,
    persistedLocationSnapshot,
  } = useContractSiteRegistrationMetrics({
    altitud,
    contractEndDate,
    contractStartDate,
    contractStatus,
    controlDate,
    copy,
    draftLocations,
    enlaceGoogleMaps,
    latitud,
    locations,
    longitud,
    nombre,
    radio,
    removedLocationIds,
    selectedBusiness,
    selectedUnit,
    wizardStep,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    resetModalDraftState(locationDrafts);
    resetContractSiteDirectory();
    clearFeedback();
  }, [controlDate, isOpen, locationDrafts, resetContractSiteDirectory]);

  if (!isOpen) return null;

  const buildCurrentDraftFromForm = () => buildDraftFromForm({
    selectedBusiness,
    selectedUnit,
  });

  const goToNextWizardStep = () => {
    if (!canContinueWizard) {
      setErrorMessage(getWizardStepErrorMessage());
      return;
    }

    setErrorMessage('');
    setWizardStep(contractSiteWizardSteps[Math.min(currentWizardStepIndex + 1, contractSiteWizardSteps.length - 1)].id);
  };

  const goToPreviousWizardStep = () => {
    setErrorMessage('');
    setWizardStep(contractSiteWizardSteps[Math.max(currentWizardStepIndex - 1, 0)].id);
  };

  const handleAddOrUpdate = () => {
    const { draft, errorMessage: formErrorMessage } = buildCurrentDraftFromForm();
    if (!draft) {
      setErrorMessage(formErrorMessage ?? copy.errors.completeBeforeAdd);
      return;
    }

    addOrUpdateDraft(draft);
    resetDraftForm();
    setErrorMessage('');
  };

  const handleEdit = (location: Parameters<typeof populateDraftForm>[0]) => {
    populateDraftForm(location);
    clearFeedback();
  };

  const saveContractSites = () => handleGuardar({
    buildDraftFromForm: buildCurrentDraftFromForm,
    draftLocations,
    editingLocationId,
    hasPendingFormInput,
    persistedLocationSnapshot,
    removedLocationIds,
  });

  return (
    <>
      {!selectedContractSite ? (
      <ContractSiteRegistrationFrame
        copy={copy}
        errorMessage={errorMessage}
        failureToastMessage={failureToastMessage}
        hasChanges={hasChanges}
        hasCompleteFormInput={hasCompleteFormInput}
        isExtractingCoordinates={isExtractingCoordinates}
        isSaving={isSaving}
        loadingOverlayCopy={loadingOverlayCopy}
        locationAction={locationAction}
        scrollContainerRef={scrollContainerRef}
        successToastMessage={successToastMessage}
        onClose={onClose}
        onFailureToastClose={() => setFailureToastMessage('')}
        onSave={() => void saveContractSites()}
        onSuccessToastClose={() => setSuccessToastMessage('')}
      >
        <div className="rounded-md border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
          <p className="text-sm text-[#59C3A5] dark:text-blue-200">
            {copy.intro}
          </p>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{copy.stats.activeLocations(activeLocationsCount)}</span>
          <span> · {copy.stats.assignedLocations(assignedLocationsCount)}</span> ·{' '}
          {hasChanges ? (
            <span className="text-orange-600 dark:text-orange-400">{copy.stats.pendingChanges}</span>
          ) : (
            <span className="text-green-600 dark:text-green-400">{copy.stats.noPendingChanges}</span>
          )}
        </div>

        <ContractSiteDraftFormPanel
          altitud={altitud}
          businessOptions={filteredBusinessOptions}
          canContinueWizard={canContinueWizard}
          contractDaysForForm={contractDaysForForm}
          contractEndDate={contractEndDate}
          contractStartDate={contractStartDate}
          contractStatus={contractStatus}
          copy={copy}
          currentWizardStepIndex={currentWizardStepIndex}
          editingLocationId={editingLocationId}
          enlaceGoogleMaps={enlaceGoogleMaps}
          formSectionRef={formSectionRef}
          hasCompleteFormInput={hasCompleteFormInput}
          hasValidLocationInformation={hasValidLocationInformation}
          isExtractingCoordinates={isExtractingCoordinates}
          isLoadingScopeOptions={isLoadingScopeOptions}
          latitud={latitud}
          longitud={longitud}
          nameInputRef={nameInputRef}
          nombre={nombre}
          parsedRadiusForForm={parsedRadiusForForm}
          radio={radio}
          selectedBusiness={selectedBusiness}
          selectedBusinessId={selectedBusinessId}
          selectedUnit={selectedUnit}
          selectedUnitId={selectedUnitId}
          showAdvancedLocationFields={showAdvancedLocationFields}
          steps={contractSiteWizardSteps}
          units={units}
          wizardStep={wizardStep}
          onAddOrUpdate={handleAddOrUpdate}
          onAdvancedFieldsToggle={() => setShowAdvancedLocationFields((current) => !current)}
          onAltitudeChange={setAltitud}
          onBack={goToPreviousWizardStep}
          onBusinessChange={setSelectedBusinessId}
          onCancelEditing={resetDraftForm}
          onContinue={goToNextWizardStep}
          onContractEndDateChange={setContractEndDate}
          onContractStartDateChange={handleContractStartDateChange}
          onExtractCoordinates={() => void extractCoordinates(enlaceGoogleMaps)}
          onGetCurrentLocation={getCurrentLocation}
          onGoogleMapsLinkChange={setEnlaceGoogleMaps}
          onLatitudeChange={setLatitud}
          onLongitudeChange={setLongitud}
          onNameChange={setNombre}
          onRadiusChange={setRadio}
          onStatusChange={setContractStatus}
          onStepChange={setWizardStep}
          onUnitChange={setSelectedUnitId}
        />

        {draftLocations.length > 0 ? (
          <ContractSiteExistingLocations
            contractSiteFilter={contractSiteFilter}
            controlDate={controlDate}
            contractSitePaginationEnd={contractSitePaginationEnd}
            contractSitePaginationStart={contractSitePaginationStart}
            contractSiteTotalPages={contractSiteTotalPages}
            copy={copy}
            filteredDraftLocations={filteredDraftLocations}
            paginatedDraftLocations={paginatedDraftLocations}
            safeContractSitePage={safeContractSitePage}
            onDelete={removeDraft}
            onEdit={handleEdit}
            onFilterChange={setContractSiteFilter}
            onNextPage={goToNextContractSitePage}
            onPreviousPage={goToPreviousContractSitePage}
            onSelect={setSelectedContractSiteId}
          />
        ) : null}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-xs text-yellow-900 dark:text-yellow-200">
            <span className="font-medium">{copy.tipLabel}:</span> {copy.googleMapsTip}
          </p>
        </div>
      </ContractSiteRegistrationFrame>
      ) : null}
      {selectedContractSite ? (
        <ContractSiteDetailModal
          activity={selectedContractSiteActivity}
          controlDate={controlDate}
          copy={copy}
          location={selectedContractSite}
          onClose={() => setSelectedContractSiteId(null)}
        />
      ) : null}
    </>
  );
}
