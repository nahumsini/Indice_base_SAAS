import { useCallback, useState } from "react";
import {
  maintenanceApi,
  query,
  type Balance,
  type Costs,
  type ExpenseLink,
  type Order,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Editor,
  Field,
  Feedback,
  Picker,
  control,
  useMaintenanceQuery,
} from "./MaintenancePrimitives";

type Common = {
  order: Order;
  c: MaintenanceCopy;
  onClose: () => void;
  onSaved: () => void;
};
export function LaborEditor({ order, c, onClose, onSaved }: Common) {
  const [key] = useState(() => crypto.randomUUID()),
    [draft, setDraft] = useState({ minutes: 30, note: "" });
  return (
    <Editor
      title={c.labor}
      c={c}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          `/orders/${order.id}/labor`,
          { ...draft, expectedVersion: order.version },
          "POST",
          key,
        )
      }
    >
      <Field label={c.minutes}>
        <input
          required
          type="number"
          min={1}
          max={1440}
          className={control}
          value={draft.minutes}
          onChange={(e) =>
            setDraft({ ...draft, minutes: Number(e.target.value) })
          }
        />
      </Field>
      <Field label={c.notes}>
        <textarea
          required
          maxLength={2000}
          rows={3}
          className={control}
          value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        />
      </Field>
    </Editor>
  );
}
export function PartEditor({ order, c, onClose, onSaved }: Common) {
  const [key] = useState(() => crypto.randomUUID()),
    [search, setSearch] = useState(""),
    [cursor, setCursor] = useState(""),
    [selected, setSelected] = useState<Balance>(),
    [quantity, setQuantity] = useState(1);
  const result = useMaintenanceQuery(
    useCallback(
      (signal) =>
        maintenanceApi.get<{
          items: Balance[];
          totalCount: number;
          nextCursor: string | null;
        }>(
          "/directories/stock" + query({ search, cursor: cursor || undefined }),
          signal,
        ),
      [search, cursor],
    ),
  );
  return (
    <Editor
      title={c.parts}
      c={c}
      draft={{ selected: selected?.id, quantity }}
      ready={Boolean(selected) && quantity > 0}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          `/orders/${order.id}/parts`,
          {
            expectedVersion: order.version,
            productId: selected!.productId,
            warehouseId: selected!.warehouseId,
            quantity,
          },
          "POST",
          key,
        )
      }
    >
      <Field label={c.search}>
        <input
          maxLength={180}
          className={control}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor("");
          }}
        />
      </Field>
      {result.error && <Feedback error>{c.error}</Feedback>}
      <Field label={c.stock}>
        <select
          required
          className={control}
          value={selected?.id ?? ""}
          onChange={(e) =>
            setSelected(
              result.data?.items.find(
                (item) => item.id === Number(e.target.value),
              ),
            )
          }
        >
          <option value="">{c.select}</option>
          {selected &&
            !result.data?.items.some((item) => item.id === selected.id) && (
              <option value={selected.id}>
                {selected.productName} · {selected.warehouseName}
              </option>
            )}
          {result.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.productName} · {item.warehouseName} · {item.freeQuantity}{" "}
              {item.inventoryUnit} · {item.currency}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex gap-3">
        <Action disabled={!cursor} onClick={() => setCursor("")}>
          {c.back}
        </Action>
        <Action
          disabled={!result.data?.nextCursor}
          onClick={() => setCursor(result.data!.nextCursor!)}
        >
          {c.more}
        </Action>
      </div>
      <Field label={c.quantity}>
        <input
          required
          type="number"
          min="0.0001"
          step="0.0001"
          max={selected?.freeQuantity ?? 1000000000}
          className={control}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </Field>
      {selected && (
        <p>
          {selected.unitCost} {selected.currency} · {c.quantity}: {quantity}
        </p>
      )}
    </Editor>
  );
}
export function ExpenseEditor({ order, c, onClose, onSaved }: Common) {
  const [draft, setDraft] = useState({
      expenseId: null as number | null,
      costType: "REFERENCE",
    }),
    [selected, setSelected] = useState("");
  return (
    <Editor
      title={c.expenses}
      c={c}
      draft={draft}
      ready={Boolean(draft.expenseId)}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(`/orders/${order.id}/expenses`, {
          ...draft,
          expectedVersion: order.version,
        })
      }
    >
      <Picker<ExpenseLink & { name: string }>
        path="/directories/expenses"
        title={c.nativeExpense}
        c={c}
        value={draft.expenseId}
        selected={selected}
        describe={(item) => `${item.concept} · ${item.currency}`}
        onChange={(item) => {
          setDraft({ ...draft, expenseId: item?.id ?? null });
          setSelected(item?.concept ?? "");
        }}
      />
      <Field label={c.costType}>
        <select
          className={control}
          value={draft.costType}
          onChange={(e) => setDraft({ ...draft, costType: e.target.value })}
        >
          <option value="REFERENCE">{c.REFERENCE}</option>
          <option value="SERVICE">{c.SERVICE}</option>
        </select>
      </Field>
      <Feedback>{c.expenseHint}</Feedback>
    </Editor>
  );
}
export function CostSummary({
  value,
  c,
  locale,
  onReverse,
}: {
  value: Costs;
  c: MaintenanceCopy;
  locale: string;
  onReverse?: (type: "labor" | "parts", id: number) => void;
}) {
  const amount = (value: number | null) =>
      value === null
        ? "—"
        : new Intl.NumberFormat(locale, {
            style: "currency",
            currency: valueCurrency,
          }).format(value),
    valueCurrency = value.currency;
  return (
    <div className="space-y-5">
      {!value.complete && <Feedback>{c.incompleteCost}</Feedback>}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [c.estimate, value.estimated],
          [c.actual, value.actual],
          [c.paidServices, value.paidServices],
          [c.laborCost, value.labor],
          [c.partsCost, value.parts],
          [c.servicesCost, value.services],
        ].map(([title, total]) => (
          <div key={String(title)} className="rounded-xl border p-4">
            <p className="text-sm text-slate-500">{title}</p>
            <strong className="text-lg">
              {amount(total as number | null)}
            </strong>
          </div>
        ))}
      </div>
      {value.laborEntries.map((entry) => (
        <div
          key={`l${entry.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        >
          <span>
            {entry.minutes} min · {entry.note} · {amount(entry.amount)}{" "}
            {entry.reversed ? ` · ${c.reversed}` : ""}
          </span>
          {onReverse && !entry.reversed && (
            <Action onClick={() => onReverse("labor", entry.id)}>
              {c.reverse}
            </Action>
          )}
        </div>
      ))}
      {value.partEntries.map((entry) => (
        <div
          key={`p${entry.id}`}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
        >
          <span>
            {entry.productName} · {entry.quantity} · {entry.warehouseName} ·{" "}
            {amount(entry.unitCost * entry.quantity)}{" "}
            {entry.reversed ? ` · ${c.reversed}` : ""}
          </span>
          {onReverse && !entry.reversed && (
            <Action onClick={() => onReverse("parts", entry.id)}>
              {c.reverse}
            </Action>
          )}
        </div>
      ))}
      {value.expenses.map((entry) => (
        <div key={`e${entry.id}`} className="rounded-xl border p-3">
          <p>
            {entry.available ? entry.concept : c.incompleteCost} ·{" "}
            {entry.costType === "SERVICE" ? c.servicesCost : c.REFERENCE}
          </p>
        </div>
      ))}
    </div>
  );
}
