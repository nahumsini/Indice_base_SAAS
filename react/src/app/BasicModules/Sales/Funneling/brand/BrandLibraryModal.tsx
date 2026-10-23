import {useEffect,useRef,useState} from 'react';
import {Building2} from 'lucide-react';
import {Button} from '../../../../components/ui/button';
import {IndiceWorkspaceNavigation} from '../../../../components/frontend-os';
import {SalesModalFrame} from '../../components/SalesModalFrame';
import {getSalesModalActionClassNames} from '../../salesModalStyles';
import {ApiClientError} from '../../../../lib/apiClient';
import type {FunnelCopy} from '../funnelCopy';
import {brandApi} from './brandApi';
import {brandCopy} from './brandCopy';
import {questionCopy} from './brandQuestions';
import {BrandQuestionForm} from './BrandQuestionForm';
import {BrandAssetsPanel} from './BrandAssetsPanel';
import {emptyBrandAnswers,normalizeBrandDetails,type BrandAsset,type BrandDetails,type BrandLibrary} from './brandModel';

export function BrandLibraryModal({locale,copy,onClose}:{locale:string;copy:FunnelCopy;onClose:()=>void}){
 const c=brandCopy(locale),q=questionCopy(locale),actions=getSalesModalActionClassNames();
 const [section,setSection]=useState('business'),[data,setData]=useState<BrandLibrary|null>(null),[draft,setDraft]=useState<BrandDetails|null>(null),[archived,setArchived]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[pending,setPending]=useState<(()=>void)|null>(null),[descriptions,setDescriptions]=useState({logos:'',materials:''});
 const baseline=useRef(''),mounted=useRef(true),working=useRef(false),mutation=useRef<{body:string;id:string}|null>(null),uploadRetry=useRef<{fingerprint:string;id:string}|null>(null);
 const dirty=!!draft&&JSON.stringify(draft)!==baseline.current;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();brandApi.library(archived,controller.signal).then(value=>{if(controller.signal.aborted)return;setData(old=>old?{...old,assets:value.assets}:value);setDraft(old=>{if(old)return old;const details=normalizeBrandDetails(value.profile.details);baseline.current=JSON.stringify(details);return details;});}).catch(()=>{if(!controller.signal.aborted)setError('network');});return()=>controller.abort();},[archived,refresh]);
 const hasUploadDraft=!!(descriptions.logos||descriptions.materials);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty||hasUploadDraft){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty,hasUploadDraft]);
 function navigate(action:()=>void){if(working.current)return;if(dirty||hasUploadDraft)setPending(()=>action);else action();}
 async function save(){if(!data||!draft||working.current)return;working.current=true;setBusy(true);setError('');const body=JSON.stringify(draft);if(mutation.current?.body!==body)mutation.current={body,id:crypto.randomUUID()};try{const profile=await brandApi.save(draft,data.profile.version,mutation.current.id,data.profile.actorKey);if(!mounted.current)return;const details=normalizeBrandDetails(profile.details);baseline.current=JSON.stringify(details);setDraft(details);setData(old=>old?{...old,profile}:old);mutation.current=null;}catch(e){if(mounted.current)setError(e instanceof ApiClientError&&e.status===409?'conflict':'network');}finally{working.current=false;if(mounted.current)setBusy(false);}}
 async function upload(file:File,category:BrandAsset['category'],description:string,variant:string){
  if(!data||working.current)return;
  if(!['image/png','image/jpeg','application/pdf','text/plain'].includes(file.type)||file.size<1||file.size>5*1024*1024||category==='LOGO_VARIANT'&&!file.type.startsWith('image/')){setError('network');return;}
  working.current=true;setBusy(true);setError('');const fingerprint=JSON.stringify([file.name,file.size,file.lastModified,file.type,category,description,variant]);
  if(uploadRetry.current?.fingerprint!==fingerprint)uploadRetry.current={fingerprint,id:crypto.randomUUID()};
  try{await brandApi.upload(file,category,uploadRetry.current.id,data.profile.actorKey,description,variant);if(mounted.current){setDescriptions(old=>({...old,[category==='LOGO_VARIANT'?'logos':'materials']:''}));setArchived(false);setRefresh(v=>v+1);uploadRetry.current=null;}}catch{if(mounted.current)setError('network');}finally{working.current=false;if(mounted.current)setBusy(false);}
 }
 async function change(asset:BrandAsset){if(!data||working.current)return;working.current=true;setBusy(true);setError('');try{await brandApi.state(asset.id,asset.status!=='ARCHIVED',data.profile.actorKey);if(mounted.current)setRefresh(v=>v+1);}catch{if(mounted.current)setError('network');}finally{working.current=false;if(mounted.current)setBusy(false);}}
 function reload(){setData(null);setDraft(null);setDescriptions({logos:'',materials:''});setError('');setRefresh(v=>v+1);}
 if(pending)return <SalesModalFrame open modalType="confirmation" title={copy.discardTitle} description={copy.discardHint} icon={<Building2/>} onOpenChange={()=>setPending(null)} footer={<><Button className={actions.secondary} onClick={()=>setPending(null)}>{copy.keepEditing}</Button><Button className={actions.primary} onClick={()=>{const action=pending;setPending(null);action();}}>{copy.discard}</Button></>}><p>{c.title}</p></SalesModalFrame>;
 const a={...emptyBrandAnswers(),...draft?.answers};
 const patch=(value:Partial<BrandDetails>)=>setDraft(old=>old?{...old,...value}:old);
 return <SalesModalFrame open modalType="operational-workspace" title={c.title} description={c.subtitle} icon={<span aria-hidden="true">🏢</span>} busy={busy} onOpenChange={open=>{if(!open)navigate(onClose);}} footer={<><Button className={actions.secondary} disabled={busy} onClick={()=>navigate(onClose)}>{copy.close}</Button><Button className={actions.primary} disabled={!dirty||busy||error==='conflict'} onClick={()=>void save()}>{busy?copy.saving:c.save}</Button></>}>
  <div className="brand-library space-y-5">
   <IndiceWorkspaceNavigation variant="sections" tone="coral" ariaLabel={c.title} value={section} onValueChange={value=>{if(working.current)return;setSection(value);setArchived(false);}} items={[{id:'business',label:c.business,icon:<span aria-hidden="true">🏢</span>},{id:'brand',label:c.brand,icon:<span aria-hidden="true">🎨</span>},{id:'assets',label:c.assets,icon:<span aria-hidden="true">🗂️</span>}]}/>
   {error&&<div role="alert" className="brand-alert"><p>{error==='conflict'?c.conflict:c.error}</p><Button variant="outline" onClick={()=>navigate(reload)}>{c.reload}</Button></div>}
   {!data||!draft?<p role="status">{copy.loading}</p>:<>
    <div className="brand-company"><span className="brand-company-logo">{data.profile.logoUrl?<img src={data.profile.logoUrl} alt=""/>:<span aria-hidden="true">🏢</span>}</span><div><strong>{data.profile.companyName}</strong><p>{c.shared}</p></div></div>
    <fieldset disabled={busy||error==='conflict'} className="min-w-0 space-y-5">
     {section==='business'&&<BrandQuestionForm draft={draft} section="business" locale={locale} patch={patch}/>}
     {section==='brand'&&<><BrandQuestionForm draft={draft} section="brand" locale={locale} patch={patch}/><section className="brand-main-logo"><h3>🎨 {q.mainLogo}</h3>{data.profile.logoUrl?<div className="brand-main-logo-image"><img src={data.profile.logoUrl} alt={q.mainLogo}/></div>:<p className="brand-help">{q.mainLogoMissing}</p>}<label className="brand-check"><input type="checkbox" checked={a.usePrimaryLogo} disabled={!data.profile.logoUrl&&!a.usePrimaryLogo} onChange={e=>patch({answers:{...a,usePrimaryLogo:e.target.checked}})}/>{q.usePrimaryLogo}</label></section></>}
     {section!=='business'&&<BrandAssetsPanel kind={section==='brand'?'logos':'materials'} locale={locale} assets={data.assets} archived={archived} onArchived={setArchived} onUpload={upload} onState={asset=>void change(asset)} description={descriptions[section==='brand'?'logos':'materials']} onDescription={value=>setDescriptions(old=>({...old,[section==='brand'?'logos':'materials']:value}))}/>}
    </fieldset>
   </>}
  </div>
 </SalesModalFrame>;
}
