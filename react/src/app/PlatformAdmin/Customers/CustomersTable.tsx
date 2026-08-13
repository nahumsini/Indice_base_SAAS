import { Building2 } from "lucide-react";
import type { PlatformCompanySummary } from "../../api/platformAdmin";
import { CustomerTableRow } from "./CustomerTableRow";
import { getCustomerTableCopy } from "./customerTableCopy";
import { SortableCustomerHeader } from "./SortableCustomerHeader";
import type { CustomerSortKey, SortDirection } from "./customerTableUtils";

export function CustomersTable({
  english,
  companies,
  sort,
  onSort,
  onOpenCompany,
  onOpenUsers,
  canEditTypes,
  onEditType,
  canAssignDistributors,
  onAssignDistributor,
  canExtendTrials,
  onExtendTrial,
  compact = false,
}: {
  english: boolean;
  companies: PlatformCompanySummary[];
  sort?: { key: CustomerSortKey; direction: SortDirection };
  onSort?: (key: CustomerSortKey) => void;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
  onOpenUsers: (company: PlatformCompanySummary) => void;
  canEditTypes?: boolean;
  onEditType?: (company: PlatformCompanySummary) => void;
  canAssignDistributors?: boolean;
  onAssignDistributor?: (company: PlatformCompanySummary) => void;
  canExtendTrials?: boolean;
  onExtendTrial?: (company: PlatformCompanySummary) => void;
  compact?: boolean;
}) {
  const copy = getCustomerTableCopy(english);
  const columns: Array<[CustomerSortKey, string, boolean?]> = [
    ["customer", copy.account, true],
    ["userType", copy.userType],
    ["distributor", copy.commercialOrigin],
    ["status", copy.status],
    ["plan", copy.access],
    ["users", copy.users],
    ["rate", copy.billing],
    ["nextEvent", copy.nextEvent],
  ];

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain">
      <table
        className="w-full min-w-[1580px] table-fixed border-collapse"
        aria-label={copy.account}
      >
        <colgroup>
          <col className="w-[230px]" />
          <col className="w-[145px]" />
          <col className="w-[235px]" />
          <col className="w-[105px]" />
          <col className="w-[260px]" />
          <col className="w-[150px]" />
          <col className="w-[155px]" />
          <col className="w-[150px]" />
          <col className="w-[170px]" />
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            {columns.map(([key, label, sticky]) => (
              <SortableCustomerHeader
                key={key}
                column={key}
                label={label}
                copy={copy}
                sort={sort}
                onSort={onSort}
                sticky={sticky}
              />
            ))}
            <th className="sticky right-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3 text-right text-xs font-medium text-slate-500 shadow-[-8px_0_16px_-16px_rgba(15,23,42,0.45)]">
              {copy.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {companies.map((company) => (
            <CustomerTableRow
              key={company.id}
              company={company}
              english={english}
              copy={copy}
              compact={compact}
              canEditTypes={canEditTypes}
              onEditType={onEditType}
              canAssignDistributors={canAssignDistributors}
              onAssignDistributor={onAssignDistributor}
              canExtendTrials={canExtendTrials}
              onExtendTrial={onExtendTrial}
              onOpenCompany={onOpenCompany}
              onOpenUsers={onOpenUsers}
            />
          ))}
          {!companies.length ? (
            <tr>
              <td colSpan={9}>
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center text-sm text-slate-500">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2563EB]">
                    <Building2 className="h-5 w-5" />
                  </span>
                  {copy.noAccounts}
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
