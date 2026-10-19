import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  Target,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { IndiceModalSummary } from "../../../components/indice-modal";
import { getCachedAuthSession } from "../../../api/authSessionStore";
import { SalesModalFrame } from "../components/SalesModalFrame";
import { SalesDocumentWizard } from "../components/SalesDocumentWizard";
import {
  whatsappingApi,
  type CampaignInput,
  type Detail,
  type Template,
  type SavedList,
} from "./whatsappingApi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import { ContactPicker } from "./ContactPicker";
import {
  control,
  Field,
  panel,
  MessagePreview,
  ErrorNotice,
  useDirtyExit,
} from "./WhatsappingUi";
import {
  freshCampaign,
  failure,
  preview,
  validBody,
  variables,
} from "./whatsappingModel";
export function CampaignEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Detail | null;
  onClose: () => void;
  onSaved: (detail: Detail) => void;
}) {
  const { copy, label, locale } = useWhatsappingCopy();
  const [id] = useState(() => initial?.campaign.id ?? crypto.randomUUID());
  const [draft, setDraft] = useState<CampaignInput>(() =>
    initial
      ? {
          ...initial.campaign,
          contactIds: initial.recipients.map((r) => r.contact.id),
        }
      : freshCampaign(copy),
  );
  const original = useRef(JSON.stringify(draft)),
    inFlight = useRef(false),
    mounted = useRef(true);
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false),
    [templates, setTemplates] = useState<Template[]>([]),
    [lists, setLists] = useState<SavedList[]>([]);
  const dirty = original.current !== JSON.stringify(draft);
  useDirtyExit(dirty);
  useEffect(() => {
    mounted.current = true;
    const c = new AbortController();
    void Promise.all([
      whatsappingApi.templates(c.signal),
      whatsappingApi.lists(c.signal),
    ])
      .then(([t, l]) => {
        if (!c.signal.aborted) {
          setTemplates(t);
          setLists(l);
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(failure(e, copy));
      });
    return () => {
      c.abort();
      mounted.current = false;
    };
  }, []);
  const update = (patch: Partial<CampaignInput>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };
  function close() {
    if (inFlight.current) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function valid(index: number) {
    if (
      index === 0 &&
      (!draft.name.trim() ||
        (draft.resourceUrl &&
          !/^https:\/\/[^/]+\.[^/]+/.test(draft.resourceUrl)))
    )
      return copy.required;
    if (index === 1 && !draft.contactIds.length) return copy.noContacts;
    if (
      index === 2 &&
      draft.steps.some((s) => !s.name.trim() || !validBody(s.body))
    )
      return copy.missing;
    return "";
  }
  async function save() {
    if (inFlight.current) return;
    const err = valid(0);
    if (err) {
      setStep(0);
      setError(err);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await whatsappingApi.save(id, draft);
      if (mounted.current) onSaved(result);
    } catch (e) {
      if (mounted.current) setError(failure(e, copy));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const session = getCachedAuthSession();
  const values = {
    name: initial?.recipients[0]?.contact.name || copy.sample,
    clientCompany: initial?.recipients[0]?.contact.companyName || copy.company,
    seller: session?.user.name || copy.owner,
    company: session?.company.name || copy.company,
    offer: draft.offer,
    link: draft.resourceUrl,
  };
  const stepHints = [
    copy.detailsHint,
    copy.contactsHint,
    copy.messageHint,
    copy.reviewHint,
  ];
  const stepLabels = [copy.details, copy.contacts, copy.message, copy.review];
  const tokenLabels = [
    copy.name,
    copy.company,
    copy.owner,
    copy.company,
    copy.offer,
    copy.resource,
  ];
  return (
    <SalesModalFrame
      open
      modalType={discard ? "confirmation" : "wizard"}
      busy={busy}
      title={discard ? copy.discardTitle : draft.name || copy.newCampaign}
      description={discard ? copy.emptyHint : stepHints[step]}
      eyebrow={discard ? undefined : `${step + 1} / 4 · ${stepLabels[step]}`}
      icon={<MessageCircle />}
      closeLabel={copy.close}
      onOpenChange={discard ? () => setDiscard(false) : close}
      footerLeading={
        <Button
          variant="outline"
          onClick={discard ? () => setDiscard(false) : close}
          disabled={busy}
        >
          {discard ? copy.keep : copy.cancel}
        </Button>
      }
      footerSummary={
        !discard ? `${draft.contactIds.length} · ${copy.contacts}` : undefined
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
                disabled={busy}
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {copy.back}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void save()}
            >
              <Save className="size-4" aria-hidden="true" />
              {busy ? copy.loading : copy.saveDraft}
            </Button>
            {step < 3 && (
              <Button
                disabled={busy}
                onClick={() => {
                  const err = valid(step);
                  if (err) setError(err);
                  else {
                    setStep((s) => s + 1);
                    setError("");
                  }
                }}
              >
                {copy.next}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </>
        )
      }
    >
      {!discard && (
        <SalesDocumentWizard
          activeStepId={String(step)}
          progressLabel={copy.progress}
          steps={stepLabels.map((text, i) => ({ id: String(i), label: text }))}
          validation={<ErrorNotice text={error} />}
        >
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {step === 0 && (
              <section className={`${panel} space-y-4`}>
                <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Target
                    className="size-4 text-[#B63B32] dark:text-[#FFB0AA]"
                    aria-hidden="true"
                  />
                  {copy.details}
                </h3>
                <Field label={`${copy.campaignName} *`}>
                  <Input
                    autoFocus
                    placeholder={copy.namePlaceholder}
                    value={draft.name}
                    maxLength={180}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={copy.objective}>
                    <select
                      className={control}
                      value={draft.objective}
                      onChange={(e) => update({ objective: e.target.value })}
                    >
                      {[
                        "WELCOME",
                        "QUOTE",
                        "RENEWAL",
                        "PROMOTION",
                        "RECOVERY",
                        "OTHER",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {label(v)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={copy.region}>
                    <select
                      className={control}
                      value={draft.defaultRegion}
                      onChange={(e) =>
                        update({ defaultRegion: e.target.value })
                      }
                    >
                      {[
                        "MX",
                        "CA",
                        "US",
                        "CO",
                        "BR",
                        "AR",
                        "CL",
                        "PE",
                        "ES",
                        "FR",
                        "GB",
                        "KR",
                        "CN",
                      ].map((v) => (
                        <option key={v} value={v}>
                          {new Intl.DisplayNames([locale], {
                            type: "region",
                          }).of(v)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label={copy.offer}>
                  <Input
                    maxLength={240}
                    value={draft.offer}
                    onChange={(e) => update({ offer: e.target.value })}
                  />
                </Field>
                <Field label={copy.resource}>
                  <Input
                    type="url"
                    maxLength={1600}
                    value={draft.resourceUrl}
                    placeholder="https://"
                    onChange={(e) => update({ resourceUrl: e.target.value })}
                  />
                </Field>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {copy.resourceHint}
                </p>
              </section>
            )}
            {step === 1 && (
              <>
                <Field label={copy.applyList}>
                  <select
                    className={control}
                    value=""
                    onChange={(e) => {
                      const list = lists.find((l) => l.id === e.target.value);
                      if (list) {
                        const ids = [
                          ...new Set([...draft.contactIds, ...list.contactIds]),
                        ];
                        if (ids.length > 500) setError(copy.limit);
                        else update({ contactIds: ids });
                      }
                    }}
                  >
                    <option value="">{copy.lists}</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.contactIds.length}
                      </option>
                    ))}
                  </select>
                </Field>
                <ContactPicker
                  selected={draft.contactIds}
                  region={draft.defaultRegion}
                  onChange={(contactIds) => update({ contactIds })}
                  disabled={busy}
                />
              </>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <p className="rounded-xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {copy.sequenceHint}
                </p>
                {draft.steps.map((item, i) => (
                  <section key={i} className={`${panel} space-y-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-sm font-medium">
                        <span className="flex size-8 items-center justify-center rounded-full bg-[#FF6B5E]/10 text-[#B63B32] dark:text-[#FFB0AA]">
                          {i + 1}
                        </span>
                        {copy.sequence}
                      </h3>
                      {i > 0 && (
                        <Button
                          variant="ghost"
                          type="button"
                          aria-label={`${copy.remove}: ${i + 1}`}
                          onClick={() =>
                            update({
                              steps: draft.steps.filter((_, n) => n !== i),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={copy.stepName}>
                        <Input
                          value={item.name}
                          maxLength={100}
                          onChange={(e) =>
                            update({
                              steps: draft.steps.map((s, n) =>
                                n === i ? { ...s, name: e.target.value } : s,
                              ),
                            })
                          }
                        />
                      </Field>
                      {i > 0 && (
                        <Field label={copy.delay}>
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={item.delayDays}
                            onChange={(e) =>
                              update({
                                steps: draft.steps.map((s, n) =>
                                  n === i
                                    ? {
                                        ...s,
                                        delayDays: Math.min(
                                          365,
                                          Math.max(
                                            0,
                                            Number(e.target.value) || 0,
                                          ),
                                        ),
                                      }
                                    : s,
                                ),
                              })
                            }
                          />
                        </Field>
                      )}
                    </div>
                    <Field label={copy.template}>
                      <select
                        className={control}
                        value=""
                        onChange={(e) => {
                          const t = templates.find(
                            (t) => t.id === e.target.value,
                          );
                          if (t)
                            update({
                              steps: draft.steps.map((s, n) =>
                                n === i ? { ...s, body: t.body } : s,
                              ),
                            });
                        }}
                      >
                        <option value="">{copy.template}</option>
                        {templates
                          .filter((t) => t.status === "ACTIVE")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label={copy.message}>
                      <Textarea
                        className="min-h-36"
                        rows={5}
                        maxLength={4000}
                        value={item.body}
                        onChange={(e) =>
                          update({
                            steps: draft.steps.map((s, n) =>
                              n === i ? { ...s, body: e.target.value } : s,
                            ),
                          })
                        }
                      />
                    </Field>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {copy.variables}
                    </p>
                    <div
                      aria-label={copy.variables}
                      className="flex flex-wrap gap-2"
                    >
                      {variables.map((token, j) => (
                        <Button
                          key={token}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            update({
                              steps: draft.steps.map((s, n) =>
                                n === i
                                  ? {
                                      ...s,
                                      body: `${s.body} {{${token}}}`
                                        .trim()
                                        .slice(0, 4000),
                                    }
                                  : s,
                              ),
                            })
                          }
                        >
                          {tokenLabels[j]}{" "}
                          <span className="text-xs text-slate-500">{`{{${token}}}`}</span>
                        </Button>
                      ))}
                    </div>
                    <MessagePreview title={copy.preview}>
                      {preview(item.body, values) || "—"}
                    </MessagePreview>
                  </section>
                ))}
                <Button
                  variant="outline"
                  disabled={draft.steps.length >= 5}
                  onClick={() =>
                    update({
                      steps: [
                        ...draft.steps,
                        { name: copy.due, delayDays: 3, body: "" },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.addStep}
                </Button>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <IndiceModalSummary
                  title={draft.name}
                  variant="accent"
                  columns={2}
                  items={[
                    { label: copy.objective, value: label(draft.objective) },
                    {
                      label: copy.contacts,
                      value: String(draft.contactIds.length),
                    },
                    { label: copy.owner, value: values.seller },
                    { label: copy.sequence, value: String(draft.steps.length) },
                  ]}
                />
                {draft.steps.map((s, i) => (
                  <MessagePreview key={i} title={`${i + 1}. ${s.name}`}>
                    {preview(s.body, values) || "—"}
                  </MessagePreview>
                ))}
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {copy.manualHint}
                </p>
              </div>
            )}
          </fieldset>
        </SalesDocumentWizard>
      )}
    </SalesModalFrame>
  );
}
