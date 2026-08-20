import { useMemo } from 'react';
import type { SalesOpportunity, SalesQuote } from '../../salesCrmContext';
import type { OpportunityFocusFilter } from '../types/prospectosTypes';
import { opportunityBelongsToCurrentUser } from '../utils/prospectosFilters';
import { getOpportunitySchedule, getTodayInputValue } from '../utils/prospectosFormatters';
import { getLinkedQuotesForOpportunity } from '../utils/prospectosQuoteSignals';

type UseProspectosFiltersInput = {
  opportunities: SalesOpportunity[];
  quotes: SalesQuote[];
  searchQuery: string;
  focusFilter: OpportunityFocusFilter;
  stageFilter: string;
  ownerFilter: string;
  temperatureFilter: string;
  sourceFilter: string;
  shouldScopeOpportunitiesByOwner: boolean;
  currentUserCompanyId: number | null;
  currentOwnerNames: string[];
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
};

function opportunityMatchesFocus(
  opportunity: SalesOpportunity,
  quotes: SalesQuote[],
  focusFilter: OpportunityFocusFilter,
  currentUserCompanyId: number | null,
  currentOwnerNames: string[],
) {
  if (focusFilter === 'all') {
    return true;
  }

  if (focusFilter === 'my_portfolio') {
    return opportunityBelongsToCurrentUser(opportunity, currentUserCompanyId, currentOwnerNames);
  }

  if (focusFilter === 'without_quote') {
    return getLinkedQuotesForOpportunity(opportunity, quotes).length === 0;
  }

  if (focusFilter === 'in_proposal') {
    return opportunity.stage === 'Proposal' || opportunity.stage === 'Negotiation';
  }

  if (focusFilter === 'closed_period') {
    return opportunity.stage === 'Won' || opportunity.stage === 'Lost';
  }

  if (focusFilter === 'won') {
    return opportunity.stage === 'Won';
  }

  if (focusFilter === 'lost') {
    return opportunity.stage === 'Lost';
  }

  const schedule = getOpportunitySchedule(opportunity);
  const today = getTodayInputValue();
  return !['Won', 'Lost'].includes(opportunity.stage) && (
    opportunity.status === 'Overdue'
    || opportunity.status === 'Pending follow-up'
    || Boolean(schedule.date && schedule.date <= today)
  );
}

export function useProspectosFilters({
  opportunities,
  quotes,
  searchQuery,
  focusFilter,
  stageFilter,
  ownerFilter,
  temperatureFilter,
  sourceFilter,
  shouldScopeOpportunitiesByOwner,
  currentUserCompanyId,
  currentOwnerNames,
  resolveOpportunityOwnerValue,
}: UseProspectosFiltersInput) {
  return useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const canSeeOpportunity = !shouldScopeOpportunitiesByOwner
        || opportunityBelongsToCurrentUser(opportunity, currentUserCompanyId, currentOwnerNames);
      const matchesFocus = opportunityMatchesFocus(
        opportunity,
        quotes,
        focusFilter,
        currentUserCompanyId,
        currentOwnerNames,
      );
      const matchesSearch = !query || [
        opportunity.id,
        opportunity.opportunityName,
        opportunity.company,
        opportunity.contactPerson,
        opportunity.phone,
        opportunity.email,
        opportunity.owner,
        opportunity.source,
        opportunity.stage,
        opportunity.temperature,
        opportunity.status,
        opportunity.nextAction,
      ].some((value) => value.toLowerCase().includes(query));

      return (
        canSeeOpportunity &&
        matchesFocus &&
        matchesSearch &&
        (stageFilter === 'all' || opportunity.stage === stageFilter) &&
        (ownerFilter === 'all' || resolveOpportunityOwnerValue(opportunity) === ownerFilter) &&
        (temperatureFilter === 'all' || opportunity.temperature === temperatureFilter) &&
        (sourceFilter === 'all' || opportunity.source === sourceFilter)
      );
    });
  }, [
    currentOwnerNames,
    currentUserCompanyId,
    focusFilter,
    opportunities,
    ownerFilter,
    quotes,
    resolveOpportunityOwnerValue,
    searchQuery,
    shouldScopeOpportunitiesByOwner,
    sourceFilter,
    stageFilter,
    temperatureFilter,
  ]);
}
