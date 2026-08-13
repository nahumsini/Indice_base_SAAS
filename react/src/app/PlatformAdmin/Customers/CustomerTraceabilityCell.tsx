import {
  Building2,
  Globe2,
  History,
  Link2,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import type { PlatformCompanySummary } from "../../api/platformAdmin";
import type { CustomerTableCopy } from "./customerTableCopy";

type Props = {
  company: PlatformCompanySummary;
  copy: CustomerTableCopy;
  canAssign: boolean;
  onAssign?: (company: PlatformCompanySummary) => void;
};

export function CustomerTraceabilityCell({
  company,
  copy,
  canAssign,
  onAssign,
}: Props) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      <div className="min-w-0 flex-1">
        <CreationSource company={company} copy={copy} />
        {company.user_type === "SUPER_ADMIN" ? (
          <CurrentAssignment company={company} copy={copy} />
        ) : null}
      </div>
      {canAssign ? (
        <button
          type="button"
          onClick={() => onAssign?.(company)}
          title={
            company.distributor_company_id
              ? copy.changeDistributor
              : copy.assignDistributor
          }
          aria-label={`${
            company.distributor_company_id
              ? copy.changeDistributor
              : copy.assignDistributor
          }: ${company.name}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-[#174799] transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
        >
          <PencilLine className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function CreationSource({
  company,
  copy,
}: Pick<Props, "company" | "copy">) {
  if (company.user_type === "DISTRIBUTOR") {
    return (
      <SourceLine
        icon={Building2}
        label={copy.distributorAccount}
        detail={creationDetail(company, copy)}
        tone="amber"
      />
    );
  }

  if (company.creation_origin === "DISTRIBUTOR_PORTAL") {
    return (
      <SourceLine
        icon={Link2}
        label={
          company.created_by_distributor_company_name || copy.originNotRegistered
        }
        detail={copy.createdByDistributor}
        tone="emerald"
      />
    );
  }

  if (company.creation_origin === "PLATFORM_ADMIN") {
    return (
      <SourceLine
        icon={ShieldCheck}
        label={copy.createdByIndice}
        detail={company.created_by_user_name || company.created_by_user_email}
        tone="blue"
      />
    );
  }

  if (company.creation_origin === "WEB_SELF_SERVICE") {
    return (
      <SourceLine
        icon={Globe2}
        label={copy.webRegistration}
        detail={company.created_by_user_email}
        tone="blue"
      />
    );
  }

  return (
    <SourceLine
      icon={History}
      label={copy.originNotRegistered}
      detail={copy.traceabilityUnavailable}
      tone="slate"
    />
  );
}

function CurrentAssignment({
  company,
  copy,
}: Pick<Props, "company" | "copy">) {
  if (!company.distributor_company_id || !company.distributor_company_name) {
    return (
      <p className="mt-1 text-xs leading-4 text-slate-400">
        {copy.noCurrentDistributor}
      </p>
    );
  }

  const sameAsCreator =
    company.created_by_distributor_company_id === company.distributor_company_id;
  return (
    <p
      className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500"
      title={company.distributor_company_name}
    >
      {sameAsCreator
        ? `${copy.currentPortfolio}: ${company.distributor_company_name}`
        : `${copy.currentDistributor}: ${company.distributor_company_name}`}
    </p>
  );
}

function creationDetail(
  company: PlatformCompanySummary,
  copy: CustomerTableCopy,
) {
  if (company.creation_origin === "PLATFORM_ADMIN") return copy.createdByIndice;
  if (company.creation_origin === "WEB_SELF_SERVICE") return copy.webRegistration;
  return copy.originNotRegistered;
}

function SourceLine({
  icon: Icon,
  label,
  detail,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  detail?: string | null;
  tone: "amber" | "blue" | "emerald" | "slate";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-[#174799] ring-blue-100",
    emerald: "bg-emerald-50 text-[#177D66] ring-emerald-100",
    slate: "bg-slate-100 text-slate-500 ring-slate-200",
  };
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ring-1 ${tones[tone]}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-medium leading-5 text-slate-800">
          {label}
        </span>
        {detail ? (
          <span className="line-clamp-2 text-xs leading-4 text-slate-500" title={detail}>
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}
