import { useState } from 'react';
import { Copy, FileText, Lightbulb, Pencil } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { FunnelPlan } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { CampaignPlanContent } from './CampaignPlanContent';
import { CampaignFunnelDiagram } from './CampaignFunnelDiagram';
import { journeyCopy } from './journeyCopy';
import { suggestJourney, type CampaignPanel } from './journeyModel';

export function CampaignIdeaCards({ plans, copy, c, onSelect, onDuplicate }: {
  plans: FunnelPlan[]; copy: FunnelCopy; c: CampaignCopy; onSelect: (plan: FunnelPlan) => void; onDuplicate: (plan: FunnelPlan) => void;
}) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map(plan => <article key={plan.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-3 flex items-start justify-between gap-3"><Lightbulb className="h-5 w-5 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" /><span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{plan.status === 'DRAFT' ? copy.draft : plan.status === 'PLANNED' ? copy.planned : copy.archived}</span></div>
    <button type="button" className="min-h-11 break-words text-left text-lg font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]" onClick={() => onSelect(plan)}>{plan.name}</button>
    <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.workshop?.idea || plan.objective || copy.undefined}</p>
    <div className="my-4 flex flex-wrap gap-2">{plan.workshop?.channels.map(channel => <span key={channel} className="rounded-full bg-[#FF6B5E]/10 px-2 py-1 text-xs text-[#973B34] dark:text-[#FFCEC6]">{c[`channel_${channel}`]}</span>)}</div>
    <div className="mt-auto flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => onSelect(plan)}>{plan.workshop ? c.review : copy.viewFunnel}</Button><Button variant="ghost" className="h-11 w-11 p-0" aria-label={`${copy.duplicate}: ${plan.name}`} onClick={() => onDuplicate(plan)}><Copy className="h-4 w-4" /></Button></div>
  </article>)}</div>;
}
export function CampaignPlanView({ plan, copy, c, locale, onEdit }: {
  plan: FunnelPlan; copy: FunnelCopy; c: CampaignCopy; locale: string; onEdit: (panel: CampaignPanel, index?: number) => void;
}) {
  const j = journeyCopy(locale);
  const [selected, setSelected] = useState(0);
  const stages = plan.stages.length ? plan.stages : suggestJourney(plan, j);
  const stage = stages[Math.min(selected, stages.length - 1)];
  return <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700"><div className="min-w-0"><h2 className="break-words text-lg font-medium">{plan.name}</h2><p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{plan.workshop?.idea || plan.objective || c.pending}</p></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11 gap-2" onClick={() => onEdit('campaign')}><Pencil className="h-4 w-4" />{j.configure}</Button><Button variant="outline" className="min-h-11 gap-2" onClick={() => onEdit('prompt')}><FileText className="h-4 w-4" />{c.prepareAi}</Button></div></header>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1fr)]">
      <CampaignFunnelDiagram stages={stages} selected={selected} onSelect={index => { setSelected(index); onEdit('stage', index); }} copy={copy} j={j} locale={locale} suggested={!plan.stages.length} suggestedLabel={c.suggested} estimates={plan.stageEstimates} />
      <div className="min-w-0 space-y-5 self-start rounded-xl bg-slate-50 p-5 dark:bg-slate-800/60">
        <h3 className="break-words text-lg font-medium">{stage.name}</h3><dl className="space-y-4 text-sm">{[[j.action, stage.action], [j.content, stage.content], [copy.measure, stage.measure]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value || j.none}</dd></div>)}</dl>
        {plan.estimatedConversion !== null && <p className="text-sm">{copy.totalConversion}: {new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(plan.estimatedConversion)}%</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400">{j.optionalTargets}</p>
        <Button variant="outline" className="min-h-11" onClick={() => onEdit('stage', selected)}>{copy.edit}</Button>
      </div>
    </div>
    <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">{j.campaign}</summary><div className="mt-4">{plan.workshop ? <CampaignPlanContent plan={plan} copy={copy} c={c} hidePath /> : <dl className="space-y-4 text-sm"><div><dt>{copy.objective}</dt><dd className="whitespace-pre-wrap break-words">{plan.objective || j.none}</dd></div><div><dt>{copy.audience}</dt><dd className="whitespace-pre-wrap break-words">{plan.audience || j.none}</dd></div><div><dt>{copy.notes}</dt><dd className="whitespace-pre-wrap break-words">{plan.notes || j.none}</dd></div></dl>}</div></details>
    {plan.workshop?.aiResponse && <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">{c.response}</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{plan.workshop.aiResponse}</p></details>}
  </section>;
}
