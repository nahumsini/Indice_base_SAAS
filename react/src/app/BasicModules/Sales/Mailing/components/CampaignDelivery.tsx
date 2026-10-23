import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { SalesModalFrame } from "../../components/SalesModalFrame";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Checkbox } from "../../../../components/ui/checkbox";
import { IndiceViewState } from "../../../../components/frontend-os";
import {
  deliveryApi,
  type CampaignReview,
  type CampaignResults,
} from "../deliveryApi";
import { useDeliveryCopy } from "../deliveryCopy";
import { MailingFiles } from "./MailingFiles";
import { CampaignDeliveryTable } from "./CampaignDeliveryTable";
export function CampaignDelivery({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const copy = useDeliveryCopy();
  const [review, setReview] = useState<CampaignReview | null>(null);
  const [results, setResults] = useState<CampaignResults | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<
    "review" | "confirm" | "test" | "testConfirm" | "cancel" | "discard"
  >("review");
  const [selected, setSelected] = useState<number[] | null>(null);
  const [footer, setFooter] = useState("");
  const [schedule, setSchedule] = useState("");
  const [to, setTo] = useState("");
  const [testState, setTestState] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const alive = useRef(true);
  const pending = useRef(false);
  const hasChanges = !!(footer || schedule || to || selected !== null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    Promise.all([
      deliveryApi.review(id, abort.signal),
      deliveryApi.results(id, abort.signal),
    ])
      .then(([a, b]) => {
        if (!abort.signal.aborted) {
          setReview(a);
          setResults(b);
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(copy.error);
      });
    return () => abort.abort();
  }, [id, refresh]);
  useEffect(() => {
    if (
      !results ||
      !["RUNNING", "SCHEDULED"].includes(results.status) ||
      busy ||
      view !== "review"
    )
      return;
    const timer = window.setInterval(() => setRefresh((v) => v + 1), 15000);
    return () => window.clearInterval(timer);
  }, [results?.status, busy, view]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (hasChanges || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges, busy]);
  const close = () => {
    if (!busy && !pending.current)
      hasChanges && results?.status === "DRAFT"
        ? setView("discard")
        : onClose();
  };
  async function run(action: () => Promise<unknown>, after?: () => void) {
    if (busy || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      if (alive.current) after?.();
    } catch {
      if (alive.current) setError(copy.error);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const eligibleIds =
    review?.audience
      .filter((p) => p.eligibility === "READY")
      .map((p) => p.contactId) ?? [];
  const selectedIds =
    selected === null
      ? eligibleIds
      : selected.filter((id) => eligibleIds.includes(id));
  const eligible = eligibleIds.length;
  const canLaunch =
    review?.canSend &&
    review.sender?.verified &&
    review.publicLinkReady &&
    selectedIds.length > 0 &&
    footer.trim().length > 0;
  const control = (action: string) =>
    void run(async () => {
      if (results) {
        const value = await deliveryApi.control(id, results.version, action);
        if (alive.current) {
          setResults(value);
          setRefresh((v) => v + 1);
          setView("review");
        }
      }
    });
  async function sendTest() {
    if (!review) return;
    await run(async () => {
      const value = await deliveryApi.test(
        id,
        review.version,
        to.trim(),
        requestId.current,
      );
      if (alive.current) {
        setTestState(value.state);
        setView("test");
      }
    });
  }
  const back = (
    <Button
      variant="outline"
      disabled={busy}
      className="h-11 !border-white !bg-white !text-slate-600"
      onClick={() => (view === "review" ? close() : setView("review"))}
    >
      {view === "review" ? copy.close : copy.back}
    </Button>
  );
  return (
    <SalesModalFrame
      open
      busy={busy}
      modalType={
        ["confirm", "testConfirm", "cancel", "discard"].includes(view)
          ? "confirmation"
          : view === "review"
            ? "operational-workspace"
            : "standard-form"
      }
      title={
        view === "confirm"
          ? copy.confirm
          : view === "testConfirm"
            ? copy.confirmTest
            : view === "cancel"
              ? copy.cancel
              : view === "discard"
                ? copy.unsaved
                : copy.title
      }
      description={name}
      icon={<Send className="h-5 w-5" />}
      closeLabel={copy.close}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      footerLeading={back}
      footer={
        view === "discard" ? (
          <Button data-modal-destructive onClick={onClose}>
            {copy.leave}
          </Button>
        ) : view === "cancel" ? (
          <Button
            data-modal-destructive
            disabled={busy}
            onClick={() => control("CANCEL")}
          >
            {copy.cancel}
          </Button>
        ) : view === "testConfirm" ? (
          <Button disabled={busy} onClick={() => void sendTest()}>
            {copy.test}
          </Button>
        ) : view === "confirm" ? (
          <Button
            disabled={busy || !canLaunch}
            onClick={() =>
              void run(async () => {
                if (!review?.sender) return;
                const value = await deliveryApi.launch(id, {
                  version: review.version,
                  accountVersion: review.sender.version,
                  digest: review.digest,
                  scheduledAt: schedule
                    ? new Date(schedule).toISOString()
                    : null,
                  footer,
                  contactIds: selectedIds,
                });
                if (alive.current) {
                  setResults(value);
                  setFooter("");
                  setSchedule("");
                  setSelected(null);
                  setTo("");
                  setView("review");
                  setRefresh((v) => v + 1);
                }
              })
            }
          >
            {schedule ? copy.schedule : copy.launch}
          </Button>
        ) : view === "test" ? (
          <Button
            disabled={
              busy || !to.trim() || !review?.canSend || !review.sender?.verified
            }
            onClick={() => setView("testConfirm")}
          >
            {copy.review}
          </Button>
        ) : results?.status === "DRAFT" ? (
          <>
            <Button
              variant="outline"
              disabled={busy || !review?.canSend || !review.sender?.verified}
              onClick={() => setView("test")}
            >
              {copy.test}
            </Button>
            <Button
              disabled={busy || !canLaunch}
              onClick={() => setView("confirm")}
            >
              {copy.review}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRefresh((v) => v + 1)}
          >
            {copy.refresh}
          </Button>
        )
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {!review || !results ? (
        <IndiceViewState
          variant={error ? "error" : "loading"}
          title={error || copy.title}
          tone="coral"
        />
      ) : view === "discard" ? (
        <p>{copy.unsaved}</p>
      ) : view === "cancel" ? (
        <p>{copy.cancelHint}</p>
      ) : view === "test" || view === "testConfirm" ? (
        <div className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span>{copy.testTo}</span>
            <Input
              type="email"
              disabled={busy || view === "testConfirm"}
              maxLength={240}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setTestState("");
              }}
            />
          </label>
          <p className="font-medium">[TEST] {review.subject}</p>
          <p className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm">
            {review.bodyText}
          </p>
          <MailingFiles files={review.attachments??[]}/>
          {testState && (
            <p role="status">
              {copy.testResult}:{" "}
              {copy.states[testState as keyof typeof copy.states] ?? testState}
            </p>
          )}
        </div>
      ) : view === "confirm" ? (
        <div className="space-y-4 text-sm">
          <p>{copy.confirmHint}</p>
          <p>
            {review.sender?.name} &lt;{review.sender?.email}&gt;
          </p>
          <p>
            {copy.selected}: <strong>{selectedIds.length}</strong> ·{" "}
            {copy.notSelected}: {eligible - selectedIds.length} ·{" "}
            {copy.excluded}: {review.audience.length - eligible}
          </p>
          <p>
            {schedule
              ? `${new Date(schedule).toLocaleString()} · ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
              : copy.now}
          </p>
          <h3 className="font-medium">{review.subject}</h3>
          <p className="max-h-72 overflow-auto whitespace-pre-wrap break-words">
            {review.bodyText}
          </p>
          <MailingFiles files={review.attachments??[]}/>
          <p className="whitespace-pre-wrap border-t pt-3">{footer}</p>
          <p>{copy.footerHint}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {copy.states[results.status as keyof typeof copy.states]}
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRefresh((v) => v + 1)}
            >
              {copy.refresh}
            </Button>
          </div>
          {results.status === "DRAFT" ? (
            <>
              <p className="text-sm">
                {review.sender
                  ? `${review.sender.name} <${review.sender.email}>`
                  : copy.senderMissing}
              </p>
              {!review.sender?.verified && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {copy.senderMissing}
                </p>
              )}
              {!review.publicLinkReady && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  {copy.publicMissing}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  {copy.selected}: {selectedIds.length} / {eligible} ·{" "}
                  {copy.excluded}: {review.audience.length - eligible}
                </p>
                {review.canSend && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900">
                    <Checkbox
                      aria-label={copy.selectAll}
                      disabled={busy || !eligible}
                      checked={
                        selectedIds.length === eligible && eligible > 0
                          ? true
                          : selectedIds.length
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        setSelected(checked === true ? eligibleIds : [])
                      }
                    />
                    {copy.selectAll}
                  </label>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {copy.selectionHint}
              </p>
              <CampaignDeliveryTable
                copy={copy}
                rows={review.audience.map((p) => ({
                  ...p,
                  id: String(p.contactId),
                  state: p.eligibility,
                }))}
                selected={selectedIds}
                disabled={busy}
                onSelect={
                  review.canSend
                    ? (id, checked) =>
                        setSelected(
                          checked
                            ? [...new Set([...selectedIds, id])]
                            : selectedIds.filter((x) => x !== id),
                        )
                    : undefined
                }
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 text-sm">
                  <span>{copy.footer}</span>
                  <Textarea
                    disabled={busy || !review.canSend}
                    maxLength={1000}
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {copy.footerHint}
                  </span>
                </label>
                <label className="block space-y-2 text-sm">
                  <span>
                    {copy.when} ·{" "}
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                  <Input
                    type="datetime-local"
                    disabled={busy || !review.canSend}
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {copy.now}
                  </span>
                </label>
              </div>
            </>
          ) : (
            <>
              {results.scheduledAt && (
                <p className="text-sm">
                  {copy.when}: {new Date(results.scheduledAt).toLocaleString()}
                </p>
              )}
              {results.lastError && (
                <p
                  role="status"
                  className="text-sm text-amber-700 dark:text-amber-300"
                >
                  {copy.error}
                </p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {copy.acceptedHint}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  results.items.reduce<Record<string, number>>(
                    (counts, item) => ({
                      ...counts,
                      [item.state]: (counts[item.state] ?? 0) + 1,
                    }),
                    {},
                  ),
                ).map(([state, count]) => (
                  <span
                    key={state}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800"
                  >
                    {copy.states[state as keyof typeof copy.states]}: {count}
                  </span>
                ))}
              </div>
              <CampaignDeliveryTable rows={results.items} copy={copy} />
              {results.canSend && (
                <div className="flex flex-wrap gap-3">
                  {["RUNNING", "SCHEDULED"].includes(results.status) && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => control("PAUSE")}
                    >
                      {copy.pause}
                    </Button>
                  )}
                  {results.status === "PAUSED" && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => control("RESUME")}
                    >
                      {copy.resume}
                    </Button>
                  )}
                  {["RUNNING", "SCHEDULED", "PAUSED"].includes(
                    results.status,
                  ) && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setView("cancel")}
                    >
                      {copy.cancel}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </SalesModalFrame>
  );
}
