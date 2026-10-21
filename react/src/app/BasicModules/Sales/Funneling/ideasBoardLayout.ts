import type {ReactNode} from 'react';
import type {BoardContent,BoardViewport,IdeaNode} from './ideasBoardModel';
import type {MinimapBox} from './ideasBoardMinimapModel';
import type {ResizeBounds} from './nodeAppearance';
import type {IdeasBoardApi} from './ideasBoardApi';
export interface BoardNodeEditorContext {nameManaged?:boolean;node:IdeaNode;onChange:(node:IdeaNode)=>void;locale:string;api:IdeasBoardApi;actor:string;onBusyChange:(busy:boolean)=>void}
export interface BoardCreationGroup {batchLimit?:number;id:string;label:string;addLabel:string;icon:ReactNode;matches:(node:IdeaNode)=>boolean;create:(content:BoardContent)=>IdeaNode|null}
export interface BoardNodeEditor {isValid?:(node:IdeaNode)=>boolean;matches:(node:IdeaNode)=>boolean;title:(node:IdeaNode,isNew:boolean)=>string;saveLabel?:(node:IdeaNode)=>string;description:(node:IdeaNode)=>string;icon:(node:IdeaNode)=>ReactNode;render:(context:BoardNodeEditorContext)=>ReactNode}
/** Bounded presentation/geometry port. Storage, permissions and business ownership stay with the caller. */
export interface IdeasBoardLayout {
 creationGroups?:BoardCreationGroup[];editor?:BoardNodeEditor;
 noteHint?:string;title:string;subtitle:string;overview:string;emblem:ReactNode;backdrop:ReactNode;minZoom:number;
 worldBounds:MinimapBox;regions:Array<MinimapBox&{id:string;label:string;fill:string}>;
 prepare:(node:IdeaNode,content:BoardContent)=>IdeaNode|null;
 move:(node:IdeaNode,dx:number,dy:number)=>IdeaNode;
 bounds:(node:IdeaNode)=>ResizeBounds;
 fit:(nodes:IdeaNode[],width:number,height:number,region?:string)=>BoardViewport;
 sameIdeas:(a:BoardContent,b:BoardContent)=>boolean;
 printSections?:Array<{x:number;y:number;width:number;height:number;label:string}>;
 printDetails?:(nodes:IdeaNode[])=>Array<{title:string;steps:string[]}>;
 printNode?:(node:IdeaNode)=>IdeaNode;
 nodeClass?:(node:IdeaNode)=>string;
 renderNode?:(node:IdeaNode,onEdit?:()=>void)=>ReactNode|undefined;
}
export interface BoardSymbol {id:string;label:string;glyph:string;group?:string}
