import { useEffect, useRef, useState } from 'react';
import { BookOpen, Users } from 'lucide-react';
import { canAccessModuleTab } from '../../access/tabScopeCatalog';
import { getCachedAuthSession } from '../../api/authSessionStore';
import { mailingApi, templateApi } from '../../BasicModules/Sales/Mailing/mailingApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useMailDailyCopy } from './mailDailyCopy';
type Item = { id: string; name: string; email?: string; subject?: string; bodyText?: string };
/** Read-only consumption of Sales' published contacts/templates APIs, under their existing permissions. */
export function MailComposerLibrary({ disabled, onContact, onTemplate, onBusy }: { disabled: boolean; onBusy?: (busy: boolean) => void; onContact: (email: string) => void; onTemplate: (subject: string, body: string) => void }) {
  const copy = useMailDailyCopy(); const session = getCachedAuthSession();
  const templates = canAccessModuleTab('sales', 'mailing', session);
  const contacts = templates && canAccessModuleTab('sales', 'contacts', session);
  const alive=useRef(true); const choiceLock=useRef(false); const [inserting,setInserting]=useState(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const [mode, setMode] = useState<'contacts'|'templates'|null>(null); const [query,setQuery]=useState(''); const [items,setItems]=useState<Item[]>([]); const [error,setError]=useState(false); const [loading,setLoading]=useState(false);
  useEffect(()=>{
    setItems([]); setError(false); if(!mode || mode==='contacts'&&!contacts || mode==='templates'&&!templates)return;
    const abort=new AbortController(); setLoading(true);
    const timer=window.setTimeout(async()=>{
      try {
        const params=new URLSearchParams({search:query,page:'1',pageSize:'25',status:'ACTIVE'});
        const result=mode==='contacts'?await mailingApi.contacts(params,abort.signal):await templateApi.list(params,abort.signal);
        if(!abort.signal.aborted)setItems(result.items.map(item=>({...item,id:String(item.id)})));
      }catch{if(!abort.signal.aborted)setError(true);}finally{if(!abort.signal.aborted)setLoading(false);}
    },250);return()=>{abort.abort();window.clearTimeout(timer);};
  },[mode,query,contacts,templates]);
  async function choose(item: Item) {
    if(disabled||choiceLock.current)return;
    if(mode==='contacts'&&item.email){onContact(item.email);setMode(null);return;}
    choiceLock.current=true;setInserting(true);onBusy?.(true);setError(false);
    try {const template=await templateApi.get(item.id);if(!alive.current)return;if(template.status!=='ACTIVE')throw new Error('template_unavailable');onTemplate(template.subject,template.bodyText);setMode(null);}
    catch{if(alive.current)setError(true);}finally{choiceLock.current=false;if(alive.current){setInserting(false);onBusy?.(false);}}
  }
  if(!templates&&!contacts)return null;
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">{contacts&&<Button type="button" variant="outline" disabled={disabled||inserting} aria-expanded={mode==='contacts'} onClick={()=>{setMode(mode==='contacts'?null:'contacts');setQuery('');}}><Users className="h-4 w-4"/>{copy.contacts}</Button>}{templates&&<Button type="button" variant="outline" disabled={disabled||inserting} aria-expanded={mode==='templates'} onClick={()=>{setMode(mode==='templates'?null:'templates');setQuery('');}}><BookOpen className="h-4 w-4"/>{copy.templates}</Button>}</div>
    {mode&&<section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20"><Input aria-label={mode==='contacts'?copy.searchContacts:copy.searchTemplates} placeholder={mode==='contacts'?copy.searchContacts:copy.searchTemplates} value={query} disabled={disabled||inserting} maxLength={120} onChange={e=>setQuery(e.target.value)}/>
      {error&&<p role="alert" className="text-sm text-amber-800 dark:text-amber-200">{copy.lookupFailed}</p>}
      <ul aria-busy={loading} className="max-h-44 space-y-1 overflow-y-auto">{items.map(item=><li key={item.id}><Button type="button" variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" disabled={disabled||inserting} onClick={()=>void choose(item)}><span className="min-w-0 break-words">{item.name}<small className="block font-normal text-slate-500 dark:text-slate-400">{item.email??item.subject}</small></span></Button></li>)}</ul>
      {!loading&&!error&&!items.length&&<p className="text-sm">{copy.noMatches}</p>}{mode==='templates'&&<p className="text-xs text-slate-500 dark:text-slate-400">{copy.insertHint}</p>}
    </section>}
  </div>;
}
