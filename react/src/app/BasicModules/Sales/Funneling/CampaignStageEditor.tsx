import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import type { FunnelStage } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { JourneyCopy } from './journeyCopy';
import { journeyActions, journeyContents } from './journeyModel';

export const campaignSelectClass = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900';
export function CampaignPresetField({ label, value, options, onChange, j, maxLength = 1000 }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; j: JourneyCopy; maxLength?: number;
}) {
  const [custom, setCustom] = useState(false);
  const isCustom = custom || (!!value && !options.includes(value));
  return <div className="space-y-2"><label className="block space-y-2 text-sm"><span className="font-medium">{label}</span>
    <select className={campaignSelectClass} value={isCustom ? 'CUSTOM' : value} onChange={event => { const next = event.target.value; setCustom(next === 'CUSTOM'); if (next !== 'CUSTOM') onChange(next); }}>
      <option value="">{j.none}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}<option value="CUSTOM">{j.custom}</option>
    </select></label>{isCustom && <label className="block space-y-2 text-sm"><span>{j.custom}: {label}</span><Textarea rows={3} value={value} maxLength={maxLength} onChange={event => onChange(event.target.value)} /></label>}</div>;
}
export function CampaignStageEditor({ stage, index, count, copy, j, revealDetails = false, onChange, onMove, onAdd, onRemove }: {
  stage: FunnelStage; index: number; count: number; copy: FunnelCopy; j: JourneyCopy; revealDetails?: boolean;
  onChange: (patch: Partial<FunnelStage>) => void; onMove: (direction: -1 | 1) => void; onAdd: () => void; onRemove: () => void;
}) {
  return <div className="space-y-5">
    <div><p className="text-xs text-[#B63B32] dark:text-[#FFB0AA]">{j.stage} {index + 1} / {count}</p><h3 className="mt-1 break-words text-lg font-medium">{stage.name}</h3></div>
    <CampaignPresetField label={j.action} value={stage.action} options={journeyActions.map(id => j[`a${id}`])} j={j} onChange={action => {
      const preset = journeyActions.find(id => j[`a${id}`] === action);
      const replaceMeasure = !stage.measure.trim() || journeyActions.some(id => j[`m${id}`] === stage.measure);
      onChange({ action, ...(preset && replaceMeasure ? { measure: j[`m${preset}`] } : {}) });
    }} />
    <CampaignPresetField label={j.content} value={stage.content ?? ''} options={journeyContents.map(id => j[`c${id}`])} onChange={content => onChange({ content })} j={j} />
    <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"><p className="text-xs text-slate-500 dark:text-slate-400">{copy.measure}</p><p className="mt-1 break-words">{stage.measure || j.none}</p></div>
    <details open={revealDetails || undefined} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">{j.advanced}</summary><div className="mt-4 space-y-4">
      <label className="block space-y-2 text-sm"><span>{copy.stageName}</span><Input maxLength={100} value={stage.name} onChange={e => onChange({ name: e.target.value })} /></label>
      <label className="block space-y-2 text-sm"><span>{copy.measure}</span><Input maxLength={300} value={stage.measure} onChange={e => onChange({ measure: e.target.value })} /></label>
      <label className="block space-y-2 text-sm"><span>{copy.target}</span><Input type="number" min={0} max={10000000} step={1} value={stage.target ?? ''} onChange={e => onChange({ target: e.target.value === '' ? null : Number(e.target.value) })} /><span className="block text-xs text-slate-500 dark:text-slate-400">{j.optionalTargets}</span></label>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11 gap-1" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" />{copy.moveUp}</Button><Button type="button" variant="outline" className="min-h-11 gap-1" disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" />{copy.moveDown}</Button></div>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11 gap-1" disabled={count >= 12} onClick={onAdd}><Plus className="h-4 w-4" />{copy.addStage}</Button><Button type="button" variant="ghost" className="min-h-11 gap-1" disabled={count <= 2} onClick={onRemove}><Trash2 className="h-4 w-4" />{copy.removeStage}</Button></div>
    </div></details>
  </div>;
}
