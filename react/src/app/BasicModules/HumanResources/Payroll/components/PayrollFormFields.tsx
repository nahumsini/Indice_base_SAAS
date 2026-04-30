type SelectOption = {
    value: string;
    label: string;
};

type SelectFieldProps = {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
};

export function SelectField({
    label,
    value,
    options,
    onChange,
}: SelectFieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-[#143675] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

type DateFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    helperText?: string;
};

export function DateField({
    label,
    value,
    onChange,
    disabled = false,
    helperText,
}: DateFieldProps) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</label>
            <input
                type="date"
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-none focus:border-[#143675] focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
            />
            {helperText ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
            ) : null}
        </div>
    );
}
