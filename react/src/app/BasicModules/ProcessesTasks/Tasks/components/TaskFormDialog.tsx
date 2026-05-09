import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Pencil, Plus, Save } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { accentButtonClass } from '../../Processes/processesData';
import type { TaskPriority, TaskStatus } from '../tasksApi';

export interface TaskFormValues {
  title: string;
  description: string;
  processId: string;
  projectId: string;
  assignedEmployeeId: string;
  assignedUserId: string;
  assignedName: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  businessId: string;
  unitId: string;
}

interface TaskFormDialogProps {
  form: TaskFormValues;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
  setForm: Dispatch<SetStateAction<TaskFormValues>>;
}

const statusOptions: Array<{ label: string; value: TaskStatus }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: Array<{ label: string; value: TaskPriority }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function TaskFormDialog({
  form,
  isSubmitting,
  mode,
  onOpenChange,
  onSubmit,
  open,
  setForm,
}: TaskFormDialogProps) {
  const title = mode === 'create' ? 'Create task' : 'Edit task';
  const description =
    mode === 'create'
      ? 'Create an operational task without forcing a process relation. A task can be assigned to an employee or to a user.'
      : 'Update the task details, assignment, and execution status without leaving the Processes and Tasks module.';
  const submitLabel = mode === 'create' ? 'Create task' : 'Save changes';
  const hasExclusiveAssignmentConflict =
    Boolean(form.assignedEmployeeId.trim()) && Boolean(form.assignedUserId.trim());
  const isFormValid = Boolean(form.title.trim()) && !hasExclusiveAssignmentConflict;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(88vh,820px)] max-h-[calc(100vh-3rem)] max-w-[820px] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[rgb(235,165,52)] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <DialogTitle className="flex items-center gap-2 text-[1.2rem] font-bold leading-tight text-white sm:text-[1.4rem]">
                {mode === 'create' ? <Plus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
                {title}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl border-white/70 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white"
                disabled={isSubmitting}
              >
                Close
              </Button>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-6 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              <DialogDescription className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {description}
              </DialogDescription>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                Use either <span className="font-semibold">Assigned employee ID</span> or{' '}
                <span className="font-semibold">Assigned user ID</span>. Leave both empty for an unassigned task.
              </div>
              {hasExclusiveAssignmentConflict ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  Select only one assignment target: employee or user.
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Title *</label>
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Enter the task title"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the operational task"
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <SelectField
                label="Status"
                value={form.status}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, status: value }))}
                options={statusOptions}
              />
              <SelectField
                label="Priority"
                value={form.priority}
                onChange={(value) => setForm((currentForm) => ({ ...currentForm, priority: value }))}
                options={priorityOptions}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Process ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.processId}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, processId: event.target.value }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Project ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.projectId}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, projectId: event.target.value }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Assigned employee ID
                </label>
                <Input
                  type="number"
                  min="1"
                  value={form.assignedEmployeeId}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      assignedEmployeeId: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Assigned user ID
                </label>
                <Input
                  type="number"
                  min="1"
                  value={form.assignedUserId}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      assignedUserId: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Assigned name</label>
                <Input
                  value={form.assignedName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      assignedName: event.target.value,
                    }))
                  }
                  placeholder="Optional display name"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Due date</label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, dueDate: event.target.value }))
                  }
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Business ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.businessId}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, businessId: event.target.value }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Unit ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.unitId}
                  onChange={(event) =>
                    setForm((currentForm) => ({ ...currentForm, unitId: event.target.value }))
                  }
                  placeholder="Optional"
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className={`h-10 rounded-xl px-4 text-sm font-semibold ${accentButtonClass}`}
              disabled={!isFormValid || isSubmitting}
            >
              {mode === 'create' ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
