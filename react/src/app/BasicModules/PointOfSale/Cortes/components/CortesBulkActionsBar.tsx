import { Printer, X } from 'lucide-react';

interface CortesBulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPrintSelected: () => void;
}

export function CortesBulkActionsBar({
  selectedCount,
  onClearSelection,
  onPrintSelected,
}: CortesBulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 px-4 py-3 shadow-sm dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/15">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#FF6B5E]/30 bg-white px-3 py-1 text-sm font-medium text-[#D94E43] dark:bg-slate-900 dark:text-[#FFB3AA]">
            {selectedCount} corte(s) seleccionados
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Acciones de auditoria disponibles para esta seleccion.
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrintSelected}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-white px-4 text-sm font-medium text-[#D94E43] transition hover:bg-[#FF6B5E]/10 dark:border-[#FF6B5E]/35 dark:bg-slate-900 dark:text-[#FFB3AA] dark:hover:bg-[#FF6B5E]/15"
          >
            <Printer className="h-4 w-4" />
            Imprimir seleccion
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>
    </section>
  );
}
