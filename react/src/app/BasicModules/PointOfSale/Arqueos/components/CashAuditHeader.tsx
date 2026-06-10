import { Download, RefreshCw, ShieldCheck } from 'lucide-react';

interface CashAuditHeaderProps {
  onRefresh: () => void;
  onExport: () => void;
}

export function CashAuditHeader({ onRefresh, onExport }: CashAuditHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-gray-950 px-2.5 py-1 text-xs font-semibold uppercase text-white dark:bg-white dark:text-gray-950">
          <ShieldCheck className="h-3.5 w-3.5" />
          Control supervisor
        </div>
        <h2 className="text-2xl font-black text-gray-950 dark:text-white">Arqueos de caja</h2>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          Revision operativa de cierres por caja, responsable, sucursal y periodo.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
        <button
          onClick={onExport}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-gray-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
      </div>
    </div>
  );
}
