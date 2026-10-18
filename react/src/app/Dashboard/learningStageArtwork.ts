import type { OperationalJourneyStageId } from './operationalJourney';

export const learningStageArtwork: Record<OperationalJourneyStageId, { name: string; accent: string; active: string }> = {
  company_setup: { name: 'company', accent: 'border-t-[#2563EB]', active: 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-500/10' },
  human_resources: { name: 'people', accent: 'border-t-[#59C3A5]', active: 'border-[#59C3A5] bg-emerald-50/70 dark:bg-emerald-500/10' },
  operations: { name: 'checklist', accent: 'border-t-[#F4C84A]', active: 'border-[#F4C84A] bg-amber-50/70 dark:bg-amber-400/10' },
  finance: { name: 'cashbox', accent: 'border-t-[#147514]', active: 'border-[#147514] bg-emerald-50/70 dark:bg-emerald-500/10' },
  commercial: { name: 'briefcase', accent: 'border-t-[#FF6B5E]', active: 'border-[#FF6B5E] bg-rose-50/70 dark:bg-rose-500/10' },
  analytics: { name: 'chart', accent: 'border-t-purple-600', active: 'border-purple-600 bg-purple-50/70 dark:bg-purple-500/10' },
};
