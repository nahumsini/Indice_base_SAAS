import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { TaskFormValues } from '../../Tasks/components/TaskFormDialog';
import { createProcessTask, updateProcessTask } from '../../Tasks/tasksApi';
import type { ProcessCollaboratorOption } from '../../Processes/types';
import type { AgendaTaskItem } from '../agendaApi';
import type { AgendaTranslations } from '../translations';
import { defaultTaskScopeForActor } from '../../shared/assignmentScope';
import { getErrorMessage } from '../utils/agendaTaskStatus';
import {
  buildTaskPayload,
  createDefaultTaskForm,
  toTaskFormValues,
} from '../utils/agendaTaskPayloads';

type UseAgendaTaskFormDialogOptions = {
  agendaCopy: AgendaTranslations;
  currentUserCollaborator: ProcessCollaboratorOption | null;
  loadAgenda: () => Promise<void>;
  quickTaskContext?: Partial<Pick<
    TaskFormValues,
    'assignedName' | 'assignedUserCompanyId' | 'businessId' | 'projectId' | 'unitId'
  >>;
  quickTaskDate: string;
  selectedScheduleDate: string;
  setAgendaError: (message: string | null) => void;
  todayAgendaValue: string;
};

export function useAgendaTaskFormDialog({
  agendaCopy,
  currentUserCollaborator,
  loadAgenda,
  quickTaskContext,
  quickTaskDate,
  selectedScheduleDate,
  setAgendaError,
  todayAgendaValue,
}: UseAgendaTaskFormDialogOptions) {
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isQuickTaskDialogOpen, setIsQuickTaskDialogOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [taskDialogMode, setTaskDialogMode] = useState<'create' | 'edit'>('create');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormValues>(() => createDefaultTaskForm());
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const createDefaultTaskFormForCurrentUser = useCallback(() => {
    const defaultForm = createDefaultTaskForm();
    const defaultScope = defaultTaskScopeForActor(currentUserCollaborator);

    if (!currentUserCollaborator) {
      return defaultForm;
    }

    return {
      ...defaultForm,
      assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
      assignedName: currentUserCollaborator.name,
      unitId: defaultScope.unitId?.toString() ?? '',
      businessId: defaultScope.businessId?.toString() ?? '',
    };
  }, [currentUserCollaborator]);

  const resetTaskForm = useCallback(() => {
    setTaskForm(createDefaultTaskForm());
    setEditingTaskId(null);
  }, []);

  const handleCreateTaskClick = useCallback(() => {
    setTaskDialogMode('create');
    setEditingTaskId(null);
    setTaskForm(createDefaultTaskFormForCurrentUser());
    setIsTaskDialogOpen(true);
  }, [createDefaultTaskFormForCurrentUser]);

  const handleEditTask = useCallback((task: AgendaTaskItem) => {
    setTaskDialogMode('edit');
    setEditingTaskId(task.taskId);
    setTaskForm(toTaskFormValues(task));
    setIsTaskDialogOpen(true);
  }, []);

  const handleTaskDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsTaskDialogOpen(open);

      if (!open) {
        resetTaskForm();
      }
    },
    [resetTaskForm],
  );

  const handleQuickTaskDialogOpenChange = useCallback((open: boolean) => {
    setIsQuickTaskDialogOpen(open);
    if (!open) {
      setQuickTaskTitle('');
    }
  }, []);

  const handleSubmitTask = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmittingTask(true);
      setAgendaError(null);

      try {
        const payload = buildTaskPayload(taskForm, agendaCopy);

        if (taskDialogMode === 'edit' && editingTaskId != null) {
          await updateProcessTask(editingTaskId, payload);
        } else {
          await createProcessTask(payload);
        }

        setIsTaskDialogOpen(false);
        resetTaskForm();
        await loadAgenda();
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Agenda task modal save failed.', { error, taskId: editingTaskId });
        }
        setAgendaError(getErrorMessage(error, agendaCopy.messages.saveTask));
      } finally {
        setIsSubmittingTask(false);
      }
    },
    [agendaCopy, editingTaskId, loadAgenda, resetTaskForm, setAgendaError, taskDialogMode, taskForm],
  );

  const handleSubmitQuickTask = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const title = quickTaskTitle.trim();

      if (!title) {
        setAgendaError(agendaCopy.messages.titleRequired);
        return;
      }

      setIsSubmittingTask(true);
      setAgendaError(null);

      try {
        await createProcessTask(
          buildTaskPayload(
            {
              ...createDefaultTaskFormForCurrentUser(),
              ...quickTaskContext,
              title,
              description: '',
              startDate: quickTaskDate || selectedScheduleDate || todayAgendaValue,
              dueDate: quickTaskDate || selectedScheduleDate || todayAgendaValue,
              processId: '',
              status: 'pending',
            },
            agendaCopy,
          ),
        );

        setQuickTaskTitle('');
        setIsQuickTaskDialogOpen(false);
        await loadAgenda();
      } catch (error) {
        setAgendaError(getErrorMessage(error, agendaCopy.messages.saveTask));
      } finally {
        setIsSubmittingTask(false);
      }
    },
    [
      agendaCopy,
      createDefaultTaskFormForCurrentUser,
      loadAgenda,
      quickTaskContext,
      quickTaskDate,
      quickTaskTitle,
      selectedScheduleDate,
      setAgendaError,
      todayAgendaValue,
    ],
  );

  useEffect(() => {
    if (!isTaskDialogOpen || taskDialogMode !== 'create' || !currentUserCollaborator) {
      return;
    }

    setTaskForm((currentForm) => {
      if (currentForm.assignedUserCompanyId || currentForm.assignedName) {
        return currentForm;
      }

      return {
        ...currentForm,
        assignedUserCompanyId: currentUserCollaborator.userCompanyId.toString(),
        assignedName: currentUserCollaborator.name,
        unitId: currentForm.unitId || defaultTaskScopeForActor(currentUserCollaborator).unitId?.toString() || '',
        businessId:
          currentForm.businessId || defaultTaskScopeForActor(currentUserCollaborator).businessId?.toString() || '',
      };
    });
  }, [currentUserCollaborator, isTaskDialogOpen, taskDialogMode]);

  return {
    handleCreateTaskClick,
    handleEditTask,
    handleQuickTaskDialogOpenChange,
    handleSubmitQuickTask,
    handleSubmitTask,
    handleTaskDialogOpenChange,
    isQuickTaskDialogOpen,
    isSubmittingTask,
    isTaskDialogOpen,
    quickTaskTitle,
    setIsQuickTaskDialogOpen,
    setQuickTaskTitle,
    setTaskForm,
    taskDialogMode,
    taskForm,
  };
}
