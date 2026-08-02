import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../components/ui/utils';

interface ProgressSliderProps {
  className?: string;
  disabled?: boolean;
  label: string;
  max?: number;
  min?: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void | Promise<void>;
  value: number;
}

function clampSliderValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

export function ProgressSlider({
  className,
  disabled = false,
  label,
  max = 100,
  min = 0,
  onChange,
  onCommit,
  value,
}: ProgressSliderProps) {
  const normalizedValue = useMemo(() => clampSliderValue(value, min, max), [max, min, value]);
  const [draftValue, setDraftValue] = useState(normalizedValue);

  useEffect(() => {
    setDraftValue(normalizedValue);
  }, [normalizedValue]);

  const commitValue = (nextValue = draftValue) => {
    const normalizedNextValue = clampSliderValue(nextValue, min, max);

    if (normalizedNextValue !== normalizedValue) {
      void onCommit?.(normalizedNextValue);
    }
  };

  const handleChange = (nextValue: number) => {
    const normalizedNextValue = clampSliderValue(nextValue, min, max);
    setDraftValue(normalizedNextValue);
    onChange?.(normalizedNextValue);
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="min-w-[3.5rem] rounded-full border border-slate-200 bg-white px-2.5 py-1 text-center text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          {draftValue}%
        </span>
      </div>
      <div
        className={cn(
          'relative h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
          disabled && 'opacity-60',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[#F4C84A]"
          style={{ width: `${draftValue}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={draftValue}
          disabled={disabled}
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 disabled:cursor-not-allowed"
          onBlur={() => commitValue()}
          onChange={(event) => handleChange(Number(event.target.value))}
          onKeyUp={() => commitValue()}
          onMouseUp={() => commitValue()}
          onTouchEnd={() => commitValue()}
        />
      </div>
    </div>
  );
}
