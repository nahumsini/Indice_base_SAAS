import { Columns3, Download, RefreshCw } from 'lucide-react';

interface CortesHeaderProps {
  loading: boolean;
  onColumns: () => void;
  onExport: () => void;
  onRefresh: () => void;
}

export function CortesHeader({
  loading,
  onColumns,
  onExport,
  onRefresh,
}: CortesHeaderProps) {
  return (
    <section className="rounded-[20px] border border-[#FF6B5E]/20 bg-[#FF6B5E]/10 p-6 shadow-sm dark:border-[#FF6B5E]/25 dark:bg-[#FF6B5E]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-1 text-3xl leading-none">💰</span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">Cortes de caja</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              Administra cierres por periodo, almacen, caja y responsable para consultar ventas, efectivo esperado y diferencias.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onColumns}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#FF6B5E]/20 bg-white px-4 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-[#FF6B5E]/5 dark:border-[#FF6B5E]/25 dark:bg-slate-900 dark:text-[#FFB0AA]"
          >
            <Columns3 className="h-4 w-4" />
            Columnas
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#E85B50]"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>
    </section>
  );
}
