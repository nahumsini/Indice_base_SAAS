import type { Detail, Opportunity } from "./whatsappingApi";

export function contactOpportunities(detail: Pick<Detail, "opportunities">, contactId: number, created: readonly Opportunity[] = []): Opportunity[] | null | undefined {
  if (detail.opportunities == null) return detail.opportunities;
  return [...new Map([...detail.opportunities, ...created].filter(o => o.contactId === contactId).map(o => [o.id, o])).values()];
}

export function opportunityUrl(opportunity: Pick<Opportunity, "id" | "flowId">): string {
  const query = new URLSearchParams({ opportunity: String(opportunity.id) });
  if (opportunity.flowId) query.set("flow", String(opportunity.flowId));
  return `/sales/leads?${query}`;
}

/** Refresh only the owner read projection. Operational fields are the baseline for mounted drafts. */
export function mergeOpportunityReturn(current: Detail, refreshed: Detail): Detail {
  if (current.campaign.id !== refreshed.campaign.id || refreshed.opportunities === undefined) throw new Error("Invalid opportunity refresh");
  const contacts = new Map(refreshed.recipients.map(r => [r.contact.id, r]));
  const withOpportunity = refreshed.opportunities === null ? null : [...new Set(refreshed.opportunities.map(o => o.contactId))];
  return {
    ...current,
    opportunities: refreshed.opportunities,
    recipients: current.recipients.map(r => {
      const fresh = contacts.get(r.contact.id);
      return fresh ? { ...r, contact: fresh.contact, eligibility: fresh.eligibility } : r;
    }),
    resultContacts: current.resultContacts ? { ...current.resultContacts, withOpportunity } : current.resultContacts,
    campaign: current.campaign.outcomes ? { ...current.campaign, outcomes: { ...current.campaign.outcomes, withOpportunity: withOpportunity?.length ?? null } } : current.campaign,
  };
}

/** Match the Sales factory-stage localization; user-defined labels are kept verbatim. */
export function opportunityStageLabel(opportunity: Opportunity, defaultLabels: Record<string, string>, unavailable: string): string {
  const stage = opportunity.stage;
  if (!stage) return unavailable;
  if (stage.usesDefaultLabel) {
    const key = Object.keys(defaultLabels).find(key => key.toLowerCase() === stage.key.toLowerCase());
    if (key) return defaultLabels[key];
  }
  return stage.label?.trim() || unavailable;
}
