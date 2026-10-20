import { ChevronDown, Lightbulb, Quote } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { campaignSelectClass } from './CampaignStageEditor';
import { contentGuideCopy } from './contentGuideCopy';
import { contentTypes, contentFormats, contentGoals, contentHooks, contentVariations, emptyContentGuide, type ContentGuide } from './contentGuideModel';

export function CampaignContentGuide({ value, locale, onChange, compact = false }: { value?: ContentGuide | null; locale: string; compact?: boolean; onChange: (value: ContentGuide) => void }) {
  const g = value ?? emptyContentGuide(), c = contentGuideCopy(locale);
  const patch = (next: Partial<ContentGuide>) => onChange({ ...g, ...next });
  const label = (key: 'contentType' | 'format' | 'pieceGoal' | 'hook', id: string) => id === 'AUTO' ? c.auto : id === 'CUSTOM' ? c.custom
    : c[`${{contentType:'type',format:'format',pieceGoal:'goal',hook:'hook'}[key]}_${id}` as keyof typeof c];
  const groups = [
    { key: 'contentType', ids: contentTypes }, { key: 'format', ids: contentFormats }, { key: 'pieceGoal', ids: contentGoals },
  ] as const;
  return <section aria-label={c.title} className={compact ? "campaign-content-guide-compact" : "min-w-0 space-y-4 rounded-xl border border-[#FF6B5E]/30 text-slate-900 dark:text-slate-100 bg-[#FF6B5E]/5 p-4 dark:bg-[#FF6B5E]/10"}>
    <div className="space-y-1"><h3 className={compact ? "sr-only" : "text-sm font-medium"}>{c.title}</h3><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{c.hint}</p></div>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {groups.map(({ key, ids }) => <label key={key} data-guide-field={key} data-chosen={g[key] !== 'AUTO'} className="block min-w-0 space-y-2 text-sm"><span>{c[key]}</span><select className={campaignSelectClass} value={g[key]} onChange={e => patch({ [key]: e.target.value })}>{ids.map(id => <option key={id} value={id}>{label(key,id)}</option>)}</select></label>)}
      <label data-guide-field="hook" data-chosen={g.hook !== 'AUTO'} className="block min-w-0 space-y-2 text-sm"><span>{c.hook}</span><select className={campaignSelectClass} value={g.hook} onChange={e => patch({ hook: e.target.value as ContentGuide['hook'] })}>{contentHooks.map(id => <option key={id} value={id}>{label('hook',id)}</option>)}</select></label>
    </div>
    {!compact && <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{c.goalHint}</p>}
    {!compact && g.format === 'SHORT_VIDEO' && <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{c.formatHint}</p>}
    {g.hook === 'CUSTOM' ? <label className="block space-y-2 text-sm"><span>{c.customHook}</span><Textarea rows={2} maxLength={1000} value={g.customHook} onChange={e => patch({ customHook: e.target.value })} /><span className="block text-xs text-slate-500 dark:text-slate-400">{c.customHint}</span></label>
      : !compact && <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{c.hookHint}</p>}
    {compact && !['AUTO', 'CUSTOM'].includes(g.hook) && <blockquote className="content-guide-hook-preview"><Quote size={18} aria-hidden="true" /><div><span>{c.hook}</span><p>{label('hook',g.hook)}</p></div></blockquote>}
    <label className="block space-y-2 text-sm"><span>{c.topic}</span><>{compact ? <Textarea rows={2} maxLength={500} placeholder={c.topicPlaceholder} value={g.topic} onChange={e => patch({ topic: e.target.value })} /> : <Input maxLength={500} placeholder={c.topicPlaceholder} value={g.topic} onChange={e => patch({ topic: e.target.value })} />}</></label>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className="block min-w-0 space-y-2 text-sm"><span>{c.variation}</span><select className={campaignSelectClass} value={g.variation} onChange={e => patch({ variation: e.target.value as ContentGuide['variation'] })}>{contentVariations.map(id => <option key={id} value={id}>{c[`variation_${id}`]}</option>)}</select></label>
      {g.variation !== 'NONE' && <label className="block space-y-2 text-sm"><span>{c.variationCount}</span><select className={campaignSelectClass} value={g.variationCount} onChange={e => patch({ variationCount: Number(e.target.value) })}>{[2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
    </div>
    {!compact && g.variation !== 'NONE' && <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{c.variationHint}</p>}
    {compact && <details className="content-guide-help"><summary><Lightbulb size={16} aria-hidden="true" />{c.help}<ChevronDown size={16} aria-hidden="true" /></summary><div><p>{c.goalHint}</p>{g.format === 'SHORT_VIDEO' && <p>{c.formatHint}</p>}<p>{c.hookHint}</p>{g.variation !== 'NONE' && <p>{c.variationHint}</p>}</div></details>}
    <div role="status" aria-label={c.summary} className={compact ? "content-guide-summary" : "space-y-1 break-words rounded-lg bg-white p-3 text-xs leading-5 dark:bg-slate-900"}>
      <p className="font-medium">{c.summary}</p><p>{(compact ? groups.filter(({ key }) => g[key] !== 'AUTO').map(({ key }) => label(key,g[key])) : [label('contentType',g.contentType),label('format',g.format),label('pieceGoal',g.pieceGoal)]).join(' · ') || c.auto}</p>
      {(!compact || g.hook !== 'AUTO') && <p>{g.hook === 'CUSTOM' ? g.customHook.trim() || c.auto : label('hook',g.hook)}</p>}
      <p>{c[`variation_${g.variation}`]}{g.variation !== 'NONE' ? ` · ${g.variationCount}` : ''}</p>
    </div>
  </section>;
}
