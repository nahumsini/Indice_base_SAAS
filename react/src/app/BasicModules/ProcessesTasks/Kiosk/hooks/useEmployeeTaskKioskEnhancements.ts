import { useCallback, useMemo, useState } from 'react';
import type { PublicTaskKioskTask } from '../processTaskKioskApi';
import { uploadPublicTaskAttachment } from '../processTaskKioskApi';
import {
  normalizedTaskKioskEvidenceContentType,
  taskKioskAcceptedEvidenceTypes,
  taskKioskMaxEvidenceFiles,
  taskKioskMaxEvidenceSizeBytes,
} from '../publicTaskKioskEvidence';
import type { EmployeeTaskAgendaCopy } from '../employeeTaskAgendaTranslations';
import type { TaskKioskTranslations } from '../translations';
import {
  employeeTaskCapabilities,
  localEmployeeTaskDate,
  type EmployeeTaskMultiKioskAction,
} from './useEmployeeTaskMultiKioskWorkspace';

export interface EmployeeTaskScheduleDraft {
  date: string;
  durationMinutes: number;
  startTime: string;
}

type TaskMutationResponse = {
  items?: PublicTaskKioskTask[];
  task?: PublicTaskKioskTask;
};

type AttachmentPresignResponse = {
  object_key: string;
  upload_headers?: Record<string, string>;
  upload_url: string;
};

function minutesFromTime(value: string) {
  const [hour = '0', minute = '0'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

function timeFromMinutes(value: number) {
  const normalized = Math.min(1439, Math.max(0, value));
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function taskDuration(task: PublicTaskKioskTask) {
  if (!task.agenda_start_time || !task.agenda_end_time) return 60;
  const duration = minutesFromTime(task.agenda_end_time) - minutesFromTime(task.agenda_start_time);
  return duration > 0 ? duration : 60;
}

export function useEmployeeTaskKioskEnhancements({
  agendaCopy,
  canReschedule,
  copy,
  onAction,
  onAuthorizationFailure,
  onItems,
}: {
  agendaCopy: EmployeeTaskAgendaCopy;
  canReschedule: boolean;
  copy: TaskKioskTranslations;
  onAction: EmployeeTaskMultiKioskAction;
  onAuthorizationFailure: (error: unknown) => boolean;
  onItems: (items: PublicTaskKioskTask[]) => void;
}) {
  const [scheduleTask, setScheduleTask] = useState<PublicTaskKioskTask | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<EmployeeTaskScheduleDraft>({
    date: localEmployeeTaskDate(), durationMinutes: 60, startTime: '',
  });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [evidenceTaskId, setEvidenceTaskId] = useState<number | null>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const clearEvidenceError = useCallback(() => setEvidenceError(''), []);

  const openSchedule = useCallback((task: PublicTaskKioskTask) => {
    if (!canReschedule || !task.can_reschedule) return;
    setScheduleTask(task);
    setScheduleDraft({
      date: task.agenda_date || task.due_date || localEmployeeTaskDate(),
      durationMinutes: taskDuration(task),
      startTime: task.agenda_start_time?.slice(0, 5) || '',
    });
    setScheduleError('');
  }, [canReschedule]);

  const closeSchedule = useCallback(() => {
    if (scheduleBusy) return;
    setScheduleTask(null);
    setScheduleError('');
  }, [scheduleBusy]);

  const saveSchedule = useCallback(async () => {
    if (!scheduleTask || scheduleBusy || !canReschedule) return;
    setScheduleBusy(true);
    setScheduleError('');
    setSuccessMessage('');
    try {
      const start = scheduleDraft.startTime || null;
      const result = await onAction<TaskMutationResponse>(employeeTaskCapabilities.agendaUpdate, {
        resource_id: scheduleTask.id,
        agenda_date: scheduleDraft.date || null,
        agenda_start_time: start,
        agenda_end_time: start
          ? timeFromMinutes(minutesFromTime(start) + scheduleDraft.durationMinutes)
          : null,
        agenda_time_zone: scheduleDraft.date
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : null,
      });
      if (Array.isArray(result.items)) onItems(result.items);
      setScheduleTask(null);
      setSuccessMessage(agendaCopy.scheduleUi.saved);
    } catch (error) {
      if (!onAuthorizationFailure(error)) setScheduleError(agendaCopy.scheduleUi.failure);
    } finally {
      setScheduleBusy(false);
    }
  }, [agendaCopy.scheduleUi.failure, agendaCopy.scheduleUi.saved, canReschedule, onAction, onAuthorizationFailure, onItems, scheduleBusy, scheduleDraft, scheduleTask]);

  const removeSchedule = useCallback(async () => {
    if (!scheduleTask || scheduleBusy || !canReschedule) return;
    setScheduleDraft(current => ({ ...current, date: '', startTime: '' }));
    setScheduleBusy(true);
    setScheduleError('');
    try {
      const result = await onAction<TaskMutationResponse>(employeeTaskCapabilities.agendaUpdate, {
        resource_id: scheduleTask.id,
        agenda_date: null,
        agenda_start_time: null,
        agenda_end_time: null,
        agenda_time_zone: null,
      });
      if (Array.isArray(result.items)) onItems(result.items);
      setScheduleTask(null);
      setSuccessMessage(agendaCopy.scheduleUi.saved);
    } catch (error) {
      if (!onAuthorizationFailure(error)) setScheduleError(agendaCopy.scheduleUi.failure);
    } finally {
      setScheduleBusy(false);
    }
  }, [agendaCopy.scheduleUi.failure, agendaCopy.scheduleUi.saved, canReschedule, onAction, onAuthorizationFailure, onItems, scheduleBusy, scheduleTask]);

  const uploadEvidence = useCallback(async (task: PublicTaskKioskTask, files: File[]) => {
    const taskAllowsEvidence = task.can_add_evidence ?? task.is_assigned_to_current_user;
    if (!taskAllowsEvidence || evidenceTaskId != null || files.length === 0) return;
    const availableSlots = Math.max(0, taskKioskMaxEvidenceFiles - task.attachments);
    const selectedFiles = files.slice(0, availableSlots);
    if (selectedFiles.length === 0) return;
    setEvidenceTaskId(task.id);
    setEvidenceError('');
    setSuccessMessage('');
    try {
      for (const file of selectedFiles) {
        if (file.size > taskKioskMaxEvidenceSizeBytes) throw new Error(copy.errors.fileTooLarge(file.name));
        const contentType = normalizedTaskKioskEvidenceContentType(file);
        if (!contentType || !taskKioskAcceptedEvidenceTypes.has(contentType)) {
          throw new Error(copy.errors.unsupportedEvidence(file.name));
        }
        const presigned = await onAction<AttachmentPresignResponse>(employeeTaskCapabilities.attachmentPresign, {
          resource_id: task.id,
          file_name: file.name,
          content_type: contentType,
          size_bytes: file.size,
        });
        await uploadPublicTaskAttachment(
          presigned.upload_url, file, contentType, presigned.upload_headers ?? {},
        );
        const registered = await onAction<TaskMutationResponse>(employeeTaskCapabilities.attachmentRegister, {
          resource_id: task.id,
          object_key: presigned.object_key,
          original_filename: file.name,
          mime_type: contentType,
          size_bytes: file.size,
          logical_file_id: `${file.name}:${file.size}:${file.lastModified}`,
        });
        if (Array.isArray(registered.items)) onItems(registered.items);
      }
      setSuccessMessage(agendaCopy.detailUi.uploadSuccess);
    } catch (error) {
      if (!onAuthorizationFailure(error)) {
        setEvidenceError(error instanceof Error && error.message
          ? error.message : agendaCopy.detailUi.uploadFailure);
      }
    } finally {
      setEvidenceTaskId(null);
    }
  }, [agendaCopy.detailUi.uploadFailure, agendaCopy.detailUi.uploadSuccess, copy.errors, evidenceTaskId, onAction, onAuthorizationFailure, onItems]);

  return useMemo(() => ({
    clearEvidenceError,
    closeSchedule,
    evidenceError,
    evidenceTaskId,
    openSchedule,
    removeSchedule,
    saveSchedule,
    scheduleBusy,
    scheduleDraft,
    scheduleError,
    scheduleTask,
    setScheduleDraft,
    successMessage,
    uploadEvidence,
  }), [clearEvidenceError, closeSchedule, evidenceError, evidenceTaskId, openSchedule, removeSchedule, saveSchedule, scheduleBusy, scheduleDraft, scheduleError, scheduleTask, successMessage, uploadEvidence]);
}
