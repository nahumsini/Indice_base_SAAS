import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  action?: ReactNode;
};

export function PasswordField({ label, showPassword, onTogglePassword, action, id, ...inputProps }: PasswordFieldProps) {
  const inputId = id ?? String(inputProps.name);

  return (
    <div className="field">
      <div className="password-label-row">
        <label htmlFor={inputId}>{label}</label>
        {action}
      </div>
      <div className="field-control">
        <LockKeyhole className="field-icon" aria-hidden />
        <input
          {...inputProps}
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          className="has-icon has-action"
        />
        <button
          type="button"
          className="field-action"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </button>
      </div>
    </div>
  );
}
