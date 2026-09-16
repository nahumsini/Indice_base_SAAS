import type { KpiMonetaryBatchQuery, KpiMonetaryMetric } from '../../shared/kpiMonetaryApi';
import { agingKey, agingKeys, customerKey, groupAccounts, organizationKey, type ReceivablesKpiSelection } from './receivablesKpiSelectors';

export function buildReceivablesKpiQueries(selection: ReceivablesKpiSelection, preferredCurrency: string) {
  const queries: KpiMonetaryBatchQuery[] = [];
  const add = (key: string, metric: KpiMonetaryMetric, ids: string[]) => queries.push({ key, metric, ids, preferredCurrency });
  add('balance', 'RECEIVABLE_BALANCE', selection.open.map(row => row.id));
  add('overdue', 'RECEIVABLE_INSTALLMENT_BALANCE', selection.overdue.map(row => row.id));
  add('upcoming', 'RECEIVABLE_INSTALLMENT_BALANCE', selection.dueSoon.map(row => row.id));
  add('collected', 'RECEIVABLE_PAYMENT_AMOUNT', selection.payments.map(row => row.id));
  for (const key of agingKeys) add(`aging:${key}`, 'RECEIVABLE_INSTALLMENT_BALANCE', selection.installments.filter(row => agingKey(row, selection.asOfDate) === key).map(row => row.id));
  const relevantUnitAccountIds = new Set([
    ...selection.open.map(row => row.id),
    ...selection.payments.map(row => row.receivableId),
  ]);
  const units = groupAccounts(
    selection.accounts.filter(row => relevantUnitAccountIds.has(row.id)),
    row => organizationKey(row.unitId),
  );
  const customers = groupAccounts(selection.open, customerKey);
  for (const [kind, groups] of Object.entries({ unit: units, customer: customers })) for (const group of groups) {
    const ids = new Set(group.rows.map(row => row.id));
    add(`${kind}:${group.key}:balance`, 'RECEIVABLE_BALANCE', selection.open.filter(row => ids.has(row.id)).map(row => row.id));
    add(`${kind}:${group.key}:overdue`, 'RECEIVABLE_INSTALLMENT_BALANCE', selection.overdue.filter(row => ids.has(row.receivableId)).map(row => row.id));
    add(`${kind}:${group.key}:collected`, 'RECEIVABLE_PAYMENT_AMOUNT', selection.payments.filter(row => ids.has(row.receivableId)).map(row => row.id));
  }
  const months = [...new Set(selection.payments.map(row => row.paymentDate.slice(0, 7)))].sort();
  for (const month of months) add(`month:${month}`, 'RECEIVABLE_PAYMENT_AMOUNT', selection.payments.filter(row => row.paymentDate.startsWith(month)).map(row => row.id));
  return { queries, units, customers, months };
}
