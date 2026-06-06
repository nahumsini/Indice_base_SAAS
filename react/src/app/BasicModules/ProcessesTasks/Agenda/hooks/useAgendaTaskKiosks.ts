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

  const publicTaskKioskUrl = useCallback((kiosk: ProcessTaskKiosk) => {
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

  const handleSaveTaskKiosk = useCallback(
    async (payload: ProcessTaskKioskPayload, kioskId?: number) => {
      setIsTaskKioskSaving(true);
      setAgendaError(null);
      try {
        if (kioskId) {
          await processTaskKioskApi.updateKiosk(kioskId, payload);
        } else {
          await processTaskKioskApi.createKiosk(payload);
        }
        await loadTaskKiosks();
      } catch (error) {
        setAgendaError(getErrorMessage(error, 'Could not save task access point.'));
        throw error;
      } finally {
        setIsTaskKioskSaving(false);
      }
    },
    [loadTaskKiosks, setAgendaError],
  );

  const handleDeleteTaskKiosk = useCallback(
    async (kiosk: ProcessTaskKiosk) => {
      if (typeof window !== 'undefined' && !window.confirm(`Delete ${kiosk.name}?`)) {
        return;
      }
      setIsTaskKioskSaving(true);
      setAgendaError(null);
      try {
        await processTaskKioskApi.deleteKiosk(kiosk.id);
        await loadTaskKiosks();
      } catch (error) {
        setAgendaError(getErrorMessage(error, 'Could not delete task access point.'));
      } finally {
        setIsTaskKioskSaving(false);
      }
    },
    [loadTaskKiosks, setAgendaError],
  );

  const handleCopyTaskKiosk = useCallback(
    (kiosk: ProcessTaskKiosk) => {
      const url = publicTaskKioskUrl(kiosk);
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
      if (typeof window !== 'undefined') {
        window.open(publicTaskKioskUrl(kiosk), '_blank', 'noopener,noreferrer');
      }
    },
    [publicTaskKioskUrl],
  );

  return {
    handleCopyTaskKiosk,
    handleDeleteTaskKiosk,
    handleOpenTaskKiosk,
    handleOpenTaskKiosks,
    handleSaveTaskKiosk,
    isTaskKioskModalOpen,
    isTaskKioskSaving,
    setIsTaskKioskModalOpen,
    taskKiosks,
  };
}
