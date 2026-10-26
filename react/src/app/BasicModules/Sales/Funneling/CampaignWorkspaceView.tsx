import { useState } from 'react';
import { Copy, FileText, Lightbulb, Pencil, Sparkles, CheckCircle2, Clock3 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { FunnelPlan } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { CampaignPlanContent } from './CampaignPlanContent';
import { CampaignFunnelDiagram } from './CampaignFunnelDiagram';
import { contentGuideCopy } from './contentGuideCopy';
import { contentGenerationCopy } from './contentGenerationCopy';
import { journeyCopy } from './journeyCopy';
import { suggestJourney, type CampaignPanel } from './journeyModel';

export function CampaignIdeaCards({ plans, copy, c, onSelect, onDuplicate, onCreateContent, contentLabel, locale }: {
  locale:string; contentLabel:string; onCreateContent:(plan:FunnelPlan)=>void; plans: FunnelPlan[]; copy: FunnelCopy; c: CampaignCopy; onSelect: (plan: FunnelPlan) => void; onDuplicate: (plan: FunnelPlan) => void;
}) {
  const guide=contentGuideCopy(locale),g=contentGenerationCopy(locale);
  return <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map(plan => {
    const idea=(plan.workshop?.idea||plan.objective||'').trim();
    const description=idea.toLocaleLowerCase()===plan.name.trim().toLocaleLowerCase()?'':idea;
    const details=[[c.offer,plan.workshop?.offer],[copy.audience,plan.audience]].filter(([,value])=>value?.trim());
    const format=plan.contentGuide?.format,hasResponse=!!plan.workshop?.aiResponse?.trim();
    const statusClass=plan.status==='PLANNED'?'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200':plan.status==='DRAFT'?'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200':'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    return <article key={plan.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-[#FF6B5E]/50 focus-within:border-[#FF6B5E] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 text-[#B63B32] dark:text-[#FFB0AA]"><Lightbulb className="size-5"/></span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>{plan.status==='DRAFT'?copy.draft:plan.status==='PLANNED'?copy.planned:copy.archived}</span></div>
        <h3 className="min-w-0"><button type="button" className="min-h-11 w-full break-words text-left text-lg font-medium leading-snug text-slate-950 underline-offset-4 hover:underline focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] dark:text-white" onClick={()=>onSelect(plan)}>{plan.name}</button></h3>
        {description&&<p className="line-clamp-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>}
        <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex min-w-0 items-start gap-2 text-sm"><Sparkles className="mt-0.5 size-4 shrink-0 text-[#B63B32] dark:text-[#FFB0AA]" aria-hidden="true"/><div className="min-w-0"><span className="block text-xs text-slate-500 dark:text-slate-400">{guide.format}</span><span className="break-words text-slate-700 dark:text-slate-200">{format&&format!=='AUTO'?guide[`format_${format}`]:g.formatPending}</span></div></div>
          <p className={`flex items-start gap-2 text-xs leading-5 ${hasResponse?'text-emerald-800 dark:text-emerald-200':'text-slate-500 dark:text-slate-400'}`}>{hasResponse?<CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>:<Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>}<span>{hasResponse?g.aiResponseSaved:g.aiResponsePending}</span></p>
        </div>
        {details.length>0&&<dl className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">{details.map(([label,value])=><div key={label} className="min-w-0"><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 line-clamp-2 break-words text-sm text-slate-700 dark:text-slate-200">{value}</dd></div>)}</dl>}
        {!!plan.workshop?.channels.length&&<div className="mt-auto flex flex-wrap gap-2 pt-1">{plan.workshop.channels.map(channel=><span key={channel} className="rounded-full border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 px-2.5 py-1 text-xs text-[#973B34] dark:text-[#FFCEC6]">{c[`channel_${channel}`]}</span>)}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5"><Button className="min-h-11 w-full gap-2 bg-[#FF6B5E] text-[#222831] shadow-none hover:bg-[#E8564B]" onClick={()=>onCreateContent(plan)}><Sparkles className="size-4"/>{contentLabel}</Button><Button variant="outline" className="min-h-11 flex-1" onClick={()=>onSelect(plan)}>{plan.workshop?c.review:copy.viewFunnel}</Button><Button variant="ghost" className="min-h-11 gap-2 px-3" aria-label={`${copy.duplicate}: ${plan.name}`} onClick={()=>onDuplicate(plan)}><Copy className="size-4"/>{copy.duplicate}</Button></div>
    </article>;
  })}</div>;
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
