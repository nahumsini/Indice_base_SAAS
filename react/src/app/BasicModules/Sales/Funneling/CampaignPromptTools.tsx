import { useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, Printer, TriangleAlert } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { FunnelInput } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { buildCampaignPrompt, campaignPromptDocument } from './campaignPrompt';

export function CampaignPromptTools({ plan, copy, c, locale, extraContext, presentation = 'standard' }: { presentation?: 'standard' | 'workspace'; plan: FunnelInput; copy: FunnelCopy; c: CampaignCopy; locale: string; extraContext?: { title: string; content: unknown } }) {
  const [notice, setNotice] = useState<{ prompt: string; text: string; kind: 'success' | 'error' } | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const copyRequest = useRef(0);
  const currentPrompt = useRef('');
  const prompt = buildCampaignPrompt(plan, c, copy, locale) + (extraContext ? `\n\n${extraContext.title}\n${JSON.stringify(extraContext.content, null, 2)}` : '');
  currentPrompt.current = prompt;
  async function copyPrompt() {
    const request = ++copyRequest.current;
    try {
      await navigator.clipboard.writeText(prompt);
      if (request === copyRequest.current && currentPrompt.current === prompt) setNotice({ prompt, text: c.copied, kind: 'success' });
    } catch {
      if (request !== copyRequest.current || currentPrompt.current !== prompt) return;
      // The current prompt remains usable in browsers that block clipboard permission.
      const field = promptRef.current;
      if (field) { field.focus({ preventScroll: true }); field.select(); field.setSelectionRange(0, field.value.length); field.scrollIntoView({ block: 'nearest' }); }
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
    <div className="campaign-prompt-actions flex flex-wrap gap-2"><Button type="button" variant="outline" className="campaign-prompt-copy h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" onClick={() => { void copyPrompt(); }}><Copy className="h-4 w-4" />{c.copyPrompt}</Button><Button type="button" variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" onClick={download}><Download className="h-4 w-4" />{c.download}</Button><Button type="button" variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal text-left" onClick={() => printStandardDocumentHtml(campaignPromptDocument(plan, prompt, c, locale))}><Printer className="h-4 w-4" />{c.print}</Button></div>
    {notice?.prompt === prompt && <p role="status" data-kind={notice.kind} className="campaign-prompt-notice text-sm">{presentation === 'workspace' && (notice.kind === 'success' ? <CheckCircle2 size={15} aria-hidden="true" /> : <TriangleAlert size={15} aria-hidden="true" />)}{notice.text}</p>}
    <label className="block space-y-2 text-sm"><span>{c.prompt}</span><Textarea ref={promptRef} readOnly rows={14} value={prompt} className="max-h-80 overflow-y-auto font-mono text-sm leading-6 [field-sizing:fixed]" /></label>
  </div>;
}
