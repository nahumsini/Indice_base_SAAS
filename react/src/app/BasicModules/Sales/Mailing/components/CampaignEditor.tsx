import { IndiceWorkspaceNavigation } from '../../../../components/frontend-os/IndiceWorkspaceNavigation';
import { MailTemplateVariables } from '../../../../ComplementaryModules/Email/MailTemplateVariables';
import { mailTemplateVariables, resolveMailTemplateVariables } from '../../../../ComplementaryModules/Email/mailTemplateVariableModel';
import { useMailEditorCopy } from '../../../../components/mail-editor/mailEditorCopy';
import { MailFormattedPreview } from '../../../../components/mail-editor/MailFormattedPreview';
import { plainMailHtml } from '../../../../components/mail-editor/mailFormat';
import { MailRichEditor } from "../../../../components/mail-editor/MailRichEditor";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FilePenLine, Mail, Save } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";
import {
  IndiceModalSummary,
  IndiceModalValidation,
} from "../../../../components/indice-modal";
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
import { useAudienceCopy } from "../audienceCopy";
import { useDeliveryCopy } from "../deliveryCopy";
import { useMailingWorkspaceCopy } from "../workspaceCopy";
import { RecipientPicker } from "./RecipientPicker";
import type { MailingSender } from "../../../../ComplementaryModules/Email/emailApi";
import { CampaignSenderPicker } from "./CampaignSenderPicker";
import { useEmailCopy } from "../../../../ComplementaryModules/Email/translations";
import { MailingFiles } from "./MailingFiles";
import type { MailingFile } from "../mailingApi";
import { CampaignTemplatePicker } from "./CampaignTemplatePicker";
import {
  CampaignEditorField,
  campaignFieldClassName,
} from "./CampaignEditorField";
import { useCampaignEditorCopy } from "../editorCopy";
import { getSalesModalActionClassNames } from "../../salesModalStyles";

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
  onSaved: (campaign: Campaign, review: boolean) => void;
  onConfigureAccounts?: (id: string) => void;
}) {
  const { copy: emailCopy } = useEmailCopy();
  const workspaceCopy = useMailingWorkspaceCopy();
  const audienceCopy = useAudienceCopy();
  const deliveryCopy = useDeliveryCopy();
  const editorCopy = useCampaignEditorCopy();
  const actionClasses = getSalesModalActionClassNames();
  const id = useRef(campaign?.id ?? crypto.randomUUID());
  const pending = useRef(false);
  const [files,setFiles]=useState<MailingFile[]>(campaign?.attachments??[]);
  const [fileBusy,setFileBusy]=useState(false);
  const [editorBusy,setEditorBusy]=useState(false);
  const [templateBusy,setTemplateBusy]=useState(false);
  const [contentMode,setContentMode]=useState<'write'|'template'>('write');
  const richCopy=useMailEditorCopy();
  const formRef = useRef<HTMLDivElement>(null);
  const initial: Draft = {
    name: campaign?.name ?? "",
    subject: campaign?.subject ?? "",
    senderName: campaign?.senderName ?? "",
    senderAccountId: campaign?.senderAccountId ?? null,
    replyTo: campaign?.replyTo ?? "",
    previewText: campaign?.previewText ?? "",
    bodyText: campaign?.bodyText ?? "",
    bodyHtml: campaign?.bodyHtml ?? null,
    attachmentIds: (campaign?.attachments??[]).map(f=>f.id),
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
  const [invalidField, setInvalidField] = useState<
    "name" | "replyTo" | "subject" | "bodyText" | null
  >(null);
  const locked=busy||fileBusy||editorBusy||templateBusy;
  const variables=mailTemplateVariables(draft.subject,`${draft.previewText}\n${draft.bodyText}`).filter(name=>name!=='name');
  const readOnly = !canEdit || locked || blocked;
  useEffect(() => {
    if (!invalidField || discard) return;
    const frame = requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>(
          invalidField === "bodyText"
            ? '[contenteditable="true"][role="textbox"]'
            : `input[name="${invalidField}"]`,
        )
        ?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [invalidField, step, discard]);
  const dirty = JSON.stringify(draft) !== initialJson.current;
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || locked) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty,locked]);
  const steps = [copy.details, copy.audience, copy.content, copy.review].map(
    (label, index) => ({ id: String(index), label }),
  );
  const stepHints = [
    editorCopy.detailsHint,
    editorCopy.audienceHint,
    editorCopy.contentHint,
    editorCopy.reviewHint,
  ];
  function close() {
    if (locked || pending.current) return;
    if (JSON.stringify(draft) !== initialJson.current) setDiscard(true);
    else onClose();
  }
  function update(key: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError("");
    if (key === invalidField) setInvalidField(null);
  }
  function validateDetails() {
    if (!draft.name.trim()) {
      setError(copy.nameRequired);
      setInvalidField("name");
      setStep(0);
      return false;
    }
    if (
      draft.replyTo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.replyTo.trim())
    ) {
      setError(copy.invalidEmail);
      setInvalidField("replyTo");
      setStep(0);
      return false;
    }
    setInvalidField(null);
    setError("");
    return true;
  }
  function validateContent() {
    const missing = !draft.subject.trim()
      ? "subject"
      : !draft.bodyText.trim() ? "bodyText" : null;
    if (!missing) return true;
    setInvalidField(missing);
    setError(
      missing === "subject" ? deliveryCopy.subjectRequired : deliveryCopy.bodyRequired,
    );
    setStep(2);
    return false;
  }
  async function save(configure = false, review = false) {
    if (readOnly || pending.current || !validateDetails()) return;
    if (review && !validateContent()) return;
    if(review&&variables.length){setError(richCopy.variables);setStep(2);return;}
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await mailingApi.save(id.current, draft);
      if (configure && onConfigureAccounts) onConfigureAccounts(id.current);
      else onSaved(saved, review);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 409) {
        setError(copy.conflict);
        setBlocked(true);
      } else setError(copy.saveError);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const field = (
    key: "name" | "subject" | "senderName" | "replyTo" | "previewText",
    label: string,
    maxLength: number,
    hint?: string,
    placeholder?: string,
  ) => (
    <CampaignEditorField
      name={key}
      label={label}
      value={draft[key]}
      maxLength={maxLength}
      required={key === "name"}
      disabled={readOnly}
      hint={hint}
      placeholder={placeholder}
      error={invalidField === key ? error : undefined}
      onChange={(value) => update(key, value)}
    />
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
      busy={locked}
      title={
        discard
          ? copy.closeWarning
          : campaign
            ? editorCopy.edit
            : copy.newCampaign
      }
      eyebrow={
        discard
          ? undefined
          : `${editorCopy.step.replace("{current}", String(step + 1)).replace("{total}", String(steps.length))} · ${steps[step].label}`
      }
      description={discard ? editorCopy.discardHint : stepHints[step]}
      closeLabel={copy.cancel}
      icon={<Mail className="h-5 w-5" />}
      footerLeading={
        <Button
          className={`${actionClasses.secondary} dark:border-white/50 dark:text-white dark:hover:text-white`}
          variant="outline"
          disabled={locked}
          onClick={() => (discard ? setDiscard(false) : close())}
        >
          {discard ? copy.keepEditing : copy.cancel}
        </Button>
      }
      footer={
        discard ? (
          <Button data-modal-destructive onClick={onClose}>
            {copy.discard}
          </Button>
        ) : (
          <>
            {step > 0 && (
              <Button
                variant="outline"
                disabled={locked}
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {copy.back}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                disabled={locked || blocked}
                onClick={() => void save()}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {busy ? copy.saving : copy.save}
              </Button>
            )}
            {step < 3 && (
              <Button
                className={actionClasses.primary}
                disabled={locked || blocked}
                onClick={() => {
                  if (!validateDetails()) return;
                  if (step === 2 && !validateContent()) return;
                  if (step === 2 && variables.length) {
                    setError(richCopy.variables);
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                {copy.next}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {canEdit && step === 3 && (
              <Button
                disabled={locked || blocked}
                onClick={() => void save(false, true)}
              >
                {workspaceCopy.saveReview}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </>
        )
      }
    >
      {discard && (
        <p className="break-words text-sm font-medium text-slate-800 dark:text-slate-200">
          {draft.name}
        </p>
      )}
      <div ref={formRef} hidden={discard}>
        <SalesDocumentWizard
          activeStepId={String(step)}
          progressLabel={steps[step].label}
          steps={steps}
          validation={<IndiceModalValidation messages={error ? [error] : []} />}
        >
          {step === 0 && (
            <div className="space-y-4">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  {editorCopy.identity}
                </h3>
                {field(
                  "name",
                  copy.name,
                  180,
                  editorCopy.nameHint,
                  editorCopy.namePlaceholder,
                )}
              </section>
              <CampaignSenderPicker
                onResolved={setSender}
                value={draft.senderAccountId}
                disabled={readOnly}
                onChange={(sender) => {
                  setError("");
                  setInvalidField(null);
                  setDraft((d) => ({
                    ...d,
                    senderAccountId: sender?.id ?? null,
                    senderName: sender ? sender.displayName : d.senderName,
                    replyTo: sender ? sender.email : d.replyTo,
                  }));
                }}
                onConfigure={
                  canEdit && onConfigureAccounts
                    ? () => void save(true)
                    : undefined
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {field(
                    "senderName",
                    copy.senderName,
                    160,
                    editorCopy.senderNameHint,
                  )}
                  {field("replyTo", copy.replyTo, 240, editorCopy.replyToHint)}
                </div>
              </CampaignSenderPicker>
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                <FilePenLine
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {editorCopy.draftHint}
              </p>
            </div>
          )}
          {step === 1 && (
            <RecipientPicker
              copy={copy}
              selected={contacts}
              onBusyChange={setBusy}
              disabled={readOnly}
              onChange={(value) => {
                setContacts(value);
                setDraft((d) => ({ ...d, contactIds: value.map((c) => c.id) }));
              }}
            />
          )}
          {step === 2 && (
            <div className="space-y-4">
              <section className="space-y-3" aria-label={editorCopy.contentMethod}>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">{editorCopy.contentMethod}</h3>
                <IndiceWorkspaceNavigation<'write'|'template'> variant="views" tone="coral" ariaLabel={editorCopy.contentMethod} value={contentMode} onValueChange={setContentMode}
                  items={[{id:'write',label:editorCopy.writeFromScratch,icon:<FilePenLine className="size-4"/>,disabled:readOnly},{id:'template',label:editorCopy.useTemplate,icon:<Mail className="size-4"/>,disabled:readOnly}]}/>
                <p className="text-sm leading-5 text-slate-500 dark:text-slate-400">{contentMode==='write'?editorCopy.writeHint:editorCopy.templateHint}</p>
              </section>
              <div hidden={contentMode!=='template'}>
              <CampaignTemplatePicker
                onBusy={setTemplateBusy}
                copy={copy}
                disabled={readOnly}
                onApply={(value) => {
                  setError("");
                  setInvalidField(null);
                  setFiles(value.attachments??[]);setDraft((d) => ({
                    ...d,
                    subject: value.subject,
                    previewText: value.previewText,
                    bodyText: value.bodyText,
                    bodyHtml: value.bodyHtml,
                    attachmentIds:(value.attachments??[]).map(f=>f.id),
                  }));}
                }
              />
              </div>
              {variables.length>0&&<MailTemplateVariables key={variables.join('|')} names={variables} disabled={readOnly} onApply={values=>{
                const resolved=resolveMailTemplateVariables({subject:draft.subject,bodyText:draft.bodyText,bodyHtml:draft.bodyHtml??null},values);
                const previewText=resolveMailTemplateVariables({subject:draft.previewText,bodyText:'',bodyHtml:null},values).subject;
                if(resolved.subject.length>240||previewText.length>240||resolved.bodyText.length>18000||resolved.bodyHtml.length>500000){setError(copy.saveError);return;}
                setDraft(previous=>({...previous,...resolved,previewText}));setError('');
              }}/>}
              {field("subject", copy.subject, 240)}
              {field("previewText", copy.previewText, 240)}
              <div className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span>{copy.body}</span>
                <MailRichEditor
                  label={copy.body}
                  text={draft.bodyText}
                  html={draft.bodyHtml ?? null}
                  onBusy={setEditorBusy}
                  disabled={readOnly}
                  onChange={(bodyText, bodyHtml) => {
                    setDraft(d => ({ ...d, bodyText, bodyHtml }));
                    if (invalidField === "bodyText") {
                      setError("");
                      setInvalidField(null);
                    }
                  }}
                />
              </div>
              <MailingFiles files={files} disabled={readOnly} onBusy={setFileBusy} onChange={canEdit?value=>{setFiles(value);setDraft(d=>({...d,attachmentIds:value.map(f=>f.id)}));}:undefined}/>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {audienceCopy.personalization}
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <IndiceModalSummary
                title={editorCopy.summary}
                columns={2}
                className="[&_dd]:whitespace-normal [&_dd]:break-words"
                items={[
                  { label: copy.campaign, value: draft.name, emphasized: true },
                  { label: copy.selected, value: contacts.length },
                  {
                    label: emailCopy.senderAccount,
                    value: sender
                      ? `${sender.label} · ${sender.email}`
                      : draft.senderAccountId
                        ? emailCopy.senderUnavailable
                        : emailCopy.disabled,
                  },
                  {
                    label: "SMTP",
                    value: sender
                      ? sender.smtpStatus === "VERIFIED"
                        ? emailCopy.verified
                        : sender.smtpStatus === "ERROR"
                          ? emailCopy.failed
                          : emailCopy.untested
                      : "—",
                  },
                  { label: copy.senderName, value: draft.senderName || "—" },
                  { label: copy.replyTo, value: draft.replyTo || "—" },
                ]}
              />
              <section
                aria-label={copy.preview}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="mb-3 text-xs font-medium text-[#B63B32] dark:text-[#FF9D94]">
                  {editorCopy.messagePreview}
                </p>
                <h3 className="mb-2 text-lg font-medium">
                  {(draft.subject || copy.subject)
                    .split("{{name}}")
                    .join(contacts[0]?.name ?? copy.sample)}
                </h3>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  {draft.previewText}
                </p>
                <MailFormattedPreview label={editorCopy.messagePreview}
                  text={draft.bodyText.split("{{name}}").join(contacts[0]?.name ?? copy.sample)}
                  html={draft.bodyHtml?.split("{{name}}").join(plainMailHtml(contacts[0]?.name ?? copy.sample))} />
              </section>
              <MailingFiles files={files}/>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {deliveryCopy.note}
              </p>
            </div>
          )}
        </SalesDocumentWizard>
      </div>
    </SalesModalFrame>
  );
}
