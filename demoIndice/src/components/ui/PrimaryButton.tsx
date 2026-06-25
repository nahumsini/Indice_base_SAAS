import type { ButtonHTMLAttributes, ReactNode } from 'react';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className = '', ...buttonProps }: PrimaryButtonProps) {
  return (
    <button {...buttonProps} className={`primary-button ${className}`.trim()}>
      {children}
    </button>
  );
}
