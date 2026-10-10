import { useCallback, useState } from "react";
import {
  maintenanceApi,
  query,
  type Page,
  type Context,
} from "../services/maintenanceApi";
import type { MaintenanceCopy } from "../translations/maintenanceCopy";
import {
  Action,
  Editor,
  Feedback,
  Field,
  control,
  useMaintenanceQuery,
} from "./MaintenancePrimitives";

type Technician = {
  id: number;
  name: string;
  specialties: string[];
  active: boolean;
  version: number;
};
function TechnicianEditor({
  item,
  context,
  c,
  onClose,
  onSaved,
}: {
  item: Technician;
  context: Context;
  c: MaintenanceCopy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({
    specialties: item.specialties,
    active: item.active,
  });
  return (
    <Editor
      title={item.name}
      c={c}
      draft={draft}
      onClose={onClose}
      onSaved={onSaved}
      onSave={() =>
        maintenanceApi.save(
          `/settings/team/${item.id}`,
          { ...draft, expectedVersion: item.version },
          "PUT",
        )
      }
    >
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        {c.active}
      </label>
      <div className="space-y-3">
        {context.settings.specialties.map((value) => (
          <label
            key={value}
            className="flex min-h-11 items-center gap-3 rounded-xl border p-3"
          >
            <input
              type="checkbox"
              checked={draft.specialties.includes(value)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  specialties: e.target.checked
                    ? [...draft.specialties, value]
                    : draft.specialties.filter((s) => s !== value),
                })
              }
            />
            {value}
          </label>
        ))}
      </div>
    </Editor>
  );
}
export function MaintenanceTeam({
  c,
  context,
}: {
  c: MaintenanceCopy;
  context: Context;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState<Technician>();
  const result = useMaintenanceQuery(
    useCallback(
      (signal) =>
        maintenanceApi.get<Page<Technician>>(
          "/settings/team" + query({ page, pageSize: 10, search }),
          signal,
        ),
      [page, search],
    ),
  );
  return (
    <section className="space-y-4 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="font-semibold">
        {c.responsible} · {c.specialties}
      </h3>
      <Field label={c.search}>
        <input
          className={control}
          maxLength={180}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      {result.error && <Feedback error>{c.error}</Feedback>}
      {result.loading ? (
        <Feedback>{c.loading}</Feedback>
      ) : (
        result.data?.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
          >
            <div>
              <strong>{item.name}</strong>
              <p className="text-sm text-slate-500">
                {item.active ? c.active : c.paused} ·{" "}
                {item.specialties.join(" · ") || "—"}
              </p>
            </div>
            <Action onClick={() => setEditing(item)}>{c.edit}</Action>
          </div>
        ))
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Action disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          {c.previous}
        </Action>
        <span>
          {result.data?.total ?? "—"} {c.records}
        </span>
        <Action
          disabled={!result.data || page * 10 >= result.data.total}
          onClick={() => setPage((p) => p + 1)}
        >
          {c.more}
        </Action>
      </div>
      {editing && (
        <TechnicianEditor
          item={editing}
          context={context}
          c={c}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            result.reload();
          }}
        />
      )}
    </section>
  );
}
