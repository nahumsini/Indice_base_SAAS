import { ArrowDown, ArrowUp, Columns3, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CortesModalFrame } from './CortesModalFrame';
import type { CortesCopy } from '../cortesTranslations';
import { defaultCortesColumns, type CortesColumnId } from '../utils/cortesColumns';

interface CortesColumnsModalProps {
  copy: CortesCopy;
  open: boolean;
  visibleColumns: CortesColumnId[];
  onClose: () => void;
  onVisibleColumnsChange: (columns: CortesColumnId[]) => void;
}

export function CortesColumnsModal({
  copy,
  open,
  visibleColumns,
  onClose,
  onVisibleColumnsChange,
}: CortesColumnsModalProps) {
  const [search, setSearch] = useState('');
  const [draftColumns, setDraftColumns] = useState<CortesColumnId[]>(visibleColumns);
  const columnOptions = useMemo(() => (
    Object.entries(copy.table.columns).map(([id, label]) => ({
      id: id as CortesColumnId,
      label,
    }))
  ), [copy.table.columns]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term === ''
      ? columnOptions
      : columnOptions.filter((option) => option.label.toLowerCase().includes(term));
  }, [columnOptions, search]);

  const toggleColumn = (columnId: CortesColumnId) => {
    setDraftColumns((current) => (
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    ));
  };

  const moveColumn = (columnId: CortesColumnId, direction: 'down' | 'up') => {
    setDraftColumns((current) => {
      const index = current.indexOf(columnId);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [column] = next.splice(index, 1);
      next.splice(targetIndex, 0, column);
      return next;
    });
  };

  const applyColumns = () => {
    onVisibleColumnsChange(draftColumns.length > 0 ? draftColumns : defaultCortesColumns);
    onClose();
  };

  return (
    <CortesModalFrame
      modalType="standard-form"
      closeLabel={copy.columnsModal.closeLabel}
      eyebrow={copy.columnsModal.eyebrow}
      icon={<Columns3 className="h-5 w-5" />}
      onClose={onClose}
      open={open}
      size="md"
      title={copy.columnsModal.title}
      subtitle={copy.columnsModal.subtitle}
      footer={(
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copy.columnsModal.cancel}
          </button>
          <button
            type="button"
            onClick={applyColumns}
            className="h-11 rounded-lg bg-[#222831] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#111827]"
          >
            {copy.columnsModal.apply}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setDraftColumns(columnOptions.map((option) => option.id))}
            className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copy.columnsModal.all}
          </button>
          <button
            type="button"
            onClick={() => setDraftColumns([])}
            className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {copy.columnsModal.none}
          </button>
          <button
            type="button"
            onClick={() => setDraftColumns(defaultCortesColumns)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            {copy.columnsModal.restore}
          </button>
        </div>

        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={copy.columnsModal.searchPlaceholder}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <div className="space-y-2">
          {filteredOptions.map((option) => {
            const selectedIndex = draftColumns.indexOf(option.id);
            const isSelected = selectedIndex >= 0;

            return (
              <div
                key={option.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-[#FF6B5E]/30 hover:bg-[#FF6B5E]/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-[#FF6B5E]/10"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleColumn(option.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                  />
                  <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</span>
                </label>

                {isSelected ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={copy.columnsModal.moveUp(option.label)}
                      title={copy.columnsModal.moveUp(option.label)}
                      disabled={selectedIndex === 0}
                      onClick={() => moveColumn(option.id, 'up')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={copy.columnsModal.moveDown(option.label)}
                      title={copy.columnsModal.moveDown(option.label)}
                      disabled={selectedIndex === draftColumns.length - 1}
                      onClick={() => moveColumn(option.id, 'down')}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </CortesModalFrame>
  );
}
