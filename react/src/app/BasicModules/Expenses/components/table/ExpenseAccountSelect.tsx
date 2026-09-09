import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../../components/ui/command';
import type { SelectOption } from './ExpenseInlineControls';

export function ExpenseAccountSelect({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return <Popover modal open={open && !disabled} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" role="combobox" aria-expanded={open} aria-label={label} disabled={disabled}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <span className="truncate">{selected?.label || value || 'Sin asignar'}</span><ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="z-[100] w-[min(340px,calc(100vw-32px))] p-0">
      <Command>
        <CommandInput aria-label={`Buscar ${label.toLocaleLowerCase()}`} placeholder="Buscar por nombre o código…" />
        <CommandList>
          <CommandEmpty>No se encontraron cuentas.</CommandEmpty>
          <CommandGroup>
            {[{ value: '', label: 'Sin asignar' }, ...options.filter(option => option.value)].map(option => (
              <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => { onChange(option.value); setOpen(false); }}>
                <Check className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} />{option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>;
}
