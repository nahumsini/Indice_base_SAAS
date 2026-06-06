import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import type { ProcessCollaboratorOption, ProcessUnitOption } from '../../Processes/types';
import type { AgendaTranslations } from '../translations';

type AgendaBulkDialogsProps = {
  accentButtonClassName: string;
  bulkResponsibleValue: string;
  bulkUnitValue: string;
  collaborators: ProcessCollaboratorOption[];
  copy: AgendaTranslations;
  isAssignOpen: boolean;
  isRunning: boolean;
  isUnitOpen: boolean;
  noUnitValue: string;
  onAssignConfirm: () => void;
  onAssignOpenChange: (open: boolean) => void;
  onResponsibleValueChange: (value: string) => void;
  onUnitConfirm: () => void;
  onUnitOpenChange: (open: boolean) => void;
  onUnitValueChange: (value: string) => void;
  selectedCount: number;
  unassignedResponsibleValue: string;
  units: ProcessUnitOption[];
};

export function AgendaBulkDialogs({
  accentButtonClassName,
  bulkResponsibleValue,
  bulkUnitValue,
  collaborators,
  copy,
  isAssignOpen,
  isRunning,
  isUnitOpen,
  noUnitValue,
  onAssignConfirm,
  onAssignOpenChange,
  onResponsibleValueChange,
  onUnitConfirm,
  onUnitOpenChange,
  onUnitValueChange,
  selectedCount,
  unassignedResponsibleValue,
  units,
}: AgendaBulkDialogsProps) {
  return (
    <>
      <Dialog open={isAssignOpen} onOpenChange={onAssignOpenChange}>
        <DialogContent
          hideCloseButton
          className="max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="bg-[#F4C84A] px-5 py-4">
            <DialogTitle className="text-lg font-bold text-slate-950">{copy.form.labels.responsible}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-800/85">
              {copy.bulk.assignDescription(selectedCount)}
            </DialogDescription>
          </div>
          <div className="space-y-3 px-5 py-5">
            <Select value={bulkResponsibleValue} onValueChange={onResponsibleValueChange}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={unassignedResponsibleValue}>{copy.common.unassigned}</SelectItem>
                {collaborators.map((collaborator) => (
                  <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
                    {collaborator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isRunning}
              onClick={() => onAssignOpenChange(false)}
            >
              {copy.common.cancel}
            </Button>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClassName)}
              disabled={isRunning}
              onClick={onAssignConfirm}
            >
              {isRunning ? copy.common.saving : copy.form.submit.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnitOpen} onOpenChange={onUnitOpenChange}>
        <DialogContent
          hideCloseButton
          className="max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="bg-[#F4C84A] px-5 py-4">
            <DialogTitle className="text-lg font-bold text-slate-950">{copy.form.labels.unit}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-800/85">
              {copy.bulk.unitDescription(selectedCount)}
            </DialogDescription>
          </div>
          <div className="space-y-3 px-5 py-5">
            <Select value={bulkUnitValue} onValueChange={onUnitValueChange}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={noUnitValue}>{copy.form.empty.unit}</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isRunning}
              onClick={() => onUnitOpenChange(false)}
            >
              {copy.common.cancel}
            </Button>
            <Button
              type="button"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClassName)}
              disabled={isRunning}
              onClick={onUnitConfirm}
            >
              {isRunning ? copy.common.saving : copy.form.submit.edit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
