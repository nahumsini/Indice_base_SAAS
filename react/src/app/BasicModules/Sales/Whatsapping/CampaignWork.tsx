import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Pause,
  Play,
  Save,
  ShieldOff,
  SkipForward,
  RefreshCw,
  Users,
  ChevronDown,
  CalendarClock,
  Archive,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { IndiceWorkspaceNavigation, IndiceTitleBarOverflow } from "../../../components/frontend-os";
import { ModuleTabEmoji } from "../../../components/icons/ModuleTabEmoji";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from "../components/SalesTitleBar";
import {
  SalesFilterBar,
  SalesFilterSearch,
  SalesFilterSelect,
} from "../components/SalesFilterBar";
import { SalesModalFrame } from "../components/SalesModalFrame";
import {
  whatsappingApi,
  type Action,
  type Detail,
  type Recipient,
  type Opportunity,
} from "./whatsappingApi";
import { isResultView, matchesResultRecipient, resultRecipientIds, type RecipientView } from "./campaignRecipientViews";
import { useContactCorrectionReturn } from "./useContactCorrectionReturn";
import { contactIssues, contactCorrectionUrl } from "./campaignContactSelection";
import { useWhatsappingCopy } from "./whatsappingCopy";
import {
  Badge,
  ErrorNotice,
  Field,
  panel,
  CampaignProgress,
  useDirtyExit,
} from "./WhatsappingUi";
import {
  due,
  ready,
  terminal,
  failure,
  localDate,
  isoDate,
} from "./whatsappingModel";
import { contactOpportunities, mergeOpportunityReturn } from "./contactOpportunities";
import { useOpportunityReturn } from "./useOpportunityReturn";
import { buildOpportunityStageFilter, matchesOpportunityStage } from "./opportunityStageFilters";
import { useProspectosTranslations } from "../Prospectos/hooks/useProspectosTranslations";
import { ContactOpportunitySummary } from "./ContactOpportunitySummary";
import { ContactOpportunityAction } from "./ContactOpportunityAction";
const CampaignOpportunity = lazy(() => import("./CampaignOpportunity"));
export function CampaignWork({
  detail,
  onChange,
  onBack,
  onEdit,
  initialView = "PENDING",
}: {
  initialView?: RecipientView;
  detail: Detail;
  onChange: (d: Detail) => void;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { copy, label, locale } = useWhatsappingCopy();
  const c = detail.campaign;
  const opportunityCopy = useProspectosTranslations();
  const [opportunityStage, setOpportunityStage] = useState("ALL");
  const [selected, setSelected] = useState<number | null>(
    () =>
      isResultView(initialView)
        ? detail.recipients.find(r => matchesResultRecipient(r, initialView, detail.resultContacts))?.contact.id ?? null
        : initialView === "DUE"
        ? detail.recipients.find(r => r.state === "WAITING" && due(r))?.contact.id ?? null
        : detail.recipients.find((r) => ready(r))?.contact.id ?? detail.recipients[0]?.contact.id ?? null,
  );
  const [search, setSearch] = useState(""),
    [view, setView] = useState<string>(initialView),
    [notes, setNotes] = useState(""),
    [date, setDate] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirmation, setConfirmation] = useState<
      "BLOCK" | "ACTIVE" | "ARCHIVED" | number | "BACK" | "REFRESH" | null
    >(null),
    [clock, setClock] = useState(Date.now()),
    [queueOpen, setQueueOpen] = useState(false);
  const [section, setSection] = useState<"message" | "followUp" | "history">(initialView === "DUE" ? "followUp" : "message");
  // URL/filter changes do not remount the work view or reset its inputs/selection.
  useEffect(() => { setView(initialView); }, [initialView]);
  const [opportunityOpen, setOpportunityOpen] = useState(false);
  const [createdOpportunities, setCreatedOpportunities] = useState<Opportunity[]>([]);
  const latestDetail = useRef(detail);
  latestDetail.current = detail;
  const [failedOpportunityReturn, setFailedOpportunityReturn] = useState<number | null>(null);
  const reasonId = useId();
  const contactHeading = useRef<HTMLHeadingElement>(null);
  const latch = useRef(false),
    mounted = useRef(true);
  const current = detail.recipients.find((r) => r.contact.id === selected);
  const currentOpportunities = current ? contactOpportunities(detail, current.contact.id, createdOpportunities) : undefined;
  const opportunityLabel = (opportunities: Opportunity[] | null | undefined) => opportunities === null ? copy.noOpportunityAccess : opportunities === undefined ? copy.opportunityUnknown : opportunities.length ? `${copy.hasOpportunity}${opportunities.length > 1 ? ` (${opportunities.length})` : ""}` : copy.noOpportunity;
  const missingContactData = current ? contactIssues({ ...current.contact, eligibility: current.eligibility }, c.steps.some(step => /{{\s*clientCompany\s*}}/.test(step.body))) : [];
  const messageDrafts = useRef(new Map<string, string>());
  const [messageDraft, setMessageDraft] = useState(() => current?.message ?? "");
  useEffect(() => { setMessageDraft(current ? messageDrafts.current.get(`${current.contact.id}:${current.stepIndex}`) ?? current.message : ""); }, [current?.contact.id, current?.stepIndex]);
  const messageDirty = !!current && messageDraft !== current.message;
  const messageInvalid = !messageDraft.trim() || messageDraft.length > 4000 || messageDraft.includes("{{") || messageDraft.includes("}}");
  const preserveInputsForVersion = useRef<string | null>(null);
  const followDirty = !!current && (notes !== current.notes || date !== localDate(current.nextActionAt));
  const dirty = followDirty || messageDirty;
  useDirtyExit(dirty || messageDrafts.current.size > 0);
  useEffect(() => {
    if (current) {
      const keepInput = preserveInputsForVersion.current === `${current.contact.id}:${current.version}`;
      preserveInputsForVersion.current = null;
      if (keepInput) return;
      setNotes(current.notes);
      setDate(localDate(current.nextActionAt));
    }
  }, [current?.contact.id, current?.version]);
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => {
      clearInterval(timer);
      mounted.current = false;
    };
  }, []);
  const dateText = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const canWork = c.canEdit && ["DRAFT", "ACTIVE"].includes(c.status),
    canFollow = c.canEdit && ["DRAFT", "ACTIVE", "COMPLETED"].includes(c.status);
  // Include overdue follow-ups and all of today in the user's local timezone.
  const tomorrow = new Date(clock);
  tomorrow.setHours(24, 0, 0, 0);
  const forToday = (r: Recipient) => r.state === "WAITING" &&
    (!r.nextActionAt || new Date(r.nextActionAt).getTime() < tomorrow.getTime());
  const counts = {
    PENDING: detail.recipients.filter((r) => !terminal(r.state)).length,
    DUE: detail.recipients.filter((r) => r.state === "WAITING" && due(r, clock))
      .length,
    TODAY: detail.recipients.filter(forToday).length,
    FINISHED: detail.recipients.filter((r) => terminal(r.state)).length,
    CONTACTED: resultRecipientIds("CONTACTED", detail.resultContacts).length,
    POSITIVE: resultRecipientIds("POSITIVE", detail.resultContacts).length,
    NEGATIVE: resultRecipientIds("NEGATIVE", detail.resultContacts).length,
    OPPORTUNITY: resultRecipientIds("OPPORTUNITY", detail.resultContacts).length,
  };
  const baseRecipients = detail.recipients.filter(
    (r) =>
      `${r.contact.name} ${r.contact.companyName} ${r.contact.phone}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (view === "ALL" ||
        (view === "PENDING" && !terminal(r.state)) ||
        (view === "TODAY" && forToday(r)) ||
        (view === "DUE" && r.state === "WAITING" && due(r, clock)) ||
        (view === "FINISHED" && terminal(r.state)) ||
        matchesResultRecipient(r, view, detail.resultContacts)),
  );
  const stageFilter = buildOpportunityStageFilter(detail.recipients,
    detail.opportunities == null ? detail.opportunities : [...detail.opportunities, ...createdOpportunities],
    baseRecipients, opportunityCopy.options.stages, copy, locale);
  const stageAvailable = stageFilter.available && stageFilter.options.some(option => option.value === opportunityStage);
  const effectiveStage = stageAvailable ? opportunityStage : "ALL";
  useEffect(() => {
    // Only an invalid stage is cleared after owner metadata/permission or locale changes.
    if (!stageAvailable && opportunityStage !== "ALL") setOpportunityStage("ALL");
  }, [stageAvailable, opportunityStage]);
  const filtered = baseRecipients.filter(recipient => matchesOpportunityStage(recipient.contact.id, effectiveStage, stageFilter));
  async function beginOpportunity() {
    if (latch.current || !current) return;
    latch.current = true; setBusy(true); setError("");
    try {
      const refreshed = await whatsappingApi.get(c.id);
      if (!mounted.current) return;
      // Refresh only the read-only projection; recipient versions and unsaved inputs stay intact.
      onChange({ ...detail, opportunities: refreshed.opportunities });
      const existing = contactOpportunities(refreshed, current.contact.id, createdOpportunities);
      if (existing == null) setError(existing === null ? copy.noOpportunityAccess : copy.opportunityUnknown);
      else if (existing.length) setNotice(copy.hasOpportunity);
      else setOpportunityOpen(true);
    } catch (e) {
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function choose(id: number | "BACK") {
    if (latch.current) return;
    if (dirty || (id === "BACK" && messageDrafts.current.size > 0)) {
      setConfirmation(id);
      return;
    }
    if (id === "BACK") onBack();
    else {
      setSelected(id);
      setQueueOpen(false);
      if (window.matchMedia("(max-width: 1023px)").matches)
        requestAnimationFrame(() =>
          contactHeading.current?.focus({ preventScroll: true }),
        );
      setError("");
      setNotice("");
    }
  }
  async function refresh() {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await whatsappingApi.get(c.id);
      if (mounted.current) {
        const refreshed = d.recipients.find((r) => r.contact.id === selected);
        if (refreshed) {
          setNotes(refreshed.notes);
          setDate(localDate(refreshed.nextActionAt));
          messageDrafts.current.delete(`${refreshed.contact.id}:${refreshed.stepIndex}`);
          setMessageDraft(refreshed.message);
        }
        onChange(d);
      }
    } catch (e) {
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function state(status: string) {
    if (latch.current) return;
    latch.current = true;
    setBusy(true);
    setError("");
    setConfirmation(null);
    try {
      const d = await whatsappingApi.state(c.id, c.version, status);
      if (mounted.current) onChange(d);
    } catch (e) {
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function act(action: Action, advanceAfterSave = false, resultNotice?: string) {
    if (latch.current || !current || (action === "PREPARE" && messageInvalid) || (action === "SENT" && messageDirty)) return;
    let popup: Window | null = null;
    if (action === "PREPARE") {
      popup = window.open("about:blank", "_blank");
      if (!popup) {
        setError(copy.popup);
        return;
      }
      popup.opener = null;
    }
    latch.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setConfirmation(null);
    try {
      let recipientVersion = current.version;
      if (c.status === "DRAFT") {
        const activated = await whatsappingApi.state(c.id, c.version, "ACTIVE");
        if (!mounted.current) { popup?.close(); return; }
        // Keep local notes and message when activation freezes the audience.
        const recipient = activated.recipients.find(r => r.contact.id === selected);
        if (!recipient) throw new Error(copy.noMatch);
        preserveInputsForVersion.current = `${recipient.contact.id}:${recipient.version}`;
        recipientVersion = recipient.version;
        onChange(activated);
      }
      const result = await whatsappingApi.action(
        c.id,
        current.contact.id,
        recipientVersion,
        action,
        notes,
        isoDate(date),
        action === "PREPARE" ? messageDraft : undefined,
      );
      if (!mounted.current) {
        popup?.close();
        return;
      }
      const advances = advanceAfterSave || ["SENT", "REPLIED", "REPLY_POSITIVE", "REPLY_NEGATIVE", "SKIP"].includes(action);
      const draftKey = `${current.contact.id}:${current.stepIndex}`;
      if (advances && messageDirty) messageDrafts.current.set(draftKey, messageDraft);
      else if (action === "PREPARE" || action === "SENT") messageDrafts.current.delete(draftKey);
      if (action === "PREPARE" || action === "SENT") setMessageDraft(result.detail.recipients.find(r => r.contact.id === selected)?.message ?? "");
      onChange(result.detail);
      if (advances) {
        // Advance only after a successful result, within the visible queue, wrapping once.
        const start = filtered.findIndex(r => r.contact.id === current.contact.id);
        const ordered = [...filtered.slice(start + 1), ...filtered.slice(0, Math.max(0, start))];
        const nextPending = ordered.map(row => result.detail.recipients.find(r => r.contact.id === row.contact.id))
          .find(row => row && !terminal(row.state));
        if (nextPending) {
          setSelected(nextPending.contact.id);
          setQueueOpen(false);
          requestAnimationFrame(() => contactHeading.current?.focus({ preventScroll: true }));
        }
      }
      if (action === "PREPARE" && popup) {
        if (result.whatsappUrl?.startsWith("https://wa.me/"))
          popup.location.href = result.whatsappUrl;
        else popup.close();
      }
      setNotice(resultNotice ?? label(action));
    } catch (e) {
      popup?.close();
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const queueIndex = filtered.findIndex((r) => r.contact.id === selected);
  const previousRow = queueIndex > 0 ? filtered[queueIndex - 1] : undefined;
  const nextRow = queueIndex >= 0 ? filtered[queueIndex + 1] : filtered[0];
  function next() {
    if (nextRow) choose(nextRow.contact.id);
  }
  const workReason = busy ? copy.waitAction : !c.canEdit ? copy.permissionAction
    : c.status === "PAUSED" ? copy.pausedWorkHint
    : c.status === "ARCHIVED" ? copy.archivedAction : !["DRAFT", "ACTIVE"].includes(c.status) ? copy.closedAction : "";
  const followReason = canFollow ? (busy ? copy.waitAction : "") : workReason;
  const terminalReason = current?.state === "BLOCKED" ? copy.blockedContactAction : copy.finishedContactAction;
  const eligibilityReason: Record<string, string> = {
    INVALID: copy.invalidPhoneAction, INACTIVE: copy.inactiveContactAction,
    DUPLICATE: copy.duplicateContactAction, MISSING_DATA: copy.missingMessageAction,
    BLOCKED: copy.blockedContactAction,
  };
  const openReason = workReason || (current && (
    terminal(current.state) ? terminalReason : current.eligibility !== "READY"
      ? eligibilityReason[current.eligibility] || copy.noReady
      : !due(current, clock) ? copy.waitDateAction
      : date !== localDate(current.nextActionAt) ? copy.saveDateHint : ""));
  const sentReason = workReason || (messageDirty ? copy.reopenPersonalMessage : "") || (current?.state !== "PREPARED"
    ? current && terminal(current.state) ? terminalReason : copy.prepareFirstAction : "");
  const replyReason = followReason || (current && ["BLOCKED", "SKIPPED", "REPLIED"].includes(current.state)
    ? current.state === "REPLIED" ? copy.alreadyReplyAction : terminalReason : "");
  const skipReason = workReason || (current && terminal(current.state) ? terminalReason : "");
  const blockReason = followReason || (current?.state === "BLOCKED" ? copy.blockedContactAction : "");
  const saveReason = followReason || (!followDirty ? copy.noChangesAction : "");
  const markCorrection = useContactCorrectionReturn(() => {
    if (latch.current) { setNotice(copy.correctionRetry); return; }
    const savedInputDirty = dirty;
    latch.current = true;
    setBusy(true); setError(""); setNotice(copy.checkingCorrection);
    void whatsappingApi.get(c.id).then(value => {
      if (!mounted.current) return;
      const refreshed = value.recipients.find(r => r.contact.id === selected);
      if (refreshed) {
        if (savedInputDirty) preserveInputsForVersion.current = `${refreshed.contact.id}:${refreshed.version}`;
        else { setNotes(refreshed.notes); setDate(localDate(refreshed.nextActionAt)); setMessageDraft(refreshed.message); }
        const issues = contactIssues({ ...refreshed.contact, eligibility: refreshed.eligibility }, c.steps.some(step => /{{\s*clientCompany\s*}}/.test(step.body)));
        const feedback = `${refreshed.contact.name}: ${issues.length ? issues.map(issue => copy[issue]).join(" · ") : label(refreshed.eligibility)}`;
        if (issues.length || refreshed.eligibility !== "READY") { setNotice(""); setError(feedback); }
        else setNotice(feedback);
      } else setNotice(copy.correctionUnavailable);
      onChange(value);
    }).catch(() => { if (mounted.current) { setNotice(""); setError(copy.correctionRetry); } })
      .finally(() => { latch.current = false; if (mounted.current) setBusy(false); });
  });
  const opportunityReturn = useOpportunityReturn(async (contactId, signal) => {
    if (latch.current) return;
    latch.current = true;
    setBusy(true); setError(""); setNotice(copy.checkingOpportunity); setFailedOpportunityReturn(null);
    try {
      const refreshed = await whatsappingApi.get(c.id, signal);
      if (!mounted.current || signal.aborted) return;
      const merged = mergeOpportunityReturn(latestDetail.current, refreshed);
      setCreatedOpportunities([]); // A fresh owner read supersedes even locally confirmed references.
      onChange(merged);
      setNotice(copy.opportunityUpdated);
    } catch {
      if (mounted.current && !signal.aborted) {
        setNotice(""); setFailedOpportunityReturn(contactId);
      }
    } finally {
      latch.current = false;
      if (mounted.current && !signal.aborted) setBusy(false);
    }
  }, !busy && !opportunityOpen && confirmation === null);
  const recipientLabel = (r: Recipient) => r.state === "REPLIED"
    ? label(r.replyOutcome ?? detail.events.find(e => e.contactId === r.contact.id && ["REPLY_POSITIVE", "REPLY_NEGATIVE", "REPLIED"].includes(e.action))?.action ?? r.state)
    : label(r.state);
  const listDisabled = busy;
  return (
    <div className="min-w-0 space-y-5">
      <SalesTitleBar
        icon={
          <ModuleTabEmoji
            moduleId="sales"
            tabId="whatsapping"
            className="size-8"
          />
        }
        title={c.name}
        subtitle={copy.workHint}
        actions={
          <div className="grid grid-cols-2 gap-2 [&>button]:whitespace-normal sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              disabled={busy}
              onClick={() => choose("BACK")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.back}
            </Button>
            {c.canEdit && c.status === "DRAFT" && (
              <Button variant="outline" className={salesTitleBarSecondaryActionClassName}
                disabled={busy} onClick={onEdit}>
                <Pencil className="size-4" />{copy.edit}
              </Button>
            )}
            {c.canEdit && ["ACTIVE", "PAUSED"].includes(c.status) ? (
              <Button
                variant="outline"
                className={
                  c.status === "PAUSED"
                    ? salesTitleBarPrimaryActionClassName
                    : salesTitleBarSecondaryActionClassName
                }
                disabled={busy || dirty}
                onClick={() =>
                  void state(c.status === "ACTIVE" ? "PAUSED" : "ACTIVE")
                }
              >
                {c.status === "ACTIVE" ? (
                  <Pause className="mr-2 h-4 w-4" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {c.status === "ACTIVE" ? copy.pause : copy.resume}
              </Button>
            ) : null}
            {c.canEdit && c.status === "COMPLETED" && (
              <Button
                variant="outline"
                className={salesTitleBarSecondaryActionClassName}
                disabled={busy || dirty}
                onClick={() => setConfirmation("ARCHIVED")}
              >
                <Archive className="size-4" aria-hidden="true" />
                {copy.archive}
              </Button>
            )}
            {(
              <IndiceTitleBarOverflow
                label={copy.actions}
                items={[
                  { id: "refresh", label: copy.refresh, icon: <RefreshCw className="size-4" />,
                    disabled: busy, onSelect: () => dirty ? setConfirmation("REFRESH") : void refresh() },
                  ...(c.canEdit && ["DRAFT", "ACTIVE", "PAUSED"].includes(c.status) ? [{
                    id: "archive",
                    label: copy.archive,
                    icon: <Archive className="size-4" />,
                    disabled: busy || dirty,
                    onSelect: () => setConfirmation("ARCHIVED"),
                  }] : []),
                ]}
              />
            )}
          </div>
        }
      />
      <ErrorNotice text={error} />
      {failedOpportunityReturn !== null && <div className="space-y-2"><ErrorNotice text={copy.opportunityReturnRetry} /><Button variant="outline" className="min-h-11" disabled={busy} onClick={() => opportunityReturn.retry(failedOpportunityReturn)}>{copy.retry}</Button></div>}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}
      <section
        aria-label={copy.campaignContext}
        className={`${panel} !p-3 sm:!px-4`}
      >
        <div className="grid min-w-0 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(160px,240px)]">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Badge state={c.status}>{label(c.status)}</Badge>
            <span>{label(c.objective)}</span>
            <span className="break-words text-xs text-slate-500 dark:text-slate-400">{copy.owner}: {c.ownerName}</span>
          </div>
          <CampaignProgress done={c.done} total={c.total} label={copy.progress} />
        </div>
        {busy && <p role="status" className="mt-2 text-sm">{copy.waitAction}</p>}
      </section>
      {c.status === "DRAFT" &&
        !detail.recipients.some((r) => r.eligibility === "READY") && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {copy.noReady}
          </p>
        )}
      <div className="space-y-2">
        <IndiceWorkspaceNavigation<string>
          ariaLabel={copy.contactShortcuts}
          tone="coral"
          variant="views"
          value={view}
          onValueChange={setView}
          items={[
            { id: "PENDING", label: `${copy.pending} (${counts.PENDING})` },
            { id: "TODAY", label: `${copy.followUpsToday} (${counts.TODAY})` },
            { id: "FINISHED", label: `${copy.finished} (${counts.FINISHED})` },
          ]}
        />
        {view === "TODAY" && <p className="text-xs text-slate-500 dark:text-slate-400">{copy.todayHint}</p>}
      </div>
      <SalesFilterBar
        title={copy.filters}
        gridClassName={stageFilter.available ? "md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)_minmax(220px,1fr)]" : "md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]"}
        summary={`${filtered.length} / ${detail.recipients.length}`}
      >
        <SalesFilterSearch
          label={copy.search}
          placeholder={copy.searchContact}
          value={search}
          onValueChange={setSearch}
          onClear={() => setSearch("")}
          clearLabel={copy.clear}
        />
        <SalesFilterSelect
          label={copy.showContacts}
          value={view}
          onValueChange={setView}
          options={[
            { value: "PENDING", label: `${copy.pending} (${counts.PENDING})` },
            { value: "TODAY", label: `${copy.followUpsToday} (${counts.TODAY})` },
            { value: "DUE", label: `${copy.due} (${counts.DUE})` },
            {
              value: "FINISHED",
              label: `${copy.finished} (${counts.FINISHED})`,
            },
            { value: "CONTACTED", label: `${copy.contacted} (${counts.CONTACTED})` },
            { value: "POSITIVE", label: `${copy.positiveResponses} (${counts.POSITIVE})` },
            { value: "NEGATIVE", label: `${copy.negativeResponses} (${counts.NEGATIVE})` },
            { value: "OPPORTUNITY", label: detail.resultContacts?.withOpportunity == null ? copy.noOpportunityAccess : `${copy.contactsWithOpportunity} (${counts.OPPORTUNITY})`, disabled: detail.resultContacts?.withOpportunity == null },
            { value: "ALL", label: copy.all },
          ]}
        />
        {stageFilter.available && <div className="min-w-0 space-y-1 md:col-span-2 xl:col-span-1">
          <SalesFilterSelect label={copy.opportunityStageFilter} value={effectiveStage} onValueChange={setOpportunityStage}
            triggerClassName="text-left [&_[data-slot=select-value]]:!block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:flex-1 [&_[data-slot=select-value]]:truncate [&_[data-slot=select-value]]:!whitespace-nowrap"
            options={stageFilter.options.map(option => ({ value: option.value, label: `${option.label} (${option.count})` }))} />
          <p className="text-xs text-slate-500 dark:text-slate-400">{copy.opportunityStageFilterHint}</p>
        </div>}
      </SalesFilterBar>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,310px)_minmax(0,1fr)]">
        <section className={`${panel} min-w-0 !p-0`}>
          <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <Users
                aria-hidden="true"
                className="size-4 text-[#B63B32] dark:text-[#FFB0AA]"
              />
              {copy.queue}
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {filtered.length}
              </span>
            </h3>
            <button
              type="button"
              aria-label={copy.queue}
              aria-expanded={queueOpen}
              aria-controls="whatsapping-contact-queue"
              onClick={() => setQueueOpen((v) => !v)}
              className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-[#FF6B5E] lg:hidden dark:border-slate-700 dark:bg-slate-900"
            >
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${queueOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <div
            id="whatsapping-contact-queue"
            className={`${queueOpen ? "block" : "hidden"} max-h-80 overflow-auto rounded-b-2xl lg:block lg:max-h-[65vh]`}
          >
            {filtered.map((r) => (
              <button
                key={r.contact.id}
                type="button"
                disabled={listDisabled}
                aria-pressed={selected === r.contact.id}
                onClick={() => choose(r.contact.id)}
                className={`block min-h-24 w-full border-b border-b-slate-100 border-l-4 p-3 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#FF6B5E] dark:border-b-slate-800 ${selected === r.contact.id ? "border-l-[#FF6B5E] bg-[#FF6B5E]/10" : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                <span className="block break-words font-medium">
                  {r.contact.name}
                </span>
                <span className="mb-2 mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {r.contact.companyName}
                </span>
                <Badge
                  state={r.eligibility === "READY" ? r.state : r.eligibility}
                >
                  {r.eligibility === "READY" ? recipientLabel(r) : label(r.eligibility)}
                </Badge>
                {contactOpportunities(detail, r.contact.id, createdOpportunities)?.length
                  ? <ContactOpportunitySummary compact opportunities={contactOpportunities(detail, r.contact.id, createdOpportunities)!} />
                  : <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">{opportunityLabel(contactOpportunities(detail, r.contact.id, createdOpportunities))}</span>}
                {r.nextActionAt && (
                  <span className="mt-2 block text-xs text-slate-500">
                    {dateText(r.nextActionAt)}
                  </span>
                )}
              </button>
            ))}
            {!filtered.length && (
              <p className="p-6 text-sm text-slate-500">{copy.noMatch}</p>
            )}
          </div>
        </section>
        {current ? (
          <section className={`${panel} min-w-0 space-y-5`}>
            <nav aria-label={copy.contacts} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">{copy.contacts} · {queueIndex >= 0 ? `${queueIndex + 1} / ${filtered.length}` : `${filtered.length}`}</span>
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                <Button variant="outline" className="min-h-12 gap-2 whitespace-normal" aria-label={copy.previousContact} disabled={busy || !previousRow} onClick={() => previousRow && choose(previousRow.contact.id)}><ArrowLeft className="size-4" />{copy.previousContact}</Button>
                <Button className={`${salesTitleBarPrimaryActionClassName} min-h-12 gap-2 whitespace-normal`} aria-label={copy.nextContact} disabled={busy || !nextRow} onClick={next}>{copy.nextContact}<ArrowRight className="size-4" /></Button>
              </div>
            </nav>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <div className="grid grid-cols-2 gap-2 [&>button]:h-auto [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:px-2 [&>button>svg]:hidden sm:[&>button>svg]:block">
                <Button
                  variant="outline"
                  className="border-[#FF6B5E]/30 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/5 dark:bg-slate-900 dark:text-[#FFB0AA]"
                  disabled={busy || !canWork || current.state !== "PREPARED" || messageDirty}
                  title={sentReason || undefined}
                  onClick={() => void act("SENT")}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {copy.marked}
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    busy ||
                    !canFollow ||
                    ["BLOCKED", "SKIPPED", "REPLIED"].includes(current.state)
                  }
                  title={replyReason || undefined}
                  onClick={() => void act("REPLY_POSITIVE")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {copy.positive}
                </Button>
                <Button variant="outline" disabled={!!replyReason} title={replyReason || undefined} onClick={() => void act("REPLY_NEGATIVE")}><MessageCircle className="mr-2 size-4" />{copy.negative}</Button>
                <ContactOpportunityAction opportunities={currentOpportunities} disabled={busy || !canFollow || ["BLOCKED", "SKIPPED"].includes(current.state)} onCreate={() => void beginOpportunity()} onOpen={() => opportunityReturn.markOpened(current.contact.id)} />

                <details className="relative"><summary className="flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-sm">{copy.actions}</summary><div className="absolute right-0 z-10 min-w-44 rounded-xl border bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">                <Button
                  variant="ghost"
                  disabled={busy || !canFollow || current.state === "BLOCKED"}
                  title={blockReason || undefined}
                  onClick={() => setConfirmation("BLOCK")}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {copy.block}
                </Button></div></details>
              </div>
              {(workReason || (messageDirty ? copy.reopenPersonalMessage : current.state !== "PREPARED" && !terminal(current.state) ? copy.prepareFirstAction : "")) && <p id={`${reasonId}-outcome`} className="text-xs text-slate-600 dark:text-slate-300">{workReason || (messageDirty ? copy.reopenPersonalMessage : copy.prepareFirstAction)}</p>}
            </section>

            {queueIndex < 0 && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{terminal(current.state) ? copy.finishedContactAction : copy.outsideQueue}</p>}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  ref={contactHeading}
                  tabIndex={-1}
                  className="break-words text-xl font-medium outline-none"
                >
                  {current.contact.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {current.contact.companyName} · {current.contact.phone || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge state={current.state}>{recipientLabel(current)}</Badge>
                <span className={`rounded-full px-2.5 py-1 text-xs ${currentOpportunities?.length ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{opportunityLabel(currentOpportunities)}</span>
              </div>
            </div>
            {!!currentOpportunities?.length && <ContactOpportunitySummary opportunities={currentOpportunities} />}
            {missingContactData.length > 0 && <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <ul className="space-y-1">{missingContactData.map(issue => <li key={issue}>{copy[issue]}</li>)}</ul>
              <a href={contactCorrectionUrl(current.contact)} onClick={() => markCorrection(current.contact.id)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#B63B32] dark:border-slate-700 dark:bg-slate-900 dark:text-[#FFB0AA]">{copy.correctInContacts}</a>
              <p className="text-xs">{copy.autoCorrectionReturnHint}</p>
            </div>}
            <IndiceWorkspaceNavigation<"message" | "followUp" | "history">
              ariaLabel={copy.contactSections}
              tone="coral"
              variant="sections"
              value={section}
              onValueChange={setSection}
              items={[
                { id: "message", label: copy.message },
                { id: "followUp", label: `${copy.followUp}${followDirty ? " •" : ""}` },
                { id: "history", label: `${copy.historyTab} (${detail.events.filter(e => e.contactId === selected).length})` },
              ]}
            />
            {followDirty && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <span>{copy.unsavedFollowUp}</span>
              {section !== "followUp" && <Button variant="outline" className="min-h-11" onClick={() => setSection("followUp")}>{copy.followUp}</Button>}
            </div>}
            <section hidden={section !== "message"} aria-label={copy.message} className="space-y-4">
            <div className="min-w-0 space-y-2">
              {c.steps.length > 1 && <p className="text-xs text-slate-500 dark:text-slate-400">{current.stepIndex + 1}/{c.steps.length} · {c.steps[current.stepIndex]?.name}</p>}
              <label className="block space-y-2">
                <span className="text-sm font-medium">{copy.personalMessage}</span>
                <Textarea rows={4} maxLength={4000} value={messageDraft}
                  disabled={busy || !canWork || terminal(current.state)}
                  onChange={event => { setMessageDraft(event.target.value); setNotice(""); setError(""); }} className="min-h-28 bg-white dark:bg-slate-900" />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{messageDraft.length} / 4000</span>
                <Button variant="ghost" className="h-auto min-h-11 max-w-full whitespace-normal break-words px-2 text-left" disabled={busy || !canWork || terminal(current.state) || messageDraft === (current.baseMessage ?? current.message)} onClick={() => { setMessageDraft(current.baseMessage ?? current.message); setNotice(""); }}>{copy.restoreCampaignMessage}</Button>
              </div>
              {messageInvalid && canWork && <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">{copy.invalidPersonalMessage}</p>}
            </div>

            {current.nextActionAt && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.nextDate}: {dateText(current.nextActionAt)}
              </p>
            )}
            {openReason && !workReason && !terminal(current.state) && <p id={`${reasonId}-open`} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{copy.open}: {openReason}</p>}
            <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
              <Button
                className={salesTitleBarPrimaryActionClassName}
                disabled={
                  busy ||
                  !canWork ||
                  !ready(current, clock) ||
                  messageInvalid ||
                  date !== localDate(current.nextActionAt)
                }
                aria-describedby={openReason ? `${reasonId}-${workReason ? "outcome" : "open"}` : undefined}
                onClick={() => void act("PREPARE")}
              >
                <ExternalLink className="h-4 w-4" />
                {copy.open}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !messageDraft}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(messageDraft)
                    .then(() => setNotice(copy.copied))
                    .catch(() => setError(copy.error));
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copy.copy}
              </Button>
              {c.resourceUrl && (
                <a
                  href={c.resourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.material}
                </a>
              )}
            </div>


            </section>
            <section hidden={section !== "followUp"} aria-label={copy.followUp}>
            {saveReason && <p id={`${reasonId}-save`} className="mb-3 text-sm text-slate-600 dark:text-slate-300">{saveReason}</p>}
            <fieldset
              disabled={busy || !canFollow}
              className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"
            >
              <legend className="flex items-center gap-2 text-sm font-medium">
                <CalendarClock
                  className="size-4 text-slate-500"
                  aria-hidden="true"
                />
                {copy.followUp}
              </legend>
              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Field label={copy.notes}>
                  <Textarea
                    className="min-h-24"
                    maxLength={2000}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Field>
                <Field label={copy.nextDate}>
                  <Input
                    type="datetime-local"
                    aria-describedby={terminal(current.state) ? `${reasonId}-date` : undefined}
                    disabled={terminal(current.state)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
              </div>
              {terminal(current.state) && <p id={`${reasonId}-date`} className="text-xs text-slate-500 dark:text-slate-400">{terminalReason}</p>}
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!followDirty}
                aria-describedby={saveReason ? `${reasonId}-save` : undefined}
                onClick={() => void act("NOTE")}
              >
                <Save className="mr-2 h-4 w-4" />
                {copy.saveNotes}
              </Button>
            </fieldset>
            </section>
            <section hidden={section !== "history"} aria-label={copy.historyTab}>
              <h3 className="text-sm font-medium">{copy.history}</h3>
              {!detail.events.some((e) => e.contactId === selected) && (
                <p className="py-3 text-sm text-slate-500 dark:text-slate-400">
                  {copy.emptyHistory}
                </p>
              )}
              <ul className="mt-2 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
                {detail.events
                  .filter((e) => e.contactId === selected)
                  .map((e) => (
                    <li key={e.id} className="text-sm">
                      <span>{label(e.action)}</span>
                      <span className="block text-xs text-slate-500">
                        {e.actorName} · {dateText(e.occurredAt)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>


          </section>
        ) : (
          <div className={`${panel} py-16 text-center text-slate-500`}>
            <p>{view === "OPPORTUNITY" && detail.resultContacts?.withOpportunity == null ? copy.noOpportunityAccess : copy.noMatch}</p>
            {view === "DUE" && <p className="mt-2 text-sm">{copy.due}: 0</p>}
          </div>
        )}
      </div>
      {opportunityOpen && current && <Suspense fallback={null}><CampaignOpportunity campaignName={c.name} contact={current.contact} notes={notes} onCancel={() => setOpportunityOpen(false)} onCreated={(opportunity) => { setCreatedOpportunities(previous => [...previous, opportunity]); setOpportunityOpen(false); void act(terminal(current.state) ? "NOTE" : "REPLY_POSITIVE", true, copy.opportunityCreated); }} /></Suspense>}
      {confirmation !== null && (
        <SalesModalFrame
          open
          modalType="confirmation"
          busy={busy}
          icon={<MessageCircle />}
          title={
            confirmation === "ACTIVE"
              ? copy.start
              : confirmation === "ARCHIVED"
                ? copy.archive
                : confirmation === "BLOCK"
                  ? copy.block
                  : copy.discardTitle
          }
          description={
            confirmation === "ACTIVE"
              ? copy.activateHint
              : confirmation === "BLOCK"
                ? copy.blockHint
                : copy.emptyHint
          }
          closeLabel={copy.close}
          onOpenChange={() => setConfirmation(null)}
          footerLeading={
            <Button variant="outline" onClick={() => setConfirmation(null)}>
              {copy.cancel}
            </Button>
          }
          footer={
            <>
              <Button
                onClick={() => {
                  if (confirmation === "ACTIVE" || confirmation === "ARCHIVED")
                    void state(confirmation);
                  else if (confirmation === "BLOCK") void act("BLOCK");
                  else {
                    if (current) messageDrafts.current.delete(`${current.contact.id}:${current.stepIndex}`);
                    if (confirmation === "BACK") { messageDrafts.current.clear(); onBack(); }
                    else if (confirmation === "REFRESH") void refresh();
                    else {
                      setSelected(confirmation);
                      setQueueOpen(false);
                      requestAnimationFrame(() =>
                        contactHeading.current?.focus({ preventScroll: true }),
                      );
                    }
                    setConfirmation(null);
                  }
                }}
              >
                {copy.confirm}
              </Button>
            </>
          }
        >
          <p className="text-sm">
            {confirmation === "ACTIVE" ? copy.manualHint : c.name}
          </p>
        </SalesModalFrame>
      )}
    </div>
  );
}
