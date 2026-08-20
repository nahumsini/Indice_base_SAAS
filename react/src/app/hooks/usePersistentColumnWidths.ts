import { useCallback, useEffect, useState } from 'react';
import { getIndiceTableMinimumColumnWidth } from '../components/table/indiceTableColumnSizing';

type WidthMap<ColumnId extends string> = Record<ColumnId, number>;

function clampWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

export function usePersistentColumnWidths<ColumnId extends string>({
  defaults,
  headerLabels,
  maxWidths,
  minWidths,
  sortableColumnIds,
  storageKey,
}: {
  defaults: WidthMap<ColumnId>;
  headerLabels?: Partial<Record<ColumnId, string>>;
  maxWidths?: Partial<WidthMap<ColumnId>>;
  minWidths?: Partial<WidthMap<ColumnId>>;
  sortableColumnIds?: readonly ColumnId[];
  storageKey: string;
}) {
  const normalize = useCallback((columnId: ColumnId, width: number) => {
    const contentMinimumWidth = minWidths?.[columnId] ?? 120;
    const label = headerLabels?.[columnId];
    const minimumWidth = label
      ? getIndiceTableMinimumColumnWidth({
        contentMinimumWidth,
        label,
        sortable: sortableColumnIds?.includes(columnId) ?? false,
      })
      : contentMinimumWidth;

    return clampWidth(width, minimumWidth, maxWidths?.[columnId] ?? 480);
  }, [headerLabels, maxWidths, minWidths, sortableColumnIds]);

  const [columnWidths, setColumnWidths] = useState<WidthMap<ColumnId>>(() => {
    if (typeof window === 'undefined') return defaults;

    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed: Partial<WidthMap<ColumnId>> = stored
        ? JSON.parse(stored) as Partial<WidthMap<ColumnId>>
        : {};
      return (Object.entries(defaults) as Array<[ColumnId, number]>).reduce((result, [columnId, defaultWidth]) => {
        const storedWidth = parsed[columnId];
        result[columnId] = typeof storedWidth === 'number' && Number.isFinite(storedWidth)
          ? normalize(columnId, storedWidth)
          : normalize(columnId, defaultWidth);
        return result;
      }, {} as WidthMap<ColumnId>);
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    }
  }, [columnWidths, storageKey]);

  useEffect(() => {
    setColumnWidths((current) => {
      let changed = false;
      const next = { ...current };

      (Object.keys(defaults) as ColumnId[]).forEach((columnId) => {
        const safeWidth = normalize(columnId, current[columnId] ?? defaults[columnId]);
        if (safeWidth !== current[columnId]) {
          next[columnId] = safeWidth;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [defaults, normalize]);

  const resizeColumn = useCallback((columnId: ColumnId, width: number) => {
    setColumnWidths((current) => ({ ...current, [columnId]: normalize(columnId, width) }));
  }, [normalize]);

  const resetColumn = useCallback((columnId: ColumnId) => {
    resizeColumn(columnId, defaults[columnId]);
  }, [defaults, resizeColumn]);

  const resetAllColumns = useCallback(() => {
    setColumnWidths((Object.entries(defaults) as Array<[ColumnId, number]>).reduce((result, [columnId, width]) => {
      result[columnId] = normalize(columnId, width);
      return result;
    }, {} as WidthMap<ColumnId>));
  }, [defaults, normalize]);

  return { columnWidths, resizeColumn, resetAllColumns, resetColumn };
}
