import { Building2, Trash2 } from 'lucide-react';
import type { EstructuraType, Negocio, Unidad } from '../types';

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
    mainUnit: string;
    empty: string;
    emptyHelper: string;
    groupContext: string;
    addBusiness: string;
    businessCountSingular: string;
    businessCountPlural: string;
  };
}

interface UnitsSectionProps {
  estructuraType: EstructuraType;
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
  estructuraType,
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
  const corporateOffice = unidades.find((unidad) => unidad.isCorporateOffice);
  const operationalUnits = unidades.filter((unidad) => !unidad.isCorporateOffice);
  const isSimple = estructuraType === 'simple';

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{structure.units.title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{structure.units.subtitle}</p>
        </div>
        {!isSimple ? (
          <button type="button" onClick={onCreateUnidad} disabled={disabled} className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            + {structure.actions.createUnit}
          </button>
        ) : null}
      </div>

      {corporateOffice ? (
        <div className="mb-4 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-slate-900">🏢</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-medium text-gray-950 dark:text-white">{corporateOffice.name}</h4>
                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white">{structure.units.mainUnit}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                {isSimple ? structure.units.description : structure.units.groupContext}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!isSimple && operationalUnits.length > 0 ? (
        <p className="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">{structure.units.context}</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {!isSimple && operationalUnits.map((unidad) => {
          const hasBusinesses = unidad.negocios.length > 0;
          return (
            <article key={unidad.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Building2 className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                  <div className="min-w-0">
                    <h4 className="truncate font-medium text-gray-900 dark:text-white">{unidad.name}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {hasBusinesses
                        ? `${unidad.negocios.length} ${unidad.negocios.length === 1 ? structure.units.businessCountSingular : structure.units.businessCountPlural}`
                        : structure.units.empty}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => onEditUnidad(unidad)} disabled={disabled} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60">{structure.actions.configureGroup}</button>
                  <button type="button" onClick={() => onDeleteUnidad(unidad.id)} disabled={disabled} className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-900/20" aria-label={structure.actions.configure}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="space-y-2">
                {unidad.negocios.map((negocio) => (
                  <div key={negocio.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
                    <span className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white">🏪 {negocio.name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => onEditNegocio(negocio, unidad.id)} disabled={disabled} className="rounded-md px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:text-blue-300">{structure.actions.configure}</button>
                      <button type="button" onClick={() => onDeleteNegocio(unidad.id, negocio.id)} disabled={disabled} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-900/20" aria-label={structure.actions.configure}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
                {!hasBusinesses ? <p className="px-1 text-xs text-gray-500">{structure.units.emptyHelper}</p> : null}
              </div>

              <button type="button" onClick={() => onCreateNegocio(unidad.id)} disabled={disabled} className="mt-3 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-700 dark:text-blue-300">
                {structure.units.addBusiness}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
