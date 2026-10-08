import { useMemo } from 'react';
import {useLearningViewState} from './useLearningViewState';
import {useLearningProgress} from './useLearningProgress';
import {learningGuideModules} from './curriculum';
import { getCachedAuthSession } from '../api/authSessionStore';
import type { AuthSessionResponse } from '../api/auth.types';

const progressVersion = 1 as const;
const progressStoragePrefix = 'indice.learningMode.module';

type LearningProgressSessionScope = Pick<AuthSessionResponse, 'user' | 'company'>;

export interface ModuleLearningProgress {
  expanded: boolean;
  understoodJourneyIds: string[];
  version: typeof progressVersion;
}

export const defaultModuleLearningProgress: ModuleLearningProgress = {
  expanded: false,
  understoodJourneyIds: [],
  version: progressVersion,
};

export function normalizeModuleLearningProgress(value: unknown): ModuleLearningProgress {
  if (!value || typeof value !== 'object') {
    return { ...defaultModuleLearningProgress };
  }

  const candidate = value as Partial<ModuleLearningProgress>;
  return {
    expanded: candidate.expanded === true,
    understoodJourneyIds: Array.isArray(candidate.understoodJourneyIds)
      ? [...new Set(candidate.understoodJourneyIds.filter(
          (id): id is string => typeof id === 'string' && id.trim().length > 0,
        ))]
      : [],
    version: progressVersion,
  };
}

export function buildModuleLearningProgressKey(
  guideId: string,
  session: LearningProgressSessionScope,
) {
  return `${progressStoragePrefix}:${guideId}:company-${session.company.id}:user-${session.user.id}`;
}

export function getModuleLearningProgressStorageKey(guideId: string) {
  const session = getCachedAuthSession();
  return session
    ? buildModuleLearningProgressKey(guideId, session)
    : `${progressStoragePrefix}:${guideId}:unscoped`;
}


export function useModuleLearningProgress(guideId: string) {
  const storageKey = getModuleLearningProgressStorageKey(guideId);
  const view = useLearningViewState('learning-view-'+guideId, storageKey, defaultModuleLearningProgress, normalizeModuleLearningProgress);
  const remote = useLearningProgress();
  const module = learningGuideModules[guideId];
  const chapters = remote.progress?.chapters.filter(c=>c.module===module) ?? [];
  return useMemo(()=>({
    progress: {...view.value,
      understoodJourneyIds: chapters.filter(c=>c.understoodAt!==null).map(c=>c.tab),
      appliedJourneyIds: chapters.filter(c=>c.status==='applied').map(c=>c.tab)},
    markUnderstood:(journeyId:string)=>{if(module)void remote.update(module,journeyId,'understood');},
    setExpanded:(expanded:boolean)=>view.update(current=>({...current,expanded})),
    error:remote.error||view.error, ready:remote.ready,
    retry:()=>{remote.retry();view.retry();},
  }),[view.value,view.update,view.error,remote.progress,remote.error,remote.ready,remote.update,module]);
}
