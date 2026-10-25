import {textNode,type BoardContent,type IdeaNode,type FiveSSection,type FiveSMetadata} from '../../BasicModules/Sales/Funneling/ideasBoardModel';
import {fiveSCopy} from './fiveSCopy';
export const fiveSSections:FiveSSection[]=['SORT','ORDER','CLEAN','STANDARDIZE','SUSTAIN'];
export const fiveSEmoji={SORT:'🧹',ORDER:'🗂️',CLEAN:'✨',STANDARDIZE:'📋',SUSTAIN:'🔁'};
const colors=['BLUE','YELLOW','MINT','CORAL','LAVENDER'] as const;
export function fiveSTemplates(content:BoardContent){const seen=new Set<string>();return content.nodes.filter(n=>{const f=n.fiveS;if(!f||f.role!=='SECTION'||seen.has(f.templateId))return false;seen.add(f.templateId);return true;});}
export function addFiveSTemplate(content:BoardContent,area:string,locale:string):BoardContent|null {
 if(content.nodes.length>95||!area.trim()||area.trim().length>80)return null;
 const id=crypto.randomUUID(),c=fiveSCopy(locale),x=content.nodes.length?Math.max(...content.nodes.map(n=>n.x+n.width))+80:40;
 if(x+4*320>10000)return null;
 const nodes=fiveSSections.map((section,i)=>({...textNode(x+i*320,40,'RECTANGLE'),width:300,height:170,color:colors[i],text:`${i+1}. ${c[section]}\n${c[`${section}Help`]}\n${area.trim()}`,fiveS:{templateId:id,role:'SECTION' as const,section,area:area.trim()}}));
 return{...content,nodes:[...content.nodes,...nodes]};
}
export function newFiveSAction(content:BoardContent,template:FiveSMetadata,section:FiveSSection):IdeaNode|null {
 if(content.nodes.length>=100)return null;
 const header=content.nodes.find(n=>n.fiveS?.templateId===template.templateId&&n.fiveS.role==='SECTION'&&n.fiveS.section===section);if(!header)return null;
 const rows=content.nodes.filter(n=>n.fiveS?.templateId===template.templateId&&n.fiveS.section===section&&n.fiveS.role==='ACTION');
 const y=rows.length?Math.max(...rows.map(n=>n.y+n.height))+24:240;if(y>10000||y+240>10800)return null;
 return{...textNode(header.x,y,'RECTANGLE'),width:300,height:240,color:header.color,fiveS:{templateId:template.templateId,role:'ACTION',section,area:template.area,status:'PENDING',action:'',owner:'',details:'',result:''}};
}
export function localDateKey(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export type FiveSFilter='ALL'|'PENDING'|'OVERDUE'|'REVIEWS';
export function matchesFiveS(node:IdeaNode,filter:FiveSFilter,today=localDateKey()){
 const f=node.fiveS;if(f?.role!=='ACTION')return false;
 if(filter==='PENDING')return f.status!=='VERIFIED';
 if(filter==='OVERDUE')return f.status!=='VERIFIED'&&!!f.dueDate&&f.dueDate<today;
 if(filter==='REVIEWS'){const end=new Date(today+'T12:00:00');end.setDate(end.getDate()+7);return !!f.reviewDate&&f.reviewDate<=localDateKey(end);}
 return true;
}
export function fiveSNodeText(node:IdeaNode,locale:string){const f=node.fiveS;if(!f)return node.text;const c=fiveSCopy(locale);if(f.role==='SECTION')return`${fiveSEmoji[f.section]} ${c[f.section]}\n${c[`${f.section}Help`]}\n${f.area}`;return[node.text,f.action,`${c.status}: ${c[f.status??'PENDING']}`,`${c.owner}: ${f.owner||c.noOwner}`,`${c.due}: ${f.dueDate||c.noDate}`,f.result?`${c.result}: ${f.result}`:''].filter(Boolean).join('\n');}
export function validFiveSAction(node:IdeaNode){const f=node.fiveS;return !!node.text.trim()&&node.text.length<=180&&!!f?.action?.trim()&&f.action.length<=1000&&(f.status!=='VERIFIED'||!!f.result?.trim());}
