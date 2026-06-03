import { cn } from '../../../../../../components/ui/utils';
import { HelperText } from '../components/HelperText';
import { modalControlClassName, modalLabelClassName } from '../styles';

interface TextFieldProps {
  autoComplete?: string;
  error?: string;
  helperText?: string;
  label: string;
  name?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  type?: string;
  value: string;
}

export function TextField({
  autoComplete,
  error,
  helperText,
  label,
  name,
  onChange,
  placeholder,
  readOnly = false,
  required = false,
  type = 'text',
  value,
}: TextFieldProps) {
  return (
    <div>
      <label className={modalLabelClassName}>
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className={cn(
          modalControlClassName,
          readOnly && 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500',
        )}
      />
      {error ? (
        <HelperText tone="error">{error}</HelperText>
      ) : helperText ? (
        <HelperText>{helperText}</HelperText>
      ) : null}
    </div>
  );
}
