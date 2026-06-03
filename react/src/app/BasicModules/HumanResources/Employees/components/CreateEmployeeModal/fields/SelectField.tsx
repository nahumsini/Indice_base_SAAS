import { cn } from '../../../../../../components/ui/utils';
import { HelperText } from '../components/HelperText';
import { modalControlClassName, modalLabelClassName } from '../styles';

interface SelectFieldProps {
  error?: string;
  label: string;
  name?: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  value: string;
}

export function SelectField({
  error,
  label,
  name,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: SelectFieldProps) {
  return (
    <div>
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          'cursor-pointer appearance-none',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <HelperText tone="error">{error}</HelperText> : null}
    </div>
  );
}
