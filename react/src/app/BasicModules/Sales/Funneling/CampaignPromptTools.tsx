import { useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { FunnelInput } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import type { CampaignCopy } from './campaignCopy';
import { buildCampaignPrompt, campaignPromptDocument } from './campaignPrompt';

export function CampaignPromptTools({ plan, copy, c, locale }: { plan: FunnelInput; copy: FunnelCopy; c: CampaignCopy; locale: string }) {
  const [notice, setNotice] = useState('');
  const prompt = buildCampaignPrompt(plan, c, copy, locale);
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); setNotice(c.copied); }
    catch { setNotice(c.copyError); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([prompt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `campaign-${plan.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 100) || 'plan'}.txt`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-4">
    <p className="text-sm text-slate-500 dark:text-slate-400">{c.promptHint}</p>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => { void copyPrompt(); }}><Copy className="h-4 w-4" />{c.copyPrompt}</Button><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={download}><Download className="h-4 w-4" />{c.download}</Button><Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => printStandardDocumentHtml(campaignPromptDocument(plan, prompt, c, locale))}><Printer className="h-4 w-4" />{c.print}</Button></div>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <label className="block space-y-2 text-sm"><span>{c.prompt}</span><Textarea readOnly rows={14} value={prompt} className="font-mono text-sm leading-6" /></label>
  </div>;
}
