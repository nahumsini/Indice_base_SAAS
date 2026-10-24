import { endpoints } from './endpoints';
import { apiClient } from '../lib/apiClient';
import { getCachedAuthSession } from './authSessionStore';

export type WorkspaceStateResponse<TState extends Record<string, unknown>> = {
  state: TState;
  schemaVersion: number;
  updatedAt?: string;
  expiresAt?: string | null;
};

const pathFor = (moduleKey: string, tabKey: string) => (
  `${endpoints.workspaceState.base}/${encodeURIComponent(moduleKey)}/${encodeURIComponent(tabKey)}`
);

export const workspaceStateApi = {
  get<TState extends Record<string, unknown>>(moduleKey: string, tabKey: string) {
    return apiClient<WorkspaceStateResponse<TState>>(pathFor(moduleKey, tabKey), {headers:workspaceActorHeaders(moduleKey,tabKey)});
  },
  save<TState extends Record<string, unknown>>(moduleKey: string, tabKey: string, state: TState) {
    return apiClient<WorkspaceStateResponse<TState>>(pathFor(moduleKey, tabKey), {
      method: 'PUT',
      headers: workspaceActorHeaders(moduleKey,tabKey),
      body: JSON.stringify({ state, schemaVersion: 1 }),
    });
  },
  clear(moduleKey: string, tabKey: string) {
    return apiClient<{ success: boolean }>(pathFor(moduleKey, tabKey), { method: 'DELETE',headers:workspaceActorHeaders(moduleKey,tabKey) });
  },
};
function workspaceActorHeaders(moduleKey:string,tabKey:string):HeadersInit|undefined {
  if(moduleKey==='sales'&&tabKey.startsWith('opportunity-colors-') || moduleKey==='system'&&(tabKey==='business-currency'||tabKey==='workbar-layout')) {
    const session=getCachedAuthSession();
    return {'X-Workspace-Actor':session?`${session.company.id}:${session.user.id}`:''};
  }
  if(moduleKey!=='system'||!tabKey.startsWith('learning-view-'))return undefined;
  const session=getCachedAuthSession();
  return {'X-Learning-Actor':session?`${session.company.id}:${session.user.id}`:''};
}
