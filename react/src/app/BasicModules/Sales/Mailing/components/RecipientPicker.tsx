import { useEffect, useState } from "react";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { DataTablePagination } from "../../../../components/table/DataTablePagination";
import { mailingApi, type MailingContact } from "../mailingApi";
import type { MailingCopy } from "../translations";
export function RecipientPicker({
  copy,
  selected,
  onChange,
  disabled,
}: {
  copy: MailingCopy;
  selected: MailingContact[];
  onChange: (value: MailingContact[]) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [items, setItems] = useState<MailingContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setItems([]);
    const timer = window.setTimeout(
      () =>
        void mailingApi
          .contacts(
            new URLSearchParams({
              search,
              page: String(page),
              pageSize: String(size),
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
            if (!controller.signal.aborted) setFailed(true);
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
  }, [search, page, size, refresh]);
  const ids = new Set(selected.map((c) => c.id));
  return (
    <div className="space-y-4">
      <p className="text-sm">
        {copy.selected}: {selected.length} / 500
      </p>
      <p className="text-xs text-slate-500">{copy.limit}</p>
      <label className="block space-y-2 text-sm">
        <span>{copy.findContacts}</span>
        <Input
          className="h-11"
          value={search}
          maxLength={180}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={
            disabled ||
            loading ||
            failed ||
            items.length === 0 ||
            new Set([...selected, ...items].map((contact) => contact.id)).size >
              500
          }
          onClick={() =>
            onChange(
              Array.from(
                new Map(
                  [...selected, ...items].map((contact) => [
                    contact.id,
                    contact,
                  ]),
                ).values(),
              ),
            )
          }
        >
          {copy.selectPage}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || selected.length === 0}
          onClick={() => onChange([])}
        >
          {copy.clearSelection}
        </Button>
      </div>
      {selected.length > 0 && (
        <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
          {selected.map((c) => (
            <Button
              key={c.id}
              variant="outline"
              disabled={disabled}
              onClick={() =>
                onChange(selected.filter((row) => row.id !== c.id))
              }
              aria-label={`${copy.discard}: ${c.name}`}
            >
              {c.name} ×
            </Button>
          ))}
        </div>
      )}
      {loading ? (
        <p role="status">{copy.loading}</p>
      ) : failed ? (
        <div role="alert">
          <p>{copy.loadError}</p>
          <Button onClick={() => setRefresh((v) => v + 1)}>{copy.retry}</Button>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
          {items.length ? (
            items.map((contact) => (
              <label
                key={contact.id}
                className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm dark:border-slate-800"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[#FF6B5E]"
                  checked={ids.has(contact.id)}
                  disabled={
                    disabled || (selected.length >= 500 && !ids.has(contact.id))
                  }
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, contact]
                        : selected.filter((c) => c.id !== contact.id),
                    )
                  }
                />
                <span>
                  {contact.name}
                  <span className="block text-xs text-slate-500">
                    {contact.email || "—"}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="p-4 text-sm">{copy.noContacts}</p>
          )}
        </div>
      )}
      {!loading && !failed && total > 0 && (
        <DataTablePagination
          attached={false}
          currentPage={page}
          pageSize={size}
          pageSizeOptions={[10, 25, 50, 100, 200]}
          totalCount={total}
          totalPages={Math.max(1, Math.ceil(total / size))}
          pageStart={(page - 1) * size + 1}
          pageEnd={Math.min(page * size, total)}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setSize(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
