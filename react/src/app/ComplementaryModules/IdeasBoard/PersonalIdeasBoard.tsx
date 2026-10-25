import {useMemo,useState} from 'react';
import {FolderOpen,Lightbulb,Network,X} from 'lucide-react';
import {IndiceModuleShell} from '../../components/frontend-os';
import {useLanguage} from '../../context/LanguageContext';
import {useAuthorizationRevision} from '../../hooks/useAuthorizationRevision';
import {useRoutedModuleTab} from '../../hooks/useRoutedModuleTab';
import {IdeasBoard} from '../../BasicModules/Sales/Funneling/IdeasBoard';
import {ideasBoardCopy} from '../../BasicModules/Sales/Funneling/ideasBoardCopy';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {SystemBoard} from './SystemBoard';
import {freeformBoardLayout} from './freeformBoardLayout';
import {personalBoardSymbols} from './systemBoardLayout';
import {IdeaProjects,SaveProjectDialog,type ProjectDraft} from './IdeaProjects';
import {toSystemDocument} from './systemBoardModel';
import type {Project} from './ideaWorkspaceApi';
import {workspaceCopy} from './workspaceCopy';
import {FiveSWorkspace} from './FiveSWorkspace';
import {fiveSCopy} from './fiveSCopy';
import {personalCanvasView,personalFiveSView} from './personalBoardViews';
import {projectBoardTab} from './fiveSNavigation';
import {BoardFileControls} from './BoardFileControls';
import {boardFileCopy} from './boardFileCopy';
import type {BoardFileKind} from './boardFileModel';
import type {BoardFileTools} from '../../BasicModules/Sales/Funneling/boardFileTools';
import './ideaWorkspace.css';
import '../../BasicModules/Sales/Funneling/boardWorkbench.css';
import './boardCompactWorkspace.css';
const tabs=['canvas','five-s','system','projects'] as const;
export default function PersonalIdeasBoard({onNavigate}:{onNavigate?:(page?:string)=>void}) {
 const revision=useAuthorizationRevision();return <PersonalWorkspace key={revision} onNavigate={onNavigate}/>;
}
function PersonalWorkspace({onNavigate}:{onNavigate?:(page?:string)=>void}) {
 const {currentLanguage}=useLanguage(),locale=currentLanguage.code,c=workspaceCopy(locale),copy=ideasBoardCopy(locale);
 const freeformLayout=useMemo(()=>freeformBoardLayout(locale),[locale]);
 const {activeTab,setActiveTab}=useRoutedModuleTab('canvas',tabs);
 const fiveS=activeTab==='five-s',s=fiveSCopy(locale);
 const [openRequest,setOpenRequest]=useState<{key:string;project:Project}|undefined>();
 const [projectDraft,setProjectDraft]=useState<ProjectDraft|null>(null),[projectRevision,setProjectRevision]=useState(0),[notice,setNotice]=useState('');
 const [visited,setVisited]=useState(()=>new Set<string>([activeTab]));
 if(!visited.has(activeTab))setVisited(new Set([...visited,activeTab]));
 // Both presentations keep one mounted draft owner, so changing tabs never starts a second save queue.
 const personalVisited=visited.has('canvas')||visited.has('five-s');
 const f=boardFileCopy(locale),fileTools=(kind:BoardFileKind):BoardFileTools=>({
  title:kind==='SYSTEM'?c.system:fiveS?s.tab:c.myBoard,
  icon:kind==='FREEFORM'&&fiveS?<span aria-hidden="true">🧹</span>:undefined,
  documentView:kind==='FREEFORM'?(fiveS?personalFiveSView:personalCanvasView):undefined,
  fullscreen:f.fullscreen,exitFullscreen:f.exitFullscreen,
  renderWorkspace:kind==='FREEFORM'&&fiveS?context=><FiveSWorkspace context={context} locale={locale}/>:undefined,
  render:context=><BoardFileControls key={kind==='FREEFORM'&&fiveS?'five-s':kind} context={context} allowOpen={kind!=='FREEFORM'||!fiveS} label={kind==='FREEFORM'&&fiveS?s.tab:undefined} kind={kind} locale={locale} openRequest={openRequest} onOpened={()=>setOpenRequest(undefined)} onSaved={()=>setProjectRevision(v=>v+1)}/>
 });
 return <IndiceModuleShell containedWorkspace currentModule="ideas-board" title={copy.title} subtitle={copy.subtitle} tone="coral" activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate}
  tabs={[{id:'canvas',label:c.myBoard,icon:<Lightbulb className="h-4 w-4"/>},{id:'five-s',label:s.tab,icon:<span aria-hidden="true">🧹</span>},{id:'system',label:c.system,icon:<Network className="h-4 w-4"/>},{id:'projects',label:c.projects,icon:<FolderOpen className="h-4 w-4"/>}]}>
  <div className={activeTab==='projects'?undefined:'personal-board-workspace'}>
  {notice&&<div className="workspace-success" role="status"><span>{notice}</span><button className="idea-board-button" onClick={()=>{setActiveTab('projects');setNotice('');}}>{c.projects}</button><button className="idea-board-button" aria-label={copy.close} onClick={()=>setNotice('')}><X size={16}/></button></div>}
  {personalVisited&&<IdeasBoard layout={freeformLayout} fileTools={fileTools('FREEFORM')} customizable symbols={personalBoardSymbols(locale)} locale={locale} active={activeTab==='canvas'||fiveS} api={personalIdeasBoardApi} saveProjectLabel={c.saveProject} onSaveProject={(freeform,actor)=>setProjectDraft({actor,input:{kind:'FREEFORM',freeform,system:null}})}/>}
  {visited.has('system')&&<SystemBoard fileTools={fileTools('SYSTEM')} locale={locale} active={activeTab==='system'} onSaveProject={(content,actor)=>setProjectDraft({actor,input:{kind:'SYSTEM',freeform:null,system:toSystemDocument(content)}})}/>}
  <IdeaProjects onOpenBoard={()=>setActiveTab('canvas')} locale={locale} active={activeTab==='projects'} revision={projectRevision} onUseProject={project=>{setOpenRequest({key:crypto.randomUUID(),project});setActiveTab(projectBoardTab(project));}}/>
  {projectDraft&&<SaveProjectDialog draft={projectDraft} locale={locale} onClose={()=>setProjectDraft(null)} onSaved={()=>{setProjectDraft(null);setProjectRevision(v=>v+1);setNotice(c.savedProject);}}/>}
  </div>
 </IndiceModuleShell>;
}
