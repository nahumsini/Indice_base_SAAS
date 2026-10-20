import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import type { FunnelInput } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import type { JourneyCopy } from './journeyCopy';
import { campaignChannels, campaignDestinations, campaignGoals, campaignMaterials, type CampaignBrief } from './campaignModel';
import { CampaignPresetField, campaignSelectClass } from './CampaignStageEditor';
import { funnelChannels } from './FunnelEditor';

export function CampaignContextEditor({ draft, copy, c, j, update, patch, onGoal }: {
  draft: FunnelInput; copy: FunnelCopy; c: CampaignCopy; j: JourneyCopy; update: (value: Partial<FunnelInput>) => void;
  patch: (value: Partial<CampaignBrief>) => void; onGoal: (goal: CampaignBrief['goal']) => void;
}) {
  const b = draft.workshop;
  return <div className="space-y-5">
    <label className="block space-y-2 text-sm"><span>{j.name} *</span><Input maxLength={180} value={draft.name} onChange={e => update({ name: e.target.value })} /></label>
    {b ? <>
      <label className="block space-y-2 text-sm"><span>{c.goal}</span><select className={campaignSelectClass} value={b.goal} onChange={e => onGoal(e.target.value as CampaignBrief['goal'])}>{campaignGoals.map(goal => <option key={goal} value={goal}>{c[`goal_${goal}`]}</option>)}</select></label>
      <fieldset><legend className="mb-2 text-sm font-medium">{c.channels}</legend><div className="flex flex-wrap gap-2">{campaignChannels.map(channel => <Button key={channel} type="button" variant="outline" aria-pressed={b.channels.includes(channel)} className={`min-h-11 h-auto whitespace-normal text-left ${b.channels.includes(channel) ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : ''}`} onClick={() => patch({ channels: b.channels.includes(channel) ? b.channels.filter(v => v !== channel) : [...b.channels, channel] })}>{c[`channel_${channel}`]}</Button>)}</div></fieldset>
      <label className="block space-y-2 text-sm"><span>{c.destination}</span><select className={campaignSelectClass} value={b.destination} onChange={e => patch({ destination: e.target.value as CampaignBrief['destination'] })}>{campaignDestinations.map(value => <option key={value} value={value}>{c[`destination_${value}`]}</option>)}</select></label>
      <label className="block space-y-2 text-sm"><span>{c.destinationDetail}</span><Input maxLength={500} value={b.destinationDetail} onChange={e => patch({ destinationDetail: e.target.value })} /></label>
      <label className="block space-y-2 text-sm"><span>{c.offer}</span><Input maxLength={1000} value={b.offer} onChange={e => patch({ offer: e.target.value })} /></label>
    </> : <>
      <p className="text-sm text-slate-500 dark:text-slate-400">{j.legacyHint}</p>
      <label className="block space-y-2 text-sm"><span>{copy.channel}</span><select className={campaignSelectClass} value={draft.channel} onChange={e => update({ channel: e.target.value as FunnelInput['channel'] })}>{funnelChannels(copy).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    </>}
    <CampaignPresetField label={j.audiencePreset} value={draft.audience} options={[j.people, j.businesses, j.customers, j.past]} onChange={audience => update({ audience })} j={j} />
    {b && <label className="block space-y-2 text-sm"><span>{c.location}</span><Input maxLength={180} value={b.location} onChange={e => patch({ location: e.target.value })} /></label>}
    <details className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer text-sm font-medium">{j.custom}</summary><div className="mt-4 space-y-4">
      {b && <label className="block space-y-2 text-sm"><span>{c.idea} *</span><Textarea rows={3} maxLength={4000} value={b.idea} onChange={e => patch({ idea: e.target.value })} /></label>}
      <label className="block space-y-2 text-sm"><span>{copy.objective}</span><Textarea rows={2} maxLength={1000} value={draft.objective} onChange={e => update({ objective: e.target.value })} /></label>
    </div></details>
    {b && <>
      <fieldset><legend className="mb-2 text-sm">{c.materials}</legend><div className="flex flex-wrap gap-2">{campaignMaterials.map(material => <Button type="button" variant="outline" key={material} aria-pressed={b.materials.includes(material)} className={`min-h-11 ${b.materials.includes(material) ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : ''}`} onClick={() => patch({ materials: b.materials.includes(material) ? b.materials.filter(v => v !== material) : [...b.materials, material] })}>{c[`material_${material}`]}</Button>)}</div></fieldset>
      <label className="block space-y-2 text-sm"><span>{c.timing}</span><Input maxLength={200} value={b.timing} onChange={e => patch({ timing: e.target.value })} /></label>
      <label className="block space-y-2 text-sm"><span>{c.budgetNote}</span><Input maxLength={200} value={b.budgetNote} onChange={e => patch({ budgetNote: e.target.value })} /></label>
    </>}
    <label className="block space-y-2 text-sm"><span>{copy.notes}</span><Textarea rows={3} maxLength={4000} value={draft.notes} onChange={e => update({ notes: e.target.value })} /></label>
    <label className="block space-y-2 text-sm"><span>{copy.status}</span><select className={campaignSelectClass} value={draft.status} onChange={e => update({ status: e.target.value as FunnelInput['status'] })}><option value="DRAFT">{copy.draft}</option><option value="PLANNED">{copy.planned}</option><option value="ARCHIVED">{copy.archived}</option></select></label>
  </div>;
}
