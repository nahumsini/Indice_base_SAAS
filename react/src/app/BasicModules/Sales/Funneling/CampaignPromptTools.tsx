import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, Printer, TriangleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { FunnelInput } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { brandApi } from './brand/brandApi';
import { brandCopy } from './brand/brandCopy';
import { brandPromptContext, type BrandSnapshot } from './brand/brandModel';
import { buildCampaignPrompt, campaignPromptDocument } from './campaignPrompt';

export function CampaignPromptTools({ plan, copy, c, locale, extraContext, companyContext, campaignId, presentation = 'standard' }: { companyContext?: BrandSnapshot|null; campaignId?:string; presentation?: 'standard' | 'workspace'; plan: FunnelInput; copy: FunnelCopy; c: CampaignCopy; locale: string; extraContext?: { title: string; content: unknown } }) {
  const bc=brandCopy(locale),id=campaignId??('id' in plan?String(plan.id):undefined);
  const [storedContext,setStoredContext]=useState<BrandSnapshot|null>(null),[contextError,setContextError]=useState(false),[contextLoading,setContextLoading]=useState(Boolean(id)),[revision,setRevision]=useState(0),[showInstructions,setShowInstructions]=useState(presentation!=='workspace');
  useEffect(()=>{if(companyContext!==undefined){setStoredContext(companyContext);setContextLoading(false);setContextError(false);return;}if(!id){setContextLoading(false);return;}const controller=new AbortController();setStoredContext(null);setContextLoading(true);setContextError(false);brandApi.snapshot(id,controller.signal).then(value=>{if(!controller.signal.aborted)setStoredContext(value);}).catch(()=>{if(!controller.signal.aborted)setContextError(true);}).finally(()=>{if(!controller.signal.aborted)setContextLoading(false);});return()=>controller.abort();},[id,companyContext,revision]);
  const reference=brandPromptContext(storedContext,bc,locale),referenceText=reference?`\n\nBEGIN CONTEXT\n${JSON.stringify({[bc.title]:reference},null,2)}\nEND CONTEXT`:'';
  const [notice, setNotice] = useState<{ prompt: string; text: string; kind: 'success' | 'error' } | null>(null);
  const [manualCopy,setManualCopy]=useState<{prompt:string;request:number}|null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const copyRequest = useRef(0);
  const currentPrompt = useRef('');
  const prompt = buildCampaignPrompt(plan, c, copy, locale) + referenceText + (extraContext ? `\n\n${extraContext.title}\n${JSON.stringify(extraContext.content, null, 2)}` : '');
  currentPrompt.current = prompt;
  useEffect(()=>{if(!manualCopy||!showInstructions)return;if(manualCopy.prompt===currentPrompt.current&&manualCopy.request===copyRequest.current){const field=promptRef.current;if(field){field.focus({preventScroll:true});field.select();field.setSelectionRange(0,field.value.length);field.scrollIntoView({block:'nearest'});}}setManualCopy(null);},[manualCopy,showInstructions]);
  async function copyPrompt() {
    const request = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(prompt);
      if (request === copyRequest.current && currentPrompt.current === prompt) setNotice({ prompt, text: c.copied, kind: 'success' });
    } catch {
      if (request !== copyRequest.current || currentPrompt.current !== prompt) return;
      // The current prompt remains usable in browsers that block clipboard permission.
      setShowInstructions(true);setManualCopy({prompt,request});
      setNotice({ prompt, text: c.copyError, kind: 'error' });
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([prompt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `campaign-${plan.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 100) || 'plan'}.txt`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className={`campaign-prompt-tools space-y-4 ${presentation === 'workspace' ? 'campaign-prompt-workspace' : ''}`}>
    <p className="text-sm text-slate-500 dark:text-slate-400">{c.promptHint}</p>
    <div className="campaign-prompt-actions flex flex-wrap gap-2"><Button type="button" variant="outline" className="campaign-prompt-copy h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" disabled={contextLoading||contextError} onClick={() => { void copyPrompt(); }}><Copy className="h-4 w-4" />{c.copyPrompt}</Button><Button type="button" variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" disabled={contextLoading||contextError} onClick={download}><Download className="h-4 w-4" />{c.download}</Button><Button type="button" variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" disabled={contextLoading||contextError} onClick={() => printStandardDocumentHtml(campaignPromptDocument(plan, prompt, c, locale))}><Printer className="h-4 w-4" />{c.print}</Button></div>
    {notice?.prompt === prompt && <p role="status" data-kind={notice.kind} className="campaign-prompt-notice text-sm">{presentation === 'workspace' && (notice.kind === 'success' ? <CheckCircle2 size={15} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />)}{notice.text}</p>}
    {contextError&&<p role="alert" className="brand-alert">{bc.pending} <Button variant="outline" onClick={()=>setRevision(v=>v+1)}>{copy.retry}</Button></p>}
    {storedContext?.assets.length? <p className="text-xs text-slate-500">{bc.notAttached}</p>:null}
    <details open={showInstructions} onToggle={event=>setShowInstructions(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer text-sm font-medium">{bc.instructions}</summary><label className="block space-y-2 text-sm"><span>{c.prompt}</span><Textarea ref={promptRef} readOnly rows={14} value={prompt} className="max-h-80 overflow-y-auto font-mono text-sm leading-6 [field-sizing:fixed]" /></label></details>
  </div>;
}
