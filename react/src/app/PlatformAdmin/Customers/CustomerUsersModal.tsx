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
      eyebrow="Usuarios de la cuenta"
      title={company.name}
      description={`${company.owner_email || "Sin correo propietario"} · Empresa #${company.id}`}
      icon={
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-medium text-white">
          {initials(company.name)}
        </span>
      }
      modalType="operational-workspace"
      tone="blue"
      bodyClassName="bg-slate-50/70"
      contentClassName="sm:w-[min(92vw,1080px)] sm:max-w-[1080px] sm:max-h-[90dvh]"
      footerSummary={`${active} activo(s)${reserved ? ` + ${reserved} reservado(s)` : ""} de ${capacity} lugares`}
      footer={
        <button type="button" className="cursor-pointer" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <UsersRound className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-900">Administración de usuarios</p>
          <p className="text-xs text-slate-500">Invita, reactiva o desactiva personas sin mezclar cambios de módulos o facturación.</p>
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
