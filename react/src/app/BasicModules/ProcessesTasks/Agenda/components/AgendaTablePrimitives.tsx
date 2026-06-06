import { useEffect, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { Input } from '../../../../components/ui/input';
import { TableHead } from '../../../../components/ui/table';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';

type AgendaSortDirection = 'asc' | 'desc';

export const tableInputClass =
  'h-10 min-w-0 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

export const tableTextareaClass =
  'min-h-[76px] rounded-xl border-slate-200 bg-white text-sm leading-5 text-slate-700 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

export const tableSelectTriggerClass =
  'h-10 rounded-xl border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100';

const actionButtonBaseClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function TableActionButton({
  className,
  icon,
  label,
  onClick,
  disabled,
}: {
  className: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(actionButtonBaseClass, className)}
    >
      {icon}
    </button>
  );
}

interface AgendaColumnResizeHandleProps<TColumnId extends string> {
  columnId: TColumnId;
  onResizeStart: (event: ReactMouseEvent, columnId: TColumnId) => void;
  resizeLabel: string;
  resizingColumn: TColumnId | null;
}

function AgendaColumnResizeHandle<TColumnId extends string>({
  columnId,
  onResizeStart,
  resizeLabel,
  resizingColumn,
}: AgendaColumnResizeHandleProps<TColumnId>) {
  return (
    <button
      type="button"
      title={resizeLabel}
      aria-label={resizeLabel}
      onMouseDown={(event) => onResizeStart(event, columnId)}
      className={cn(
        'absolute bottom-0 right-0 top-0 flex w-3 cursor-col-resize items-center justify-center opacity-0 transition-opacity hover:bg-[#F4C84A]/20 group-hover:opacity-100',
        resizingColumn === columnId && 'bg-[#F4C84A]/25 opacity-100',
      )}
    >
      <GripVertical className="h-4 w-4 text-[#9A6B05]" />
    </button>
  );
}

interface AgendaSortableTableHeadProps<TColumnId extends string, TResizeColumnId extends string> {
  column: ColumnConfig;
  onResizeStart: (event: ReactMouseEvent, columnId: TResizeColumnId) => void;
  resizeLabel: string;
  onSort: (columnId: TColumnId) => void;
  resizingColumn: TResizeColumnId | null;
  sortState: {
    columnId: TColumnId;
    direction: AgendaSortDirection;
  };
  width: number;
}

export function AgendaSortableTableHead<TColumnId extends string, TResizeColumnId extends string>({
  column,
  onResizeStart,
  resizeLabel,
  onSort,
  resizingColumn,
  sortState,
  width,
}: AgendaSortableTableHeadProps<TColumnId, TResizeColumnId>) {
  const columnId = column.id as TColumnId;
  const isActiveSort = sortState.columnId === columnId;
  const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className="group relative px-5 py-5"
      style={{ width, minWidth: width }}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left text-sm font-semibold text-slate-500 transition-colors hover:text-[#9A6B05] dark:text-slate-400"
          onClick={() => onSort(columnId)}
        >
          <span className="truncate">{column.label}</span>
          <SortIcon
            className={cn(
              'h-4 w-4 shrink-0',
              isActiveSort ? 'text-[#9A6B05]' : 'text-slate-400',
            )}
          />
        </button>
        <AgendaColumnResizeHandle
          columnId={columnId as unknown as TResizeColumnId}
          resizeLabel={resizeLabel}
          resizingColumn={resizingColumn}
          onResizeStart={onResizeStart}
        />
      </div>
    </TableHead>
  );
}

interface AgendaStaticTableHeadProps<TColumnId extends string> {
  column: ColumnConfig;
  columnId: TColumnId;
  onResizeStart: (event: ReactMouseEvent, columnId: TColumnId) => void;
  resizeLabel: string;
  resizingColumn: TColumnId | null;
  width: number;
}

export function AgendaStaticTableHead<TColumnId extends string>({
  column,
  columnId,
  onResizeStart,
  resizeLabel,
  resizingColumn,
  width,
}: AgendaStaticTableHeadProps<TColumnId>) {
  return (
    <TableHead
      className="group relative px-5 py-5"
      style={{ width, minWidth: width }}
    >
      <div className="flex min-w-0 items-center justify-between gap-3 pr-2">
        <span className="truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{column.label}</span>
        <AgendaColumnResizeHandle
          columnId={columnId}
          resizeLabel={resizeLabel}
          resizingColumn={resizingColumn}
          onResizeStart={onResizeStart}
        />
      </div>
    </TableHead>
  );
}

interface InlineTextInputProps {
  value: string | null | undefined;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void | Promise<void>;
}

export function InlineTextInput({ value, placeholder, disabled = false, className, onCommit }: InlineTextInputProps) {
  const normalizedValue = value ?? '';
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue === normalizedValue.trim()) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape') {
      setDraft(normalizedValue);
    }
  };

  return (
    <Input
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(tableInputClass, className)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

interface InlineTextAreaProps {
  value: string | null | undefined;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void | Promise<void>;
}

export function InlineTextArea({ value, placeholder, disabled = false, className, onCommit }: InlineTextAreaProps) {
  const normalizedValue = value ?? '';
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue === normalizedValue.trim()) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(nextValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      commit();
    }

    if (event.key === 'Escape') {
      setDraft(normalizedValue);
    }
  };

  return (
    <Textarea
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(tableTextareaClass, className)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
