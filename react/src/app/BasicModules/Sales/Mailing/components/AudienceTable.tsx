import { useMemo } from "react";
import {
  TableBody,
  TableRow,
  TableCell,
} from "../../../../components/ui/table";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import { usePersistentColumnWidths } from "../../../../hooks/usePersistentColumnWidths";
import { useAudienceCopy } from "../audienceCopy";
import { useDeliveryCopy } from "../deliveryCopy";
import type { AudienceContact } from "../audienceApi";

type Column = "name" | "companyName" | "email" | "ownerName" | "eligibility";
const widths = {
  name: 210,
  companyName: 210,
  email: 240,
  ownerName: 170,
  eligibility: 180,
};
const sortable: Column[] = ["name", "companyName", "email", "ownerName"];
export function AudienceState({ state }: { state: string }) {
  const copy = useDeliveryCopy();
  const text = useAudienceCopy();
  const color =
    state === "READY" || state === "ACCEPTED"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : state === "CONSENT_REQUIRED" || state === "UNKNOWN"
        ? "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${color}`}>
      {state === "EXCLUDED"
        ? text.omitted
        : (copy.states[state as keyof typeof copy.states] ?? state)}
    </span>
  );
}
export function AudienceTable({
  items,
  selected,
  disabled,
  onToggle,
  page,
  size,
  total,
  sort,
  direction,
  onSort,
  onPage,
  onSize,
}: {
  items: AudienceContact[];
  selected: Set<number>;
  disabled: boolean;
  onToggle: (row: AudienceContact) => void;
  page: number;
  size: number;
  total: number;
  sort: string;
  direction: "asc" | "desc";
  onSort: (column: string) => void;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  const text = useAudienceCopy();
  const labels = useMemo(
    () => ({
      name: text.contact,
      companyName: text.company,
      email: text.email,
      ownerName: text.owner,
      eligibility: text.eligibility,
    }),
    [text],
  );
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: sortable,
    storageKey: "sales-mailing-audience-widths-v1",
  });
  const columns: IndiceTableColumnDefinition<Column>[] = (
    Object.keys(widths) as Column[]
  ).map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: widths[id],
    contentMinimumWidth: widths[id],
    sortable: sortable.includes(id),
    resizeLabel: `${text.resize}: ${labels[id]}`,
  }));
  return (
    <IndiceTableShell
      pagination={
        total > 0 ? (
          <DataTablePagination
            currentPage={page}
            pageSize={size}
            pageSizeOptions={[10, 25, 50, 100, 200]}
            totalCount={total}
            totalPages={Math.max(1, Math.ceil(total / size))}
            pageStart={(page - 1) * size + 1}
            pageEnd={Math.min(page * size, total)}
            onPageChange={onPage}
            onPageSizeChange={onSize}
          />
        ) : undefined
      }
    >
      <IndiceOperationalTable
        className="text-slate-900 dark:text-slate-100"
        minimumWidth={Object.values(columnWidths).reduce((a, b) => a + b, 52)}
      >
        <IndiceTableColGroup columns={columns} leadingControlWidth={52} />
        <IndiceTableHeaderRow
          columns={columns}
          leadingControl={{ label: text.selected, width: 52 }}
          tone="coral"
          onResize={resizeColumn}
          onSort={onSort}
          sortState={{ columnId: sort as Column, direction }}
        />
        <TableBody>
          {items.length ? (
            items.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-200 data-[state=selected]:bg-[#FF6B5E]/5 hover:bg-[#FF6B5E]/5 dark:border-slate-700 dark:data-[state=selected]:bg-[#FF6B5E]/10"
                data-state={selected.has(row.id) ? "selected" : undefined}
              >
                <TableCell className="px-1">
                  <label className="flex min-h-11 w-11 items-center justify-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#FF6B5E]"
                      aria-label={`${text.selected}: ${row.name}`}
                      checked={selected.has(row.id)}
                      disabled={
                        disabled ||
                        (!selected.has(row.id) && selected.size >= 500)
                      }
                      onChange={() => onToggle(row)}
                    />
                  </label>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="break-words">
                    {row.contactPerson || row.name || "—"}
                  </span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="break-words">{row.companyName || "—"}</span>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="break-all">{row.email || "—"}</span>
                </TableCell>
                <TableCell>{row.ownerName || "—"}</TableCell>
                <TableCell>
                  <AudienceState state={row.eligibility} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-10 text-center text-slate-500"
              >
                {text.empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
