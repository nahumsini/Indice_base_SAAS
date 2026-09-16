import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DataTablePagination } from '../../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../../hooks/useTablePagination';
import { IndiceFilterSelect } from '../../../../components/frontend-os';
import type { FinanceExpense } from '../../types/finance-domain.types';
import type { FinancialOverviewBudgetHealthRow, FinancialOverviewCostDriver } from '../../types/financial-overview.types';
import { expenseIssues, hasEvidence, matchesExpenseIssue, type ExpenseIssue } from '../expenseKpiSelectors';
import type { ExpenseWorkspaceCopy } from '../translations/workspaceCopy';
import { getCachedAuthSession } from '../../../../api/authSessionStore';
import { canAccessModuleTab } from '../../../../access/tabScopeCatalog';
import { useAuthorizationRevision } from '../../../../hooks/useAuthorizationRevision';
import { SectionCard } from './ExpenseKpiPrimitives';

type UnitRow = { id: string; name: string; count: number; open: number; evidence: number; total: number | null };
type ResponsibleRow = { id: string; name: string; count: number; total: number; overdue: number; paymentRatio: number; evidenceRatio: number };
type Money = (value: number) => string;
type PaginationState = { currentPage: number; pageSize: number };
const cell = 'px-4 py-3 text-sm text-slate-700 dark:text-slate-200';
const action = 'rounded text-[#147514] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514] dark:text-emerald-300';

function DataState({ ready, empty, copy, children, height = 300, active = true }: { ready: boolean; empty: boolean; copy: ExpenseWorkspaceCopy; children: ReactNode; height?: number; active?: boolean }) {
  return <div style={{ height }} className="min-w-0">{!ready || empty
    ? <p className="flex h-full items-center justify-center text-center text-sm text-slate-500">{ready ? copy.noData : copy.unavailable}</p>
    : active ? children : null}</div>;
}

function RowsTable<Row>({ rows, columns, rowKey, resetKey, copy, ready = true, paginationState, onPaginationChange }: {
  rows: Row[]; columns: Array<{ label: string; render: (row: Row) => ReactNode }>;
  rowKey: (row: Row) => string; resetKey: string; copy: ExpenseWorkspaceCopy; ready?: boolean; paginationState?: PaginationState; onPaginationChange?: (state: PaginationState) => void;
}) {
  const pagination = useTablePagination({ rows, resetKey, controlledCurrentPage: paginationState?.currentPage, controlledPageSize: paginationState?.pageSize, onPaginationChange });
  return <>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/60"><tr>{columns.map(c => <th key={c.label} className="px-4 py-3 font-medium">{c.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{ready && pagination.paginatedRows.map(row => <tr key={rowKey(row)}>{columns.map(c => <td key={c.label} className={cell}>{c.render(row)}</td>)}</tr>)}
        {(!ready || rows.length === 0) && <tr><td className={`${cell} py-10 text-center`} colSpan={columns.length}>{ready ? copy.noData : copy.unavailable}</td></tr>}
      </tbody></table></div>
    <DataTablePagination {...pagination} itemLabel={copy.records} />
  </>;
}

export function ExpenseKpiAnalysis({ active, copy, money, groupReady, budgetReady, taxReady, driverReady, hasCutoff, paymentMix, trend, budgetRows, budgetLabels, aging, forecast, tax, drivers, onDriver }: {
  active: boolean; copy: ExpenseWorkspaceCopy; money: Money; groupReady: boolean; budgetReady: boolean; taxReady: boolean; driverReady: boolean; hasCutoff: boolean;
  paymentMix: Array<{ key: string; color: string; name: string; value: number }>;
  trend: Array<{ date: string; amount: number; paid: number }>;
  budgetRows: FinancialOverviewBudgetHealthRow[];
  budgetLabels: { planned: string; committed: string; actual: string; available: string };
  aging: Array<{ key: string; color: string; total: number }>;
  forecast: Array<{ days: number; total: number }>;
  tax: { subtotal: number; taxes: number; effectiveRate: number };
  drivers: Array<{ key: string; title: string; rows: FinancialOverviewCostDriver[] }>;
  onDriver: (key: string, id: string) => void;
}) {
  const tooltip = (value: unknown) => money(Number(value));
  const [budgetOpen, setBudgetOpen] = useState(false);
  return <div className="grid gap-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title={copy.trend} subtitle={copy.trendHelp}><DataState active={active} ready={groupReady} empty={!trend.length} copy={copy}><ResponsiveContainer><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis width={70} tick={{ fontSize: 11 }} /><Tooltip formatter={tooltip} /><Legend /><Area type="monotone" dataKey="amount" name={copy.captured} stroke="#147514" fill="#147514" fillOpacity={0.1} /><Area type="monotone" dataKey="paid" name={copy.paid} stroke="#397D64" fill="transparent" /></AreaChart></ResponsiveContainer></DataState></SectionCard>
      <SectionCard title={copy.paymentMix} subtitle={copy.mixHelp}><DataState active={active} ready={groupReady} empty={!paymentMix.length} copy={copy}>{paymentMix.length === 1 ? <div className="flex h-full flex-col items-center justify-center gap-4">
        <div aria-label={`${paymentMix[0].name}: ${money(paymentMix[0].value)}`} className="relative h-44 w-44 rounded-full shadow-inner" data-expense-kpi-single-segment="payment-mix" role="img" style={{ backgroundColor: paymentMix[0].color }}><span className="absolute inset-[34px] rounded-full bg-white shadow-sm dark:bg-slate-800" /></div>
        <p className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paymentMix[0].color }} /><span>{paymentMix[0].name}</span><span className="font-medium">{money(paymentMix[0].value)}</span></p>
      </div> : <ResponsiveContainer><PieChart><Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={70} outerRadius={95}>{paymentMix.map(row => <Cell key={row.key} fill={row.color} />)}</Pie><Tooltip formatter={tooltip} /><Legend /></PieChart></ResponsiveContainer>}</DataState></SectionCard>
      <SectionCard title={copy.aging} subtitle={copy.agingHelp}>{groupReady && hasCutoff ? <div className="space-y-4">{aging.map(row => <div key={row.key}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{row.key === 'future' ? copy.future : row.key === 'none' ? copy.undated : `${row.key} ${copy.days}`}</span><span>{money(row.total)}</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.total / Math.max(1, ...aging.map(item => item.total)) * 100}%` }} /></div></div>)}</div> : <p>{copy.unavailable}</p>}</SectionCard>
      <SectionCard title={copy.forecast} subtitle={copy.forecastHelp}><DataState active={active} ready={groupReady && hasCutoff} empty={false} copy={copy}><ResponsiveContainer><BarChart data={forecast.map(row => ({ ...row, name: `${row.days} ${copy.days}` }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis width={70} tick={{ fontSize: 11 }} /><Tooltip formatter={tooltip} /><Bar dataKey="total" name={copy.outstanding} fill="#147514" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></DataState></SectionCard>
    </div>
    <SectionCard title={copy.budget} subtitle={copy.budgetScope}>
      <DataState active={active} ready={budgetReady} empty={!budgetRows.length} copy={copy}><ResponsiveContainer><BarChart data={budgetRows.slice(0, 7)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis width={70} tick={{ fontSize: 11 }} /><Tooltip formatter={tooltip} /><Legend /><Bar dataKey="planned" name={budgetLabels.planned} fill="#cbd5e1" /><Bar dataKey="actual" name={budgetLabels.actual} fill="#147514" /><Bar dataKey="committed" name={budgetLabels.committed} fill="#84B984" /></BarChart></ResponsiveContainer></DataState>
      <p className="mt-2 text-xs text-slate-500">{copy.budgetHelp}</p>
      <button className={`${action} mt-4`} type="button" aria-expanded={budgetOpen} onClick={() => setBudgetOpen(value => !value)}>{copy.details} ({budgetRows.length})</button>
      <div hidden={!budgetOpen}><RowsTable rows={budgetRows} rowKey={row => row.id} resetKey={budgetRows.map(row => row.id).join(',')} copy={copy} ready={budgetReady} columns={[
        { label: copy.budget, render: row => row.name }, ...(['planned', 'committed', 'actual', 'available'] as const).map(key => ({ label: budgetLabels[key], render: (row: FinancialOverviewBudgetHealthRow) => money(row[key]) })),
      ]} /></div>
    </SectionCard>
    <SectionCard title={copy.tax} subtitle={copy.taxHelp}><div className="grid gap-4 sm:grid-cols-3">{[
      { label: copy.subtotal, value: money(tax.subtotal) }, { label: copy.tax, value: money(tax.taxes) }, { label: copy.effectiveRate, value: tax.subtotal > 0 ? `${tax.effectiveRate.toFixed(1)}%` : '—' },
    ].map(row => <div key={row.label} className="rounded-xl bg-[#147514]/5 p-4"><p className="text-sm text-slate-500">{row.label}</p><p className="mt-2 text-xl font-medium">{taxReady ? row.value : '—'}</p></div>)}</div></SectionCard>
    <div className="grid gap-6 lg:grid-cols-3">{drivers.map(driver => <SectionCard key={driver.key} title={driver.title} subtitle={copy.concentrationHelp}>
      {!driverReady ? <p>{copy.unavailable}</p> : !driver.rows.length ? <p>{copy.noData}</p> : <ol className="space-y-4">{driver.rows.slice(0, 5).map(row => <li key={row.id}><button type="button" disabled={row.id.startsWith('missing-')} onClick={() => onDriver(driver.key, row.id)} className={`${action} w-full text-left disabled:cursor-default`}><span className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{row.name}</span><span className="shrink-0">{money(row.total)}</span></span><span className="mt-1 block text-xs text-slate-500">{row.percentage.toFixed(1)}% · {row.count} {copy.records}</span></button></li>)}</ol>}
    </SectionCard>)}</div>
  </div>;
}

export function ExpenseKpiUnits({ active, rows, ready, money, copy, resetKey, onSelect }: {
  active: boolean; rows: UnitRow[]; ready: boolean; money: Money; copy: ExpenseWorkspaceCopy; resetKey: string; onSelect: (id: string) => void;
}) {
  const [order, setOrder] = useState('total');
  const sorted = useMemo(() => [...rows].sort((a, b) => order === 'name' ? a.name.localeCompare(b.name) : order === 'open' ? b.open - a.open : (b.total ?? -Infinity) - (a.total ?? -Infinity)), [rows, order]);
  const pagination = useTablePagination({ rows: sorted, resetKey: `${resetKey}:${order}` });
  return <SectionCard title={copy.units} subtitle={copy.unitHelp}>
    <div className="mb-4 max-w-xs"><IndiceFilterSelect tone="green" label={copy.role} value={order} onValueChange={setOrder} options={[{ value: 'total', label: copy.captured }, { value: 'open', label: copy.open }, { value: 'name', label: copy.unit }]} /></div>
    {active ? <><DataState ready={ready} empty={!rows.length} copy={copy}><ResponsiveContainer><BarChart data={pagination.paginatedRows} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} /><Tooltip formatter={value => money(Number(value))} /><Bar dataKey="total" name={copy.captured} fill="#147514" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></DataState><p className="my-3 text-xs text-slate-500">{copy.pageChart}</p></> : null}
    <div className="overflow-x-auto"><table className="min-w-[650px] w-full text-left"><thead className="bg-slate-50 dark:bg-slate-900/60"><tr>{[copy.unit, copy.records, copy.captured, copy.open, copy.evidence].map(label => <th key={label} className={`${cell} font-medium`}>{label}</th>)}</tr></thead><tbody>{pagination.paginatedRows.map(row => <tr key={row.id} className="border-t border-slate-100 dark:border-slate-700"><td className={cell}><button className={action} disabled={row.id === 'unassigned'} onClick={() => onSelect(row.id)}>{row.name}</button></td><td className={cell}>{row.count}</td><td className={cell}>{ready && row.total !== null ? money(row.total) : '—'}</td><td className={cell}>{row.open}</td><td className={cell}>{row.evidence} / {row.count}</td></tr>)}{!rows.length && <tr><td colSpan={5} className={`${cell} py-10 text-center`}>{copy.noData}</td></tr>}</tbody></table></div>
    <DataTablePagination {...pagination} itemLabel={copy.records} />
  </SectionCard>;
}

export function ExpenseKpiControl({ expenses, responsibleRows, responsibleReady, copy, money, locale, asOfDate, resetKey, role, setRole, providerNames, statusLabels, paginationState, onPaginationChange }: {
  expenses: FinanceExpense[]; responsibleRows: ResponsibleRow[]; responsibleReady: boolean; copy: ExpenseWorkspaceCopy; money: Money; locale: string; asOfDate?: string; resetKey: string;
  role: string; setRole: (role: 'requested' | 'approved' | 'performed') => void; providerNames: Map<string, string>; statusLabels: Record<string, string>; paginationState: PaginationState; onPaginationChange: (state: PaginationState) => void;
}) {
  useAuthorizationRevision();
  const canOpenExpenses = canAccessModuleTab('expenses', 'expenses', getCachedAuthSession() ?? null);
  const [entity, setEntity] = useState('expenses');
  const [issue, setIssue] = useState<ExpenseIssue>('all');
  const selected = expenses.filter(row => matchesExpenseIssue(row, issue, asOfDate));
  const native = (amount: number, currency: string) => new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);
  const date = (value?: string) => value ? new Intl.DateTimeFormat(locale).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '—';
  return <div className="grid gap-6">
    <div className="max-w-sm"><IndiceFilterSelect tone="green" label={copy.details} value={entity} onValueChange={setEntity} options={[{ value: 'expenses', label: copy.expenses }, { value: 'responsible', label: copy.responsible }]} /></div>
    <div hidden={entity !== 'expenses'} className={entity === 'expenses' ? 'grid gap-6' : 'hidden'}>
      <SectionCard title={copy.controls} subtitle={copy.controlsHelp}><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{expenseIssues.map(key => <button type="button" key={key} aria-pressed={issue === key} onClick={() => setIssue(issue === key ? 'all' : key)} className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147514] ${issue === key ? 'border-[#147514] bg-[#147514]/10' : 'border-slate-200 dark:border-slate-700'}`}><span>{copy[key]}</span><span className="font-medium">{expenses.filter(row => matchesExpenseIssue(row, key, asOfDate)).length}</span></button>)}</div></SectionCard>
      <SectionCard title={copy.expenses} subtitle={`${selected.length} / ${expenses.length} ${copy.records}`}>
        <div className="mb-4 max-w-sm"><IndiceFilterSelect tone="green" label={copy.controls} value={issue} onValueChange={value => setIssue(value as ExpenseIssue)} options={['all', ...expenseIssues, 'open', 'overdue'].map(key => ({ value: key, label: copy[key as ExpenseIssue] }))} /></div>
        <RowsTable rows={selected} rowKey={row => row.id} resetKey={`${resetKey}:${issue}`} copy={copy} columns={[
          { label: copy.folio, render: row => <><p>{row.folio}</p><p className="text-xs text-slate-500">{row.concept || row.description}</p><p className="text-xs text-slate-500">{providerNames.get(row.providerId ?? '')}</p></> },
          { label: copy.dueDate, render: row => date(row.dueDate) },
          { label: copy.nativeAmount, render: row => native(row.total, row.currency) },
          { label: copy.balance, render: row => native(row.balance, row.currency) },
          { label: copy.status, render: row => statusLabels[row.paymentStatus] ?? copy.unavailable },
          { label: copy.evidence, render: row => hasEvidence(row) ? String(row.attachmentCount ?? row.attachments.length) : '0' },
          { label: copy.details, render: row => canOpenExpenses ? <Link className={action} to={`/expenses/expenses?${new URLSearchParams({ ex_q: row.folio || row.concept || row.description, ex_period: 'custom', ex_unit: row.unitId || 'all', ex_business: row.businessId || 'all', ex_provider: row.providerId || 'all', ex_status: 'all' })}`}>{copy.details}</Link> : '—' },
        ]} />
      </SectionCard>
    </div>
    <div hidden={entity !== 'responsible'}><SectionCard title={copy.responsible} subtitle={copy.responsibilityHelp}>
      <div className="mb-4 max-w-sm"><IndiceFilterSelect tone="green" label={copy.role} value={role} onValueChange={value => setRole(value as 'requested' | 'approved' | 'performed')} options={(['requested', 'approved', 'performed'] as const).map(value => ({ value, label: copy[value] }))} /></div>
      <RowsTable paginationState={paginationState} onPaginationChange={onPaginationChange} rows={responsibleRows} ready={responsibleReady} rowKey={row => row.id} resetKey={`${resetKey}:${role}`} copy={copy} columns={[
        { label: copy.responsible, render: row => row.name }, { label: copy.records, render: row => row.count },
        { label: copy.captured, render: row => money(row.total) }, { label: copy.paymentProgress, render: row => row.total > 0 ? `${row.paymentRatio.toFixed(1)}%` : '—' },
        { label: copy.evidence, render: row => `${row.evidenceRatio.toFixed(1)}%` }, { label: copy.overdue, render: row => money(row.overdue) },
      ]} />
    </SectionCard></div>
  </div>;
}
