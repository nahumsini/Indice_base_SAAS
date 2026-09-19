import type { PettyCashFund, PettyCashFundType, PettyCashMovement, PettyCashSettlementLine, PettyCashStatement } from '../types/pettyCash.types';

export const pettyCashKpiViews = ['overview', 'analysis', 'units', 'details'] as const;
export type PettyCashKpiView = typeof pettyCashKpiViews[number];
export const normalizeKpiView = (value: unknown): PettyCashKpiView => pettyCashKpiViews.includes(value as PettyCashKpiView) ? value as PettyCashKpiView : 'overview';
export type KpiScope = { period: string; status: string; unit: string; business: string; search: string; classification: PettyCashFundType };
export const defaultKpiScope: KpiScope = { period: 'all', status: 'all', unit: 'all', business: 'all', search: '', classification: 'INTERNAL_COMPANY' };
const terminalStatuses = new Set(['CLOSED', 'TRANSFERRED_TO_NEXT_CUT', 'FORGIVEN_SHORTAGE', 'CHARGED_TO_EMPLOYEE']);
export const isOpenStatement = (statement: PettyCashStatement) => !terminalStatuses.has(statement.status);
export const isValidReceipt = (line: PettyCashSettlementLine) => !['REJECTED', 'REVERSED'].includes(line.status);
export const isAuthorizedReceipt = (line: PettyCashSettlementLine, statement?: PettyCashStatement) =>
  statement?.fundTypeSnapshot === 'EXTERNAL_MANAGED' ? line.status === 'VALIDATED' : statement?.fundTypeSnapshot === 'INTERNAL_COMPANY' && line.status === 'EXPENSE_CREATED';
export const samplePercent = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator * 100 : null;

export function selectPettyCashKpiScope(funds: PettyCashFund[], statements: PettyCashStatement[], lines: PettyCashSettlementLine[], movements: PettyCashMovement[], scope: KpiScope) {
  const fundMap = new Map(funds.map(fund => [fund.id, fund]));
  const search = scope.search.trim().toLocaleLowerCase();
  const matchesOrganization = (fund?: PettyCashFund) => !!fund && (scope.unit === 'all' || fund.unitId === scope.unit) && (scope.business === 'all' || fund.businessId === scope.business);
  const matchesSearch = (values: Array<string | undefined>) => !search || values.some(value => value?.toLocaleLowerCase().includes(search));
  const selectedStatements = statements.filter(statement => {
    const fund = fundMap.get(statement.pettyCashFundId);
    return statement.fundTypeSnapshot === scope.classification && matchesOrganization(fund)
      && (scope.period === 'all' || statement.periodKey === scope.period) && (scope.status === 'all' || statement.status === scope.status)
      && matchesSearch([statement.folio, statement.responsibleName, fund?.name, fund?.unitName, fund?.businessName, statement.externalOwnerNameSnapshot]);
  });
  const statementMap = new Map(selectedStatements.map(statement => [statement.id, statement]));
  const selectedFundIds = new Set(selectedStatements.map(statement => statement.pettyCashFundId));
  const allStatementFundIds = new Set(statements.map(statement => statement.pettyCashFundId));
  const selectedFunds = funds.filter(fund => selectedFundIds.has(fund.id) || (
    !allStatementFundIds.has(fund.id) && fund.fundType === scope.classification && matchesOrganization(fund)
    && scope.period === 'all' && scope.status === 'all' && matchesSearch([fund.name, fund.responsibleName, fund.unitName, fund.businessName])
  ));
  const currentFunds = selectedFunds.filter(fund => fund.status !== 'CLOSED' && fund.fundType === scope.classification);
  const selectedLines = lines.filter(line => statementMap.get(line.pettyCashStatementId)?.pettyCashFundId === line.pettyCashFundId);
  const validLines = selectedLines.filter(isValidReceipt);
  const authorizedLines = validLines.filter(line => isAuthorizedReceipt(line, statementMap.get(line.pettyCashStatementId)));
  const pendingLines = validLines.filter(line => !isAuthorizedReceipt(line, statementMap.get(line.pettyCashStatementId)));
  const selectedMovements = movements.filter(movement => movement.pettyCashStatementId && statementMap.get(movement.pettyCashStatementId)?.pettyCashFundId === movement.pettyCashFundId);
  const withoutEvidence = validLines.filter(line => line.attachmentCount <= 0);
  return { fundMap, statementMap, statements: selectedStatements, funds: selectedFunds, currentFunds, lines: selectedLines, validLines, authorizedLines, pendingLines, movements: selectedMovements, withoutEvidence,
    unlinkedMovements: movements.filter(movement => !movement.pettyCashStatementId && selectedFunds.some(fund => fund.id === movement.pettyCashFundId)).length,
    openStatements: selectedStatements.filter(isOpenStatement), negativeFunds: currentFunds.filter(fund => fund.currentBalanceAmount < 0),
    evidencePercent: samplePercent(validLines.length - withoutEvidence.length, validLines.length),
    authorizationPercent: samplePercent(authorizedLines.length, validLines.length),
  };
}
export type PettyCashKpiSelection = ReturnType<typeof selectPettyCashKpiScope>;

export function groupStatements(statements: PettyCashStatement[], keyOf: (statement: PettyCashStatement) => string) {
  const groups = new Map<string, PettyCashStatement[]>();
  for (const statement of statements) { const key = keyOf(statement); groups.set(key, [...(groups.get(key) ?? []), statement]); }
  return [...groups].map(([key, rows]) => ({ key, rows }));
}
