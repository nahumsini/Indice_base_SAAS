import { useLanguage } from "../../shared/context";
import { useState, type FormEvent } from "react";
import { ClipboardPlus } from "lucide-react";
import { IndiceModalFrame } from "../../components/indice-modal";
import type {
  CreateModuleWorkOrderInput,
  ModuleWorkOrderLocale,
} from "./types";
import { useModuleWorkOrderCopy } from "./translations";

const locales: ModuleWorkOrderLocale[] = [
  "en-CA",
  "en-US",
  "es-MX",
  "es-CO",
  "fr-CA",
  "pt-BR",
  "ko-CA",
  "zh-CA",
];
const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export function ModuleWorkOrderModal({
  english,
  onClose,
  onCreate,
}: {
  english: boolean;
  onClose: () => void;
  onCreate: (input: CreateModuleWorkOrderInput) => void | Promise<void>;
}) {
  const { currentLanguage } = useLanguage();
  const languageCode = locales.includes(currentLanguage.code as ModuleWorkOrderLocale) ? currentLanguage.code as ModuleWorkOrderLocale : "en-CA";
  const localeLabels = new Intl.DisplayNames([languageCode], { type: "language" });
  const copy = useModuleWorkOrderCopy();
  const [moduleName, setModuleName] = useState("");
  const [sourceLocale, setSourceLocale] = useState<ModuleWorkOrderLocale>(
    languageCode,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (moduleName.trim().length < 3) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreate({ moduleName: moduleName.trim(), sourceLocale });
    } catch (reason) {
      setError(copy.createError);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      modalType="standard-form"
      tone="blue"
      icon={<ClipboardPlus className="h-5 w-5" />}
      eyebrow={copy.eyebrow}
      title={copy.title}
      description={copy.description}
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
            form="module-work-order-form"
            disabled={moduleName.trim().length < 3 || submitting}
            className="h-11 rounded-xl bg-white/15 px-5 text-sm font-semibold text-white ring-1 ring-white/35 disabled:opacity-50"
          >
            {copy.create}
          </button>
        </div>
      }
    >
      <form id="module-work-order-form" onSubmit={submit} className="space-y-5">
        {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>{copy.name}</span>
          <input
            autoFocus
            required
            minLength={3}
            value={moduleName}
            onChange={(event) => setModuleName(event.target.value)}
            className={controlClass}
            placeholder={copy.namePlaceholder}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>{copy.locale}</span>
          <select
            value={sourceLocale}
            onChange={(event) =>
              setSourceLocale(event.target.value as ModuleWorkOrderLocale)
            }
            className={controlClass}
          >
            {locales.map((locale) => (
              <option key={locale} value={locale}>
                {localeLabels.of(locale) || locale}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-[#143675]">
          {copy.guidance}
        </div>
      </form>
    </IndiceModalFrame>
  );
}
