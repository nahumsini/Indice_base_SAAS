import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowUpDown,
  Columns3,
  Copy,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Textarea } from '../../../components/ui/textarea';
import { cn } from '../../../components/ui/utils';
import {
  accentButtonClass,
  baseBusinessOptions,
  baseCollaboratorOptions,
  baseUnitOptions,
  cloneRecurrenceConfig,
  createDefaultProcessForm,
  defaultColumns,
  describeProcessFrequency,
  frequencyLabels,
  frequencyOptions,
  normalizeRecurrenceConfig,
  priorityLabels,
} from './processesData';
import { createProcess, deleteProcess, listProcesses, updateProcess } from './processesApi';
import { ProcessColumnsDialog } from './components/ProcessColumnsDialog';
import { ProcessFormDialog } from './components/ProcessFormDialog';
import type {
  Option,
  ProcessColumnConfig,
  ProcessColumnId,
  ProcessFormState,
  ProcessFrequency,
  ProcessPriority,
  ProcessRecord,
  ProcessSortState,
} from './types';

type FrequencyFilter = 'all' | ProcessFrequency;
type CollaboratorFilter = 'all' | string;
type BusinessFilter = 'all' | string;
type UnitFilter = 'all' | string;

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors';

const prioritySelectClasses: Record<ProcessPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300',
  medium:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300',
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toProcessFormState(record: ProcessRecord): ProcessFormState {
  return {
    unit: record.unit,
    business: record.business,
    title: record.title,
    description: record.description,
    frequency: record.frequency,
    responsible: record.responsible,
    priority: record.priority,
    recurrence: cloneRecurrenceConfig(record.recurrence),
  };
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Option<T>[];
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

function InlineSelectField<T extends string>({
  value,
  options,
  onChange,
  className,
  renderValue,
  disabled,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
  renderValue?: (value: T) => ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-10 min-w-[148px] rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
          className,
        )}
      >
        {renderValue ? renderValue(value) : <SelectValue />}
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InlineTextCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'h-10 min-w-[220px] rounded-xl border-slate-200 bg-white text-base text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400',
        className,
      )}
    />
  );
}

function InlineTextareaCell({
  value,
  onCommit,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onCommit: (value: string) => Promise<boolean> | boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = async () => {
    const nextValue = draft.trim();
    if (nextValue === value) {
      return;
    }

    const didCommit = await onCommit(nextValue);
    if (!didCommit) {
      setDraft(value);
    }
  };

  return (
    <Textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        void handleBlur();
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

function ProcessActionButton({
  className,
  icon,
  label,
  onClick,
  disabled,
}: {
  className: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className, disabled && 'cursor-not-allowed opacity-60')}
    >
      {icon}
    </button>
  );
}

export default function Processes() {
  const [records, setRecords] = useState<ProcessRecord[]>([]);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(true);
  const [processesError, setProcessesError] = useState<string | null>(null);
  const [isSubmittingProcess, setIsSubmittingProcess] = useState(false);
  const [pendingRecordIds, setPendingRecordIds] = useState<number[]>([]);
  const [columns, setColumns] = useState<ProcessColumnConfig[]>(defaultColumns);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all');
  const [businessFilter, setBusinessFilter] = useState<BusinessFilter>('all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<CollaboratorFilter>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<FrequencyFilter>('all');
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [processEditorOpen, setProcessEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [sortState, setSortState] = useState<ProcessSortState>({
    columnId: 'createdAt',
    direction: 'desc',
  });

  const unitOptions = useMemo(
    () =>
      Array.from(new Set([...baseUnitOptions, ...records.map((record) => record.unit)])).sort((left, right) =>
        left.localeCompare(right),
      ),
    [records],
  );
  const businessOptions = useMemo(
    () =>
      Array.from(new Set([...baseBusinessOptions, ...records.map((record) => record.business)])).sort(
        (left, right) => left.localeCompare(right),
      ),
    [records],
  );
  const collaboratorOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...baseCollaboratorOptions,
          ...records.flatMap((record) => [record.creator, record.responsible]),
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [records],
  );

  const [form, setForm] = useState<ProcessFormState>(() =>
    createDefaultProcessForm(unitOptions, businessOptions, collaboratorOptions),
  );

  const loadProcesses = async () => {
    setIsLoadingProcesses(true);
    setProcessesError(null);

    try {
      const items = await listProcesses();
      setRecords(items);
    } catch (error) {
      setProcessesError(getErrorMessage(error, 'Unable to load processes.'));
      setRecords([]);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  useEffect(() => {
    void loadProcesses();
  }, []);

  const visibleColumns = columns.filter((column) => column.visible);

  const localizedUnitOptions: Option<UnitFilter>[] = [
    { value: 'all', label: 'All units' },
    ...unitOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedBusinessOptions: Option<BusinessFilter>[] = [
    { value: 'all', label: 'All businesses' },
    ...businessOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedCollaboratorOptions: Option<CollaboratorFilter>[] = [
    { value: 'all', label: 'All collaborators' },
    ...collaboratorOptions.map((option) => ({ value: option, label: option })),
  ];
  const localizedFrequencyOptions: Option<FrequencyFilter>[] = [
    { value: 'all', label: 'All frequencies' },
    ...frequencyOptions,
  ];
  const inlineUnitOptions: Option<string>[] = unitOptions.map((option) => ({
    value: option,
    label: option,
  }));
  const inlineBusinessOptions: Option<string>[] = businessOptions.map((option) => ({
    value: option,
    label: option,
  }));
  const inlineCollaboratorOptions: Option<string>[] = collaboratorOptions.map((option) => ({
    value: option,
    label: option,
  }));

  const filteredRecords = records.filter((record) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      record.folio.toLowerCase().includes(normalizedSearch) ||
      record.title.toLowerCase().includes(normalizedSearch) ||
      record.description.toLowerCase().includes(normalizedSearch) ||
      record.unit.toLowerCase().includes(normalizedSearch) ||
      record.business.toLowerCase().includes(normalizedSearch) ||
      record.creator.toLowerCase().includes(normalizedSearch) ||
      record.responsible.toLowerCase().includes(normalizedSearch);
    const matchesUnit = unitFilter === 'all' || record.unit === unitFilter;
    const matchesBusiness = businessFilter === 'all' || record.business === businessFilter;
    const matchesCollaborator =
      collaboratorFilter === 'all' || record.responsible === collaboratorFilter;
    const matchesFrequency = frequencyFilter === 'all' || record.frequency === frequencyFilter;

    return matchesSearch && matchesUnit && matchesBusiness && matchesCollaborator && matchesFrequency;
  });

  const getSortValue = (record: ProcessRecord, columnId: ProcessColumnId) => {
    switch (columnId) {
      case 'folio':
        return record.folio;
      case 'unit':
        return record.unit;
      case 'business':
        return record.business;
      case 'title':
        return record.title;
      case 'description':
        return record.description;
      case 'createdAt':
        return record.createdAt;
      case 'frequency':
        return `${frequencyLabels[record.frequency]} ${describeProcessFrequency(record.frequency, record.recurrence)}`;
      case 'creator':
        return record.creator;
      case 'responsible':
        return record.responsible;
      case 'priority':
        return priorityLabels[record.priority];
      default:
        return '';
    }
  };

  const sortedRecords = [...filteredRecords].sort((leftRecord, rightRecord) => {
    const leftValue = getSortValue(leftRecord, sortState.columnId);
    const rightValue = getSortValue(rightRecord, sortState.columnId);

    const comparison =
      typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
        : leftValue > rightValue
          ? 1
          : leftValue < rightValue
            ? -1
            : 0;

    return sortState.direction === 'asc' ? comparison : comparison * -1;
  });

  const activeCount = records.filter((record) => record.isActive).length;
  const inactiveCount = records.filter((record) => !record.isActive).length;
  const visibleCount = sortedRecords.length;

  const setRecordPendingState = (recordId: number, isPending: boolean) => {
    setPendingRecordIds((currentIds) =>
      isPending
        ? currentIds.includes(recordId)
          ? currentIds
          : [...currentIds, recordId]
        : currentIds.filter((currentId) => currentId !== recordId),
    );
  };

  const isRecordPending = (recordId: number) => pendingRecordIds.includes(recordId);

  const persistRecordChange = async (
    recordId: number,
    updater: (record: ProcessRecord) => ProcessRecord,
  ) => {
    let previousRecord: ProcessRecord | null = null;
    let nextRecord: ProcessRecord | null = null;

    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== recordId) {
          return record;
        }

        previousRecord = record;
        nextRecord = updater(record);
        return nextRecord;
      }),
    );

    if (!previousRecord || !nextRecord) {
      return false;
    }

    const originalRecord: ProcessRecord = previousRecord;
    const updatedRecord: ProcessRecord = nextRecord;

    setRecordPendingState(recordId, true);
    setProcessesError(null);

    try {
      const savedRecord = await updateProcess(recordId, {
        ...toProcessFormState(updatedRecord),
        isActive: updatedRecord.isActive,
      });

      setRecords((currentRecords) =>
        currentRecords.map((record) => (record.id === recordId ? savedRecord : record)),
      );
      return true;
    } catch (error) {
      setRecords((currentRecords) =>
        currentRecords.map((record) => (record.id === recordId ? originalRecord : record)),
      );
      setProcessesError(getErrorMessage(error, 'Unable to save process changes.'));
      return false;
    } finally {
      setRecordPendingState(recordId, false);
    }
  };

  const resetForm = () => {
    setForm(createDefaultProcessForm(unitOptions, businessOptions, collaboratorOptions));
    setEditingProcessId(null);
  };

  const openCreateDialog = () => {
    setEditorMode('create');
    resetForm();
    setProcessEditorOpen(true);
  };

  const openEditDialog = (record: ProcessRecord) => {
    setEditorMode('edit');
    setEditingProcessId(record.id);
    setForm({
      unit: record.unit,
      business: record.business,
      title: record.title,
      description: record.description,
      frequency: record.frequency,
      responsible: record.responsible,
      priority: record.priority,
      recurrence: cloneRecurrenceConfig(record.recurrence),
    });
    setProcessEditorOpen(true);
  };

  const handleSort = (columnId: ProcessColumnId) => {
    setSortState((currentSort) => ({
      columnId,
      direction:
        currentSort.columnId === columnId && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleToggleActive = async (recordId: number) => {
    await persistRecordChange(recordId, (record) => ({
      ...record,
      isActive: !record.isActive,
    }));
  };

  const handleDelete = async (recordId: number) => {
    setRecordPendingState(recordId, true);
    setProcessesError(null);

    try {
      await deleteProcess(recordId);
      setRecords((currentRecords) => currentRecords.filter((record) => record.id !== recordId));
    } catch (error) {
      setProcessesError(getErrorMessage(error, 'Unable to delete process.'));
    } finally {
      setRecordPendingState(recordId, false);
    }
  };

  const handleDuplicate = async (record: ProcessRecord) => {
    setRecordPendingState(record.id, true);
    setProcessesError(null);

    try {
      const duplicatedRecord = await createProcess({
        ...toProcessFormState(record),
        title: `${record.title} Copy`,
        recurrence: cloneRecurrenceConfig(record.recurrence),
      });

      setRecords((currentRecords) => [duplicatedRecord, ...currentRecords]);
    } catch (error) {
      setProcessesError(getErrorMessage(error, 'Unable to duplicate process.'));
    } finally {
      setRecordPendingState(record.id, false);
    }
  };

  const handleInlineTextCommit = async (
    recordId: number,
    field: 'title' | 'description',
    nextValue: string,
  ) => {
    if (!nextValue) {
      setProcessesError(`${field === 'title' ? 'Title' : 'Description'} is required.`);
      return false;
    }

    return persistRecordChange(recordId, (record) => ({
      ...record,
      [field]: nextValue,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      return;
    }

    const normalizedForm: ProcessFormState = {
      unit: form.unit,
      business: form.business,
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      responsible: form.responsible,
      priority: form.priority,
      recurrence: normalizeRecurrenceConfig(form.frequency, form.recurrence),
    };

    setIsSubmittingProcess(true);
    setProcessesError(null);

    try {
      if (editorMode === 'edit' && editingProcessId !== null) {
        const existingRecord = records.find((record) => record.id === editingProcessId);
        const updatedRecord = await updateProcess(editingProcessId, {
          ...normalizedForm,
          isActive: existingRecord?.isActive ?? true,
        });

        setRecords((currentRecords) =>
          currentRecords.map((record) => (record.id === editingProcessId ? updatedRecord : record)),
        );
      } else {
        const createdRecord = await createProcess(normalizedForm);
        setRecords((currentRecords) => [createdRecord, ...currentRecords]);
      }

      setProcessEditorOpen(false);
      resetForm();
    } catch (error) {
      setProcessesError(getErrorMessage(error, 'Unable to save process.'));
    } finally {
      setIsSubmittingProcess(false);
    }
  };

  const handleEditorOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }

    setProcessEditorOpen(open);
  };

  const renderCell = (record: ProcessRecord, columnId: ProcessColumnId) => {
    switch (columnId) {
      case 'folio':
        return <span className="text-sm font-semibold text-slate-900 dark:text-white">{record.folio}</span>;
      case 'unit':
        return (
          <InlineSelectField
            value={record.unit}
            options={inlineUnitOptions}
            onChange={(nextValue) =>
              void persistRecordChange(record.id, (currentRecord) => ({ ...currentRecord, unit: nextValue }))
            }
            disabled={isRecordPending(record.id)}
          />
        );
      case 'business':
        return (
          <InlineSelectField
            value={record.business}
            options={inlineBusinessOptions}
            onChange={(nextValue) =>
              void persistRecordChange(record.id, (currentRecord) => ({ ...currentRecord, business: nextValue }))
            }
            disabled={isRecordPending(record.id)}
          />
        );
      case 'title':
        return (
          <div className="min-w-[240px] space-y-2">
            <InlineTextCell
              value={record.title}
              onCommit={(nextValue) => handleInlineTextCommit(record.id, 'title', nextValue)}
              placeholder="Enter process title"
              className="font-semibold text-slate-900 dark:text-white"
              disabled={isRecordPending(record.id)}
            />
            <span
              className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                record.isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300',
              )}
            >
              {record.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      case 'description':
        return (
          <InlineTextareaCell
            value={record.description}
            onCommit={(nextValue) => handleInlineTextCommit(record.id, 'description', nextValue)}
            placeholder="Describe the recurring process"
            className="min-h-[96px] min-w-[320px] rounded-xl border-slate-200 bg-white px-4 py-3 text-base leading-6 text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            disabled={isRecordPending(record.id)}
          />
        );
      case 'createdAt':
        return <span className="text-sm text-slate-700 dark:text-slate-200">{formatDate(record.createdAt)}</span>;
      case 'frequency':
        return (
          <div className="min-w-[220px] space-y-2">
            <InlineSelectField
              value={record.frequency}
              options={frequencyOptions}
              onChange={(nextValue) =>
                void persistRecordChange(record.id, (currentRecord) => ({
                  ...currentRecord,
                  frequency: nextValue,
                  recurrence: normalizeRecurrenceConfig(nextValue, currentRecord.recurrence),
                }))
              }
              className="min-w-[180px]"
              renderValue={(value) => <span className="font-semibold">{frequencyLabels[value]}</span>}
              disabled={isRecordPending(record.id)}
            />
            <p className="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {describeProcessFrequency(record.frequency, record.recurrence)}
            </p>
          </div>
        );
      case 'creator':
        return (
          <div className="min-w-[160px] whitespace-normal text-sm leading-snug text-slate-700 dark:text-slate-200">
            {record.creator}
          </div>
        );
      case 'responsible':
        return (
          <InlineSelectField
            value={record.responsible}
            options={inlineCollaboratorOptions}
            onChange={(nextValue) =>
              void persistRecordChange(record.id, (currentRecord) => ({ ...currentRecord, responsible: nextValue }))
            }
            disabled={isRecordPending(record.id)}
          />
        );
      case 'priority':
        return (
          <InlineSelectField
            value={record.priority}
            options={Object.entries(priorityLabels).map(([value, label]) => ({
              value: value as ProcessPriority,
              label,
            }))}
            onChange={(nextValue) =>
              void persistRecordChange(record.id, (currentRecord) => ({ ...currentRecord, priority: nextValue }))
            }
            className={cn('min-w-[136px] border font-semibold', prioritySelectClasses[record.priority])}
            renderValue={(value) => <span className="font-semibold">{priorityLabels[value]}</span>}
            disabled={isRecordPending(record.id)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <section className="mb-5 rounded-lg border border-[rgb(235,165,52)]/30 bg-[rgb(235,165,52)]/10 p-6 shadow-sm dark:border-[rgb(235,165,52)]/40 dark:bg-[rgb(235,165,52)]/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <span className="text-2xl">⚙️</span>
              Processes
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Create and assign recurring tasks here so they automatically appear in each collaborator calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-4 shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onClick={() => setIsColumnsDialogOpen(true)}
              disabled={isLoadingProcesses}
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
            <Button
              className={cn('h-11 gap-2 rounded-xl px-4', accentButtonClass)}
              onClick={openCreateDialog}
              disabled={isLoadingProcesses}
            >
              <Plus className="h-4 w-4" />
              Add process
            </Button>
          </div>
        </div>
      </section>

      {processesError ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{processesError}</span>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl border-red-200 bg-white px-4 text-red-700 shadow-none dark:border-red-900/60 dark:bg-slate-800 dark:text-red-200"
              onClick={() => {
                void loadProcesses();
              }}
            >
              Retry
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-white">Filters</h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Search process</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Folio, title, description, unit, or collaborator"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          </div>
          <FilterSelect
            label="Unit"
            value={unitFilter}
            onChange={(value) => setUnitFilter(value)}
            options={localizedUnitOptions}
          />
          <FilterSelect
            label="Business"
            value={businessFilter}
            onChange={(value) => setBusinessFilter(value)}
            options={localizedBusinessOptions}
          />
          <FilterSelect
            label="Collaborator"
            value={collaboratorFilter}
            onChange={(value) => setCollaboratorFilter(value)}
            options={localizedCollaboratorOptions}
          />
          <FilterSelect
            label="Frequency"
            value={frequencyFilter}
            onChange={(value) => setFrequencyFilter(value)}
            options={localizedFrequencyOptions}
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          ⚙️ <span className="font-medium text-slate-900 dark:text-white">{records.length}</span> recurring processes
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ▶ <span className="font-medium text-emerald-600">{activeCount}</span> active
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          ⏸ <span className="font-medium text-slate-600 dark:text-slate-300">{inactiveCount}</span> inactive
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          🔎 <span className="font-medium text-[rgb(235,165,52)]">{visibleCount}</span> visible after filters
        </span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Table className="min-w-[1760px]">
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-700">
              {visibleColumns.map((column) => (
                <TableHead key={column.id} className="px-5 py-6">
                  <button
                    type="button"
                    onClick={() => handleSort(column.id)}
                    className="flex items-center gap-2 text-left text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400"
                  >
                    <span>{column.label}</span>
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </TableHead>
              ))}
              <TableHead className="px-5 py-6 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow
                key={record.id}
                className={cn(
                  'border-slate-200 dark:border-slate-700',
                  !record.isActive && 'bg-slate-50/80 dark:bg-slate-900/40',
                )}
              >
                {visibleColumns.map((column) => (
                  <TableCell
                    key={`${record.id}-${column.id}`}
                    className={cn(
                      'px-5 py-6 align-middle',
                      column.id === 'description' || column.id === 'title' ? 'whitespace-normal' : '',
                    )}
                  >
                    {renderCell(record, column.id)}
                  </TableCell>
                ))}
                <TableCell className="px-5 py-6">
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                    <ProcessActionButton
                      label={record.isActive ? 'Deactivate process' : 'Activate process'}
                      onClick={() => {
                        void handleToggleActive(record.id);
                      }}
                      disabled={isRecordPending(record.id)}
                      className={
                        record.isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60'
                      }
                      icon={
                        record.isActive ? (
                          <PauseCircle className="h-4 w-4" />
                        ) : (
                          <PlayCircle className="h-4 w-4" />
                        )
                      }
                    />
                    <ProcessActionButton
                      label="Edit process"
                      onClick={() => openEditDialog(record)}
                      disabled={isRecordPending(record.id)}
                      className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                      icon={<Pencil className="h-4 w-4" />}
                    />
                    <ProcessActionButton
                      label="Copy process"
                      onClick={() => {
                        void handleDuplicate(record);
                      }}
                      disabled={isRecordPending(record.id)}
                      className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      icon={<Copy className="h-4 w-4" />}
                    />
                    <ProcessActionButton
                      label="Delete process"
                      onClick={() => {
                        void handleDelete(record.id);
                      }}
                      disabled={isRecordPending(record.id)}
                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {isLoadingProcesses ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  Loading recurring processes...
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoadingProcesses && sortedRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-16 text-center text-base text-slate-500 dark:text-slate-400"
                >
                  No recurring processes match the current filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>

      <ProcessFormDialog
        open={processEditorOpen}
        onOpenChange={handleEditorOpenChange}
        mode={editorMode}
        onSubmit={handleSubmit}
        form={form}
        isSubmitting={isSubmittingProcess}
        setForm={setForm}
        unitOptions={unitOptions}
        businessOptions={businessOptions}
        collaboratorOptions={collaboratorOptions}
      />

      <ProcessColumnsDialog
        open={isColumnsDialogOpen}
        onOpenChange={setIsColumnsDialogOpen}
        columns={columns}
        onColumnsChange={setColumns}
      />
    </>
  );
}
