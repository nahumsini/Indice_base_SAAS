import { useEffect, useId, useState, type ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  Clock3,
  Loader2,
  Mail,
  Settings,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { IndiceModalValidation } from "../../../../components/indice-modal";
import type { MailingSender } from "../../../../ComplementaryModules/Email/emailApi";
import { useEmailCopy } from "../../../../ComplementaryModules/Email/translations";
import { mailingApi } from "../mailingApi";
import { useCampaignEditorCopy } from "../editorCopy";
import { campaignFieldClassName } from "./CampaignEditorField";

export function CampaignSenderPicker({
  value,
  disabled,
  onChange,
  onConfigure,
  onResolved,
  children,
}: {
  value: string | null;
  disabled: boolean;
  onChange: (sender: MailingSender | null) => void;
  onConfigure?: () => void;
  onResolved: (sender: MailingSender | null) => void;
  children?: ReactNode;
}) {
  const { copy } = useEmailCopy();
  const editorCopy = useCampaignEditorCopy();
  const fieldId = useId();
  const [items, setItems] = useState<MailingSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    mailingApi
      .senders(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setItems(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);
  const selected =
    !loading && !failed ? items.find((item) => item.id === value) : undefined;
  useEffect(() => {
    if (!loading) onResolved(selected ?? null);
  }, [selected, loading, onResolved]);
  const verified = selected?.smtpStatus === "VERIFIED";
  const rejected = selected?.smtpStatus === "ERROR";
  const StatusIcon = verified ? CircleCheck : rejected ? CircleAlert : Clock3;
  return (
    <section
      aria-labelledby={`${fieldId}-title`}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FF9D94]">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3
            id={`${fieldId}-title`}
            className="text-sm font-medium text-slate-900 dark:text-white"
          >
            {editorCopy.sender}
          </h3>
        </div>
        {selected && (
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
              verified
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : rejected
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            SMTP ·{" "}
            {verified ? copy.verified : rejected ? copy.failed : copy.untested}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {copy.senderAccount}
        </label>
        <Select
          disabled={disabled || loading || failed}
          value={value ?? "none"}
          onValueChange={(id) =>
            onChange(items.find((item) => item.id === id) ?? null)
          }
        >
          <SelectTrigger
            id={fieldId}
            aria-describedby={`${fieldId}-hint`}
            className={`${campaignFieldClassName} data-[size=default]:h-11`}
          >
            <SelectValue placeholder={copy.chooseSender} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{copy.chooseSender}</SelectItem>
            {value && !items.some((item) => item.id === value) && (
              <SelectItem value={value} disabled>
                {loading ? copy.loading : copy.senderUnavailable}
              </SelectItem>
            )}
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label} · {item.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          id={`${fieldId}-hint`}
          className="text-xs leading-5 text-slate-500 dark:text-slate-400"
        >
          {editorCopy.senderHint}
        </p>
      </div>
      {loading && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {copy.loading}
        </p>
      )}
      {failed ? (
        <div className="space-y-2">
          <IndiceModalValidation messages={[copy.senderLoadError]} />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            onClick={() => setRefresh((v) => v + 1)}
          >
            {copy.refresh}
          </Button>
        </div>
      ) : (
        !loading &&
        ((value && !selected) || !items.length) && (
          <IndiceModalValidation
            tone="warning"
            messages={[
              value && !selected ? copy.senderUnavailable : copy.noSenders,
            ]}
          />
        )
      )}
      {children}
      {onConfigure && (
        <div className="flex flex-col items-start gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            {editorCopy.configureHint}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 h-auto shrink-0 whitespace-normal rounded-xl text-[#B63B32] dark:text-[#FF9D94]"
            disabled={disabled}
            onClick={onConfigure}
          >
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            {copy.saveAndConfigure}
          </Button>
        </div>
      )}
    </section>
  );
}
