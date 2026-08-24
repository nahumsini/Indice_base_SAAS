import { lazy, Suspense } from 'react';
import type { EmployeeFormData } from './CreateEmployeeModal';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import type { ContractTerminationFormData } from '../../../../components/TerminarContratoModal';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import type { AttendanceControlLocation } from '../../../../api/humanResources';
import type { EmployeeBusinessOption, EmployeeUnitOption } from '../types/employees.types';
import type { BulkEmployeePayload } from './EmployeeBulkIntegrationModal';

const LazyEmployeeModal = lazy(() => import('./CreateEmployeeModal').then((module) => ({
  default: module.EmployeeModal,
})));
const LazyColumnasConfigModal = lazy(() => import('../../../../components/rh/ColumnasConfigModal').then((module) => ({
  default: module.ColumnasConfigModal,
})));
const LazyTerminarContratoModal = lazy(() => import('../../../../components/TerminarContratoModal').then((module) => ({
  default: module.TerminarContratoModal,
})));
const LazyEmployeeBulkIntegrationModal = lazy(() => import('./EmployeeBulkIntegrationModal').then((module) => ({
  default: module.EmployeeBulkIntegrationModal,
})));

interface EmployeesActionModalsProps {
  attendanceLocations: AttendanceControlLocation[];
  businessOptions: EmployeeBusinessOption[];
  columns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  deleteCancelLabel: string;
  deleteConfirmLabel: string;
  deleteDescription: string;
  deleteTitle: string;
  employeeInitialData?: EmployeeFormData | null;
  employeeModalMode: 'create' | 'edit';
  existingEmployeeEmails: string[];
  fixedColumns: ColumnConfig[];
  isColumnsModalOpen: boolean;
  isBulkIntegrationModalOpen: boolean;
  isDeleteDialogOpen: boolean;
  isEmployeeModalOpen: boolean;
  isSubmitting: boolean;
  isTerminationModalOpen: boolean;
  onCancelDelete: () => void;
  onCloseColumns: () => void;
  onCloseBulkIntegration: () => void;
  onCloseEmployeeModal: () => void;
  onCloseTermination: () => void;
  onConfirmDelete: () => void;
  onConfirmTermination: (data: ContractTerminationFormData) => void;
  onSaveColumns: (columns: ColumnConfig[]) => void;
  onSaveEmployee: (data: EmployeeFormData) => void | Promise<void>;
  onSubmitBulkIntegration: (items: BulkEmployeePayload[]) => Promise<void>;
  pendingDeleteEmployeeName: string;
  terminatingEmployeeName: string;
  unitOptions: EmployeeUnitOption[];
}

export function EmployeesActionModals({
  attendanceLocations,
  businessOptions,
  columns,
  defaultColumns,
  deleteCancelLabel,
  deleteConfirmLabel,
  deleteDescription,
  deleteTitle,
  employeeInitialData,
  employeeModalMode,
  existingEmployeeEmails,
  fixedColumns,
  isColumnsModalOpen,
  isBulkIntegrationModalOpen,
  isDeleteDialogOpen,
  isEmployeeModalOpen,
  isSubmitting,
  isTerminationModalOpen,
  onCancelDelete,
  onCloseColumns,
  onCloseBulkIntegration,
  onCloseEmployeeModal,
  onCloseTermination,
  onConfirmDelete,
  onConfirmTermination,
  onSaveColumns,
  onSaveEmployee,
  onSubmitBulkIntegration,
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
            defaultColumns={defaultColumns}
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

        {isBulkIntegrationModalOpen ? (
          <LazyEmployeeBulkIntegrationModal
            businessOptions={businessOptions}
            existingEmails={existingEmployeeEmails}
            open={isBulkIntegrationModalOpen}
            unitOptions={unitOptions}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) onCloseBulkIntegration();
            }}
            onSubmit={onSubmitBulkIntegration}
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
