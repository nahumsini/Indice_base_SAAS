import { endpoints } from './endpoints';
import { apiClient } from '../lib/apiClient';
import { getCachedAuthSession } from './authSessionStore';

export type WorkspaceStateResponse<TState extends Record<string, unknown>> = {
  state: TState;
  schemaVersion: number;
  updatedAt?: string;
};

const pathFor = (moduleKey: string, tabKey: string) => (
  `${endpoints.workspaceState.base}/${encodeURIComponent(moduleKey)}/${encodeURIComponent(tabKey)}`
);

export const workspaceStateApi = {
  get<TState extends Record<string, unknown>>(moduleKey: string, tabKey: string) {
    return apiClient<WorkspaceStateResponse<TState>>(pathFor(moduleKey, tabKey), {headers:learningActorHeaders(moduleKey,tabKey)});
  },
  save<TState extends Record<string, unknown>>(moduleKey: string, tabKey: string, state: TState) {
    return apiClient<WorkspaceStateResponse<TState>>(pathFor(moduleKey, tabKey), {
      method: 'PUT',
      headers: learningActorHeaders(moduleKey,tabKey),
      body: JSON.stringify({ state, schemaVersion: 1 }),
    });
  },
  clear(moduleKey: string, tabKey: string) {
    return apiClient<{ success: boolean }>(pathFor(moduleKey, tabKey), { method: 'DELETE',headers:learningActorHeaders(moduleKey,tabKey) });
  },
};
function learningActorHeaders(moduleKey:string,tabKey:string):HeadersInit|undefined {
  if(moduleKey!=='system'||!tabKey.startsWith('learning-view-'))return undefined;
  const session=getCachedAuthSession();
  return {'X-Learning-Actor':session?`${session.company.id}:${session.user.id}`:''};
}
