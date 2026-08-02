import { useEffect, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ColumnConfig } from '../../../../components/rh/ColumnasConfigModal';
import { Input } from '../../../../components/ui/input';
import { TableHead } from '../../../../components/ui/table';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';

type SortDirection = 'asc' | 'desc';

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
  disabled,
  icon,
  label,
  onClick,
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

export function SortableHead<TColumnId extends string>({
  column,
  onResizeStart,
  onSort,
  resizeLabel,
  resizingColumn,
  sortState,
  width,
}: {
  column: ColumnConfig;
  onResizeStart?: (event: ReactMouseEvent, columnId: TColumnId) => void;
  onSort: (columnId: TColumnId) => void;
  resizeLabel?: string;
  resizingColumn?: string | null;
  sortState: {
    columnId: TColumnId;
    direction: SortDirection;
  };
  width?: number;
}) {
  const columnId = column.id as TColumnId;
  const isActiveSort = sortState.columnId === columnId;
  const SortIcon = isActiveSort ? (sortState.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className="group relative px-4 py-4" style={width ? { width, minWidth: width } : undefined}>
      <button
        type="button"
        className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-slate-500 transition-colors hover:text-[#9A6B05] dark:text-slate-400"
        onClick={() => onSort(columnId)}
      >
        <span className="truncate">{column.label}</span>
        <SortIcon
          className={cn('h-4 w-4 shrink-0', isActiveSort ? 'text-[#9A6B05]' : 'text-slate-400')}
        />
      </button>
      {onResizeStart ? (
        <div
          role="separator"
          aria-label={resizeLabel}
          aria-orientation="vertical"
          onMouseDown={(event) => onResizeStart(event, columnId)}
          className="absolute bottom-0 right-0 top-0 w-1 cursor-col-resize bg-transparent transition-colors hover:bg-[#F4C84A] group-hover:bg-[#F4C84A]/30"
          style={{ background: resizingColumn === columnId ? '#F4C84A' : undefined }}
        />
      ) : null}
    </TableHead>
  );
}

export function InlineTextInput({
  disabled = false,
  onCommit,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onCommit: (value: string) => void | Promise<void>;
  placeholder: string;
  value: string | null | undefined;
}) {
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
      className={tableInputClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

export function InlineTextArea({
  disabled = false,
  onCommit,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onCommit: (value: string) => void | Promise<void>;
  placeholder: string;
  value: string | null | undefined;
}) {
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
      className={tableTextareaClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}

export function InlineNumberInput({
  disabled = false,
  max = 100,
  min = 0,
  onCommit,
  onInvalid,
  placeholder,
  rangeMessage,
  value,
}: {
  disabled?: boolean;
  max?: number;
  min?: number;
  onCommit: (value: number | null) => void | Promise<void>;
  onInvalid?: (message: string) => void;
  placeholder: string;
  rangeMessage: (field: string, min: number, max: number) => string;
  value: number | null | undefined;
}) {
  const normalizedValue = value == null ? '' : String(value);
  const [draft, setDraft] = useState(normalizedValue);

  useEffect(() => {
    setDraft(normalizedValue);
  }, [normalizedValue]);

  const commit = () => {
    const normalizedDraft = draft.trim();
    if (!normalizedDraft) {
      if (value != null) {
        void onCommit(null);
      }
      return;
    }

    const parsedValue = Number(normalizedDraft);
    if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
      onInvalid?.(rangeMessage(placeholder, min, max));
      setDraft(normalizedValue);
      return;
    }

    if (parsedValue === value) {
      setDraft(normalizedValue);
      return;
    }

    void onCommit(parsedValue);
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
      type="number"
      min={min}
      max={max}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={tableInputClass}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  );
}
