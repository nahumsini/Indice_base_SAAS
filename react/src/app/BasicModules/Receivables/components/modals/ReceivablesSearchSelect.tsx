import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';

export type ReceivablesSearchSelectOption = {
  id: string;
  label: string;
  searchText?: string;
};

interface ReceivablesSearchSelectProps {
  emptyLabel: string;
  label: string;
  onChange: (id: string) => void;
  options: ReceivablesSearchSelectOption[];
  searchLabel: string;
  searchPlaceholder: string;
  value: string;
}

export function ReceivablesSearchSelect({
  emptyLabel,
  label,
  onChange,
  options,
  searchLabel,
  searchPlaceholder,
  value,
}: ReceivablesSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.id === value);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    const sortedOptions = [...options]
      .sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }))
      .filter((option) => !normalizedQuery || `${option.label} ${option.searchText ?? ''}`.toLocaleLowerCase().includes(normalizedQuery));

    return selectedOption && !sortedOptions.some((option) => option.id === selectedOption.id)
      ? [selectedOption, ...sortedOptions]
      : sortedOptions;
  }, [options, query, value]);

  const closeMenu = () => {
    window.setTimeout(() => setIsOpen(false), 120);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          aria-label={searchLabel}
          className="h-11 rounded-xl border-slate-200 bg-white pl-9 pr-10 dark:border-slate-700 dark:bg-slate-950"
          onBlur={closeMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setIsOpen(true);
          }}
          placeholder={searchPlaceholder}
          value={isOpen ? query : selectedOption?.label ?? ''}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        {isOpen ? (
          <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {visibleOptions.length ? visibleOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-[#147514]/10 hover:text-[#147514] dark:text-slate-200 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id);
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            )) : <p className="px-3 py-4 text-sm font-medium text-slate-500">{emptyLabel}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
