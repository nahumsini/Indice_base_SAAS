import { sameBoardIdeas } from './ideasBoardModel';
import type { BoardContent, BoardInput, SavedBoard } from './ideasBoardModel';
export type BoardSaveState = 'saved' | 'saving' | 'error' | 'conflict';
type BoardRecovery = { content: BoardContent; latest: () => Promise<SavedBoard>; sameIdeas?: (a: BoardContent,b: BoardContent) => boolean };
// One in-flight mutation, with a stable identity for uncertain retries and the latest queued edit.
export class BoardSaveQueue {
  private pending: BoardContent | null = null;
  private failed: BoardInput | null = null;
  private running = false;
  private blocked = false;
  private state: BoardSaveState = 'saved';
  private acknowledged: BoardContent | null;
  constructor(private version: number, private actorKey: string, private save: (input: BoardInput, actorKey: string) => Promise<SavedBoard>, private changed: (state: BoardSaveState) => void, private recovery?: BoardRecovery) { this.acknowledged = recovery ? structuredClone(recovery.content) : null; }
  enqueue(content: BoardContent) { this.pending = structuredClone(content); if (!this.blocked) void this.drain(); }
  dirty() { return this.running || !!this.pending || !!this.failed; }
  retry() { if (this.state === 'conflict') return; this.blocked = false; void this.drain(); }
  private publish(state: BoardSaveState) { this.state = state; this.changed(state); }
  private async persist(request: BoardInput): Promise<SavedBoard> {
    try { return await this.save(request, this.actorKey); }
    catch (error) {
      if ((error as { status?: number }).status !== 409 || !this.recovery || !this.acknowledged) throw error;
      let latest: SavedBoard; try { latest = await this.recovery.latest(); } catch { throw error; }
      if (latest.actorKey !== this.actorKey || latest.version <= request.version || (!(this.recovery.sameIdeas ?? sameBoardIdeas)(latest.content, this.acknowledged) && !(this.recovery.sameIdeas ?? sameBoardIdeas)(latest.content, request.content))) throw error;
      // Recheck the server's current version once. A second conflict is never forced through.
      const rebased = { ...request, version: latest.version, mutationId: crypto.randomUUID() };
      this.failed = rebased;
      return this.save(rebased, this.actorKey);
    }
  }
  private async drain() {
    if (this.running || this.blocked) return;
    this.running = true;
    while (this.failed || this.pending) {
      const request = this.failed ?? { content: this.pending!, version: this.version, mutationId: crypto.randomUUID() };
      if (!this.failed) this.pending = null;
      this.failed = request; this.publish('saving');
      try { const saved = await this.persist(request); this.version = saved.version; this.acknowledged = structuredClone(saved.content ?? request.content); this.failed = null; }
      catch (error) { this.blocked = true; this.publish((error as { status?: number }).status === 409 ? 'conflict' : 'error'); break; }
    }
    this.running = false;
    if (!this.blocked) this.publish('saved');
  }
}
