import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Columns3, Download, Eye, Receipt } from "lucide-react";
import { Button } from "../../components/ui/button";
import { TableBody, TableCell, TableRow } from "../../components/ui/table";
import {
  IndiceTableShell,
  IndiceOperationalTable,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  type IndiceTableColumnDefinition,
} from "../../components/table/IndiceTableEngine";
import { DataTablePagination } from "../../components/table/DataTablePagination";
import { IndiceModalFrame } from "../../components/indice-modal";
import { ColumnasConfigModal } from "../../components/rh/ColumnasConfigModal";
import { usePersistentColumnWidths } from "../../hooks/usePersistentColumnWidths";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { apiClient } from "../../lib/apiClient";
import {
  channelLabel,
  originLabel,
  statusLabel,
  type BoardCopy,
} from "./boardCopy";
import {
  boardQuery,
  dateLabel,
  moneyLabel,
  type BoardFilters,
  type SaleRow,
  type Workspace,
} from "./boardModel";
import { boardCsv, boardExportLimit, collectBoardExport } from "./boardExport";

type Column = "date" | "number" | "customer" | "origin" | "amount" | "status";
const widths = {
  date: 160,
  number: 180,
  customer: 250,
  origin: 200,
  amount: 200,
  status: 200,
};
const sortable: Column[] = ["date", "number", "customer", "amount"];
const optionalColumns: Column[] = [
  "date",
  "customer",
  "origin",
  "amount",
  "status",
];
const defaultColumns = optionalColumns.map((id) => ({ id, visible: true }));
function Status({ value, copy }: { value: string; copy: BoardCopy }) {
  const key = (value ?? "").toLowerCase();
  const tone = ["cancelled", "canceled", "rejected", "voided"].includes(key)
    ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
    : ["paid", "approved", "completed", "delivered"].includes(key)
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return (
    <span className={`inline-block rounded-full px-3 py-1.5 text-xs ${tone}`}>
      {statusLabel(value, copy)}
    </span>
  );
}
export function BoardSales({
  data,
  filters,
  onFilters,
  onSelect,
  copy,
  locale,
}: {
  data: Workspace;
  filters: BoardFilters;
  onFilters: (next: BoardFilters) => void;
  onSelect: (row: SaleRow) => void;
  copy: BoardCopy;
  locale: string;
}) {
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [storedColumns, setStoredColumns] = useLocalStorageState(
    "indice.sales-board.visible-columns.v1",
    defaultColumns,
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  const preferences = optionalColumns.map((id) => ({
    id,
    visible:
      !Array.isArray(storedColumns) ||
      storedColumns.find((item) => item?.id === id)?.visible !== false,
  }));
  const order = Array.isArray(storedColumns)
    ? [
        ...new Set(
          storedColumns
            .map((item) => item?.id)
            .filter((id) => optionalColumns.includes(id)),
        ),
      ]
    : optionalColumns;
  const visible: Column[] = [
    "number",
    ...[
      ...order,
      ...optionalColumns.filter((id) => !order.includes(id)),
    ].filter((id) => preferences.find((column) => column.id === id)?.visible),
  ];
  const labels = useMemo(
    () => ({
      date: copy.date,
      number: copy.number,
      customer: copy.customer,
      origin: copy.origin,
      amount: copy.amountSort,
      status: copy.status,
    }),
    [copy],
  );
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({
    defaults: widths,
    headerLabels: labels,
    sortableColumnIds: sortable,
    storageKey: "sales-board-columns-v1",
  });
  const columns: IndiceTableColumnDefinition<Column>[] = visible.map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: widths[id],
    contentMinimumWidth: widths[id],
    sortable: sortable.includes(id),
    resizeLabel: `${copy.resize}: ${labels[id]}`,
  }));
  const exportSales = async () => {
    if (exportController.current || data.total > boardExportLimit) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true);
    setExportError("");
    try {
      const fixed = {
        ...filters,
        from: data.context.from,
        to: data.context.to,
      };
      const rows = await collectBoardExport(
        (page, pageSize) =>
          apiClient<Workspace>(
            `/api/v1/sales-board?${boardQuery({ ...fixed, page, pageSize }, data.summary.total.preferredCurrency)}`,
            { signal: controller.signal },
          ),
        data.total,
        controller.signal,
      );
      const csv = boardCsv([
        [
          copy.number,
          copy.date,
          copy.customer,
          copy.seller,
          copy.origin,
          copy.channel,
          copy.unit,
          copy.business,
          copy.originalCurrency,
          copy.amount,
          copy.tax,
          copy.discount,
          copy.status,
          copy.finance,
          copy.inventory,
          copy.delivery,
          copy.ticket,
          copy.accounting,
        ],
        ...rows.map(({ sale: s, accounting: a }) => [
          s.number,
          s.date,
          s.customer,
          s.seller,
          originLabel(s.origin, copy),
          channelLabel(s.channel, copy),
          s.unitName,
          s.businessName,
          s.currency,
          s.total,
          s.tax,
          s.discount,
          statusLabel(s.commercialStatus, copy),
          statusLabel(s.financeStatus, copy),
          statusLabel(s.inventoryStatus, copy),
          statusLabel(s.deliveryStatus, copy),
          s.ticketNumber,
          a.state === "REVERSED"
            ? copy.reversed
            : a.state === "POSTED"
              ? copy.posted
              : copy.unposted,
        ]),
      ]);
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `sales-${data.context.from}-${data.context.to}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted) setExportError(copy.exportError);
    } finally {
      exportController.current = null;
      if (!controller.signal.aborted) setExporting(false);
    }
  };
  const cell = (column: Column, row: SaleRow): ReactNode => {
    const { sale } = row;
    switch (column) {
      case "number":
        return (
          <button
            className="min-h-11 text-left font-medium text-[#b63b32] underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-[#ff9d94]"
            onClick={() => onSelect(row)}
            aria-label={`${copy.detail}: ${sale.number}`}
          >
            {sale.number}
          </button>
        );
      case "date":
        return dateLabel(sale.date, locale);
      case "customer":
        return (
          <>
            <div>{sale.customer || "—"}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {sale.seller || "—"}
            </div>
          </>
        );
      case "origin":
        return (
          <>
            {originLabel(sale.origin, copy)}
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {channelLabel(sale.channel, copy)}
            </div>
          </>
        );
      case "amount":
        return moneyLabel(sale.total, sale.currency, locale);
      case "status":
        return <Status value={sale.commercialStatus} copy={copy} />;
    }
  };
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          {copy.amountSortHint}
          <br />
          {data.total > boardExportLimit ? copy.exportLimit : copy.exportHint}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            onClick={() => setColumnsOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            {copy.columns}
          </Button>
          <Button
            variant="outline"
            className="min-h-11 gap-2"
            disabled={exporting || data.total > boardExportLimit}
            onClick={exportSales}
          >
            <Download className="h-4 w-4" />
            {exporting ? copy.exporting : copy.exportCsv}
          </Button>
        </div>
      </div>
      {exportError && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {exportError}
        </p>
      )}
      <IndiceTableShell
        pagination={
          <DataTablePagination
            currentPage={filters.page}
            pageSize={filters.pageSize}
            pageSizeOptions={[10, 25, 50, 100, 200]}
            totalCount={data.total}
            totalPages={Math.max(1, Math.ceil(data.total / filters.pageSize))}
            pageStart={(filters.page - 1) * filters.pageSize + 1}
            pageEnd={Math.min(filters.page * filters.pageSize, data.total)}
            onPageChange={(page) => onFilters({ ...filters, page })}
            onPageSizeChange={(pageSize) =>
              onFilters({ ...filters, pageSize, page: 1 })
            }
          />
        }
      >
        <IndiceOperationalTable
          minimumWidth={
            visible.reduce((sum, id) => sum + columnWidths[id], 0) + 80
          }
        >
          <IndiceTableColGroup columns={columns} actionsWidth={80} />
          <IndiceTableHeaderRow
            columns={columns}
            tone="coral"
            onResize={resizeColumn}
            sortState={{
              columnId: filters.sort as Column,
              direction: filters.direction as "asc" | "desc",
            }}
            onSort={(sort) =>
              onFilters({
                ...filters,
                sort,
                direction:
                  filters.sort === sort && filters.direction === "asc"
                    ? "desc"
                    : "asc",
                page: 1,
              })
            }
            actions={{ label: copy.actions, width: 80 }}
          />
          <TableBody>
            {data.items.map((row) => (
              <TableRow key={row.sale.id}>
                {visible.map((id) => (
                  <TableCell
                    key={id}
                    className={id === "amount" ? "tabular-nums" : undefined}
                  >
                    {cell(id, row)}
                  </TableCell>
                ))}
                <TableCell>
                  <Button
                    variant="ghost"
                    className="h-11 w-11 p-0"
                    aria-label={`${copy.detail}: ${row.sale.number}`}
                    onClick={() => onSelect(row)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>
      <ColumnasConfigModal
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        theme="sales"
        columns={[
          ...order,
          ...optionalColumns.filter((id) => !order.includes(id)),
        ].map((id) => ({
          id,
          label: labels[id],
          visible:
            preferences.find((column) => column.id === id)?.visible ?? true,
        }))}
        defaultColumns={defaultColumns.map((column) => ({
          ...column,
          label: labels[column.id],
        }))}
        fixedColumns={[
          { id: "number", label: copy.number, visible: true, locked: true },
          { id: "actions", label: copy.actions, visible: true, locked: true },
        ]}
        onSave={(next) =>
          setStoredColumns(
            next
              .filter((column) => optionalColumns.includes(column.id as Column))
              .map((column) => ({
                id: column.id as Column,
                visible: column.visible,
              })),
          )
        }
      />
    </div>
  );
}
function DetailSection({
  title,
  fields,
}: {
  title: string;
  fields: [string, ReactNode][];
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 font-medium">{title}</h3>
      <dl className="grid gap-5 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              {label}
            </dt>
            <dd className="mt-1 break-words text-sm font-medium">
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function SaleDetail({
  row,
  copy,
  locale,
  onClose,
}: {
  row: SaleRow;
  copy: BoardCopy;
  locale: string;
  onClose: () => void;
}) {
  const { sale, accounting } = row;
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`${copy.detail} · ${sale.number}`}
      description={`${originLabel(sale.origin, copy)} · ${dateLabel(sale.date, locale)}`}
      icon={<Receipt />}
      modalType="operational-workspace"
      tone="coral"
      closeLabel={copy.close}
      footer={
        <Button variant="outline" onClick={onClose}>
          {copy.close}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection
          title={copy.commercialData}
          fields={[
            [copy.customer, sale.customer],
            [copy.seller, sale.seller],
            [copy.origin, originLabel(sale.origin, copy)],
            [copy.channel, channelLabel(sale.channel, copy)],
            [copy.unit, sale.unitName],
            [copy.business, sale.businessName],
            [copy.ticket, sale.ticketNumber],
            [copy.status, <Status value={sale.commercialStatus} copy={copy} />],
          ]}
        />
        <DetailSection
          title={copy.amounts}
          fields={[
            [
              copy.amount,
              <span className="text-xl text-[#b63b32] dark:text-[#ff9d94]">
                {moneyLabel(sale.total, sale.currency, locale)}
              </span>,
            ],
            [copy.originalCurrency, sale.currency],
            [copy.tax, moneyLabel(sale.tax, sale.currency, locale)],
            [copy.discount, moneyLabel(sale.discount, sale.currency, locale)],
          ]}
        />
        <DetailSection
          title={copy.fulfillment}
          fields={[
            [copy.finance, <Status value={sale.financeStatus} copy={copy} />],
            [
              copy.inventory,
              <Status value={sale.inventoryStatus} copy={copy} />,
            ],
            [copy.delivery, <Status value={sale.deliveryStatus} copy={copy} />],
          ]}
        />
        <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="font-medium">{copy.accounting}</h3>
          <p className="mt-3 text-sm">
            {accounting.state === "REVERSED"
              ? copy.reversed
              : accounting.state === "POSTED"
                ? copy.posted
                : copy.unposted}
          </p>
          {accounting.number && (
            <p className="mt-2 text-sm">
              {accounting.number} ·{" "}
              {accounting.date ? dateLabel(accounting.date, locale) : "—"}
            </p>
          )}
          {accounting.reversalNumber && (
            <p className="text-sm">
              {copy.reversed}: {accounting.reversalNumber}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {copy.postingHint}
          </p>
        </section>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {copy.definition}
      </p>
    </IndiceModalFrame>
  );
}
