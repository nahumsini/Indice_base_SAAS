import {useEffect,useRef,useState} from 'react';
import {Plus} from 'lucide-react';
import {IndiceModalFrame} from '../../components/indice-modal';
import {Button} from '../../components/ui/button';
import type {BoardFileContext,BoardFileSnapshot} from '../../BasicModules/Sales/Funneling/boardFileTools';
import type {IdeaNode,FiveSSection} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {fiveSCopy} from './fiveSCopy';
import {fiveSTemplates,fiveSSections,fiveSEmoji,newFiveSAction,validFiveSAction} from './fiveSModel';
import {FiveSFields} from './FiveSFields';
import {FiveSCreateWizard} from './FiveSCreateWizard';
import {FiveSActionCard} from './FiveSActionCard';
import {FiveSProgressDialog} from './FiveSProgressDialog';
import {FiveSFilters} from './FiveSFilters';
import {defaultFiveSFilters,filterFiveSActions,fiveSOwnerValue,fiveSProgress,hasFiveSFilters,type FiveSActionFilters} from './fiveSFiltersModel';
import {fiveSFiltersCopy,fiveSFilterSummary} from './fiveSFiltersCopy';
import {fiveSWizardCopy} from './fiveSWizardCopy';
import {IndiceWorkspaceNavigation} from '../../components/frontend-os/IndiceWorkspaceNavigation';
import './fiveSWorkspace.css';

export function FiveSLauncher({context,locale,onOpen,create=false}:{context:BoardFileContext;locale:string;onOpen:()=>void;create?:boolean}){
 const c=fiveSCopy(locale),[open,setOpen]=useState(false);
 useEffect(()=>{if(!context.active)setOpen(false);},[context.active]);
 const existing=fiveSTemplates(context.capture().content).length>0;
 return <><button type="button" className="idea-board-button idea-board-secondary five-s-launch" disabled={!context.ready} onClick={()=>existing&&!create?onOpen():setOpen(true)} aria-label={create?c.create:existing?c.board:c.template} title={create?c.create:existing?c.board:c.template}><span aria-hidden="true">🧹</span><span>{create?c.create:existing?c.board:c.template}</span></button>
 {open&&<FiveSCreateWizard context={context} locale={locale} onClose={()=>setOpen(false)} onCreated={()=>{setOpen(false);onOpen();}}/>}</>;
}

export function FiveSWorkspace({context,locale}:{context:BoardFileContext;locale:string}){
 const c=fiveSCopy(locale),w=fiveSWizardCopy(locale),snapshot=context.capture(),content=snapshot.content,templates=fiveSTemplates(content),[chosen,setChosen]=useState(''),[section,setSection]=useState<FiveSSection>('SORT');
 const [filterState,setFilterState]=useState({templateId:'',values:{...defaultFiveSFilters}});
 const [editing,setEditing]=useState<{expected:BoardFileSnapshot;node:IdeaNode}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),latched=useRef(false);
 const [verifying,setVerifying]=useState<{expected:BoardFileSnapshot;node:IdeaNode}|null>(null),[progressError,setProgressError]=useState<{id:string;message:string}|null>(null);
 useEffect(()=>{if(!context.active){setEditing(null);setVerifying(null);setProgressError(null);}},[context.active]);
 const header=templates.find(n=>n.fiveS!.templateId===chosen)??templates[templates.length-1],template=header?.fiveS;
 const actions=content.nodes.filter(n=>n.fiveS?.templateId===template?.templateId&&n.fiveS?.role==='ACTION');
 const storedFilters=filterState.templateId===template?.templateId?filterState.values:defaultFiveSFilters;
 const ownerAvailable=storedFilters.owner==='ALL'||storedFilters.owner==='UNASSIGNED'||actions.some(n=>fiveSOwnerValue(n.fiveS?.owner??'')===storedFilters.owner);
 const filters=ownerAvailable?storedFilters:{...storedFilters,owner:'ALL'};
 const visible=filterFiveSActions(actions,filters),progress=fiveSProgress(actions,filters),filtered=hasFiveSFilters(filters),fc=fiveSFiltersCopy(locale);
 useEffect(()=>{if(!ownerAvailable)setFilterState(current=>({...current,values:{...current.values,owner:'ALL'}}));},[ownerAvailable]);
 function changeFilters(values:FiveSActionFilters){
  setFilterState({templateId:template?.templateId??'',values});
  const rows=filterFiveSActions(actions,values);
  if(!rows.some(n=>n.fiveS!.section===section)&&rows[0])setSection(rows[0].fiveS!.section);
 }
 function edit(node:IdeaNode){setError('');setBusy(false);setEditing({expected:context.capture(),node:structuredClone(node)});}
 function add(s:FiveSSection){if(!template)return;const node=newFiveSAction(content,template,s);if(!node){context.notify(c.limit);return;}edit(node);}
 function save(){if(!editing||latched.current||busy||!validFiveSAction(editing.node))return;latched.current=true;const base=editing.expected.content;let node={...editing.node,text:editing.node.text.trim()};const previous=base.nodes.find(n=>n.id===node.id),exists=!!previous;if(previous?.fiveS?.section!==node.fiveS!.section){const placed=newFiveSAction({...base,nodes:base.nodes.filter(n=>n.id!==node.id)},node.fiveS!,node.fiveS!.section);if(placed)node={...node,x:placed.x,y:placed.y};}const next={...base,nodes:exists?base.nodes.map(n=>n.id===node.id?node:n):[...base.nodes,node]};if(context.replace(editing.expected,next)){setEditing(null);setFilterState({templateId:template?.templateId??'',values:{...defaultFiveSFilters}});setSection(node.fiveS!.section);}else setError(c.changed);latched.current=false;}
 function updateProgress(node:IdeaNode){
  if(!context.active||!context.ready||latched.current||busy)return;
  setProgressError(null);
  if(node.fiveS?.status==='IN_PROGRESS'){setVerifying({expected:snapshot,node:structuredClone(node)});return;}
  const next={...node,fiveS:{...node.fiveS!,status:'IN_PROGRESS' as const}};
  if(!validFiveSAction(next))return;
  latched.current=true;
  if(!context.replace(snapshot,{...content,nodes:content.nodes.map(value=>value.id===node.id?next:value)}))setProgressError({id:node.id,message:c.progressRetry});
  else if(filtered)context.notify(fc.filteredUpdate);
  latched.current=false;
 }
 function verify(result:string,reviewDate:string|null){
  if(!verifying||!context.active||!context.ready||latched.current)return false;
  const node={...verifying.node,fiveS:{...verifying.node.fiveS!,status:'VERIFIED' as const,result,reviewDate}};
  if(!validFiveSAction(node))return false;
  latched.current=true;
  const success=context.replace(verifying.expected,{...verifying.expected.content,nodes:verifying.expected.content.nodes.map(value=>value.id===node.id?node:value)});
  if(success){setVerifying(null);context.notify(filtered?fc.filteredUpdate:c.verifiedSaved);}
  latched.current=false;return success;
 }
 return <div className="five-s-workspace" data-five-s-workspace>
  {!templates.length&&<div className="five-s-workspace-heading"><div><span className="five-s-eyebrow">🧹 5S</span><h3>{c.title}</h3><p>{c.intro}</p></div></div>}
  {!templates.length?<div className="five-s-start"><span className="five-s-start-icon" aria-hidden="true">🧹</span><h4>{c.emptyTitle}</h4><p>{c.emptyHint}</p><FiveSLauncher create context={context} locale={locale} onOpen={()=>setChosen('')}/><ol>{fiveSSections.map((s,index)=><li key={s}><span aria-hidden="true">{fiveSEmoji[s]}</span><span><strong>{index+1}. {c[s]}</strong><small>{c[`${s}Help`]}</small></span></li>)}</ol></div>:<>
  <div className="five-s-workspace-controls"><label className="workspace-field"><span>{c.area}</span><select value={template?.templateId??''} onChange={e=>{setChosen(e.target.value);setFilterState({templateId:e.target.value,values:{...defaultFiveSFilters}});setSection('SORT');}}>{templates.map(n=><option key={n.fiveS!.templateId} value={n.fiveS!.templateId}>{n.fiveS!.area}</option>)}</select></label><FiveSLauncher create context={context} locale={locale} onOpen={()=>setChosen('')}/></div>
  <FiveSFilters actions={actions} filters={filters} locale={locale} visibleCount={visible.length} progress={progress} onChange={changeFilters}/>
  <div className="five-s-section-navigation"><IndiceWorkspaceNavigation<FiveSSection> variant="workbar" tone="coral" moduleId="ideas_board" ariaLabel={c.section} value={section} onValueChange={setSection}
   items={fiveSSections.map(s=>({id:s,label:`${w[`${s}Step`]} · ${visible.filter(n=>n.fiveS!.section===s).length}`,icon:<span>{fiveSEmoji[s]}</span>,description:c[s]}))}/></div>
  {filtered&&!visible.length&&<div className="five-s-filter-empty"><h4>{fc.empty}</h4><p>{fc.emptyHelp}</p><p className="five-s-empty-context">{fc.activeFilters}: {fiveSFilterSummary(filters,locale)}</p><div className="five-s-filter-empty-actions">{filters.date!=='ALL'&&<button type="button" className="idea-board-button" onClick={()=>changeFilters({...filters,date:'ALL',from:'',to:''})}>{fc.clearDate}</button>}<button type="button" className="idea-board-button" onClick={()=>changeFilters({...defaultFiveSFilters})}>{fc.clear}</button></div></div>}
  {(!filtered||visible.length>0)&&<>
  <div className="five-s-columns">{fiveSSections.map((s,index)=>{const rows=visible.filter(n=>n.fiveS!.section===s);return <section key={s} className="five-s-column" data-section={s} data-selected={s===section}><header><span className="five-s-section-emoji" aria-hidden="true">{fiveSEmoji[s]}</span><div><span>{index+1} · {['Seiri','Seiton','Seiso','Seiketsu','Shitsuke'][index]}</span><h4>{c[s]}</h4></div><span className="five-s-count">{rows.length}</span></header><p>{c[`${s}Help`]}</p><button type="button" className="idea-board-button five-s-add" disabled={!context.ready||!template} onClick={()=>add(s)}><Plus size={16}/>{c.add}</button><div className="five-s-action-list">{rows.map(n=><FiveSActionCard key={n.id} node={n} locale={locale} disabled={!context.ready} error={progressError?.id===n.id?progressError.message:undefined} onEdit={()=>edit(n)} onProgress={()=>updateProgress(n)}/>)}{!rows.length&&<p className="five-s-empty">{filtered?fc.sectionEmpty:c.noActions}</p>}</div></section>;})}</div>
  </>}
  </>}
  {verifying&&<FiveSProgressDialog node={verifying.node} locale={locale} ready={context.ready} onClose={()=>setVerifying(null)} onConfirm={verify}/>}
  {editing&&<IndiceModalFrame open modalType="standard-form" busy={busy} contentClassName="five-s-action-modal" title={content.nodes.some(n=>n.id===editing.node.id)?c.edit:c.add} description={`${c[editing.node.fiveS!.section]} · ${editing.node.fiveS!.area}`} tone="coral" icon={<span>{fiveSEmoji[editing.node.fiveS!.section]}</span>} closeLabel={c.cancel} onOpenChange={value=>{if(!value&&!busy)setEditing(null);}} footerSummary={busy?c.uploading:!editing.node.fiveS?.action?.trim()?c.actionRequired:editing.node.fiveS.status==='VERIFIED'&&!editing.node.fiveS.result?.trim()?c.resultRequired:undefined} footer={<><Button variant="outline" disabled={busy} onClick={()=>setEditing(null)}>{c.cancel}</Button><Button disabled={busy||!context.ready||!validFiveSAction(editing.node)} onClick={save}>{c.save}</Button></>}>
   <FiveSFields node={editing.node} onChange={node=>setEditing({...editing,node})} locale={locale} api={personalIdeasBoardApi} actor={editing.expected.actor} onBusyChange={setBusy}/>{error&&<div className="workspace-error" role="alert">{error}</div>}
  </IndiceModalFrame>}
 </div>;
}
