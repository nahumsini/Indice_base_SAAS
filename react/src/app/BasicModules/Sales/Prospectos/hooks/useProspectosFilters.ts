import { useMemo } from 'react';
import type { SalesOpportunity } from '../../salesCrmContext';
import { opportunityBelongsToCurrentUser } from '../utils/prospectosFilters';

type UseProspectosFiltersInput = {
  opportunities: SalesOpportunity[];
  searchQuery: string;
  stageFilter: string;
  ownerFilter: string;
  temperatureFilter: string;
  sourceFilter: string;
  statusFilter: string;
  shouldScopeOpportunitiesByOwner: boolean;
  currentUserCompanyId: number | null;
  currentOwnerNames: string[];
  resolveOpportunityOwnerValue: (opportunity: SalesOpportunity) => string;
};

export function useProspectosFilters({
  opportunities,
  searchQuery,
  stageFilter,
  ownerFilter,
  temperatureFilter,
  sourceFilter,
  statusFilter,
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
        matchesSearch &&
        (stageFilter === 'all' || opportunity.stage === stageFilter) &&
        (ownerFilter === 'all' || resolveOpportunityOwnerValue(opportunity) === ownerFilter) &&
        (temperatureFilter === 'all' || opportunity.temperature === temperatureFilter) &&
        (sourceFilter === 'all' || opportunity.source === sourceFilter) &&
        (statusFilter === 'all' || opportunity.status === statusFilter)
      );
    });
  }, [
    currentOwnerNames,
    currentUserCompanyId,
    opportunities,
    ownerFilter,
    resolveOpportunityOwnerValue,
    searchQuery,
    shouldScopeOpportunitiesByOwner,
    sourceFilter,
    stageFilter,
    statusFilter,
    temperatureFilter,
  ]);
}

