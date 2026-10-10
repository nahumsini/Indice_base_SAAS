import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Wrench,
  Plus,
  RotateCw,
  ClipboardList,
  PackageCheck,
  Repeat,
} from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import { IndiceCalendarSurface } from "../../../components/frontend-os/IndiceCalendarSurface";
import { TableCell } from "../../../components/ui/table";
import {
  type Context,
  type Order,
  type RequestItem,
  type Asset,
  type Plan,
  orderStatuses,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Status,
  label,
  formatDate,
  dateInput,
  Feedback,
} from "../components/MaintenancePrimitives";
import {
  Filters,
  ListTable,
  Pagination,
  QueryFeedback,
  useMaintenanceList,
} from "../components/MaintenanceLists";
import {
  RequestEditor,
  OrderEditor,
  AssetEditor,
  PlanEditor,
} from "../components/MaintenanceEditors";
import { OrderDossier } from "../components/OrderDossier";
import {
  RequestDossier,
  AssetDossier,
  PlanDossier,
} from "../components/MaintenanceDossiers";

export type TabProps = {
  c: MaintenanceCopy;
  context: Context;
  locale: string;
  allowed: string[];
};
export function OrdersTab({ c, context, locale }: TabProps) {
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState<number | "new" | null>(null),
    [selectedDate, setSelectedDate] = useState(dateInput());
  const [params, setParams] = useSearchParams(),
    opened = useRef("");
  const { scope, setScope, result } = useMaintenanceList<Order>(
    "orders",
    "/orders",
    orderStatuses,
    revision,
  );
  useEffect(() => {
    const id = params.get("order");
    if (
      id &&
      /^\d+$/.test(id) &&
      Number.isSafeInteger(Number(id)) &&
      Number(id) > 0 &&
      opened.current !== id
    ) {
      opened.current = id;
      setDialog(Number(id));
    }
  }, [params]);
  const close = () => {
    setDialog(null);
    if (params.has("order")) {
      const next = new URLSearchParams(params);
      next.delete("order");
      setParams(next, { replace: true });
      opened.current = "";
    }
  };
  const changed = () => setRevision((v) => v + 1),
    saved = () => {
      changed();
      close();
    };
  const dates = (() => {
    const [year, month] = scope.month.split("-").map(Number);
    return Array.from(
      { length: new Date(year, month, 0).getDate() },
      (_, i) => new Date(year, month - 1, i + 1),
    );
  })();
  const card = (order: Order) => (
    <button
      key={order.id}
      type="button"
      onClick={() => setDialog(order.id)}
      className="block w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
    >
      <span className="block truncate text-sm font-semibold">
        #{order.id} · {order.title}
      </span>
      <span className="mt-2 block text-xs text-slate-500">
        {order.assigneeName ?? c.unassigned}
      </span>
      <span className="mt-2 flex flex-wrap gap-2">
        <Status c={c} value={order.priority} />
      </span>
      <span className="mt-2 block text-xs">
        {formatDate(order.dueAt, locale)}
      </span>
    </button>
  );
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<Wrench />}
        title={c.orders}
        subtitle={c.ordersHint}
        actions={
          <>
            <Action aria-label={c.refresh} onClick={result.reload}>
              <RotateCw className="h-4 w-4" />
            </Action>
            {context.manager && (
              <Action primary onClick={() => setDialog("new")}>
                <Plus className="mr-2 h-4 w-4" />
                {c.newOrder}
              </Action>
            )}
          </>
        }
      />
      <IndiceWorkspaceNavigation
        ariaLabel={c.views}
        tone="gray"
        variant="views"
        value={scope.view}
        onValueChange={(view) => setScope({ ...scope, view, page: 1 })}
        items={["table", "board", "calendar"].map((id) => ({
          id,
          label: label(c, id),
        }))}
      />
      <Filters
        scope={scope}
        onChange={setScope}
        c={c}
        statuses={orderStatuses}
        total={result.data?.total}
        orders
      />
      <QueryFeedback result={result} c={c} />
      {scope.view === "calendar" && scope.attention === "preventive" && (
        <Feedback>{c.originalDue}</Feedback>
      )}
      {result.data &&
        (scope.view === "table" ? (
          <ListTable
            items={result.data.items}
            total={result.data.total}
            scope={scope}
            onChange={setScope}
            c={c}
            columns={[
              { id: "title", label: c.name, width: 300 },
              { id: "asset", label: c.asset, width: 220 },
              { id: "status", label: c.status, width: 200 },
              { id: "priority", label: c.priority, width: 150 },
              { id: "assignee", label: c.responsible, width: 210 },
              { id: "due", label: c.due, width: 220 },
            ]}
            onOpen={(order) => setDialog(order.id)}
            render={(order) => (
              <>
                <TableCell>
                  <strong>
                    #{order.id} · {order.title}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {label(c, order.orderType)}
                  </p>
                </TableCell>
                <TableCell>{order.assetName ?? c.noAsset}</TableCell>
                <TableCell>
                  <Status c={c} value={order.status} />
                </TableCell>
                <TableCell>
                  <Status c={c} value={order.priority} />
                </TableCell>
                <TableCell>{order.assigneeName ?? c.unassigned}</TableCell>
                <TableCell>
                  {formatDate(order.dueAt, locale)}
                  {new Date(order.dueAt) < new Date() &&
                    !["CLOSED", "CANCELLED"].includes(order.status) && (
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {c.overdue}
                      </p>
                    )}
                </TableCell>
              </>
            )}
          />
        ) : (
          <>
            {scope.view === "board" ? (
              <div className="overflow-x-auto rounded-2xl border bg-slate-50 p-4 dark:bg-slate-950">
                <div className="flex gap-4">
                  {orderStatuses.map((status) => (
                    <section key={status} className="w-64 shrink-0 space-y-3">
                      <h3 className="flex justify-between text-sm font-semibold">
                        <span>{label(c, status)}</span>
                        <span>
                          {
                            result.data!.items.filter(
                              (order) => order.status === status,
                            ).length
                          }
                        </span>
                      </h3>
                      {result
                        .data!.items.filter((order) => order.status === status)
                        .map(card)}
                    </section>
                  ))}
                </div>
              </div>
            ) : (
              <IndiceCalendarSurface
                dates={dates}
                locale={locale}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                label={c.calendar}
                tone="gray"
                renderDay={(date) =>
                  result
                    .data!.items.filter(
                      (order) =>
                        dateInput(
                          new Date(
                            scope.attention === "preventive"
                              ? order.originalDueAt
                              : order.dueAt,
                          ),
                        ) === date,
                    )
                    .map(card)
                }
              />
            )}
            <Pagination
              scope={scope}
              total={result.data.total}
              onChange={setScope}
            />
            {!result.data.total && <Feedback>{c.empty}</Feedback>}
          </>
        ))}
      {dialog === "new" ? (
        <OrderEditor c={c} context={context} onClose={close} onSaved={saved} />
      ) : typeof dialog === "number" ? (
        <OrderDossier
          id={dialog}
          c={c}
          context={context}
          locale={locale}
          onClose={close}
          onChanged={changed}
        />
      ) : null}
    </div>
  );
}
export function RequestsTab({ c, context, locale, allowed }: TabProps) {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState<number | "new" | null>(null);
  const { scope, setScope, result } = useMaintenanceList<RequestItem>(
    "requests",
    "/requests",
    ["NEW", "ACCEPTED", "REJECTED"],
    revision,
  );
  const changed = () => setRevision((v) => v + 1);
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<ClipboardList />}
        title={c.requests}
        subtitle={c.requestsHint}
        actions={
          <>
            <Action aria-label={c.refresh} onClick={result.reload}>
              <RotateCw className="h-4 w-4" />
            </Action>
            <Action primary onClick={() => setDialog("new")}>
              <Plus className="mr-2 h-4 w-4" />
              {c.newRequest}
            </Action>
          </>
        }
      />
      <Filters
        scope={scope}
        onChange={setScope}
        c={c}
        statuses={["NEW", "ACCEPTED", "REJECTED"]}
        total={result.data?.total}
      />
      <QueryFeedback result={result} c={c} />
      {scope.view === "calendar" && scope.attention === "preventive" && (
        <Feedback>{c.originalDue}</Feedback>
      )}
      {result.data && (
        <ListTable
          c={c}
          scope={scope}
          onChange={setScope}
          items={result.data.items}
          total={result.data.total}
          columns={[
            { id: "title", label: c.name, width: 310 },
            { id: "asset", label: c.asset, width: 240 },
            { id: "status", label: c.status, width: 180 },
            { id: "priority", label: c.priority, width: 150 },
            { id: "created", label: c.from, width: 220 },
          ]}
          onOpen={(row) => setDialog(row.id)}
          render={(row) => (
            <>
              <TableCell>
                <strong>
                  #{row.id} · {row.title}
                </strong>
              </TableCell>
              <TableCell>{row.assetName ?? row.location}</TableCell>
              <TableCell>
                <Status c={c} value={row.status} />
              </TableCell>
              <TableCell>
                <Status c={c} value={row.priority} />
              </TableCell>
              <TableCell>{formatDate(row.createdAt, locale)}</TableCell>
            </>
          )}
        />
      )}
      {dialog === "new" ? (
        <RequestEditor
          c={c}
          context={context}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            changed();
          }}
        />
      ) : typeof dialog === "number" ? (
        <RequestDossier
          id={dialog}
          c={c}
          context={context}
          locale={locale}
          onClose={() => setDialog(null)}
          onChanged={changed}
          onOrder={
            allowed.includes("orders")
              ? (id) => navigate(`/maintenance/orders?order=${id}`)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
export function AssetsTab({ c, context, locale, allowed }: TabProps) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams(),
    opened = useRef("");
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState<number | "new" | null>(null);
  const { scope, setScope, result } = useMaintenanceList<Asset>(
    "assets",
    "/assets",
    [],
    revision,
  );
  const changed = () => setRevision((v) => v + 1);
  useEffect(() => {
    const id = params.get("asset");
    if (
      id &&
      /^\d+$/.test(id) &&
      Number.isSafeInteger(Number(id)) &&
      Number(id) > 0 &&
      opened.current !== id
    ) {
      opened.current = id;
      setDialog(Number(id));
    }
  }, [params]);
  const close = () => {
    setDialog(null);
    if (params.has("asset")) {
      const next = new URLSearchParams(params);
      next.delete("asset");
      setParams(next, { replace: true });
      opened.current = "";
    }
  };
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<PackageCheck />}
        title={c.assets}
        subtitle={c.assetsHint}
        actions={
          <>
            <Action aria-label={c.refresh} onClick={result.reload}>
              <RotateCw className="h-4 w-4" />
            </Action>
            {context.manager && (
              <Action primary onClick={() => setDialog("new")}>
                <Plus className="mr-2 h-4 w-4" />
                {c.newAsset}
              </Action>
            )}
          </>
        }
      />
      <Filters
        c={c}
        scope={scope}
        onChange={setScope}
        statuses={[]}
        total={result.data?.total}
      />
      <QueryFeedback result={result} c={c} />
      {scope.view === "calendar" && scope.attention === "preventive" && (
        <Feedback>{c.originalDue}</Feedback>
      )}
      {result.data && (
        <ListTable
          c={c}
          scope={scope}
          onChange={setScope}
          items={result.data.items}
          total={result.data.total}
          columns={[
            { id: "name", label: c.name, width: 290 },
            { id: "type", label: c.assetType, width: 170 },
            { id: "location", label: c.location, width: 240 },
            { id: "criticality", label: c.criticality, width: 170 },
            { id: "status", label: c.status, width: 220 },
          ]}
          onOpen={(row) => setDialog(row.id)}
          render={(row) => (
            <>
              <TableCell>
                <strong>{row.name}</strong>
                {row.hrAssetId && (
                  <p className="text-xs text-slate-500">
                    {c.hrAsset} #{row.hrAssetId}
                  </p>
                )}
              </TableCell>
              <TableCell>{label(c, row.assetType)}</TableCell>
              <TableCell>{row.location}</TableCell>
              <TableCell>
                <Status c={c} value={row.criticality} />
              </TableCell>
              <TableCell>
                {!row.active
                  ? c.paused
                  : row.unavailable
                    ? c.unavailable
                    : c.available}
              </TableCell>
            </>
          )}
        />
      )}
      {dialog === "new" ? (
        <AssetEditor
          c={c}
          context={context}
          onClose={close}
          onSaved={() => {
            close();
            changed();
          }}
        />
      ) : typeof dialog === "number" ? (
        <AssetDossier
          id={dialog}
          c={c}
          context={context}
          locale={locale}
          onClose={close}
          onChanged={changed}
          canReport={allowed.includes("requests")}
          onOrders={
            allowed.includes("orders")
              ? () =>
                  navigate(
                    `/maintenance/orders?assetId=${dialog}&page=1&status=&attention=&q=&view=table&from=&to=`,
                  )
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
export function PreventiveTab({ c, context }: TabProps) {
  const [revision, setRevision] = useState(0),
    [dialog, setDialog] = useState<Plan | "new" | null>(null);
  const { scope, setScope, result } = useMaintenanceList<Plan>(
    "preventive",
    "/plans",
    [],
    revision,
  );
  const changed = () => setRevision((v) => v + 1);
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<Repeat />}
        title={c.preventive}
        subtitle={c.preventiveHint}
        actions={
          <>
            <Action aria-label={c.refresh} onClick={result.reload}>
              <RotateCw className="h-4 w-4" />
            </Action>
            <Action primary onClick={() => setDialog("new")}>
              <Plus className="mr-2 h-4 w-4" />
              {c.newPlan}
            </Action>
          </>
        }
      />
      <Filters
        c={c}
        scope={scope}
        onChange={setScope}
        statuses={[]}
        total={result.data?.total}
      />
      <QueryFeedback result={result} c={c} />
      {scope.view === "calendar" && scope.attention === "preventive" && (
        <Feedback>{c.originalDue}</Feedback>
      )}
      {result.data && (
        <ListTable
          c={c}
          scope={scope}
          onChange={setScope}
          items={result.data.items}
          total={result.data.total}
          columns={[
            { id: "title", label: c.name, width: 290 },
            { id: "asset", label: c.asset, width: 240 },
            { id: "recurrence", label: c.frequency, width: 180 },
            { id: "next", label: c.nextDate, width: 170 },
            { id: "status", label: c.status, width: 170 },
          ]}
          onOpen={(row: Plan) => setDialog(row)}
          render={(row) => (
            <>
              <TableCell>
                <strong>{row.title}</strong>
              </TableCell>
              <TableCell>{row.assetName}</TableCell>
              <TableCell>
                {label(c, row.frequency)} · {row.intervalCount}
              </TableCell>
              <TableCell>{row.nextDate}</TableCell>
              <TableCell>{row.active ? c.active : c.paused}</TableCell>
            </>
          )}
        />
      )}
      {dialog === "new" ? (
        <PlanEditor
          c={c}
          context={context}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            changed();
          }}
        />
      ) : dialog ? (
        <PlanDossier
          plan={dialog}
          c={c}
          onClose={() => setDialog(null)}
          onChanged={changed}
        />
      ) : null}
    </div>
  );
}
