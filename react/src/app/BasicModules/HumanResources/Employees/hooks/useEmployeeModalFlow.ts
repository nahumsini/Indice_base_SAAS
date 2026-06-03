import { useCallback, useState } from 'react';
import { humanResourcesApi } from '../../../../api/humanResources';
import { runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { createEmptyEmployeeFormData } from '../components/CreateEmployeeModal/model';
import type { EmployeeFormData } from '../components/CreateEmployeeModal/types';
import type { EmployeesTranslations } from '../translations';
import type { EmployeeViewModel } from '../types/employees.types';
import { toEmployeeFormData } from '../utils/employees.adapters';
import { normalizeErrorMessage } from '../utils/employees.utils';

interface EmployeeModalFlowParams {
  copy: EmployeesTranslations;
  setFailureToastMessage: (message: string) => void;
  setLoadingOverlayDescription: (description: string) => void;
  setLoadingOverlayTitle: (title: string) => void;
}

export function useEmployeeModalFlow({
  copy,
  setFailureToastMessage,
  setLoadingOverlayDescription,
  setLoadingOverlayTitle,
}: EmployeeModalFlowParams) {
  const [editingEmployee, setEditingEmployee] = useState<EmployeeViewModel | null>(null);
  const [modalInitialData, setModalInitialData] = useState<EmployeeFormData>(createEmptyEmployeeFormData());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreparingModal, setIsPreparingModal] = useState(false);

  const resetEmployeeModal = useCallback(() => {
    setEditingEmployee(null);
    setModalInitialData(createEmptyEmployeeFormData());
  }, []);

  const closeEmployeeModal = useCallback(() => {
    setIsModalOpen(false);
    resetEmployeeModal();
  }, [resetEmployeeModal]);

  const openCreateEmployeeModal = useCallback(() => {
    resetEmployeeModal();
    setIsModalOpen(true);
  }, [resetEmployeeModal]);

  const openEditEmployeeModal = useCallback(async (employee: EmployeeViewModel) => {
    setLoadingOverlayTitle(copy.detailLoadingTitle);
    setLoadingOverlayDescription(copy.detailLoadingDescription);
    setFailureToastMessage('');
    setIsPreparingModal(true);

    try {
      const details = await runWithMinimumDuration(
        humanResourcesApi.getHrUserDetails(employee.id),
        500,
      );
      setEditingEmployee(employee);
      setModalInitialData(toEmployeeFormData(details));
      setIsModalOpen(true);
    } catch (error) {
      setFailureToastMessage(normalizeErrorMessage(error, copy.errorMessages.detail));
    } finally {
      setIsPreparingModal(false);
    }
  }, [
    copy.detailLoadingDescription,
    copy.detailLoadingTitle,
    copy.errorMessages.detail,
    setFailureToastMessage,
    setLoadingOverlayDescription,
    setLoadingOverlayTitle,
  ]);

  const replaceEditingEmployeeId = useCallback((employeeId: number) => {
    setEditingEmployee((current) => (current ? { ...current, id: employeeId } : current));
  }, []);

  return {
    closeEmployeeModal,
    editingEmployee,
    isModalOpen,
    isPreparingModal,
    modalInitialData,
    openCreateEmployeeModal,
    openEditEmployeeModal,
    replaceEditingEmployeeId,
    resetEmployeeModal,
  };
}
