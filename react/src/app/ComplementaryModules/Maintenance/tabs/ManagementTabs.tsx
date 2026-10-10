import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { ChartNoAxesCombined, Settings2 } from "lucide-react";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceFilterBar } from "../../../components/frontend-os/IndiceFilterBar";
import { usePreferredBusinessCurrency } from "../../../BasicModules/shared/BusinessCurrencyContext";
import {
  maintenanceApi,
  query,
  type Metrics,
  type Settings,
} from "../services/maintenanceApi";
import {
  Action,
  Editor,
  Feedback,
  Field,
  control,
  dateInput,
  panel,
  useMaintenanceQuery,
} from "../components/MaintenancePrimitives";
import { ChecklistEditor } from "../components/MaintenanceEditors";
import type { TabProps } from "./OperationalTabs";
import { MaintenanceCostSummary } from "../components/MaintenanceCostSummary";
import { MaintenanceTeam } from "../components/MaintenanceTeam";

export function IndicatorsTab({ c, locale, allowed }: TabProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(() => ({
    from: dateInput(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    to: dateInput(),
  }));
  const result = useMaintenanceQuery(
    useCallback(
      (signal) => {
        const from = new Date(`${period.from}T00:00:00`),
          to = new Date(`${period.to}T00:00:00`);
        to.setDate(to.getDate() + 1);
        return maintenanceApi.get<Metrics>(
          "/metrics" +
            query({ from: from.toISOString(), to: to.toISOString() }),
          signal,
        );
      },
      [period.from, period.to],
    ),
  );
  const count = (value: number | null) =>
    value === null
      ? c.noData
      : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
          value,
        );
  const m = result.data;
  const cards = m
    ? [
        { title: c.currentOpen, value: count(m.open), attention: "open" },
        { title: c.overdue, value: count(m.overdue), attention: "overdue" },
        { title: c.critical, value: count(m.critical), attention: "critical" },
        {
          title: c.preventiveRate,
          value: m.preventiveDue
            ? `${count((m.preventiveOnTime / m.preventiveDue) * 100)}%`
            : c.noData,
          note: `${m.preventiveOnTime} ${c.denominator} ${m.preventiveDue}`,
          attention: "preventive",
        },
        { title: c.response, value: count(m.responseHours) },
        { title: c.repair, value: count(m.repairHours) },
        { title: c.downtime, value: count(m.downtimeHours) },
        {
          title: c.preventiveDue,
          value: count(m.preventiveDue),
          attention: "preventive",
        },
      ]
    : [];
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<ChartNoAxesCombined />}
        title={c.indicators}
        subtitle={c.indicatorsHint}
        actions={<Action onClick={result.reload}>{c.refresh}</Action>}
      />
      <IndiceFilterBar title={c.filters} gridClassName="sm:grid-cols-2">
        <Field label={c.from}>
          <input
            type="date"
            required
            max={period.to}
            className={control}
            value={period.from}
            onChange={(e) => {
              if (e.target.value)
                setPeriod({ ...period, from: e.target.value });
            }}
          />
        </Field>
        <Field label={c.to}>
          <input
            type="date"
            required
            min={period.from}
            className={control}
            value={period.to}
            onChange={(e) => {
              if (e.target.value) setPeriod({ ...period, to: e.target.value });
            }}
          />
        </Field>
      </IndiceFilterBar>
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : result.error ? (
        <Feedback error>{c.error}</Feedback>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.title} className={`${panel} flex flex-col gap-3`}>
              <h3 className="text-sm text-slate-500">{card.title}</h3>
              <strong className="text-3xl font-semibold tracking-tight">
                {card.value}
              </strong>
              {card.note && (
                <p className="text-xs text-slate-500">{card.note}</p>
              )}
              {card.attention && allowed.includes("orders") && (
                <Action
                  className="mt-auto"
                  onClick={() =>
                    navigate(
                      `/maintenance/orders?attention=${card.attention}&status=&q=&view=table&page=1&assetId=0&from=${card.attention === "preventive" ? period.from : ""}&to=${card.attention === "preventive" ? period.to : ""}`,
                    )
                  }
                >
                  {c.open}
                </Action>
              )}
            </div>
          ))}
        </div>
      )}
      <Feedback>{c.metricsHint}</Feedback>
      <MaintenanceCostSummary
        c={c}
        locale={locale}
        from={period.from}
        to={period.to}
      />
    </div>
  );
}
function SettingsEditor({
  c,
  context,
  onClose,
  onSaved,
}: Pick<TabProps, "c" | "context"> & {
  onClose: () => void;
  onSaved: () => void;
}) {
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const [draft, setDraft] = useState<Settings>({
    ...context.settings,
    currency: context.settings.version
      ? context.settings.currency
      : preferredCurrency,
    timezone: context.settings.version
      ? context.settings.timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [categories, setCategories] = useState(draft.categories.join("\n")),
    [specialties, setSpecialties] = useState(draft.specialties.join("\n"));
  const lines = (text: string) =>
    text
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  return (
    <Editor
      title={c.configuration}
      c={c}
      draft={{ draft, categories, specialties }}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          "/settings",
          {
            ...draft,
            categories: lines(categories),
            specialties: lines(specialties),
          },
          "PUT",
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.timezone}>
          <input
            required
            className={control}
            maxLength={80}
            value={draft.timezone}
            onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
          />
        </Field>
        <Field label={c.currency}>
          <input
            required
            className={control}
            pattern="[A-Z]{3}"
            maxLength={3}
            value={draft.currency}
            onChange={(e) =>
              setDraft({ ...draft, currency: e.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label={c.standardRate}>
          <input
            required
            type="number"
            min={0}
            max={1000000}
            step="0.0001"
            className={control}
            value={draft.hourlyRate}
            onChange={(e) =>
              setDraft({ ...draft, hourlyRate: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <p className="text-sm text-slate-500">{c.rateHint}</p>
      <section className="space-y-4">
        <h3 className="font-semibold">{c.responseTargets}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            ["criticalHours", "highHours", "normalHours", "lowHours"] as const
          ).map((key, i) => (
            <Field key={key} label={[c.CRITICAL, c.HIGH, c.NORMAL, c.LOW][i]}>
              <input
                required
                type="number"
                min={1}
                max={8760}
                className={control}
                value={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: Number(e.target.value) })
                }
              />
            </Field>
          ))}
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={c.categories}>
          <textarea
            rows={5}
            maxLength={3200}
            className={control}
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
          />
        </Field>
        <Field label={c.specialties}>
          <textarea
            rows={5}
            maxLength={3200}
            className={control}
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={draft.evidenceRequired}
          onChange={(e) =>
            setDraft({ ...draft, evidenceRequired: e.target.checked })
          }
        />
        {c.defaultEvidence}
      </label>
      <section className="space-y-4">
        <h3 className="font-semibold">{c.procedures}</h3>
        {draft.procedures.map((procedure, index) => (
          <div key={index} className="space-y-4 rounded-xl border p-4">
            <Field label={c.procedureName}>
              <input
                required
                maxLength={100}
                className={control}
                value={procedure.name}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    procedures: draft.procedures.map((p, i) =>
                      i === index ? { ...p, name: e.target.value } : p,
                    ),
                  })
                }
              />
            </Field>
            <ChecklistEditor
              c={c}
              value={procedure.steps}
              onChange={(steps) =>
                setDraft({
                  ...draft,
                  procedures: draft.procedures.map((p, i) =>
                    i === index ? { ...p, steps } : p,
                  ),
                })
              }
            />
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={procedure.evidenceRequired}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    procedures: draft.procedures.map((p, i) =>
                      i === index
                        ? { ...p, evidenceRequired: e.target.checked }
                        : p,
                    ),
                  })
                }
              />
              {c.evidenceRequired}
            </label>
            <Action
              onClick={() =>
                setDraft({
                  ...draft,
                  procedures: draft.procedures.filter((_, i) => i !== index),
                })
              }
            >
              {c.remove}
            </Action>
          </div>
        ))}
        <Action
          disabled={draft.procedures.length >= 30}
          onClick={() =>
            setDraft({
              ...draft,
              procedures: [
                ...draft.procedures,
                {
                  name: "",
                  steps: [{ label: "", required: true, done: false }],
                  evidenceRequired: draft.evidenceRequired,
                },
              ],
            })
          }
        >
          {c.addProcedure}
        </Action>
      </section>
    </Editor>
  );
}
export function ConfigurationTab({
  c,
  context,
  onChanged,
}: TabProps & { onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  return (
    <div className="space-y-6">
      <IndiceTitleBar
        tone="gray"
        icon={<Settings2 />}
        title={c.configuration}
        subtitle={c.configurationHint}
        actions={
          <Action primary onClick={() => setEdit(true)}>
            {c.edit}
          </Action>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <section className={panel}>
          <h3 className="mb-4 font-semibold">{c.responseTargets}</h3>
          <dl className="grid grid-cols-2 gap-3">
            {[
              [c.CRITICAL, context.settings.criticalHours],
              [c.HIGH, context.settings.highHours],
              [c.NORMAL, context.settings.normalHours],
              [c.LOW, context.settings.lowHours],
            ].map(([name, hours]) => (
              <div key={String(name)}>
                <dt className="text-sm text-slate-500">{name}</dt>
                <dd>{hours} h</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={panel}>
          <h3 className="mb-4 font-semibold">{c.standardRate}</h3>
          <p>
            {context.settings.hourlyRate} {context.settings.currency}
          </p>
          <p className="mt-3 text-sm text-slate-500">{c.rateHint}</p>
          <p className="mt-3">{context.settings.timezone}</p>
        </section>
        <section className={panel}>
          <h3 className="mb-4 font-semibold">{c.procedures}</h3>
          {context.settings.procedures.map((p, i) => (
            <p key={i} className="mb-2">
              {p.name} · {p.steps.length} {c.checklist}
            </p>
          ))}
          {!context.settings.procedures.length && (
            <p className="text-sm text-slate-500">{c.empty}</p>
          )}
        </section>
        <section className={panel}>
          <h3 className="mb-4 font-semibold">{c.category}</h3>
          <p>{context.settings.categories.join(" · ") || "—"}</p>
          <h3 className="my-4 font-semibold">{c.specialties}</h3>
          <p>{context.settings.specialties.join(" · ") || "—"}</p>
        </section>
      </div>
      <MaintenanceTeam c={c} context={context} />
      {edit && (
        <SettingsEditor
          c={c}
          context={context}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}
