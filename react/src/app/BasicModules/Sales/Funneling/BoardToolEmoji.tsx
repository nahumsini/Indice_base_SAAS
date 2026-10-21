import {useId} from 'react';
import {IndiceEmoji} from '../../../components/icons/ModuleTabEmoji';
import type {GeometricShape} from './boardGeometry';
export type BoardToolArtwork='move'|'postit'|'text'|'shapes'|'connect'|'marker'|'media'|'symbols'|'new'|'open'|'save'|'print'|'fullscreen'|'fit'|'edit'|'copy'|'remove';
const originals:Partial<Record<BoardToolArtwork,string>>={move:'arrows',connect:'link',marker:'pencil',media:'photo',symbols:'sparkle',new:'documents',open:'folder',save:'save',print:'printer',fullscreen:'layout',fit:'target',edit:'pencil',copy:'documents',remove:'trash'};
/** Decorative tools extend the existing Indice artwork; labels and actions stay with each control. */
export function BoardToolEmoji({name,shape,className='board-tool-emoji'}:{name?:BoardToolArtwork;shape?:GeometricShape;className?:string}) {
 const id=useId().replace(/:/g,''),fill=`url(#${id})`;
 if(name&&originals[name])return <IndiceEmoji name={originals[name]} className={className}/>;
 return <svg viewBox="0 0 40 40" className={className} data-board-tool-art={shape??name} aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor={name==='postit'?'#fff0a1':'#76a9ff'}/><stop offset="1" stopColor={name==='postit'?'#f6bb30':'#2458d7'}/></linearGradient></defs>
  {name==='postit'?<><path d="M5 6h29v24l-7 6H5z" fill="#ad7c2330" transform="translate(0 1)"/><path d="M5 4h29v25l-8 7H5z" fill={fill} stroke="#e9ae32"/><path d="M26 36v-7h8" fill="#fff5bc"/><path d="M11 13h16M11 19h13M11 25h9" stroke="#b47c20" strokeWidth="2" strokeLinecap="round" opacity=".65"/></>:name==='text'?<><text x="8" y="33" fontSize="36" fontFamily="Arial,sans-serif" fontWeight="800" fill="#173b7a25">T</text><text x="6" y="31" fontSize="36" fontFamily="Arial,sans-serif" fontWeight="800" fill={fill}>T</text></>:shape?<g fill={fill} stroke="#1e50b3" strokeWidth="1.3">{shape==='ELLIPSE'?<ellipse cx="20" cy="20" rx="16" ry="13"/>:shape==='TRIANGLE'?<path d="M20 4L37 34H3z"/>:shape==='DIAMOND'?<path d="M20 3L37 20L20 37L3 20z"/>:shape==='PENTAGON'?<path d="M20 3L37 16L31 36H9L3 16z"/>:shape==='HEXAGON'?<path d="M11 4H29L38 20L29 36H11L2 20z"/>:shape==='PARALLELOGRAM'?<path d="M10 6H37L30 34H3z"/>:<rect x="4" y="7" width="32" height="26" rx="5"/>}</g>:<><rect x="3" y="4" width="21" height="21" rx="5" fill="#ff8a7b" stroke="#e56a5d"/><circle cx="27" cy="26" r="11" fill="#60d6ba" stroke="#35ad93"/><path d="M12 16L23 35H2z" fill={fill} stroke="#2458d7"/></>}
 </svg>;
}
