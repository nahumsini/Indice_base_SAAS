import { ArrowUp } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations/prospectosTranslations';
import { useProspectosAgenda } from '../hooks/useProspectosAgenda';
import type { AgendaViewMode } from '../types/prospectosTypes';
import { ProspectosAgendaCalendar } from './ProspectosAgendaCalendar';
import { ProspectosAgendaSidebar } from './ProspectosAgendaSidebar';

export function ProspectosAgenda({
  copy,
  opportunities,
  onOpenFiles,
  onOpenHistory,
  onEdit,
  onScheduleChange,
}: {
  copy: ProspectosCopy;
  opportunities: SalesOpportunity[];
  onOpenFiles: (opportunity: SalesOpportunity) => void;
  onOpenHistory: (opportunity: SalesOpportunity) => void;
  onEdit: (opportunity: SalesOpportunity) => void;
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void;
}) {
  const agenda = useProspectosAgenda(opportunities, onScheduleChange);

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-950">
              {copy.agenda.titleByView[agenda.agendaViewMode]}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {copy.agenda.descriptionByView[agenda.agendaViewMode]}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {(['day', 'week', 'list'] as AgendaViewMode[]).map((viewOption) => (
                <button
                  key={viewOption}
                  type="button"
                  className={cn(
                    'h-8 rounded-md px-3 text-sm font-bold transition-colors',
                    agenda.agendaViewMode === viewOption
                      ? 'bg-[#FF6B5E] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                  )}
                  onClick={() => agenda.setAgendaViewMode(viewOption)}
                >
                  {copy.agenda.views[viewOption]}
                </button>
              ))}
            </div>
            <Input
              type="date"
              value={agenda.selectedDate}
              onChange={(event) => agenda.setSelectedDate(event.target.value)}
              className="h-10 w-[168px] rounded-lg border-slate-200 bg-white font-bold shadow-none"
            />
            <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 font-bold" onClick={() => agenda.moveAgendaWindow(-1)}>
              <ArrowUp className="h-4 w-4 -rotate-90" />
            </Button>
            <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-4 font-bold" onClick={agenda.goToToday}>
              {copy.agenda.today}
            </Button>
            <Button variant="outline" className="h-10 rounded-lg border-slate-200 bg-white px-3 font-bold" onClick={() => agenda.moveAgendaWindow(1)}>
              <ArrowUp className="h-4 w-4 rotate-90" />
            </Button>
            <Badge variant="outline" className="rounded-full border-[#2563EB]/20 bg-[#2563EB]/10 px-4 py-2 text-sm font-bold text-[#2563EB]">
              {agenda.agendaViewMode === 'day' ? copy.agenda.dayCount(agenda.dayOpportunities.length) : copy.agenda.weekCount(agenda.weekOpportunities.length)}
            </Badge>
            <Badge variant="outline" className="rounded-full border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-2 text-sm font-bold text-[#177d66]">
              {copy.agenda.scheduled(agenda.scheduledCount)}
            </Badge>
            {agenda.agendaViewMode !== 'day' ? (
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                {agenda.weekRangeLabel}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {agenda.agendaViewMode === 'day' ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ProspectosAgendaCalendar
            copy={copy}
            mode={agenda.agendaViewMode}
            selectedDate={agenda.selectedDate}
            dayOpportunities={agenda.dayOpportunities}
            weekDates={agenda.weekDates}
            weekOpportunities={agenda.weekOpportunities}
            opportunitySchedules={agenda.opportunitySchedules}
            opportunitiesForDate={agenda.opportunitiesForDate}
            onDraftChange={agenda.handleDraftChange}
            onScheduleDrop={agenda.handleScheduleDrop}
            onDateDrop={agenda.handleDateDrop}
            onOpenFiles={onOpenFiles}
            onOpenHistory={onOpenHistory}
            onEdit={onEdit}
          />
          <ProspectosAgendaSidebar
            copy={copy}
            unscheduledOpportunities={agenda.unscheduledOpportunities}
            opportunitySchedules={agenda.opportunitySchedules}
            onDraftChange={agenda.handleDraftChange}
            onScheduleDrop={agenda.handleScheduleDrop}
          />
        </div>
      ) : null}

      {agenda.agendaViewMode !== 'day' ? (
        <ProspectosAgendaCalendar
          copy={copy}
          mode={agenda.agendaViewMode}
          selectedDate={agenda.selectedDate}
          dayOpportunities={agenda.dayOpportunities}
          weekDates={agenda.weekDates}
          weekOpportunities={agenda.weekOpportunities}
          opportunitySchedules={agenda.opportunitySchedules}
          opportunitiesForDate={agenda.opportunitiesForDate}
          onDraftChange={agenda.handleDraftChange}
          onScheduleDrop={agenda.handleScheduleDrop}
          onDateDrop={agenda.handleDateDrop}
          onOpenFiles={onOpenFiles}
          onOpenHistory={onOpenHistory}
          onEdit={onEdit}
        />
      ) : null}
    </section>
  );
}
