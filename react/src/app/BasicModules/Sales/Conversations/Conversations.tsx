import { useEffect,useRef,useState } from 'react';
import { useBlocker,useNavigate,useSearchParams } from 'react-router';
import { MessageCircle,RefreshCw,Settings } from 'lucide-react';
import { IndiceTitleBar,IndiceFilterBar,IndiceFilterSearch,IndiceFilterSelect,IndiceViewState } from '../../../components/frontend-os';
import { IndiceConfirmationDialog } from '../../../components/indice-modal';
import { Button } from '../../../components/ui/button';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { useLanguage } from '../../../context/LanguageContext';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { ApiClientError } from '../../../lib/apiClient';
import { conversationsApi,type Context,type Page } from './conversationsApi';
import { conversationsCopy } from './conversationsCopy';
import { ConversationPanel } from './ConversationPanel';
import './conversations.css';
export default function Conversations(){const revision=useAuthorizationRevision();return <ConversationWorkspace key={revision}/>;}
function ConversationWorkspace(){
 const {currentLanguage}=useLanguage(),locale=currentLanguage.code,c=conversationsCopy(locale),navigate=useNavigate();
 const [params,setParams]=useSearchParams(),selected=params.get('conversation');
 const [context,setContext]=useState<Context|null>(null),[data,setData]=useState<Page|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<unknown>(null);
 const [box,setBox]=useState('UNASSIGNED'),[search,setSearch]=useState(''),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
 const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[pending,setPending]=useState<string|null|undefined>(undefined);
 const blocker=useBlocker(({currentLocation,nextLocation})=>(dirty||busy)&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search));
 const contextRef=useRef<Context|null>(null);contextRef.current=context;
 useEffect(()=>{const abort=new AbortController();let initial=true;setLoading(true);
  const load=async()=>{try{const value=await conversationsApi.context(abort.signal);if(abort.signal.aborted)return;setContext(old=>JSON.stringify(old)===JSON.stringify(value)?old:value);if(initial&&!value.capabilities.includes('TAKE'))setBox(value.capabilities.includes('READ_ALL')?'ALL':'MINE');}
   catch(failure){if(!abort.signal.aborted){setError(failure);if(failure instanceof ApiClientError&&[401,403].includes(failure.status))setContext(null);}}
   finally{initial=false;if(!abort.signal.aborted)setLoading(false);}};
  void load();const timer=setInterval(()=>{if(!document.hidden)void load();},15000);return()=>{abort.abort();clearInterval(timer);};
 },[]);
 useEffect(()=>{if(!context?.enabled||!context.connection||!context.capabilities.length)return;const abort=new AbortController();let timer:ReturnType<typeof setTimeout>,failures=0,inFlight=false;
  const load=async()=>{if(document.hidden||inFlight){timer=setTimeout(load,3000);return;}inFlight=true;
   try{const value=await conversationsApi.list(box,search.trim(),page,abort.signal);if(abort.signal.aborted)return;setData(value);setError(null);failures=0;}
   catch(failure){if(abort.signal.aborted)return;setError(failure);failures++;if(failure instanceof ApiClientError&&[401,403].includes(failure.status)){setData(null);setContext(null);return;}}
   finally{inFlight=false;}if(!abort.signal.aborted)timer=setTimeout(load,Math.min(30000,3000*2**Math.min(failures,4)));
  };
  timer=setTimeout(load,search?300:0);const focus=()=>{if(!document.hidden){clearTimeout(timer);void load();}};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{abort.abort();clearTimeout(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[context,box,search,page,revision]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,busy]);
 function choose(id:string|null){if(busy)return;if(dirty){setPending(id);return;}const next=new URLSearchParams(params);id?next.set('conversation',id):next.delete('conversation');setParams(next);}
 function discard(){setDirty(false);if(blocker.state==='blocked'){blocker.proceed();return;}if(pending!==undefined){const next=new URLSearchParams(params);pending?next.set('conversation',pending):next.delete('conversation');setPending(undefined);setParams(next);}}
 const failed=error instanceof ApiClientError&&[401,403].includes(error.status)?c.denied:c.error;
 return <section className="sales-conversations space-y-5" data-sales-conversations>
  <IndiceTitleBar title={c.title} subtitle={c.subtitle} tone="coral" icon={<MessageCircle/>} actions={<><Button variant="outline" onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/>{c.refresh}</Button>{context?.canManage&&<Button variant="outline" onClick={()=>navigate('/sales/whatsapp-settings')}><Settings size={16}/>{c.manage}</Button>}</>}/>
  {loading?<IndiceViewState tone="coral" variant="loading" title={c.loading}/>:!context||error&&!data?<IndiceViewState tone="coral" variant="error" title={failed}/>:!context.enabled?<IndiceViewState tone="coral" variant="empty" title={c.disabled}/>:!context.connection?<IndiceViewState tone="coral" variant="empty" title={c.noConnection}/>:!context.capabilities.length?<IndiceViewState tone="coral" variant="empty" title={c.denied}/>:<>
   <IndiceFilterBar title={c.title}><IndiceFilterSearch tone="coral" placeholder={c.search} label={c.search} value={search} onValueChange={value=>{setSearch(value.slice(0,120));setPage(1);}} onClear={()=>{setSearch('');setPage(1);}}/><IndiceFilterSelect tone="coral" label={c.title} value={box} onValueChange={value=>{setBox(value);setPage(1);}} options={['UNASSIGNED','MINE','ALL','RESOLVED'].filter(value=>value!=='UNASSIGNED'||context.capabilities.includes('TAKE')).map(value=>({value,label:c[value as keyof typeof c]}))}/></IndiceFilterBar>
   <div className={`conversation-columns ${selected?'has-selection':''}`}>
    <aside className="conversation-list" aria-label={c.title}>
     {!data?<IndiceViewState tone="coral" variant="loading" title={c.loading}/>:!data.items.length?<IndiceViewState tone="coral" variant="empty" title={c.empty}/>:data.items.map(item=><button type="button" key={item.id} onClick={()=>choose(item.id)} aria-pressed={selected===item.id} className="conversation-list-item"><span>{item.phone}</span><small>{item.status==='RESOLVED'?c.RESOLVED:item.assigneeMembershipId===null?c.UNASSIGNED:c.human}</small><time dateTime={item.lastActivityAt}>{new Intl.DateTimeFormat(locale,{dateStyle:'short',timeStyle:'short'}).format(new Date(item.lastActivityAt))}</time></button>)}
     {!!data?.total&&<DataTablePagination attached={false} currentPage={page} pageSize={25} pageSizeOptions={[25]} itemLabel={c.title} totalCount={data.total} totalPages={Math.max(1,Math.ceil(data.total/25))} pageStart={(page-1)*25+1} pageEnd={Math.min(page*25,data.total)} onPageChange={setPage} onPageSizeChange={()=>{}}/>}
    </aside>
    {selected&&/^[0-9a-fA-F-]{36}$/.test(selected)?<ConversationPanel key={selected} id={selected} context={context} locale={locale} onBack={()=>choose(null)} onDirty={(value,locked)=>{setDirty(value);setBusy(locked);}} onChanged={()=>setRevision(v=>v+1)}/>:<IndiceViewState tone="coral" className="conversation-placeholder" variant="empty" title={c.select} description={c.privacy}/>}
   </div>
  </>}
  <IndiceConfirmationDialog open={pending!==undefined||blocker.state==='blocked'} title={c.unsaved} description={c.privacy} confirmLabel={c.discard} cancelLabel={c.cancel} busy={busy} onConfirm={discard} onCancel={()=>{setPending(undefined);if(blocker.state==='blocked')blocker.reset();}} destructive/>
 </section>;
}
