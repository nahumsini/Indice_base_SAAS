import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { SalesContact, SalesOpportunity } from '../../salesCrmContext';
import { fallbackOwnerValue } from '../../utils/salesOwnerOptions';
import { normalizeTextKey } from '../../utils/salesTextUtils';
import { defaultOpportunityColumns, opportunityColumnsStorageKey } from './prospectosStatus';

export function getOwnerSelectValue(opportunity: SalesOpportunity) {
  return opportunity.ownerUserCompanyId
    ? `user-company:${opportunity.ownerUserCompanyId}`
    : fallbackOwnerValue(opportunity.owner);
}

export function canViewAllOpportunities(role?: string | null) {
  const normalizedRole = normalizeTextKey(role).replace(/[\s-]+/g, '_');
  return ['root', 'superadmin', 'super_admin', 'owner', 'admin'].includes(normalizedRole);
}

export function opportunityBelongsToCurrentUser(
  opportunity: SalesOpportunity,
  currentUserCompanyId: number | null,
  currentOwnerNames: string[],
) {
  if (currentUserCompanyId && opportunity.ownerUserCompanyId) {
    return opportunity.ownerUserCompanyId === currentUserCompanyId;
  }

  const normalizedOwnerNames = currentOwnerNames.map(normalizeTextKey).filter(Boolean);
  return normalizedOwnerNames.includes(normalizeTextKey(opportunity.owner));
}

export function getInitialOpportunityColumns() {
  if (typeof window === 'undefined') {
    return defaultOpportunityColumns;
  }

  try {
    const rawColumns = window.localStorage.getItem(opportunityColumnsStorageKey);
    if (!rawColumns) {
      return defaultOpportunityColumns;
    }

    const parsedColumns = JSON.parse(rawColumns) as Array<Partial<ColumnConfig>>;
    const defaultColumnMap = new Map(defaultOpportunityColumns.map((column) => [column.id, column]));
    const restoredColumns = parsedColumns
      .map((column) => {
        const defaultColumn = column.id ? defaultColumnMap.get(column.id) : null;
        if (!defaultColumn) {
          return null;
        }
        return {
          ...defaultColumn,
          visible: typeof column.visible === 'boolean' ? column.visible : defaultColumn.visible,
          locked: defaultColumn.locked,
        };
      })
      .filter(Boolean) as ColumnConfig[];
    const missingColumns = defaultOpportunityColumns.filter(
      (column) => !restoredColumns.some((restoredColumn) => restoredColumn.id === column.id),
    );

    return restoredColumns.length > 0 ? [...restoredColumns, ...missingColumns] : defaultOpportunityColumns;
  } catch {
    return defaultOpportunityColumns;
  }
}

export function refreshOpportunityColumns(currentColumns: ColumnConfig[]) {
  const defaultColumnMap = new Map(defaultOpportunityColumns.map((column) => [column.id, column]));
  const refreshedColumns = currentColumns.map((column) => {
    const defaultColumn = defaultColumnMap.get(column.id);
    return defaultColumn ? { ...defaultColumn, visible: column.visible, locked: defaultColumn.locked } : column;
  });
  const missingColumns = defaultOpportunityColumns.filter(
    (column) => !refreshedColumns.some((currentColumn) => currentColumn.id === column.id),
  );

  return missingColumns.length > 0 ? [...refreshedColumns, ...missingColumns] : refreshedColumns;
}

export function getContactById(contacts: SalesContact[], contactId: string) {
  return contacts.find((contact) => contact.id === contactId) ?? contacts[0];
}

