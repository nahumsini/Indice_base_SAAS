import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../../components/ui/command';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';
import type { SelectOption } from './ExpenseInlineControls';

export function ExpenseAccountSelect({ label, value, options, onChange, disabled = false, emptyLabel, allowEmpty = true }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  allowEmpty?: boolean;
}) {
  const t = useExpensesTranslations();
  const unassigned = emptyLabel ?? t.common.unassigned;
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return <Popover modal open={open && !disabled} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" role="combobox" aria-expanded={open} aria-label={label} disabled={disabled}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <span className="truncate">{selected?.label || value || unassigned}</span><ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="z-[100] w-[min(340px,calc(100vw-32px))] p-0">
      <Command>
        <CommandInput aria-label={`${t.common.search} ${label}`} placeholder={`${t.common.search}…`} />
        <CommandList>
          <CommandEmpty>{t.common.noOptions}</CommandEmpty>
          <CommandGroup>
            {[...(allowEmpty ? [{ value: '', label: unassigned }] : []), ...options.filter(option => option.value)].map(option => (
              <CommandItem className="min-h-11" key={option.value} value={`${option.label} ${option.value}`} onSelect={() => { onChange(option.value); setOpen(false); }}>
                <Check className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} />{option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
