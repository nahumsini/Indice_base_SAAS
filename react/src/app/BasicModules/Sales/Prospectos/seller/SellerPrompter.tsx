import { useEffect, useRef, useState } from 'react';
import { BookOpen, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { CallScript } from './sellerApi';
import type { SellerCopy } from './sellerCopy';
import { scriptVariables } from './sellerModel';
export function SellerPrompter({ script, scripts, onSelect, copy: t, variables, pauseSignal }: {
  script: CallScript | null; scripts: CallScript[]; onSelect: (script: CallScript | null) => void; copy: SellerCopy; variables: Record<string,string>; pauseSignal: number;
}) {
  const [playing,setPlaying] = useState(false);
  const [speed,setSpeed] = useState(28);
  const [font,setFont] = useState(26);
  const [block,setBlock] = useState(0);
  const viewport=useRef<HTMLDivElement>(null);
  const blocks=useRef<(HTMLElement | null)[]>([]);
  useEffect(() => { setPlaying(false); }, [pauseSignal]);
  useEffect(() => { setPlaying(false); setBlock(0); if (viewport.current) viewport.current.scrollTop=0; }, [script?.id,script?.publishedVersion]);
  useEffect(() => {
    if (!playing) return;
    let frame=0; let previous=performance.now(); let position=viewport.current?.scrollTop ?? 0;
    const tick=(now:number) => {
      const element=viewport.current; if (!element) return;
      position += Math.min(now-previous,80)*speed/1000; element.scrollTop=position; previous=now;
      if (element.scrollTop + element.clientHeight >= element.scrollHeight-1) { setPlaying(false); return; }
      frame=requestAnimationFrame(tick);
    };
    const stop=() => setPlaying(false);
    frame=requestAnimationFrame(tick); window.addEventListener('blur',stop); document.addEventListener('visibilitychange',stop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('blur',stop); document.removeEventListener('visibilitychange',stop); };
  },[playing,speed]);
  const jump=(index:number) => { setPlaying(false); setBlock(index); const element=blocks.current[index]; if (element && viewport.current) viewport.current.scrollTop+=element.getBoundingClientRect().top - viewport.current.getBoundingClientRect().top; };
  const choices=scripts.filter(item => !item.archived && item.published);
  if (script && !choices.some(item => item.id===script.id)) choices.unshift(script);
  return <section className="flex h-full min-h-[420px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" aria-label={t.script}>
    <div className="shrink-0 space-y-3 border-b border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center gap-2 text-sm font-medium text-[#b63b32] dark:text-[#ff9c93]"><BookOpen className="h-4 w-4" />{t.script}{script ? <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">v{script.publishedVersion}</span> : null}</div>
      <Select value={script ? String(script.id) : '_none'} onValueChange={value => { setPlaying(false); onSelect(scripts.find(item => item.id===Number(value)) ?? null); }}><SelectTrigger aria-label={t.script}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="_none">{t.noScriptOption}</SelectItem>{choices.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.published?.name}</SelectItem>)}</SelectContent></Select>
      {script?.published?.goal ? <p className="text-sm text-slate-500 dark:text-slate-400">{script.published.goal}</p> : null}
      {script ? <div className="flex flex-wrap gap-1.5">{script.published!.blocks.map((item,index) => <button key={index} type="button" onClick={() => jump(index)} aria-pressed={index===block} className={'rounded-lg border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:ring-[#FF6B5E] ' + (index===block ? 'border-[#FF6B5E]/40 bg-[#FF6B5E]/10 text-[#b63b32] dark:text-[#ff9c93]' : 'border-slate-200 text-slate-500 dark:text-slate-400 dark:border-slate-700')}>{item.title}</button>)}</div> : null}
    </div>
    <div ref={viewport} onWheel={() => setPlaying(false)} onTouchStart={() => setPlaying(false)} tabIndex={0} aria-label={t.script} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
      {script?.published ? script.published.blocks.map((item,index) => <section key={index} ref={element => { blocks.current[index]=element; }} className="mb-10 last:mb-16"><p className="mb-3 text-xs font-medium text-[#b63b32] dark:text-[#ff9c93]">{index+1} · {item.title}</p><p style={{ fontSize: font, lineHeight: 1.65 }} className="whitespace-pre-wrap break-words font-medium text-slate-800 dark:text-slate-100">{scriptVariables(item.text,variables)}</p></section>) : <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center text-slate-500 dark:text-slate-400"><BookOpen className="h-10 w-10 text-[#FF6B5E]" /><p>{t.noScript}</p></div>}
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <Button variant="outline" disabled={!script} aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}{playing ? t.pause : t.play}</Button>
      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">{t.speed}<input aria-label={t.speed} type="range" min={10} max={80} step={2} value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="w-20 accent-[#FF6B5E]" /></label>
      <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">{t.font}<input aria-label={t.font} type="range" min={18} max={40} step={2} value={font} onChange={e=>setFont(Number(e.target.value))} className="w-20 accent-[#FF6B5E]" /></label>
      <div className="ml-auto flex gap-1"><Button variant="ghost" size="icon" aria-label={t.previous} disabled={!script || block===0} onClick={()=>jump(block-1)}><ChevronLeft /></Button><Button variant="ghost" size="icon" aria-label={t.next} disabled={!script || block>=script.published!.blocks.length-1} onClick={()=>jump(block+1)}><ChevronRight /></Button></div>
    </div>
  </section>;
}
