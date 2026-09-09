import { useCustomerAccountCopy } from "./Customers/useCustomerAccountCopy";
import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Handshake,
  Link2,
  LoaderCircle,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import type { PlatformCompanySummary } from "../api/platformAdmin";
import {
  IndiceModalFrame,
  IndiceModalValidation,
} from "../components/indice-modal";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export default function DistributorAssignmentModal({
  company,
  distributors,
  english,
  saving,
  error,
  onClose,
  onSave,
}: {
  company: PlatformCompanySummary;
  distributors: PlatformCompanySummary[];
  english: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (distributorCompanyId: number | null, reason: string) => Promise<void>;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [selection, setSelection] = useState(
    company.distributor_company_id
      ? String(company.distributor_company_id)
      : distributors[0]
        ? String(distributors[0].id)
        : "direct",
  );
  const [reason, setReason] = useState("");
  const sortedDistributors = useMemo(
    () => [...distributors].sort((left, right) => left.name.localeCompare(right.name, locale)),
    [distributors, locale],
  );
  const selectedId = selection === "direct" ? null : Number(selection);
  const unchanged = selectedId === (company.distributor_company_id ?? null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(selectedId, reason.trim());
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      contentClassName="sm:max-w-xl"
      tone="aqua"
      icon={<Handshake className="h-5 w-5" />}
      eyebrow={t("commercialRelationship")}
      title={t("assignDistributor")}
      description={company.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            form="platform-distributor-assignment-form"
            disabled={saving || unchanged || reason.trim().length < 5 || (!distributors.length && !company.distributor_company_id)}
            className="inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : selection === "direct" ? (
              <Unlink className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {saving
              ? t("saving")
              : selection === "direct"
                ? t("removeDistributor")
                : t("assignDistributor")}
          </button>
        </>
      }
    >
      <form
        id="platform-distributor-assignment-form"
        onSubmit={submit}
        className="space-y-4"
      >
        <IndiceModalValidation
          messages={[
            ...(error ? [error] : []),
            ...(!distributors.length
              ? [
                  t("noDistributors"),
                ]
              : []),
          ]}
        />

        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f5f2] text-[#177D66]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-white">{company.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {company.owner_email || t("companyId", { id: String(company.id) })}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {company.distributor_company_name
                  ? `${t("currentDistributor")}: ${company.distributor_company_name}`
                  : t("currentDirectOrigin")}
              </p>
            </div>
          </div>

          <label className="mt-5 block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{t("commercialOrigin")}</span>
            <select
              autoFocus
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              className={controlClass}
            >
              {company.distributor_company_id ? (
                <option value="direct">
                  {t("directWithIndice")}
                </option>
              ) : null}
              {sortedDistributors.map((distributor) => (
                <option key={distributor.id} value={distributor.id}>
                  {distributor.name} · {t("identifierId", { id: String(distributor.id) })}
                </option>
              ))}
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
              placeholder={t("relationshipReason")}
            />
          </label>
        </section>

        <p className="flex items-start gap-2 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm leading-6 text-[#176B5B] dark:border-[#59C3A5]/25 dark:bg-[#59C3A5]/10 dark:text-[#8FE0CA]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t("relationshipHelp")}
          </span>
        </p>
      </form>
    </IndiceModalFrame>
  );
}
