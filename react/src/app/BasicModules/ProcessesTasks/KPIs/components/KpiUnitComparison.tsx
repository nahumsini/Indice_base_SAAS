import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Button } from '../../../../components/ui/button';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import type { UnitPerformanceRow } from '../kpisApi';
import { getTaskKpiWorkspaceCopy } from '../translations/workspaceCopy';

type SortKey = 'unitName' | 'tasks' | 'openTasks' | 'lateOpenTasks' | 'onTimeRate' | 'averageRating';
export function KpiUnitComparison({ rows, locale, scopeKey, onOpenUnit, active }: {
  active: boolean; rows: UnitPerformanceRow[]; locale: string; scopeKey: string; onOpenUnit: (id: number) => void;
}) {
  const c = getTaskKpiWorkspaceCopy(locale);
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: 'lateOpenTasks', ascending: false });
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const left = sort.key === 'unitName' ? a.unitName : a.measurements?.[sort.key];
    const right = sort.key === 'unitName' ? b.unitName : b.measurements?.[sort.key];
    if (left == null) return right == null ? 0 : 1;
    if (right == null) return -1;
    const difference = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), locale);
    return sort.ascending ? difference : -difference;
  }), [rows, sort, locale]);
  const pagination = useTablePagination({ rows: sorted, resetKey: `${scopeKey}:${sort.key}:${sort.ascending}` });
  const columns: Array<[SortKey, string]> = [['unitName', c.units], ['tasks', c.tasks], ['openTasks', c.open], ['lateOpenTasks', c.late], ['onTimeRate', c.onTime], ['averageRating', c.quality]];
  const number = (value: number | null | undefined, suffix = '') => value == null ? c.noSample : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <div className="p-5"><h3 className="text-lg font-medium text-slate-900 dark:text-white">{c.allUnits} · {rows.length}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.unitsNote}</p></div>
    {active && pagination.paginatedRows.length > 0 ? <div className="mx-5 mb-5 max-h-[520px] overflow-y-auto">
      <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{c.onTime} · {pagination.pageStart}–{pagination.pageEnd} / {rows.length}</p>
      <div style={{ height: Math.max(180, pagination.paginatedRows.length * 38) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={pagination.paginatedRows} layout="vertical" margin={{ left: 8, right: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} unit="%" /><YAxis type="category" dataKey="unitName" width={130} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="measurements.onTimeRate" name={c.onTime} unit="%" fill="#F4C84A" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
    </div> : null}
    <div className="overflow-x-auto"><Table className="min-w-[900px]"><TableHeader><TableRow>{columns.map(([key, label]) => <TableHead key={key} aria-sort={sort.key === key ? sort.ascending ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => setSort({ key, ascending: sort.key === key ? !sort.ascending : true })} className="flex min-h-10 items-center gap-2 rounded-lg text-left text-sm focus-visible:outline-2 focus-visible:outline-[#F4C84A]">{label}<ArrowUpDown className="h-3.5 w-3.5" /></button></TableHead>)}<TableHead>{c.action}</TableHead></TableRow></TableHeader><TableBody>
      {pagination.paginatedRows.map(row => <TableRow key={row.unitId ?? 'unassigned'}><TableCell className="font-medium">{row.unitName}</TableCell><TableCell>{number(row.measurements?.tasks)}</TableCell><TableCell>{number(row.measurements?.openTasks)}</TableCell><TableCell>{number(row.measurements?.lateOpenTasks)}</TableCell><TableCell><span>{number(row.measurements?.onTimeRate, '%')}</span><p className="text-xs text-slate-500">{c.sample}: {row.measurements?.eligibleDeliveries ?? '—'}</p></TableCell><TableCell>{number(row.measurements?.averageRating, '/5')}</TableCell><TableCell><Button type="button" variant="outline" disabled={row.unitId == null} onClick={() => row.unitId != null && onOpenUnit(row.unitId)}>{c.action}</Button></TableCell></TableRow>)}
      {rows.length === 0 ? <TableRow><TableCell colSpan={7} className="p-10 text-center">{c.empty}</TableCell></TableRow> : null}
    </TableBody></Table></div>
    <DataTablePagination currentPage={pagination.currentPage} onPageChange={pagination.onPageChange} onPageSizeChange={pagination.onPageSizeChange} pageEnd={pagination.pageEnd} pageSize={pagination.pageSize} pageSizeOptions={pagination.pageSizeOptions} pageStart={pagination.pageStart} totalCount={pagination.totalCount} totalPages={pagination.totalPages} />
  </section>;
}
