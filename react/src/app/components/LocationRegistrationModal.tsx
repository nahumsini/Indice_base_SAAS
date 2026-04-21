import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { X, MapPin } from 'lucide-react';
import type { AttendanceControlLocation } from '../api/humanResources';
import { humanResourcesApi } from '../api/humanResources';

interface DraftLocation {
  id: string;
  persistedId?: number;
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
  nombre: location.name,
  latitud: location.latitude,
  longitud: location.longitude,
  radio: location.radius_meters,
});

export function LocationRegistrationModal({
  isOpen,
  onClose,
  locations,
  onReload,
}: LocationRegistrationModalProps) {
  const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
  const [removedLocationIds, setRemovedLocationIds] = useState<number[]>([]);
  const [nombre, setNombre] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [enlaceGoogleMaps, setEnlaceGoogleMaps] = useState('');
  const [altitud, setAltitud] = useState('');
  const [radio, setRadio] = useState('80');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftLocations(locations.map(toDraftLocation));
    setRemovedLocationIds([]);
    setNombre('');
    setLatitud('');
    setLongitud('');
    setEnlaceGoogleMaps('');
    setAltitud('');
    setRadio('80');
    setErrorMessage('');
  }, [isOpen, locations]);

  const activeLocationsCount = useMemo(
    () => draftLocations.length,
    [draftLocations],
  );

  const hasChanges = useMemo(() => {
    const persistedIds = new Set(locations.map((location) => location.id));
    const hasNewDrafts = draftLocations.some((location) => !location.persistedId || !persistedIds.has(location.persistedId));
    return hasNewDrafts || removedLocationIds.length > 0;
  }, [draftLocations, locations, removedLocationIds.length]);

  if (!isOpen) return null;

  const extractCoordinates = () => {
    if (!enlaceGoogleMaps.trim()) {
      return;
    }

    let lat = '';
    let lng = '';

    const atMatch = enlaceGoogleMaps.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = atMatch[1];
      lng = atMatch[2];
    }

    const qMatch = enlaceGoogleMaps.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch && !lat) {
      lat = qMatch[1];
      lng = qMatch[2];
    }

    if (!lat || !lng) {
      setErrorMessage('No se pudieron extraer coordenadas del enlace proporcionado.');
      return;
    }

    setLatitud(lat);
    setLongitud(lng);
    setErrorMessage('');
  };

  const handleAgregar = () => {
    const parsedLat = Number(latitud);
    const parsedLng = Number(longitud);
    const parsedRadio = Number(radio);

    if (!nombre.trim() || Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || Number.isNaN(parsedRadio) || parsedRadio <= 0) {
      setErrorMessage('Completa nombre, latitud, longitud y un radio válido.');
      return;
    }

    setDraftLocations((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        nombre: nombre.trim(),
        latitud: parsedLat,
        longitud: parsedLng,
        radio: parsedRadio,
        enlaceGoogleMaps: enlaceGoogleMaps.trim() || undefined,
        altitud: altitud.trim() || undefined,
      },
    ]);

    setNombre('');
    setLatitud('');
    setLongitud('');
    setEnlaceGoogleMaps('');
    setAltitud('');
    setRadio('80');
    setErrorMessage('');
  };

  const handleQuitar = (location: DraftLocation) => {
    setDraftLocations((current) => current.filter((item) => item.id !== location.id));
    if (location.persistedId) {
      setRemovedLocationIds((current) => Array.from(new Set([...current, location.persistedId!])));
    }
  };

  const handleGuardar = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      for (const locationId of removedLocationIds) {
        await humanResourcesApi.deleteAttendanceControlLocation(locationId);
      }

      const newDrafts = draftLocations.filter((location) => !location.persistedId);
      for (const location of newDrafts) {
        await humanResourcesApi.createAttendanceControlLocation({
          name: location.nombre,
          latitude: location.latitud,
          longitude: location.longitud,
          radius_meters: location.radio,
          status: 'active',
        });
      }

      await Promise.resolve(onReload?.());
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron guardar las ubicaciones.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCargar = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await Promise.resolve(onReload?.());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar las ubicaciones.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Tu navegador no soporta geolocalización.');
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
        let nextMessage = 'No se pudo obtener la ubicación.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            nextMessage = 'Permiso de ubicación denegado. Habilita el acceso a ubicación en tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            nextMessage = 'La información de ubicación no está disponible.';
            break;
          case error.TIMEOUT:
            nextMessage = 'Se agotó el tiempo para obtener la ubicación.';
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

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
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

          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Office"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
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
              <Button onClick={extractCoordinates} variant="outline" type="button">
                Extract
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Altitude (optional)</label>
                <input
                  type="text"
                  value={altitud}
                  onChange={(event) => setAltitud(event.target.value)}
                  placeholder="m.s.n.m"
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

            <div className="flex items-center gap-2">
              <Button onClick={getCurrentLocation} type="button" variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" />
                Here
              </Button>
              <Button onClick={handleAgregar} type="button" className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                + Add
              </Button>
            </div>
          </div>

          {draftLocations.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
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
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{location.nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.latitud}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.longitud}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.radio} m</td>
                      <td className="px-4 py-3">
                        <Button
                          onClick={() => handleQuitar(location)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </Button>
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
              disabled={!hasChanges || isSaving}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
