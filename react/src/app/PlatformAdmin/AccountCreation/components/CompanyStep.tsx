import { useCustomerAccountCopy } from "../../Customers/useCustomerAccountCopy";
import { countryLabel, flowOptionLabel } from "../../flowOptions";
import { Building2 } from "lucide-react";
import type { EditablePlatformAccountType, PlatformAccountCreatePayload } from "../../../api/platformAdmin";
import { countryOptions, industryOptions } from "../../flowOptions";
import type { AccountCreationCopy } from "../translations";
import {
  AccountField,
  AccountStepTitle,
  accountControlClass,
} from "./AccountCreationPrimitives";
import { MAX_ACCOUNT_EMPLOYEES } from "../accountCreationUtils";

type CompanyStepProps = {
  copy: AccountCreationCopy;
  form: PlatformAccountCreatePayload;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<PlatformAccountCreatePayload>) => void;
  lockedAccountType?: EditablePlatformAccountType;
};

export function CompanyStep({
  copy,
  form,
  nameInputRef,
  onChange,
  lockedAccountType,
}: CompanyStepProps) {
  const { locale } = useCustomerAccountCopy();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <AccountStepTitle
        number="1"
        icon={Building2}
        title={copy.company.title}
        description={copy.company.description}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AccountField label={copy.company.name}>
          <input
            ref={nameInputRef}
            required
            minLength={2}
            maxLength={120}
            autoFocus
            value={form.company_name}
            onChange={(event) => onChange({ company_name: event.target.value })}
            className={accountControlClass}
            placeholder={copy.company.namePlaceholder}
          />
        </AccountField>
        <AccountField label={copy.company.country}>
          <select
            value={form.country_code}
            onChange={(event) =>
              onChange({
                country_code: event.target
                  .value as PlatformAccountCreatePayload["country_code"],
              })
            }
            className={accountControlClass}
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {countryLabel(country.code, locale)}
              </option>
            ))}
          </select>
        </AccountField>
        <AccountField label={copy.company.accountType}>
          <select
            value={form.account_type}
            disabled={Boolean(lockedAccountType)}
            onChange={(event) =>
              onChange({
                account_type: event.target
                  .value as PlatformAccountCreatePayload["account_type"],
              })
            }
            className={`${accountControlClass} disabled:cursor-not-allowed disabled:bg-[#59C3A5]/10 disabled:text-[#176B5B]`}
          >
            <option value="SUPER_ADMIN">{copy.company.superAdmin}</option>
            <option value="DISTRIBUTOR">{copy.company.distributor}</option>
          </select>
        </AccountField>
        <AccountField label={copy.company.industry}>
          <select
            value={form.industry || ""}
            onChange={(event) => onChange({ industry: event.target.value })}
            className={accountControlClass}
          >
            <option value="">{copy.company.unspecified}</option>
            {industryOptions.map((industry) => (
              <option key={flowOptionLabel(industry, locale)} value={flowOptionLabel(industry, locale)}>
                {flowOptionLabel(industry, locale)}
              </option>
            ))}
          </select>
        </AccountField>
        <AccountField label={copy.company.employees}>
          <input
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_ACCOUNT_EMPLOYEES}
            step={1}
            value={form.employee_count || ""}
            onChange={(event) =>
              onChange({ employee_count: Number(event.target.value) })
            }
            className={accountControlClass}
            placeholder={copy.company.employeesPlaceholder}
            aria-describedby="account-employee-count-help"
          />
          <span
            id="account-employee-count-help"
            className="block text-xs font-normal leading-4 text-slate-500"
          >
            {copy.company.employeesHint}
          </span>
        </AccountField>
      </div>
    </section>
  );
}
