import { X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
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
import {
  processTaskModalCloseActionClass,
  processTaskModalCompactFooterClass,
  processTaskModalCompactHeaderClass,
  processTaskModalPrimaryActionClass,
  processTaskModalSecondaryActionClass,
} from '../../shared/processTaskModalStyles';
import type { AgendaTranslations } from '../translations';

type AgendaBulkDialogsProps = {
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
          <div className={processTaskModalCompactHeaderClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-950">{copy.form.labels.responsible}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-800/85">
                  {copy.bulk.assignDescription(selectedCount)}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="outline" className={cn(processTaskModalCloseActionClass, 'w-9 shrink-0 px-0')} disabled={isRunning} aria-label={copy.common.cancel}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
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
          <DialogFooter className={processTaskModalCompactFooterClass}>
            <Button
              type="button"
              variant="outline"
              className={processTaskModalSecondaryActionClass}
              disabled={isRunning}
              onClick={() => onAssignOpenChange(false)}
            >
              {copy.common.cancel}
            </Button>
            <Button
              type="button"
              className={processTaskModalPrimaryActionClass}
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
          <div className={processTaskModalCompactHeaderClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-950">{copy.form.labels.unit}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-800/85">
                  {copy.bulk.unitDescription(selectedCount)}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button type="button" variant="outline" className={cn(processTaskModalCloseActionClass, 'w-9 shrink-0 px-0')} disabled={isRunning} aria-label={copy.common.cancel}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
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
          <DialogFooter className={processTaskModalCompactFooterClass}>
            <Button
              type="button"
              variant="outline"
              className={processTaskModalSecondaryActionClass}
              disabled={isRunning}
              onClick={() => onUnitOpenChange(false)}
            >
              {copy.common.cancel}
            </Button>
            <Button
              type="button"
              className={processTaskModalPrimaryActionClass}
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
