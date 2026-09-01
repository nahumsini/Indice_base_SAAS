import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  aiConnectionsApi,
  type AiConnection,
  type AiConnectionActivity,
  type IssuedAiConnection,
} from '../../../../api/aiConnections';
import type { IntegrationsTranslations } from '../translations';
import { getConnectionStatus } from '../utils';

export type CreateAiConnectionPayload = {
  label: string;
  expiresInDays: number;
  scopes: string[];
};

export type AiConnectionsWorkspaceState = ReturnType<typeof useAiConnections>;

export function useAiConnections(copy: IntegrationsTranslations) {
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activity, setActivity] = useState<AiConnectionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');

  const selectedConnection = useMemo(
    () => connections.find((connection) => connection.id === selectedId) ?? connections[0] ?? null,
    [connections, selectedId],
  );

  const messageForError = useCallback((_failure?: unknown) => copy.common.genericError, [copy.common.genericError]);

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await aiConnectionsApi.list();
      setConnections(response.connections);
      setSelectedId((current) => (
        response.connections.some((connection) => connection.id === current)
          ? current
          : response.connections[0]?.id ?? null
      ));
    } catch (failure) {
      setError(messageForError(failure));
    } finally {
      setIsLoading(false);
    }
  }, [messageForError]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (!selectedConnection) {
      setActivity([]);
      return;
    }
    let active = true;
    setIsActivityLoading(true);
    setActivityError('');
    aiConnectionsApi.activity(selectedConnection.id)
      .then((response) => {
        if (active) setActivity(response.events);
      })
      .catch((failure) => {
        if (active) setActivityError(messageForError(failure));
      })
      .finally(() => {
        if (active) setIsActivityLoading(false);
      });
    return () => { active = false; };
  }, [messageForError, selectedConnection]);

  const createConnection = async (payload: CreateAiConnectionPayload): Promise<IssuedAiConnection | null> => {
    setIsCreating(true);
    setError('');
    try {
      const created = await aiConnectionsApi.create(payload);
      setConnections((current) => [created, ...current]);
      setSelectedId(created.id);
      return created;
    } catch (failure) {
      setError(messageForError(failure));
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const revokeConnection = async (connection: AiConnection) => {
    setRevokingId(connection.id);
    setError('');
    try {
      await aiConnectionsApi.revoke(connection.id);
      await loadConnections();
      return true;
    } catch (failure) {
      setError(messageForError(failure));
      return false;
    } finally {
      setRevokingId(null);
    }
  };

  const activeCount = connections.filter((connection) => getConnectionStatus(connection) === 'active').length;

  return {
    activeCount,
    activity,
    activityError,
    connections,
    createConnection,
    error,
    isActivityLoading,
    isCreating,
    isLoading,
    loadConnections,
    revokeConnection,
    revokingId,
    selectedConnection,
    selectedId,
    setError,
    setSelectedId,
  };
}
