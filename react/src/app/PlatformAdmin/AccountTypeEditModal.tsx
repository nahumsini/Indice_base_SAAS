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
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10";

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
  onSave: (accountType: EditablePlatformAccountType) => Promise<void>;
}) {
  const [accountType, setAccountType] = useState<EditablePlatformAccountType>(
    company.user_type === "DISTRIBUTOR" ? "DISTRIBUTOR" : "SUPER_ADMIN",
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(accountType);
  };

  return (
    <IndiceModalFrame
      open
      busy={saving}
      onOpenChange={(open) => !open && onClose()}
      modalType="standard-form"
      contentClassName="sm:max-w-xl"
      tone="blue"
      icon={<PencilLine className="h-5 w-5" />}
      eyebrow={english ? "Customer account" : "Cuenta de cliente"}
      title={english ? "Edit user type" : "Editar tipo de usuario"}
      description={company.name}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving}>
            {english ? "Cancel" : "Cancelar"}
          </button>
          <button
            type="submit"
            form="platform-account-type-form"
            disabled={saving || accountType === company.user_type}
            className="inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {saving
              ? english
                ? "Saving..."
                : "Guardando..."
              : english
                ? "Save type"
                : "Guardar tipo"}
          </button>
        </>
      }
    >
      <form id="platform-account-type-form" onSubmit={submit} className="space-y-4">
        <IndiceModalValidation messages={error ? [error] : []} />
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-900">{company.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {company.owner_email || `Empresa #${company.id}`}
              </p>
            </div>
          </div>
          <label className="mt-5 block space-y-1.5 text-sm font-medium text-slate-700">
            <span>{english ? "User type" : "Tipo de usuario"}</span>
            <select
              autoFocus
              value={accountType}
              onChange={(event) =>
                setAccountType(event.target.value as EditablePlatformAccountType)
              }
              className={controlClass}
            >
              <option value="SUPER_ADMIN">Super Admin · {english ? "customer" : "cliente"}</option>
              <option value="DISTRIBUTOR">{english ? "Distributor" : "Distribuidor"}</option>
            </select>
          </label>
        </section>
        <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-[#143675]">
          {english
            ? "Root access is controlled separately by platform security and cannot be assigned here."
            : "El acceso Root se controla por separado desde la seguridad de plataforma y no puede asignarse aquí."}
        </p>
      </form>
    </IndiceModalFrame>
  );
}
