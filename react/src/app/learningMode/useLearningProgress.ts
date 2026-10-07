import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { getCachedAuthSession } from '../api/authSessionStore';
import { learningApi } from '../api/learning';
import { useLanguage } from '../shared/context';
import { chapterFor } from './curriculum';
import { LearningProgressStore } from './learningProgressStore';
const scope = () => { const s = getCachedAuthSession(); return s ? `${s.company.id}:${s.user.id}` : null; };
const store = new LearningProgressStore(learningApi, scope);
export function useLearningProgress(enabled = true) {
    const { currentLanguage } = useLanguage();
    const locale = currentLanguage.code.toLowerCase().startsWith('es') ? 'es-MX' : 'en-CA';
    const key = scope();
    const subscribe = useCallback((fn: () => void) => store.subscribe(locale, fn), [key, locale]);
    const state = useSyncExternalStore(subscribe, () => store.snapshot(locale), () => store.snapshot(locale));
    useEffect(() => {
        if (!key || !enabled)
            return;
        void store.refresh(locale);
        const onFocus = () => void store.refresh(locale);
        window.addEventListener('focus', onFocus);
        const timer = window.setInterval(onFocus, 30000);
        return () => { window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
    }, [key, locale, enabled]);
    const update = useCallback(async (module: string, tab: string, operation: 'start' | 'understood') => {
        if (key !== scope())
            return;
        const chapter = chapterFor(module, tab);
        if (chapter)
            await store.update({ chapterId: chapter.id, version: chapter.version, operation }, locale);
    }, [key, locale]);
    return { ...state, refresh: () => void store.refresh(locale), retry: () => void store.retry(locale), update };
}
