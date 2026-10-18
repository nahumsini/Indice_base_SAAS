import { useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogDescription, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../../../../components/ui/alert-dialog';
import { ApiClientError } from '../../../../lib/apiClient';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { OpportunityFlowStage } from '../../types/opportunities';
import { toBackendOpportunityStageKey } from '../../adapters/salesApiAdapters';
import { sellerApi, type CallScript, type ScriptContent, type SaveScript } from './sellerApi';
import type { SellerCopy } from './sellerCopy';
import { validScript } from './sellerModel';
const buttons = getSalesModalActionClassNames('coral');
export function SellerScriptManager({ flowId, flowName, stages, copy: t, onClose, onSaved }: {
  flowId: number; flowName: string; stages: OpportunityFlowStage[]; copy: SellerCopy; onClose: () => void; onSaved?: () => void;
}) {
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<SaveScript | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState<(() => void) | null>(null);
  const initial = useRef('');
  const dirty = draft !== null && JSON.stringify(draft) !== initial.current;
  const load = () => { setLoading(true); setError(''); return sellerApi.scripts(flowId).then(setScripts).catch(() => setError(t.error)).finally(() => setLoading(false)); };
  useEffect(() => { let active = true; sellerApi.scripts(flowId).then(value => { if (active) setScripts(value); }).catch(() => { if (active) setError(t.error); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [flowId, t]);
  const leave = (action: () => void) => { if (pending.current) return; if (dirty) setDiscard(() => action); else action(); };
  const open = (value: SaveScript) => { initial.current = JSON.stringify(value); setDraft(value); setPreview(false); setError(''); };
  const update = (patch: Partial<ScriptContent>) => setDraft(value => value ? { ...value, content: { ...value.content, ...patch } } : value);
  const save = async (status: SaveScript['status'], value = draft) => {
    if (!value || pending.current || !validScript(value.content)) return;
    pending.current = true; setBusy(true); setError('');
    try { const saved = await sellerApi.saveScript(flowId, { ...value, status }); setScripts(current => [saved, ...current.filter(item => item.id !== saved.id)]); setDraft(null); onSaved?.(); }
    catch (error) { setError(error instanceof ApiClientError && error.status === 409 ? t.conflict : t.error); }
    finally { pending.current = false; setBusy(false); }
  };
  const move = (index: number, offset: number) => { if (!draft) return; const blocks = [...draft.content.blocks]; [blocks[index],blocks[index + offset]] = [blocks[index + offset],blocks[index]]; update({ blocks }); };
  return <>
    <SalesModalFrame open onOpenChange={open => { if (!open) leave(onClose); }} busy={busy} modalType="operational-workspace" title={t.scripts + ' · ' + flowName} description={t.scriptHint} icon={<BookOpen className="h-5 w-5" />} closeLabel={t.close}
      contentClassName="max-w-5xl" bodyClassName="space-y-4" footerLeading={draft ? <Button variant="outline" disabled={busy} onClick={() => setPreview(!preview)}>{preview ? t.edit : t.preview}</Button> : undefined}
      footer={<><Button variant="outline" disabled={busy} onClick={() => leave(draft ? () => setDraft(null) : onClose)}>{draft ? t.back : t.close}</Button>{draft ? <><Button variant="outline" disabled={busy || !validScript(draft.content)} onClick={() => void save('DRAFT')}>{t.draft}</Button><Button className={buttons.primary} disabled={busy || !validScript(draft.content)} onClick={() => void save('PUBLISHED')}>{busy ? t.saving : t.publish}</Button></> : <Button className={buttons.primary} disabled={loading} onClick={() => open({ status: 'DRAFT', content: { name: '', goal: '', stageKey: '', blocks: [{ title: t.blocks[0], text: '' }] } })}><Plus />{t.create}</Button>}</>}>
      {error ? <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}{!draft ? <Button variant="ghost" onClick={() => void load()}>{t.retry}</Button> : null}</div> : null}
      {loading ? <p role="status">…</p> : !draft ? <div className="space-y-3">{!scripts.length ? <p className="rounded-xl border border-dashed p-8 text-center text-slate-500 dark:text-slate-400">{t.noScripts}</p> : scripts.map(script => <article key={script.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="min-w-0 flex-1"><p className="font-medium">{script.content.name} <span className="text-xs text-slate-500 dark:text-slate-400">v{script.version} · {script.archived ? t.archived : script.version === script.publishedVersion ? t.published : t.unpublished}</span></p><p className="text-sm text-slate-500 dark:text-slate-400">{script.content.goal}</p></div><Button variant="outline" disabled={busy} onClick={() => open({ id: script.id, expectedVersion: script.version, status: 'DRAFT', content: script.content })}>{t.edit}</Button><Button variant="outline" disabled={busy} onClick={() => open({ status: 'DRAFT', content: { ...script.content, name: script.content.name.slice(0, 140) + ' · ' + t.duplicate } })}>{t.duplicate}</Button>{!script.archived ? <Button variant="ghost" disabled={busy} onClick={() => void save('ARCHIVED', { id: script.id, expectedVersion: script.version, status: 'ARCHIVED', content: script.content })}>{t.archive}</Button> : null}</article>)}</div> : preview ? <div className="space-y-5"><h3 className="text-xl font-medium">{draft.content.name}</h3><p>{draft.content.goal}</p><p className="text-sm text-slate-500 dark:text-slate-400">{t.variables}</p>{draft.content.blocks.map((block,i) => <section key={i} className="rounded-xl bg-slate-50 p-5 dark:bg-slate-900"><h4 className="mb-2 font-medium text-[#b63b32]">{block.title}</h4><p className="whitespace-pre-wrap text-xl leading-relaxed">{block.text}</p></section>)}</div> : <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">{t.scriptName}<Input maxLength={160} value={draft.content.name} onChange={e => update({ name: e.target.value })} /></label><label className="space-y-1 text-sm">{t.stage}<Select value={draft.content.stageKey || '_all'} onValueChange={value => update({ stageKey: value === '_all' ? '' : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_all">{t.anyStage}</SelectItem>{stages.filter(stage => stage.type === 'OPEN').map(stage => <SelectItem key={stage.key} value={toBackendOpportunityStageKey(stage.key)}>{stage.label}</SelectItem>)}</SelectContent></Select></label></div>
        <label className="block space-y-1 text-sm">{t.goal}<Textarea maxLength={1000} value={draft.content.goal} onChange={e => update({ goal: e.target.value })} /></label><p className="text-xs text-slate-500 dark:text-slate-400">{t.variables}</p>
        {draft.content.blocks.map((block,index) => <section key={index} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center gap-2"><span className="mr-auto text-sm font-medium">{t.block} {index + 1}</span><Button size="icon" variant="ghost" aria-label={t.previous} disabled={index === 0} onClick={() => move(index,-1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label={t.next} disabled={index === draft.content.blocks.length - 1} onClick={() => move(index,1)}><ArrowDown /></Button><Button variant="ghost" disabled={draft.content.blocks.length === 1} onClick={() => update({ blocks: draft.content.blocks.filter((_, i) => i !== index) })}>{t.remove}</Button></div><label className="block text-sm">{t.blockTitle}<Input maxLength={100} value={block.title} onChange={e => update({ blocks: draft.content.blocks.map((item,i) => i === index ? { ...item, title: e.target.value } : item) })} /></label><label className="block text-sm">{t.blockText}<Textarea rows={5} maxLength={6000} value={block.text} onChange={e => update({ blocks: draft.content.blocks.map((item,i) => i === index ? { ...item, text: e.target.value } : item) })} /></label></section>)}
        <Button variant="outline" disabled={draft.content.blocks.length >= 20} onClick={() => update({ blocks: [...draft.content.blocks, { title: t.blocks[draft.content.blocks.length] ?? t.block, text: '' }] })}><Plus />{t.addBlock}</Button>
      </fieldset>}
    </SalesModalFrame>
    <AlertDialog open={Boolean(discard)} onOpenChange={open => { if (!open) setDiscard(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t.dirty}</AlertDialogTitle><AlertDialogDescription>{t.discardHint}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t.keep}</AlertDialogCancel><AlertDialogAction onClick={() => { discard?.(); setDiscard(null); }}>{t.discard}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
