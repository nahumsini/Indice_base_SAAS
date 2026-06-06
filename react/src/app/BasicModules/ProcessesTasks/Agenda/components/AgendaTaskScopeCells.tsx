import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { cn } from '../../../../components/ui/utils';
import { tableSelectTriggerClass } from './AgendaTablePrimitives';
import type { AgendaTaskCellProps } from './AgendaTaskCellTypes';
import { projectLabel } from '../utils/agendaFilterOptions';

type TaskCellScopeProps = Pick<
  AgendaTaskCellProps,
  | 'businessOptionsForUnit'
  | 'collaboratorOptionsForScope'
  | 'copy'
  | 'isPending'
  | 'noBusinessValue'
  | 'noProjectValue'
  | 'noUnitValue'
  | 'onBusinessChange'
  | 'onProjectChange'
  | 'onResponsibleChange'
  | 'onUnitChange'
  | 'projects'
  | 'scopedCatalogUnits'
  | 'task'
  | 'unassignedResponsibleValue'
>;

export function UnitCell({
  copy,
  isPending,
  noUnitValue,
  onUnitChange,
  scopedCatalogUnits,
  task,
}: TaskCellScopeProps) {
  const unitSelectValue = task.unitId != null ? String(task.unitId) : noUnitValue;
  const currentUnitMissing = task.unitId != null && !scopedCatalogUnits.some((unit) => unit.id === task.unitId);

  return (
    <Select value={unitSelectValue} disabled={isPending} onValueChange={(value) => onUnitChange(task, value)}>
      <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={noUnitValue}>{copy.form.empty.unit}</SelectItem>
        {currentUnitMissing ? (
          <SelectItem value={String(task.unitId)}>
            {task.unitName ?? `${copy.form.labels.unit} #${task.unitId}`}
          </SelectItem>
        ) : null}
        {scopedCatalogUnits.map((unit) => (
          <SelectItem key={unit.id} value={String(unit.id)}>
            {unit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BusinessCell({
  businessOptionsForUnit,
  copy,
  isPending,
  noBusinessValue,
  onBusinessChange,
  task,
}: TaskCellScopeProps) {
  const businessSelectValue = task.businessId != null ? String(task.businessId) : noBusinessValue;
  const rowBusinessOptions = businessOptionsForUnit(task.unitId);
  const currentBusinessMissing =
    task.businessId != null && !rowBusinessOptions.some((business) => business.id === task.businessId);

  return (
    <Select value={businessSelectValue} disabled={isPending} onValueChange={(value) => onBusinessChange(task, value)}>
      <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={noBusinessValue}>{copy.form.empty.business}</SelectItem>
        {currentBusinessMissing ? (
          <SelectItem value={String(task.businessId)}>
            {task.businessName ?? `${copy.form.labels.business} #${task.businessId}`}
          </SelectItem>
        ) : null}
        {rowBusinessOptions.map((business) => (
          <SelectItem key={business.id} value={String(business.id)}>
            {business.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ResponsibleCell({
  collaboratorOptionsForScope,
  copy,
  isPending,
  onResponsibleChange,
  task,
  unassignedResponsibleValue,
}: TaskCellScopeProps) {
  const responsibleSelectValue =
    task.assignedUserCompanyId != null ? String(task.assignedUserCompanyId) : unassignedResponsibleValue;
  const rowCollaboratorOptions = collaboratorOptionsForScope(task.unitId, task.businessId);
  const currentCollaboratorMissing =
    task.assignedUserCompanyId != null &&
    !rowCollaboratorOptions.some((collaborator) => collaborator.userCompanyId === task.assignedUserCompanyId);

  return (
    <Select value={responsibleSelectValue} disabled={isPending} onValueChange={(value) => onResponsibleChange(task, value)}>
      <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={unassignedResponsibleValue}>{copy.common.unassigned}</SelectItem>
        {currentCollaboratorMissing ? (
          <SelectItem value={String(task.assignedUserCompanyId)}>
            {task.assignedName ?? `User #${task.assignedUserCompanyId}`}
          </SelectItem>
        ) : null}
        {rowCollaboratorOptions.map((collaborator) => (
          <SelectItem key={collaborator.userCompanyId} value={String(collaborator.userCompanyId)}>
            {collaborator.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProjectCell({
  copy,
  isPending,
  noProjectValue,
  onProjectChange,
  projects,
  task,
}: TaskCellScopeProps) {
  const projectSelectValue = task.projectId != null ? String(task.projectId) : noProjectValue;
  const currentProjectMissing = task.projectId != null && !projects.some((project) => project.id === task.projectId);

  return (
    <Select value={projectSelectValue} disabled={isPending} onValueChange={(value) => onProjectChange(task, value)}>
      <SelectTrigger className={cn(tableSelectTriggerClass, 'w-full')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={noProjectValue}>{copy.form.empty.project}</SelectItem>
        {currentProjectMissing ? (
          <SelectItem value={String(task.projectId)}>
            {task.projectFolio ? `${task.projectFolio} - ` : ''}
            {task.projectName ?? `${copy.form.labels.project} #${task.projectId}`}
          </SelectItem>
        ) : null}
        {projects.map((project) => (
          <SelectItem key={project.id} value={String(project.id)}>
            {projectLabel(project)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
