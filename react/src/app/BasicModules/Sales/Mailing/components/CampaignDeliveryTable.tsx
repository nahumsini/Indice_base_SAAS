import { usePersistentColumnWidths } from "../../../../hooks/usePersistentColumnWidths";
import { useState } from "react";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../../../components/table/IndiceTableEngine";
import {
  TableBody,
  TableCell,
  TableRow,
} from "../../../../components/ui/table";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import type { DeliveryCopy } from "../deliveryCopy";
import { Checkbox } from "../../../../components/ui/checkbox";
export function CampaignDeliveryTable({
  rows,
  copy,
  selected,
  onSelect,
  disabled = false,
}: {
  rows: {
    id: string;
    name: string;
    email: string;
    state: string;
    contactId?: number;
  }[];
  copy: DeliveryCopy;
  selected?: number[];
  onSelect?: (id: number, checked: boolean) => void;
  disabled?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<
    "recipient" | "state"
  >({
    defaults: { recipient: 340, state: 200 },
    headerLabels: { recipient: copy.recipients, state: copy.results },
    sortableColumnIds: [],
    storageKey: "mailing-delivery-columns-v1",
  });
  const columns: IndiceTableColumnDefinition<"recipient" | "state">[] = [
    {
      id: "recipient",
      label: copy.recipients,
      resizeLabel: copy.recipients,
      width: columnWidths.recipient,
      defaultWidth: 340,
      contentMinimumWidth: 260,
    },
    {
      id: "state",
      label: copy.results,
      resizeLabel: copy.results,
      width: columnWidths.state,
      defaultWidth: 200,
      contentMinimumWidth: 160,
    },
  ];
  return (
    <IndiceTableShell
      className="[&_[data-slot=table-container]]:max-h-[28rem] [&_[data-slot=table-container]]:overflow-y-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10"
      pagination={
        <DataTablePagination
          currentPage={current}
          pageSize={size}
          pageSizeOptions={[10, 25, 50, 100, 200]}
          totalCount={rows.length}
          totalPages={Math.max(1, Math.ceil(rows.length / size))}
          pageStart={rows.length ? (current - 1) * size + 1 : 0}
          pageEnd={Math.min(current * size, rows.length)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setSize(value);
            setPage(1);
          }}
        />
      }
    >
      <IndiceOperationalTable
        minimumWidth={columnWidths.recipient + columnWidths.state}
      >
        <IndiceTableColGroup columns={columns} />
        <IndiceTableHeaderRow
          columns={columns}
          onResize={resizeColumn}
          tone="coral"
        />
        <TableBody>
          {rows.slice((current - 1) * size, current * size).map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {onSelect && row.contactId != null && (
                    <Checkbox
                      className="h-5 w-5"
                      aria-label={`${copy.selectRecipient}: ${row.name}`}
                      disabled={disabled || row.state !== "READY"}
                      checked={selected?.includes(row.contactId) ?? false}
                      onCheckedChange={(checked) =>
                        onSelect(row.contactId!, checked === true)
                      }
                    />
                  )}
                  <div>
                    <p>{row.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {row.email}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {copy.states[row.state as keyof typeof copy.states] ??
                  row.state}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
