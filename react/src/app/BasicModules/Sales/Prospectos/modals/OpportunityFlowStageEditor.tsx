import {useEffect,useState} from 'react';
import {ArrowDown,ArrowUp,Check,Plus,Trash2} from 'lucide-react';
import {Button} from '../../../../components/ui/button';
import {Input} from '../../../../components/ui/input';
import type {OpportunityFlowStage,OpportunityFlowColorToken} from '../../salesCrmContext';
import type {ProspectosCopy} from '../translations';
import {applyFlowColors,baseFlowColors,colorForeground,flowColorPalette,stageColor,type FlowColors} from '../utils/flowPersonalColors';
import type {FlowManagerCopy} from './flowManagerCopy';
const reindex=(stages:OpportunityFlowStage[])=>stages.map((stage,position)=>({...stage,position}));
export function OpportunityFlowStageEditor({stages,canEdit,busy,copy,onChange,mode,colors,onColorsChange,text,colorsReady}: {
 stages:OpportunityFlowStage[];canEdit:boolean;busy:boolean;copy:ProspectosCopy['flow'];onChange:(stages:OpportunityFlowStage[])=>void;
 mode:'team'|'colors';colors:FlowColors;onColorsChange:(colors:FlowColors)=>void;text:FlowManagerCopy;colorsReady:boolean;
}) {
 const [selected,setSelected]=useState(stages[0]?.key??'');
 useEffect(()=>{if(!stages.some(s=>s.key===selected))setSelected(stages[0]?.key??'');},[stages,selected]);
 const stage=stages.find(s=>s.key===selected)??stages[0],index=stages.findIndex(s=>s.key===stage?.key);
 const openCount=stages.filter(s=>s.type==='OPEN').length;
 const display=applyFlowColors(stages,mode==='colors'?colors:{});
 const active=display.find(s=>s.key===stage?.key);
 const update=(patch:Partial<OpportunityFlowStage>)=>onChange(stages.map(s=>s.key===stage.key?{...s,...patch}:s));
 function move(offset:number){if(!canEdit||busy||stage.type!=='OPEN')return;const to=index+offset;if(to<0||to>=openCount)return;const next=[...stages];next.splice(index,1);next.splice(to,0,stage);onChange(reindex(next));}
 function add(){if(!canEdit||busy||stages.length>=12)return;const key=`__draft_${crypto.randomUUID().slice(0,8)}`;const next=[...stages];next.splice(openCount,0,{key,label:'',type:'OPEN',colorToken:'VIOLET',defaultProbabilityPercent:50,position:openCount,required:false,opportunityCount:0});onChange(reindex(next));setSelected(key);}
 const [hex,setHex]=useState('');
 useEffect(()=>setHex(active?stageColor(active):''),[active?.key,active?.personalColor,active?.colorToken]);
 const choose=(color:string)=>{if(!colorsReady||busy)return;onColorsChange({...colors,[stage.key]:color.toUpperCase()});};
 return <section className="flow-stage-editor">
  <aside className="flow-stage-list" aria-label={copy.stageListTitle}>
   <div className="flow-stage-list-title"><strong>{copy.stageListTitle}</strong><span>{stages.length}/12</span></div>
   <div className="flow-stage-choices">{display.map((item,n)=><button key={item.key} type="button" className={selected===item.key?'is-selected':''} aria-pressed={selected===item.key} onClick={()=>setSelected(item.key)} disabled={busy}>
    <span className="flow-stage-number" style={{backgroundColor:stageColor(item),color:colorForeground(stageColor(item))}}>{n+1}</span><span><strong>{item.label||copy.stageName}</strong><small>{item.required?`🔒 ${copy.protectedStage}`:copy.opportunities(item.opportunityCount)}</small></span><span className="flow-stage-probability">{item.defaultProbabilityPercent}%</span>
   </button>)}</div>
   {mode==='team'&&canEdit&&<Button variant="outline" disabled={busy||stages.length>=12} onClick={add}><Plus size={16}/>{copy.addStage}</Button>}
  </aside>
  {stage&&active&&<div className="flow-stage-detail">
   <div className="flow-stage-detail-heading"><span className="flow-stage-large-dot" style={{backgroundColor:stageColor(active)}}/><div><h3>{stage.label||copy.stageName}</h3><p>{copy.opportunities(stage.opportunityCount)}</p></div></div>
   {mode==='team'?<>
    {canEdit?<div className="flow-stage-fields">
     <label htmlFor="flow-stage-name">{copy.stageName}<Input id="flow-stage-name" value={stage.label} maxLength={80} disabled={busy} onChange={event=>update({label:event.target.value})}/></label>
     <label htmlFor="flow-stage-probability">{copy.probability}<div className="flow-probability-input"><Input id="flow-stage-probability" type="number" min={0} max={100} step={1} value={stage.defaultProbabilityPercent} disabled={busy||stage.required} onChange={event=>update({defaultProbabilityPercent:Math.max(0,Math.min(100,Math.round(Number(event.target.value)||0)))})}/><span>%</span></div><small>{text.probabilityHint}</small></label>
     <fieldset disabled={busy}><legend>{copy.color}</legend><div className="flow-base-colors">{(Object.keys(baseFlowColors) as OpportunityFlowColorToken[]).map(token=><button type="button" key={token} aria-label={copy.colors[token]} aria-pressed={stage.colorToken===token} style={{backgroundColor:baseFlowColors[token],color:colorForeground(baseFlowColors[token])}} onClick={()=>update({colorToken:token})}>{stage.colorToken===token&&<Check size={20}/>}</button>)}</div></fieldset>
    </div>:<dl className="flow-readonly-detail"><div><dt>{copy.stageName}</dt><dd>{stage.label}</dd></div><div><dt>{copy.probability}</dt><dd>{stage.defaultProbabilityPercent}%</dd></div></dl>}
    {canEdit&&<div className="flow-stage-actions"><Button variant="outline" aria-label={copy.moveUp} disabled={busy||stage.required||index===0} onClick={()=>move(-1)}><ArrowUp size={16}/>{copy.moveUp}</Button><Button variant="outline" aria-label={copy.moveDown} disabled={busy||stage.required||index>=openCount-1} onClick={()=>move(1)}><ArrowDown size={16}/>{copy.moveDown}</Button><Button variant="ghost" className="flow-danger" disabled={busy||stage.required||stage.opportunityCount>0||openCount<=1} onClick={()=>onChange(reindex(stages.filter(s=>s.key!==stage.key)))}><Trash2 size={16}/>{copy.remove}</Button></div>}
    {stage.required?<p className="flow-detail-note">🔒 {copy.protectedStage}</p>:canEdit&&stage.opportunityCount>0?<p className="flow-detail-note">{copy.inUse}</p>:null}
   </>:<fieldset className="flow-palette" disabled={busy||!colorsReady}>
    <legend>{text.palette}</legend><div className="flow-palette-grid">{flowColorPalette.map(color=><button type="button" key={color} aria-label={color} aria-pressed={stageColor(active)===color} style={{backgroundColor:color,color:colorForeground(color)}} onClick={()=>choose(color)}>{stageColor(active)===color&&<Check size={22}/>}</button>)}</div>
    <div className="flow-custom-color"><label>{text.customColor}<input type="color" value={stageColor(active)} aria-label={text.customColor} onChange={event=>choose(event.target.value)}/></label><label htmlFor="flow-color-hex">{text.colorHex}<Input id="flow-color-hex" value={hex} maxLength={7} aria-invalid={!/^#[0-9a-f]{6}$/i.test(hex)} onChange={event=>{const value=event.target.value;setHex(value);if(/^#[0-9a-f]{6}$/i.test(value))choose(value);}} onBlur={()=>setHex(stageColor(active))}/></label></div>
   </fieldset>}
   <div className="flow-mini-preview"><h4>{text.preview}</h4><div className="flow-preview-columns">{display.map(item=><div key={item.key}><div className="flow-preview-strip" style={{backgroundColor:stageColor(item)}}/><strong>{item.label||copy.stageName}</strong><span className="flow-preview-card" aria-hidden="true"><i/><i/></span></div>)}</div></div>
  </div>}
 </section>;
}
