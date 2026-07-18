import { Building2, UserRoundCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../components/indice-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import type { ProcessCollaboratorOption, ProcessUnitOption } from '../../Processes/types';
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

const triggerClassName = 'h-11 rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-600 dark:bg-slate-800';

export function AgendaBulkDialogs(props: AgendaBulkDialogsProps) {
  const {
    bulkResponsibleValue, bulkUnitValue, collaborators, copy, isAssignOpen, isRunning, isUnitOpen,
    noUnitValue, onAssignConfirm, onAssignOpenChange, onResponsibleValueChange, onUnitConfirm,
    onUnitOpenChange, onUnitValueChange, selectedCount, unassignedResponsibleValue, units,
  } = props;
  const actions = (onCancel: () => void, onConfirm: () => void) => (
    <>
      <Button type="button" variant="outline" disabled={isRunning} onClick={onCancel}>{copy.common.cancel}</Button>
      <Button type="button" disabled={isRunning} onClick={onConfirm}>
        {isRunning ? copy.common.saving : copy.form.submit.edit}
      </Button>
    </>
  );

  return (
    <>
      <IndiceModalFrame
        busy={isRunning}
        closeLabel={copy.common.cancel}
        contentClassName="sm:!max-w-[520px]"
        description={copy.bulk.assignDescription(selectedCount)}
        footer={actions(() => onAssignOpenChange(false), onAssignConfirm)}
        footerSummary={`${selectedCount} tarea${selectedCount === 1 ? '' : 's'}`}
        icon={<UserRoundCheck className="h-5 w-5" />}
        modalType="standard-form"
        onOpenChange={onAssignOpenChange}
        open={isAssignOpen}
        title={copy.form.labels.responsible}
        tone="yellow"
      >
        <Select value={bulkResponsibleValue} onValueChange={onResponsibleValueChange}>
          <SelectTrigger className={triggerClassName}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={unassignedResponsibleValue}>{copy.common.unassigned}</SelectItem>
            {collaborators.map((collaborator) => (
              <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>{collaborator.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </IndiceModalFrame>

      <IndiceModalFrame
        busy={isRunning}
        closeLabel={copy.common.cancel}
        contentClassName="sm:!max-w-[520px]"
        description={copy.bulk.unitDescription(selectedCount)}
        footer={actions(() => onUnitOpenChange(false), onUnitConfirm)}
        footerSummary={`${selectedCount} tarea${selectedCount === 1 ? '' : 's'}`}
        icon={<Building2 className="h-5 w-5" />}
        modalType="standard-form"
        onOpenChange={onUnitOpenChange}
        open={isUnitOpen}
        title={copy.form.labels.unit}
        tone="yellow"
      >
        <Select value={bulkUnitValue} onValueChange={onUnitValueChange}>
          <SelectTrigger className={triggerClassName}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={noUnitValue}>{copy.form.empty.unit}</SelectItem>
            {units.map((unit) => <SelectItem key={unit.id} value={String(unit.id)}>{unit.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </IndiceModalFrame>
    </>
  );
}
