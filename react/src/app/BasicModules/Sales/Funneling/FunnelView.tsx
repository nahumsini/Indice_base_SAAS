import { useId, useState } from 'react';
import { ArrowDown, Pencil, Target } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { FunnelCopy } from './funnelCopy';
import type { FunnelPlan } from './funnelModel';

type Props = { plan: FunnelPlan; copy: FunnelCopy; locale: string; statusLabel: string; channelLabel: string; onEdit: () => void };

/** A schematic, selectable planning diagram. All saved percentages come from the API. */
export function FunnelView({ plan, copy, locale, statusLabel, channelLabel, onEdit }: Props) {
  const [selected, setSelected] = useState(0);
  const detailId = useId();
  const hintId = useId();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const count = (value: number | null | undefined) => value == null ? copy.undefined : number.format(value);
  const percent = (value: number | null | undefined) => value == null ? copy.undefined : `${number.format(value)}%`;
  const stage = plan.stages[selected];
  const advance = plan.stageEstimates?.[selected]?.estimatedAdvance;
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label={plan.name}>
    <header className="space-y-4 border-b border-slate-200 p-5 dark:border-slate-700 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#FF6B5E]/10 px-3 py-1 font-medium text-[#B63B32] dark:text-[#FFB0AA]">{statusLabel}</span><span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{channelLabel}</span></div>
          <h2 className="break-words text-xl font-medium text-slate-900 dark:text-white">{plan.name}</h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300"><span className="font-medium">{copy.objective}: </span>{plan.objective || copy.undefined}</p>
        </div>
        <Button variant="outline" className="min-h-11 gap-2" onClick={onEdit}><Pencil className="h-4 w-4" />{copy.editPlan}</Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[{ label: copy.entryTarget, value: count(plan.stages[0]?.target) }, { label: copy.finalTarget, value: count(plan.stages[plan.stages.length - 1]?.target) }, { label: copy.totalConversion, value: percent(plan.estimatedConversion) }].map(({ label, value }) =>
          <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70"><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-xl font-medium tabular-nums text-slate-900 dark:text-white">{value}</dd></div>)}
      </dl>
    </header>
    <div className="grid min-w-0 gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
      <figure className="min-w-0" aria-label={copy.funnelView} aria-describedby={hintId}>
        <figcaption id={hintId} className="mb-5 space-y-1 text-sm"><p className="font-medium">{copy.selectStageHint}</p><p className="text-xs text-slate-500 dark:text-slate-400">{copy.schematicHint}</p></figcaption>
        <ol className="mx-auto max-w-2xl">
          {plan.stages.map((item, index) => <li key={index} className="flex flex-col items-center">
            {index > 0 && <p className="flex min-h-9 items-center justify-center gap-1.5 py-2 text-center text-xs text-slate-500 dark:text-slate-400"><ArrowDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span><strong className="font-medium text-slate-700 dark:text-slate-200">{percent(plan.stageEstimates?.[index]?.estimatedAdvance)}</strong> · {copy.expectedAdvance}</span></p>}
            <button type="button" aria-pressed={selected === index} aria-controls={detailId}
              aria-label={`${index + 1}. ${item.name} · ${copy.target}: ${count(item.target)}`}
              onClick={() => setSelected(index)}
              className="group relative isolate min-h-24 min-w-0 rounded-lg px-5 py-4 outline-none transition focus-visible:ring-2 focus-visible:ring-[#B63B32] focus-visible:ring-offset-2 dark:focus-visible:ring-[#FFB0AA] dark:focus-visible:ring-offset-slate-900"
              style={{ width: `${100 - (index / Math.max(1, plan.stages.length - 1)) * 40}%` }}>
              <span aria-hidden="true" className={`absolute inset-0 -z-10 transition-colors ${selected === index ? 'bg-[#FF6B5E]' : 'bg-[#FFF0ED] group-hover:bg-[#FFE0D9] dark:bg-[#442E31] dark:group-hover:bg-[#57363A]'}`} style={{ clipPath: 'polygon(0 0, 100% 0, 94% 100%, 6% 100%)' }} />
              <span className={`block break-words text-sm font-medium ${selected === index ? 'text-[#222831]' : 'text-[#973B34] dark:text-[#FFCEC6]'}`}><span className="mr-1.5 opacity-70">{index + 1}.</span>{item.name}</span>
              <span className={`mt-1 block break-words text-xl font-medium tabular-nums ${selected === index ? 'text-[#222831]' : 'text-slate-900 dark:text-white'}`}>{count(item.target)}</span>
              <span className={`block text-xs ${selected === index ? 'text-[#222831]' : 'text-slate-600 dark:text-slate-300'}`}>{copy.target}</span>
            </button>
          </li>)}
        </ol>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.previewHint}</p>
      </figure>
      <aside id={detailId} aria-label={copy.stageDetail} className="min-w-0 space-y-5 self-start rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 xl:sticky xl:top-5">
        <div aria-live="polite" aria-atomic="true"><p className="text-xs font-medium text-[#B63B32] dark:text-[#FFB0AA]">{copy.stageDetail} · {selected + 1} / {plan.stages.length}</p><h3 className="mt-2 break-words text-lg font-medium">{stage.name}</h3></div>
        <dl className="space-y-5 text-sm">
          <div><dt className="mb-1 text-slate-500 dark:text-slate-400">{copy.action}</dt><dd className="whitespace-pre-wrap break-words leading-6">{stage.action || copy.undefined}</dd></div>
          <div><dt className="mb-1 text-slate-500 dark:text-slate-400">{copy.measure}</dt><dd className="whitespace-pre-wrap break-words leading-6">{stage.measure || copy.undefined}</dd></div>
          <div className="rounded-xl border border-[#FF6B5E]/20 bg-white p-4 dark:bg-slate-900"><dt className="flex items-center gap-2 text-[#B63B32] dark:text-[#FFB0AA]"><Target aria-hidden="true" className="h-4 w-4" />{copy.target}</dt><dd className="mt-1 break-words text-2xl font-medium tabular-nums">{count(stage.target)}</dd></div>
          {selected > 0 ? <div><dt className="text-slate-500 dark:text-slate-400">{copy.expectedAdvance}</dt><dd className="mt-1 text-lg font-medium tabular-nums">{percent(advance)}</dd><dd className="mt-1 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.previousStage}: {plan.stages[selected - 1].name}{advance == null && <span className="mt-1 block">{copy.unknownAdvance}</span>}</dd></div> : <div><dt className="text-slate-500 dark:text-slate-400">{copy.entryStage}</dt><dd className="mt-1 break-words leading-6">{copy.audience}: {plan.audience || copy.undefined}</dd></div>}
        </dl>
        <Button variant="outline" className="min-h-11 w-full gap-2" onClick={onEdit}><Pencil className="h-4 w-4" />{copy.editPlan}</Button>
      </aside>
    </div>
  </section>;
}
