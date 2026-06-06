import { useCallback, useState } from 'react';
import { auditProcessTask, completeProcessTask } from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import {
  clampPercent,
  getErrorMessage,
  maximumAuditWeighting,
  normalizeWeighting,
} from '../utils/agendaTaskStatus';

type UseAgendaTaskCompletionAuditOptions = {
  agendaCopy: AgendaTranslations;
  loadAgenda: () => Promise<void>;
  patchTaskInAgenda: (taskId: number, patch: Partial<AgendaTaskItem>) => void;
  setAgendaError: (message: string | null) => void;
  setTaskPendingState: (taskId: number, isPending: boolean) => void;
};

export function useAgendaTaskCompletionAudit({
  agendaCopy,
  loadAgenda,
  patchTaskInAgenda,
  setAgendaError,
  setTaskPendingState,
}: UseAgendaTaskCompletionAuditOptions) {
  const [completionTask, setCompletionTask] = useState<AgendaTaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPercent, setCompletionPercent] = useState('100');
  const [auditTask, setAuditTask] = useState<AgendaTaskItem | null>(null);
  const [auditWeighting, setAuditWeighting] = useState(String(maximumAuditWeighting));
  const [auditNotes, setAuditNotes] = useState('');

  const handleCloseTask = useCallback((task: AgendaTaskItem) => {
    setCompletionTask(task);
    setCompletionNotes(task.completionNotes ?? '');
    setCompletionPercent(String(task.completionPercent > 0 ? task.completionPercent : 100));
  }, []);

  const handleCompletionDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCompletionTask(null);
      setCompletionNotes('');
      setCompletionPercent('100');
    }
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!completionTask) {
      return;
    }

    const parsedCompletion = Number(completionPercent || 100);
    if (!Number.isInteger(parsedCompletion) || parsedCompletion < 0 || parsedCompletion > 100) {
      setAgendaError(agendaCopy.messages.invalidCompletion);
      return;
    }

    setTaskPendingState(completionTask.taskId, true);
    setAgendaError(null);

    try {
      await completeProcessTask(completionTask.taskId, completionNotes, parsedCompletion);
      patchTaskInAgenda(completionTask.taskId, {
        status: 'completed',
        completionPercent: parsedCompletion,
        completion: parsedCompletion,
        completionNotes: completionNotes.trim() ? completionNotes.trim() : null,
        audited: false,
        auditNotes: null,
        auditStatus: 'pending',
        isOverdue: false,
      });
      handleCompletionDialogOpenChange(false);
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.closeTask));
    } finally {
      setTaskPendingState(completionTask.taskId, false);
    }
  }, [
    agendaCopy.messages.closeTask,
    agendaCopy.messages.invalidCompletion,
    completionNotes,
    completionPercent,
    completionTask,
    handleCompletionDialogOpenChange,
    loadAgenda,
    patchTaskInAgenda,
    setAgendaError,
    setTaskPendingState,
  ]);

  const handleAuditTask = useCallback((task: AgendaTaskItem) => {
    const normalizedWeighting = normalizeWeighting(task.weighting);

    setAuditTask(task);
    setAuditWeighting(normalizedWeighting != null ? String(normalizedWeighting) : String(maximumAuditWeighting));
    setAuditNotes(task.auditNotes ?? '');
  }, []);

  const handleAuditDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setAuditTask(null);
      setAuditWeighting(String(maximumAuditWeighting));
      setAuditNotes('');
    }
  }, []);

  const handleConfirmAudit = useCallback(async () => {
    if (!auditTask) {
      return;
    }

    const parsedWeighting = Number(auditWeighting);
    if (!Number.isInteger(parsedWeighting) || parsedWeighting < 0 || parsedWeighting > maximumAuditWeighting) {
      setAgendaError(agendaCopy.messages.weightingRange(maximumAuditWeighting));
      return;
    }

    setTaskPendingState(auditTask.taskId, true);
    setAgendaError(null);

    try {
      await auditProcessTask(auditTask.taskId, parsedWeighting, auditNotes);
      patchTaskInAgenda(auditTask.taskId, {
        status: 'completed',
        audited: true,
        auditStatus: 'audited',
        auditNotes: auditNotes.trim() ? auditNotes.trim() : null,
        weighting: parsedWeighting,
        isOverdue: false,
      });
      handleAuditDialogOpenChange(false);
      await loadAgenda();
    } catch (error) {
      setAgendaError(getErrorMessage(error, agendaCopy.messages.auditTask));
    } finally {
      setTaskPendingState(auditTask.taskId, false);
    }
  }, [
    agendaCopy.messages.auditTask,
    agendaCopy.messages.weightingRange,
    auditNotes,
    auditTask,
    auditWeighting,
    handleAuditDialogOpenChange,
    loadAgenda,
    patchTaskInAgenda,
    setAgendaError,
    setTaskPendingState,
  ]);

  return {
    auditNotes,
    auditTask,
    auditWeighting,
    completionNotes,
    completionPercent,
    completionTask,
    handleAuditDialogOpenChange,
    handleAuditTask,
    handleCloseTask,
    handleCompletionDialogOpenChange,
    handleConfirmAudit,
    handleConfirmComplete,
    setAuditNotes,
    setAuditWeighting,
    setCompletionNotes,
    setCompletionPercent,
  };
}
