import type { FunnelStage } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { JourneyCopy } from './journeyCopy';

export function CampaignFunnelDiagram({ stages, selected, onSelect, copy, j, locale, suggested = false, suggestedLabel, estimates }: {
  stages: FunnelStage[]; selected: number; onSelect: (index: number) => void; copy: FunnelCopy; j: JourneyCopy; locale: string;
  suggested?: boolean; suggestedLabel?: string; estimates?: { estimatedAdvance: number | null }[];
}) {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return <figure className="min-w-0 space-y-4" aria-label={copy.funnelView}>
    <figcaption className="space-y-2"><p className="text-sm text-slate-600 dark:text-slate-300">{j.stageHint}</p>{suggested && <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{suggestedLabel}</span>}</figcaption>
    <ol className="space-y-2">{stages.map((stage, index) => <li key={index} className="flex flex-col items-center gap-2">
      {index > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">↓ {estimates?.[index]?.estimatedAdvance != null ? `${number.format(estimates[index].estimatedAdvance!)}% · ${copy.expectedAdvance}` : ''}</span>}
      <button type="button" aria-pressed={selected === index} aria-label={`${j.stage} ${index + 1}: ${stage.name}`} onClick={() => onSelect(index)}
        className="group relative isolate min-h-24 min-w-0 rounded-lg px-5 py-4 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#B63B32] focus-visible:ring-offset-2 dark:focus-visible:ring-[#FFB0AA] dark:focus-visible:ring-offset-slate-900"
        style={{ width: `${100 - index / Math.max(1, stages.length - 1) * 24}%` }}>
        <span aria-hidden="true" className={`absolute inset-0 -z-10 ${selected === index ? 'bg-[#FF6B5E]' : 'bg-[#FFF0ED] group-hover:bg-[#FFE0D9] dark:bg-[#442E31] dark:group-hover:bg-[#57363A]'}`} style={{ clipPath: 'polygon(0 0,100% 0,94% 100%,6% 100%)' }} />
        <span className={`block break-words text-sm font-medium ${selected === index ? 'text-[#222831]' : 'text-slate-900 dark:text-white'}`}>{index + 1}. {stage.name}</span>
        <span className={`mt-1 line-clamp-2 break-words text-xs ${selected === index ? 'text-[#222831]' : 'text-slate-600 dark:text-slate-300'}`}>{stage.content || stage.action || j.none}</span>
        {stage.target !== null && <span className={`mt-2 block text-sm tabular-nums ${selected === index ? 'text-[#222831]' : 'text-slate-700 dark:text-slate-200'}`}>{copy.target}: {number.format(stage.target)}</span>}
      </button>
    </li>)}</ol>
  </figure>;
}
