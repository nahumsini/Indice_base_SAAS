import type { CSSProperties } from 'react';
import type { PageAppearance } from '../services/schedulingApi';
export const defaultAppearance: PageAppearance = { brandName:'',accentColor:'#2563EB',surfaceColor:'#F8FAFC',buttonLabel:'',layout:'cards' };
export const publicAgendaPalettes = [
  { id:'professional',accentColor:'#2563EB',surfaceColor:'#EFF6FF',layout:'cards' },
  { id:'warm',accentColor:'#B63B32',surfaceColor:'#FFF1ED',layout:'cards' },
  { id:'natural',accentColor:'#047857',surfaceColor:'#ECFDF5',layout:'cards' },
  { id:'minimal',accentColor:'#334155',surfaceColor:'#F8FAFC',layout:'compact' },
  { id:'elegant',accentColor:'#6B3E68',surfaceColor:'#FAF5FA',layout:'showcase' },
  { id:'creative',accentColor:'#6D28D9',surfaceColor:'#F5F3FF',layout:'cards' },
  { id:'ocean',accentColor:'#0E7490',surfaceColor:'#ECFEFF',layout:'cards' },
  { id:'sunset',accentColor:'#9A3412',surfaceColor:'#FFF7ED',layout:'showcase' },
] as const;
export const validPublicContent = (draft: { title: string; description: string }, appearance: PageAppearance) =>
  Boolean(draft.title.trim()) && draft.title.length <= 180 && draft.description.length <= 1500 && appearance.brandName.length <= 120 && appearance.buttonLabel.length <= 80;
export const validPublicAppearance = (appearance: PageAppearance) =>
  /^#[0-9a-f]{6}$/i.test(appearance.accentColor) && /^#[0-9a-f]{6}$/i.test(appearance.surfaceColor) && ['cards','compact','showcase'].includes(appearance.layout) && (!appearance.logoDataUrl || (appearance.logoDataUrl.length <= 175000 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(appearance.logoDataUrl)));
const safeColor=(color:unknown,fallback:string)=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?color:fallback;
export function contrastingText(color:string):string {
  const channels=[1,3,5].map(start=>parseInt(safeColor(color,'#FFFFFF').slice(start,start+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  const luminance=0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
  return (luminance+0.05)/0.05>=1.05/(luminance+0.05)?'#000000':'#FFFFFF';
}
export function publicAppearanceStyle(appearance?:PageAppearance):CSSProperties {
  const accent=safeColor(appearance?.accentColor,defaultAppearance.accentColor),surface=safeColor(appearance?.surfaceColor,defaultAppearance.surfaceColor);
  return {'--indice-brand-action':accent,'--indice-brand-shell-foreground':contrastingText(accent),'--scheduling-accent':accent,'--scheduling-accent-foreground':contrastingText(accent),'--scheduling-surface':surface,'--scheduling-surface-foreground':contrastingText(surface)} as CSSProperties;
}
