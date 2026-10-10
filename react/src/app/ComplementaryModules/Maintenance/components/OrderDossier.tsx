import { useCallback, useState } from "react";
import { Wrench } from "lucide-react";
import { IndiceModalFrame } from "../../../components/indice-modal/IndiceModalFrame";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import { printStandardDocumentHtml } from "../../../BasicModules/shared/print/standardDocumentHtml";
import { downloadCalendarExport } from "../../../shared/utils/calendarDownload";
import {
  maintenanceApi,
  type OrderDetail,
  type Context,
  type Order,
  type Costs,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Editor,
  Field,
  Feedback,
  ReasonEditor,
  Status,
  control,
  label,
  formatDate,
  useMaintenanceQuery,
} from "./MaintenancePrimitives";
import { OrderEditor } from "./MaintenanceEditors";
import { Evidence, History } from "./MaintenanceEvidence";
import {
  LaborEditor,
  PartEditor,
  ExpenseEditor,
  CostSummary,
} from "./MaintenanceCostEditors";

type Operation =
  | {
      kind:
        "edit" | "progress" | "labor" | "part" | "expense" | "task" | "reverse";
      entry?: number;
      source?: "parts" | "labor";
    }
  | { kind: "status"; status: string; title: string };
function ProgressEditor({
  order,
  c,
  onClose,
  onSaved,
}: {
  order: Order;
  c: MaintenanceCopy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({
    diagnosis: order.diagnosis,
    resolution: order.resolution,
    completed: order.checklist.map((s) => s.done),
  });
  return (
    <Editor
      title={c.progress}
      c={c}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          `/orders/${order.id}/progress`,
          { ...draft, expectedVersion: order.version },
          "PUT",
        )
      }
    >
      <Field label={c.diagnosis}>
        <textarea
          maxLength={6000}
          rows={4}
          className={control}
          value={draft.diagnosis}
          onChange={(e) => setDraft({ ...draft, diagnosis: e.target.value })}
        />
      </Field>
      <Field label={c.resolution}>
        <textarea
          maxLength={6000}
          rows={4}
          className={control}
          value={draft.resolution}
          onChange={(e) => setDraft({ ...draft, resolution: e.target.value })}
        />
      </Field>
      <div className="space-y-3">
        {order.checklist.map((step, i) => (
          <label
            key={i}
            className="flex min-h-11 items-start gap-3 rounded-xl border p-3"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.completed[i]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  completed: draft.completed.map((v, index) =>
                    index === i ? e.target.checked : v,
                  ),
                })
              }
            />
            <span>
              {step.label}
              {step.required ? ` · ${c.required}` : ""}
            </span>
          </label>
        ))}
      </div>
    </Editor>
  );
}
function CostSection({
  id,
  c,
  locale,
  onReverse,
}: {
  id: number;
  c: MaintenanceCopy;
  locale: string;
  onReverse?: (type: "parts" | "labor", entry: number) => void;
}) {
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => maintenanceApi.get<Costs>(`/orders/${id}/costs`, signal),
      [id],
    ),
  );
  return result.loading ? (
    <Feedback>{c.loading}</Feedback>
  ) : result.error ? (
    <Feedback error>{c.error}</Feedback>
  ) : result.data ? (
    <CostSummary
      value={result.data}
      c={c}
      locale={locale}
      onReverse={onReverse}
    />
  ) : null;
}
export function OrderDossier({
  id,
  c,
  context,
  locale,
  onClose,
  onChanged,
}: {
  id: number;
  c: MaintenanceCopy;
  context: Context;
  locale: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => maintenanceApi.get<OrderDetail>(`/orders/${id}`, signal),
      [id],
    ),
  );
  const [section, setSection] = useState("details"),
    [operation, setOperation] = useState<Operation>();
  const detail = result.data,
    order = detail?.order;
  const saved = () => {
    setOperation(undefined);
    result.reload();
    onChanged();
  };
  const back = () => setOperation(undefined);
  if (order && operation) {
    const common = { order, c, context, onClose: back, onSaved: saved };
    if (operation.kind === "edit") return <OrderEditor {...common} />;
    if (operation.kind === "progress") return <ProgressEditor {...common} />;
    if (operation.kind === "labor") return <LaborEditor {...common} />;
    if (operation.kind === "part") return <PartEditor {...common} />;
    if (operation.kind === "expense") return <ExpenseEditor {...common} />;
    if (operation.kind === "status")
      return (
        <ReasonEditor
          c={c}
          title={operation.title}
          onClose={back}
          onSaved={saved}
          onSave={(reason) =>
            maintenanceApi.save(`/orders/${id}/status`, {
              expectedVersion: order.version,
              status: operation.status,
              reason,
            })
          }
        />
      );
    if (operation.kind === "task")
      return (
        <ReasonEditor
          c={c}
          title={c.task}
          onClose={back}
          onSaved={saved}
          onSave={(reason) =>
            maintenanceApi.save(`/orders/${id}/task`, {
              expectedVersion: order.version,
              reason,
            })
          }
        />
      );
    if (operation.kind === "reverse")
      return (
        <ReasonEditor
          c={c}
          title={c.reverse}
          onClose={back}
          onSaved={saved}
          onSave={(reason) =>
            maintenanceApi.save(
              `/orders/${id}/${operation.source}/${operation.entry}/reverse`,
              { expectedVersion: order.version, reason },
            )
          }
        />
      );
  }
  const active = Boolean(
    order && !["CLOSED", "CANCELLED"].includes(order.status),
  );
  const executing = Boolean(
    order &&
    ["IN_PROGRESS", "WAITING_PARTS", "WAITING_VENDOR"].includes(order.status),
  );
  const transition = (status: string, title: string) => (
    <Action onClick={() => setOperation({ kind: "status", status, title })}>
      {title}
    </Action>
  );
  const print = () => {
    if (!order) return;
    printStandardDocumentHtml({
      title: order.title,
      folio: String(order.id),
      status: label(c, order.status),
      locale,
      contract: {
        category: "operational-report",
        modifiers: ["internal", "confidential"],
        orientation: "portrait",
        pageSize: "a4",
        version: String(order.version),
      },
      fileName: { documentType: c.orders, identifier: String(order.id) },
      metadata: [
        { label: c.asset, value: order.assetName ?? c.noAsset },
        { label: c.responsible, value: order.assigneeName ?? c.unassigned },
        {
          label: c.due,
          value: formatDate(order.dueAt, locale, order.timezone),
        },
        {
          label: c.originalDue,
          value: formatDate(order.originalDueAt, locale, order.timezone),
        },
      ],
      sections: [
        { title: c.description, paragraphs: [order.description] },
        { title: c.diagnosis, paragraphs: [order.diagnosis] },
        { title: c.resolution, paragraphs: [order.resolution] },
        {
          title: c.checklist,
          paragraphs: order.checklist.map(
            (s) => `${s.done ? "✓" : "○"} ${s.label}`,
          ),
        },
      ],
    });
  };
  return (
    <IndiceModalFrame
      open
      tone="gray"
      modalType="operational-workspace"
      icon={<Wrench />}
      title={order ? `#${order.id} · ${order.title}` : c.orders}
      description={c.ordersHint}
      closeLabel={c.close}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      footer={
        <>
          <Action onClick={onClose}>{c.close}</Action>
          {order && <Action onClick={print}>{c.print}</Action>}
          {order?.scheduledStart && order.scheduledEnd && (
            <Action
              onClick={() =>
                downloadCalendarExport({
                  uid: `maintenance-${id}@indice`,
                  title: order.title,
                  startAt: order.scheduledStart!,
                  endAt: order.scheduledEnd!,
                  version: order.version,
                  status:
                    order.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
                  location: order.assetName ?? "",
                })
              }
            >
              {c.exportCalendar}
            </Action>
          )}
        </>
      }
    >
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : result.error ? (
        <Feedback error>
          {c.error}
          <Action onClick={result.reload}>{c.retry}</Action>
        </Feedback>
      ) : (
        order &&
        detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Status value={order.status} c={c} />
              <Status value={order.priority} c={c} />
              <span className="text-sm">{label(c, order.orderType)}</span>
              {order.blocking && (
                <span className="text-sm text-red-700 dark:text-red-300">
                  {c.blocking}
                </span>
              )}
            </div>
            <IndiceWorkspaceNavigation
              ariaLabel={c.details}
              tone="gray"
              value={section}
              onValueChange={setSection}
              items={[
                "details",
                "evidence",
                "history",
                ...(context.manager ? ["costs"] : []),
              ].map((id) => ({ id, label: label(c, id) }))}
            />
            {section === "details" && (
              <>
                <div className="grid gap-4 rounded-2xl border p-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [c.asset, order.assetName ?? c.noAsset],
                    [c.responsible, order.assigneeName ?? c.unassigned],
                    [c.due, formatDate(order.dueAt, locale, order.timezone)],
                    [
                      c.originalDue,
                      formatDate(order.originalDueAt, locale, order.timezone),
                    ],
                  ].map(([title, value]) => (
                    <div key={title}>
                      <p className="text-sm text-slate-500">{title}</p>
                      <p className="mt-1 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {order.description}
                </p>
                {order.scheduledStart && (
                  <p className="text-sm">
                    {c.scheduledStart}:{" "}
                    {formatDate(order.scheduledStart, locale, order.timezone)} →{" "}
                    {formatDate(order.scheduledEnd, locale, order.timezone)}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {context.manager && active && (
                    <Action onClick={() => setOperation({ kind: "edit" })}>
                      {c.edit}
                    </Action>
                  )}
                  {order.status === "ASSIGNED" &&
                    transition("IN_PROGRESS", c.start)}
                  {executing && (
                    <Action
                      primary
                      onClick={() => setOperation({ kind: "progress" })}
                    >
                      {c.progress}
                    </Action>
                  )}
                  {order.status === "IN_PROGRESS" && (
                    <>
                      {transition("WAITING_PARTS", c.waitParts)}
                      {transition("WAITING_VENDOR", c.waitVendor)}
                      {transition("PENDING_VALIDATION", c.submitValidation)}
                    </>
                  )}
                  {["WAITING_PARTS", "WAITING_VENDOR"].includes(order.status) &&
                    transition("IN_PROGRESS", c.resume)}
                  {context.manager && order.status === "PENDING_VALIDATION" && (
                    <>
                      {transition("CLOSED", c.validate)}
                      {transition("IN_PROGRESS", c.returnWork)}
                    </>
                  )}
                  {context.manager &&
                    active &&
                    transition("CANCELLED", c.cancelOrder)}
                  {context.manager && !active && transition("OPEN", c.reopen)}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">{c.diagnosis}</h3>
                    <p className="mt-2 whitespace-pre-wrap">
                      {order.diagnosis || "—"}
                    </p>
                  </section>
                  <section className="rounded-xl border p-4">
                    <h3 className="font-semibold">{c.resolution}</h3>
                    <p className="mt-2 whitespace-pre-wrap">
                      {order.resolution || "—"}
                    </p>
                  </section>
                </div>
                <ul className="space-y-2">
                  {order.checklist.map((step, index) => (
                    <li key={index} className="rounded-xl border p-3">
                      {step.done ? "✓" : "○"} {step.label}{" "}
                      {step.required ? `· ${c.required}` : ""}
                    </li>
                  ))}
                </ul>
                <Feedback>
                  {order.evidenceRequired ? `${c.evidenceRequired}. ` : ""}
                  {c.closedHint}
                </Feedback>
                {executing && (
                  <Action onClick={() => setOperation({ kind: "labor" })}>
                    {c.labor}
                  </Action>
                )}
                {context.manager &&
                  context.tasks &&
                  active &&
                  !detail.taskId &&
                  order.assigneeId && (
                    <Action onClick={() => setOperation({ kind: "task" })}>
                      {c.task}
                    </Action>
                  )}
                {detail.taskId && (
                  <p>
                    {c.taskLinked} #{detail.taskId} · {c.noSync}
                  </p>
                )}
              </>
            )}
            {section === "evidence" && (
              <Evidence
                type="ORDER"
                id={id}
                items={detail.attachments}
                canUpload={active}
                c={c}
                onChanged={result.reload}
              />
            )}
            {section === "history" && (
              <History items={detail.history} c={c} locale={locale} />
            )}
            {section === "costs" && context.manager && (
              <>
                <div className="flex flex-wrap gap-3">
                  {executing && (
                    <Action onClick={() => setOperation({ kind: "labor" })}>
                      {c.labor}
                    </Action>
                  )}
                  {active && context.inventory && (
                    <Action onClick={() => setOperation({ kind: "part" })}>
                      {c.parts}
                    </Action>
                  )}
                  {active && context.expenses && (
                    <Action onClick={() => setOperation({ kind: "expense" })}>
                      {c.expenses}
                    </Action>
                  )}
                </div>
                <CostSection
                  id={id}
                  c={c}
                  locale={locale}
                  onReverse={
                    active
                      ? (source, entry) =>
                          setOperation({ kind: "reverse", source, entry })
                      : undefined
                  }
                />
              </>
            )}
          </div>
        )
      )}
    </IndiceModalFrame>
  );
}
