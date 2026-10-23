import { useMemo } from "react";
import { Eye, ChevronRight } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  TableBody,
  TableRow,
  TableCell,
  Table,
  TableHead,
  TableHeader,
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
import type { EmailTemplate, TemplatePage } from "../mailingApi";
import type { MailingCopy } from "../translations";
import { useTemplateWorkspaceCopy } from "../templateWorkspaceCopy";

type Column = "name" | "subject" | "status" | "updatedAt";
const widths = { name: 240, subject: 260, status: 140, updatedAt: 190 };
const sortable: Column[] = ["name", "subject", "updatedAt"];
export function TemplateTable({
  data,
  copy,
  locale,
  page,
  size,
  sort,
  direction,
  onPage,
  onSize,
  onSort,
  onSelect,
  compact = false,
  selectedId,
  disabled = false,
  tone = "coral",
}: {
  data: TemplatePage;
  copy: MailingCopy;
  locale: string;
  page: number;
  size: number;
  sort: string;
  direction: "asc" | "desc";
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  onSort: (sort: Column) => void;
  onSelect: (row: EmailTemplate, trigger?: HTMLButtonElement) => void;
  compact?: boolean;
  selectedId?: string;
  disabled?: boolean;
  tone?: "blue" | "coral";
}) {
  const workspace = useTemplateWorkspaceCopy();
  const labels = useMemo(
    () => ({
      name: copy.templateName,
      subject: copy.subject,
      status: copy.status,
      updatedAt: copy.updated,
    }),
    [copy],
  );
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: sortable,
    storageKey: "sales-mailing-template-widths-v1",
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
    resizeLabel: `${copy.resize}: ${labels[id]}`,
  }));
  if (compact) return (
    <IndiceTableShell className="rounded-xl shadow-none [&_[data-slot=table-container]]:max-h-[min(48dvh,26rem)] [&_[data-slot=table-container]]:overflow-y-auto">
      <Table className="w-full table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
          <TableRow className="bg-slate-50 dark:bg-slate-900">
            <TableHead className="h-10 px-3 text-xs font-medium">{copy.templates}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.length ? data.items.map(row => (
            <TableRow key={row.id} data-state={selectedId === row.id ? "selected" : undefined}>
              <TableCell className="p-0 whitespace-normal">
                <button
                  type="button"
                  data-template-id={row.id}
                  disabled={disabled}
                  aria-label={`${copy.view}: ${row.name}`}
                  aria-pressed={selectedId === row.id}
                  onClick={event => onSelect(row, event.currentTarget)}
                  className={`flex min-h-11 w-full items-center gap-3 border-l-2 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-wait disabled:opacity-60 ${selectedId === row.id
                    ? tone === "blue" ? "border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40" : "border-[#FF6B5E] bg-[#FF6B5E]/5"
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900"}`}
                >
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block break-words text-sm font-medium text-slate-900 dark:text-white">{row.name}</span>
                    <span className="block truncate text-sm text-slate-500 dark:text-slate-400" title={row.subject}>{row.subject}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 ${row.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200"}`}>{row.status === "ACTIVE" ? workspace.active : workspace.archived}</span>
                      <time dateTime={row.updatedAt} title={copy.updated}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.updatedAt))}</time>
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </TableCell>
            </TableRow>
          )) : <TableRow><TableCell className="p-6 text-center text-sm text-slate-500">{copy.emptyTemplates}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </IndiceTableShell>
  );
  return (
    <IndiceTableShell
      pagination={
        data.total > 0 ? (
          <DataTablePagination
            currentPage={page}
            pageSize={size}
            pageSizeOptions={[10, 25, 50, 100, 200]}
            totalCount={data.total}
            totalPages={Math.max(1, Math.ceil(data.total / size))}
            pageStart={(page - 1) * size + 1}
            pageEnd={Math.min(page * size, data.total)}
            onPageChange={onPage}
            onPageSizeChange={onSize}
          />
        ) : undefined
      }
    >
      <IndiceOperationalTable
        minimumWidth={
          Object.values(columnWidths).reduce((a, b) => a + b, 0) + 76
        }
      >
        <IndiceTableColGroup columns={columns} actionsWidth={76} />
        <IndiceTableHeaderRow
          columns={columns}
          onResize={resizeColumn}
          onSort={onSort}
          sortState={{ columnId: sort as Column, direction }}
          actions={{ label: copy.actions, width: 76 }}
          tone={tone}
        />
        <TableBody>
          {data.items.length ? (
            data.items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell>
                  {row.status === "ACTIVE" ? copy.active : copy.archived}
                </TableCell>
                <TableCell>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.updatedAt))}
                </TableCell>
                <TableCell>
                  <Button
                    className="h-11 w-11 p-0"
                    variant="ghost"
                    aria-label={`${copy.view}: ${row.name}`}
                    onClick={() => onSelect(row)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
                {copy.emptyTemplates}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </IndiceOperationalTable>
    </IndiceTableShell>
  );
}
