import type { FunnelCopy } from './funnelCopy';
import { previewConversion, type FunnelStage } from './funnelModel';

export function FunnelPreview({ stages, copy, locale }: { stages: FunnelStage[]; copy: FunnelCopy; locale: string }) {
  const first = stages[0]?.target;
  const conversion = previewConversion(stages);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return <aside className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div><h3 className="font-medium">{copy.preview}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.previewHint}</p></div>
    <ol className="space-y-3" aria-label={copy.preview}>
      {stages.map((stage, index) => <li key={index} className="text-sm">
        <div className="mb-1 flex items-start justify-between gap-3"><span className="min-w-0 break-words">{index + 1}. {stage.name || copy.stageName}</span><span className="shrink-0 font-medium tabular-nums">{stage.target === null ? '—' : number.format(stage.target)}</span></div>
        <div className="h-7 overflow-hidden rounded bg-slate-100 dark:bg-slate-800" aria-hidden="true">
          <div className="h-full rounded bg-[#FF6B5E]/70 transition-[width]" style={{ width: `${first && stage.target !== null ? Math.max(0, Math.min(100, stage.target / first * 100)) : 0}%` }} />
        </div>
        <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{stage.measure || copy.undefined}</p>
      </li>)}
    </ol>
    <div className="border-t border-slate-200 pt-4 dark:border-slate-700"><p className="text-sm text-slate-500 dark:text-slate-400">{copy.conversion}</p><p className="mt-1 text-2xl font-medium tabular-nums">{conversion === null ? '—' : `${number.format(conversion)}%`}</p></div>
  </aside>;
}
