import { useMemo } from "react";
import { Eye } from "lucide-react";
import { Button } from "../../../../components/ui/button";
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
import type { EmailTemplate, TemplatePage } from "../mailingApi";
import type { MailingCopy } from "../translations";

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
  onSelect: (row: EmailTemplate) => void;
}) {
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
          tone="coral"
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
