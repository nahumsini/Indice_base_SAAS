import {apiClient,ApiClientError,buildApiUrl} from '../../lib/apiClient';
import type {Crumb,FileEntry,FilePage,FileMember,FileSharing} from './filesModel';
const root='/api/v1/files';const headers=(actor:string)=>({'X-Files-Actor':actor});
export const filesApi={
 list:(params:{folder?:string;scope:string;q?:string;page?:number;pageSize?:number;type?:string},signal?:AbortSignal)=>apiClient<FilePage>(`${root}?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)])))}`,{signal}),
 members:(signal?:AbortSignal)=>apiClient<FileMember[]>(`${root}/members`,{signal}),
 destinations:(exclude:string,signal?:AbortSignal)=>apiClient<Crumb[]>(`${root}/destinations?exclude=${encodeURIComponent(exclude)}`,{signal}),
 folder:(id:string,name:string,parentId:string|null,actor:string)=>apiClient<FileEntry>(`${root}/folders/${id}`,{method:'PUT',headers:headers(actor),body:JSON.stringify({name,parentId})}),
 change:(entry:FileEntry,action:string,input:{name?:string;parentId?:string|null},mutationId:string,actor:string)=>apiClient<FileEntry>(`${root}/${entry.id}`,{method:'PATCH',headers:headers(actor),body:JSON.stringify({version:entry.version,mutationId,action,...input})}),
 sharing:(id:string,signal?:AbortSignal)=>apiClient<FileSharing>(`${root}/${id}/sharing`,{signal}),
 share:(entry:FileEntry,grants:{userId:number;permission:number}[],mutationId:string,actor:string)=>apiClient<FileSharing>(`${root}/${entry.id}/sharing`,{method:'PUT',headers:headers(actor),body:JSON.stringify({version:entry.version,mutationId,grants})}),
 content:(id:string,preview=false)=>buildApiUrl(`${root}/${id}/content${preview?'?preview=true':''}`),
 async text(entry:FileEntry,signal:AbortSignal){const response=await fetch(filesApi.content(entry.id,true),{credentials:'include',cache:'no-store',signal,headers:{Range:'bytes=0-102399'}});if(!response.ok)throw new ApiClientError('File unavailable',response.status);return response.text();},
 async upload(file:File,id:string,parentId:string|null,actor:string,signal:AbortSignal){
  const signed=await apiClient<{id:string;url:string;headers:Record<string,string>;ready:FileEntry|null}>(`${root}/uploads/${id}`,{method:'POST',headers:headers(actor),body:JSON.stringify({name:file.name,parentId,sizeBytes:file.size}),signal});
  if(signed.ready)return signed.ready;
  const uploadHeaders=Object.fromEntries(Object.entries(signed.headers).filter(([key])=>key.toLowerCase()!=='content-length'));
  const response=await fetch(signed.url,{method:'PUT',body:file,headers:uploadHeaders,credentials:'omit',signal:AbortSignal.any([signal,AbortSignal.timeout(15*60*1000)])});if(!response.ok)throw new Error('File upload unavailable');
  return apiClient<FileEntry>(`${root}/uploads/${id}/register`,{method:'POST',headers:headers(actor),signal});
 },
};
