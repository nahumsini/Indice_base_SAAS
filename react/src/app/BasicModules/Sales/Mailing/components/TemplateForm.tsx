import { MailRichEditor } from "../../../../components/mail-editor/MailRichEditor";
import { MailFormattedPreview } from "../../../../components/mail-editor/MailFormattedPreview";
import { Input } from "../../../../components/ui/input";
import { Eye, ChevronDown } from 'lucide-react';

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
        autoFocus={key === 'name'}
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
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {field("name", copy.templateName, 180)}
        {field("subject", copy.subject, 240)}
      </div>
      {field("previewText", copy.previewText, 240)}
      <div className="block space-y-2 text-sm">
        <span>{copy.body}</span>
        <MailRichEditor label={copy.body} text={value.bodyText} html={value.bodyHtml??null} disabled={disabled} onBusy={onBusy} onChange={(bodyText,bodyHtml)=>onChange({...value,bodyText,bodyHtml})} />
      </div>
      <p className="text-sm text-slate-500">{copy.templateHint}</p>
      <details className="group min-w-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
          <Eye aria-hidden="true" className="h-4 w-4" />{copy.templatePreview}
          <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-slate-200 p-3 dark:border-slate-700"><TemplatePreview compact value={value} copy={copy} /></div>
      </details>
    </div>
  );
}
export function TemplatePreview({
  value,
  copy,
  compact = false,
}: {
  value: Pick<TemplateInput, "subject" | "previewText" | "bodyText" | "bodyHtml">;
  copy: MailingCopy;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={copy.templatePreview}
      className={compact ? "min-w-0 space-y-3" : "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"}
    >
      <h3 className="break-words text-lg font-medium">{value.subject || copy.subject}</h3>
      {(!compact || (value.previewText && value.previewText !== value.subject)) && <p className="mt-2 break-words text-sm text-slate-500">{value.previewText}</p>}
      <MailFormattedPreview text={value.bodyText.split("{{name}}").join(copy.previewName)} html={value.bodyHtml?.split("{{name}}").join(copy.previewName)} label={copy.templatePreview} />
    </section>
  );
}
