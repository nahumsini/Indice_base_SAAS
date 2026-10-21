import {useEffect,useRef,useState} from 'react';

/** Observe the owner's scroll container; retain header space so compacting never moves the canvas. */
export function useBoardTitleDock(enabled:boolean,expanded:boolean) {
 const anchor=useRef<HTMLDivElement>(null),dock=useRef<HTMLDivElement>(null);
 const [compact,setCompact]=useState(false),[height,setHeight]=useState(0),[naturalHeight,setNaturalHeight]=useState(0);
 const compactRef=useRef(compact);compactRef.current=compact;
 useEffect(()=>{
  if(!enabled){setCompact(false);return;}
  const marker=anchor.current,header=dock.current;if(!marker||!header)return;
  let root=marker.parentElement;
  while(root&&!/(auto|scroll)/.test(getComputedStyle(root).overflowY))root=root.parentElement;
  const scroller=root??document.documentElement;let frame:number|undefined;
  const measure=()=>{
   frame=undefined;
   const top=root?root.getBoundingClientRect().top+root.clientTop:0;
   const narrow=window.matchMedia('(max-width:767px), (max-height:600px)').matches;
   setCompact(narrow||marker.getBoundingClientRect().top<top+2);
   const natural=header.firstElementChild instanceof HTMLElement?header.firstElementChild.offsetHeight:0;
   setNaturalHeight(natural);
   if(narrow)setHeight(compactRef.current?natural:0);
   else if(natural)setHeight(previous=>compactRef.current?Math.max(previous,natural):natural);
  };
  const schedule=()=>{if(frame===undefined)frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);observer.observe(scroller);if(header.firstElementChild)observer.observe(header.firstElementChild);
  scroller.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{observer.disconnect();scroller.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);if(frame!==undefined)cancelAnimationFrame(frame);};
 },[enabled,expanded]);
 return{anchor,dock,compact,space:Math.max(0,height-naturalHeight)};
}
