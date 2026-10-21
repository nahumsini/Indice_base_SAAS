import {useEffect,useRef,useState,type FocusEvent} from 'react';
import {Check,X} from 'lucide-react';
import type {IdeaNode} from './ideasBoardModel';
import {defaultAppearance,nodeTextStyle} from './nodeAppearance';
import {boardInteractionCopy} from './boardInteractionCopy';
export function BoardInlineText({node,locale,onFinish}:{node:IdeaNode;locale:string;onFinish:(node:IdeaNode|null)=>void}) {
 const [text,setText]=useState(node.text),area=useRef<HTMLTextAreaElement>(null),measure=useRef<HTMLDivElement>(null),done=useRef(false),c=boardInteractionCopy(locale),a=node.appearance??defaultAppearance(node);
 const [size,setSize]=useState({width:Math.max(40,Math.min(1000,node.width)),height:40});
 function measuredSize(){const element=measure.current;return element?{width:Math.max(40,Math.min(1000,Math.ceil(element.offsetWidth)+4)),height:Math.max(40,Math.min(800,Math.ceil(element.scrollHeight)))}:size;}
 useEffect(()=>{area.current?.focus({preventScroll:true});area.current?.setSelectionRange(node.text.length,node.text.length);},[node.id]);
 useEffect(()=>{const next=measuredSize();setSize(previous=>previous.width===next.width&&previous.height===next.height?previous:next);},[text,a.fontFamily,a.fontSize,a.bold,a.italic]);
 function finish(cancel=false){if(done.current)return;done.current=true;onFinish(cancel?null:{...node,text:text.trim(),...measuredSize()});}
 function blur(event?:FocusEvent<HTMLElement>){if(event?.relatedTarget&&event.currentTarget.closest('[data-board-inline-text]')?.contains(event.relatedTarget as Node))return;finish();}
 const textStyle={...nodeTextStyle({...node,appearance:a}),...(!node.appearance?{color:'var(--board-ink)'}:{})};
 return <div data-board-inline-text className="board-inline-text" style={{left:node.x,top:node.y,width:size.width,minHeight:size.height}} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} onBlur={blur}>
  <div ref={measure} className="board-inline-text-measure" aria-hidden="true" style={textStyle}>{(text||c.textPlaceholder)+'\u200b'}</div>
  <textarea ref={area} aria-label={c.textPlaceholder} placeholder={c.textPlaceholder} maxLength={4000} value={text} style={{...textStyle,height:size.height}} onChange={e=>setText(e.target.value)} onBlur={blur} onKeyDown={e=>{if(e.nativeEvent?.isComposing)return;if(e.key==='Escape'){e.preventDefault();finish(true);}else if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();finish();}}}/>
  <div className="board-inline-text-actions" onPointerDown={e=>e.preventDefault()}><button type="button" onClick={()=>finish()} aria-label={c.finish}><Check size={18}/>{c.finish}</button><button type="button" onClick={()=>finish(true)} aria-label={c.cancel}><X size={18}/></button></div>
 </div>;
}
