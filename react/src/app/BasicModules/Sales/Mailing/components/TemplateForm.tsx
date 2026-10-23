import { MailRichEditor } from "../../../../components/mail-editor/MailRichEditor";
import { MailFormattedPreview } from "../../../../components/mail-editor/MailFormattedPreview";
import { Input } from "../../../../components/ui/input";

import type { TemplateInput } from "../mailingApi";
import type { MailingCopy } from "../translations";
export function TemplateForm({
  value,
  onChange,
  copy,
  disabled,
  onBusy,
}: {
  value: TemplateInput;
  onChange: (value: TemplateInput) => void;
  copy: MailingCopy;
  disabled: boolean;
  onBusy?: (busy:boolean)=>void;
}) {
  const field = (
    key: "name" | "subject" | "previewText",
    label: string,
    maxLength: number,
  ) => (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <Input
        className="h-11"
        maxLength={maxLength}
        disabled={disabled}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <div className="space-y-4">
      {field("name", copy.templateName, 180)}
      {field("subject", copy.subject, 240)}
      {field("previewText", copy.previewText, 240)}
      <div className="block space-y-2 text-sm">
        <span>{copy.body}</span>
        <MailRichEditor label={copy.body} text={value.bodyText} html={value.bodyHtml??null} disabled={disabled} onBusy={onBusy} onChange={(bodyText,bodyHtml)=>onChange({...value,bodyText,bodyHtml})} />
      </div>
      <p className="text-sm text-slate-500">{copy.templateHint}</p>
      <TemplatePreview value={value} copy={copy} />
    </div>
  );
}
export function TemplatePreview({
  value,
  copy,
}: {
  value: Pick<TemplateInput, "subject" | "previewText" | "bodyText" | "bodyHtml">;
  copy: MailingCopy;
}) {
  return (
    <section
      aria-label={copy.templatePreview}
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
    >
      <h3 className="text-lg font-medium">{value.subject || copy.subject}</h3>
      <p className="mt-2 text-sm text-slate-500">{value.previewText}</p>
      <MailFormattedPreview text={value.bodyText.split("{{name}}").join(copy.previewName)} html={value.bodyHtml?.split("{{name}}").join(copy.previewName)} label={copy.templatePreview} />
    </section>
  );
}
