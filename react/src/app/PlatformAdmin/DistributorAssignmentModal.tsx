import { useState, type FormEvent } from "react";
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
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10";

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
  onSave: (distributorCompanyId: number | null) => Promise<void>;
}) {
  const [selection, setSelection] = useState(
    company.distributor_company_id
      ? String(company.distributor_company_id)
      : distributors[0]
        ? String(distributors[0].id)
        : "direct",
  );
  const selectedId = selection === "direct" ? null : Number(selection);
  const unchanged = selectedId === (company.distributor_company_id ?? null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(selectedId);
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      contentClassName="sm:max-w-xl"
      tone="blue"
      icon={<Handshake className="h-5 w-5" />}
      eyebrow={english ? "Commercial relationship" : "Relación comercial"}
      title={english ? "Assign distributor" : "Asignar distribuidor"}
      description={company.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {english ? "Cancel" : "Cancelar"}
          </button>
          <button
            type="submit"
            form="platform-distributor-assignment-form"
            disabled={saving || unchanged || (!distributors.length && !company.distributor_company_id)}
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
              ? english
                ? "Saving..."
                : "Guardando..."
              : selection === "direct"
                ? english
                  ? "Remove relationship"
                  : "Desvincular distribuidor"
                : english
                  ? "Assign distributor"
                  : "Asignar distribuidor"}
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
                  english
                    ? "There are no distributor accounts available. Create one or change an eligible account to Distributor first."
                    : "No hay cuentas distribuidoras disponibles. Primero crea una o cambia una cuenta elegible a Distribuidor.",
                ]
              : []),
          ]}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">
              <Building2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{company.name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {company.owner_email || `Empresa #${company.id}`}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {company.distributor_company_name
                  ? `${english ? "Current distributor" : "Distribuidor actual"}: ${company.distributor_company_name}`
                  : english
                    ? "Current origin: Direct with Indice"
                    : "Origen actual: Directo con Índice"}
              </p>
            </div>
          </div>

          <label className="mt-5 block space-y-1.5 text-sm font-medium text-slate-700">
            <span>{english ? "Commercial origin" : "Origen comercial"}</span>
            <select
              autoFocus
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
              className={controlClass}
            >
              {company.distributor_company_id ? (
                <option value="direct">
                  {english ? "Direct with Indice" : "Directo con Índice"}
                </option>
              ) : null}
              {distributors.map((distributor) => (
                <option key={distributor.id} value={distributor.id}>
                  {distributor.name} · ID {distributor.id}
                </option>
              ))}
            </select>
          </label>
        </section>

        <p className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-[#143675]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {english
              ? "This relationship identifies the distributor of origin for the client, enables distributor-preferred consulting, and is recorded in the Root audit trail."
              : "Esta relación identifica al distribuidor de origen del cliente, habilita la preferencia de consultoría con su distribuidor y queda registrada en la auditoría Root."}
          </span>
        </p>
      </form>
    </IndiceModalFrame>
  );
}
