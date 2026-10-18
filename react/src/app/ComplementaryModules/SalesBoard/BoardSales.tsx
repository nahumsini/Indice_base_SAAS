import { useMemo } from 'react';
import { Eye, Receipt } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { TableBody, TableCell, TableRow } from '../../components/ui/table';
import { IndiceTableShell, IndiceOperationalTable, IndiceTableColGroup, IndiceTableHeaderRow, type IndiceTableColumnDefinition } from '../../components/table/IndiceTableEngine';
import { DataTablePagination } from '../../components/table/DataTablePagination';
import { IndiceModalFrame } from '../../components/indice-modal';
import { usePersistentColumnWidths } from '../../hooks/usePersistentColumnWidths';
import { channelLabel, originLabel, statusLabel, type BoardCopy } from './boardCopy';
import { dateLabel, moneyLabel, type BoardFilters, type SaleRow, type Workspace } from './boardModel';

type Column = 'date' | 'number' | 'customer' | 'origin' | 'amount' | 'status';
const widths = { date: 160, number: 180, customer: 250, origin: 200, amount: 200, status: 200 };
const sortable: Column[] = ['date', 'number', 'customer'];
export function BoardSales({ data, filters, onFilters, onSelect, copy, locale }: { data: Workspace; filters: BoardFilters; onFilters: (next: BoardFilters) => void; onSelect: (row: SaleRow) => void; copy: BoardCopy; locale: string }) {
  const labels = useMemo(() => ({ date: copy.date, number: copy.number, customer: copy.customer, origin: copy.origin, amount: copy.amount, status: copy.status }), [copy]);
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<Column>({ defaults: widths, headerLabels: labels, sortableColumnIds: sortable, storageKey: 'sales-board-columns-v1' });
  const columns: IndiceTableColumnDefinition<Column>[] = (Object.keys(widths) as Column[]).map(id => ({ id, label: labels[id], width: columnWidths[id], defaultWidth: widths[id], contentMinimumWidth: widths[id], sortable: sortable.includes(id), resizeLabel: `${copy.resize}: ${labels[id]}` }));
  return <IndiceTableShell pagination={<DataTablePagination currentPage={filters.page} pageSize={filters.pageSize} pageSizeOptions={[10, 25, 50, 100, 200]} totalCount={data.total} totalPages={Math.max(1, Math.ceil(data.total / filters.pageSize))} pageStart={(filters.page - 1) * filters.pageSize + 1} pageEnd={Math.min(filters.page * filters.pageSize, data.total)} onPageChange={page => onFilters({ ...filters, page })} onPageSizeChange={pageSize => onFilters({ ...filters, pageSize, page: 1 })} />}>
    <IndiceOperationalTable minimumWidth={Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 80}>
      <IndiceTableColGroup columns={columns} actionsWidth={80} />
      <IndiceTableHeaderRow columns={columns} tone="coral" onResize={resizeColumn} sortState={{ columnId: filters.sort as Column, direction: filters.direction as 'asc' | 'desc' }} onSort={sort => onFilters({ ...filters, sort, direction: filters.sort === sort && filters.direction === 'asc' ? 'desc' : 'asc', page: 1 })} actions={{ label: copy.actions, width: 80 }} />
      <TableBody>{data.items.map(row => <TableRow key={row.sale.id}>
        <TableCell>{dateLabel(row.sale.date, locale)}</TableCell><TableCell><button className="min-h-11 text-left font-medium underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]" onClick={() => onSelect(row)} aria-label={`${copy.detail}: ${row.sale.number}`}>{row.sale.number}</button></TableCell>
        <TableCell><div>{row.sale.customer || '—'}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.sale.seller || '—'}</div></TableCell><TableCell>{originLabel(row.sale.origin, copy)}<div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{channelLabel(row.sale.channel, copy)}</div></TableCell>
        <TableCell className="tabular-nums">{moneyLabel(row.sale.total, row.sale.currency, locale)}</TableCell><TableCell><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">{statusLabel(row.sale.commercialStatus, copy)}</span></TableCell>
        <TableCell><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.detail}: ${row.sale.number}`} onClick={() => onSelect(row)}><Eye className="h-4 w-4" /></Button></TableCell>
      </TableRow>)}</TableBody>
    </IndiceOperationalTable>
  </IndiceTableShell>;
}
export function SaleDetail({ row, copy, locale, onClose }: { row: SaleRow; copy: BoardCopy; locale: string; onClose: () => void }) {
  const { sale, accounting } = row;
  const fields = [[copy.date, dateLabel(sale.date, locale)], [copy.customer, sale.customer], [copy.seller, sale.seller], [copy.origin, originLabel(sale.origin, copy)], [copy.channel, channelLabel(sale.channel, copy)], [copy.unit, sale.unitName], [copy.business, sale.businessName], [copy.ticket, sale.ticketNumber], [copy.amount, moneyLabel(sale.total, sale.currency, locale)], [copy.tax, moneyLabel(sale.tax, sale.currency, locale)], [copy.discount, moneyLabel(sale.discount, sale.currency, locale)], [copy.status, statusLabel(sale.commercialStatus, copy)], [copy.finance, statusLabel(sale.financeStatus, copy)], [copy.inventory, statusLabel(sale.inventoryStatus, copy)], [copy.delivery, statusLabel(sale.deliveryStatus, copy)]];
  return <IndiceModalFrame open onOpenChange={open => { if (!open) onClose(); }} title={`${copy.detail} · ${sale.number}`} description={copy.definition} icon={<Receipt />} modalType="operational-workspace" tone="coral" closeLabel={copy.close} footer={<Button variant="outline" onClick={onClose}>{copy.close}</Button>}>
    <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd></div>)}</dl>
    <section className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-medium">{copy.accounting}</h3><p className="mt-2 text-sm">{accounting.state === 'REVERSED' ? copy.reversed : accounting.state === 'POSTED' ? copy.posted : copy.unposted}</p>{accounting.number && <p className="mt-1 text-sm">{accounting.number} · {accounting.date ? dateLabel(accounting.date, locale) : '—'}</p>}{accounting.reversalNumber && <p className="text-sm">{copy.reversed}: {accounting.reversalNumber}</p>}<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{copy.postingHint}</p></section>
  </IndiceModalFrame>;
}
