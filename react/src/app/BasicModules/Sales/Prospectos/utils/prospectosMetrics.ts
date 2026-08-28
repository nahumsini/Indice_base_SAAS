import {
  opportunityStages,
  opportunityTemperatures,
  type OpportunityStage,
  type SalesQuote,
  type SalesOpportunity,
} from '../../salesCrmContext';
import {
  defaultSalesCurrency,
  formatSalesCurrencyAmount,
  formatSalesCurrencyBreakdown,
  normalizeSalesCurrencyCode,
} from '../../utils/salesCurrency';
import type {
  OpportunityColumnId,
  OpportunityHistoryEntry,
  OpportunityPeriodFilter,
  OpportunitySortState,
  OpportunitySortValue,
} from '../types/prospectosTypes';
import {
  addDaysToInputDate,
  formatCurrencyAmount,
  getOpportunitySchedule,
  getTodayInputValue,
  getWeekStartInputDate,
  inputDateToLocalDate,
  parseMoney,
  parsePercentage,
} from './prospectosFormatters';
import { getOpportunityNativePipelineTotals, getProspectosPipelineSummary } from './prospectosPipeline';
import { getForecastQuotesForOpportunity, getOpportunityQuoteSignal } from './prospectosQuoteSignals';
import { opportunitySortCollator, stageLabels } from './prospectosStatus';

type OpportunityPeriodRange = {
  start: string;
  end: string;
};

type OpportunityCommercialValueLine = {
  amount: number;
  currency: string;
  exchangeDate: string;
};

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthEndInputDate(year: number, monthIndex: number) {
  return toInputDate(new Date(year, monthIndex + 1, 0));
}

export function getOpportunityPeriodRange(period: OpportunityPeriodFilter): OpportunityPeriodRange | null {
  const today = getTodayInputValue();
  const todayDate = inputDateToLocalDate(today);
  const year = todayDate.getFullYear();
  const month = todayDate.getMonth();

  switch (period) {
    case 'today':
      return { start: today, end: today };
    case 'this_week': {
      const start = getWeekStartInputDate(today);
      return { start, end: addDaysToInputDate(inputDateToLocalDate(start), 6) };
    }
    case 'this_month': {
      const start = toInputDate(new Date(year, month, 1));
      return { start, end: getMonthEndInputDate(year, month) };
    }
    case 'last_month': {
      const startDate = new Date(year, month - 1, 1);
      const start = toInputDate(startDate);
      return { start, end: getMonthEndInputDate(startDate.getFullYear(), startDate.getMonth()) };
    }
    case 'all':
    case 'custom':
    default:
      return null;
  }
}

function normalizeInputDateValue(value: string) {
  return value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '';
}

export function isOpportunityClosed(opportunity: SalesOpportunity) {
  return opportunity.stage === 'Won' || opportunity.stage === 'Lost';
}

export function getOpportunityClosureDate(opportunity: SalesOpportunity) {
  if (!isOpportunityClosed(opportunity)) {
    return '';
  }

  return (
    normalizeInputDateValue(opportunity.lastContact)
    || normalizeInputDateValue(opportunity.expectedCloseDate)
    || getTodayInputValue()
  );
}

function isDateWithinRange(dateValue: string, range: OpportunityPeriodRange | null) {
  if (!range || !dateValue) {
    return true;
  }

  return dateValue >= range.start && dateValue <= range.end;
}

export function filterOpportunitiesForPeriodView(
  opportunities: SalesOpportunity[],
  period: OpportunityPeriodFilter,
) {
  const range = getOpportunityPeriodRange(period);

  if (!range) {
    return opportunities;
  }

  return opportunities.filter((opportunity) => (
    !isOpportunityClosed(opportunity)
    || isDateWithinRange(getOpportunityClosureDate(opportunity), range)
  ));
}

function getClosedOpportunityValueLines(
  opportunity: SalesOpportunity,
  quotes: SalesQuote[],
): OpportunityCommercialValueLine[] {
  const closureDate = getOpportunityClosureDate(opportunity);
  const linkedQuotes = getForecastQuotesForOpportunity(opportunity, quotes);

  if (linkedQuotes.length > 0) {
    return linkedQuotes.map((quote) => ({
      amount: quote.total,
      currency: normalizeSalesCurrencyCode(quote.currency),
      exchangeDate: closureDate || normalizeInputDateValue(quote.lastUpdated) || getTodayInputValue(),
    }));
  }

  return [];
}

function summarizeClosedOpportunityValue(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[],
  preferredCurrency = defaultSalesCurrency,
) {
  const currency = normalizeSalesCurrencyCode(preferredCurrency);
  const lines = opportunities.flatMap((opportunity) => getClosedOpportunityValueLines(opportunity, quotes));
  return {
    total: 0,
    totalLabel: lines.length > 0
      ? formatSalesCurrencyBreakdown(lines, (line) => line.amount, (line) => line.currency)
      : formatSalesCurrencyAmount(0, currency),
    convertedLabel: formatSalesCurrencyAmount(0, currency),
  };
}

export function getOpportunitySortValue(
  opportunity: SalesOpportunity,
  columnId: OpportunityColumnId,
  quotes: SalesQuote[] = [],
  stageOrder: OpportunityStage[] = opportunityStages,
): OpportunitySortValue {
  switch (columnId) {
    case 'opportunity':
      return `${opportunity.opportunityName} ${opportunity.company} ${opportunity.id}`;
    case 'contact':
      return opportunity.contactPerson;
    case 'phone':
      return opportunity.phone;
    case 'email':
      return opportunity.email;
    case 'source':
      return opportunity.source;
    case 'stage':
      return stageOrder.indexOf(opportunity.stage);
    case 'temperature':
      return opportunityTemperatures.indexOf(opportunity.temperature);
    case 'owner':
      return opportunity.owner;
    case 'estimatedValue':
      return getOpportunityNativePipelineTotals(opportunity, quotes).totalsByCurrency
        .reduce((total, currencyTotal) => total + currencyTotal.total, 0)
        * (parsePercentage(opportunity.probability) / 100);
    case 'probability':
      return parsePercentage(opportunity.probability);
    case 'quoteSignal':
      return getOpportunityQuoteSignal(opportunity, quotes).totalQuotedValue;
    case 'pipeline':
      return getOpportunityNativePipelineTotals(opportunity, quotes).totalLabel;
    case 'expectedCloseDate':
      return opportunity.expectedCloseDate || null;
    case 'nextAction':
      return opportunity.nextAction;
    case 'nextActionDate': {
      const schedule = getOpportunitySchedule(opportunity);
      return `${schedule.date} ${schedule.time}`;
    }
    case 'lastContact':
      return opportunity.lastContact || null;
    case 'files':
      return opportunity.files.length;
    case 'status':
      return opportunity.status;
    default:
      return null;
  }
}

export function sortOpportunities(
  opportunities: SalesOpportunity[],
  sortState: OpportunitySortState,
  quotes: SalesQuote[] = [],
  stageOrder: OpportunityStage[] = opportunityStages,
) {
  return [...opportunities].sort((left, right) => {
    const leftValue = getOpportunitySortValue(left, sortState.columnId, quotes, stageOrder);
    const rightValue = getOpportunitySortValue(right, sortState.columnId, quotes, stageOrder);

    if (leftValue === null && rightValue === null) {
      return opportunitySortCollator.compare(left.id, right.id);
    }
    if (leftValue === null) {
      return sortState.direction === 'asc' ? 1 : -1;
    }
    if (rightValue === null) {
      return sortState.direction === 'asc' ? -1 : 1;
    }

    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : opportunitySortCollator.compare(String(leftValue), String(rightValue));

    const directedResult = sortState.direction === 'asc' ? result : -result;
    return directedResult || opportunitySortCollator.compare(left.id, right.id);
  });
}

export function buildOpportunityHistory(
  opportunity: SalesOpportunity,
  stageLabel = stageLabels[opportunity.stage] ?? opportunity.stage.replace(/_/g, ' '),
): OpportunityHistoryEntry[] {
  return [
    {
      id: 'created',
      title: 'Oportunidad creada',
      description: `${opportunity.company} se agregó al pipeline comercial como ${stageLabel}.`,
      timestamp: opportunity.lastContact || 'Sin fecha registrada',
      tone: 'blue',
    },
    {
      id: 'stage',
      title: 'Etapa actualizada',
      description: `La oportunidad está actualmente en etapa ${stageLabel} con temperatura ${opportunity.temperature}.`,
      timestamp: opportunity.lastContact || 'Sin fecha registrada',
      tone: opportunity.stage === 'Lost' ? 'coral' : opportunity.stage === 'Won' ? 'green' : 'yellow',
    },
    {
      id: 'follow-up',
      title: 'Siguiente acción programada',
      description: `${opportunity.nextAction} con ${opportunity.contactPerson}.`,
      timestamp: opportunity.nextActionDate || 'Sin fecha programada',
      tone: 'green',
    },
    {
      id: 'value',
      title: 'Valor comercial registrado',
      description: `${formatCurrencyAmount(parseMoney(opportunity.estimatedValue), opportunity.currency)} con probabilidad de cierre de ${opportunity.probability}.`,
      timestamp: opportunity.expectedCloseDate || 'Sin cierre esperado',
      tone: 'slate',
    },
    {
      id: 'files',
      title: 'Archivos vinculados',
      description: opportunity.files.length > 0
        ? `${opportunity.files.length} documentos asociados: ${opportunity.files.join(', ')}.`
        : 'Todavía no hay documentos asociados a esta oportunidad.',
      timestamp: 'Registro local',
      tone: 'yellow',
    },
  ];
}

export function calculateProspectosMetrics(
  opportunities: SalesOpportunity[],
  quotes: SalesQuote[] = [],
  preferredCurrency = defaultSalesCurrency,
  periodFilter: OpportunityPeriodFilter = 'all',
  stageOrder: OpportunityStage[] = opportunityStages,
) {
  const periodRange = getOpportunityPeriodRange(periodFilter);
  const periodOpportunities = filterOpportunitiesForPeriodView(opportunities, periodFilter);
  const visibleCount = periodOpportunities.length;
  const openOpportunities = opportunities.filter((opportunity) => !['Won', 'Lost'].includes(opportunity.stage));
  const periodClosedOpportunities = opportunities.filter((opportunity) => (
    isOpportunityClosed(opportunity)
    && isDateWithinRange(getOpportunityClosureDate(opportunity), periodRange)
  ));
  const periodWonOpportunities = periodClosedOpportunities.filter((opportunity) => opportunity.stage === 'Won');
  const periodLostOpportunities = periodClosedOpportunities.filter((opportunity) => opportunity.stage === 'Lost');
  const openCount = openOpportunities.length;
  const proposalCount = opportunities.filter((opportunity) => opportunity.stage === 'Proposal').length;
  const hotCount = opportunities.filter((opportunity) => opportunity.temperature === 'Hot').length;
  const todayInputValue = getTodayInputValue();
  const scheduledCount = openOpportunities.filter((opportunity) => Boolean(getOpportunitySchedule(opportunity).date)).length;
  const unscheduledCount = openCount - scheduledCount;
  const overdueCount = openOpportunities.filter((opportunity) => {
    const schedule = getOpportunitySchedule(opportunity);
    return opportunity.status === 'Overdue' || Boolean(schedule.date && schedule.date < todayInputValue);
  }).length;
  const pipelineSummary = getProspectosPipelineSummary(openOpportunities, quotes, preferredCurrency);
  const wonSummary = summarizeClosedOpportunityValue(periodWonOpportunities, quotes, preferredCurrency);
  const lostSummary = summarizeClosedOpportunityValue(periodLostOpportunities, quotes, preferredCurrency);
  const periodClosedCount = periodClosedOpportunities.length;
  const periodConversionRate = periodClosedCount > 0
    ? Math.round((periodWonOpportunities.length / periodClosedCount) * 100)
    : 0;
  const weightedProbability = openCount > 0
    ? Math.round(openOpportunities.reduce((total, opportunity) => total + parsePercentage(opportunity.probability), 0) / openCount)
    : 0;
  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: stage === 'Won' || stage === 'Lost'
      ? periodClosedOpportunities.filter((opportunity) => opportunity.stage === stage).length
      : openOpportunities.filter((opportunity) => opportunity.stage === stage).length,
  }));

  return {
    visibleCount,
    openCount,
    proposalCount,
    hotCount,
    scheduledCount,
    unscheduledCount,
    overdueCount,
    pipelineValue: pipelineSummary.convertedTotal,
    formattedPipelineValue: pipelineSummary.totalLabel,
    convertedPipelineValue: pipelineSummary.convertedTotal,
    convertedPipelineLabel: pipelineSummary.convertedLabel,
    pipelineCurrencyTotals: pipelineSummary.totalsByCurrency,
    pipelineQuoteCount: pipelineSummary.quoteCount,
    pipelinePreferredCurrency: pipelineSummary.preferredCurrency,
    pipelineExchangeRateDate: pipelineSummary.exchangeRateDate,
    hasMultiplePipelineCurrencies: pipelineSummary.hasMultipleCurrencies,
    periodFilter,
    periodClosedCount,
    periodWonCount: periodWonOpportunities.length,
    periodLostCount: periodLostOpportunities.length,
    periodWonValue: wonSummary.total,
    periodLostValue: lostSummary.total,
    periodWonValueLabel: wonSummary.totalLabel,
    periodWonConvertedLabel: wonSummary.convertedLabel,
    periodLostValueLabel: lostSummary.totalLabel,
    periodLostConvertedLabel: lostSummary.convertedLabel,
    periodConversionRate,
    weightedProbability,
    stageCounts,
  };
}
