import {
  opportunityStages,
  opportunityTemperatures,
  type SalesOpportunity,
} from '../../salesCrmContext';
import type {
  OpportunityColumnId,
  OpportunityHistoryEntry,
  OpportunitySortState,
  OpportunitySortValue,
} from '../types/prospectosTypes';
import { formatCurrencyAmount, getOpportunitySchedule, parseMoney, parsePercentage } from './prospectosFormatters';
import { opportunitySortCollator, stageLabels } from './prospectosStatus';

export function getOpportunitySortValue(opportunity: SalesOpportunity, columnId: OpportunityColumnId): OpportunitySortValue {
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
      return opportunityStages.indexOf(opportunity.stage);
    case 'temperature':
      return opportunityTemperatures.indexOf(opportunity.temperature);
    case 'owner':
      return opportunity.owner;
    case 'estimatedValue':
      return parseMoney(opportunity.estimatedValue);
    case 'probability':
      return parsePercentage(opportunity.probability);
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

export function sortOpportunities(opportunities: SalesOpportunity[], sortState: OpportunitySortState) {
  return [...opportunities].sort((left, right) => {
    const leftValue = getOpportunitySortValue(left, sortState.columnId);
    const rightValue = getOpportunitySortValue(right, sortState.columnId);

    if (leftValue === null && rightValue === null) {
      return 0;
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

    return sortState.direction === 'asc' ? result : -result;
  });
}

export function buildOpportunityHistory(opportunity: SalesOpportunity): OpportunityHistoryEntry[] {
  return [
    {
      id: 'created',
      title: 'Oportunidad creada',
      description: `${opportunity.company} se agregó al pipeline comercial como ${stageLabels[opportunity.stage]}.`,
      timestamp: opportunity.lastContact || 'Sin fecha registrada',
      tone: 'blue',
    },
    {
      id: 'stage',
      title: 'Etapa actualizada',
      description: `La oportunidad está actualmente en etapa ${stageLabels[opportunity.stage]} con temperatura ${opportunity.temperature}.`,
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
      description: `${opportunity.estimatedValue} con probabilidad de cierre de ${opportunity.probability}.`,
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

export function calculateProspectosMetrics(opportunities: SalesOpportunity[]) {
  const visibleCount = opportunities.length;
  const openCount = opportunities.filter((opportunity) => !['Won', 'Lost'].includes(opportunity.stage)).length;
  const proposalCount = opportunities.filter((opportunity) => opportunity.stage === 'Proposal').length;
  const hotCount = opportunities.filter((opportunity) => opportunity.temperature === 'Hot').length;
  const pipelineValue = opportunities.reduce((total, opportunity) => total + parseMoney(opportunity.estimatedValue), 0);
  const formattedPipelineValue = formatCurrencyAmount(pipelineValue);
  const weightedProbability = visibleCount > 0
    ? Math.round(opportunities.reduce((total, opportunity) => total + parsePercentage(opportunity.probability), 0) / visibleCount)
    : 0;
  const stageCounts = opportunityStages.map((stage) => ({
    stage,
    count: opportunities.filter((opportunity) => opportunity.stage === stage).length,
  }));

  return {
    visibleCount,
    openCount,
    proposalCount,
    hotCount,
    pipelineValue,
    formattedPipelineValue,
    weightedProbability,
    stageCounts,
  };
}

