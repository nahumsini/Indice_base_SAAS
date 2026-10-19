import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import type { FunnelInput } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { campaignChannels, campaignDestinations, campaignGoals, campaignMaterials, type CampaignBrief } from './campaignModel';

const selectClass = 'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900';
export function CampaignQuestions({ question, draft, copy, c, update, patch }: {
  question: number; draft: FunnelInput; copy: FunnelCopy; c: CampaignCopy;
  update: (value: Partial<FunnelInput>) => void; patch: (value: Partial<CampaignBrief>) => void;
}) {
  const brief = draft.workshop!;
  if (question === 0) return <label className="block space-y-2 text-sm"><span className="font-medium">{c.offer}</span><Textarea rows={5} maxLength={1000} value={brief.offer} onChange={e => patch({ offer: e.target.value })} /></label>;
  if (question === 1) return <div className="space-y-5">
    <label className="block space-y-2 text-sm"><span className="font-medium">{copy.audience}</span><Textarea rows={4} maxLength={1000} value={draft.audience} onChange={e => update({ audience: e.target.value })} /></label>
    <label className="block space-y-2 text-sm"><span className="font-medium">{c.location}</span><Input maxLength={180} value={brief.location} onChange={e => patch({ location: e.target.value })} /></label>
  </div>;
  if (question === 2) return <div className="space-y-5">
    <label className="block space-y-2 text-sm"><span className="font-medium">{c.goal}</span><select className={selectClass} value={brief.goal} onChange={e => {
      const goal = e.target.value as CampaignBrief['goal'];
      update({ workshop: { ...brief, goal }, ...(!draft.objective.trim() && goal !== 'UNDECIDED' ? { objective: c[`goal_${goal}`] } : {}) });
    }}>{campaignGoals.map(goal => <option key={goal} value={goal}>{c[`goal_${goal}`]}</option>)}</select></label>
    <label className="block space-y-2 text-sm"><span>{copy.objective}</span><Textarea rows={2} maxLength={1000} value={draft.objective} onChange={e => update({ objective: e.target.value })} /></label>
    <label className="block space-y-2 text-sm"><span className="font-medium">{c.destination}</span><select className={selectClass} value={brief.destination} onChange={e => patch({ destination: e.target.value as CampaignBrief['destination'] })}>{campaignDestinations.map(dest => <option key={dest} value={dest}>{c[`destination_${dest}`]}</option>)}</select></label>
    <label className="block space-y-2 text-sm"><span>{c.destinationDetail}</span><Input maxLength={500} value={brief.destinationDetail} onChange={e => patch({ destinationDetail: e.target.value })} /></label>
  </div>;
  if (question === 3) return <fieldset className="space-y-3"><legend className="mb-3 text-sm font-medium">{c.channels}</legend>{campaignChannels.map(channel => <button type="button" key={channel} aria-pressed={brief.channels.includes(channel)} onClick={() => patch({ channels: brief.channels.includes(channel) ? brief.channels.filter(v => v !== channel) : [...brief.channels, channel] })}
    className={`block min-h-11 w-full rounded-xl border p-4 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E] ${brief.channels.includes(channel) ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
    <span className="block font-medium">{c[`channel_${channel}`]}</span><span className="mt-1 block text-slate-500 dark:text-slate-400">{c[channel === 'ORGANIC' ? 'organicHelp' : channel === 'META_ADS' ? 'metaHelp' : 'googleHelp']}</span>
  </button>)}</fieldset>;
  return <div className="space-y-5">
    <fieldset><legend className="mb-3 text-sm font-medium">{c.materials}</legend><div className="flex flex-wrap gap-2">{campaignMaterials.map(material => <Button type="button" variant="outline" key={material} aria-pressed={brief.materials.includes(material)} className={`min-h-11 ${brief.materials.includes(material) ? 'border-[#FF6B5E] bg-[#FF6B5E]/10' : ''}`} onClick={() => patch({ materials: brief.materials.includes(material) ? brief.materials.filter(v => v !== material) : [...brief.materials, material] })}>{c[`material_${material}`]}</Button>)}</div></fieldset>
    <label className="block space-y-2 text-sm"><span>{c.timing}</span><Input maxLength={200} value={brief.timing} onChange={e => patch({ timing: e.target.value })} /></label>
    <label className="block space-y-2 text-sm"><span>{c.budgetNote}</span><Input maxLength={200} value={brief.budgetNote} onChange={e => patch({ budgetNote: e.target.value })} /><span className="block text-xs text-slate-500 dark:text-slate-400">{c.budgetHint}</span></label>
  </div>;
}
