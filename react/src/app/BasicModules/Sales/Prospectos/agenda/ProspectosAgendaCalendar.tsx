import type { DragEvent } from 'react';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { AgendaViewMode } from '../types/prospectosTypes';
import {
  formatAgendaDayLabel,
  getTodayInputValue,
  minutesToHourLabel,
  parseTimeToMinutes,
} from '../utils/prospectosFormatters';
import { agendaWorkHours } from '../utils/prospectosStatus';
import { ProspectosAgendaItem, ProspectosWeeklyAgendaItem } from './ProspectosAgendaItem';

export function ProspectosAgendaCalendar({
  mode,
  selectedDate,
  dayOpportunities,
  weekDates,
  weekOpportunities,
  opportunitySchedules,
  opportunitiesForDate,
  onDraftChange,
  onScheduleDrop,
  onDateDrop,
  onOpenFiles,
  onOpenHistory,
  onEdit,
}: {
  mode: AgendaViewMode;
  selectedDate: string;
  dayOpportunities: SalesOpportunity[];
  weekDates: string[];
  weekOpportunities: SalesOpportunity[];
  opportunitySchedules: Map<string, { date: string; time: string }>;
  opportunitiesForDate: (date: string) => SalesOpportunity[];
  onDraftChange: (opportunity: SalesOpportunity, field: 'date' | 'time', value: string) => void;
  onScheduleDrop: (event: DragEvent<HTMLElement>, date: string, time: string) => void;
  onDateDrop: (event: DragEvent<HTMLElement>, date: string) => void;
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
}) {
  if (mode === 'week') {
    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div
          className="grid min-w-[1180px] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
          style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
        >
          <div className="border-r border-slate-200 px-3 py-3">Hora</div>
          {weekDates.map((date) => {
            const isToday = date === getTodayInputValue();
            const dateOpportunities = opportunitiesForDate(date);

            return (
              <div
                key={date}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDateDrop(event, date)}
                className={[
                  'border-r border-slate-200 px-3 py-3 last:border-r-0',
                  isToday ? 'bg-[#2563EB]/[0.06]' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold capitalize tracking-normal text-slate-950">{formatAgendaDayLabel(date)}</p>
                    <p className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-slate-500">{dateOpportunities.length} seguimientos</p>
                  </div>
                  {isToday ? (
                    <span className="shrink-0 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-[#2563EB]">Hoy</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="max-h-[68vh] min-w-[1180px] overflow-auto">
          {agendaWorkHours.map((hour) => (
            <div
              key={hour}
              className="grid min-h-[118px] border-b border-slate-100 last:border-b-0"
              style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
            >
              <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600">{hour}</div>
              {weekDates.map((date) => {
                const cellOpportunities = opportunitiesForDate(date).filter((opportunity) => {
                  const schedule = opportunitySchedules.get(opportunity.id);
                  const minutes = schedule?.time ? parseTimeToMinutes(schedule.time) : null;
                  return minutes !== null && minutesToHourLabel(minutes) === hour;
                });

                return (
                  <div
                    key={`${date}-${hour}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onScheduleDrop(event, date, hour)}
                    className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#FF6B5E]/[0.04]"
                  >
                    {cellOpportunities.length > 0 ? cellOpportunities.map((opportunity) => (
                      <ProspectosWeeklyAgendaItem
                        key={opportunity.id}
                        opportunity={opportunity}
                        schedule={opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' }}
                        onOpenFiles={onOpenFiles}
                        onOpenHistory={onOpenHistory}
                        onEdit={onEdit}
                      />
                    )) : (
                      <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300">
                        Soltar aquí
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {weekOpportunities.some((opportunity) => !opportunitySchedules.get(opportunity.id)?.time) ? (
            <div
              className="grid min-h-[118px]"
              style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
            >
              <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600">Sin hora</div>
              {weekDates.map((date) => {
                const dateOpportunitiesWithoutTime = opportunitiesForDate(date).filter((opportunity) => !opportunitySchedules.get(opportunity.id)?.time);

                return (
                  <div
                    key={`${date}-unscheduled-time`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => onScheduleDrop(event, date, '')}
                    className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#FF6B5E]/[0.04]"
                  >
                    {dateOpportunitiesWithoutTime.length > 0 ? dateOpportunitiesWithoutTime.map((opportunity) => (
                      <ProspectosWeeklyAgendaItem
                        key={opportunity.id}
                        opportunity={opportunity}
                        schedule={opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' }}
                        onOpenFiles={onOpenFiles}
                        onOpenHistory={onOpenHistory}
                        onEdit={onEdit}
                      />
                    )) : (
                      <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300">
                        Sin hora
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (mode === 'list') {
    return (
      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {weekDates.map((date) => {
          const dateOpportunities = opportunitiesForDate(date);

          return (
            <div
              key={date}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDateDrop(event, date)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold capitalize text-slate-950">{formatAgendaDayLabel(date, 'long')}</p>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {dateOpportunities.length} seguimientos
                </span>
              </div>
              <div className="space-y-2">
                {dateOpportunities.length > 0 ? dateOpportunities.map((opportunity) => (
                  <ProspectosAgendaItem
                    key={opportunity.id}
                    opportunity={opportunity}
                    compact
                    schedule={opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' }}
                    onDraftChange={onDraftChange}
                    onOpenFiles={onOpenFiles}
                    onOpenHistory={onOpenHistory}
                    onEdit={onEdit}
                  />
                )) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-medium text-slate-400">
                    Sin seguimientos programados
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500" style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}>
        <div className="px-4 py-3">Horario</div>
        <div className="px-4 py-3">Plan de contacto</div>
      </div>

      {agendaWorkHours.map((hour) => {
        const hourOpportunities = dayOpportunities.filter((opportunity) => {
          const schedule = opportunitySchedules.get(opportunity.id);
          const minutes = schedule?.time ? parseTimeToMinutes(schedule.time) : null;
          return minutes !== null && minutesToHourLabel(minutes) === hour;
        });

        return (
          <div
            key={hour}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onScheduleDrop(event, selectedDate, hour)}
            className="grid min-h-[104px] border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[#FF6B5E]/[0.04]"
            style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
          >
            <div className="border-r border-slate-100 bg-slate-50/60 px-4 py-4 text-sm font-bold text-slate-600">{hour}</div>
            <div className="space-y-3 px-4 py-4">
              {hourOpportunities.length > 0 ? hourOpportunities.map((opportunity) => (
                <ProspectosAgendaItem
                  key={opportunity.id}
                  opportunity={opportunity}
                  compact
                  schedule={opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' }}
                  onDraftChange={onDraftChange}
                  onOpenFiles={onOpenFiles}
                  onOpenHistory={onOpenHistory}
                  onEdit={onEdit}
                />
              )) : (
                <div className="flex h-full min-h-[72px] items-center rounded-lg border border-dashed border-slate-200 px-4 text-sm font-medium text-slate-400">
                  Arrastra una oportunidad aquí
                </div>
              )}
            </div>
          </div>
        );
      })}

      {dayOpportunities.some((opportunity) => !opportunitySchedules.get(opportunity.id)?.time) ? (
        <div
          className="grid min-h-[104px]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onScheduleDrop(event, selectedDate, '')}
          style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
        >
          <div className="border-r border-slate-100 bg-slate-50/60 px-4 py-4 text-sm font-bold text-slate-600">Sin hora</div>
          <div className="space-y-3 px-4 py-4">
            {dayOpportunities
              .filter((opportunity) => !opportunitySchedules.get(opportunity.id)?.time)
              .map((opportunity) => (
                <ProspectosAgendaItem
                  key={opportunity.id}
                  opportunity={opportunity}
                  compact
                  schedule={opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' }}
                  onDraftChange={onDraftChange}
                  onOpenFiles={onOpenFiles}
                  onOpenHistory={onOpenHistory}
                  onEdit={onEdit}
                />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

