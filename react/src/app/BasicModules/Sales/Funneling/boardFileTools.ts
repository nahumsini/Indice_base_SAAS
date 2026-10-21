import type {ReactNode} from 'react';
import {sameBoardIdeas,type BoardContent} from './ideasBoardModel';
export interface BoardFileSnapshot {content:BoardContent;actor:string}
export interface BoardFileContext {
 active:boolean;ready:boolean;
 compact?:boolean;
 capture:()=>BoardFileSnapshot;
 replace:(expected:BoardFileSnapshot,next:BoardContent)=>boolean;
 notify:(message:string)=>void;
}
/** Optional owner UI. The canvas owns gestures/history; the caller owns named files. */
export interface BoardFileTools {
 title?:string;
 fullscreen:string;exitFullscreen:string;
 render:(context:BoardFileContext)=>ReactNode;
}

export function canReplaceBoard(current:BoardFileSnapshot&{ready:boolean},expected:BoardFileSnapshot,compare=sameBoardIdeas):boolean {
 return current.ready&&current.actor===expected.actor&&compare(current.content,expected.content);
}
