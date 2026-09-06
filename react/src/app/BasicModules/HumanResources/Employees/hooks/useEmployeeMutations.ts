import { useCallback, useState } from 'react';
import { humanResourcesApi } from '../../../../api/humanResources';
import type { BackendHrUser } from '../../../../api/humanResources';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import type { ContractTerminationFormData } from '../../../../components/TerminarContratoModal';
import type { EmployeeFormData } from '../components/CreateEmployeeModal';
import type { EmployeesTranslations } from '../translations';
import type { EmployeeViewModel } from '../types/employees.types';
import { syncEmployeeDocuments } from '../utils/employees.documents';
import { buildEmployeeSavePayload } from '../utils/employees.payloads';
import { assignHireSchedule } from '../utils/employees.scheduleAssignments';
import {
  normalizeErrorMessage,
} from '../utils/employees.utils';

interface EmployeeMutationsParams {
  copy: EmployeesTranslations;
  editingEmployee: EmployeeViewModel | null;
  onEmployeeSaved?: (employeeId: number) => void;
  refreshEmployees: () => Promise<void>;
  rememberCreatedEmployee: (employee: BackendHrUser) => void;
  replaceEditingEmployeeId: (employeeId: number) => void;
  resetEmployeeModal: () => void;
  setFailureToastMessage: (message: string) => void;
  setLoadingOverlayDescription: (description: string) => void;
  setLoadingOverlayTitle: (title: string) => void;
  setSuccessToastMessage: (message: string) => void;
}

interface EmployeeMutationTask {
  description: string;
  task: () => Promise<void>;
  title: string;
}

export function useEmployeeMutations({
  copy,
  editingEmployee,
  onEmployeeSaved,
  refreshEmployees,
  rememberCreatedEmployee,
  replaceEditingEmployeeId,
  resetEmployeeModal,
  setFailureToastMessage,
  setLoadingOverlayDescription,
  setLoadingOverlayTitle,
  setSuccessToastMessage,
}: EmployeeMutationsParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<EmployeeViewModel | null>(null);
  const [terminatingEmployee, setTerminatingEmployee] = useState<EmployeeViewModel | null>(null);

  const runMutation = useCallback(async ({
    description,
    task,
    title,
  }: EmployeeMutationTask) => {
    setLoadingOverlayTitle(title);
    setLoadingOverlayDescription(description);
    setFailureToastMessage('');
    setIsSubmitting(true);

    try {
      await runWithMinimumDuration(task(), 900);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    setFailureToastMessage,
    setLoadingOverlayDescription,
    setLoadingOverlayTitle,
  ]);

  const handleSaveEmployee = useCallback(async (data: EmployeeFormData) => {
    const isEditing = Boolean(editingEmployee);
    const payload = buildEmployeeSavePayload(data, editingEmployee?.status ?? 'active');
    let savedEmployeeId: number | null = null;

    try {
      let documentErrors: string[] = [];
      let scheduleAssignmentError = '';

      await runMutation({
        title: copy.loadingTitle,
        description: copy.loadingDescription,
        task: async () => {
          const savedEmployee = editingEmployee
            ? await humanResourcesApi.updateHrUser(editingEmployee.id, payload)
            : await humanResourcesApi.createHrUser(payload);
          savedEmployeeId = savedEmployee.id;

          if (!editingEmployee) {
            rememberCreatedEmployee(savedEmployee);
          }

          documentErrors = await syncEmployeeDocuments({
            copy,
            data,
            employeeId: savedEmployee.id,
          });

          if (!editingEmployee && data.scheduleOnHire) {
            try {
              await assignHireSchedule(savedEmployee.id, data);
            } catch (error) {
              scheduleAssignmentError = normalizeErrorMessage(error, copy.errorMessages.scheduleAssign);
            }
          }

          if (editingEmployee) {
            replaceEditingEmployeeId(savedEmployee.id);
          }

          await refreshEmployees();
        },
      });

      if (documentErrors.length > 0) {
        setFailureToastMessage(
          `${isEditing ? copy.successMessages.updated : copy.successMessages.created} ${documentErrors[0]}`,
        );
      } else if (scheduleAssignmentError) {
        setFailureToastMessage(`${copy.successMessages.created} ${scheduleAssignmentError}`);
      } else {
        setSuccessToastMessage(
          isEditing
            ? copy.successMessages.updated
            : data.scheduleOnHire
              ? copy.successMessages.createdWithSchedule
              : copy.successMessages.created,
        );
      }

      if (savedEmployeeId !== null) {
        onEmployeeSaved?.(savedEmployeeId);
      }
      resetEmployeeModal();
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.save));
      throw error;
    }
  }, [
    copy,
    editingEmployee,
    refreshEmployees,
    rememberCreatedEmployee,
    onEmployeeSaved,
    replaceEditingEmployeeId,
    resetEmployeeModal,
    runMutation,
    setFailureToastMessage,
    setSuccessToastMessage,
  ]);

  const handleDeleteEmployee = useCallback(async (employee: EmployeeViewModel) => {
    if (employee.status !== 'terminated') {
      setTerminatingEmployee(employee);
      return;
    }

    setPendingDeleteEmployee(employee);
  }, []);

  const handleConfirmDeleteEmployee = useCallback(async () => {
    if (!pendingDeleteEmployee) {
      return;
    }

    try {
      await runMutation({
        title: copy.deleteLoadingTitle,
        description: copy.deleteLoadingDescription,
        task: async () => {
          await humanResourcesApi.deleteHrUser(pendingDeleteEmployee.id);
          await refreshEmployees();
        },
      });
      setPendingDeleteEmployee(null);
      setSuccessToastMessage(copy.successMessages.deleted);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.delete));
    }
  }, [
    copy.deleteLoadingDescription,
    copy.deleteLoadingTitle,
    copy.errorMessages.delete,
    copy.successMessages.deleted,
    pendingDeleteEmployee,
    refreshEmployees,
    runMutation,
    setFailureToastMessage,
    setSuccessToastMessage,
  ]);

  const handleConfirmTermination = useCallback(async (data: ContractTerminationFormData) => {
    if (!terminatingEmployee) {
      return;
    }

    try {
      await runMutation({
        title: copy.terminateLoadingTitle,
        description: copy.terminateLoadingDescription,
        task: async () => {
          await humanResourcesApi.terminateHrUser(terminatingEmployee.id, {
            exit_date: data.exitDate,
            last_working_day: data.lastWorkingDay,
            reason_type: data.reasonType || 'other',
            specific_reason: data.specificReason,
            summary: data.summary,
          });
          await refreshEmployees();
        },
      });

      setTerminatingEmployee(null);
      setSuccessToastMessage(copy.successMessages.terminated);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.terminate));
    }
  }, [
    copy.errorMessages.terminate,
    copy.successMessages.terminated,
    copy.terminateLoadingDescription,
    copy.terminateLoadingTitle,
    refreshEmployees,
    runMutation,
    setFailureToastMessage,
    setSuccessToastMessage,
    terminatingEmployee,
  ]);

  return {
    handleConfirmDeleteEmployee,
    handleConfirmTermination,
    handleDeleteEmployee,
    handleSaveEmployee,
    isSubmitting,
    pendingDeleteEmployee,
    setPendingDeleteEmployee,
    setTerminatingEmployee,
    terminatingEmployee,
  };
}
