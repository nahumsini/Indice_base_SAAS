import { useId } from "react";
import { Input } from "../../../../components/ui/input";

// Matches the Sales wizard form controls without coupling Mailing to the sale form.
export const campaignFieldClassName =
  "h-11 w-full min-w-0 rounded-xl border-slate-200 bg-white text-slate-950 shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function CampaignEditorField({
  name,
  label,
  value,
  maxLength,
  disabled,
  hint,
  placeholder,
  error,
  required,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  maxLength: number;
  disabled: boolean;
  hint?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
        {required && (
          <span
            aria-hidden="true"
            className="ml-1 text-[#B63B32] dark:text-[#FF9D94]"
          >
            *
          </span>
        )}
      </label>
      <Input
        id={id}
        name={name}
        className={campaignFieldClassName}
        value={value}
        maxLength={maxLength}
        type={name === "replyTo" ? "email" : "text"}
        disabled={disabled}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p
          id={`${id}-error`}
          className="text-xs leading-5 text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={`${id}-hint`}
            className="text-xs leading-5 text-slate-500 dark:text-slate-400"
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}
