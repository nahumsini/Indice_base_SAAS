import {
  useConsultingCopy,
} from "../ConsultingTranslations";
import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { IndiceModalFrame } from "../../components/indice-modal";
import type { ConsultantInput } from "./types";

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

export function ConsultantCreateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: ConsultantInput) => void;
}) {
  const { copy } = useConsultingCopy();
  const [value, setValue] = useState<ConsultantInput>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim(),
      email: value.email.trim().toLowerCase(),
    });
  };
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modalType="standard-form"
      tone="blue"
      icon={<UserPlus className="h-5 w-5" />}
      eyebrow={copy.consultingDirectory}
      title={copy.addConsultant}
      description={copy.createConsultantHelp}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl bg-white px-4 text-sm font-medium text-slate-700"
          >
            {copy.cancel}
            </button>
          <button
            type="submit"
            form="consultant-create-form"
            className="h-11 rounded-xl bg-white/15 px-5 text-sm font-semibold text-white ring-1 ring-white/35"
          >
            {copy.saveConsultant}
            </button>
        </div>
      }
    >
      <form
        id="consultant-create-form"
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label={copy.firstName}>
          <input
            autoFocus
            required
            value={value.firstName}
            onChange={(event) =>
              setValue({ ...value, firstName: event.target.value })
            }
            className={controlClass}
          />
        </Field>
        <Field label={copy.lastName}>
          <input
            required
            value={value.lastName}
            onChange={(event) =>
              setValue({ ...value, lastName: event.target.value })
            }
            className={controlClass}
          />
        </Field>
        <Field label={copy.phone}>
          <input
            required
            type="tel"
            value={value.phone}
            onChange={(event) =>
              setValue({ ...value, phone: event.target.value })
            }
            className={controlClass}
            placeholder="+1 416 555 0100"
          />
        </Field>
        <Field label={copy.email}>
          <input
            required
            type="email"
            value={value.email}
            onChange={(event) =>
              setValue({ ...value, email: event.target.value })
            }
            className={controlClass}
            placeholder={copy.consultantEmailPlaceholder}
          />
        </Field>
      </form>
    </IndiceModalFrame>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
