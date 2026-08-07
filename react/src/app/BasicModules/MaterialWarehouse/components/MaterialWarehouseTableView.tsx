import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { DataTablePagination } from '../../../components/table/DataTablePagination';
import { useTablePagination } from '../../../hooks/useTablePagination';
import type { MaterialActivity, MaterialRecord } from '../types';

type TableViewProps = {
  actionLabel: string;
  description: string;
  kind: 'materials' | 'activity';
  records: MaterialActivity[] | MaterialRecord[];
  title: string;
};

const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount);

export function MaterialWarehouseTableView({ actionLabel, description, kind, records, title }: TableViewProps) {
  const [query, setQuery] = useState('');
  const filteredRecords = useMemo(() => records.filter((record) => {
    const searchable = kind === 'materials'
      ? `${(record as MaterialRecord).code} ${(record as MaterialRecord).name} ${(record as MaterialRecord).category}`
      : `${(record as MaterialActivity).reference} ${(record as MaterialActivity).provider} ${(record as MaterialActivity).status}`;
    return searchable.toLowerCase().includes(query.toLowerCase());
  }), [kind, query, records]);
  const pagination = useTablePagination({ resetKey: query, rows: filteredRecords });

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-[#FF6B5E]/30 bg-[#FFF0EE] px-5 py-4 dark:bg-[#3a2220]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-medium text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p></div>
          <Button className="bg-[#FF6B5E] font-medium hover:bg-[#e95a4e]">{actionLabel}</Button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-200">Filters</label>
        <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 pl-9" placeholder="Search records" /></div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr>{kind === 'materials' ? <><th className="px-5 py-4 font-medium">Material</th><th className="px-5 py-4 font-medium">Available</th><th className="px-5 py-4 font-medium">Minimum</th><th className="px-5 py-4 font-medium">Unit cost</th><th className="px-5 py-4 font-medium">Origin</th><th className="px-5 py-4 font-medium">Certificate</th></> : <><th className="px-5 py-4 font-medium">Reference</th><th className="px-5 py-4 font-medium">Related party</th><th className="px-5 py-4 font-medium">Date</th><th className="px-5 py-4 font-medium">Items</th><th className="px-5 py-4 font-medium">Status</th><th className="px-5 py-4 font-medium">Native total</th></>}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{pagination.paginatedRows.map((record) => kind === 'materials' ? <MaterialRow key={record.id} record={record as MaterialRecord} /> : <ActivityRow key={record.id} record={record as MaterialActivity} />)}</tbody></table></div>
        <DataTablePagination {...pagination} itemLabel="records" />
      </div>
    </section>
  );
}

function MaterialRow({ record }: { record: MaterialRecord }) { const available = record.onHand - record.reserved; return <tr className="text-slate-700 dark:text-slate-200"><td className="px-5 py-4"><p className="font-medium">{record.name}</p><p className="mt-1 text-xs text-slate-500">{record.code} · {record.category}</p></td><td className="px-5 py-4">{available} {record.unit}</td><td className="px-5 py-4">{record.minimum} {record.unit}</td><td className="px-5 py-4">{formatMoney(record.unitCost, record.currency)}</td><td className="px-5 py-4">{record.originCountry}</td><td className="px-5 py-4">{record.certificateStatus}</td></tr>; }
function ActivityRow({ record }: { record: MaterialActivity }) { return <tr className="text-slate-700 dark:text-slate-200"><td className="px-5 py-4 font-medium">{record.reference}</td><td className="px-5 py-4">{record.provider}</td><td className="px-5 py-4">{record.date}</td><td className="px-5 py-4">{record.itemCount}</td><td className="px-5 py-4">{record.status}</td><td className="px-5 py-4">{record.total ? formatMoney(record.total, record.currency) : '—'}</td></tr>; }
