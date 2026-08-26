import { useSyncExternalStore } from 'react';
import {
  getAuthorizationRevision,
  subscribeToAuthorizationChanged,
} from '../api/authSessionStore';

/**
 * Re-renders authorization-sensitive UI when the server session snapshot
 * changes role, company, module assignments, tab permissions, or lifecycle.
 */
export function useAuthorizationRevision() {
  return useSyncExternalStore(
    subscribeToAuthorizationChanged,
    getAuthorizationRevision,
    getAuthorizationRevision,
  );
}
