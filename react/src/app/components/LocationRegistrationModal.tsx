import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { X, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { AttendanceControlLocation } from '../api/humanResources';
import { humanResourcesApi } from '../api/humanResources';
import { FailureToast } from './FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from './LoadingBarOverlay';
import { SuccessToast } from './SuccessToast';
import {
  dashboardApi,
  type BackendBusiness,
  type BackendUnit,
} from '../api/dashboard';

interface DraftLocation {
  id: string;
  persistedId?: number;
  unitId?: number | null;
  unitName?: string;
  businessId?: number | null;
  businessName?: string;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
  enlaceGoogleMaps?: string;
  altitud?: string;
}

interface LocationRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: AttendanceControlLocation[];
  onReload?: () => Promise<void> | void;
}

const toDraftLocation = (location: AttendanceControlLocation): DraftLocation => ({
  id: `persisted-${location.id}`,
  persistedId: location.id,
  unitId: location.unit_id ?? null,
  unitName: location.unit_name ?? undefined,
  businessId: location.business_id ?? null,
  businessName: location.business_name ?? undefined,
  nombre: location.name,
  latitud: location.latitude,
  longitud: location.longitude,
  radio: location.radius_meters,
});

const getBusinessUnitId = (business: BackendBusiness) => business.unitId ?? business.unit_id ?? null;
const LOCATION_MODAL_MINIMUM_LOADING_MS = 2000;

const hasText = (value: string) => value.trim().length > 0;

const hasValidDraftScope = (location: DraftLocation) => (
  typeof location.unitId === 'number'
  && location.unitId > 0
  && typeof location.businessId === 'number'
  && location.businessId > 0
);

const hasValidDraftCoordinates = (location: DraftLocation) => (
  Number.isFinite(location.latitud)
  && Number.isFinite(location.longitud)
  && Number.isFinite(location.radio)
  && location.radio > 0
);

const areDraftLocationsEqual = (left: DraftLocation, right: DraftLocation) => (
  (left.unitId ?? null) === (right.unitId ?? null)
  && (left.businessId ?? null) === (right.businessId ?? null)
  && left.nombre.trim() === right.nombre.trim()
  && left.latitud === right.latitud
  && left.longitud === right.longitud
  && left.radio === right.radio
);

const waitForNextPaint = () => (
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }

    setTimeout(resolve, 0);
  })
);

export function LocationRegistrationModal({
  isOpen,
  onClose,
  locations,
  onReload,
}: LocationRegistrationModalProps) {
  const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
  const [removedLocationIds, setRemovedLocationIds] = useState<number[]>([]);
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [nombre, setNombre] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [enlaceGoogleMaps, setEnlaceGoogleMaps] = useState('');
  const [altitud, setAltitud] = useState('');
  const [radio, setRadio] = useState('80');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingCoordinates, setIsExtractingCoordinates] = useState(false);
  const [isLoadingScopeOptions, setIsLoadingScopeOptions] = useState(false);
  const [locationAction, setLocationAction] = useState<'save' | 'load' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftLocations(locations.map(toDraftLocation));
    setRemovedLocationIds([]);
    setNombre('');
    setSelectedUnitId('');
    setSelectedBusinessId('');
    setLatitud('');
    setLongitud('');
    setEnlaceGoogleMaps('');
    setAltitud('');
    setRadio('80');
    setEditingLocationId(null);
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');
  }, [isOpen, locations]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    setIsLoadingScopeOptions(true);

    Promise.all([
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ])
      .then(([nextUnits, nextBusinesses]) => {
        if (!active) {
          return;
        }
        setUnits(nextUnits);
        setBusinesses(nextBusinesses);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setUnits([]);
        setBusinesses([]);
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load units and businesses.');
      })
      .finally(() => {
        if (active) {
          setIsLoadingScopeOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const activeLocationsCount = useMemo(
    () => draftLocations.length,
    [draftLocations],
  );

  const persistedLocationSnapshot = useMemo(
    () => new Map(locations.map((location) => [location.id, toDraftLocation(location)])),
    [locations],
  );

  const hasPendingFormInput = useMemo(() => (
    Boolean(
      hasText(nombre)
      || hasText(latitud)
      || hasText(longitud)
      || hasText(enlaceGoogleMaps)
      || hasText(altitud)
      || radio.trim() !== '80'
    )
  ), [
    altitud,
    enlaceGoogleMaps,
    latitud,
    longitud,
    nombre,
    radio,
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

  const filteredBusinessOptions = useMemo(() => (
    businesses.filter((business) => {
      if (!selectedUnitId) {
        return true;
      }
      return String(getBusinessUnitId(business) ?? '') === selectedUnitId;
    })
  ), [businesses, selectedUnitId]);

  useEffect(() => {
    if (!selectedBusinessId) {
      return;
    }

    const isStillValid = filteredBusinessOptions.some((business) => String(business.id) === selectedBusinessId);
    if (!isStillValid) {
      setSelectedBusinessId('');
    }
  }, [filteredBusinessOptions, selectedBusinessId]);

  const selectedUnit = useMemo(
    () => units.find((unit) => String(unit.id) === selectedUnitId) ?? null,
    [selectedUnitId, units],
  );

  const selectedBusiness = useMemo(
    () => filteredBusinessOptions.find((business) => String(business.id) === selectedBusinessId) ?? null,
    [filteredBusinessOptions, selectedBusinessId],
  );

  const hasCompleteFormInput = useMemo(() => {
    const parsedLat = Number(latitud);
    const parsedLng = Number(longitud);
    const parsedRadio = Number(radio);

    return Boolean(
      selectedUnit
      && selectedBusiness
      && hasText(nombre)
      && !Number.isNaN(parsedLat)
      && !Number.isNaN(parsedLng)
      && !Number.isNaN(parsedRadio)
      && parsedRadio > 0,
    );
  }, [
    latitud,
    longitud,
    nombre,
    radio,
    selectedBusiness,
    selectedUnit,
  ]);

  const loadingOverlayCopy = isExtractingCoordinates
    ? {
        title: 'Fetching coordinates',
        description: 'We are resolving the map link and fetching the location coordinates.',
      }
    : locationAction === 'load'
      ? {
          title: 'Loading locations',
          description: 'We are refreshing your registered locations now.',
        }
      : {
          title: 'Saving locations',
          description: 'We are saving your registered locations now.',
        };

  if (!isOpen) return null;

  const resetDraftForm = () => {
    setNombre('');
    setSelectedUnitId('');
    setSelectedBusinessId('');
    setLatitud('');
    setLongitud('');
    setEnlaceGoogleMaps('');
    setAltitud('');
    setRadio('80');
    setEditingLocationId(null);
  };

  const scrollToFormStart = () => {
    const moveToFormStart = () => {
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }

      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(moveToFormStart);
      });
      return;
    }

    setTimeout(moveToFormStart, 0);
  };

  const populateDraftForm = (location: DraftLocation) => {
    setNombre(location.nombre);
    setSelectedUnitId(location.unitId ? String(location.unitId) : '');
    setSelectedBusinessId(location.businessId ? String(location.businessId) : '');
    setLatitud(String(location.latitud));
    setLongitud(String(location.longitud));
    setEnlaceGoogleMaps(location.enlaceGoogleMaps ?? '');
    setAltitud(location.altitud ?? '');
    setRadio(String(location.radio));
    setEditingLocationId(location.id);
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');
    scrollToFormStart();
  };

  const buildDraftFromForm = (): { draft: DraftLocation | null; errorMessage: string | null } => {
    const parsedLat = Number(latitud);
    const parsedLng = Number(longitud);
    const parsedRadio = Number(radio);

    if (!selectedUnit || !selectedBusiness) {
      return {
        draft: null,
        errorMessage: 'Select the unit and business before saving this location.',
      };
    }

    if (!hasText(nombre) || Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || Number.isNaN(parsedRadio) || parsedRadio <= 0) {
      return {
        draft: null,
        errorMessage: 'Complete the unit, business, name, latitude, longitude, and a valid radius.',
      };
    }

    const editingLocation = editingLocationId
      ? draftLocations.find((location) => location.id === editingLocationId)
      : null;

    return {
      draft: {
        id: editingLocationId ?? `new-${Date.now()}`,
        persistedId: editingLocation?.persistedId,
        unitId: selectedUnit.id,
        unitName: selectedUnit.name,
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        nombre: nombre.trim(),
        latitud: parsedLat,
        longitud: parsedLng,
        radio: parsedRadio,
        enlaceGoogleMaps: enlaceGoogleMaps.trim() || undefined,
        altitud: altitud.trim() || undefined,
      },
      errorMessage: null,
    };
  };

  const extractCoordinates = async () => {
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');

    if (!enlaceGoogleMaps.trim()) {
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
      setSuccessToastMessage('Coordinates fetched successfully.');
    } catch {
      setFailureToastMessage('Having problems in fetching coordinates.');
      setErrorMessage('Having problems in fetching coordinates.');
    } finally {
      setIsExtractingCoordinates(false);
    }
  };

  const handleAgregar = () => {
    const { draft, errorMessage: formErrorMessage } = buildDraftFromForm();
    if (!draft) {
      setErrorMessage(formErrorMessage ?? 'Complete the form before adding this location.');
      return;
    }

    setDraftLocations((current) => (
      editingLocationId
        ? current.map((location) => (
          location.id === editingLocationId
            ? draft
            : location
        ))
        : [...current, draft]
    ));

    resetDraftForm();
    setErrorMessage('');
  };

  const handleQuitar = (location: DraftLocation) => {
    setDraftLocations((current) => current.filter((item) => item.id !== location.id));
    if (location.persistedId) {
      setRemovedLocationIds((current) => Array.from(new Set([...current, location.persistedId!])));
    }
    if (editingLocationId === location.id) {
      resetDraftForm();
    }
  };

  const handleGuardar = async () => {
    setSuccessToastMessage('');
    setFailureToastMessage('');
    setErrorMessage('');

    let nextDraftLocations = draftLocations;

    if (hasPendingFormInput) {
      const { draft, errorMessage: formErrorMessage } = buildDraftFromForm();
      if (!draft) {
        const pendingFormMessage = formErrorMessage ?? 'Complete the form before saving this location.';
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

    const invalidScopeDraft = nextDraftLocations.find((location) => !hasValidDraftScope(location));
    if (invalidScopeDraft) {
      const scopeMessage = 'Every registered location needs both a business unit and a business before it can be saved.';
      setFailureToastMessage(scopeMessage);
      setErrorMessage(scopeMessage);
      return;
    }

    const invalidDataDraft = nextDraftLocations.find((location) => !hasText(location.nombre) || !hasValidDraftCoordinates(location));
    if (invalidDataDraft) {
      const dataMessage = 'Every registered location needs a name, coordinates, and a valid radius before it can be saved.';
      setFailureToastMessage(dataMessage);
      setErrorMessage(dataMessage);
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

        const updatedDraftsSource = nextDraftLocations.filter((location) => {
          if (!location.persistedId) {
            return false;
          }
          const originalLocation = persistedLocationSnapshot.get(location.persistedId);
          return Boolean(originalLocation) && !areDraftLocationsEqual(location, originalLocation);
        });
        for (const location of updatedDraftsSource) {
          await humanResourcesApi.updateAttendanceControlLocation(location.persistedId!, {
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            name: location.nombre,
            latitude: location.latitud,
            longitude: location.longitud,
            radius_meters: location.radio,
            status: 'active',
          });
        }

        const newDrafts = nextDraftLocations.filter((location) => !location.persistedId);
        for (const location of newDrafts) {
          await humanResourcesApi.createAttendanceControlLocation({
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            name: location.nombre,
            latitude: location.latitud,
            longitude: location.longitud,
            radius_meters: location.radio,
            status: 'active',
          });
        }

        await Promise.resolve(onReload?.());
      })(), LOCATION_MODAL_MINIMUM_LOADING_MS);
      onClose();
    } catch (error) {
      const saveMessage = error instanceof Error ? error.message : 'Could not save locations.';
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
      setErrorMessage(error instanceof Error ? error.message : 'Could not load locations.');
    } finally {
      setLocationAction(null);
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Your browser does not support geolocation.');
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
        let nextMessage = 'Could not get the current location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            nextMessage = 'Location permission was denied. Enable location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            nextMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            nextMessage = 'Timed out while getting the location.';
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

  return (
    <>
      <LoadingBarOverlay
        isVisible={isExtractingCoordinates || locationAction !== null}
        title={loadingOverlayCopy.title}
        description={loadingOverlayCopy.description}
      />
      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center justify-between bg-[#143675] p-6 dark:bg-[#0f2855]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">Register locations</h2>
            </div>
            <button onClick={onClose} className="text-white/80 transition-colors hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div ref={scrollContainerRef} className="flex-1 space-y-6 overflow-y-auto p-6">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Configure your locations so that the attendance chart displays the name instead of the latitude/longitude (for proximity). You can use Here (GPS) or paste a Google Maps link to extract coordinates.
            </p>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Active locations: {activeLocationsCount}</span> ·{' '}
            {hasChanges ? (
              <span className="text-orange-600 dark:text-orange-400">Pending changes</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">No pending changes</span>
            )}
          </div>

          <div ref={formSectionRef} className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Assign Location To Organization</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                This work location will be saved under the selected business.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Business unit *</label>
                  <select
                    value={selectedUnitId}
                    onChange={(event) => setSelectedUnitId(event.target.value)}
                    disabled={isLoadingScopeOptions}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                  >
                    <option value="">{isLoadingScopeOptions ? 'Loading business units...' : 'Select business unit'}</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Business *</label>
                  <select
                    value={selectedBusinessId}
                    onChange={(event) => setSelectedBusinessId(event.target.value)}
                    disabled={isLoadingScopeOptions || !selectedUnitId}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                  >
                    <option value="">
                      {!selectedUnitId
                        ? 'Select a business unit first'
                        : filteredBusinessOptions.length > 0
                          ? 'Select business'
                          : 'No businesses for this unit'}
                    </option>
                    {filteredBusinessOptions.map((business) => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUnit && selectedBusiness ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                  This location will be registered under: {selectedUnit.name} / {selectedBusiness.name}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-3">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="e.g. Main Office"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</label>
                <input
                  type="text"
                  value={latitud}
                  onChange={(event) => setLatitud(event.target.value)}
                  placeholder="21.1619"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</label>
                <input
                  type="text"
                  value={longitud}
                  onChange={(event) => setLongitud(event.target.value)}
                  placeholder="-86.8515"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Radius (m)</label>
                <input
                  type="number"
                  value={radio}
                  onChange={(event) => setRadio(event.target.value)}
                  min="1"
                  placeholder="80"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Google Maps link (optional)</label>
                <input
                  type="text"
                  value={enlaceGoogleMaps}
                  onChange={(event) => setEnlaceGoogleMaps(event.target.value)}
                  placeholder="Paste the Google Maps link here"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <Button onClick={() => void extractCoordinates()} variant="outline" type="button" disabled={isExtractingCoordinates}>
                {isExtractingCoordinates ? 'Extracting...' : 'Extract'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Altitude (optional)</label>
                <input
                  type="text"
                  value={altitud}
                  onChange={(event) => setAltitud(event.target.value)}
                  placeholder="meters above sea level"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={getCurrentLocation} type="button" variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Here
              </Button>
              {editingLocationId ? (
                <Button onClick={resetDraftForm} type="button" variant="outline">
                  Cancel edit
                </Button>
              ) : (
                <Button onClick={handleAgregar} type="button" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                  + Add
                </Button>
              )}
            </div>
          </div>

          {draftLocations.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Unit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Business</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Lat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Lng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Radius</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {draftLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.unitName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.businessName || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{location.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.latitud}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.longitud}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.radio} m</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => populateDraftForm(location)}
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20"
                            aria-label={`Edit ${location.nombre}`}
                            title="Edit location"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleQuitar(location)}
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                            aria-label={`Delete ${location.nombre}`}
                            title="Delete location"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-900 dark:text-yellow-200">
              <span className="font-medium">Tip:</span> in Google Maps, share the place and paste the link here. If the link is a short one, open it first and copy the final URL.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
          <Button onClick={() => void handleCargar()} variant="outline" className="gap-2" disabled={isSaving}>
            Load
          </Button>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="outline" disabled={isSaving}>
              Close
            </Button>
            <Button
              onClick={() => void handleGuardar()}
              className="gap-2 bg-blue-600 text-white hover:bg-blue-700"
              disabled={(!hasChanges && !hasCompleteFormInput) || isSaving}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
