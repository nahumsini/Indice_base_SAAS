import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function WorkspaceSection({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-medium text-slate-900">{title}</h3>
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function SummaryDatum({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 truncate text-sm font-medium text-slate-900" title={typeof value === "string" ? value : undefined}>
        {value}
      </div>
      {hint ? <div className="mt-1 truncate text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function StatusPill({ status }: { status?: string | null }) {
  const normalized = (status || "").toLowerCase();
  const tone = ["active", "trialing", "scheduled"].includes(normalized)
    ? "bg-emerald-50 text-emerald-700"
    : ["revoked", "expired", "canceled", "past_due"].includes(normalized)
      ? "bg-rose-50 text-rose-700"
      : "bg-slate-100 text-slate-600";
  const labels: Record<string, string> = {
    active: "Activo",
    canceled: "Cancelado",
    expired: "Vencido",
    inactive: "Inactivo",
    past_due: "Pago pendiente",
    revoked: "Revocado",
    scheduled: "Programado",
    trialing: "Prueba",
  };
  const label = labels[normalized] || status || "Sin estado";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

export function CompactEmptyState({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-6 text-sm text-slate-500">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>{children}</span>
    </div>
  );
}
