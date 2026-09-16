import type { KpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import type { KpiTableModel } from './ReceivablesKpiTable';
import { agingKeys, daysLate, type ReceivablesKpiSelection } from './receivablesKpiSelectors';
import type { buildReceivablesKpiQueries } from './receivablesKpiQueries';
import { completeAmount } from './useReceivablesKpiAggregates';
import type { ReceivablesKpiCopy } from './workspaceCopy';

export const kpiMoney = (value: number | null, currency: string, locale: string, unavailable: string) => value === null || !Number.isFinite(value) ? unavailable : new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(value);
export type KpiCard = { key: string; title: string; value: string; description: string; helper: string; context?: string };
export function buildReceivablesKpiPresentation(selection: ReceivablesKpiSelection, groups: ReturnType<typeof buildReceivablesKpiQueries>, data: Record<string, KpiMonetaryAggregate>, copy: ReceivablesKpiCopy, currency: string, locale: string) {
  const value = (key: string) => completeAmount(data[key]);
  const money = (key: string) => kpiMoney(value(key), currency, locale, copy.unavailable);
  const nativeContext = (key: string) => {
    const aggregate = data[key];
    if (!aggregate) return '';
    const nativeTotals = aggregate.nativeTotals
      .map(row => kpiMoney(row.amount, row.currency, locale, copy.unavailable))
      .join(' / ');
    const exclusions = aggregate.excludedRecords > 0
      ? `${copy.excluded}: ${aggregate.excludedRecords}${aggregate.excludedCurrencies.length ? ` (${aggregate.excludedCurrencies.join(', ')})` : ''}`
      : '';
    return [nativeTotals, exclusions].filter(Boolean).join(' · ');
  };
  const percent = (amount: number | null, total: number | null) => amount === null || total === null ? copy.unavailable : total > 0 ? new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(amount / total) : copy.noSample;
  const count = (value: number) => value.toLocaleString(locale);
  const incomplete = selection.missingSchedule.length > 0;
  const statuses = { on_time: copy.statusOnTime, due_soon: copy.statusDueSoon, overdue: copy.statusOverdue, partial: copy.statusPartial, paid: copy.statusPaid, restructured: copy.statusRestructured, cancelled: copy.statusCancelled };
  const cards: KpiCard[] = [
    { key: 'balance', title: copy.balance, value: money('balance'), description: copy.balanceHelp, helper: copy.asOf + ': ' + selection.asOfDate, context: nativeContext('balance') },
    { key: 'overdue', title: copy.overdue, value: incomplete ? copy.unavailable : money('overdue'), description: copy.overdueHelp, helper: `${count(new Set(selection.overdue.map(row => row.receivableId)).size)} · ${copy.overdueAccounts}`, context: nativeContext('overdue') },
    { key: 'delinquency', title: copy.delinquency, value: incomplete ? copy.unavailable : percent(value('overdue'), value('balance')), description: copy.delinquencyHelp, helper: currency },
    { key: 'upcoming', title: copy.upcoming, value: incomplete ? copy.unavailable : money('upcoming'), description: copy.upcomingHelp, helper: copy.asOf + ': ' + selection.asOfDate, context: nativeContext('upcoming') },
    { key: 'collected', title: copy.collected, value: money('collected'), description: copy.collectedHelp, helper: `${selection.range.from || copy.all} — ${selection.range.to}`, context: nativeContext('collected') },
    { key: 'accounts', title: copy.accounts, value: count(selection.open.length), description: copy.accountsHelp, helper: copy.asOf + ': ' + selection.asOfDate },
    { key: 'customers', title: copy.customers, value: count(selection.identifiedCustomers.size), description: copy.customersHelp, helper: `${copy.unlinked}: ${count(selection.unlinkedCustomers.length)}` },
    { key: 'evidence', title: copy.evidence, value: percent(selection.withReceipt.length, selection.payments.length), description: copy.evidenceHelp, helper: `${count(selection.withReceipt.length)} / ${count(selection.payments.length)}` },
  ];
  const model = (id: string, title: string, description: string, columns: string[], rows: KpiTableModel['rows']): KpiTableModel => ({ id, title, description, columns, rows, sortable: columns.map((_, index) => index) });
  const groupRows = (kind: 'unit' | 'customer', list: typeof groups.units) => list.map(group => {
    const prefix = `${kind}:${group.key}:`;
    const balance = value(prefix + 'balance');
    const unknown = selection.missingSchedule.some(row => group.rows.some(account => account.id === row.id));
    const late = unknown ? null : value(prefix + 'overdue');
    const label = kind === 'unit' ? group.key === 'unassigned' ? copy.unassigned : group.rows[0].unit : group.rows[0].customerName + (group.key.startsWith('account:') ? ` · ${group.rows[0].saleNumber}` : '');
    const share = percent(balance, value('balance'));
    return { id: group.key, cells: [label, kpiMoney(balance, currency, locale, copy.unavailable), kpiMoney(late, currency, locale, copy.unavailable), money(prefix + 'collected'), share], values: [label, balance, late, value(prefix + 'collected'), balance] };
  });
  const tables = {
    units: model('units', copy.units, copy.unitHelp, [copy.unit, copy.balance, copy.overdue, copy.collected, copy.share], groupRows('unit', groups.units)),
    customers: model('customers', copy.concentration, copy.concentrationHelp, [copy.customer, copy.balance, copy.overdue, copy.collected, copy.share], groupRows('customer', groups.customers)),
    accounts: model('accounts', copy.details, copy.detailHelp, [copy.reference, copy.customer, copy.unit, copy.balance, copy.days, copy.status], selection.accounts.map(row => {
      const lateDays = selection.installments.filter(inst => inst.receivableId === row.id).map(inst => daysLate(inst.dueDate, selection.asOfDate));
      const late = selection.missingSchedule.some(account => account.id === row.id) ? null : Math.max(0, ...lateDays.filter((day): day is number => day !== null));
      return { id: row.id, cells: [row.saleNumber, row.customerName, row.unitId == null ? copy.unassigned : row.unit, kpiMoney(row.balance, row.currency, locale, copy.unavailable), late === null ? copy.unavailable : count(late), statuses[late !== null && late > 0 && row.status !== 'cancelled' ? 'overdue' : row.status]], values: [row.saleNumber, row.customerName, row.unit, null, late, row.status] };
    })),
    payments: model('payments', copy.payments, copy.detailHelp, [copy.reference, copy.customer, copy.date, copy.amount, copy.receipt], selection.payments.map(row => ({ id: row.id, cells: [row.saleNumber, row.customerName, row.paymentDate, kpiMoney(row.amount, row.currency ?? currency, locale, copy.unavailable), row.receiptDataUrl || row.receiptImageDataUrl ? copy.yes : copy.no] }))),
    aging: model('aging', copy.aging, copy.agingHelp, [copy.aging, copy.amount], agingKeys.map(key => ({ id: key, cells: [copy[key], money(`aging:${key}`)], values: [copy[key], value(`aging:${key}`)] }))),
    trend: model('trend', copy.trend, copy.trendHelp, [copy.date, copy.collected], groups.months.map(month => ({ id: month, cells: [month, money(`month:${month}`)], values: [month, value(`month:${month}`)] }))),
  };
  // Native money columns are deliberately not sorted numerically across currencies.
  tables.accounts.sortable = [0, 1, 2, 4, 5];
  tables.payments.sortable = [0, 1, 2, 4];
  return { cards, tables };
}
