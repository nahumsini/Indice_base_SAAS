import { useState } from "react";
import { usePreferredBusinessCurrency } from "../../../BasicModules/shared/BusinessCurrencyContext";
import { IndiceModalWizardStepper } from "../../../components/indice-modal/IndiceModalWizardStepper";
import {
  maintenanceApi,
  priorities,
  type Asset,
  type Order,
  type Context,
  type Step,
  type Choice,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Editor,
  Field,
  Picker,
  Feedback,
  control,
  label,
  localInput,
  dateInput,
} from "./MaintenancePrimitives";

type Common = {
  c: MaintenanceCopy;
  context: Context;
  onClose: () => void;
  onSaved: () => void;
};
export function SelectField({
  title,
  value,
  values,
  c,
  onChange,
}: {
  title: string;
  value: string;
  values: string[];
  c: MaintenanceCopy;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={title}>
      <select
        className={control}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {label(c, value)}
          </option>
        ))}
      </select>
    </Field>
  );
}
export function ChecklistEditor({
  value,
  onChange,
  c,
}: {
  value: Step[];
  onChange: (value: Step[]) => void;
  c: MaintenanceCopy;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-medium">{c.checklist}</h3>
      {value.map((step, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_auto_auto]"
        >
          <Field label={`${c.procedure} ${index + 1}`}>
            <input
              required
              maxLength={240}
              className={control}
              value={step.label}
              onChange={(e) =>
                onChange(
                  value.map((s, i) =>
                    i === index ? { ...s, label: e.target.value } : s,
                  ),
                )
              }
            />
          </Field>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={step.required}
              onChange={(e) =>
                onChange(
                  value.map((s, i) =>
                    i === index ? { ...s, required: e.target.checked } : s,
                  ),
                )
              }
            />
            {c.required}
          </label>
          <Action onClick={() => onChange(value.filter((_, i) => i !== index))}>
            {c.remove}
          </Action>
        </div>
      ))}
      <Action
        disabled={value.length >= 40}
        onClick={() =>
          onChange([...value, { label: "", required: true, done: false }])
        }
      >
        {c.addStep}
      </Action>
    </section>
  );
}
export function RequestEditor({
  c,
  context,
  onClose,
  onSaved,
  asset,
}: Common & { asset?: Asset }) {
  const [key] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState({
    assetId: asset?.id ?? (null as number | null),
    title: "",
    description: "",
    location: asset?.location ?? "",
    priority: "NORMAL",
    category: "",
  });
  const [assetName, setAssetName] = useState(asset?.name ?? "");
  return (
    <Editor
      title={c.newRequest}
      c={c}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() => maintenanceApi.save("/requests", draft, "POST", key)}
    >
      <Field label={c.name}>
        <input
          className={control}
          required
          maxLength={180}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </Field>
      <Picker<Asset>
        path="/directories/assets"
        value={draft.assetId}
        selected={assetName}
        c={c}
        title={c.asset}
        onChange={(item) => {
          setDraft({
            ...draft,
            assetId: item?.id ?? null,
            location: item?.location ?? draft.location,
          });
          setAssetName(item?.name ?? "");
        }}
      />
      <Field label={c.location}>
        <input
          className={control}
          required={!draft.assetId}
          maxLength={240}
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
        />
      </Field>
      <Field label={c.description}>
        <textarea
          className={control}
          rows={4}
          required
          maxLength={6000}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          c={c}
          title={c.priority}
          value={draft.priority}
          values={priorities}
          onChange={(priority) => setDraft({ ...draft, priority })}
        />
        <Field label={c.category}>
          <select
            className={control}
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            <option value="">{c.optional}</option>
            {context.settings.categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
    </Editor>
  );
}
export function AssetEditor({
  c,
  context,
  onClose,
  onSaved,
  asset,
}: Common & { asset?: Asset }) {
  const [key] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState({
    name: asset?.name ?? "",
    assetType: asset?.assetType ?? "EQUIPMENT",
    hrAssetId: asset?.hrAssetId ?? (null as number | null),
    unitId: asset?.unitId ?? context.assignment.unitId,
    businessId: asset?.businessId ?? context.assignment.businessId,
    location: asset?.location ?? "",
    criticality: asset?.criticality ?? "NORMAL",
    notes: asset?.notes ?? "",
    active: asset?.active ?? true,
    expectedVersion: asset?.version,
  });
  return (
    <Editor
      c={c}
      title={asset ? c.edit : c.newAsset}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          asset ? `/assets/${asset.id}` : "/assets",
          draft,
          asset ? "PUT" : "POST",
          key,
        )
      }
    >
      <Field label={c.name}>
        <input
          className={control}
          required
          maxLength={180}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>
      {!asset && (
        <SelectField
          c={c}
          title={c.assetType}
          value={draft.assetType}
          values={["EQUIPMENT", "LOCATION"]}
          onChange={(assetType) =>
            setDraft({ ...draft, assetType, hrAssetId: null })
          }
        />
      )}
      {!asset && context.hrAssets && draft.assetType === "EQUIPMENT" && (
        <>
          <Picker<Choice & { unitId: number | null; status: string }>
            path="/directories/hr-assets"
            c={c}
            title={c.hrAsset}
            value={draft.hrAssetId}
            onChange={(item) =>
              setDraft({
                ...draft,
                hrAssetId: item?.id ?? null,
                unitId: item?.unitId ?? context.assignment.unitId,
                name: draft.name || item?.name || "",
              })
            }
          />
          <p className="text-sm text-slate-500">{c.hrHint}</p>
        </>
      )}
      {!asset && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Picker<Choice>
            path="/directories/units"
            c={c}
            title={c.unit}
            value={draft.unitId}
            onChange={(item) =>
              setDraft({
                ...draft,
                unitId: item?.id ?? null,
                businessId: null,
                hrAssetId: null,
              })
            }
          />
          {draft.unitId && (
            <Picker<Choice>
              key={draft.unitId}
              path={`/directories/businesses?unitId=${draft.unitId}`}
              c={c}
              title={c.business}
              value={draft.businessId}
              onChange={(item) =>
                setDraft({ ...draft, businessId: item?.id ?? null })
              }
            />
          )}
        </div>
      )}
      <Field label={c.location}>
        <input
          className={control}
          maxLength={240}
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
        />
      </Field>
      <SelectField
        c={c}
        title={c.criticality}
        value={draft.criticality}
        values={priorities}
        onChange={(criticality) => setDraft({ ...draft, criticality })}
      />
      <Field label={c.notes}>
        <textarea
          className={control}
          rows={4}
          maxLength={6000}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
      </Field>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        {c.active}
      </label>
    </Editor>
  );
}
export function OrderEditor({
  c,
  context,
  onClose,
  onSaved,
  order,
}: Common & { order?: Order }) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [key] = useState(() => crypto.randomUUID());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [draft, setDraft] = useState({
    assetId: order?.assetId ?? (null as number | null),
    title: order?.title ?? "",
    description: order?.description ?? "",
    orderType: order?.orderType ?? "CORRECTIVE",
    priority: order?.priority ?? "NORMAL",
    category: order?.category ?? "",
    assigneeId: order?.assigneeId ?? (null as number | null),
    dueAt: localInput(
      order?.dueAt ?? new Date(Date.now() + 86400000).toISOString(),
    ),
    scheduledStart: order?.scheduledStart
      ? localInput(order.scheduledStart)
      : "",
    scheduledEnd: order?.scheduledEnd ? localInput(order.scheduledEnd) : "",
    timezone: order?.timezone ?? timezone,
    checklist:
      order?.checklist.map((s) => ({ ...s, done: false })) ?? ([] as Step[]),
    evidenceRequired:
      order?.evidenceRequired ?? context.settings.evidenceRequired,
    blocking: order?.blocking ?? false,
    currency: order?.currency ?? (context.settings.version ? context.settings.currency : preferredCurrency),
    estimatedAmount: order?.estimatedAmount ?? 0,
    reason: "",
    expectedVersion: order?.version,
  });
  const [assetName, setAssetName] = useState(order?.assetName ?? ""),
    [personName, setPersonName] = useState(order?.assigneeName ?? "");
  return (
    <Editor
      c={c}
      title={order ? c.edit : c.newOrder}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          order ? `/orders/${order.id}` : "/orders",
          {
            ...draft,
            dueAt: new Date(draft.dueAt).toISOString(),
            scheduledStart: draft.scheduledStart
              ? new Date(draft.scheduledStart).toISOString()
              : null,
            scheduledEnd: draft.scheduledEnd
              ? new Date(draft.scheduledEnd).toISOString()
              : null,
          },
          order ? "PUT" : "POST",
          key,
        )
      }
    >
      <Field label={c.name}>
        <input
          required
          maxLength={180}
          className={control}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </Field>
      {!order && (
        <Picker<Asset>
          path="/directories/assets"
          c={c}
          title={c.asset}
          value={draft.assetId}
          selected={assetName}
          onChange={(item) => {
            setDraft({
              ...draft,
              assetId: item?.id ?? null,
              blocking: item ? draft.blocking : false,
            });
            setAssetName(item?.name ?? "");
          }}
        />
      )}
      <Field label={c.description}>
        <textarea
          className={control}
          rows={3}
          maxLength={6000}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {!order && (
          <SelectField
            c={c}
            title={c.orderType}
            value={draft.orderType}
            values={["CORRECTIVE", "INSPECTION", "PREVENTIVE"]}
            onChange={(orderType) => setDraft({ ...draft, orderType })}
          />
        )}
        <SelectField
          c={c}
          title={c.priority}
          value={draft.priority}
          values={priorities}
          onChange={(priority) => setDraft({ ...draft, priority })}
        />
      </div>
      <Picker<Choice>
        path="/directories/members"
        c={c}
        title={c.responsible}
        value={draft.assigneeId}
        selected={personName}
        onChange={(item) => {
          setDraft({ ...draft, assigneeId: item?.id ?? null });
          setPersonName(item?.name ?? "");
        }}
      />
      <Field label={`${c.due} · ${timezone}`}>
        <input
          required
          type="datetime-local"
          className={control}
          value={draft.dueAt}
          onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${c.scheduledStart} · ${timezone}`}>
          <input
            type="datetime-local"
            className={control}
            value={draft.scheduledStart}
            onChange={(e) =>
              setDraft({ ...draft, scheduledStart: e.target.value })
            }
          />
        </Field>
        <Field label={`${c.scheduledEnd} · ${timezone}`}>
          <input
            type="datetime-local"
            className={control}
            required={Boolean(draft.scheduledStart)}
            value={draft.scheduledEnd}
            onChange={(e) =>
              setDraft({ ...draft, scheduledEnd: e.target.value })
            }
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.currency}>
          <input
            className={control}
            required
            pattern="[A-Z]{3}"
            maxLength={3}
            disabled={Boolean(order)}
            value={draft.currency}
            onChange={(e) =>
              setDraft({ ...draft, currency: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label={c.estimate}>
          <input
            className={control}
            required
            type="number"
            min="0"
            step="0.0001"
            max="99999999999"
            value={draft.estimatedAmount}
            onChange={(e) =>
              setDraft({ ...draft, estimatedAmount: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          disabled={!draft.assetId}
          checked={draft.blocking}
          onChange={(e) => setDraft({ ...draft, blocking: e.target.checked })}
        />
        {c.blocking}
      </label>
      {!order && (
        <>
          <Field label={c.procedure}>
            <select
              className={control}
              defaultValue=""
              onChange={(e) => {
                const procedure =
                  context.settings.procedures[Number(e.target.value)];
                if (procedure)
                  setDraft({
                    ...draft,
                    checklist: procedure.steps.map((s) => ({
                      ...s,
                      done: false,
                    })),
                    evidenceRequired: procedure.evidenceRequired,
                  });
              }}
            >
              <option value="">{c.select}</option>
              {context.settings.procedures.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <ChecklistEditor
            c={c}
            value={draft.checklist}
            onChange={(checklist) => setDraft({ ...draft, checklist })}
          />
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={draft.evidenceRequired}
              onChange={(e) =>
                setDraft({ ...draft, evidenceRequired: e.target.checked })
              }
            />
            {c.evidenceRequired}
          </label>
        </>
      )}
      {order && (
        <Field label={c.reason}>
          <textarea
            required
            maxLength={2000}
            className={control}
            rows={3}
            value={draft.reason}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
          />
        </Field>
      )}
    </Editor>
  );
}
export function PlanEditor({ c, context, onClose, onSaved }: Common) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [key] = useState(() => crypto.randomUUID()),
    [step, setStep] = useState(0),
    [assetName, setAssetName] = useState("");
  const [draft, setDraft] = useState({
    assetId: 0,
    title: "",
    description: "",
    priority: "NORMAL",
    anchorDate: dateInput(),
    frequency: "MONTHLY",
    intervalCount: 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    leadDays: 7,
    checklist: [] as Step[],
    evidenceRequired: context.settings.evidenceRequired,
    currency: context.settings.version ? context.settings.currency : preferredCurrency,
    estimatedAmount: 0,
  });
  const first = Boolean(
      draft.assetId &&
      draft.title.trim() &&
      draft.anchorDate &&
      draft.intervalCount >= 1 &&
      draft.intervalCount <= 365 &&
      draft.leadDays >= 0 &&
      draft.leadDays <= 90,
    ),
    second =
      draft.checklist.length > 0 &&
      draft.checklist.every((s) => s.label.trim());
  return (
    <Editor
      c={c}
      kind="wizard"
      title={c.newPlan}
      draft={draft}
      ready={step === 2 && first && second}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() => maintenanceApi.save("/plans", draft, "POST", key)}
      footer={
        <>
          {step > 0 && (
            <Action onClick={() => setStep((v) => v - 1)}>{c.back}</Action>
          )}
          {step < 2 && (
            <Action
              disabled={step === 0 ? !first : !second}
              onClick={() => setStep((v) => v + 1)}
            >
              {c.next}
            </Action>
          )}
        </>
      }
    >
      <IndiceModalWizardStepper
        accent="blue"
        activeStepId={String(step)}
        progressLabel={c.newPlan}
        steps={[
          { id: "0", label: c.planSteps },
          { id: "1", label: c.procedureStep },
          { id: "2", label: c.reviewStep },
        ]}
      />
      {step === 0 && (
        <>
          <Field label={c.name}>
            <input
              className={control}
              required
              maxLength={180}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Picker<Asset>
            path="/directories/assets"
            c={c}
            title={c.asset}
            value={draft.assetId || null}
            selected={assetName}
            onChange={(item) => {
              setDraft({ ...draft, assetId: item?.id ?? 0 });
              setAssetName(item?.name ?? "");
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.anchor}>
              <input
                className={control}
                type="date"
                min={dateInput()}
                required
                value={draft.anchorDate}
                onChange={(e) =>
                  setDraft({ ...draft, anchorDate: e.target.value })
                }
              />
            </Field>
            <SelectField
              c={c}
              title={c.frequency}
              value={draft.frequency}
              values={["DAILY", "WEEKLY", "MONTHLY"]}
              onChange={(frequency) => setDraft({ ...draft, frequency })}
            />
            <Field label={c.interval}>
              <input
                className={control}
                type="number"
                min={1}
                max={365}
                required
                value={draft.intervalCount}
                onChange={(e) =>
                  setDraft({ ...draft, intervalCount: Number(e.target.value) })
                }
              />
            </Field>
            <Field label={c.leadDays}>
              <input
                className={control}
                type="number"
                min={0}
                max={90}
                required
                value={draft.leadDays}
                onChange={(e) =>
                  setDraft({ ...draft, leadDays: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <SelectField
            c={c}
            title={c.priority}
            value={draft.priority}
            values={priorities}
            onChange={(priority) => setDraft({ ...draft, priority })}
          />
          <Feedback>{c.recurrenceHint}</Feedback>
        </>
      )}
      {step === 1 && (
        <>
          <Field label={c.procedure}>
            <select
              className={control}
              defaultValue=""
              onChange={(e) => {
                const p = context.settings.procedures[Number(e.target.value)];
                if (p)
                  setDraft({
                    ...draft,
                    checklist: p.steps.map((s) => ({ ...s, done: false })),
                    evidenceRequired: p.evidenceRequired,
                  });
              }}
            >
              <option value="">{c.select}</option>
              {context.settings.procedures.map((p, i) => (
                <option key={i} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <ChecklistEditor
            c={c}
            value={draft.checklist}
            onChange={(checklist) => setDraft({ ...draft, checklist })}
          />
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={draft.evidenceRequired}
              onChange={(e) =>
                setDraft({ ...draft, evidenceRequired: e.target.checked })
              }
            />
            {c.evidenceRequired}
          </label>
          <Field label={c.description}>
            <textarea
              className={control}
              maxLength={6000}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </Field>
        </>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{draft.title}</h3>
          <p>{assetName}</p>
          <p>
            {draft.anchorDate} · {label(c, draft.frequency)} · {c.interval}{" "}
            {draft.intervalCount} · {draft.timezone}
          </p>
          <p>
            {c.leadDays}: {draft.leadDays}
          </p>
          <ol className="list-decimal space-y-2 pl-6">
            {draft.checklist.map((s, i) => (
              <li key={i}>
                {s.label}
                {s.required ? ` · ${c.required}` : ""}
              </li>
            ))}
          </ol>
          <p>{draft.evidenceRequired ? c.evidenceRequired : c.optional}</p>
          <Feedback>{c.recurrenceHint}</Feedback>
        </div>
      )}
    </Editor>
  );
}
