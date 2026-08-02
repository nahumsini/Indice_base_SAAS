import { CheckCircle2, MapPin } from 'lucide-react';
import type { AttendanceControlLocation } from '../../../../../../api/humanResources';
import type { ControlTranslations } from '../../../translations';
import type { ScheduleLocationRule } from '../../../types/scheduleTypes';
import { formatLocationOption } from '../../../utils/scheduleFormatters';

interface ScheduleRulesStepProps {
  copy: ControlTranslations;
  employeeBusinessLocationSummary: string;
  exactLocationOptions: AttendanceControlLocation[];
  exactLocationWarning: string;
  isOpenSchedule: boolean;
  locationRule: ScheduleLocationRule;
  locationScopeFallbackMessage: string;
  locationScopeSummary: string;
  selectedEmployeeBusinessWarning: string;
  toleranciaIngreso: number;
  ubicacionSeleccionada: string;
  onLocationRuleChange: (value: string) => void;
  onToleranciaIngresoChange: (value: number) => void;
  onUbicacionSeleccionadaChange: (value: string) => void;
}

export function ScheduleRulesStep({
  copy,
  employeeBusinessLocationSummary,
  exactLocationOptions,
  exactLocationWarning,
  isOpenSchedule,
  locationRule,
  locationScopeFallbackMessage,
  locationScopeSummary,
  selectedEmployeeBusinessWarning,
  toleranciaIngreso,
  ubicacionSeleccionada,
  onLocationRuleChange,
  onToleranciaIngresoChange,
  onUbicacionSeleccionadaChange,
}: ScheduleRulesStepProps) {
  return (
    <section className="space-y-4">
      {!isOpenSchedule ? (
        <AttendanceRulesCard
          copy={copy}
          toleranciaIngreso={toleranciaIngreso}
          onToleranciaIngresoChange={onToleranciaIngresoChange}
        />
      ) : (
        <OpenScheduleRulesCard copy={copy} />
      )}
      <LocationRuleSelector
        copy={copy}
        employeeBusinessLocationSummary={employeeBusinessLocationSummary}
        exactLocationOptions={exactLocationOptions}
        exactLocationWarning={exactLocationWarning}
        locationRule={locationRule}
        locationScopeFallbackMessage={locationScopeFallbackMessage}
        locationScopeSummary={locationScopeSummary}
        selectedEmployeeBusinessWarning={selectedEmployeeBusinessWarning}
        ubicacionSeleccionada={ubicacionSeleccionada}
        onLocationRuleChange={onLocationRuleChange}
        onUbicacionSeleccionadaChange={onUbicacionSeleccionadaChange}
      />
    </section>
  );
}

function AttendanceRulesCard({
  copy,
  toleranciaIngreso,
  onToleranciaIngresoChange,
}: {
  copy: ControlTranslations;
  toleranciaIngreso: number;
  onToleranciaIngresoChange: (value: number) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.schedule.attendance.eyebrow}</p>
        <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.schedule.attendance.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.attendance.description}
        </p>
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/30">
        <label className="mb-2 block text-sm font-medium text-slate-900 dark:text-white">{copy.schedule.attendance.markLateAfter}</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="60"
            value={toleranciaIngreso}
            onChange={(event) => onToleranciaIngresoChange(Number(event.target.value) || 0)}
            className="h-10 w-24 rounded-md border border-slate-200 bg-white px-3 text-center text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">{copy.schedule.attendance.minutes}</span>
        </div>
        <p className="mt-2 text-xs text-orange-700 dark:text-orange-300">
          {copy.schedule.attendance.helper}
        </p>
      </div>
    </section>
  );
}

function OpenScheduleRulesCard({ copy }: { copy: ControlTranslations }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
        <p className="font-medium">{copy.schedule.attendance.openTitle}</p>
        <p className="mt-1 text-blue-800/80 dark:text-blue-100/75">
          {copy.schedule.attendance.openDescription}
        </p>
      </div>
    </section>
  );
}

function LocationRuleSelector({
  copy,
  employeeBusinessLocationSummary,
  exactLocationOptions,
  exactLocationWarning,
  locationRule,
  locationScopeFallbackMessage,
  locationScopeSummary,
  selectedEmployeeBusinessWarning,
  ubicacionSeleccionada,
  onLocationRuleChange,
  onUbicacionSeleccionadaChange,
}: {
  copy: ControlTranslations;
  employeeBusinessLocationSummary: string;
  exactLocationOptions: AttendanceControlLocation[];
  exactLocationWarning: string;
  locationRule: ScheduleLocationRule;
  locationScopeFallbackMessage: string;
  locationScopeSummary: string;
  selectedEmployeeBusinessWarning: string;
  ubicacionSeleccionada: string;
  onLocationRuleChange: (value: string) => void;
  onUbicacionSeleccionadaChange: (value: string) => void;
}) {
  const locationOptions: Array<{
    value: ScheduleLocationRule;
    title: string;
    description: string;
  }> = [
    {
      value: 'business',
      title: copy.schedule.location.options.business.title,
      description: copy.schedule.location.options.business.description,
    },
    {
      value: 'temporary',
      title: copy.schedule.location.options.temporary.title,
      description: copy.schedule.location.options.temporary.description,
    },
    {
      value: 'open',
      title: copy.schedule.location.options.open.title,
      description: copy.schedule.location.options.open.description,
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{copy.schedule.location.eyebrow}</p>
        <h3 className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-950 dark:text-white">
          <MapPin className="h-4 w-4 text-[#59C3A5] dark:text-[#8FE0CA]" />
          {copy.schedule.location.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {copy.schedule.location.description}
        </p>
      </div>

      <div className="grid gap-3">
        {locationOptions.map((option) => {
          const isSelected = locationRule === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onLocationRuleChange(option.value)}
              className={`rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#59C3A5] bg-blue-50 ring-2 ring-[#59C3A5]/10 dark:border-[#8FE0CA] dark:bg-blue-950/20'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isSelected ? 'border-[#59C3A5] bg-[#59C3A5] text-slate-950' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
                }`}
                >
                  {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-950 dark:text-white">{option.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {locationRule === 'temporary' ? (
        <div className="mt-4">
          <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {copy.schedule.location.temporaryLabel}
          </label>
          <select
            value={ubicacionSeleccionada}
            onChange={(event) => onUbicacionSeleccionadaChange(event.target.value)}
            disabled={exactLocationOptions.length === 0}
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#59C3A5] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">{exactLocationOptions.length === 0 ? copy.schedule.location.noActiveLocations : copy.schedule.location.selectLocation}</option>
            {exactLocationOptions.map((location) => (
              <option key={location.id} value={location.id}>{formatLocationOption(location)}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{locationScopeSummary}</p>
          {locationScopeFallbackMessage ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{locationScopeFallbackMessage}</p>
          ) : null}
          {exactLocationWarning ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{exactLocationWarning}</p>
          ) : null}
        </div>
      ) : null}

      {locationRule === 'business' ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p>{employeeBusinessLocationSummary}</p>
            {selectedEmployeeBusinessWarning ? (
              <p className="mt-1 text-amber-700 dark:text-amber-300">{selectedEmployeeBusinessWarning}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {locationRule === 'open' ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
          {copy.schedule.location.openNoExactLocation}
        </div>
      ) : null}
    </section>
  );
}
