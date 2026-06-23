import { RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cortesColumnOptions, defaultCortesColumns, type CortesColumnId } from '../utils/cortesColumns';

interface CortesColumnsModalProps {
  open: boolean;
  visibleColumns: CortesColumnId[];
  onClose: () => void;
  onVisibleColumnsChange: (columns: CortesColumnId[]) => void;
}

export function CortesColumnsModal({
  open,
  visibleColumns,
  onClose,
  onVisibleColumnsChange,
}: CortesColumnsModalProps) {
  const [search, setSearch] = useState('');
  const [draftColumns, setDraftColumns] = useState<CortesColumnId[]>(visibleColumns);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term === ''
      ? cortesColumnOptions
      : cortesColumnOptions.filter((option) => option.label.toLowerCase().includes(term));
  }, [search]);

  if (!open) {
    return null;
  }

  const toggleColumn = (columnId: CortesColumnId) => {
    setDraftColumns((current) => (
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    ));
  };

  const applyColumns = () => {
    onVisibleColumnsChange(draftColumns.length > 0 ? draftColumns : defaultCortesColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 bg-[#FF6B5E] px-6 py-5 text-white">
          <div>
            <h3 className="text-2xl font-black">Configurar columnas</h3>
            <p className="mt-1 text-sm font-semibold text-white/85">
              Selecciona la informacion visible en la tabla de cortes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setDraftColumns(cortesColumnOptions.map((option) => option.id))}
              className="h-10 rounded-xl border border-slate-200 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setDraftColumns([])}
              className="h-10 rounded-xl border border-slate-200 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Ninguna
            </button>
            <button
              type="button"
              onClick={() => setDraftColumns(defaultCortesColumns)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-black text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </button>
          </div>

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar columna"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <div className="space-y-2">
            {filteredOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-[#FF6B5E]/10"
              >
                <input
                  type="checkbox"
                  checked={draftColumns.includes(option.id)}
                  onChange={() => toggleColumn(option.id)}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                />
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-[#FF6B5E] px-6 py-4 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-white/35 px-5 text-sm font-black text-white transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={applyColumns}
            className="h-11 rounded-xl bg-white px-5 text-sm font-black text-[#B63B32] shadow-sm transition hover:bg-slate-50"
          >
            Aplicar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
