import { useCallback, useEffect, useState } from 'react';
import { schedulingApi, type Client } from '../services/schedulingApi';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';
import { ActionButton, controlClass, Feedback, Field } from './SchedulingPrimitives';
import { DataTablePagination } from '../../../components/table/DataTablePagination';

/** Private capture only. Sales remains the contact owner; selection does not grant consent. */
export function BookingClientPicker({ copy, locale, onSelect }: { copy: SchedulingCopy; locale: string; onSelect: (client: Client) => void }) {
  const [term, setTerm] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1);
  const op = getSchedulingOperationsCopy(locale);
  useEffect(() => { const timer = setTimeout(() => { setSearch(term); setPage(1); }, 250); return () => clearTimeout(timer); }, [term]);
  const query = useSchedulingQuery(useCallback(signal => schedulingApi.bookingClients(search, page, signal), [search, page]));
  return <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <Field label={op.client}><input className={controlClass} maxLength={180} value={term} onChange={e => setTerm(e.target.value)} /></Field>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <Feedback error>{copy.error}</Feedback> : <>
      <div className="grid gap-2 sm:grid-cols-2">{query.data?.items.map(client => <ActionButton key={client.id} className="h-auto justify-start whitespace-normal text-left" onClick={() => onSelect(client)}>
        {client.contactPerson || client.companyName} · {client.email || client.companyName}
      </ActionButton>)}</div>
      {!query.data?.items.length && <Feedback>{copy.empty}</Feedback>}
      <DataTablePagination currentPage={page} totalPages={Math.max(1, Math.ceil((query.data?.total ?? 0) / 25))}
        totalCount={query.data?.total ?? 0} pageSize={25} pageSizeOptions={[25]} pageStart={query.data?.total ? (page - 1) * 25 + 1 : 0}
        pageEnd={Math.min(page * 25, query.data?.total ?? 0)} onPageChange={setPage} onPageSizeChange={() => {}} />
    </>}
  </section>;
}
