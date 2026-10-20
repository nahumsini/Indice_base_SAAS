import type { AuthSessionResponse } from '../../api/auth.types';

export type WorkbarPosition = 'top' | 'left';
export type WorkbarLayoutState = { dualScreenEnabled: boolean; position: WorkbarPosition };
export type WorkbarPreferences = WorkbarLayoutState & { version: 1 };
export const WORKBAR_MODULE_KEY = 'system';
export const WORKBAR_TAB_KEY = 'workbar-layout';
export const WORKBAR_DEFAULTS: WorkbarPreferences = { version: 1, dualScreenEnabled: false, position: 'top' };
export const workbarPreferenceActor = (session: AuthSessionResponse | null | undefined) => session
  ? `${session.company.id}:${session.user.id}` : null;
export const workbarCacheKey = (actor: string) => `indice:workspace:${actor}:${WORKBAR_MODULE_KEY}:${WORKBAR_TAB_KEY}`;
export function isWorkbarPosition(value: unknown): value is WorkbarPosition {
  return value === 'top' || value === 'left';
}
export function parseWorkbarPreferences(value: unknown): WorkbarPreferences | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const state = value as Record<string, unknown>;
  if ((state.version !== undefined && state.version !== 1) || !isWorkbarPosition(state.position)
    || typeof state.dualScreenEnabled !== 'boolean') return null;
  return { version: 1, position: state.position, dualScreenEnabled: state.dualScreenEnabled };
}
export function readWorkbarCache(actor: string): WorkbarPreferences | null {
  try {
    const envelope = JSON.parse(window.localStorage.getItem(workbarCacheKey(actor)) ?? 'null');
    return parseWorkbarPreferences(envelope?.partial
      ? { ...WORKBAR_DEFAULTS, ...envelope.state } : envelope?.state);
  } catch { return null; }
}
export function cacheWorkbarPreferences(actor: string, preferences: WorkbarPreferences) {
  try {
    window.localStorage.setItem(workbarCacheKey(actor), JSON.stringify({ state: preferences, savedAt: new Date().toISOString() }));
  } catch { /* The account preference is already durable on the server. */ }
}
