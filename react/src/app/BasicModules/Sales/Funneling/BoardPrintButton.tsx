import {DropdownMenuItem} from '../../../components/ui/dropdown-menu';
import {BoardToolEmoji} from './BoardToolEmoji';
import type {BoardContent} from './ideasBoardModel';
import type {IdeasBoardApi} from './ideasBoardApi';
import type {IdeasBoardLayout} from './ideasBoardLayout';
import {ideasBoardCopy} from './ideasBoardCopy';
import {boardCreativeCopy} from './boardCreativeCopy';
import {boardPrintDocument,boardPrintStyles} from './boardPrintDocument';
import {printDocumentHtml} from '../../shared/print/documentHtmlPrintEngine';
export function BoardPrintButton({content,layout,api,locale,disabled,notify,menuItem=false}:{content:BoardContent;layout?:IdeasBoardLayout;api:IdeasBoardApi;locale:string;disabled:boolean;notify:(message:string)=>void;menuItem?:boolean}) {
 const c=boardCreativeCopy(locale),title=layout?.title??ideasBoardCopy(locale).title;
 const print=()=>{
  try{const snapshot=structuredClone(content);const ok=printDocumentHtml({bodyHtml:boardPrintDocument(snapshot,title,api.photoUrl,layout),contentStyles:boardPrintStyles,documentTitle:title,locale,presentation:'preserve',orientation:'landscape',pageSize:'a4'});if(ok)notify(c.printHint);}catch{notify(c.printError);}
 };
 const unavailable=disabled||!content.nodes.length&&!layout;
 if(menuItem)return <DropdownMenuItem disabled={unavailable} aria-label={c.print} onSelect={print}><BoardToolEmoji name="print"/><span>{c.print}</span></DropdownMenuItem>;
 return <button type="button" className="idea-board-button idea-board-secondary idea-board-print" aria-label={c.print} disabled={unavailable} title={`${c.print} · ${c.printHint}`} onClick={print}><BoardToolEmoji name="print"/><span className="board-print-long">{c.print}</span><span className="board-print-short" aria-hidden="true">PDF</span></button>;
}
