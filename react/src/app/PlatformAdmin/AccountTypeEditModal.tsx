import { useCustomerAccountCopy } from "./Customers/useCustomerAccountCopy";
import { useState, type FormEvent } from "react";
import { Building2, LoaderCircle, PencilLine, ShieldCheck } from "lucide-react";
import type {
  EditablePlatformAccountType,
  PlatformCompanySummary,
} from "../api/platformAdmin";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../components/indice-modal";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export default function AccountTypeEditModal({
  company,
  english,
  saving,
  error,
  onClose,
  onSave,
}: {
  company: PlatformCompanySummary;
  english: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (accountType: EditablePlatformAccountType, reason: string) => Promise<void>;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [accountType, setAccountType] = useState<EditablePlatformAccountType>(
    company.user_type === "DISTRIBUTOR" ? "DISTRIBUTOR" : "SUPER_ADMIN",
  );
  const [reason, setReason] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(accountType, reason.trim());
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      contentClassName="sm:max-w-xl"
      tone="aqua"
      icon={<PencilLine className="h-5 w-5" />}
      eyebrow={t("customerAccount")}
      title={t("editType")}
      description={company.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="platform-account-type-form"
            disabled={saving || accountType === company.user_type || reason.trim().length < 5}
            className="inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {saving
              ? t("saving")
              : t("saveType")}
          </button>
        </>
      }
    >
      <form id="platform-account-type-form" onSubmit={submit} className="space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-[#177D66]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{company.name}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {company.owner_email || t("companyId", { id: String(company.id) })}
              </p>
            </div>
          </div>
          <label className="mt-5 block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{t("userType")}</span>
            <select
              autoFocus
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as EditablePlatformAccountType)
              }
              className={controlClass}
            >
              <option value="SUPER_ADMIN">{t("superAdmin")} · {t("customer")}</option>
              <option value="DISTRIBUTOR">{t("distributor")}</option>
            </select>
          </label>
          <label className="mt-4 block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{t("operationalReason")}</span>
            <textarea
              required
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder={t("typeReason")}
            />
            <span className="block text-xs font-normal text-slate-500">
              {t("rootAuditHelp")}
            </span>
          </label>
        </section>
        <p className="rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm leading-6 text-[#176B5B] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]">
          {t("rootRoleHelp")}
        </p>
      </form>
    </IndiceModalFrame>
  );
}
