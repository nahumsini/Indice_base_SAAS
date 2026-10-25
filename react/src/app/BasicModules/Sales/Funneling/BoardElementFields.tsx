import {geometricShapes,geometryLabel,isGeometry} from './boardGeometry';
import {boardInteractionCopy} from './boardInteractionCopy';
import {Check} from 'lucide-react';
import type {IdeaNode,BoardColor,BoardShape} from './ideasBoardModel';
import {ideasBoardCopy} from './ideasBoardCopy';
import {NodeAppearanceControls} from './NodeAppearanceControls';
import {defaultAppearance,type ResizeBounds} from './nodeAppearance';
import {boardWorkbenchCopy} from './boardWorkbenchCopy';
export function BoardElementFields({node,onChange,locale,customizable,bounds}:{node:IdeaNode;onChange:(node:IdeaNode)=>void;locale:string;customizable:boolean;bounds?:ResizeBounds}) {
 const c=ideasBoardCopy(locale),shapes:BoardShape[]=customizable?['NOTE','PLAIN',...geometricShapes]:['NOTE','RECTANGLE','ELLIPSE','PLAIN'],colors:BoardColor[]=['YELLOW','CORAL','BLUE','MINT','LAVENDER','WHITE'];
 const ui=boardInteractionCopy(locale);const label=(shape:BoardShape)=>shape==='PLAIN'?c.text:customizable?geometryLabel(shape,locale):shape==='NOTE'?c.note:shape==='RECTANGLE'?c.rectangle:c.circle;
 const palette=<fieldset className="space-y-2"><legend className="text-sm font-medium">{c.color}</legend><div className="flex flex-wrap gap-1">{colors.map((color,index)=><button type="button" key={color} data-color={color} className="idea-board-swatch" aria-label={`${c.color} ${index+1}`} aria-pressed={node.color===color} onClick={()=>onChange({...node,color,...(customizable&&node.appearance?{appearance:{...node.appearance,fillColor:defaultAppearance({...node,color}).fillColor,borderColor:defaultAppearance({...node,color}).borderColor,transparentFill:false}}:{})})}>{node.color===color&&<Check size={18} aria-hidden="true"/>}</button>)}</div></fieldset>;
 return <div className="space-y-4 board-element-fields">
  <label className="block space-y-2 text-sm font-medium">{customizable&&isGeometry(node.shape)?ui.optionalText:c.content}<textarea autoFocus rows={customizable?3:5} maxLength={4000} placeholder={c.placeholder} value={node.text} onChange={e=>onChange({...node,text:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"/></label>
  <div className="board-element-basic grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">{c.shape}<select value={node.shape} className="idea-board-select" onChange={e=>onChange({...node,shape:e.target.value as BoardShape})}>{shapes.map(shape=><option key={shape} value={shape}>{label(shape)}</option>)}</select></label>{!customizable&&palette}</div>
  {customizable&&<details className="board-editor-details"><summary>{boardWorkbenchCopy(locale).appearance}</summary><div className="board-element-palette">{palette}</div><NodeAppearanceControls node={node} locale={locale} onChange={onChange} bounds={bounds}/></details>}
 </div>;
}
