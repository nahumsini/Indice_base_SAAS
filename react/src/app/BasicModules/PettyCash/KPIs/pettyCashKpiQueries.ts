import type { KpiMonetaryBatchQuery, KpiMonetaryMetric } from '../../shared/kpiMonetaryApi';
import { groupStatements, type PettyCashKpiSelection } from './pettyCashKpiSelectors';

export function buildPettyCashKpiQueries(selection: PettyCashKpiSelection, preferredCurrency: string) {
  const { statements, validLines, currentFunds, fundMap } = selection;
  const units = groupStatements(statements, row => fundMap.get(row.pettyCashFundId)?.unitId ?? '');
  for (const fund of currentFunds) if (!units.some(group => group.key === fund.unitId)) units.push({ key: fund.unitId, rows: [] });
  const funds = groupStatements(statements, row => row.pettyCashFundId);
  const responsibles = groupStatements(statements, row => row.responsibleUserId ?? '');
  const periods = groupStatements(statements, row => row.periodKey).sort((a, b) => a.key.localeCompare(b.key));
  const queries: KpiMonetaryBatchQuery[] = [];
  const add = (key: string, metric: KpiMonetaryMetric, ids: string[]) => queries.push({ key, metric, ids, preferredCurrency });
  add('funded', 'PETTY_CASH_CUSTODY_STATEMENT_FUNDED', statements.map(row => row.id));
  add('shortage', 'PETTY_CASH_CUSTODY_STATEMENT_SHORTAGE', statements.map(row => row.id));
  add('balance', 'PETTY_CASH_CUSTODY_BALANCE', currentFunds.map(row => row.id));
  const addReceipts = (prefix: string, ids: string[]) => {
    add(`${prefix}captured`, 'PETTY_CASH_CUSTODY_SETTLEMENT_AMOUNT', ids);
    add(`${prefix}authorized`, 'PETTY_CASH_CUSTODY_SETTLEMENT_AUTHORIZED', ids);
    add(`${prefix}pending`, 'PETTY_CASH_CUSTODY_SETTLEMENT_PENDING', ids);
  };
  addReceipts('', validLines.map(row => row.id));
  for (const [kind, groups] of Object.entries({ unit: units, fund: funds, responsible: responsibles, period: periods })) {
    for (const group of groups) {
      const ids = new Set(group.rows.map(row => row.id));
      addReceipts(`${kind}:${group.key}:`, validLines.filter(line => ids.has(line.pettyCashStatementId)).map(row => row.id));
    }
  }
  return { queries, units, funds, responsibles, periods };
}
