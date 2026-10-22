import { useEffect, useRef, useState } from 'react';
import { Bold,Italic,Underline,List,ListOrdered,AlignLeft,AlignCenter,AlignRight,Link,ImagePlus,Undo2,Redo2,RemoveFormatting,ChevronLeft,ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useMailEditorCopy } from './mailEditorCopy';
import { cleanEditorHtml,plainMailHtml,MAIL_FONTS,prepareInlineImage,safeMailLink } from './mailFormat';
import './mailEditor.css';
export { cleanEditorHtml,plainMailHtml } from './mailFormat';
/** Native editing surface. Browser editing commands preserve caret typing and undo history;
 * sanitized HTML is only installed when external content actually changes. */
export function MailRichEditor({text,html,disabled,label,onChange,onBusy,maxText=20000}:{text:string;html:string|null;disabled:boolean;label:string;onChange:(text:string,html:string)=>void;onBusy?:(busy:boolean)=>void;maxText?:number}){
 const copy=useMailEditorCopy(),editor=useRef<HTMLDivElement>(null),toolbar=useRef<HTMLDivElement>(null),file=useRef<HTMLInputElement>(null),range=useRef<Range|null>(null),emitted=useRef<string|null>(null),alive=useRef(true);
 const [url,setUrl]=useState(''),[link,setLink]=useState(false),[error,setError]=useState(''),[uploading,setUploading]=useState(false);const locked=disabled||uploading;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const value=html??plainMailHtml(text);if(editor.current&&emitted.current!==value){editor.current.innerHTML=cleanEditorHtml(value);emitted.current=value;range.current=null;}},[html,text]);
 function remember(){const selection=window.getSelection();if(selection?.rangeCount&&editor.current?.contains(selection.getRangeAt(0).commonAncestorContainer))range.current=selection.getRangeAt(0).cloneRange();}
 useEffect(()=>{document.addEventListener('selectionchange',remember);return()=>document.removeEventListener('selectionchange',remember);},[]);
 function changed(){const node=editor.current;if(!node)return;const markup=cleanEditorHtml(node.innerHTML);emitted.current=markup;onChange(node.innerText.replace(/\r/g,''),markup);remember();}
 function restore(){const node=editor.current;if(!node)return;node.focus({preventScroll:true});const selection=window.getSelection();if(!selection)return;const value=range.current&&node.contains(range.current.commonAncestorContainer)?range.current:document.createRange();if(!range.current||!node.contains(value.commonAncestorContainer)){value.selectNodeContents(node);value.collapse(false);}selection.removeAllRanges();selection.addRange(value);}
 function command(name:string,value?:string){if(locked)return;restore();document.execCommand('styleWithCSS',false,'true');document.execCommand(name,false,value);changed();}
 async function image(selected:File){if(locked)return;setError('');if((editor.current?.querySelectorAll('img').length??0)>=3){setError(copy.imageLimit);return;}setUploading(true);onBusy?.(true);
  try{const src=await prepareInlineImage(selected);if(!alive.current)return;restore();document.execCommand('insertHTML',false,`<img src="${src}" alt="${plainMailHtml(selected.name)}" style="max-width:100%;height:auto"><br>`);changed();}catch{if(alive.current)setError(copy.imageError);}finally{if(alive.current){setUploading(false);onBusy?.(false);}}
 }
 const buttons=[['bold',copy.bold,Bold],['italic',copy.italic,Italic],['underline',copy.underline,Underline],['insertUnorderedList',copy.bullets,List],['insertOrderedList',copy.numbers,ListOrdered],['justifyLeft',copy.left,AlignLeft],['justifyCenter',copy.center,AlignCenter],['justifyRight',copy.right,AlignRight],['undo',copy.undo,Undo2],['redo',copy.redo,Redo2],['removeFormat',copy.clear,RemoveFormatting]] as const;
 return <div className="indice-mail-editor rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-400 dark:border-slate-700 dark:bg-slate-900">
  <div className="flex min-w-0 items-center border-b border-slate-200 bg-blue-50/70 dark:border-slate-700 dark:bg-blue-950/30">
   <Button type="button" variant="ghost" className="h-11 w-8 shrink-0 p-0" aria-label={copy.previous} onClick={()=>toolbar.current?.scrollBy({left:-250,behavior:'smooth'})}><ChevronLeft className="h-4 w-4"/></Button>
   <div ref={toolbar} role="toolbar" aria-label={label} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto p-1">
    <select aria-label={copy.font} title={copy.font} disabled={locked} className="h-11 w-28 shrink-0 rounded-lg border bg-transparent px-2 text-sm" defaultValue="Arial" onChange={e=>command('fontName',e.target.value)}>{MAIL_FONTS.map(f=><option key={f}>{f}</option>)}</select>
    <select aria-label={copy.size} title={copy.size} disabled={locked} className="h-11 w-16 shrink-0 rounded-lg border bg-transparent px-2 text-sm" defaultValue="3" onChange={e=>command('fontSize',e.target.value)}>{[10,13,16,18,24,32,40].map((size,i)=><option key={size} value={i+1}>{size}</option>)}</select>
    {buttons.slice(0,3).map(([name,title,Icon])=><Button key={name} type="button" variant="ghost" disabled={locked} className="h-11 w-11 shrink-0 p-0" aria-label={title} title={title} onMouseDown={e=>e.preventDefault()} onClick={()=>command(name)}><Icon className="h-4 w-4"/></Button>)}
    {([['foreColor',copy.color,'#172033'],['hiliteColor',copy.highlight,'#fff2a8']] as const).map(([name,title,color])=><label key={name} title={title} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border"><input type="color" disabled={locked} aria-label={title} defaultValue={color} className="h-7 w-7 cursor-pointer" onChange={e=>command(name,e.target.value)}/></label>)}
    {buttons.slice(3).map(([name,title,Icon])=><Button key={name} type="button" variant="ghost" disabled={locked} className="h-11 w-11 shrink-0 p-0" aria-label={title} title={title} onMouseDown={e=>e.preventDefault()} onClick={()=>command(name)}><Icon className="h-4 w-4"/></Button>)}
    <Button type="button" variant="ghost" disabled={locked} className="h-11 w-11 shrink-0 p-0" aria-label={copy.link} title={copy.link} aria-expanded={link} onMouseDown={e=>e.preventDefault()} onClick={()=>{remember();setLink(v=>!v);}}><Link className="h-4 w-4"/></Button>
    <Button type="button" variant="ghost" disabled={locked} className="h-11 w-11 shrink-0 p-0" aria-label={copy.image} title={copy.image} onMouseDown={e=>e.preventDefault()} onClick={()=>{remember();file.current?.click();}}><ImagePlus className="h-4 w-4"/></Button>
   </div><Button type="button" variant="ghost" className="h-11 w-8 shrink-0 p-0" aria-label={copy.next} onClick={()=>toolbar.current?.scrollBy({left:250,behavior:'smooth'})}><ChevronRight className="h-4 w-4"/></Button>
  </div>
  <input ref={file} hidden type="file" accept="image/png,image/jpeg" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void image(f);}}/>
  {link&&<div className="flex flex-wrap gap-2 border-b p-3"><input autoFocus type="url" aria-label={copy.url} placeholder="https://" className="h-11 min-w-0 flex-1 rounded-lg border bg-transparent px-3" value={url} disabled={locked} onChange={e=>setUrl(e.target.value)}/><Button type="button" disabled={locked} onClick={()=>{if(!safeMailLink(url.trim())){setError(copy.linkError);return;}restore();if(window.getSelection()?.isCollapsed)command('insertHTML',`<a href="${plainMailHtml(url.trim())}">${plainMailHtml(url.trim())}</a>`);else command('createLink',url.trim());setLink(false);setUrl('');setError('');}}>{copy.insert}</Button><Button type="button" variant="ghost" onClick={()=>setLink(false)}>{copy.cancel}</Button></div>}
  {error&&<p role="alert" className="p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
  <div ref={editor} contentEditable={!locked} suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" aria-disabled={locked} spellCheck className="mail-rich-editor min-h-64 overflow-y-auto whitespace-pre-wrap break-words p-4 text-base outline-none" onInput={changed} onBlur={remember} onClick={e=>{if((e.target as Element).closest('a'))e.preventDefault();}}
   onPaste={e=>{e.preventDefault();command('insertHTML',cleanEditorHtml(e.clipboardData.getData('text/html')||plainMailHtml(e.clipboardData.getData('text/plain'))));}} onDrop={e=>e.preventDefault()} />
  <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-2 text-xs text-slate-500 dark:text-slate-400"><span>{uploading?copy.loading:copy.hint}</span><span className={text.length>maxText?'text-red-700':''}>{text.length.toLocaleString()} / {maxText.toLocaleString()}</span></div>
 </div>;
}
