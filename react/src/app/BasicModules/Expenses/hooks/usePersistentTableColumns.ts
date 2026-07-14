import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type PersistableColumn = {
  fixed?: boolean;
  key: string;
  visible: boolean;
};

function reconcileColumns<T extends PersistableColumn>(candidate: unknown, defaults: T[]): T[] {
  const storedColumns = Array.isArray(candidate) ? candidate : [];
  const defaultsByKey = new Map(defaults.map(column => [column.key, column]));
  const restored: T[] = [];

  storedColumns.forEach(storedColumn => {
    if (!storedColumn || typeof storedColumn !== 'object' || !('key' in storedColumn)) return;
    const key = String(storedColumn.key);
    const defaultColumn = defaultsByKey.get(key);
    if (!defaultColumn) return;
    restored.push({
      ...defaultColumn,
      visible: defaultColumn.fixed
        ? true
        : 'visible' in storedColumn && typeof storedColumn.visible === 'boolean'
          ? storedColumn.visible
          : defaultColumn.visible,
    });
    defaultsByKey.delete(key);
  });

  return [...restored, ...defaults.filter(column => defaultsByKey.has(column.key)).map(column => ({ ...column }))];
}

function loadColumns<T extends PersistableColumn>(storageKey: string, defaults: T[]): T[] {
  if (typeof window === 'undefined') return defaults.map(column => ({ ...column }));
  try {
    return reconcileColumns(JSON.parse(window.localStorage.getItem(storageKey) ?? '[]'), defaults);
  } catch {
    return defaults.map(column => ({ ...column }));
  }
}

export function usePersistentTableColumns<T extends PersistableColumn>(storageKey: string, defaults: T[]) {
  const signature = JSON.stringify(defaults);
  const [columns, setColumnsState] = useState<T[]>(() => loadColumns(storageKey, defaults));

  useEffect(() => {
    setColumnsState(current => reconcileColumns(current, defaults));
  }, [signature]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(columns.map(column => ({
        key: column.key,
        visible: column.visible,
      }))));
    } catch {
      // Column configuration remains usable when browser storage is unavailable.
    }
  }, [columns, storageKey]);

  const setColumns: Dispatch<SetStateAction<T[]>> = useCallback(update => {
    setColumnsState(current => reconcileColumns(
      typeof update === 'function' ? update(current) : update,
      defaults,
    ));
  }, [signature]);

  return [columns, setColumns] as const;
}
