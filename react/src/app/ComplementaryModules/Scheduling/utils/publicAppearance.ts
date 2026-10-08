import type { CSSProperties } from 'react';
import type { PageAppearance } from '../services/schedulingApi';
export const defaultAppearance: PageAppearance = { brandName:'',accentColor:'#2563EB',surfaceColor:'#F8FAFC',buttonLabel:'',layout:'cards' };
const safeColor=(color:unknown,fallback:string)=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)?color:fallback;
export function contrastingText(color:string):string {
  const channels=[1,3,5].map(start=>parseInt(safeColor(color,'#FFFFFF').slice(start,start+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  const luminance=0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
  return (luminance+0.05)/0.05>=1.05/(luminance+0.05)?'#000000':'#FFFFFF';
}
export function publicAppearanceStyle(appearance?:PageAppearance):CSSProperties {
  const accent=safeColor(appearance?.accentColor,defaultAppearance.accentColor),surface=safeColor(appearance?.surfaceColor,defaultAppearance.surfaceColor);
  return {'--scheduling-accent':accent,'--scheduling-accent-foreground':contrastingText(accent),'--scheduling-surface':surface,'--scheduling-surface-foreground':contrastingText(surface)} as CSSProperties;
}
