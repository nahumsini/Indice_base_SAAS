import { Eye, EyeOff, GripVertical, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type { ProviderColumnConfig } from '../providerTableConfig';
import { useProvidersTranslations } from '../hooks/useProvidersTranslations';
import { getProviderModalTheme, type ProviderModalVariant } from './providerModalTheme';

type ProviderColumnsModalProps = {
  columns: ProviderColumnConfig[];
  onApply: () => void;
  onClose: () => void;
  onHideOptional: () => void;
  onRestoreDefault: () => void;
  onShowAll: () => void;
  onToggleColumn: (key: ProviderColumnConfig['key'], visible: boolean) => void;
  variant?: ProviderModalVariant;
};

export function ProviderColumnsModal({
  columns,
  onApply,
  onClose,
  onHideOptional,
  onRestoreDefault,
  onShowAll,
  onToggleColumn,
  variant = 'finance',
}: ProviderColumnsModalProps) {
  const t = useProvidersTranslations();
  const theme = getProviderModalTheme(variant);
  const [searchTerm, setSearchTerm] = useState('');
  const visibleCount = columns.filter(column => column.visible).length;
  const filteredColumns = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return columns;
    return columns.filter(column => (
      column.label.toLowerCase().includes(normalizedSearch)
      || column.key.toLowerCase().includes(normalizedSearch)
      || column.description?.toLowerCase().includes(normalizedSearch)
    ));
  }, [columns, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-[min(86vh,820px)] max-h-[calc(100vh-3rem)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.32)]">
        <div className="flex shrink-0 items-center justify-between px-6 py-5 text-white" style={{ backgroundColor: theme.accent }}>
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-normal">Configure columns</h2>
            <p className="mt-1 text-sm font-medium text-white/85">{t.providers.headerSubtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white transition hover:bg-white/20" aria-label={t.columnModal.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70">
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <p className="max-w-xl text-sm font-semibold leading-6 text-slate-600">
                  {t.columnModal.selectionInstructions}
                </p>
                <div className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-700">
                  {t.columnModal.visibleCount(visibleCount, columns.length)}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
                <ToolbarButton icon={<Eye className="h-4 w-4" />} onClick={onShowAll}>{t.columnModal.selectAll}</ToolbarButton>
                <ToolbarButton icon={<EyeOff className="h-4 w-4" />} onClick={onHideOptional}>{t.common.deselectAll}</ToolbarButton>
                <ToolbarButton icon={<RotateCcw className="h-4 w-4" />} onClick={onRestoreDefault}>{t.common.restore}</ToolbarButton>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t.columnModal.searchPlaceholder}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4"
                style={{ '--tw-ring-color': theme.softBackground } as CSSProperties}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              {filteredColumns.map(column => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
                  style={{ borderColor: column.visible ? theme.softBorder : undefined }}
                >
                  <GripVertical className="h-5 w-5 shrink-0" style={{ color: theme.accentText }} />
                  <input
                    type="checkbox"
                    checked={column.visible}
                    disabled={column.fixed}
                    onChange={(event) => onToggleColumn(column.key, event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ accentColor: theme.accent }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-base font-extrabold text-slate-900">
                      {column.label}
                      {column.fixed ? <span className="text-xs font-bold text-slate-500">({t.columnModal.fixed})</span> : null}
                    </span>
                    {column.description ? (
                      <span className="mt-1 block text-sm font-semibold leading-5 text-slate-600">{column.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
              {filteredColumns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-500">
                  {t.columnModal.empty}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 px-6 py-4" style={{ backgroundColor: theme.accent }}>
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-white/35 bg-white/10 px-7 text-sm font-extrabold text-white transition hover:bg-white/18">{t.common.cancel}</button>
          <button type="button" onClick={onApply} className="h-12 rounded-2xl bg-white px-7 text-sm font-extrabold shadow-lg shadow-slate-900/15 transition hover:bg-slate-50" style={{ color: theme.accentText }}>{t.columnModal.applyChanges}</button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ children, icon, onClick }: { children: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-[#147514]/25 hover:bg-slate-50">
      {icon}
      {children}
    </button>
  );
}
