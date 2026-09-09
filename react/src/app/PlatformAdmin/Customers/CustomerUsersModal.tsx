import { useCustomerAccountCopy } from "./useCustomerAccountCopy";
import { UsersRound } from "lucide-react";
import type { PlatformCompanyDetail } from "../../api/platformAdmin";
import { IndiceModalFrame } from "../../components/indice-modal/IndiceModalFrame";
import { CompanyActivityTab } from "../CompanyAccount/CompanyActivityTab";
import { initials } from "../CompanyAccount/companyAccountUtils";

const safeCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function CustomerUsersModal({
  company,
  canManage,
  onClose,
  onRefresh,
  onManageSeats,
}: {
  company: PlatformCompanyDetail;
  canManage: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onManageSeats: () => void;
}) {
  const { t, locale, number } = useCustomerAccountCopy();
  const active = safeCount(company.seat_usage?.active ?? company.active_members);
  const reserved = safeCount(company.seat_usage?.reserved ?? company.invitations?.length);
  const declaredCapacity =
    safeCount(company.seat_usage?.included ?? company.included_seats) +
    safeCount(company.seat_usage?.purchased_extra ?? company.purchased_extra_seats ?? company.extra_seats) +
    safeCount(company.seat_usage?.courtesy_extra);
  const capacity = Math.max(declaredCapacity, active + reserved);

  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      eyebrow={t("accountUsers")}
      title={company.name}
      description={`${company.owner_email || t("noOwnerEmail")} · ${t("companyId", { id: String(company.id) })}`}
      icon={
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-medium text-white">
          {initials(company.name)}
        </span>
      }
      modalType="operational-workspace"
      tone="aqua"
      bodyClassName="bg-slate-50/70 dark:bg-slate-950/40"
      contentClassName="sm:w-[min(92vw,1080px)] sm:max-w-[1080px] sm:max-h-[90dvh]"
      footerSummary={t("seatSummary", { active, reserved, capacity })}
      footer={
        <button type="button" className="cursor-pointer" onClick={onClose}>
          {t("close")}</button>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#59C3A5]/30 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e8f5f2] text-[#177D66]">
          <UsersRound className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{t("usersManagement")}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("usersManagementHelp")}</p>
        </div>
      </div>
      <CompanyActivityTab
        company={company}
        canManage={canManage}
        onRefresh={onRefresh}
        onManageSeats={onManageSeats}
        showBilling={false}
      />
    </IndiceModalFrame>
  );
}
