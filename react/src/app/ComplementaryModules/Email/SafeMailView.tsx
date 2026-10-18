import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { useMailCompletionCopy } from './completionCopy';
export function SafeMailView({ text, html }: { text: string | null; html?: string | null }) {
  const copy=useMailCompletionCopy();const [formatted,setFormatted]=useState(true);
  return <div className="space-y-3">{html&&<><Button variant="outline" onClick={()=>setFormatted(v=>!v)}>{formatted?copy.text:copy.html}</Button><p className="text-xs text-slate-500 dark:text-slate-400">{copy.htmlHint}</p></>}
    {html&&formatted?<iframe title={copy.html} sandbox="" referrerPolicy="no-referrer" className="min-h-80 w-full rounded-xl border bg-white" srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><style>body{font:14px/1.7 system-ui;overflow-wrap:anywhere;padding:8px;color:#172033}table{max-width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:5px}pre{white-space:pre-wrap}</style></head><body>${html}</body></html>`}/>:<p className="whitespace-pre-wrap break-words text-sm leading-7">{text}</p>}
  </div>;
}
