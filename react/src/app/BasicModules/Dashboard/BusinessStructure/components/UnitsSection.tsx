import { Building2, Trash2 } from 'lucide-react';
import type { Negocio, Unidad } from '../types';

interface UnitsCopy {
  actions: {
    addUnit: string;
    configure: string;
    configureGroup: string;
    createUnit: string;
  };
  units: {
    title: string;
    subtitle: string;
    description: string;
    context: string;
    groupLabel: string;
    mainUnit: string;
    helper: string;
    tip: string;
    empty: string;
    emptyHelper: string;
    groupContext: string;
    tipAction: string;
    addBusiness: string;
    addUnit: string;
    configureUnit: string;
    configureBusiness: string;
    businessCountSingular: string;
    businessCountPlural: string;
  };
}

interface UnitsSectionProps {
  unidades: Unidad[];
  structure: UnitsCopy;
  onEditUnidad: (unidad: Unidad) => void;
  onDeleteUnidad: (unidadId: string) => void;
  onEditNegocio: (negocio: Negocio, unidadId: string) => void;
  onDeleteNegocio: (unidadId: string, negocioId: string) => void;
  onCreateNegocio: (unidadId: string) => void;
  onCreateUnidad: () => void;
  disabled?: boolean;
}

export function UnitsSection({
  unidades,
  structure,
  onEditUnidad,
  onDeleteUnidad,
  onEditNegocio,
  onDeleteNegocio,
  onCreateNegocio,
  onCreateUnidad,
  disabled = false,
}: UnitsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {structure.units.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {structure.units.subtitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {structure.units.context}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {structure.units.helper}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {structure.units.tip}
            </p>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-500">
        {structure.units.groupContext}
      </p>

      <div className="space-y-4 mb-4">
        {unidades.map((unidad) => {
          const hasBusinesses = unidad.negocios.length > 0;

          return (
            <div
              key={unidad.id}
              className="rounded-lg border-2 border-gray-200 p-4 transition-all dark:border-gray-700"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {unidad.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {hasBusinesses
                        ? `${unidad.negocios.length} ${
                            unidad.negocios.length === 1
                              ? structure.units.businessCountSingular
                              : structure.units.businessCountPlural
                          }`
                        : structure.units.empty}
                    </p>
                    {!hasBusinesses ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {structure.units.emptyHelper}
                      </p>
                    ) : null}
                    {unidad.latitude !== undefined && unidad.longitude !== undefined ? (
                      <p className="mt-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                        {unidad.latitude}, {unidad.longitude}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => onEditUnidad(unidad)}
                    disabled={disabled}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {structure.actions.configureGroup}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteUnidad(unidad.id)}
                    disabled={disabled}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {hasBusinesses && (
                <div className="mb-3 space-y-2 sm:ml-8">
                  {unidad.negocios.map((negocio) => (
                    <div
                      key={negocio.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <span className="text-sm">🏪</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {negocio.name}
                        </span>
                        {negocio.latitude !== undefined && negocio.longitude !== undefined ? (
                          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                            {negocio.latitude}, {negocio.longitude}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditNegocio(negocio, unidad.id)}
                          disabled={disabled}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {structure.actions.configure}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteNegocio(unidad.id, negocio.id)}
                          disabled={disabled}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => onCreateNegocio(unidad.id)}
                disabled={disabled}
                className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-8 sm:w-auto"
              >
                {structure.actions.addUnit}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCreateUnidad}
        disabled={disabled}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {structure.actions.createUnit}
      </button>
    </div>
  );
}
