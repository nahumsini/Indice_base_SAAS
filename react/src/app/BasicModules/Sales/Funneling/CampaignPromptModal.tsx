import { useState } from 'react';
import { Copy, Download, FileText, Printer } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { SalesModalFrame } from '../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../salesModalStyles';
import { printStandardDocumentHtml } from '../../shared/print/standardDocumentHtml';
import type { FunnelPlan } from './funnelModel';
import type { FunnelCopy } from './funnelCopy';
import { campaignCopy } from './campaignCopy';
import { buildCampaignPrompt, campaignPromptDocument } from './campaignPrompt';

const actions = getSalesModalActionClassNames();

export function CampaignPromptModal({ plan, copy, locale, onClose }: { plan: FunnelPlan; copy: FunnelCopy; locale: string; onClose: () => void }) {
  const c = campaignCopy(locale); const [notice, setNotice] = useState('');
  const prompt = buildCampaignPrompt(plan, c, copy, locale);
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); setNotice(c.copied); }
    catch { setNotice(c.copyError); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([prompt], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url;
    link.download = `campaign-${plan.id}.txt`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <SalesModalFrame open modalType="standard-form" title={c.prepareAi} description={c.promptHint} icon={<FileText />} closeLabel={copy.close} onOpenChange={onClose}
    footer={<><Button variant="outline" className={actions.secondary} onClick={onClose}>{copy.close}</Button><Button variant="outline" className={`${actions.secondary} gap-2`} onClick={download}><Download className="h-4 w-4" />{c.download}</Button><Button variant="outline" className={`${actions.secondary} gap-2`} onClick={() => printStandardDocumentHtml(campaignPromptDocument(plan, prompt, c, locale))}><Printer className="h-4 w-4" />{c.print}</Button><Button className={`${actions.primary} gap-2`} onClick={() => { void copyPrompt(); }}><Copy className="h-4 w-4" />{c.copyPrompt}</Button></>}>
    <div className="space-y-3"><p className="text-sm font-medium">{plan.name}</p><p role="status" className="text-sm">{notice}</p><label className="block space-y-2 text-sm"><span>{c.prompt}</span><Textarea readOnly rows={22} value={prompt} className="min-h-80 resize-y font-mono text-sm leading-6" /></label></div>
  </SalesModalFrame>;
}
