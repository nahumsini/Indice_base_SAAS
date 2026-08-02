import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../../../../../components/ui/utils';
import type { EmployeeModalTranslations } from '../../../translations/types';
import { HelperText } from '../components/HelperText';
import { normalizeOptionLabel } from '../model';
import { modalControlClassName, modalLabelClassName } from '../styles';

interface CreatableOptionFieldProps {
  copy: EmployeeModalTranslations['creatableOptions'];
  error?: string;
  helperText?: string;
  label: string;
  name?: string;
  onAddOption: (value: string) => boolean;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function CreatableOptionField({
  copy,
  error,
  helperText,
  label,
  name,
  onAddOption,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: CreatableOptionFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedValue = normalizeOptionLabel(value);
  const hasMatchingOption = options.some(
    (option) => option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase(),
  );
  const canAddCurrentValue = Boolean(normalizedValue) && !hasMatchingOption;
  const filteredOptions = useMemo(() => {
    const searchValue = normalizedValue.toLocaleLowerCase();
    if (!searchValue) {
      return options;
    }

    return options.filter((option) => option.toLocaleLowerCase().includes(searchValue));
  }, [normalizedValue, options]);
  const visibleOptions = filteredOptions.slice(0, 8);
  const actionCount = visibleOptions.length + (canAddCurrentValue ? 1 : 0);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(''), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

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
    setActiveIndex(0);
  }, [normalizedValue, isOpen]);

  const commitCustomOption = () => {
    if (!canAddCurrentValue) {
      return;
    }

    if (onAddOption(normalizedValue)) {
      setFeedback(copy.saved);
    }
    onChange(normalizedValue);
    setIsOpen(false);
  };

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (actionCount > 0 ? (current + 1) % actionCount : 0));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (actionCount > 0 ? (current - 1 + actionCount) % actionCount : 0));
      return;
    }

    if (event.key === 'Enter' && isOpen && actionCount > 0) {
      event.preventDefault();
      if (activeIndex < visibleOptions.length) {
        selectOption(visibleOptions[activeIndex]);
        return;
      }
      commitCustomOption();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <div className="relative">
        <input
          name={name}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={commitCustomOption}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={cn(
            modalControlClassName,
            'pr-11',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
          )}
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#59C3A5]/10 hover:text-[#59C3A5] dark:text-slate-300 dark:hover:bg-blue-400/10 dark:hover:text-blue-200"
          aria-label={label}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && actionCount > 0 ? (
        <div className="absolute left-0 right-0 z-[70] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-64 overflow-y-auto">
            {visibleOptions.map((option, index) => {
              const isSelected = option.toLocaleLowerCase() === normalizedValue.toLocaleLowerCase();
              const isActive = activeIndex === index;

              return (
                <button
                  key={option}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[#59C3A5]/10 text-[#59C3A5] dark:bg-blue-400/10 dark:text-blue-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
                  )}
                >
                  <span>{option}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}

            {canAddCurrentValue ? (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={commitCustomOption}
                className={cn(
                  'mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  activeIndex === visibleOptions.length
                    ? 'border-[#59C3A5]/40 bg-[#59C3A5]/10 text-[#59C3A5] dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200'
                    : 'border-[#59C3A5]/20 bg-[#59C3A5]/5 text-[#59C3A5] hover:bg-[#59C3A5]/10 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200',
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>{copy.add} "{normalizedValue}"</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : feedback ? (
        <HelperText tone="success">{feedback}</HelperText>
      ) : helperText ? (
        <HelperText>{helperText}</HelperText>
      ) : (
        <HelperText>{copy.helper}</HelperText>
      )}
    </div>
  );
}
