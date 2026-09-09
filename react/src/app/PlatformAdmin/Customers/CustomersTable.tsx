import { useCustomerAccountCopy } from "./useCustomerAccountCopy";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import type { PlatformCompanySummary } from "../../api/platformAdmin";
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../../components/table/IndiceTableEngine";
import { TableBody, TableCell, TableRow } from "../../components/ui/table";
import { usePersistentColumnWidths } from "../../hooks/usePersistentColumnWidths";
import { CustomerTableRow } from "./CustomerTableRow";
import {
  customerTableActionsWidth,
  customerTableDefaultWidths,
  customerTableMaximumWidths,
  customerTableMinimumWidths,
  getCustomerTableColumnLabels,
  type CustomerTableColumnId,
} from "./customerTableColumns";
import { getCustomerTableCopy } from "./customerTableCopy";
import type { CustomerSortKey, SortDirection } from "./customerTableUtils";

export function CustomersTable({
  english,
  companies,
  columns,
  pagination,
  sort,
  onSort,
  onOpenCompany,
  onOpenUsers,
  canEditTypes,
  onEditType,
  canAssignDistributors,
  onAssignDistributor,
  canExtendTrials,
  onExtendTrial,
  canRequestPayment,
  onRequestPayment,
  canDelete,
  onDelete,
  compact = false,
}: {
  english: boolean;
  companies: PlatformCompanySummary[];
  columns: CustomerTableColumnId[];
  pagination?: ReactNode;
  sort?: { key: CustomerSortKey; direction: SortDirection };
  onSort?: (key: CustomerSortKey) => void;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
  onOpenUsers: (company: PlatformCompanySummary) => void;
  canEditTypes?: boolean;
  onEditType?: (company: PlatformCompanySummary) => void;
  canAssignDistributors?: boolean;
  onAssignDistributor?: (company: PlatformCompanySummary) => void;
  canExtendTrials?: boolean;
  onExtendTrial?: (company: PlatformCompanySummary) => void;
  canRequestPayment?: boolean;
  onRequestPayment?: (company: PlatformCompanySummary) => void;
  canDelete?: boolean;
  onDelete?: (company: PlatformCompanySummary) => void;
  compact?: boolean;
}) {
  const { locale, t } = useCustomerAccountCopy();
  const copy = getCustomerTableCopy(locale);
  const headerLabels = getCustomerTableColumnLabels(copy);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<CustomerTableColumnId>({
    defaults: customerTableDefaultWidths,
    headerLabels,
    maxWidths: customerTableMaximumWidths,
    minWidths: customerTableMinimumWidths,
    sortableColumnIds: columns,
    storageKey: "indice-platform-admin-customer-column-widths-v2",
  });
  const tableColumns: Array<IndiceTableColumnDefinition<CustomerTableColumnId>> = columns.map((columnId) => ({
    id: columnId,
    label: headerLabels[columnId],
    width: columnWidths[columnId],
    defaultWidth: customerTableDefaultWidths[columnId],
    contentMinimumWidth: customerTableMinimumWidths[columnId],
    maxWidth: customerTableMaximumWidths[columnId],
    sortable: true,
    resizeLabel: t("resizeColumn", { name: headerLabels[columnId] }),
  }));
  const minimumWidth = getIndiceTableMinimumWidth({
    actionsWidth: customerTableActionsWidth,
    columns: tableColumns,
  });

  return (
    <IndiceTableShell pagination={pagination}>
      <IndiceOperationalTable minimumWidth={minimumWidth}>
        <IndiceTableColGroup columns={tableColumns} actionsWidth={customerTableActionsWidth} />
        <IndiceTableHeaderRow
          actions={{ label: copy.actions, width: customerTableActionsWidth }}
          columns={tableColumns}
          onResize={resizeColumn}
          onSort={onSort}
          sortState={sort?.direction ? { columnId: sort.key as CustomerTableColumnId, direction: sort.direction } : null}
          tone="aqua"
        />
        <TableBody>
          {companies.map((company) => (
            <CustomerTableRow
              key={company.id}
              company={company}
              english={english}
              copy={copy}
              columns={columns}
              columnWidths={columnWidths}
              compact={compact}
              canEditTypes={canEditTypes}
              onEditType={onEditType}
              canAssignDistributors={canAssignDistributors}
              onAssignDistributor={onAssignDistributor}
              canExtendTrials={canExtendTrials}
              onExtendTrial={onExtendTrial}
              canRequestPayment={canRequestPayment}
              onRequestPayment={onRequestPayment}
              canDelete={canDelete}
              onDelete={onDelete}
              onOpenCompany={onOpenCompany}
              onOpenUsers={onOpenUsers}
            />
          ))}
          {!companies.length ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="px-6 py-14 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-500">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8f5f2] text-[#177D66]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  {copy.noAccounts}
                </div>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
