import type { Opportunity, Recipient } from "./whatsappingApi";
import { opportunityStageLabel } from "./contactOpportunities";

export type OpportunityStageFilter = {
  available: boolean;
  options: { value: string; label: string; count: number }[];
  contactsByValue: Map<string, Set<number>>;
};

/** Facets count audience contacts under search/view, excluding the stage filter itself. */
export function buildOpportunityStageFilter(
  recipients: Recipient[], opportunities: Opportunity[] | null | undefined, baseRecipients: Recipient[],
  defaultLabels: Record<string, string>, copy: { allOpportunityStages: string; noOpportunity: string; stageUnavailable: string }, locale: string,
): OpportunityStageFilter {
  const baseIds = new Set(baseRecipients.map(r => r.contact.id));
  const result: OpportunityStageFilter = { available: opportunities != null, options: [{ value: "ALL", label: copy.allOpportunityStages, count: baseIds.size }], contactsByValue: new Map() };
  if (opportunities == null) return result;
  const byContact = new Map<number, Opportunity[]>();
  // A locally confirmed create may replace its matching owner reference, never duplicate it.
  for (const opportunity of new Map(opportunities.map(o => [o.id, o])).values()) {
    const list = byContact.get(opportunity.contactId) ?? [];
    list.push(opportunity); byContact.set(opportunity.contactId, list);
  }
  const labels = new Map<string, string>();
  const add = (value: string, label: string, contactId: number) => {
    labels.set(value, label);
    const ids = result.contactsByValue.get(value) ?? new Set<number>();
    ids.add(contactId); result.contactsByValue.set(value, ids);
  };
  for (const recipient of recipients) {
    const opportunities = byContact.get(recipient.contact.id) ?? [];
    if (!opportunities.length) add("NO_OPPORTUNITY", copy.noOpportunity, recipient.contact.id);
    for (const opportunity of opportunities) {
      const label = opportunityStageLabel(opportunity, defaultLabels, "");
      // Group by the business stage name shown in the summary, including across flows.
      if (label) add(`STAGE:${label.normalize("NFKC").trim().toLocaleLowerCase(locale)}`, label, recipient.contact.id);
      else add("UNAVAILABLE", copy.stageUnavailable, recipient.contact.id);
    }
  }
  const stageValues = [...labels.keys()].filter(value => value.startsWith("STAGE:"))
    .sort((a, b) => labels.get(a)!.localeCompare(labels.get(b)!, locale));
  for (const value of [...stageValues, "UNAVAILABLE", "NO_OPPORTUNITY"]) {
    if (!labels.has(value)) continue;
    const count = [...result.contactsByValue.get(value)!].filter(id => baseIds.has(id)).length;
    result.options.push({ value, label: labels.get(value)!, count });
  }
  return result;
}

export function matchesOpportunityStage(contactId: number, value: string, filter: OpportunityStageFilter): boolean {
  return value === "ALL" || filter.contactsByValue.get(value)?.has(contactId) === true;
}
