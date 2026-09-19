import type { KpiMonetaryAggregate } from '../../shared/kpiMonetaryApi';
import type { PettyCashTranslations } from '../translations';
import type { PettyCashKpiSelection } from './pettyCashKpiSelectors';
import type { buildPettyCashKpiQueries } from './pettyCashKpiQueries';
import type { PettyCashKpiCopy } from './workspaceCopy';
import { completeAmount } from './usePettyCashKpiAggregates';
import type { KpiTableModel } from './components/PettyCashKpiTable';

export function buildPettyCashKpiTables(selection: PettyCashKpiSelection, groups: ReturnType<typeof buildPettyCashKpiQueries>, aggregates: Record<string, KpiMonetaryAggregate>, copy: PettyCashKpiCopy, moduleCopy: PettyCashTranslations, locale: string, preferredCurrency: string): Record<string, KpiTableModel> {
  const money = (amount: number | null, currency = preferredCurrency) => amount === null ? copy.unavailable : new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code' }).format(amount);
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}/.test(value) ? new Intl.DateTimeFormat(locale).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : value || '—';
  const fundName = (id: string) => selection.fundMap.get(id)?.name ?? '—';
  const groupModel = (id: string, kind: 'unit' | 'fund' | 'responsible', title: string, description: string, rows: typeof groups.units): KpiTableModel => ({
    id, title, description, columns: [kind === 'unit' ? copy.unit : kind === 'fund' ? copy.funds : copy.responsible, copy.statements, copy.captured, copy.authorized, copy.pending], sortable: [0, 1, 2, 3, 4],
    rows: rows.map(group => {
      const label = kind === 'unit' ? selection.funds.find(fund => fund.unitId === group.key)?.unitName : kind === 'fund' ? fundName(group.key) : group.rows[0]?.responsibleName;
      const values = ['captured', 'authorized', 'pending'].map(metric => completeAmount(aggregates[`${kind}:${group.key}:${metric}`]));
      return { id: group.key, cells: [label || '—', group.rows.length.toLocaleString(locale), ...values.map(value => money(value))], values: [label || '', group.rows.length, ...values] };
    }),
  });
  return {
    periods: { id: 'periods', title: copy.trend, description: copy.trendHelp, columns: [copy.period, copy.captured, copy.authorized, copy.pending], sortable: [0, 1, 2, 3], rows: groups.periods.map(group => {
      const amounts = ['captured', 'authorized', 'pending'].map(metric => completeAmount(aggregates[`period:${group.key}:${metric}`]));
      return { id: group.key, cells: [group.key, ...amounts.map(value => money(value))], values: [group.key, ...amounts] };
    }) },
    units: groupModel('units', 'unit', copy.units, copy.unitHelp, groups.units),
    funds: groupModel('funds', 'fund', copy.byFund, copy.compositionHelp, groups.funds),
    responsibles: groupModel('responsibles', 'responsible', copy.byResponsible, copy.historicalResponsible, groups.responsibles),
    statements: { id: 'statements', title: copy.statements, description: copy.statementHelp, columns: [moduleCopy.financial.statements.columns.statement, copy.funds, copy.period, copy.responsible, copy.captured, copy.authorized, copy.recordedClosing, copy.shortage, copy.receiptStatus], sortable: [0, 1, 2, 3, 8], rows: selection.statements.map(row => ({ id: row.id, cells: [row.folio, fundName(row.pettyCashFundId), row.periodKey, row.responsibleName, money(row.estimatedUsageAmount, row.currencyCode), money(row.verifiedExpenseAmount, row.currencyCode), money(row.declaredClosingBalanceAmount, row.currencyCode), money(row.shortageAmount, row.currencyCode), moduleCopy.status.statement[row.status]] })) },
    receipts: { id: 'receipts', title: copy.receipt, description: copy.receiptHelp, columns: [copy.receipt, copy.funds, copy.statements, copy.date, copy.amount, copy.attachments, copy.receiptStatus], sortable: [0, 1, 2, 3, 5, 6], rows: selection.lines.map(row => ({ id: row.id, cells: [row.description, fundName(row.pettyCashFundId), selection.statementMap.get(row.pettyCashStatementId)?.folio ?? '—', date(row.expenseDate), money(row.totalAmount, row.currencyCode), row.attachmentCount.toLocaleString(locale), moduleCopy.status.line[row.status]], values: [row.description, fundName(row.pettyCashFundId), row.pettyCashStatementId, row.expenseDate, null, row.attachmentCount, moduleCopy.status.line[row.status]] })) },
    movements: { id: 'movements', title: copy.movements, description: copy.statementHelp, columns: [copy.movementType, copy.funds, copy.date, copy.amount, moduleCopy.financial.movements.columns.reference, moduleCopy.financial.movements.columns.source, moduleCopy.financial.movements.columns.target], sortable: [0, 1, 2, 4, 5, 6], rows: selection.movements.map(row => ({ id: row.id, cells: [moduleCopy.status.movement[row.type], fundName(row.pettyCashFundId), date(row.movementDate), money(row.amount, row.currencyCode), row.reference || '—', row.fromPaymentAccountName || row.externalSourceName || '—', row.toPaymentAccountName || '—'], values: [moduleCopy.status.movement[row.type], fundName(row.pettyCashFundId), row.movementDate] })) },
    balances: { id: 'balances', title: copy.balance, description: copy.balanceHelp, columns: [copy.funds, copy.unit, copy.business, copy.responsible, copy.balance, copy.receiptStatus], sortable: [0, 1, 2, 3, 5], rows: selection.currentFunds.map(row => ({ id: row.id, cells: [row.name, row.unitName, row.businessName, row.responsibleName, money(row.currentBalanceAmount, row.currencyCode), moduleCopy.status.fund[row.status]] })) },
  };
}
