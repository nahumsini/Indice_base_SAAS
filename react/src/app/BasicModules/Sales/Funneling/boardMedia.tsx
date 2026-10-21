import {useState} from 'react';
import {FileAudio,Film} from 'lucide-react';
import {nodeTextStyle} from './nodeAppearance';
import type {IdeaNode} from './ideasBoardModel';
import {boardInteractionCopy} from './boardInteractionCopy';
const formats:Record<string,{mime:string;kind:'IMAGE'|'VIDEO'|'AUDIO';limit:number}>=Object.fromEntries([
 ['png','image/png','IMAGE',5],['jpg','image/jpeg','IMAGE',5],['jpeg','image/jpeg','IMAGE',5],['webp','image/webp','IMAGE',5],
 ['mp4','video/mp4','VIDEO',25],['webm','video/webm','VIDEO',25],['mp3','audio/mpeg','AUDIO',10],['m4a','audio/mp4','AUDIO',10],['wav','audio/wav','AUDIO',10],['ogg','audio/ogg','AUDIO',10],
].map(([extension,mime,kind,limit])=>[extension,{mime,kind,limit}])) as never;
export const boardMediaAccept='image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/ogg,.m4a,.wav,.ogg';
export function boardFileFormat(file:{name:string;type:string;size:number},personal=true) {
 const format=formats[file.name.split('.').pop()?.toLowerCase()??''];
 const type=file.type==='audio/x-wav'?'audio/wav':file.type==='audio/x-m4a'?'audio/mp4':file.type;
 if(!format||(!personal&&format.kind!=='IMAGE')||!file.size||file.size>format.limit*1024*1024||file.name.length>180||/[\x00-\x1f\x7f/\\]/.test(file.name)||(type&&type!=='application/octet-stream'&&type!==format.mime))return null;
 return format;
}
export function BoardMediaElement({node,url,locale}:{node:IdeaNode;url:string;locale:string}) {
 const [failed,setFailed]=useState(false),c=boardInteractionCopy(locale),video=node.kind==='VIDEO',Icon=video?Film:FileAudio;
 if(node.kind!=='VIDEO'&&node.kind!=='AUDIO')return null;
 return <div className="board-media-element" data-board-media onPointerDown={e=>{if((e.target as Element).closest('video,audio'))e.stopPropagation();}} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
  {video?<video key={url} controls playsInline preload="metadata" aria-label={node.text||c.video} src={url} onError={()=>setFailed(true)}/>:<><span className="board-audio-icon" aria-hidden="true"><Icon size={30}/></span><audio key={url} controls preload="metadata" aria-label={node.text||c.audio} src={url} onError={()=>setFailed(true)}/></>}
  <span className="board-media-name" style={nodeTextStyle(node)}>{node.text||c[video?'video':'audio']}</span>{failed&&<small role="alert">{c.mediaPlayError}</small>}
 </div>;
}
