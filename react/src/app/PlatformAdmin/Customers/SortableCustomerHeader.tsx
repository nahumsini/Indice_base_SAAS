import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { CustomerTableCopy } from "./customerTableCopy";
import type { CustomerSortKey, SortDirection } from "./customerTableUtils";

export function SortableCustomerHeader({
  column,
  label,
  copy,
  sort,
  onSort,
  sticky,
}: {
  column: CustomerSortKey;
  label: string;
  copy: CustomerTableCopy;
  sort?: { key: CustomerSortKey; direction: SortDirection };
  onSort?: (key: CustomerSortKey) => void;
  sticky?: boolean;
}) {
  const activeDirection = sort?.key === column ? sort.direction : null;
  const Icon =
    activeDirection === "asc"
      ? ArrowUp
      : activeDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;
  const stickyClass = sticky
    ? "sticky left-0 z-20 bg-slate-50 shadow-[8px_0_16px_-16px_rgba(15,23,42,0.45)]"
    : "";

  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500 ${stickyClass}`}
      aria-sort={
        activeDirection === "asc"
          ? "ascending"
          : activeDirection === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        disabled={!onSort}
        onClick={() => onSort?.(column)}
        className={`group inline-flex items-center gap-1.5 rounded-md py-1 text-left transition hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25 ${activeDirection ? "text-[#2563EB]" : ""}`}
        title={`${copy.sort}: ${label}`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 ${activeDirection ? "opacity-100" : "opacity-40 group-hover:opacity-100"}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}
