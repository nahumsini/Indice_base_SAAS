import type {ReactNode} from 'react';
import {sameBoardIdeas,type BoardContent} from './ideasBoardModel';
export interface BoardFileSnapshot {content:BoardContent;actor:string}
export interface BoardFileContext {
 active:boolean;ready:boolean;
 compact?:boolean;
 fileMenu?:ReactNode;
 capture:()=>BoardFileSnapshot;
 replace:(expected:BoardFileSnapshot,next:BoardContent)=>boolean;
 notify:(message:string)=>void;
}
/** A logical document view. One persistence owner atomically retains content outside the view. */
export interface BoardDocumentView {
 key:string;
 select:(content:BoardContent)=>BoardContent;
 merge:(current:BoardContent,next:BoardContent)=>BoardContent|null;
}
/** Optional owner UI. The canvas owns gestures/history; the caller owns named files. */
export interface BoardFileTools {
 title?:string;
 icon?:ReactNode;
 documentView?:BoardDocumentView;
 fullscreen:string;exitFullscreen:string;
 render:(context:BoardFileContext)=>ReactNode;
 renderWorkspace?:(context:BoardFileContext)=>ReactNode;
}

export function canReplaceBoard(current:BoardFileSnapshot&{ready:boolean},expected:BoardFileSnapshot,compare=sameBoardIdeas):boolean {
 return current.ready&&current.actor===expected.actor&&compare(current.content,expected.content);
}
