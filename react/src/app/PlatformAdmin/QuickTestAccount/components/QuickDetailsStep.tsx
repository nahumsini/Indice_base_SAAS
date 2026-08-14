import { ClipboardCheck, ShieldCheck } from "lucide-react";
import {
  AccountField,
  AccountStepTitle,
  accountControlClass,
} from "../../AccountCreation/components/AccountCreationPrimitives";
import { MAX_ACCOUNT_EMPLOYEES } from "../../AccountCreation/accountCreationUtils";
import { countryOptions, trialDayOptions } from "../../flowOptions";
import type { QuickTestAccountCopy } from "../translations";
import type {
  QuickTestDraft,
  QuickTestScenarioOption,
} from "../types";

export function QuickDetailsStep({
  copy,
  draft,
  option,
  moduleCount,
  onChange,
}: {
  copy: QuickTestAccountCopy;
  draft: QuickTestDraft;
  option: QuickTestScenarioOption;
  moduleCount: number;
  onChange: (patch: Partial<QuickTestDraft>) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <AccountStepTitle
        number="2"
        icon={ClipboardCheck}
        title={copy.details.title}
        description={copy.details.description}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AccountField label={copy.details.companyName}>
          <input
            required
            minLength={2}
            maxLength={120}
            autoFocus
            value={draft.company_name}
            onChange={(event) => onChange({ company_name: event.target.value })}
            className={accountControlClass}
          />
        </AccountField>
        <AccountField label={copy.details.country}>
          <select
            value={draft.country_code}
            onChange={(event) =>
              onChange({
                country_code: event.target
                  .value as QuickTestDraft["country_code"],
              })
            }
            className={accountControlClass}
          >
            {countryOptions.map((country) => (
              <option key={country.code} value={country.code}>
                {country.label}
              </option>
            ))}
          </select>
        </AccountField>
        <AccountField label={copy.details.ownerName}>
          <input
            maxLength={120}
            value={draft.owner_name}
            onChange={(event) => onChange({ owner_name: event.target.value })}
            className={accountControlClass}
          />
        </AccountField>
        <AccountField label={copy.details.ownerEmail}>
          <input
            required
            type="email"
            maxLength={160}
            value={draft.owner_email}
            onChange={(event) => onChange({ owner_email: event.target.value })}
            className={accountControlClass}
          />
        </AccountField>
        <AccountField label={copy.details.employees}>
          <input
            required
            type="number"
            min={1}
            max={MAX_ACCOUNT_EMPLOYEES}
            step={1}
            value={draft.employee_count}
            onChange={(event) =>
              onChange({ employee_count: Number(event.target.value) })
            }
            className={accountControlClass}
          />
        </AccountField>
        <AccountField label={copy.details.trial}>
          <select
            value={draft.access_days}
            onChange={(event) =>
              onChange({
                access_days: Number(event.target.value) as QuickTestDraft["access_days"],
              })
            }
            className={accountControlClass}
          >
            {trialDayOptions.map((days) => (
              <option key={days} value={days}>
                {copy.scenario.days(days)}
              </option>
            ))}
          </select>
        </AccountField>
      </div>
      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#143675]">
          <ShieldCheck className="h-4 w-4" />
          {copy.details.summary}
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">{copy.details.scenario}</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">{option.label}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{copy.details.access}</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {copy.scenario.modules(moduleCount)} · {copy.scenario.days(draft.access_days)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{copy.details.capacity}</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">
              {copy.scenario.employees(draft.employee_count)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-blue-100 pt-3 text-xs leading-5 text-[#143675]">
          {copy.details.notice}
        </p>
      </div>
    </section>
  );
}
