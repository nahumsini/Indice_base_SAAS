import type {BoardContent} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import type {Project,ProjectPage,ProjectSummary} from './ideaWorkspaceApi';
import {fromSystemDocument} from './systemBoardModel';
export type BoardFileKind='FREEFORM'|'SYSTEM';
export const hasBoardWork=(content:BoardContent)=>content.nodes.length>0||content.connections.length>0;
export function editableProject(project:Project,kind:BoardFileKind):BoardContent {
 if(project.summary.kind!==kind)throw Error('Incompatible board kind');
 const content=kind==='SYSTEM'?(project.system?fromSystemDocument(project.system):null):project.freeform;
 if(!content)throw Error('Missing project content');return structuredClone(content);
}
export async function listBoardFiles(list:(page:number,signal:AbortSignal)=>Promise<ProjectPage>,kind:BoardFileKind,signal:AbortSignal):Promise<ProjectSummary[]> {
 const first=await list(1,signal);
 if(first.total>200||first.pageSize!==50)throw Error('Unexpected file page');
 const rest=await Promise.all(Array.from({length:Math.max(0,Math.ceil(first.total/50)-1)},(_,i)=>list(i+2,signal)));
 if(signal.aborted)throw new DOMException('Aborted','AbortError');
 return [...new Map([first,...rest].flatMap(page=>page.items).map(item=>[item.id,item])).values()].filter(item=>item.kind===kind);
}
