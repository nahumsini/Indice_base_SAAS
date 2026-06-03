import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  humanResourcesApi,
} from '../../../../api/humanResources';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import {
  LOCATION_MODAL_MINIMUM_LOADING_MS,
} from '../constants/contractSiteConstants';
import type {
  ContractSiteCopy,
  DraftLocation,
} from '../types/contractSiteTypes';
import {
  getContractSiteDraftChanges,
  getContractSiteDraftValidationError,
  toBackendTime,
  waitForNextPaint,
} from '../utils/contractSiteUtils';

type BuildDraftFromForm = () => { draft: DraftLocation | null; errorMessage: string | null };

interface UseContractSiteRegistrationOperationsInput {
  copy: ContractSiteCopy;
  onClose: () => void;
  onReload?: () => Promise<void> | void;
  onSaved?: () => void;
  setAltitud: Dispatch<SetStateAction<string>>;
  setDraftLocations: Dispatch<SetStateAction<DraftLocation[]>>;
  setLatitud: Dispatch<SetStateAction<string>>;
  setLongitud: Dispatch<SetStateAction<string>>;
}

interface SaveContractSiteDraftsInput {
  buildDraftFromForm: BuildDraftFromForm;
  draftLocations: DraftLocation[];
  editingLocationId: string | null;
  hasPendingFormInput: boolean;
  persistedLocationSnapshot: Map<number, DraftLocation>;
  removedLocationIds: number[];
}

export function useContractSiteRegistrationOperations({
  copy,
  onClose,
  onReload,
  onSaved,
  setAltitud,
  setDraftLocations,
  setLatitud,
  setLongitud,
}: UseContractSiteRegistrationOperationsInput) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingCoordinates, setIsExtractingCoordinates] = useState(false);
  const [locationAction, setLocationAction] = useState<'save' | 'load' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');

  const loadingOverlayCopy = useMemo(() => {
    if (isExtractingCoordinates) {
      return {
        title: copy.loading.extractingTitle,
        description: copy.loading.extractingDescription,
      };
    }
    if (locationAction === 'load') {
      return {
        title: copy.loading.loadingTitle,
        description: copy.loading.loadingDescription,
      };
    }
    return {
      title: copy.loading.savingTitle,
      description: copy.loading.savingDescription,
    };
  }, [copy, isExtractingCoordinates, locationAction]);

  const clearFeedback = () => {
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');
  };

  const extractCoordinates = async (enlaceGoogleMaps: string) => {
    clearFeedback();

    if (!enlaceGoogleMaps.trim()) {
      const message = copy.errors.mapLinkRequired;
      setErrorMessage(message);
      setFailureToastMessage(message);
      return;
    }

    setIsExtractingCoordinates(true);
    await waitForNextPaint();

    try {
      const response = await runWithMinimumDuration(
        humanResourcesApi.extractAttendanceLocationCoordinates({
          map_url: enlaceGoogleMaps.trim(),
        }),
        LOCATION_MODAL_MINIMUM_LOADING_MS,
      );
      setLatitud(String(response.latitude));
      setLongitud(String(response.longitude));
      setSuccessToastMessage(copy.success.coordinatesFetched);
    } catch {
      setFailureToastMessage(copy.errors.fetchCoordinates);
      setErrorMessage(copy.errors.fetchCoordinates);
    } finally {
      setIsExtractingCoordinates(false);
    }
  };

  const handleGuardar = async ({
    buildDraftFromForm,
    draftLocations,
    editingLocationId,
    hasPendingFormInput,
    persistedLocationSnapshot,
    removedLocationIds,
  }: SaveContractSiteDraftsInput) => {
    clearFeedback();

    let nextDraftLocations = draftLocations;

    if (hasPendingFormInput) {
      const { draft, errorMessage: formErrorMessage } = buildDraftFromForm();
      if (!draft) {
        const pendingFormMessage = formErrorMessage ?? copy.errors.completeBeforeSave;
        setFailureToastMessage(pendingFormMessage);
        setErrorMessage(pendingFormMessage);
        return;
      }

      nextDraftLocations = editingLocationId
        ? draftLocations.map((location) => (
          location.id === editingLocationId
            ? draft
            : location
        ))
        : [...draftLocations, draft];
      setDraftLocations(nextDraftLocations);
    }

    const {
      draftsToPersist,
      newDrafts,
      updatedDrafts,
    } = getContractSiteDraftChanges(nextDraftLocations, persistedLocationSnapshot);

    const validationMessage = getContractSiteDraftValidationError(draftsToPersist, copy);
    if (validationMessage) {
      setFailureToastMessage(validationMessage);
      setErrorMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setLocationAction('save');
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        for (const locationId of removedLocationIds) {
          await humanResourcesApi.deleteAttendanceControlLocation(locationId);
        }

        for (const location of updatedDrafts) {
          await humanResourcesApi.updateAttendanceControlLocation(location.persistedId!, {
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            contract_start_date: location.contractStartDate,
            contract_end_date: location.contractEndDate,
            name: location.nombre,
            latitude: location.latitud,
            longitude: location.longitud,
            radius_meters: location.radio,
            required_hours_per_day: location.requiredHoursPerDay,
            required_start_time: toBackendTime(location.requiredStartTime),
            required_end_time: toBackendTime(location.requiredEndTime),
            status: location.status,
          });
        }

        for (const location of newDrafts) {
          await humanResourcesApi.createAttendanceControlLocation({
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            contract_start_date: location.contractStartDate,
            contract_end_date: location.contractEndDate,
            name: location.nombre,
            latitude: location.latitud,
            longitude: location.longitud,
            radius_meters: location.radio,
            required_hours_per_day: location.requiredHoursPerDay,
            required_start_time: toBackendTime(location.requiredStartTime),
            required_end_time: toBackendTime(location.requiredEndTime),
            status: location.status,
          });
        }

        await Promise.resolve(onReload?.());
      })(), LOCATION_MODAL_MINIMUM_LOADING_MS);
      onSaved?.();
      onClose();
    } catch (error) {
      const saveMessage = error instanceof Error ? error.message : copy.errors.saveFailed;
      setFailureToastMessage(saveMessage);
      setErrorMessage(saveMessage);
    } finally {
      setLocationAction(null);
      setIsSaving(false);
    }
  };

  const handleCargar = async () => {
    setIsSaving(true);
    setLocationAction('load');
    setErrorMessage('');
    await waitForNextPaint();

    try {
      await runWithMinimumDuration(
        Promise.resolve(onReload?.()),
        LOCATION_MODAL_MINIMUM_LOADING_MS,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errors.loadFailed);
    } finally {
      setLocationAction(null);
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage(copy.errors.geolocationUnsupported);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude.toFixed(6));
        setLongitud(position.coords.longitude.toFixed(6));
        if (position.coords.altitude !== null) {
          setAltitud(position.coords.altitude.toFixed(2));
        }
        setErrorMessage('');
      },
      (error) => {
        let nextMessage = copy.errors.currentLocationFailed;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            nextMessage = copy.errors.locationPermissionDenied;
            break;
          case error.POSITION_UNAVAILABLE:
            nextMessage = copy.errors.locationUnavailable;
            break;
          case error.TIMEOUT:
            nextMessage = copy.errors.locationTimeout;
            break;
          default:
            break;
        }
        setErrorMessage(nextMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  };

  return {
    clearFeedback,
    errorMessage,
    extractCoordinates,
    failureToastMessage,
    getCurrentLocation,
    handleCargar,
    handleGuardar,
    isExtractingCoordinates,
    isSaving,
    loadingOverlayCopy,
    locationAction,
    setErrorMessage,
    setFailureToastMessage,
    setSuccessToastMessage,
    successToastMessage,
  };
}
