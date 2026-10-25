import { useEffect, useRef, useState } from 'react';
import { ideasBoardApi, type IdeasBoardApi } from './ideasBoardApi';
import { BoardSaveQueue, type BoardSaveState } from './boardSaveQueue';
import type {BoardDocumentView} from './boardFileTools';
import { emptyBoard, record, sameBoardIdeas, stepHistory, type BoardContent, type BoardHistory, type SavedBoard } from './ideasBoardModel';
export function useIdeasBoard(api: IdeasBoardApi = ideasBoardApi, compareIdeas = sameBoardIdeas, view?:BoardDocumentView) {
  const [history, setHistory] = useState<BoardHistory>({ past: [], current: emptyBoard(), future: [] });
  const historyRef = useRef(history), queue = useRef<BoardSaveQueue | null>(null), actor = useRef(''), mounted = useRef(true);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false), [state, setState] = useState<BoardSaveState>('saved');
  const [reload, setReload] = useState(0);
  const resetRequested = useRef(false), checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const viewHistories=useRef(new Map<string,BoardHistory>());
  function visibleHistory():BoardHistory {
    if(!view)return historyRef.current;
    const current=view.select(historyRef.current.current),previous=viewHistories.current.get(view.key);
    if(previous&&JSON.stringify(previous.current)===JSON.stringify(current))return previous;
    const next={past:[],current,future:[]};viewHistories.current.set(view.key,next);return next;
  }
  function ownQueue(saved: SavedBoard) {
    actor.current = saved.actorKey;
    const ownedQueue: BoardSaveQueue = new BoardSaveQueue(saved.version, saved.actorKey, api.save, state => { if (mounted.current && queue.current === ownedQueue) setState(state); }, { content: saved.content, latest: () => api.get(), sameIdeas: compareIdeas });
    queue.current = ownedQueue;
  }
  useEffect(() => {
    mounted.current = true;
    // Effect replay during a local UI refresh must not replace an unsaved board.
    if (queue.current?.dirty() && !resetRequested.current) return () => { mounted.current = false; };
    resetRequested.current = false;
    const controller = new AbortController(); setLoading(true); setLoadError(false);
    api.get(controller.signal).then(saved => {
      if (controller.signal.aborted) return;
      ownQueue(saved);viewHistories.current.clear();
      const value = { past: [], current: saved.content, future: [] }; historyRef.current = value; setHistory(value); setState('saved');
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mounted.current = false; };
  }, [reload, api, compareIdeas]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (queue.current?.dirty()) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, []);
  function persist(next:BoardContent) {
    const value=record(historyRef.current,next);if(value===historyRef.current)return;
    historyRef.current=value;setHistory(value);queue.current?.enqueue(next);
  }
  function commit(next: BoardContent) {
    if(!queue.current)return false;
    const merged=view?view.merge(historyRef.current.current,next):next;if(!merged)return false;
    if(view)viewHistories.current.set(view.key,record(visibleHistory(),view.select(merged)));
    persist(merged);return true;
  }
  function travel(direction: 'undo' | 'redo') {
    const previous=visibleHistory(),value=stepHistory(previous,direction);if(value===previous)return;
    if(!view){historyRef.current=value;setHistory(value);queue.current?.enqueue(value.current);return;}
    const merged=view.merge(historyRef.current.current,value.current);if(!merged)return;
    viewHistories.current.set(view.key,value);persist(merged);
  }
  async function retry() {
    if (state !== 'conflict') { queue.current?.retry(); return; }
    if (checkingRef.current) return;
    const previous = queue.current, snapshot = historyRef.current.current;
    checkingRef.current = true; setChecking(true);
    try {
      const latest = await api.get();
      if (!mounted.current || queue.current !== previous || historyRef.current.current !== snapshot || latest.actorKey !== actor.current || !compareIdeas(latest.content, snapshot)) return;
      // Already-saved ideas can resume with this window's camera; different ideas stay protected.
      ownQueue(latest); setState('saved');
      if (JSON.stringify(latest.content.viewport) !== JSON.stringify(snapshot.viewport)) queue.current?.enqueue(snapshot);
    } catch { /* Keep the conflict and the full local draft; no overwrite is attempted. */ }
    finally { checkingRef.current = false; if (mounted.current) setChecking(false); }
  }
  const presentedHistory=view?visibleHistory():history;
  return { content: presentedHistory.current, history:presentedHistory, captureContent:()=>view?view.select(historyRef.current.current):historyRef.current.current, loading, loadError, state, actor, commit, travel, checking, retry, reload: () => { resetRequested.current = true; setReload(v => v + 1); } };
}
