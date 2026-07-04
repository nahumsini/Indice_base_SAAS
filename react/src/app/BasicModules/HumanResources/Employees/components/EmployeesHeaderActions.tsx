import type { ReactNode } from 'react';
import { Columns3, Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { hrAccentButtonClass } from '../constants/employees.constants';

interface EmployeesHeaderActionsProps {
  addEmployeeLabel: string;
  configureColumnsLabel: string;
  headingIcon: ReactNode;
  onConfigureColumns: () => void;
  onCreateEmployee: () => void;
  subtitle: string;
  title: string;
}

export function EmployeesHeaderActions({
  addEmployeeLabel,
  configureColumnsLabel,
  headingIcon,
  onConfigureColumns,
  onCreateEmployee,
  subtitle,
  title,
}: EmployeesHeaderActionsProps) {
  return (
    <section className="mb-5 rounded-lg border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-6 shadow-sm dark:border-[#59C3A5]/40 dark:bg-[#59C3A5]/15">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {headingIcon}
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={onConfigureColumns}
            className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 text-[#59C3A5] shadow-none hover:bg-[#59C3A5] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <Columns3 className="h-4 w-4" />
            {configureColumnsLabel}
          </Button>
          <Button
            onClick={onCreateEmployee}
            className={cn('h-11 gap-2 rounded-xl px-4', hrAccentButtonClass)}
          >
            <Plus className="h-4 w-4" />
            {addEmployeeLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
