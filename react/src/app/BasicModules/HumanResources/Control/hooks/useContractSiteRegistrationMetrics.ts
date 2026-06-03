import { useMemo } from 'react';
import type {
  BackendBusiness,
  BackendUnit,
} from '../../../../api/dashboard';
import type { AttendanceControlLocation } from '../../../../api/humanResources';
import {
  getContractSiteWizardSteps,
} from '../constants/contractSiteConstants';
import type {
  ContractSiteCopy,
  ContractSiteWizardStep,
  DraftLocation,
} from '../types/contractSiteTypes';
import {
  areDraftLocationsEqual,
  contractDaysBetween,
  hasCompleteContractSiteFormInput,
  hasPendingContractSiteFormInput,
  hasText,
  toDraftLocation,
} from '../utils/contractSiteUtils';

interface UseContractSiteRegistrationMetricsInput {
  altitud: string;
  contractEndDate: string;
  contractStartDate: string;
  contractStatus: 'active' | 'inactive';
  controlDate: string;
  copy: ContractSiteCopy;
  draftLocations: DraftLocation[];
  enlaceGoogleMaps: string;
  latitud: string;
  locations: AttendanceControlLocation[];
  longitud: string;
  nombre: string;
  radio: string;
  removedLocationIds: number[];
  selectedBusiness: BackendBusiness | null;
  selectedUnit: BackendUnit | null;
  wizardStep: ContractSiteWizardStep;
}

export function useContractSiteRegistrationMetrics({
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
}: UseContractSiteRegistrationMetricsInput) {
  const persistedLocationSnapshot = useMemo(
    () => new Map(locations.map((location) => [location.id, toDraftLocation(location)])),
    [locations],
  );

  const hasPendingFormInput = useMemo(() => (
    hasPendingContractSiteFormInput({
      altitud,
      contractEndDate,
      contractStartDate,
      contractStatus,
      controlDate,
      enlaceGoogleMaps,
      latitud,
      longitud,
      nombre,
      radio,
    })
  ), [
    altitud,
    contractEndDate,
    contractStartDate,
    controlDate,
    enlaceGoogleMaps,
    latitud,
    longitud,
    nombre,
    radio,
    contractStatus,
  ]);

  const hasChanges = useMemo(() => {
    const hasNewDrafts = draftLocations.some((location) => !location.persistedId);
    const hasEditedDrafts = draftLocations.some((location) => {
      if (!location.persistedId) {
        return false;
      }
      const originalLocation = persistedLocationSnapshot.get(location.persistedId);
      return !originalLocation || !areDraftLocationsEqual(location, originalLocation);
    });
    return hasNewDrafts || hasEditedDrafts || removedLocationIds.length > 0;
  }, [draftLocations, persistedLocationSnapshot, removedLocationIds]);

  const contractDaysForForm = useMemo(
    () => contractDaysBetween(contractStartDate, contractEndDate),
    [contractEndDate, contractStartDate],
  );

  const contractSiteWizardSteps = useMemo(() => getContractSiteWizardSteps(copy), [copy]);
  const currentWizardStepIndex = contractSiteWizardSteps.findIndex((step) => step.id === wizardStep);
  const parsedLatitudeForForm = Number(latitud);
  const parsedLongitudeForForm = Number(longitud);
  const parsedRadiusForForm = Number(radio);
  const hasValidBasicInformation = Boolean(
    selectedUnit
    && selectedBusiness
    && hasText(nombre)
    && contractDaysForForm !== null,
  );
  const hasValidLocationInformation = Boolean(
    !Number.isNaN(parsedLatitudeForForm)
    && !Number.isNaN(parsedLongitudeForForm)
    && !Number.isNaN(parsedRadiusForForm)
    && parsedRadiusForForm > 0,
  );
  const canContinueWizard = wizardStep === 'basic'
    ? hasValidBasicInformation
    : wizardStep === 'location'
      ? hasValidLocationInformation
      : true;

  const hasCompleteFormInput = useMemo(() => (
    hasCompleteContractSiteFormInput({
      contractEndDate,
      contractStartDate,
      latitud,
      longitud,
      nombre,
      radio,
      selectedBusiness,
      selectedUnit,
    })
  ), [
    contractEndDate,
    contractStartDate,
    latitud,
    longitud,
    nombre,
    radio,
    selectedBusiness,
    selectedUnit,
  ]);

  const getWizardStepErrorMessage = () => {
    if (wizardStep === 'basic') {
      return copy.errors.completeBasicStep;
    }
    if (wizardStep === 'location') {
      return copy.errors.completeLocationStep;
    }
    return copy.errors.reviewBeforeAdd;
  };

  return {
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
  };
}
