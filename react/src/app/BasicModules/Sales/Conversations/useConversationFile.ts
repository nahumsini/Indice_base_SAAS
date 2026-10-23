import {useEffect,useRef,useState} from 'react';
import {conversationsApi,type Attachment} from './conversationsApi';
export function useConversationFile(id:string){
 const [file,setFile]=useState<File|null>(null),[error,setError]=useState(false),[preparing,setPreparing]=useState(false);
 const upload=useRef<{file:File;key:string;ready:Attachment|null}|null>(null),abort=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();upload.current=null;};},[]);
 function choose(value:File|null){if(!value)return;const limit=value.type==='application/pdf'?8*1024*1024:['image/png','image/jpeg'].includes(value.type)?4*1024*1024:0;
  if(!limit||!value.size||value.size>limit){setError(true);return;}upload.current={file:value,key:crypto.randomUUID(),ready:null};setFile(value);setError(false);
 }
 function clear(){upload.current=null;setFile(null);setError(false);}
 async function prepare(){const current=upload.current;if(!current)return null;if(current.ready)return current.ready;setPreparing(true);setError(false);abort.current=new AbortController();
  try{const result=await conversationsApi.prepareUpload(id,{requestKey:current.key,fileName:current.file.name,contentType:current.file.type,sizeBytes:current.file.size});
   if(!alive.current)throw new Error('Upload cancelled');
   if(result.attachment){current.ready=result.attachment;return result.attachment;}
   if(!result.uploadUrl)throw new Error('Upload unavailable');
   const sent=await fetch(result.uploadUrl,{method:'PUT',headers:result.headers,body:current.file,credentials:'omit',redirect:'error',signal:abort.current.signal});if(!sent.ok)throw new Error('Upload failed');
   if(!alive.current)throw new Error('Upload cancelled');const ready=await conversationsApi.finalizeUpload(id,result.id);current.ready=ready;return ready;
  }catch(e){if(alive.current)setError(true);throw e;}finally{if(alive.current)setPreparing(false);}
 }
 return {file,error,preparing,choose,clear,prepare};
}
