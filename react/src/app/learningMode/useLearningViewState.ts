import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedAuthSession } from '../api/authSessionStore';
import { workspaceStateApi } from '../api/workspaceState';
type Context<T> = {
    key: string;
    scope: string;
    valid: boolean;
    ready: boolean;
    dirty: boolean;
    value: T;
    pending: Array<(value: T) => T>;
    queue: Promise<unknown>;
};
const scope = () => { const s = getCachedAuthSession(); return s ? `${s.company.id}:${s.user.id}` : null; };
/** Presentation and learning exceptions only. This JSON is never evidence of Applied. */
export function useLearningViewState<T extends object>(tabKey: string, storageKey: string, initial: T, normalize: (value: unknown) => T) {
    const identity = scope();
    const key = `${identity}:${tabKey}`;
    const contextRef = useRef<Context<T> | null>(null);
    const [snapshot, setSnapshot] = useState<{
        key: string;
        value: T;
    } | null>(null);
    const [error, setError] = useState(false);
    const current = (ctx: Context<T>) => ctx.valid && contextRef.current === ctx && scope() === ctx.scope;
    const publish = useCallback((ctx: Context<T>) => {
        if (!current(ctx))
            return;
        setSnapshot({ key: ctx.key, value: ctx.value });
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(ctx.value));
        }
        catch { /* Remote preferences remain authoritative. */ }
    }, [storageKey]);
    useEffect(() => {
        setError(false);
        setSnapshot(null);
        if (!identity) {
            contextRef.current = null;
            return;
        }
        let local = initial;
        try {
            local = normalize(JSON.parse(window.localStorage.getItem(storageKey) ?? 'null'));
        }
        catch { /* No unscoped migration. */ }
        const ctx: Context<T> = { key, scope: identity, valid: true, ready: false, dirty: false, value: local, pending: [], queue: Promise.resolve() };
        contextRef.current = ctx;
        ctx.queue = workspaceStateApi.get('system', tabKey).then(async (remote) => {
            if (!current(ctx))
                return;
            const missing = Object.keys(remote.state).length === 0;
            let value = missing ? local : normalize(remote.state);
            for (const update of ctx.pending)
                value = update(value);
            ctx.value = value;
            ctx.ready = true;
            publish(ctx);
            if (missing || ctx.pending.length) {
                ctx.dirty = true;
                await workspaceStateApi.save('system', tabKey, value as Record<string, unknown>);
                ctx.dirty = false;
            }
            ctx.pending = [];
        }).catch(() => { if (current(ctx))
            setError(true); });
        return () => { ctx.valid = false; };
    }, [key, identity, tabKey, storageKey, initial, normalize, publish]);
    const update = useCallback((change: (value: T) => T) => {
        const ctx = contextRef.current;
        if (!ctx || !current(ctx))
            return;
        ctx.value = change(ctx.value);
        publish(ctx);
        if (!ctx.ready) {
            ctx.pending.push(change);
            return;
        }
        ctx.dirty = true;
        ctx.queue = ctx.queue.catch(() => undefined).then(async () => {
            if (!current(ctx))
                return;
            await workspaceStateApi.save('system', tabKey, ctx.value as Record<string, unknown>);
            if (current(ctx)) {
                ctx.dirty = false;
                setError(false);
            }
        }).catch(() => { if (current(ctx))
            setError(true); });
    }, [publish, tabKey]);
    const retry = useCallback(() => {
        const ctx = contextRef.current;
        if (!ctx || !current(ctx))
            return;
        ctx.queue = ctx.queue.catch(() => undefined).then(async () => {
            if (!current(ctx))
                return;
            if (!ctx.ready) {
                const remote = await workspaceStateApi.get('system', tabKey);
                if (!current(ctx))
                    return;
                const hasRemote = Object.keys(remote.state).length > 0;
                let value = hasRemote ? normalize(remote.state) : ctx.value;
                if (hasRemote)
                    for (const change of ctx.pending)
                        value = change(value);
                ctx.value = value;
                ctx.ready = true;
                ctx.dirty = true;
                ctx.pending = [];
                publish(ctx);
            }
            if (ctx.dirty) {
                await workspaceStateApi.save('system', tabKey, ctx.value as Record<string, unknown>);
                ctx.dirty = false;
            }
            if (current(ctx))
                setError(false);
        }).catch(() => { if (current(ctx))
            setError(true); });
    }, [normalize, publish, tabKey]);
    return { value: snapshot?.key === key ? snapshot.value : initial, update, error, retry };
}
