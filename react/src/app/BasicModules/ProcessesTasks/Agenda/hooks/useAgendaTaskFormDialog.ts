import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { TaskFormValues } from '../../Tasks/components/TaskFormDialog';
import { createProcessTask, updateProcessTask } from '../../Tasks/tasksApi';
import type { ProcessCollaboratorOption } from '../../Processes/types';
import type { ProjectRecord } from '../../Projects/projectsApi';
import { normalizeAgendaTask, type AgendaTaskItem } from '../agendaApi';
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
  isProjectsCatalogReady: boolean;
  loadAgenda: () => Promise<void>;
  onTaskCreated: (task: AgendaTaskItem) => void;
  projects: ProjectRecord[];
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
  isProjectsCatalogReady,
  loadAgenda,
  onTaskCreated,
  projects,
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
      assigneeUserCompanyIds: [currentUserCollaborator.userCompanyId.toString()],
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
    setAgendaError(null);
    setTaskDialogMode('create');
    setEditingTaskId(null);
    setTaskForm(createDefaultTaskFormForCurrentUser());
    setIsTaskDialogOpen(true);
  }, [createDefaultTaskFormForCurrentUser, setAgendaError]);

  const handleEditTask = useCallback((task: AgendaTaskItem) => {
    setAgendaError(null);
    const nextForm = toTaskFormValues(task);
    const projectExists =
      !isProjectsCatalogReady ||
      task.projectId == null ||
      projects.some((project) => project.id === task.projectId);

    setTaskDialogMode('edit');
    setEditingTaskId(task.taskId);
    setTaskForm({
      ...nextForm,
      projectId: projectExists ? nextForm.projectId : '',
    });
    setIsTaskDialogOpen(true);
  }, [isProjectsCatalogReady, projects, setAgendaError]);

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
        const normalizedTaskForm =
          isProjectsCatalogReady &&
          taskForm.projectId &&
          !projects.some((project) => project.id === Number(taskForm.projectId))
            ? { ...taskForm, projectId: '' }
            : taskForm;
        const payload = buildTaskPayload(normalizedTaskForm, agendaCopy);

        const isEditing = taskDialogMode === 'edit' && editingTaskId != null;

        if (isEditing) {
          await updateProcessTask(editingTaskId, payload);
        } else {
          const createdTask = await createProcessTask(payload);
          onTaskCreated(normalizeAgendaTask(createdTask));
        }

        setIsTaskDialogOpen(false);
        resetTaskForm();
        if (isEditing) {
          await loadAgenda();
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Agenda task modal save failed.', { error, taskId: editingTaskId });
        }
        setAgendaError(getErrorMessage(error, agendaCopy.messages.saveTask));
      } finally {
        setIsSubmittingTask(false);
      }
    },
    [
      agendaCopy,
      editingTaskId,
      isProjectsCatalogReady,
      loadAgenda,
      onTaskCreated,
      projects,
      resetTaskForm,
      setAgendaError,
      taskDialogMode,
      taskForm,
    ],
  );

  useEffect(() => {
    if (!isTaskDialogOpen || taskDialogMode !== 'edit' || !isProjectsCatalogReady) {
      return;
    }

    setTaskForm((currentForm) => {
      if (!currentForm.projectId || projects.some((project) => project.id === Number(currentForm.projectId))) {
        return currentForm;
      }

      return {
        ...currentForm,
        projectId: '',
      };
    });
  }, [isProjectsCatalogReady, isTaskDialogOpen, projects, taskDialogMode]);

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
        const createdTask = await createProcessTask(
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
        onTaskCreated(normalizeAgendaTask(createdTask));

        setQuickTaskTitle('');
        setIsQuickTaskDialogOpen(false);
      } catch (error) {
        setAgendaError(getErrorMessage(error, agendaCopy.messages.saveTask));
      } finally {
        setIsSubmittingTask(false);
      }
    },
    [
      agendaCopy,
      createDefaultTaskFormForCurrentUser,
      onTaskCreated,
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
        assigneeUserCompanyIds: [currentUserCollaborator.userCompanyId.toString()],
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
