import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, GitBranch, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { FormField } from '../../Sales/components/SalesModalPrimitives';
import { postSaleWorkspaceApi as api, type ContinuityFlow, type ContinuityStage, type SaveContinuityFlow } from './postSaleWorkspaceApi';
import { continuityColors, errorStatus } from './continuityModel';
import { stageLabel, type ContinuityCopy } from './continuityCopy';

export function ContinuityFlowModal({ flows, t, onClose, onSaved }: { flows: ContinuityFlow[]; t: ContinuityCopy; onClose: () => void; onSaved: (flow: ContinuityFlow) => void }) {
  const [selected, setSelected] = useState<ContinuityFlow>(flows[0]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(selected.name);
  const [stages, setStages] = useState(selected.stages);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<{ id: number | null; command: SaveContinuityFlow } | null>(null);
  const inFlight = useRef(false);
  const readonly = !creating && selected.id === 0;
  const choose = (flow: ContinuityFlow) => { setSelected(flow); setName(flow.name); setStages(flow.stages); setCreating(false); setError(''); };
  const create = () => {
    setCreating(true); setName(''); setStages(flows[0].stages.map((stage) => ({ ...stage, label: stageLabel(stage.key, stage.label, true, t) }))); setError('');
  };
  const patch = (key: string, value: Partial<ContinuityStage>) => setStages((current) => current.map((stage) => stage.key === key ? { ...stage, ...value } : stage));
  const move = (index: number, offset: number) => setStages((current) => {
    const next = [...current]; const target = index + offset;
    if (target < 0 || target >= next.length - 1) return current;
    [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const save = async (archive = false) => {
    if (inFlight.current || readonly) return;
    if (!name.trim() || stages.some((stage) => !stage.label.trim())) { setError(t.flowRequired); return; }
    pending.current ??= { id: creating ? null : selected.id, command: { requestKey: crypto.randomUUID(), version: selected.version, name: name.trim(), archived: archive, stages } };
    inFlight.current = true; setBusy(true); setError('');
    try { const value = await api.saveFlow(pending.current.id, pending.current.command); pending.current = null; setUncertain(false); choose(value); onSaved(value); }
    catch (failure) { const status = errorStatus(failure); setError(status === 409 ? t.conflict : t.saveError); if (status >= 400 && status < 500) { pending.current = null; setUncertain(false); } else setUncertain(true); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <SalesModalFrame open onOpenChange={(open) => { if (!open && !busy && !uncertain) onClose(); }} busy={busy || uncertain} title={t.flows} description={t.flowHint}
    icon={<GitBranch className="h-6 w-6" />} modalType="operational-workspace" closeLabel={t.close}
    footer={<><Button variant="outline" disabled={busy || uncertain} onClick={onClose}>{t.close}</Button>{!readonly && <Button className={getSalesModalActionClassNames('coral').primary} disabled={busy || selected.archived && !creating} onClick={() => { void save(); }}>{busy ? t.saving : t.saveFlow}</Button>}</>}>
    <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
      <nav className="space-y-2" aria-label={t.flows}>
        {flows.filter((flow) => !flow.archived).map((flow) => <Button key={flow.id} variant={!creating && selected.id === flow.id ? 'secondary' : 'ghost'} className="w-full justify-start whitespace-normal text-left" disabled={busy || uncertain} onClick={() => choose(flow)}>{flow.id === 0 ? t.defaultFlow : flow.name}</Button>)}
        <Button variant="outline" className="w-full" disabled={busy || uncertain} onClick={create}><Plus className="mr-2 h-4 w-4" />{t.newFlow}</Button>
      </nav>
      <div className="min-w-0 space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />
        {readonly ? <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200"><p>{t.readonlyFlow}</p><Button className="mt-3" variant="outline" onClick={create}>{t.duplicateDefault}</Button></div> : <FormField label={t.flowName}><Input aria-label={t.flowName} disabled={busy || uncertain} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></FormField>}
        <ol className="space-y-3">{stages.map((stage, index) => <li key={stage.key} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: continuityColors[stage.colorToken] }} /><span className="text-sm text-slate-400">{index + 1}</span>
            <Input className="min-w-[150px] flex-1" aria-label={`${t.stageLabel} ${index + 1}`} value={readonly ? stageLabel(stage.key, stage.label, true, t) : stage.label} maxLength={80} disabled={readonly || busy || uncertain} onChange={(event) => patch(stage.key, { label: event.target.value })} />
            <Select value={stage.colorToken} disabled={readonly || busy || uncertain} onValueChange={(colorToken) => patch(stage.key, { colorToken })}><SelectTrigger aria-label={`${t.color} ${index + 1}`} className="w-28"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(continuityColors).map((color) => <SelectItem key={color} value={color}>{t[color.toLowerCase() as keyof ContinuityCopy]}</SelectItem>)}</SelectContent></Select>
          </div>
          {stage.key === 'completed' ? <p className="mt-2 text-xs text-slate-500">{t.completedFixed}</p> : !readonly && <div className="mt-2 flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={`${t.moveUp} ${stage.label}`} disabled={busy || uncertain || index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`${t.moveDown} ${stage.label}`} disabled={busy || uncertain || index === stages.length - 2} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label={`${t.remove} ${stage.label}`} disabled={busy || uncertain || stages.length <= 2} onClick={() => setStages((current) => current.filter((value) => value.key !== stage.key))}><Trash2 className="h-4 w-4" /></Button>
          </div>}
        </li>)}</ol>
        {!readonly && <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" disabled={busy || uncertain || stages.length >= 12} onClick={() => setStages((current) => [...current.slice(0, -1), { key: `stage_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`, label: '', colorToken: 'BLUE' }, current[current.length - 1]])}><Plus className="mr-2 h-4 w-4" />{t.addStage}</Button>
          {!creating && !selected.archived && <Button variant="ghost" disabled={busy || uncertain} onClick={() => { void save(true); }}>{t.archive}</Button>}
        </div>}
      </div>
    </div>
  </SalesModalFrame>;
}
