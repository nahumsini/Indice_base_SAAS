import type { LearningProgressSnapshot } from '../api/learning';
export type LearningState = {
    progress: LearningProgressSnapshot | null;
    error: boolean;
    ready: boolean;
};
type Change = {
    chapterId: string;
    version: number;
    operation: 'start' | 'understood';
};
type Transport = {
    get(locale: string): Promise<LearningProgressSnapshot>;
    update(chapterId: string, version: number, operation: 'start' | 'understood', locale: string): Promise<LearningProgressSnapshot>;
};
type Entry = {
    key: string;
    locale: string;
    state: LearningState;
    listeners: Set<() => void>;
    request: number;
    loading: boolean;
    writes: number;
    queue: Promise<unknown>;
    failed: Map<string, Change>;
};
const empty: LearningState = { progress: null, error: false, ready: false };
/** Own-user transport cache. Authoritative progress and permission checks remain on the server. */
export class LearningProgressStore {
    private entries = new Map<string, Entry>();
    private api: Transport;
    private scope: () => string | null;
    constructor(api: Transport, scope: () => string | null) { this.api = api; this.scope = scope; }
    private entry(locale: string) {
        const key = `${this.scope()}:${locale}`;
        let e = this.entries.get(key);
        if (!e) {
            e = { key, locale, state: empty, listeners: new Set(), request: 0, loading: false, writes: 0, queue: Promise.resolve(), failed: new Map() };
            this.entries.set(key, e);
        }
        return e;
    }
    private current(e: Entry) { return this.scope() !== null && e.key === `${this.scope()}:${e.locale}` && this.entries.get(e.key) === e; }
    private publish(e: Entry, state: LearningState) { if (!this.current(e))
        return; e.state = state; e.listeners.forEach(fn => fn()); }
    snapshot(locale: string) { return this.entry(locale).state; }
    subscribe(locale: string, listener: () => void) {
        const e = this.entry(locale);
        e.listeners.add(listener);
        for (const [key] of this.entries)
            if (!key.startsWith(`${this.scope()}:`))
                this.entries.delete(key);
        return () => { e.listeners.delete(listener); };
    }
    async refresh(locale: string) {
        const e = this.entry(locale);
        if (!this.current(e) || e.loading || e.writes)
            return;
        e.loading = true;
        const request = ++e.request;
        try {
            const progress = await this.api.get(locale);
            if (request === e.request)
                this.publish(e, { progress, error: e.failed.size > 0, ready: true });
        }
        catch {
            if (request === e.request)
                this.publish(e, { ...e.state, error: true });
        }
        finally {
            e.loading = false;
        }
    }
    async update(change: Change, locale: string) {
        const e = this.entry(locale);
        if (!this.current(e))
            return;
        ++e.request;
        ++e.writes;
        e.queue = e.queue.catch(() => undefined).then(async () => {
            if (!this.current(e))
                return;
            const changeKey = `${change.chapterId}:${change.operation}`;
            try {
                const progress = await this.api.update(change.chapterId, change.version, change.operation, locale);
                e.failed.delete(changeKey);
                this.publish(e, { progress, error: e.failed.size > 0, ready: true });
            }
            catch {
                e.failed.set(changeKey, change);
                this.publish(e, { ...e.state, error: true });
            }
        }).finally(() => { e.writes--; });
        await e.queue;
    }
    async retry(locale: string) { const e = this.entry(locale); if (e.failed.size)
        for (const change of [...e.failed.values()]) {
            if (!this.current(e))
                return;
            await this.update(change, locale);
        }
    else
        await this.refresh(locale); }
}
