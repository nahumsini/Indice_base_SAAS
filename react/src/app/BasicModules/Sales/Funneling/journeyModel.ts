import type { FunnelInput, FunnelStage } from './funnelModel';
import type { CampaignBrief } from './campaignModel';
import type { CampaignCopy } from './campaignCopy';
import type { JourneyCopy } from './journeyCopy';

export type CampaignPanel = 'stage' | 'campaign' | 'prompt';
export const journeyActions = ['Discover', 'Trust', 'Contact', 'Book', 'Attend', 'Buy', 'Quote', 'Review', 'Renew'] as const;
export const journeyContents = ['Video', 'Post', 'Search', 'Welcome', 'Page', 'Proof', 'Reminder', 'Quote'] as const;
export type JourneyAction = typeof journeyActions[number];
export function suggestJourney(plan: FunnelInput, j: JourneyCopy): FunnelStage[] {
  const goal = plan.workshop?.goal ?? 'UNDECIDED';
  const paths: Record<CampaignBrief['goal'], JourneyAction[]> = {
    UNDECIDED: ['Discover', 'Trust', 'Contact'], AWARENESS: ['Discover', 'Trust'],
    INQUIRIES: ['Discover', 'Trust', 'Contact'], APPOINTMENTS: ['Discover', 'Contact', 'Book', 'Attend'],
    PURCHASES: ['Discover', 'Trust', 'Review', 'Buy'], QUOTES: ['Discover', 'Contact', 'Quote'],
    RENEWALS: ['Review', 'Contact', 'Renew'],
  };
  return paths[goal].map((action, index) => {
    const content = index === 0
      ? plan.workshop?.channels.includes('GOOGLE_SEARCH') ? 'Search' : plan.workshop?.materials.includes('VIDEO') ? 'Video' : goal === 'RENEWALS' ? 'Reminder' : 'Post'
      : action === 'Contact' ? plan.workshop?.destination === 'WHATSAPP' ? 'Welcome' : 'Page'
        : action === 'Trust' ? 'Proof' : action === 'Quote' || action === 'Review' ? 'Quote'
          : action === 'Attend' || action === 'Renew' ? 'Reminder' : 'Page';
    return { name: j[`a${action}`], action: j[`a${action}`], measure: j[`m${action}`], content: j[`c${content}`], target: null };
  });
}
export function changeCampaignGoal(plan: FunnelInput, goal: CampaignBrief['goal'], c: CampaignCopy): FunnelInput {
  if (!plan.workshop) return plan;
  const replaceObjective = !plan.objective.trim() || plan.objective === c[`goal_${plan.workshop.goal}`];
  return { ...plan, workshop: { ...plan.workshop, goal }, objective: replaceObjective ? goal === 'UNDECIDED' ? '' : c[`goal_${goal}`] : plan.objective };
}
export function normalizeJourneyDraft(plan: FunnelInput): FunnelInput {
  return { ...plan, stages: plan.stages.map(stage => ({ ...stage, content: stage.content ?? '' })) };
}
export function editJourneyStage(plan: FunnelInput, index: number, patch: Partial<FunnelStage>, suggestion: FunnelStage[]): FunnelInput {
  const source = plan.stages.length ? plan.stages : suggestion;
  return { ...plan, stages: source.map((stage, i) => ({ ...stage, ...(i === index ? patch : {}) })) };
}
