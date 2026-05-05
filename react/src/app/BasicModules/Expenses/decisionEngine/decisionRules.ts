import {
  formatDecisionCurrency,
  formatDecisionPercent,
  mergeDecisionThresholds,
  sortDecisionCandidates,
  toPublicDecision,
  type Decision,
  type DecisionCandidate,
  type DecisionMetrics,
  type DecisionThresholds,
} from './decisionUtils';

export type DecisionRule = {
  id: string;
  evaluate: (metrics: DecisionMetrics, thresholds: DecisionThresholds) => DecisionCandidate | null;
};

const getBudgetDeviationRatio = (metrics: DecisionMetrics) => {
  if (metrics.currentBudgetSpend === 0) return null;
  return metrics.currentRealSpend / metrics.currentBudgetSpend;
};

const budgetDeviationRule: DecisionRule = {
  id: 'budget-deviation',
  evaluate: (metrics, thresholds) => {
    const deviationRatio = getBudgetDeviationRatio(metrics);
    if (deviationRatio === null || deviationRatio <= thresholds.budgetOverspendRatio) return null;

    const overspend = metrics.currentRealSpend - metrics.currentBudgetSpend;
    const impact = deviationRatio >= 1.25 ? 'high' : 'medium';

    return {
      description: `Estás gastando ${formatDecisionPercent(deviationRatio - 1)} más de lo presupuestado este mes (${formatDecisionCurrency(overspend)} por encima).`,
      impact,
      recommendation: 'Revisar categoría o ajustar presupuesto antes del cierre del mes.',
      ruleId: budgetDeviationRule.id,
      severity: impact === 'high' ? 100 : 82,
      title: 'Sobre gasto detectado',
      type: 'alert',
    };
  },
};

const highPendingRule: DecisionRule = {
  id: 'high-pending',
  evaluate: (metrics, thresholds) => {
    if (metrics.totalSpend === 0) return null;

    const pendingRatio = metrics.pendingAmount / metrics.totalSpend;
    if (pendingRatio <= thresholds.highPendingRatio) return null;

    const impact = pendingRatio >= 0.5 ? 'high' : 'medium';

    return {
      description: `El monto pendiente representa ${formatDecisionPercent(pendingRatio)} del gasto total (${formatDecisionCurrency(metrics.pendingAmount)}).`,
      impact,
      recommendation: 'Priorizar pagos críticos y validar fechas de vencimiento por proveedor.',
      ruleId: highPendingRule.id,
      severity: impact === 'high' ? 92 : 76,
      title: 'Alto monto pendiente',
      type: 'warning',
    };
  },
};

const overdueRiskRule: DecisionRule = {
  id: 'overdue-risk',
  evaluate: (metrics, thresholds) => {
    if (metrics.overdueCount <= thresholds.overdueCount) return null;

    return {
      description: `${metrics.overdueCount} gastos vencidos acumulan ${formatDecisionCurrency(metrics.overdueAmount)} por regularizar.`,
      impact: 'high',
      recommendation: 'Pagar inmediatamente para evitar impacto operativo, penalizaciones o bloqueo de proveedores.',
      ruleId: overdueRiskRule.id,
      severity: 96,
      title: 'Gastos vencidos detectados',
      type: 'alert',
    };
  },
};

const providerDependencyRule: DecisionRule = {
  id: 'provider-dependency',
  evaluate: (metrics, thresholds) => {
    const topProvider = metrics.providerTotals[0];
    if (!topProvider || topProvider.percentage <= thresholds.providerDependencyRatio) return null;

    const impact = topProvider.percentage >= 0.6 ? 'high' : 'medium';

    return {
      description: `${topProvider.providerName} concentra ${formatDecisionPercent(topProvider.percentage)} del gasto del mes (${formatDecisionCurrency(topProvider.total)}).`,
      impact,
      recommendation: 'Diversificar proveedores o negociar condiciones para reducir dependencia operativa.',
      ruleId: providerDependencyRule.id,
      severity: impact === 'high' ? 88 : 72,
      title: 'Alta dependencia de proveedor',
      type: 'warning',
    };
  },
};

const cashFlowRiskRule: DecisionRule = {
  id: 'cash-flow-risk',
  evaluate: (metrics) => {
    if (metrics.expectedBalance === undefined) return null;
    if (metrics.projectedExpenses <= metrics.expectedBalance) return null;

    const gap = metrics.projectedExpenses - metrics.expectedBalance;

    return {
      description: `Los gastos proyectados superan el balance esperado por ${formatDecisionCurrency(gap)}.`,
      impact: 'high',
      recommendation: 'Reducir gastos no críticos o reprogramar pagos antes del próximo periodo.',
      ruleId: cashFlowRiskRule.id,
      severity: 94,
      title: 'Riesgo de flujo de caja',
      type: 'alert',
    };
  },
};

const underspendingRule: DecisionRule = {
  id: 'underspending',
  evaluate: (metrics, thresholds) => {
    const deviationRatio = getBudgetDeviationRatio(metrics);
    if (deviationRatio === null || deviationRatio >= thresholds.budgetUnderspendRatio) return null;

    const availableBudget = metrics.currentBudgetSpend - metrics.currentRealSpend;

    return {
      description: `Se ha ejecutado sólo ${formatDecisionPercent(deviationRatio)} del presupuesto mensual; quedan ${formatDecisionCurrency(availableBudget)} disponibles.`,
      impact: 'medium',
      recommendation: 'Reasignar recursos a prioridades activas o revisar si el presupuesto está sobredimensionado.',
      ruleId: underspendingRule.id,
      severity: 58,
      title: 'Subejecución del presupuesto',
      type: 'opportunity',
    };
  },
};

export const decisionRules: DecisionRule[] = [
  budgetDeviationRule,
  highPendingRule,
  overdueRiskRule,
  providerDependencyRule,
  cashFlowRiskRule,
  underspendingRule,
];

export const generateDecisions = (
  metrics: DecisionMetrics,
  thresholds?: Partial<DecisionThresholds>,
): Decision[] => {
  const mergedThresholds = mergeDecisionThresholds(thresholds);
  const candidates = decisionRules
    .map(rule => rule.evaluate(metrics, mergedThresholds))
    .filter((decision): decision is DecisionCandidate => Boolean(decision));
  const uniqueCandidates = Array.from(
    new Map(candidates.map(candidate => [candidate.ruleId, candidate])).values(),
  );

  return sortDecisionCandidates(uniqueCandidates).map(toPublicDecision);
};
