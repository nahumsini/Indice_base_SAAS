import { Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import type { PlatformAccountCreatePayload } from "../../../api/platformAdmin";
import { validatePhoneForCountry } from "../../../shared/validation/phone";
import { generateTemporaryPassword } from "../accountCreationUtils";
import type { AccountCreationCopy } from "../translations";
import {
  AccountField,
  AccountStepTitle,
  accountControlClass,
} from "./AccountCreationPrimitives";

type OwnerStepProps = {
  copy: AccountCreationCopy;
  form: PlatformAccountCreatePayload;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  phoneInputRef: React.RefObject<HTMLInputElement | null>;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  showPassword: boolean;
  onChange: (patch: Partial<PlatformAccountCreatePayload>) => void;
  onShowPasswordChange: (show: boolean) => void;
};

export function OwnerStep({
  copy,
  form,
  emailInputRef,
  phoneInputRef,
  passwordInputRef,
  showPassword,
  onChange,
  onShowPasswordChange,
}: OwnerStepProps) {
  const normalizePhone = () => {
    if (!form.phone?.trim()) return;
    const validation = validatePhoneForCountry(form.phone, form.country_code);
    if (validation.ok) onChange({ phone: validation.international });
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <AccountStepTitle
        number="2"
        icon={KeyRound}
        title={copy.owner.title}
        description={copy.owner.description}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AccountField label={copy.owner.name}>
          <input
            maxLength={100}
            value={form.owner_name || ""}
            onChange={(event) => onChange({ owner_name: event.target.value })}
            className={accountControlClass}
            placeholder={copy.owner.namePlaceholder}
          />
        </AccountField>
        <AccountField label={copy.owner.email}>
          <input
            ref={emailInputRef}
            required
            type="email"
            maxLength={190}
            autoComplete="email"
            value={form.owner_email}
            onChange={(event) => onChange({ owner_email: event.target.value })}
            className={accountControlClass}
            placeholder={copy.owner.emailPlaceholder}
          />
        </AccountField>
        <AccountField label={copy.owner.phone}>
          <input
            ref={phoneInputRef}
            type="tel"
            inputMode="tel"
            maxLength={40}
            autoComplete="tel"
            value={form.phone || ""}
            onChange={(event) => onChange({ phone: event.target.value })}
            onBlur={normalizePhone}
            className={accountControlClass}
            placeholder={copy.owner.phonePlaceholder}
          />
        </AccountField>
        <AccountField label={copy.owner.password}>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                ref={passwordInputRef}
                required
                minLength={10}
                maxLength={72}
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={form.temporary_password}
                onChange={(event) =>
                  onChange({ temporary_password: event.target.value })
                }
                className={`${accountControlClass} pr-10 font-mono`}
              />
              <button
                type="button"
                onClick={() => onShowPasswordChange(!showPassword)}
                className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-slate-500"
                aria-label={
                  showPassword
                    ? copy.actions.hidePassword
                    : copy.actions.showPassword
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange({ temporary_password: generateTemporaryPassword() });
                onShowPasswordChange(true);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-[#59C3A5]/10 px-3 text-xs font-medium text-[#176B5B] hover:bg-[#59C3A5]/20 dark:border-[#59C3A5]/30 dark:text-[#8FE0CA]"
            >
              <Sparkles className="h-4 w-4" /> {copy.actions.generate}
            </button>
          </div>
        </AccountField>
      </div>
    </section>
  );
}
