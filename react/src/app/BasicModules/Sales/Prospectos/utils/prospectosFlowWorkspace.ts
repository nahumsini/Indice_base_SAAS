import type { OpportunityFlow, SalesOpportunity } from '../../types/opportunities';

type WorkspaceFlow = Pick<OpportunityFlow, 'id' | 'defaultFlow'>;

export function resolveOpportunityWorkspaceFlowId(
  rememberedId: unknown,
  flows: readonly WorkspaceFlow[],
  defaultFlowId: number | null,
): number | null {
  if (typeof rememberedId === 'number' && Number.isSafeInteger(rememberedId)
    && rememberedId > 0 && flows.some(flow => flow.id === rememberedId)) {
    return rememberedId;
  }
  return flows.find(flow => flow.id === defaultFlowId)?.id
    ?? flows.find(flow => flow.defaultFlow)?.id
    ?? flows[0]?.id
    ?? null;
}

// These are navigation counts, not persisted totals or monetary KPIs. The caller
// supplies the currently authorized, owner-visible records before any search filters.
export function countOpportunityFlowAssignments(
  opportunities: readonly Pick<SalesOpportunity, 'flowId'>[],
  flows: readonly WorkspaceFlow[],
): ReadonlyMap<number, number> {
  const counts = new Map(flows.map(flow => [flow.id, 0]));
  opportunities.forEach(opportunity => {
    if (opportunity.flowId !== undefined && counts.has(opportunity.flowId)) {
      counts.set(opportunity.flowId, counts.get(opportunity.flowId)! + 1);
    }
  });
  return counts;
}
