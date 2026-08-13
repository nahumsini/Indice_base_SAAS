import type { DistributorCommercialStage } from '../types/contractsAccess';
import type { DistributorPortalCopy } from '../translations';

const stageClasses: Record<DistributorCommercialStage, string> = {
  PROSPECT: 'border-amber-200 bg-amber-50 text-amber-700',
  DEMO: 'border-blue-200 bg-blue-50 text-blue-700',
  TRIAL: 'border-violet-200 bg-violet-50 text-violet-700',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ATTENTION: 'border-rose-200 bg-rose-50 text-rose-700',
  INACTIVE: 'border-slate-200 bg-slate-100 text-slate-600',
};

export function CommercialStageBadge({ copy, stage }: { copy: DistributorPortalCopy; stage: DistributorCommercialStage }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${stageClasses[stage]}`}>
      {copy.states[stage]}
    </span>
  );
}
