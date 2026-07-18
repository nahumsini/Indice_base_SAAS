import { useCallback, useState } from 'react';
import {
  processTaskKioskApi,
  type ProcessTaskKiosk,
  type ProcessTaskKioskPayload,
} from '../../Kiosk/processTaskKioskApi';
import { getErrorMessage } from '../utils/agendaTaskStatus';

type UseAgendaTaskKiosksOptions = {
  setAgendaError: (message: string | null) => void;
};

export function useAgendaTaskKiosks({ setAgendaError }: UseAgendaTaskKiosksOptions) {
  const [isTaskKioskModalOpen, setIsTaskKioskModalOpen] = useState(false);
  const [isTaskKioskSaving, setIsTaskKioskSaving] = useState(false);
  const [taskKiosks, setTaskKiosks] = useState<ProcessTaskKiosk[]>([]);
  const [taskKioskPendingDeletion, setTaskKioskPendingDeletion] = useState<ProcessTaskKiosk | null>(null);
  const [taskKioskPendingTransition, setTaskKioskPendingTransition] = useState<{
    kiosk: ProcessTaskKiosk;
    transition: 'disable' | 'revoke' | 'rotate';
  } | null>(null);

  const publicTaskKioskUrl = useCallback((kiosk: ProcessTaskKiosk) => {
    if (!kiosk.public_access_token) {
      throw new Error('La liga no se conserva por seguridad. Rótala para emitir una nueva.');
    }
    if (typeof window === 'undefined') {
      return `/task-kiosk/${kiosk.public_access_token}`;
    }
    return `${window.location.origin}/task-kiosk/${kiosk.public_access_token}`;
  }, []);

  const loadTaskKiosks = useCallback(async () => {
    try {
      const response = await processTaskKioskApi.listKiosks();
      setTaskKiosks(response.items);
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'Could not load task access points.'));
    }
  }, [setAgendaError]);

  const handleOpenTaskKiosks = useCallback(() => {
    setIsTaskKioskModalOpen(true);
    void loadTaskKiosks();
  }, [loadTaskKiosks]);

  const handleCloseTaskKiosks = useCallback(() => {
    setIsTaskKioskModalOpen(false);
    setTaskKiosks((current) => current.map((kiosk) => ({
      ...kiosk,
      public_access_token: '',
      issued_public_token: undefined,
      token_display_once: false,
    })));
  }, []);

  const handleSaveTaskKiosk = useCallback(
    async (payload: ProcessTaskKioskPayload, kioskId?: number) => {
      setIsTaskKioskSaving(true);
      setAgendaError(null);
      try {
        if (kioskId) {
          await processTaskKioskApi.updateKiosk(kioskId, payload);
          await loadTaskKiosks();
        } else {
          const response = await processTaskKioskApi.createKiosk(payload);
          setTaskKiosks((current) => [response.kiosk, ...current.filter((item) => item.id !== response.kiosk.id)]);
        }
      } catch (error) {
        setAgendaError(getErrorMessage(error, 'Could not save task access point.'));
        throw error;
      } finally {
        setIsTaskKioskSaving(false);
      }
    },
    [loadTaskKiosks, setAgendaError],
  );

  const handleDeleteTaskKiosk = useCallback((kiosk: ProcessTaskKiosk) => {
    setAgendaError(null);
    setIsTaskKioskModalOpen(false);
    setTaskKioskPendingDeletion(kiosk);
  }, [setAgendaError]);

  const handleCancelDeleteTaskKiosk = useCallback(() => {
    if (isTaskKioskSaving) {
      return;
    }

    setTaskKioskPendingDeletion(null);
    setIsTaskKioskModalOpen(true);
  }, [isTaskKioskSaving]);

  const handleConfirmDeleteTaskKiosk = useCallback(
    async () => {
      const kiosk = taskKioskPendingDeletion;
      if (!kiosk) {
        return;
      }

      setIsTaskKioskSaving(true);
      setAgendaError(null);
      try {
        await processTaskKioskApi.deleteKiosk(kiosk.id);
        await loadTaskKiosks();
        setTaskKioskPendingDeletion(null);
        setIsTaskKioskModalOpen(true);
      } catch (error) {
        setAgendaError(getErrorMessage(error, 'Could not delete task access point.'));
      } finally {
        setIsTaskKioskSaving(false);
      }
    },
    [loadTaskKiosks, setAgendaError, taskKioskPendingDeletion],
  );

  const handleCopyTaskKiosk = useCallback(
    (kiosk: ProcessTaskKiosk) => {
      let url: string;
      try {
        url = publicTaskKioskUrl(kiosk);
      } catch (error) {
        setAgendaError(getErrorMessage(error, 'La liga debe rotarse antes de copiarla.'));
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(url);
        return;
      }
      setAgendaError(url);
    },
    [publicTaskKioskUrl, setAgendaError],
  );

  const handleOpenTaskKiosk = useCallback(
    (kiosk: ProcessTaskKiosk) => {
      if (!kiosk.public_access_token) {
        setAgendaError('La liga debe rotarse antes de abrirla.');
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(publicTaskKioskUrl(kiosk), '_blank', 'noopener,noreferrer');
      }
    },
    [publicTaskKioskUrl, setAgendaError],
  );

  const handleRotateTaskKiosk = useCallback((kiosk: ProcessTaskKiosk) => {
    setAgendaError(null);
    setIsTaskKioskModalOpen(false);
    setTaskKioskPendingTransition({ kiosk, transition: 'rotate' });
  }, [setAgendaError]);

  const handleTransitionTaskKiosk = useCallback(async (
    kiosk: ProcessTaskKiosk,
    transition: 'disable' | 'enable' | 'revoke',
  ) => {
    if (transition !== 'enable') {
      setAgendaError(null);
      setIsTaskKioskModalOpen(false);
      setTaskKioskPendingTransition({ kiosk, transition });
      return;
    }
    setIsTaskKioskSaving(true);
    setAgendaError(null);
    try {
      await processTaskKioskApi.transitionKiosk(kiosk.id, transition);
      await loadTaskKiosks();
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'No fue posible cambiar el estado del kiosko.'));
    } finally {
      setIsTaskKioskSaving(false);
    }
  }, [loadTaskKiosks, setAgendaError]);

  const handleCancelTaskKioskTransition = useCallback(() => {
    if (!isTaskKioskSaving) {
      setTaskKioskPendingTransition(null);
      setIsTaskKioskModalOpen(true);
    }
  }, [isTaskKioskSaving]);

  const handleConfirmTaskKioskTransition = useCallback(async () => {
    if (!taskKioskPendingTransition) return;
    setIsTaskKioskSaving(true);
    setAgendaError(null);
    try {
      if (taskKioskPendingTransition.transition === 'rotate') {
        const response = await processTaskKioskApi.rotateToken(taskKioskPendingTransition.kiosk.id);
        setTaskKiosks((current) => current.map((item) =>
          item.id === taskKioskPendingTransition.kiosk.id ? response.kiosk : item));
        setTaskKioskPendingTransition(null);
        setIsTaskKioskModalOpen(true);
        return;
      }
      await processTaskKioskApi.transitionKiosk(
        taskKioskPendingTransition.kiosk.id,
        taskKioskPendingTransition.transition,
      );
      await loadTaskKiosks();
      setTaskKioskPendingTransition(null);
      setIsTaskKioskModalOpen(true);
    } catch (error) {
      setAgendaError(getErrorMessage(error, 'No fue posible cambiar el estado del kiosko.'));
    } finally {
      setIsTaskKioskSaving(false);
    }
  }, [loadTaskKiosks, setAgendaError, taskKioskPendingTransition]);

  return {
    handleCancelDeleteTaskKiosk,
    handleCancelTaskKioskTransition,
    handleConfirmDeleteTaskKiosk,
    handleConfirmTaskKioskTransition,
    handleCopyTaskKiosk,
    handleCloseTaskKiosks,
    handleDeleteTaskKiosk,
    handleOpenTaskKiosk,
    handleRotateTaskKiosk,
    handleOpenTaskKiosks,
    handleSaveTaskKiosk,
    handleTransitionTaskKiosk,
    isTaskKioskModalOpen,
    isTaskKioskSaving,
    taskKioskPendingDeletion,
    taskKioskPendingTransition,
    taskKiosks,
  };
}
