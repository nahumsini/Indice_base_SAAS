import { MapPin } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type { ContractSiteCopy } from '../../../types/contractSiteTypes';

interface ContractSiteLocationStepProps {
  altitud: string;
  copy: ContractSiteCopy;
  enlaceGoogleMaps: string;
  hasValidLocationInformation: boolean;
  isExtractingCoordinates: boolean;
  latitud: string;
  longitud: string;
  parsedRadiusForForm: number;
  radio: string;
  showAdvancedLocationFields: boolean;
  onAdvancedFieldsToggle: () => void;
  onAltitudeChange: (value: string) => void;
  onExtractCoordinates: () => void;
  onGetCurrentLocation: () => void;
  onGoogleMapsLinkChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onRadiusChange: (value: string) => void;
}

export function ContractSiteLocationStep({
  altitud,
  copy,
  enlaceGoogleMaps,
  hasValidLocationInformation,
  isExtractingCoordinates,
  latitud,
  longitud,
  parsedRadiusForForm,
  radio,
  showAdvancedLocationFields,
  onAdvancedFieldsToggle,
  onAltitudeChange,
  onExtractCoordinates,
  onGetCurrentLocation,
  onGoogleMapsLinkChange,
  onLatitudeChange,
  onLongitudeChange,
  onRadiusChange,
}: ContractSiteLocationStepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
        <div>
          <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">{copy.location.title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {copy.location.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.location.googleMapsLink}</label>
          <input
            type="text"
            value={enlaceGoogleMaps}
            onChange={(event) => onGoogleMapsLinkChange(event.target.value)}
            placeholder={copy.location.googleMapsPlaceholder}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {copy.location.googleMapsHint}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={onExtractCoordinates} variant="outline" type="button" disabled={isExtractingCoordinates}>
            {isExtractingCoordinates ? copy.location.extracting : copy.location.extract}
          </Button>
          <Button onClick={onGetCurrentLocation} type="button" variant="outline" className="gap-2">
            <MapPin className="h-4 w-4" />
            {copy.location.useCurrentLocation}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.location.radiusLabel}</label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {copy.location.radiusHint}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={radio}
              onChange={(event) => onRadiusChange(event.target.value)}
              min="1"
              className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">{copy.metersShort}</span>
          </div>
        </div>
        <input
          type="range"
          min="20"
          max="500"
          step="10"
          value={Number.isFinite(parsedRadiusForForm) ? Math.min(Math.max(parsedRadiusForForm, 20), 500) : 80}
          onChange={(event) => onRadiusChange(event.target.value)}
          className="mt-4 w-full accent-[#59C3A5]"
        />
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${
        hasValidLocationInformation
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300'
      }`}>
        {hasValidLocationInformation
          ? copy.location.ready(latitud, longitud, radio)
          : copy.location.missing}
      </div>

      <button
        type="button"
        onClick={onAdvancedFieldsToggle}
        className="text-sm font-semibold text-[#59C3A5] hover:underline dark:text-blue-300"
      >
        {showAdvancedLocationFields ? copy.location.hideAdvanced : copy.location.showAdvanced}
      </button>

      {showAdvancedLocationFields ? (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.location.latitude}</label>
            <input
              type="text"
              value={latitud}
              onChange={(event) => onLatitudeChange(event.target.value)}
              placeholder="21.1619"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.location.longitude}</label>
            <input
              type="text"
              value={longitud}
              onChange={(event) => onLongitudeChange(event.target.value)}
              placeholder="-86.8515"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">{copy.location.altitudeOptional}</label>
            <input
              type="text"
              value={altitud}
              onChange={(event) => onAltitudeChange(event.target.value)}
              placeholder={copy.location.altitudePlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
