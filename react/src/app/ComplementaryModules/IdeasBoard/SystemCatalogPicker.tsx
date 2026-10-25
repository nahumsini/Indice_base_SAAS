import {useId,useMemo,useState} from 'react';
import {Search} from 'lucide-react';
import {catalogLabel,type CatalogItem} from './systemCatalog';
import {systemCatalogCopy} from './systemCatalogCopy';
import {symbols} from './systemBoardModel';
import {systemIconLabels} from './systemChannelSymbols';
const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
export function SystemCatalogPicker({items,value,onChange,locale,label,disabled=false,compact=false}:{items:readonly CatalogItem[];value:string;onChange:(id:string)=>void;locale:string;label:string;disabled?:boolean;compact?:boolean}) {
 const c=systemCatalogCopy(locale),id=useId(),[query,setQuery]=useState(''),[group,setGroup]=useState('');
 const groups=[...new Set(items.map(item=>item.group))];
 const visible=useMemo(()=>items.filter(item=>(!group||item.group===group)&&normalize(catalogLabel(item,locale)+' '+c[item.group]).includes(normalize(query))),[items,group,query,locale]);
 if(compact)return <label className="workspace-field system-element-type" htmlFor={id}><span>{label}</span><select id={id} disabled={disabled} value={value} onChange={e=>onChange(e.target.value)}>{!items.some(item=>item.id===value)&&<option value={value}>{symbols[value]} {systemIconLabels(locale)[value]??value}</option>}{groups.map(g=><optgroup key={g} label={c[g]}>{items.filter(item=>item.group===g).map(item=><option key={item.id} value={item.id}>{item.glyph} {catalogLabel(item,locale)}</option>)}</optgroup>)}</select></label>;
 return <fieldset className="system-catalog" disabled={disabled}><legend>{label}</legend>
  <div className="system-catalog-filters"><label className="system-catalog-search" htmlFor={id}><Search size={17}/><input id={id} type="search" maxLength={100} aria-label={c.search} placeholder={c.search} value={query} onChange={e=>setQuery(e.target.value)}/></label>{groups.length>1&&<select aria-label={c.all} value={group} onChange={e=>setGroup(e.target.value)}><option value="">{c.all}</option>{groups.map(g=><option key={g} value={g}>{c[g]}</option>)}</select>}</div>
  <div className="system-catalog-options">{groups.map(g=>{const options=visible.filter(item=>item.group===g);return options.length?<section key={g}><h4>{c[g]}</h4><div className="system-catalog-grid">{options.map(item=><button type="button" key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}><span aria-hidden="true">{item.glyph}</span><span>{catalogLabel(item,locale)}</span></button>)}</div></section>:null;})}{!visible.length&&<p role="status">{c.empty}</p>}</div>
 </fieldset>;
}
