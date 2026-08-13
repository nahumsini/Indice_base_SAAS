import { Boxes, CalendarClock, CalendarPlus, SlidersHorizontal, Users } from 'lucide-react';
import type { DistributorClient } from '../types/contractsAccess';
import type { DistributorPortalCopy } from '../translations';
import { companyInitials, formatContract, formatDate } from '../utils/contractsAccessFormatters';
import { CommercialStageBadge } from './CommercialStageBadge';

export function ClientPortfolioTable({
  clients,
  copy,
  locale,
  portfolioEmpty,
  onSelect,
  onExtendTrial,
}: {
  clients: DistributorClient[];
  copy: DistributorPortalCopy;
  locale: string;
  portfolioEmpty: boolean;
  onSelect: (client: DistributorClient) => void;
  onExtendTrial: (client: DistributorClient) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{copy.table.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.table.subtitle}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] table-fixed">
          <thead className="bg-slate-50/90 dark:bg-slate-900/60">
            <tr className="text-left text-xs font-semibold text-slate-500">
              <th className="w-[20%] px-5 py-3">{copy.table.company}</th>
              <th className="w-[10%] px-4 py-3">{copy.table.stage}</th>
              <th className="w-[22%] px-4 py-3">{copy.table.access}</th>
              <th className="w-[14%] px-4 py-3">{copy.table.contract}</th>
              <th className="w-[12%] px-4 py-3">{copy.table.users}</th>
              <th className="w-[12%] px-4 py-3">{copy.table.nextEvent}</th>
              <th className="w-[10%] px-4 py-3 text-right">{copy.table.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {clients.map((client) => {
              const contract = formatContract(client);
              const nextEvent = formatDate(client.next_event_at, locale);
              return (
                <tr key={client.company_id} className="group hover:bg-blue-50/35 dark:hover:bg-blue-950/10">
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E7F3F2] text-sm font-semibold text-[#177D66]">
                        {companyInitials(client.company_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{client.company_name}</p>
                        <p className="truncate text-xs text-slate-500">{client.owner_email || `#${client.company_id}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-middle"><CommercialStageBadge copy={copy} stage={client.commercial_stage} /></td>
                  <td className="px-4 py-4 align-middle">
                    {client.module_names.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {client.module_names.slice(0, 2).map((module) => (
                          <span key={module} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-200">{module}</span>
                        ))}
                        {client.module_names.length > 2 ? <span className="px-1 py-1 text-xs font-semibold text-[#2563EB]">+{client.module_names.length - 2}</span> : null}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Boxes className="h-3.5 w-3.5" />{copy.table.noModules}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="truncate text-sm font-semibold capitalize text-slate-800 dark:text-slate-100">{contract || copy.table.noPlan}</p>
                    <p className="mt-0.5 text-xs uppercase text-slate-500">{client.billing_interval || client.billing_status || '—'}</p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"><Users className="h-4 w-4 text-[#177D66]" />{client.active_members}/{client.seat_capacity}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{copy.table.members} / {copy.table.seats}</p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <CalendarClock className="h-4 w-4 text-[#2563EB]" />
                      {client.trial_extendable ? `${client.trial_days_remaining} ${copy.table.daysRemaining}` : nextEvent || copy.table.noDate}
                    </p>
                    {client.trial_extendable ? (
                      <>
                        <p className="mt-0.5 text-xs text-slate-500">{nextEvent || copy.table.noDate}</p>
                        <button type="button" onClick={() => onExtendTrial(client)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-[#174799] transition hover:bg-blue-100">
                          <CalendarPlus className="h-3.5 w-3.5" />
                          {copy.actions.extendTrial}
                        </button>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-right align-middle">
                    <button type="button" onClick={() => onSelect(client)} aria-label={`${copy.actions.manage}: ${client.company_name}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-600">
                      <SlidersHorizontal className="h-4 w-4" />
                      {copy.actions.manage}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!clients.length ? (
        <div className="grid min-h-48 place-items-center px-6 py-10 text-center">
          <div><Boxes className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-500">{portfolioEmpty ? copy.table.noClients : copy.table.noResults}</p></div>
        </div>
      ) : null}
    </section>
  );
}
