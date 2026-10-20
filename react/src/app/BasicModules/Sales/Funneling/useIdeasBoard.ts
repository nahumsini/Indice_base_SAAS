import { useEffect, useRef, useState } from 'react';
import { ideasBoardApi } from './ideasBoardApi';
import { BoardSaveQueue, type BoardSaveState } from './boardSaveQueue';
import { emptyBoard, record, sameBoardIdeas, stepHistory, type BoardContent, type BoardHistory, type SavedBoard } from './ideasBoardModel';
export function useIdeasBoard() {
  const [history, setHistory] = useState<BoardHistory>({ past: [], current: emptyBoard(), future: [] });
  const historyRef = useRef(history), queue = useRef<BoardSaveQueue | null>(null), actor = useRef(''), mounted = useRef(true);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false), [state, setState] = useState<BoardSaveState>('saved');
  const [reload, setReload] = useState(0);
  const resetRequested = useRef(false), checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  function ownQueue(saved: SavedBoard) {
    actor.current = saved.actorKey;
    const ownedQueue: BoardSaveQueue = new BoardSaveQueue(saved.version, saved.actorKey, ideasBoardApi.save, state => { if (mounted.current && queue.current === ownedQueue) setState(state); }, { content: saved.content, latest: () => ideasBoardApi.get() });
    queue.current = ownedQueue;
  }
  useEffect(() => {
    mounted.current = true;
    // Effect replay during a local UI refresh must not replace an unsaved board.
    if (queue.current?.dirty() && !resetRequested.current) return () => { mounted.current = false; };
    resetRequested.current = false;
    const controller = new AbortController(); setLoading(true); setLoadError(false);
    ideasBoardApi.get(controller.signal).then(saved => {
      if (controller.signal.aborted) return;
      ownQueue(saved);
      const value = { past: [], current: saved.content, future: [] }; historyRef.current = value; setHistory(value); setState('saved');
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mounted.current = false; };
  }, [reload]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (queue.current?.dirty()) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, []);
  function commit(next: BoardContent) { if (!queue.current) return; const value = record(historyRef.current, next); if (value === historyRef.current) return; historyRef.current = value; setHistory(value); queue.current.enqueue(next); }
  function travel(direction: 'undo' | 'redo') { const value = stepHistory(historyRef.current, direction); if (value === historyRef.current) return; historyRef.current = value; setHistory(value); queue.current?.enqueue(value.current); }
  async function retry() {
    if (state !== 'conflict') { queue.current?.retry(); return; }
    if (checkingRef.current) return;
    const previous = queue.current, snapshot = historyRef.current.current;
    checkingRef.current = true; setChecking(true);
    try {
      const latest = await ideasBoardApi.get();
      if (!mounted.current || queue.current !== previous || historyRef.current.current !== snapshot || latest.actorKey !== actor.current || !sameBoardIdeas(latest.content, snapshot)) return;
      // Already-saved ideas can resume with this window's camera; different ideas stay protected.
      ownQueue(latest); setState('saved');
      if (JSON.stringify(latest.content.viewport) !== JSON.stringify(snapshot.viewport)) queue.current?.enqueue(snapshot);
    } catch { /* Keep the conflict and the full local draft; no overwrite is attempted. */ }
    finally { checkingRef.current = false; if (mounted.current) setChecking(false); }
  }
  return { content: history.current, history, loading, loadError, state, actor, commit, travel, checking, retry, reload: () => { resetRequested.current = true; setReload(v => v + 1); } };
}
