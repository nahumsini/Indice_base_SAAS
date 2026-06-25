import type { ComponentType, InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

export function TextField({ label, error, icon: Icon, id, className = '', ...inputProps }: TextFieldProps) {
  const inputId = id ?? String(inputProps.name);
  const errorId = `${inputId}-error`;

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="field-control">
        {Icon ? <Icon className="field-icon" aria-hidden /> : null}
        <input
          {...inputProps}
          id={inputId}
          className={`${Icon ? 'has-icon' : ''} ${className}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error ? <p id={errorId} className="field-error">{error}</p> : null}
    </div>
  );
}
