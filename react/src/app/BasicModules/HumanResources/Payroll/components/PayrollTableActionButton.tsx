import { type ReactElement } from 'react';

type PayrollTableActionButtonProps = {
    icon: ReactElement;
    label: string;
    onClick: () => void;
    disabled: boolean;
    toneClassName: string;
};

export function PayrollTableActionButton({
    icon,
    label,
    onClick,
    disabled,
    toneClassName,
}: PayrollTableActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            disabled={disabled}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800/80 ${toneClassName}`}
        >
            {icon}
        </button>
    );
}
