import { Link2, LocateFixed } from 'lucide-react';
import { useState } from 'react';
import { configCenterApi } from '../../../../api/configCenter';
import { Button } from '../../../../components/ui/button';
import { inputClassName } from '../constants';
import type { LocationCoordinateFormValues } from '../types';

interface LocationCoordinateFieldsProps {
  values: LocationCoordinateFormValues;
  onChange: (updates: Partial<LocationCoordinateFormValues>) => void;
  disabled?: boolean;
}

const coordinateInputClassName = `${inputClassName} font-mono`;

export function LocationCoordinateFields({
  values,
  onChange,
  disabled = false,
}: LocationCoordinateFieldsProps) {
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const showStatus = (message: string, tone: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const handleExtractCoordinates = async () => {
    if (!values.googleMapsUrl.trim()) {
      showStatus('Paste a Google Maps link first.', 'error');
      return;
    }

    setIsExtracting(true);
    setStatusMessage('');

    try {
      const response = await configCenterApi.extractLocationCoordinates({
        map_url: values.googleMapsUrl.trim(),
      });
      onChange({
        latitude: String(response.latitude),
        longitude: String(response.longitude),
        radiusMeters: values.radiusMeters || '100',
        coordinateSource: 'google_maps_link',
        googleMapsUrl: response.resolved_url || values.googleMapsUrl.trim(),
      });
      showStatus('Coordinates extracted.', 'success');
    } catch {
      showStatus('Could not extract coordinates from that link.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showStatus('Current location is not available in this browser.', 'error');
      return;
    }

    setIsLocating(true);
    setStatusMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
          radiusMeters: values.radiusMeters || '100',
          coordinateSource: 'current_location',
        });
        showStatus('Current location captured.', 'success');
        setIsLocating(false);
      },
      () => {
        showStatus('Could not read the current location.', 'error');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  const setManualCoordinate = (field: 'latitude' | 'longitude', value: string) => {
    onChange({
      [field]: value,
      coordinateSource: value.trim() ? 'manual' : values.coordinateSource,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Google Maps link
          </label>
          <input
            type="text"
            value={values.googleMapsUrl}
            onChange={(event) => onChange({ googleMapsUrl: event.target.value })}
            placeholder="Paste Google Maps link"
            className={inputClassName}
            disabled={disabled || isExtracting}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExtractCoordinates()}
            disabled={disabled || isExtracting || isLocating}
          >
            <Link2 className="h-4 w-4" />
            {isExtracting ? 'Extracting...' : 'Extract'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleUseCurrentLocation()}
            disabled={disabled || isExtracting || isLocating}
          >
            <LocateFixed className="h-4 w-4" />
            {isLocating ? 'Locating...' : 'Here'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Latitude
          </label>
          <input
            type="number"
            value={values.latitude}
            onChange={(event) => setManualCoordinate('latitude', event.target.value)}
            placeholder="0.0000000"
            min="-90"
            max="90"
            step="0.0000001"
            className={coordinateInputClassName}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Longitude
          </label>
          <input
            type="number"
            value={values.longitude}
            onChange={(event) => setManualCoordinate('longitude', event.target.value)}
            placeholder="0.0000000"
            min="-180"
            max="180"
            step="0.0000001"
            className={coordinateInputClassName}
            disabled={disabled}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Radius meters
          </label>
          <input
            type="number"
            value={values.radiusMeters}
            onChange={(event) => onChange({ radiusMeters: event.target.value })}
            placeholder="100"
            min="1"
            step="1"
            className={coordinateInputClassName}
            disabled={disabled}
          />
        </div>
      </div>

      {statusMessage ? (
        <p
          className={`text-xs ${
            statusTone === 'success'
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-red-700 dark:text-red-300'
          }`}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
