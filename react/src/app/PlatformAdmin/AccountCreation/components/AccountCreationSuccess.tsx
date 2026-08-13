import {
  BadgeCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  PackageCheck,
} from "lucide-react";
import { useState } from "react";
import { writeClipboard } from "../accountCreationUtils";
import type { AccountCreationCopy } from "../translations";
import type { CreatedAccountAccess } from "../types";

export function AccountCreationSuccess({
  created,
  copy,
}: {
  created: CreatedAccountAccess;
  copy: AccountCreationCopy;
}) {
  const [copied, setCopied] = useState("");
  const copyValue = async (label: string, value: string) => {
    await writeClipboard(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  };
  const accessData = [
    copy.success.accessDataTitle,
    `${copy.success.loginPage}: ${window.location.origin}/login`,
    `${copy.success.company}: ${created.company_name}`,
    `${copy.success.email}: ${created.owner_email}`,
    `${copy.success.password}: ${created.temporaryPassword}`,
    `${copy.success.loadedModules}: ${(created.products ?? []).map((product) => product.name).join(", ")}`,
    "",
    copy.success.securityReminder,
  ].join("\n");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <BadgeCheck className="h-6 w-6" />
        </span>
        <h3 className="mt-3 text-lg font-semibold text-slate-950">
          {created.company_name}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {copy.success.created(created.company_id)}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-700 shadow-sm">
            <PackageCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">{copy.success.loadedModules}</h3>
            <p className="text-xs text-slate-500">
              {copy.success.loadedModulesDescription(created.products?.length ?? 0)}
            </p>
          </div>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {(created.products ?? []).map((product) => (
            <div key={product.code} className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
                <p className="truncate font-mono text-[11px] text-slate-500">{product.code}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="font-semibold text-slate-900">
              {copy.success.initialAccess}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {copy.success.oneTimePassword}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copyValue("all", accessData)}
            className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${copied === "all" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-[#143675] hover:bg-blue-100"}`}
          >
            {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied === "all" ? copy.success.copiedAll : copy.success.copyAll}
          </button>
        </div>
        <AccessRow label={copy.success.loginPage} value={`${window.location.origin}/login`} copied={copied === "login"} onCopy={() => copyValue("login", `${window.location.origin}/login`)} copy={copy} />
        <AccessRow label={copy.success.company} value={created.company_name} copied={copied === "company"} onCopy={() => copyValue("company", created.company_name)} copy={copy} />
        <AccessRow label={copy.success.email} value={created.owner_email} copied={copied === "email"} onCopy={() => copyValue("email", created.owner_email)} copy={copy} />
        <AccessRow label={copy.success.password} value={created.temporaryPassword} secret copied={copied === "password"} onCopy={() => copyValue("password", created.temporaryPassword)} copy={copy} />
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{copy.success.securityShare}</p>
      </div>
    </div>
  );
}

function AccessRow({ label, value, secret = false, copied, onCopy, copy }: {
  label: string; value: string; secret?: boolean; copied: boolean;
  onCopy: () => void; copy: AccountCreationCopy;
}) {
  const [revealed, setRevealed] = useState(!secret);
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-900">
          {revealed ? value : "••••••••••••••••"}
        </p>
      </div>
      {secret ? (
        <button type="button" onClick={() => setRevealed((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500" aria-label={revealed ? copy.actions.hidePassword : copy.actions.showPassword}>
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : null}
      <button type="button" onClick={onCopy} className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? copy.success.copied : copy.success.copy}
      </button>
    </div>
  );
}
