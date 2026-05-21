import type { RHIncentivo } from '../../mockData';
import type { IncentivesTranslations } from '../translations';

export type IncentiveColumnId =
  | 'incentive'
  | 'type'
  | 'scope'
  | 'amount'
  | 'application'
  | 'status';

interface IncentivesTableProps {
  copy: IncentivesTranslations;
  incentives: RHIncentivo[];
  selectedIds: string[];
  visibleColumns: IncentiveColumnId[];
  onToggleRow: (incentiveId: string) => void;
  onToggleAll: (checked: boolean) => void;
}

const statusClasses: Record<RHIncentivo['estado'], string> = {
  Activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Programado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Pausado: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

const typeClasses: Record<RHIncentivo['tipo'], string> = {
  Automatizado: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300',
  Manual: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
};

export function IncentivesTable({
  copy,
  incentives,
  selectedIds,
  visibleColumns,
  onToggleAll,
  onToggleRow,
}: IncentivesTableProps) {
  const visibleColumnSet = new Set(visibleColumns);
  const allVisibleSelected = incentives.length > 0 && incentives.every((incentive) => selectedIds.includes(incentive.id));

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/50">
            <tr>
              <th className="w-12 px-5 py-4 text-left">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => onToggleAll(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                />
              </th>
              {visibleColumnSet.has('incentive') ? <TableHeader label={copy.columns.incentive} /> : null}
              {visibleColumnSet.has('type') ? <TableHeader label={copy.columns.type} /> : null}
              {visibleColumnSet.has('scope') ? <TableHeader label={copy.columns.scope} /> : null}
              {visibleColumnSet.has('amount') ? <TableHeader label={copy.columns.amount} /> : null}
              {visibleColumnSet.has('application') ? <TableHeader label={copy.columns.application} /> : null}
              {visibleColumnSet.has('status') ? <TableHeader label={copy.columns.status} /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {incentives.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">
                  {copy.table.empty}
                </td>
              </tr>
            ) : (
              incentives.map((incentive) => (
                <tr key={incentive.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(incentive.id)}
                      onChange={() => onToggleRow(incentive.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#59C3A5] focus:ring-[#59C3A5]"
                    />
                  </td>
                  {visibleColumnSet.has('incentive') ? (
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{incentive.nombre}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{incentive.id}</p>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('type') ? (
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeClasses[incentive.tipo]}`}>
                        {copy.types[incentive.tipo]}
                      </span>
                    </td>
                  ) : null}
                  {visibleColumnSet.has('scope') ? (
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{incentive.alcance}</td>
                  ) : null}
                  {visibleColumnSet.has('amount') ? (
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{incentive.monto}</td>
                  ) : null}
                  {visibleColumnSet.has('application') ? (
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{incentive.aplicacion}</td>
                  ) : null}
                  {visibleColumnSet.has('status') ? (
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[incentive.estado]}`}>
                        {copy.statuses[incentive.estado]}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 text-sm text-slate-600 dark:border-gray-700 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
        <span>{copy.table.showing(incentives.length)}</span>
        <div className="flex items-center gap-3">
          <span>{copy.table.page}</span>
          <button type="button" className="text-slate-400" disabled>{copy.table.previous}</button>
          <button type="button" className="text-slate-400" disabled>{copy.table.next}</button>
        </div>
      </div>
    </div>
  );
}

function TableHeader({ label }: { label: string }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
      {label}
    </th>
  );
}
