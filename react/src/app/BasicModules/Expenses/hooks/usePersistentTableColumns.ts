import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type PersistableColumn = {
  fixed?: boolean;
  key: string;
  visible: boolean;
};

export type LegacyFactoryColumnPreset = {
  orderedKeys: string[];
  visibleKeys: string[];
};

type PersistentTableColumnOptions = {
  legacyFactoryPresets?: LegacyFactoryColumnPreset[];
};

function matchesLegacyFactoryPreset(candidate: unknown, preset: LegacyFactoryColumnPreset) {
  if (!Array.isArray(candidate) || candidate.length !== preset.orderedKeys.length) return false;
  const visibleKeys = new Set(preset.visibleKeys);

  return candidate.every((column, index) => (
    Boolean(column)
    && typeof column === 'object'
    && 'key' in column
    && 'visible' in column
    && String(column.key) === preset.orderedKeys[index]
    && column.visible === visibleKeys.has(String(column.key))
  ));
}

function reconcileColumns<T extends PersistableColumn>(
  candidate: unknown,
  defaults: T[],
  legacyFactoryPresets: LegacyFactoryColumnPreset[] = [],
): T[] {
  if (legacyFactoryPresets.some(preset => matchesLegacyFactoryPreset(candidate, preset))) {
    return defaults.map(column => ({ ...column }));
  }
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

function loadColumns<T extends PersistableColumn>(
  storageKey: string,
  defaults: T[],
  legacyFactoryPresets: LegacyFactoryColumnPreset[],
): T[] {
  if (typeof window === 'undefined') return defaults.map(column => ({ ...column }));
  try {
    return reconcileColumns(
      JSON.parse(window.localStorage.getItem(storageKey) ?? '[]'),
      defaults,
      legacyFactoryPresets,
    );
  } catch {
    return defaults.map(column => ({ ...column }));
  }
}

export function usePersistentTableColumns<T extends PersistableColumn>(
  storageKey: string,
  defaults: T[],
  options: PersistentTableColumnOptions = {},
) {
  const legacyFactoryPresets = options.legacyFactoryPresets ?? [];
  const signature = JSON.stringify({ defaults, legacyFactoryPresets });
  const [columns, setColumnsState] = useState<T[]>(() => loadColumns(storageKey, defaults, legacyFactoryPresets));

  useEffect(() => {
    setColumnsState(current => reconcileColumns(current, defaults, legacyFactoryPresets));
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
      legacyFactoryPresets,
    ));
  }, [signature]);

  return [columns, setColumns] as const;
}
