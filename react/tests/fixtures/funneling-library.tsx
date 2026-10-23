import './campaign-workshop';
import {brandApi} from '../../src/app/BasicModules/Sales/Funneling/brand/brandApi';
import {emptyBrandDetails,type BrandLibrary,type BrandSnapshot} from '../../src/app/BasicModules/Sales/Funneling/brand/brandModel';
import {ApiClientError} from '../../src/app/lib/apiClient';
let data:BrandLibrary={profile:{companyName:'Estudio Alba · Ejemplo',logoUrl:'',version:0,actorKey:'synthetic-brand',details:emptyBrandDetails()},assets:[{id:'00000000-0000-4000-8000-000000000009',name:'Fotografía del servicio.jpg',contentType:'image/jpeg',sizeBytes:150000,category:'PHOTO',status:'READY'}]};
let snapshots:Record<string,BrandSnapshot>={};
try{data=JSON.parse(sessionStorage.getItem('synthetic-brand-library')||'null')||data;snapshots=JSON.parse(sessionStorage.getItem('synthetic-brand-snapshots')||'{}');}catch{}
const save=()=>{sessionStorage.setItem('synthetic-brand-library',JSON.stringify(data));sessionStorage.setItem('synthetic-brand-snapshots',JSON.stringify(snapshots));};
brandApi.library=async(archived=false)=>structuredClone({...data,assets:data.assets.filter(a=>archived?a.status==='ARCHIVED':a.status==='READY')});
brandApi.save=async(details,version,_mutation,actor)=>{if(actor!==data.profile.actorKey||version!==data.profile.version)throw new ApiClientError('Synthetic conflict',409);data.profile={...data.profile,details:structuredClone(details),version:version+1};save();return structuredClone(data.profile);};
brandApi.snapshot=async id=>structuredClone(snapshots[id]??{companyName:data.profile.companyName,details:emptyBrandDetails(),assets:[],version:0,profileVersion:0,includeProfile:false});
brandApi.select=async(id,input,actor)=>{if(actor!==data.profile.actorKey||input.version!==(snapshots[id]?.version??0)||(input.includeProfile&&input.profileVersion!==data.profile.version))throw new ApiClientError('Synthetic conflict',409);const value:BrandSnapshot={companyName:data.profile.companyName,details:input.includeProfile?structuredClone(data.profile.details):emptyBrandDetails(),assets:structuredClone(data.assets.filter(a=>input.assetIds.includes(a.id))),version:input.version+1,profileVersion:input.profileVersion,includeProfile:input.includeProfile};snapshots[id]=value;save();return structuredClone(value);};
brandApi.state=async(id,archived)=>{const asset=data.assets.find(a=>a.id===id)!;asset.status=archived?'ARCHIVED':'READY';save();return structuredClone(asset);};
brandApi.upload=async(file,category,id,_actor,description='',logoVariant='')=>{const asset={id,name:file.name,contentType:file.type,sizeBytes:file.size,category:category as 'PHOTO',status:'READY' as const,description,logoVariant};if(!data.assets.some(a=>a.id===id))data.assets.push(asset);save();return structuredClone(asset);};
brandApi.download=()=> 'data:text/plain,Material%20sintetico%20de%20prueba';

brandApi.image=async()=>new Blob([Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S0AAAAASUVORK5CYII="),c=>c.charCodeAt(0))],{type:"image/png"});
