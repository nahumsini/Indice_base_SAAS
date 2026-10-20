import type { FunnelInput, FunnelStage } from './funnelModel';

export const campaignChannels = ['ORGANIC', 'META_ADS', 'GOOGLE_SEARCH'] as const;
export const campaignGoals = ['UNDECIDED', 'AWARENESS', 'INQUIRIES', 'APPOINTMENTS', 'PURCHASES', 'QUOTES', 'RENEWALS'] as const;
export const campaignMaterials = ['PHOTOS', 'VIDEO', 'WEBSITE', 'WHATSAPP', 'TESTIMONIALS'] as const;
export const campaignDestinations = ['UNDECIDED', 'WHATSAPP', 'PHONE', 'FORM', 'WEBSITE', 'STORE'] as const;
export type RecommendationId = 'offer' | 'audience' | 'goal' | 'channel' | 'destination' | 'location' | 'materials' | 'timing' | 'budget' | 'path' | 'searchPage' | 'messageOwner';
export type CampaignBrief = {
  idea: string; offer: string; location: string; goal: typeof campaignGoals[number];
  channels: (typeof campaignChannels[number])[]; materials: (typeof campaignMaterials[number])[];
  destination: typeof campaignDestinations[number]; destinationDetail: string;
  timing: string; budgetNote: string; aiResponse: string; deferredRecommendations: RecommendationId[];
};
export function emptyCampaignBrief(): CampaignBrief {
  return { idea: '', offer: '', location: '', goal: 'UNDECIDED', channels: [], materials: [], destination: 'UNDECIDED',
    destinationDetail: '', timing: '', budgetNote: '', aiResponse: '', deferredRecommendations: [] };
}
export function newCampaignIdea(): FunnelInput {
  return { name: '', objective: '', audience: '', channel: 'MIXED', notes: '', status: 'DRAFT', version: 0, stages: [], workshop: emptyCampaignBrief() };
}
export function campaignReady(plan: FunnelInput): boolean {
  const b = plan.workshop;
  return Boolean(b?.idea.trim() && b.offer.trim() && plan.objective.trim() && plan.audience.trim()
    && b.goal !== 'UNDECIDED' && b.channels.length && b.destination !== 'UNDECIDED');
}
export function campaignRecommendations(plan: FunnelInput, includeDeferred = false): { id: RecommendationId; question: number; applicable?: boolean }[] {
  const b = plan.workshop;
  if (!b) return [];
  const rules: [RecommendationId, boolean, number, boolean?][] = [
    ['offer', !b.offer.trim(), 0], ['audience', !plan.audience.trim(), 1], ['goal', b.goal === 'UNDECIDED' || !plan.objective.trim(), 2],
    ['channel', !b.channels.length, 3], ['destination', b.destination === 'UNDECIDED', 2],
    ['path', plan.stages.length === 0, 5, true], ['location', !b.location.trim(), 1], ['materials', !b.materials.length, 4],
    ['searchPage', b.channels.includes('GOOGLE_SEARCH') && (b.destination !== 'WEBSITE' || !b.destinationDetail.trim()), 2],
    ['messageOwner', b.destination === 'WHATSAPP' && !plan.notes.trim(), 5],
    ['timing', !b.timing.trim(), 4], ['budget', b.channels.some(c => c !== 'ORGANIC') && !b.budgetNote.trim(), 4],
  ];
  return rules.filter(([id, needed]) => needed && (includeDeferred || !b.deferredRecommendations.includes(id)))
    .map(([id, , question, applicable]) => ({ id, question, applicable }));
}
export function copyCampaignBrief(brief: CampaignBrief): CampaignBrief {
  return { ...brief, channels: [...brief.channels], materials: [...brief.materials], deferredRecommendations: [...brief.deferredRecommendations] };
}
export function applyCampaignPath(plan: FunnelInput, stages: FunnelStage[]): FunnelInput {
  // Never overwrite a customized or historical funnel when accepting a suggestion.
  return plan.stages.length ? plan : { ...plan, stages: stages.map(s => ({ ...s, target: null })) };
}
