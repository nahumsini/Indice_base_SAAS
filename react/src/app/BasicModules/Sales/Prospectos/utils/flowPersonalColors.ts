import type {CSSProperties} from 'react';
import type {OpportunityFlowStage,OpportunityFlowColorToken} from '../../types/opportunities';
export type FlowColors=Record<string,string>;
export const flowColorPalette=['#2F80FF','#2563EB','#1D4ED8','#6366F1','#8B5CF6','#A855F7','#C026D3','#DB2777','#F43F5E','#FF6B5E','#EA580C','#F59E0B','#F4C84A','#A3E635','#65A30D','#059669','#59C3A5','#0D9488','#06B6D4','#0284C7','#334155','#64748B','#94A3B8','#222831'];
export const baseFlowColors:Record<OpportunityFlowColorToken,string>={BLUE:'#2F80FF',AQUA:'#59C3A5',GREEN:'#059669',YELLOW:'#F4C84A',CORAL:'#FF6B5E',VIOLET:'#8B5CF6',SLATE:'#64748B'};
export function normalizeFlowColors(value:unknown):FlowColors {
 const out:FlowColors={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const [key,color] of Object.entries(value).slice(0,12))if(/^[a-z0-9_-]{1,64}$/i.test(key)&&typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color))out[key]=color.toUpperCase();
 return out;
}
export function applyFlowColors(stages:OpportunityFlowStage[],colors:FlowColors):OpportunityFlowStage[]{return stages.map(stage=>({...stage,personalColor:Object.prototype.hasOwnProperty.call(colors,stage.key)?colors[stage.key]:undefined}));}
export const stageColor=(stage:OpportunityFlowStage)=>stage.personalColor??baseFlowColors[stage.colorToken];
export const stageDotStyle=(stage?:OpportunityFlowStage):CSSProperties|undefined=>stage?.personalColor?{backgroundColor:stage.personalColor}:undefined;
export function colorForeground(hex:string){
 const channels=[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
 return (luminance+.05)/.05>=4.5?'#000000':'#FFFFFF';
}
export const stageBadgeStyle=(stage?:OpportunityFlowStage):CSSProperties|undefined=>stage?.personalColor?{backgroundColor:stage.personalColor,borderColor:stage.personalColor,color:colorForeground(stage.personalColor)}:undefined;
