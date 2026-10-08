import { apiClient } from '../lib/apiClient';
import { getCachedAuthSession } from './authSessionStore';
export interface LearningChapterProgress {
    chapterId: string;
    version: number;
    stage: number;
    module: string;
    tab: string;
    pageId: string;
    label: string;
    status: 'pending' | 'understood' | 'applied';
    understoodAt: string | null;
    appliedAt: string | null;
    journey: boolean;
    companion: boolean;
    steps: Array<{
        id: string;
        title: string;
        description: string;
    }>;
}
export interface LearningProgressSnapshot {
    catalogVersion: string;
    currentChapterId: string | null;
    stages: Array<{
        stage: number;
        total: number;
        understood: number;
        applied: number;
    }>;
    chapters: LearningChapterProgress[];
    nextMission: LearningChapterProgress | null;
}
export const learningApi = {
    get(locale: string) { return apiClient<LearningProgressSnapshot>(`/api/v1/learning/progress?locale=${encodeURIComponent(locale)}`, { headers: actorHeaders() }); },
    update(chapterId: string, version: number, operation: 'start' | 'understood', locale: string) {
        return apiClient<LearningProgressSnapshot>(`/api/v1/learning/progress?locale=${encodeURIComponent(locale)}`, { method: 'POST', headers: actorHeaders(), body: JSON.stringify({ chapterId, version, operation }) });
    },
};
function actorHeaders() { const s = getCachedAuthSession(); return { 'X-Learning-Actor': s ? `${s.company.id}:${s.user.id}` : '' }; }
