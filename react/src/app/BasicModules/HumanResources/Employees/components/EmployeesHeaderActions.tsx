import type { ReactNode } from 'react';
import { Columns3, Plus, TableProperties } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { hrAccentButtonClass } from '../constants/employees.constants';
import { HrTitleBar, hrTitleBarSecondaryActionClass } from '../../shared/HrTitleBar';

interface EmployeesHeaderActionsProps {
  addEmployeeLabel: string;
  configureColumnsLabel: string;
  bulkIntegrationLabel: string;
  headingIcon: ReactNode;
  onConfigureColumns: () => void;
  onOpenBulkIntegration: () => void;
  onCreateEmployee: () => void;
  subtitle: string;
  title: string;
}

export function EmployeesHeaderActions({
  addEmployeeLabel,
  bulkIntegrationLabel,
  configureColumnsLabel,
  headingIcon,
  onConfigureColumns,
  onOpenBulkIntegration,
  onCreateEmployee,
  subtitle,
  title,
}: EmployeesHeaderActionsProps) {
  return (
    <HrTitleBar emoji={headingIcon} title={title} subtitle={subtitle} actions={<>
          <Button
            variant="outline"
            onClick={onConfigureColumns}
            className={hrTitleBarSecondaryActionClass}
          >
            <Columns3 className="h-4 w-4" />
            {configureColumnsLabel}
          </Button>
          <Button
            variant="outline"
            onClick={onOpenBulkIntegration}
            className={hrTitleBarSecondaryActionClass}
          >
            <TableProperties className="h-4 w-4" />
            {bulkIntegrationLabel}
          </Button>
          <Button
            onClick={onCreateEmployee}
            className={cn('w-full sm:w-auto', hrAccentButtonClass)}
          >
            <Plus className="h-4 w-4" />
            {addEmployeeLabel}
          </Button>
        </>}
    />
  );
}
