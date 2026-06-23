import { RotateCcw, Search } from 'lucide-react';
import type { CortesDifferenceFilter, CortesFilters } from '../utils/cortesUtils';

interface CortesFiltersBarProps {
  filters: CortesFilters;
  onChange: <Key extends keyof CortesFilters>(key: Key, value: CortesFilters[Key]) => void;
  onReset: () => void;
}

export function CortesFiltersBar({
  filters,
  onChange,
  onReset,
}: CortesFiltersBarProps) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">Filtros</h3>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Buscar</span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="Corte, turno, caja, almacen o usuario"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </span>
        </label>

        <DateInput label="Desde" value={filters.dateFrom} onChange={(value) => onChange('dateFrom', value)} />
        <DateInput label="Hasta" value={filters.dateTo} onChange={(value) => onChange('dateTo', value)} />
        <TextInput label="Almacén" value={filters.warehouseId} onChange={(value) => onChange('warehouseId', value)} />
        <TextInput label="Caja" value={filters.cashRegisterId} onChange={(value) => onChange('cashRegisterId', value)} />
        <TextInput label="Cajero" value={filters.userId} onChange={(value) => onChange('userId', value)} />

        <button
          type="button"
          onClick={onReset}
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          Limpiar
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="min-w-0">
          <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Diferencia</span>
          <select
            value={filters.difference}
            onChange={(event) => onChange('difference', event.target.value as CortesDifferenceFilter)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="balanced">Cuadrados</option>
            <option value="withDifference">Con diferencia</option>
            <option value="short">Faltantes</option>
            <option value="over">Sobrantes</option>
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Unidad / negocio</p>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            El almacen y la caja definen el contexto operativo del corte.
          </p>
        </div>
      </div>
    </section>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Todos"
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}
