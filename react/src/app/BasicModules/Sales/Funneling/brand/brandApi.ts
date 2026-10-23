import {apiClient,buildApiUrl,ApiClientError} from '../../../../lib/apiClient';
import type {BrandAsset,BrandDetails,BrandLibrary,BrandProfile,BrandSnapshot} from './brandModel';
const base='/api/v1/sales/company-library';
const headers=(actor:string)=>({'X-Brand-Actor':actor});
export const brandApi={
 library:(archived=false,signal?:AbortSignal)=>apiClient<BrandLibrary>(`${base}?archived=${archived}`,{signal}),
 save:(details:BrandDetails,version:number,mutationId:string,actor:string)=>apiClient<BrandProfile>(base,{method:'PUT',headers:headers(actor),body:JSON.stringify({details,version,mutationId})}),
 snapshot:(id:string,signal?:AbortSignal)=>apiClient<BrandSnapshot>(`${base}/campaigns/${encodeURIComponent(id)}`,{signal}),
 select:(id:string,body:{version:number;profileVersion:number;includeProfile:boolean;assetIds:string[];mutationId:string},actor:string)=>apiClient<BrandSnapshot>(`${base}/campaigns/${encodeURIComponent(id)}`,{method:'PUT',headers:headers(actor),body:JSON.stringify(body)}),
 state:(id:string,archived:boolean,actor:string)=>apiClient<BrandAsset>(`${base}/assets/${encodeURIComponent(id)}/status`,{method:'PUT',headers:headers(actor),body:JSON.stringify({archived})}),
 download:(id:string)=>buildApiUrl(`${base}/assets/${encodeURIComponent(id)}/download`),
 async image(asset:BrandAsset,signal:AbortSignal){
  if(asset.category!=='LOGO_VARIANT'||!['image/png','image/jpeg'].includes(asset.contentType))throw Error('Logo preview unavailable');
  const response=await fetch(brandApi.download(asset.id),{credentials:'include',cache:'no-store',signal});
  if(!response.ok)throw new ApiClientError('Logo preview unavailable',response.status);
  const data=await response.arrayBuffer();if(data.byteLength!==asset.sizeBytes||data.byteLength>5242880)throw Error('Logo preview unavailable');
  return new Blob([data],{type:asset.contentType});
 },
 async upload(file:File,category:string,id:string,actor:string,description='',logoVariant=''){
  const signed=await apiClient<{id:string;uploadUrl:string;uploadHeaders:Record<string,string>;ready:BrandAsset|null}>(`${base}/assets/upload`,{method:'POST',headers:headers(actor),body:JSON.stringify({requestId:id,filename:file.name,contentType:file.type||'text/plain',sizeBytes:file.size,category,description,logoVariant})});
  if(signed.ready)return signed.ready;
  const safeHeaders=Object.fromEntries(Object.entries(signed.uploadHeaders).filter(([key])=>key.toLowerCase()!=='content-length'));
  const response=await fetch(signed.uploadUrl,{method:'PUT',headers:safeHeaders,body:file,credentials:'omit',signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('Upload unavailable');
  return apiClient<BrandAsset>(`${base}/assets/${encodeURIComponent(id)}/register`,{method:'POST',headers:headers(actor)});
 },
};
