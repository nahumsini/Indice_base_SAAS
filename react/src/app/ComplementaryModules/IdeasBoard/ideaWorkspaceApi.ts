import {apiClient} from '../../lib/apiClient';
import type {BoardContent,BoardInput,SavedBoard} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import type {IdeasBoardApi} from '../../BasicModules/Sales/Funneling/ideasBoardApi';
import {personalIdeasBoardApi} from './personalIdeasBoardApi';
import {fromSystemDocument,toSystemDocument,type SystemDocument} from './systemBoardModel';
const base='/api/v1/ideas-board';
export interface ProjectInput {name:string;kind:'FREEFORM'|'SYSTEM';freeform:BoardContent|null;system:SystemDocument|null}
export interface ProjectSummary {id:string;name:string;kind:'FREEFORM'|'SYSTEM';nodeCount:number;connectionCount:number;createdAt:string}
export interface Project {summary:ProjectSummary;freeform:BoardContent|null;system:SystemDocument|null}
export interface ProjectPage {items:ProjectSummary[];total:number;page:number;pageSize:number}
type SystemSaved=Omit<SavedBoard,'content'>&{content:SystemDocument};
const toBoard=(saved:SystemSaved):SavedBoard=>({...saved,content:fromSystemDocument(saved.content)});
export const systemBoardApi:IdeasBoardApi={
 resource:base+'/system',
 get:async(signal)=>toBoard(await apiClient<SystemSaved>(base+'/system',{signal})),
 save:async(input:BoardInput,actorKey:string)=>toBoard(await apiClient<SystemSaved>(base+'/system',{method:'PUT',headers:{'X-Idea-Board-Actor':actorKey},body:JSON.stringify({...input,content:toSystemDocument(input.content)})})),
 upload:personalIdeasBoardApi.upload,photoUrl:personalIdeasBoardApi.photoUrl,
};
export const ideaWorkspaceApi={
 list:(q='',page=1,signal?:AbortSignal)=>apiClient<ProjectPage>(`${base}/projects?${new URLSearchParams({q,page:String(page),pageSize:'12'})}`,{signal}),
 get:(id:string,signal?:AbortSignal)=>apiClient<Project>(`${base}/projects/${encodeURIComponent(id)}`,{signal}),
 save:(id:string,input:ProjectInput,actor:string)=>apiClient<Project>(`${base}/projects/${encodeURIComponent(id)}`,{method:'PUT',headers:{'X-Idea-Board-Actor':actor},body:JSON.stringify(input)}),
};
