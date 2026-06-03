import { lazy, Suspense } from 'react';
import type { EmployeeFormData } from './CreateEmployeeModal';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import type { ContractTerminationFormData } from '../../../../components/TerminarContratoModal';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { AttendanceControlLocation } from '../../../../api/humanResources';
import type { EmployeeBusinessOption, EmployeeUnitOption } from '../types/employees.types';

const LazyEmployeeModal = lazy(() => import('./CreateEmployeeModal').then((module) => ({
  default: module.EmployeeModal,
})));
const LazyColumnasConfigModal = lazy(() => import('../../../../components/rh/ColumnasConfigModal').then((module) => ({
  default: module.ColumnasConfigModal,
})));
const LazyTerminarContratoModal = lazy(() => import('../../../../components/TerminarContratoModal').then((module) => ({
  default: module.TerminarContratoModal,
})));

interface EmployeesActionModalsProps {
  attendanceLocations: AttendanceControlLocation[];
  businessOptions: EmployeeBusinessOption[];
  columns: ColumnConfig[];
  deleteCancelLabel: string;
  deleteConfirmLabel: string;
  deleteDescription: string;
  deleteTitle: string;
  employeeInitialData?: EmployeeFormData | null;
  employeeModalMode: 'create' | 'edit';
  fixedColumns: ColumnConfig[];
  isColumnsModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isEmployeeModalOpen: boolean;
  isSubmitting: boolean;
  isTerminationModalOpen: boolean;
  onCancelDelete: () => void;
  onCloseColumns: () => void;
  onCloseEmployeeModal: () => void;
  onCloseTermination: () => void;
  onConfirmDelete: () => void;
  onConfirmTermination: (data: ContractTerminationFormData) => void;
  onSaveColumns: (columns: ColumnConfig[]) => void;
  onSaveEmployee: (data: EmployeeFormData) => void | Promise<void>;
  pendingDeleteEmployeeName: string;
  terminatingEmployeeName: string;
  unitOptions: EmployeeUnitOption[];
}

export function EmployeesActionModals({
  attendanceLocations,
  businessOptions,
  columns,
  deleteCancelLabel,
  deleteConfirmLabel,
  deleteDescription,
  deleteTitle,
  employeeInitialData,
  employeeModalMode,
  fixedColumns,
  isColumnsModalOpen,
  isDeleteDialogOpen,
  isEmployeeModalOpen,
  isSubmitting,
  isTerminationModalOpen,
  onCancelDelete,
  onCloseColumns,
  onCloseEmployeeModal,
  onCloseTermination,
  onConfirmDelete,
  onConfirmTermination,
  onSaveColumns,
  onSaveEmployee,
  pendingDeleteEmployeeName,
  terminatingEmployeeName,
  unitOptions,
}: EmployeesActionModalsProps) {
  return (
    <>
      <Suspense fallback={null}>
        {isColumnsModalOpen ? (
          <LazyColumnasConfigModal
            isOpen={isColumnsModalOpen}
            onClose={onCloseColumns}
            columns={columns}
            fixedColumns={fixedColumns}
            onSave={onSaveColumns}
            theme="humanResources"
          />
        ) : null}

        {isEmployeeModalOpen ? (
          <LazyEmployeeModal
            isOpen={isEmployeeModalOpen}
            onClose={onCloseEmployeeModal}
            onSave={onSaveEmployee}
            initialData={employeeInitialData}
            mode={employeeModalMode}
            unitOptions={unitOptions}
            businessOptions={businessOptions}
            attendanceLocations={attendanceLocations}
          />
        ) : null}

        {isTerminationModalOpen ? (
          <LazyTerminarContratoModal
            isOpen={isTerminationModalOpen}
            onClose={onCloseTermination}
            onConfirm={onConfirmTermination}
            employeeName={terminatingEmployeeName}
          />
        ) : null}
      </Suspense>

      <ConfirmDeleteDialog
        isVisible={isDeleteDialogOpen}
        title={deleteTitle}
        itemName={pendingDeleteEmployeeName}
        description={deleteDescription}
        confirmLabel={deleteConfirmLabel}
        cancelLabel={deleteCancelLabel}
        confirmDisabled={isSubmitting}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  );
}
