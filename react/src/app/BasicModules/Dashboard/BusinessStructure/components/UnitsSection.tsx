import { Trash2 } from 'lucide-react';
import type { Negocio, Unidad } from '../types';

interface UnitsCopy {
  units: {
    title: string;
    description: string;
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
              {structure.units.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-4">
        {unidades.map((unidad) => (
          <div
            key={unidad.id}
            className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all"
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{unidad.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {unidad.negocios.length}{' '}
                    {unidad.negocios.length === 1
                      ? structure.units.businessCountSingular
                      : structure.units.businessCountPlural}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => onEditUnidad(unidad)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {structure.units.configureUnit}
                </button>
                {unidad.id !== '1' && (
                  <button
                    type="button"
                    onClick={() => onDeleteUnidad(unidad.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {unidad.negocios.length > 0 && (
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
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditNegocio(negocio, unidad.id)}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        {structure.units.configureBusiness}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNegocio(unidad.id, negocio.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              className="w-full rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700 sm:ml-8 sm:w-auto"
            >
              {structure.units.addBusiness}
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onCreateUnidad}
        className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {structure.units.addUnit}
      </button>
    </div>
  );
}
