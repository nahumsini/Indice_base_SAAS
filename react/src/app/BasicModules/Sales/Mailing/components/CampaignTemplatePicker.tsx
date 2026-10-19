import { useEffect, useState } from "react";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { templateApi, type EmailTemplate } from "../mailingApi";
import type { MailingCopy } from "../translations";
import { TemplatePreview } from "./TemplateForm";
import { campaignFieldClassName } from "./CampaignEditorField";

export function CampaignTemplatePicker({
  copy,
  disabled,
  onApply,
}: {
  copy: MailingCopy;
  disabled: boolean;
  onApply: (
    value: Pick<EmailTemplate, "subject" | "previewText" | "bodyText">,
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState<Pick<
    EmailTemplate,
    "subject" | "previewText" | "bodyText"
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = window.setTimeout(
      () =>
        void templateApi
          .list(
            new URLSearchParams({
              search,
              status: "ACTIVE",
              page: "1",
              pageSize: "100",
              sort: "name",
              direction: "asc",
            }),
            controller.signal,
          )
          .then((result) => {
            if (!controller.signal.aborted) {
              setItems(result.items);
              setTotal(result.total);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) setError(copy.templateLoadError);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      300,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [search, refresh, copy.templateLoadError]);
  useEffect(() => {
    let active = true;
    setPreview(null);
    setError("");
    if (!selected) return;
    if (selected === "welcome") {
      setPreview({
        subject: copy.welcomeSubject,
        previewText: "",
        bodyText: copy.welcomeBody,
      });
      return;
    }
    setBusy(true);
    templateApi
      .get(selected)
      .then((value) => {
        if (active) {
          if (value.status !== "ACTIVE") setError(copy.templateLoadError);
          else setPreview(value);
        }
      })
      .catch(() => {
        if (active) setError(copy.templateLoadError);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [selected, copy]);
  async function apply() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      if (selected === "welcome") onApply(preview);
      else {
        const value = await templateApi.get(selected);
        if (value.status !== "ACTIVE") throw new Error();
        onApply(value);
      }
      setSelected("");
      setPreview(null);
    } catch {
      setError(copy.templateLoadError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {copy.templates}
        </span>
        <Input
          className={campaignFieldClassName}
          maxLength={180}
          value={search}
          placeholder={copy.templateSearch}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled || busy}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {copy.template}
        </span>
        <select
          className={`${campaignFieldClassName} border px-3 outline-none focus-visible:ring-2`}
          value={selected}
          disabled={disabled || loading || busy}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">{copy.selectTemplate}</option>
          <option value="welcome">{copy.welcome}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {loading && (
        <p role="status" className="text-sm">
          {copy.loading}
        </p>
      )}
      {total > 100 && <p className="text-sm">{copy.refineTemplates}</p>}
      {error && (
        <div role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setSelected("");
              setRefresh((v) => v + 1);
            }}
          >
            {copy.retry}
          </Button>
        </div>
      )}
      {preview && (
        <>
          <TemplatePreview value={preview} copy={copy} />
          <p className="text-sm text-slate-500">{copy.replaceContent}</p>
          <Button
            variant="outline"
            disabled={disabled || busy}
            onClick={() => void apply()}
          >
            {busy ? copy.loading : copy.applyTemplate}
          </Button>
        </>
      )}
    </div>
  );
}
