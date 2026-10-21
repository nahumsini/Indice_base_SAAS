import {apiClient,buildApiUrl} from '../../lib/apiClient';
import {getCachedAuthSession} from '../../api/authSessionStore';
import type {Project,ProjectSummary} from './ideaWorkspaceApi';
const base='/api/v1/ideas-board/projects';
export type ProjectScope='OWNED'|'SHARED'|'TRASH';
export interface ProjectMember{id:number;name:string;available:boolean}
export interface ProjectSharing{version:number;members:ProjectMember[]}
export interface ProjectChange{version:number;mutationId:string;name?:string;trashed?:boolean}
export function captureProjectActor(){const s=getCachedAuthSession();if(!s?.user||!s.company)throw Error('No current company');return `ideas_board:${s.company.id}:${s.user.id}`;}
const actorHeaders=(actor:string)=>({'X-Idea-Board-Actor':actor});
export function projectLink(project:ProjectSummary,origin:string){const url=new URL('/ideas-board/projects',origin);url.searchParams.set('project',project.id);if(project.ownerId!=null)url.searchParams.set('owner',String(project.ownerId));return url.href;}
export const validProjectName=(name:string)=>!!name.trim()&&name.trim().length<=120&&!/[\x00-\x1f\x7f]/.test(name);
export const projectManagementApi={
 change:(id:string,input:ProjectChange,actor:string)=>apiClient<Project>(`${base}/${encodeURIComponent(id)}`,{method:'PATCH',headers:actorHeaders(actor),body:JSON.stringify(input)}),
 copy:(project:ProjectSummary,id:string,name:string,actor:string)=>apiClient<Project>(`${base}/${encodeURIComponent(project.id)}/copies/${encodeURIComponent(id)}${project.ownerId!=null?'?ownerId='+encodeURIComponent(project.ownerId):''}`,{method:'PUT',headers:actorHeaders(actor),body:JSON.stringify({name})}),
 members:(q:string,signal?:AbortSignal)=>apiClient<ProjectMember[]>(`${base}/members?${new URLSearchParams({q})}`,{signal}),
 sharing:(id:string,signal?:AbortSignal)=>apiClient<ProjectSharing>(`${base}/${encodeURIComponent(id)}/sharing`,{signal}),
 share:(id:string,version:number,mutationId:string,userIds:number[],actor:string)=>apiClient<ProjectSharing>(`${base}/${encodeURIComponent(id)}/sharing`,{method:'PUT',headers:actorHeaders(actor),body:JSON.stringify({version,mutationId,userIds})}),
 assetUrl:(project:ProjectSummary,id:string)=>buildApiUrl(`${base}/${encodeURIComponent(project.id)}/assets/${encodeURIComponent(id)}${project.ownerId!=null?'?ownerId='+encodeURIComponent(project.ownerId):''}`),
};
