import { useEffect, useRef, useState } from 'react';
import { getCachedAuthSession } from '../../../api/authSessionStore';
import { workspaceStateApi } from '../../../api/workspaceState';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { DEFAULT_EXPENSE_COLUMNS } from '../constants/expenseColumns';
import type { ColumnConfig } from '../types/expenseView.types';

export const expenseColumnsStorageKey = 'indice.expenses.expenses.columns.v1';

const defaultExpenseColumns = () => DEFAULT_EXPENSE_COLUMNS.map(column => ({ ...column }));

const reconcileExpenseColumns = (storedColumns: unknown, hideNewOptionalColumns = false): ColumnConfig[] => {
  if (!Array.isArray(storedColumns)) return defaultExpenseColumns();

  const defaultsByKey = new Map(DEFAULT_EXPENSE_COLUMNS.map(column => [column.key, column]));
  const restoredKeys = new Set<string>();
  const restoredColumns: ColumnConfig[] = [];

  storedColumns.forEach(storedColumn => {
    if (!storedColumn || typeof storedColumn !== 'object') return;

    const candidate = storedColumn as Partial<ColumnConfig>;
    if (typeof candidate.key !== 'string' || restoredKeys.has(candidate.key)) return;

    const defaultColumn = defaultsByKey.get(candidate.key);
    if (!defaultColumn) return;

    restoredKeys.add(candidate.key);
    restoredColumns.push({
      ...defaultColumn,
      visible: defaultColumn.fixed
        ? true
        : typeof candidate.visible === 'boolean'
          ? candidate.visible
          : defaultColumn.visible,
    });
  });

  const newColumns = DEFAULT_EXPENSE_COLUMNS
    .filter(column => !restoredKeys.has(column.key))
    .map(column => ({
      ...column,
      visible: hideNewOptionalColumns && !column.fixed ? false : column.visible,
    }));

  return restoredColumns.length > 0
    ? [...restoredColumns, ...newColumns]
    : defaultExpenseColumns();
};

const currentScope = () => {
  const session = getCachedAuthSession();
  return session ? `${session.company.id}:${session.user.id}` : '';
};
const storageKey = (scope: string) => `indice:workspace:${scope}:expenses:expenses-columns`;
const readPendingMigration = (scope: string): boolean => {
  try { return JSON.parse(window.localStorage.getItem(storageKey(scope)) ?? 'null')?.pendingMigration === true; }
  catch { return false; }
};
const readColumns = (scope: string): ColumnConfig[] => {
  if (!scope || typeof window === 'undefined') return defaultExpenseColumns();
  try {
    const cached = JSON.parse(window.localStorage.getItem(storageKey(scope)) ?? 'null');
    return reconcileExpenseColumns(cached?.state?.columns, true);
  } catch { return defaultExpenseColumns(); }
};
const cacheColumns = (scope: string, columns: ColumnConfig[], pendingMigration = false) => {
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify({ state: { columns: preference(columns) }, pendingMigration, savedAt: new Date().toISOString() }));
  } catch { /* The server remains authoritative when browser storage is unavailable. */ }
};
const preference = (columns: ColumnConfig[]) => columns.map(({ key, visible }) => ({ key, visible }));

export function useExpenseColumns() {
  useAuthorizationRevision();
  const scope = currentScope();
  const [stored, setStored] = useState(() => ({ scope, columns: readColumns(scope) }));
  const changes = useRef(0);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const persist = (next: ColumnConfig[]) => {
    const write = saveQueue.current.catch(() => undefined).then(() => {
      if (!scope || currentScope() !== scope) throw new Error('Session unavailable');
      return workspaceStateApi.save('expenses', 'expenses-columns', { columns: preference(next) });
    });
    saveQueue.current = write;
    return write;
  };
  const columns = stored.scope === scope ? stored.columns : readColumns(scope);

  useEffect(() => {
    let cancelled = false;
    const revision = changes.current;
    setStored({ scope, columns: readColumns(scope) });
    if (!scope) return;
    // Claim the old browser-only preference once; never share it with subsequent users.
    let legacy = readPendingMigration(scope) ? readColumns(scope) : undefined;
    try {
      const storedColumns = window.localStorage.getItem(expenseColumnsStorageKey);
      if (storedColumns) {
        legacy = reconcileExpenseColumns(JSON.parse(storedColumns), true);
        window.localStorage.removeItem(expenseColumnsStorageKey);
        cacheColumns(scope, legacy, true);
        setStored({ scope, columns: legacy });
      }
    } catch { /* Malformed legacy storage must not prevent server restoration. */ }
    const active = () => !cancelled && scope === currentScope() && revision === changes.current;
    void workspaceStateApi.get<{ columns?: unknown }>('expenses', 'expenses-columns').then(async response => {
      if (!active()) return;
      const saved = Array.isArray(response.state?.columns);
      const restored = saved ? reconcileExpenseColumns(response.state.columns, true) : legacy ?? readColumns(scope);
      if (!saved && legacy) {
        await persist(legacy);
        if (!active()) return;
      }
      cacheColumns(scope, restored);
      setStored({ scope, columns: restored });
    }).catch(() => { /* Keep the scoped cache available; explicit Apply reports save failures. */ });
    return () => { cancelled = true; };
  }, [scope]);

  const applyColumns = async (nextColumns: ColumnConfig[]) => {
    if (!scope || currentScope() !== scope) throw new Error('Session unavailable');
    const revision = ++changes.current;
    const next = reconcileExpenseColumns(nextColumns);
    // Confirm persistence before closing the modal, including a tab switch or immediate logout.
    await persist(next);
    if (currentScope() !== scope || changes.current !== revision) return;
    cacheColumns(scope, next);
    setStored({ scope, columns: next });
  };

  return { applyColumns, columns };
}
