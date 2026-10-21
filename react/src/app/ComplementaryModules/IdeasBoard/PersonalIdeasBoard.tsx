import {useState} from 'react';
import {FolderOpen,Lightbulb,Network,X} from 'lucide-react';
import {IndiceModuleShell} from '../../components/frontend-os';
import {useLanguage} from '../../context/LanguageContext';
import {useAuthorizationRevision} from '../../hooks/useAuthorizationRevision';
import {useRoutedModuleTab} from '../../hooks/useRoutedModuleTab';
import {IdeasBoard} from '../../BasicModules/Sales/Funneling/IdeasBoard';
import {ideasBoardCopy} from '../../BasicModules/Sales/Funneling/ideasBoardCopy';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {SystemBoard} from './SystemBoard';
import {personalBoardSymbols} from './systemBoardLayout';
import {IdeaProjects,SaveProjectDialog,type ProjectDraft} from './IdeaProjects';
import {toSystemDocument} from './systemBoardModel';
import type {Project} from './ideaWorkspaceApi';
import {workspaceCopy} from './workspaceCopy';
import {BoardFileControls} from './BoardFileControls';
import {boardFileCopy} from './boardFileCopy';
import type {BoardFileKind} from './boardFileModel';
import type {BoardFileTools} from '../../BasicModules/Sales/Funneling/boardFileTools';
import './ideaWorkspace.css';
import '../../BasicModules/Sales/Funneling/boardWorkbench.css';
const tabs=['canvas','system','projects'] as const;
export default function PersonalIdeasBoard({onNavigate}:{onNavigate?:(page?:string)=>void}) {
 const revision=useAuthorizationRevision();return <PersonalWorkspace key={revision} onNavigate={onNavigate}/>;
}
function PersonalWorkspace({onNavigate}:{onNavigate?:(page?:string)=>void}) {
 const {currentLanguage}=useLanguage(),locale=currentLanguage.code,c=workspaceCopy(locale),copy=ideasBoardCopy(locale);
 const {activeTab,setActiveTab}=useRoutedModuleTab('canvas',tabs);
 const [openRequest,setOpenRequest]=useState<{key:string;project:Project}|undefined>();
 const [projectDraft,setProjectDraft]=useState<ProjectDraft|null>(null),[projectRevision,setProjectRevision]=useState(0),[notice,setNotice]=useState('');
 const [visited,setVisited]=useState(()=>new Set<string>([activeTab]));
 if(!visited.has(activeTab))setVisited(new Set([...visited,activeTab]));
 const f=boardFileCopy(locale),fileTools=(kind:BoardFileKind):BoardFileTools=>({title:kind==='SYSTEM'?c.system:c.myBoard,fullscreen:f.fullscreen,exitFullscreen:f.exitFullscreen,render:context=><BoardFileControls context={context} kind={kind} locale={locale} openRequest={openRequest} onOpened={()=>setOpenRequest(undefined)} onSaved={()=>setProjectRevision(v=>v+1)}/>});
 return <IndiceModuleShell currentModule="ideas-board" title={copy.title} subtitle={copy.subtitle} tone="coral" activeTab={activeTab} onTabChange={setActiveTab} onNavigate={onNavigate}
  tabs={[{id:'canvas',label:c.myBoard,icon:<Lightbulb className="h-4 w-4"/>},{id:'system',label:c.system,icon:<Network className="h-4 w-4"/>},{id:'projects',label:c.projects,icon:<FolderOpen className="h-4 w-4"/>}]}>
  {notice&&<div className="workspace-success" role="status"><span>{notice}</span><button className="idea-board-button" onClick={()=>{setActiveTab('projects');setNotice('');}}>{c.projects}</button><button className="idea-board-button" aria-label={copy.close} onClick={()=>setNotice('')}><X size={16}/></button></div>}
  {visited.has('canvas')&&<IdeasBoard fileTools={fileTools('FREEFORM')} customizable symbols={personalBoardSymbols(locale)} locale={locale} active={activeTab==='canvas'} api={personalIdeasBoardApi} saveProjectLabel={c.saveProject} onSaveProject={(freeform,actor)=>setProjectDraft({actor,input:{kind:'FREEFORM',freeform,system:null}})}/>}
  {visited.has('system')&&<SystemBoard fileTools={fileTools('SYSTEM')} locale={locale} active={activeTab==='system'} onSaveProject={(content,actor)=>setProjectDraft({actor,input:{kind:'SYSTEM',freeform:null,system:toSystemDocument(content)}})}/>}
  <IdeaProjects locale={locale} active={activeTab==='projects'} revision={projectRevision} onUseProject={project=>{setOpenRequest({key:crypto.randomUUID(),project});setActiveTab(project.summary.kind==='SYSTEM'?'system':'canvas');}}/>
  {projectDraft&&<SaveProjectDialog draft={projectDraft} locale={locale} onClose={()=>setProjectDraft(null)} onSaved={()=>{setProjectDraft(null);setProjectRevision(v=>v+1);setNotice(c.savedProject);}}/>}
 </IndiceModuleShell>;
}
