import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../../../../components/ui/utils';
import { HelperText } from '../components/HelperText';
import type { OrganizationOption, OrganizationOptionTone } from '../model';
import { modalControlClassName, modalLabelClassName } from '../styles';

const organizationToneOrder: Record<OrganizationOptionTone, number> = {
  corporate: 0,
  unit: 1,
  business: 2,
  default: 3,
};

const getOrganizationToneClassNames = (tone: OrganizationOptionTone = 'default', isSelected = false) => {
  if (tone === 'corporate') {
    return {
      option: isSelected
        ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
        : 'border-transparent text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-500/10',
      badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20',
    };
  }

  if (tone === 'unit') {
    return {
      option: isSelected
        ? 'border-[#59C3A5]/20 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100'
        : 'border-transparent text-slate-700 hover:bg-[#59C3A5]/5 dark:text-slate-200 dark:hover:bg-blue-400/10',
      badge: 'bg-[#59C3A5]/10 text-[#59C3A5] ring-[#59C3A5]/15 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-300/20',
    };
  }

  if (tone === 'business') {
    return {
      option: isSelected
        ? 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
        : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
      badge: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    };
  }

  return {
    option: isSelected
      ? 'border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
      : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  };
};

interface OrganizationSelectFieldProps {
  disabled?: boolean;
  error?: string;
  helperText?: string;
  helperTone?: 'default' | 'warning';
  label: string;
  name?: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<OrganizationOption>;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function OrganizationSelectField({
  disabled = false,
  error,
  helperText,
  helperTone = 'default',
  label,
  name,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: OrganizationSelectFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find((option) => option.value === value);
  const canOpen = !disabled && options.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, options, value]);

  const selectOption = (option: OrganizationOption) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!canOpen) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!canOpen) {
        return;
      }
      setIsOpen(true);
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && isOpen && canOpen) {
      event.preventDefault();
      selectOption(options[activeIndex] ?? options[0]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => {
          if (canOpen) {
            setIsOpen((current) => !current);
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          'flex h-auto min-h-11 items-center justify-between gap-3 text-left',
          !selectedOption && 'text-slate-400',
          disabled && 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate">
            {selectedOption?.label || placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedOption.description}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedOption?.badge ? (
            <span className={cn(
              'hidden rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 sm:inline-flex',
              getOrganizationToneClassNames(selectedOption.tone).badge,
            )}>
              {selectedOption.badge}
            </span>
          ) : null}
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen && canOpen ? (
        <div className="absolute left-0 right-0 z-[70] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-72 overflow-y-auto">
            {placeholder ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span>{placeholder}</span>
                {!value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ) : null}

            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = activeIndex === index;
              const toneClassNames = getOrganizationToneClassNames(option.tone, isSelected);

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'mt-1 flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors first:mt-0',
                    toneClassNames.option,
                    isActive && !isSelected && 'bg-slate-50 dark:bg-slate-800',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{option.label}</span>
                    {option.description ? (
                      <span className="mt-0.5 block text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {option.badge ? (
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-medium ring-1',
                        toneClassNames.badge,
                      )}>
                        {option.badge}
                      </span>
                    ) : null}
                    {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : helperText ? (
        <HelperText tone={helperTone}>{helperText}</HelperText>
      ) : null}
    </div>
  );
}
