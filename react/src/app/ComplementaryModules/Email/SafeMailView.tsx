import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useMailCompletionCopy } from './completionCopy';
import { useMailWorkspaceCopy } from './mailWorkspaceCopy';
export function SafeMailView({ text, html }: { text: string | null; html?: string | null }) {
  const copy=useMailCompletionCopy();const work=useMailWorkspaceCopy();const [formatted,setFormatted]=useState(true);
  return <div className="space-y-3">{html&&<div className="flex flex-wrap items-start justify-between gap-2">
      <details className="min-w-0 flex-1 text-xs leading-5 text-slate-500 dark:text-slate-400"><summary className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><ShieldCheck aria-hidden className="h-3.5 w-3.5"/>{work.safeView}</summary><p className="max-w-sm pb-2">{copy.htmlHint}</p></details>
      <Button className="min-h-11 text-xs" variant="ghost" onClick={()=>setFormatted(v=>!v)}>{formatted?copy.text:copy.html}</Button>
    </div>}
    {html&&formatted?<iframe title={copy.html} sandbox="" referrerPolicy="no-referrer" className="h-[clamp(360px,60dvh,800px)] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html{color-scheme:light}body{box-sizing:border-box;margin:0;padding:20px;font:15px/1.65 system-ui,-apple-system,sans-serif;overflow-wrap:anywhere;color:#172033;background:#fff}body>*{max-width:100%}table{max-width:100%;border-collapse:collapse}td,th{padding:2px 4px;vertical-align:top}th{text-align:left}h1,h2,h3{line-height:1.3;margin:1em 0 .5em}h1{font-size:26px}h2{font-size:22px}h3{font-size:18px}p{margin:0 0 1em}blockquote{margin:1em 0;padding:0 0 0 14px;border-left:3px solid #e2e8f0;color:#475569}pre{white-space:pre-wrap;font-size:13px}hr{border:0;border-top:1px solid #e2e8f0;margin:20px 0}img{display:none}a{color:#1d4ed8}@media(max-width:480px){body{padding:12px}}</style></head><body>${html}</body></html>`}/>:<p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800 dark:text-slate-200">{text}</p>}
  </div>;
}
