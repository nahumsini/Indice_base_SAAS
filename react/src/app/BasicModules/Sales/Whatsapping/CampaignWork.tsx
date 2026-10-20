import { useEffect, useRef, useState } from "react";
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
import { IndiceTitleBarOverflow } from "../../../components/frontend-os";
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
} from "./whatsappingApi";
import { useWhatsappingCopy } from "./whatsappingCopy";
import {
  Badge,
  ErrorNotice,
  Field,
  panel,
  CampaignProgress,
  MessagePreview,
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
export function CampaignWork({
  detail,
  onChange,
  onBack,
  onEdit,
}: {
  detail: Detail;
  onChange: (d: Detail) => void;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { copy, label, locale } = useWhatsappingCopy();
  const c = detail.campaign;
  const [selected, setSelected] = useState<number | null>(
    () =>
      detail.recipients.find((r) => ready(r))?.contact.id ??
      detail.recipients[0]?.contact.id ??
      null,
  );
  const [search, setSearch] = useState(""),
    [view, setView] = useState("PENDING"),
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
  const contactHeading = useRef<HTMLHeadingElement>(null);
  const latch = useRef(false),
    mounted = useRef(true);
  const current = detail.recipients.find((r) => r.contact.id === selected);
  const dirty =
    !!current &&
    (notes !== current.notes || date !== localDate(current.nextActionAt));
  useDirtyExit(dirty);
  useEffect(() => {
    if (current) {
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
  const canWork = c.canEdit && c.status === "ACTIVE",
    canFollow = c.canEdit && ["ACTIVE", "COMPLETED"].includes(c.status);
  const counts = {
    PENDING: detail.recipients.filter((r) => !terminal(r.state)).length,
    DUE: detail.recipients.filter((r) => r.state === "WAITING" && due(r, clock))
      .length,
    FINISHED: detail.recipients.filter((r) => terminal(r.state)).length,
  };
  const filtered = detail.recipients.filter(
    (r) =>
      `${r.contact.name} ${r.contact.companyName} ${r.contact.phone}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (view === "ALL" ||
        (view === "PENDING" && !terminal(r.state)) ||
        (view === "DUE" && r.state === "WAITING" && due(r, clock)) ||
        (view === "FINISHED" && terminal(r.state))),
  );
  function choose(id: number | "BACK") {
    if (latch.current) return;
    if (dirty) {
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
  async function act(action: Action) {
    if (latch.current || !current) return;
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
      const result = await whatsappingApi.action(
        c.id,
        current.contact.id,
        current.version,
        action,
        notes,
        isoDate(date),
      );
      if (!mounted.current) {
        popup?.close();
        return;
      }
      onChange(result.detail);
      if (action === "PREPARE" && popup) {
        if (result.whatsappUrl?.startsWith("https://wa.me/"))
          popup.location.href = result.whatsappUrl;
        else popup.close();
      }
      setNotice(label(action));
    } catch (e) {
      popup?.close();
      if (mounted.current) setError(failure(e, copy));
    } finally {
      latch.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function next() {
    const nextRow =
      detail.recipients.find(
        (r) => r.contact.id !== selected && ready(r, clock),
      ) ??
      detail.recipients.find(
        (r) => r.contact.id !== selected && !terminal(r.state),
      );
    if (nextRow) choose(nextRow.contact.id);
  }
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
            <Button
              variant="outline"
              className={salesTitleBarSecondaryActionClassName}
              disabled={busy}
              onClick={() =>
                dirty ? setConfirmation("REFRESH") : void refresh()
              }
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {copy.refresh}
            </Button>
            {c.canEdit && c.status === "DRAFT" ? (
              <Button
                className={salesTitleBarPrimaryActionClassName}
                disabled={
                  busy ||
                  !detail.recipients.some((r) => r.eligibility === "READY")
                }
                onClick={() => setConfirmation("ACTIVE")}
              >
                <Play className="h-4 w-4" />
                {copy.start}
              </Button>
            ) : c.canEdit && ["ACTIVE", "PAUSED"].includes(c.status) ? (
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
            {c.canEdit && ["DRAFT", "ACTIVE", "PAUSED"].includes(c.status) && (
              <IndiceTitleBarOverflow
                label={copy.actions}
                items={[
                  ...(c.status === "DRAFT"
                    ? [
                        {
                          id: "edit",
                          label: copy.edit,
                          icon: <Pencil className="size-4" />,
                          disabled: busy,
                          onSelect: onEdit,
                        },
                      ]
                    : []),
                  {
                    id: "archive",
                    label: copy.archive,
                    icon: <Archive className="size-4" />,
                    disabled: busy || dirty,
                    onSelect: () => setConfirmation("ARCHIVED"),
                  },
                ]}
              />
            )}
          </div>
        }
      />
      <ErrorNotice text={error} />
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
        className={`${panel} grid items-center gap-4 sm:grid-cols-[1fr_1fr_minmax(180px,1fr)]`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge state={c.status}>{label(c.status)}</Badge>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {label(c.objective)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {c.ownerName.slice(0, 1)}
          </span>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.owner}
            </p>
            <p className="mt-1 font-medium">{c.ownerName}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {copy.campaignContext}
          </p>
          <CampaignProgress
            done={c.done}
            total={c.total}
            label={copy.progress}
          />
        </div>
      </section>
      {!c.canEdit && <p className="text-sm text-slate-500">{copy.readOnly}</p>}
      {c.status === "DRAFT" &&
        !detail.recipients.some((r) => r.eligibility === "READY") && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {copy.noReady}
          </p>
        )}
      <SalesFilterBar
        title={copy.filters}
        gridClassName="md:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)]"
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
          label={copy.status}
          value={view}
          onValueChange={setView}
          options={[
            { value: "PENDING", label: `${copy.pending} (${counts.PENDING})` },
            { value: "DUE", label: `${copy.due} (${counts.DUE})` },
            {
              value: "FINISHED",
              label: `${copy.finished} (${counts.FINISHED})`,
            },
            { value: "ALL", label: copy.all },
          ]}
        />
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
                className={`block min-h-24 w-full border-b border-b-slate-100 border-l-4 p-4 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#FF6B5E] dark:border-b-slate-800 ${selected === r.contact.id ? "border-l-[#FF6B5E] bg-[#FF6B5E]/10" : "border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800"}`}
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
                  {label(r.eligibility === "READY" ? r.state : r.eligibility)}
                </Badge>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                  {copy.contacts}
                </p>
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
              <Badge state={current.state}>{label(current.state)}</Badge>
            </div>
            <MessagePreview
              title={`${current.stepIndex + 1}/${c.steps.length} · ${c.steps[current.stepIndex]?.name ?? copy.message}`}
            >
              {current.message || copy.missing}
            </MessagePreview>
            {current.eligibility !== "READY" && (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {label(current.eligibility)} · {copy.noReady}
              </p>
            )}
            {current.nextActionAt && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {copy.nextDate}: {dateText(current.nextActionAt)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                className={salesTitleBarPrimaryActionClassName}
                disabled={
                  busy ||
                  !canWork ||
                  !ready(current, clock) ||
                  date !== localDate(current.nextActionAt)
                }
                onClick={() => void act("PREPARE")}
              >
                <ExternalLink className="h-4 w-4" />
                {copy.open}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !current.message}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(current.message)
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
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.manualStatus}
            </p>
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2
                  className="size-4 text-slate-500"
                  aria-hidden="true"
                />
                {copy.outcome}
              </h3>
              <div className="flex flex-wrap gap-2 [&>button]:min-h-11">
                <Button
                  variant="outline"
                  className="border-[#FF6B5E]/30 bg-white text-[#B63B32] hover:bg-[#FF6B5E]/5 dark:bg-slate-900 dark:text-[#FFB0AA]"
                  disabled={busy || !canWork || current.state !== "PREPARED"}
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
                  onClick={() => void act("REPLIED")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {copy.replied}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !canWork || terminal(current.state)}
                  onClick={() => void act("SKIP")}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  {copy.skip}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !canFollow || current.state === "BLOCKED"}
                  onClick={() => setConfirmation("BLOCK")}
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  {copy.block}
                </Button>
              </div>
            </section>
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
                    disabled={terminal(current.state)}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
              </div>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!dirty}
                onClick={() => void act("NOTE")}
              >
                <Save className="mr-2 h-4 w-4" />
                {copy.saveNotes}
              </Button>
            </fieldset>
            <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button
                variant="outline"
                className={salesTitleBarSecondaryActionClassName}
                disabled={busy}
                onClick={next}
              >
                {copy.nextContact}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <details className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <summary className="cursor-pointer py-2 text-sm font-medium">
                {copy.history}
              </summary>
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
            </details>
          </section>
        ) : (
          <div className={`${panel} py-16 text-center text-slate-500`}>
            {copy.noMatch}
          </div>
        )}
      </div>
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
                    if (confirmation === "BACK") onBack();
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
