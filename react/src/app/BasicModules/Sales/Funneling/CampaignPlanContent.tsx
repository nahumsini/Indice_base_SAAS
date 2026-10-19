import type { FunnelInput, FunnelStage } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';

export function suggestedCampaignStages(c: CampaignCopy): FunnelStage[] {
  return [1, 2, 3].map(index => ({ name: c[`path${index}` as keyof CampaignCopy], action: c[`pathAction${index}` as keyof CampaignCopy], measure: c[`pathMeasure${index}` as keyof CampaignCopy], target: null }));
}
export function CampaignPlanContent({ plan, copy, c, hidePath = false }: { plan: FunnelInput; copy: FunnelCopy; c: CampaignCopy; hidePath?: boolean }) {
  const b = plan.workshop!;
  const values = [
    [c.offer, b.offer], [copy.audience, plan.audience], [c.location, b.location], [copy.objective, plan.objective],
    [c.channels, b.channels.map(channel => c[`channel_${channel}`]).join(' · ')],
    [c.destination, b.destination === 'UNDECIDED' ? '' : c[`destination_${b.destination}`]], [c.destinationDetail, b.destinationDetail],
    [c.materials, b.materials.map(material => c[`material_${material}`]).join(' · ')], [c.timing, b.timing], [c.budgetNote, b.budgetNote],
  ];
  return <div className="min-w-0 space-y-5">
    <div><h3 className="text-lg font-medium">{plan.name || c.newIdea}</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{b.idea || copy.undefined}</p></div>
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{values.map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || copy.undefined}</dd></div>)}</dl>
    {!hidePath && <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700"><h3 className="text-sm font-medium">{c.path} {!plan.stages.length && <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">{c.suggested}</span>}</h3>
      <ol className="grid gap-3 lg:grid-cols-3">{(plan.stages.length ? plan.stages : suggestedCampaignStages(c)).map((stage, i) => <li key={i} className="min-w-0 rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-4"><p className="break-words text-sm font-medium"><span className="mr-2 text-[#B63B32] dark:text-[#FFB0AA]">{i + 1}.</span>{stage.name}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{stage.action || copy.undefined}</p></li>)}</ol>
    </section>}
    {plan.notes && <div className="text-sm"><p className="font-medium">{copy.notes}</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{plan.notes}</p></div>}
  </div>;
}
