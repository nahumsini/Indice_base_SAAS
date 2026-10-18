import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { ApiClientError } from "../../../../lib/apiClient";
import { SalesModalFrame } from "../../components/SalesModalFrame";
import { SalesDocumentWizard } from "../../components/SalesDocumentWizard";
import {
  mailingApi,
  type Campaign,
  type Draft,
  type MailingContact,
} from "../mailingApi";
import type { MailingCopy } from "../translations";
import { RecipientPicker } from "./RecipientPicker";
import type { MailingSender } from "../../../../ComplementaryModules/Email/emailApi";
import { CampaignSenderPicker } from "./CampaignSenderPicker";
import { useEmailCopy } from "../../../../ComplementaryModules/Email/translations";
import { CampaignTemplatePicker } from "./CampaignTemplatePicker";

export function CampaignEditor({
  campaign,
  canEdit,
  copy,
  onClose,
  onSaved,
  onConfigureAccounts,
}: {
  campaign: Campaign | null;
  canEdit: boolean;
  copy: MailingCopy;
  onClose: () => void;
  onSaved: () => void;
  onConfigureAccounts?: (id: string) => void;
}) {
  const { copy: emailCopy } = useEmailCopy();
  const id = useRef(campaign?.id ?? crypto.randomUUID());
  const initial: Draft = {
    name: campaign?.name ?? "",
    subject: campaign?.subject ?? "",
    senderName: campaign?.senderName ?? "",
    senderAccountId: campaign?.senderAccountId ?? null,
    replyTo: campaign?.replyTo ?? "",
    previewText: campaign?.previewText ?? "",
    bodyText: campaign?.bodyText ?? "",
    version: campaign?.version ?? 0,
    contactIds: campaign?.recipients.map((c) => c.id) ?? [],
  };
  const initialJson = useRef(JSON.stringify(initial));
  const [draft, setDraft] = useState(initial);
  const [sender, setSender] = useState<MailingSender | null>(null);
  const [contacts, setContacts] = useState<MailingContact[]>(
    campaign?.recipients ?? [],
  );
  const [step, setStep] = useState(0);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const dirty = JSON.stringify(draft) !== initialJson.current;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const steps = [copy.details, copy.audience, copy.content, copy.review].map(
    (label, index) => ({ id: String(index), label }),
  );
  function close() {
    if (busy) return;
    if (JSON.stringify(draft) !== initialJson.current) setDiscard(true);
    else onClose();
  }
  function update(key: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
  }
  async function save(configure = false) {
    if (!draft.name.trim()) {
      setError(copy.nameRequired);
      setStep(0);
      return;
    }
    if (
      draft.replyTo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.replyTo.trim())
    ) {
      setError(copy.invalidEmail);
      setStep(0);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await mailingApi.save(id.current, draft);
      if (configure && onConfigureAccounts) onConfigureAccounts(id.current);
      else onSaved();
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        setError(copy.conflict);
        setBlocked(true);
      } else setError(copy.saveError);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: "name" | "subject" | "senderName" | "replyTo" | "previewText",
    label: string,
    maxLength: number,
  ) => (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <Input
        className="h-11"
        value={draft[key]}
        maxLength={maxLength}
        type={key === "replyTo" ? "email" : "text"}
        disabled={!canEdit || busy}
        onChange={(e) => update(key, e.target.value)}
      />
    </label>
  );
  return (
    <SalesModalFrame
      open
      onOpenChange={(open) => {
        if (!open) {
          if (discard) setDiscard(false);
          else close();
        }
      }}
      modalType={discard ? "confirmation" : "wizard"}
      busy={busy}
      title={
        discard
          ? copy.closeWarning
          : campaign
            ? campaign.name
            : copy.newCampaign
      }
      description={discard ? copy.reviewHint : copy.subtitle}
      closeLabel={copy.cancel}
      icon={<Mail className="h-5 w-5" />}
      footerLeading={<Button className="h-11 rounded-xl !border-white !bg-white px-5 !text-slate-600 hover:!bg-white/90" variant="outline" disabled={busy} onClick={() => discard ? setDiscard(false) : close()}>{discard ? copy.keepEditing : copy.cancel}</Button>}
      footer={discard ? <Button data-modal-destructive onClick={onClose}>{copy.discard}</Button> : <>
        {step > 0 && <Button variant="outline" disabled={busy} onClick={() => setStep(s => s - 1)}>{copy.back}</Button>}
        {step < 3 && <Button variant="outline" disabled={busy} onClick={() => {
          if (!draft.name.trim()) { setError(copy.nameRequired);setStep(0); }
          else { setError("");setStep(s => s + 1); }
        }}>{copy.next}</Button>}
        {canEdit && <Button disabled={busy || blocked} onClick={() => void save()}>{busy ? copy.saving : copy.save}</Button>}
      </>}

    >
      {!discard && (
        <SalesDocumentWizard
          activeStepId={String(step)}
          progressLabel={steps[step].label}
          steps={steps}
          validation={
            error ? (
              <p
                role="alert"
                className="text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            ) : undefined
          }
        >
          {step === 0 && (
            <div className="space-y-4">
              {field("name", copy.name, 180)}
              <CampaignSenderPicker onResolved={setSender} value={draft.senderAccountId} disabled={!canEdit || busy || blocked}
                onChange={sender => setDraft(d => ({ ...d, senderAccountId: sender?.id ?? null,
                  senderName: sender ? sender.displayName : d.senderName, replyTo: sender ? sender.email : d.replyTo }))}
                onConfigure={canEdit && onConfigureAccounts ? () => void save(true) : undefined} />
              {field("senderName", copy.senderName, 160)}
              {field("replyTo", copy.replyTo, 240)}
              <p className="text-sm text-slate-500">{copy.note}</p>
            </div>
          )}
          {step === 1 && (
            <RecipientPicker
              copy={copy}
              selected={contacts}
              disabled={!canEdit || busy}
              onChange={(value) => {
                setContacts(value);
                setDraft((d) => ({ ...d, contactIds: value.map((c) => c.id) }));
              }}
            />
          )}
          {step === 2 && (
            <div className="space-y-4">
              <CampaignTemplatePicker
                copy={copy}
                disabled={!canEdit || busy}
                onApply={(value) =>
                  setDraft((d) => ({
                    ...d,
                    subject: value.subject,
                    previewText: value.previewText,
                    bodyText: value.bodyText,
                  }))
                }
              />
              {field("subject", copy.subject, 240)}
              {field("previewText", copy.previewText, 240)}
              <label className="block space-y-2 text-sm">
                <span>{copy.body}</span>
                <Textarea
                  className="min-h-56"
                  value={draft.bodyText}
                  disabled={!canEdit || busy}
                  maxLength={20000}
                  onChange={(e) => update("bodyText", e.target.value)}
                />
              </label>
              <p className="text-xs text-slate-500">
                {"{{name}}"} · {copy.sample}
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm">{copy.reviewHint}</p>
              <dl className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 text-sm [&_dd]:min-w-0 [&_dd]:break-words">
                <dt>{copy.campaign}</dt>
                <dd>{draft.name}</dd>
                <dt>{copy.selected}</dt>
                <dd>{contacts.length}</dd>
                <dt>{emailCopy.senderAccount}</dt>
                <dd>{sender ? `${sender.label} · ${sender.email}` : draft.senderAccountId ? emailCopy.senderUnavailable : emailCopy.disabled}</dd>
                {sender && <><dt>SMTP</dt><dd>{sender.smtpStatus === "VERIFIED" ? emailCopy.verified : sender.smtpStatus === "ERROR" ? emailCopy.failed : emailCopy.untested}</dd></>}
                <dt>{copy.senderName}</dt>
                <dd>{draft.senderName || "—"}</dd>
                <dt>{copy.replyTo}</dt>
                <dd>{draft.replyTo || "—"}</dd>
              </dl>
              <section
                aria-label={copy.preview}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="mb-2 text-lg font-medium">
                  {draft.subject || copy.subject}
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  {draft.previewText}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {draft.bodyText
                    .split("{{name}}")
                    .join(contacts[0]?.name ?? copy.sample)}
                </p>
              </section>
              <p className="text-sm text-slate-500">{copy.note}</p>
            </div>
          )}
        </SalesDocumentWizard>
      )}
    </SalesModalFrame>
  );
}
