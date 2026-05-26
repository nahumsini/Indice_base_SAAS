import { useEffect, useMemo, useState, type DragEvent } from 'react';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { AgendaViewMode } from '../types/prospectosTypes';
import {
  addDaysToInputDate,
  formatAgendaWeekRange,
  getOpportunityIdFromDragEvent,
  getOpportunitySchedule,
  getTodayInputValue,
  getWeekDates,
  inputDateToLocalDate,
} from '../utils/prospectosFormatters';
import { agendaScheduleStorageKey, opportunitySortCollator } from '../utils/prospectosStatus';

export function useProspectosAgenda(
  opportunities: SalesOpportunity[],
  onScheduleChange: (opportunity: SalesOpportunity, date: string, time: string) => void,
) {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [agendaViewMode, setAgendaViewMode] = useState<AgendaViewMode>('day');
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, { date: string; time: string }>>(() => {
    if (typeof window === 'undefined') {
      return {};
    }
    try {
      const rawDrafts = window.localStorage.getItem(agendaScheduleStorageKey);
      return rawDrafts ? JSON.parse(rawDrafts) as Record<string, { date: string; time: string }> : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(agendaScheduleStorageKey, JSON.stringify(scheduleDrafts));
    }
  }, [scheduleDrafts]);

  const opportunitySchedules = useMemo(() => {
    const schedules = new Map<string, { date: string; time: string }>();
    opportunities.forEach((opportunity) => {
      schedules.set(opportunity.id, scheduleDrafts[opportunity.id] ?? getOpportunitySchedule(opportunity));
    });
    return schedules;
  }, [opportunities, scheduleDrafts]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const opportunitiesForDate = (date: string) => opportunities
    .filter((opportunity) => opportunitySchedules.get(opportunity.id)?.date === date)
    .sort((left, right) => {
      const leftSchedule = opportunitySchedules.get(left.id);
      const rightSchedule = opportunitySchedules.get(right.id);
      return opportunitySortCollator.compare(leftSchedule?.time || '99:99', rightSchedule?.time || '99:99');
    });

  const dayOpportunities = opportunitiesForDate(selectedDate);
  const unscheduledOpportunities = opportunities.filter((opportunity) => !opportunitySchedules.get(opportunity.id)?.date);
  const scheduledCount = opportunities.length - unscheduledOpportunities.length;
  const weekOpportunities = opportunities.filter((opportunity) => weekDates.includes(opportunitySchedules.get(opportunity.id)?.date ?? ''));
  const weekRangeLabel = formatAgendaWeekRange(weekDates);

  const moveAgendaWindow = (direction: -1 | 1) => {
    setSelectedDate((currentDate) => {
      const offset = agendaViewMode === 'day' ? direction : direction * 7;
      return addDaysToInputDate(inputDateToLocalDate(currentDate), offset);
    });
  };

  const goToToday = () => setSelectedDate(getTodayInputValue());

  const handleDraftChange = (opportunity: SalesOpportunity, field: 'date' | 'time', value: string) => {
    const currentSchedule = opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' };
    const nextSchedule = { ...currentSchedule, [field]: value };
    setScheduleDrafts((current) => ({ ...current, [opportunity.id]: nextSchedule }));
    onScheduleChange(opportunity, nextSchedule.date, nextSchedule.time);
  };

  const updateOpportunitySchedule = (opportunity: SalesOpportunity, date: string, time: string) => {
    const nextSchedule = { date, time };
    setScheduleDrafts((current) => ({ ...current, [opportunity.id]: nextSchedule }));
    onScheduleChange(opportunity, nextSchedule.date, nextSchedule.time);
  };

  const handleScheduleDrop = (event: DragEvent<HTMLElement>, date: string, time: string) => {
    event.preventDefault();
    const opportunityId = getOpportunityIdFromDragEvent(event);
    const opportunity = opportunities.find((item) => item.id === opportunityId);

    if (!opportunity) {
      return;
    }

    updateOpportunitySchedule(opportunity, date, time);
  };

  const handleDateDrop = (event: DragEvent<HTMLElement>, date: string) => {
    event.preventDefault();
    const opportunityId = getOpportunityIdFromDragEvent(event);
    const opportunity = opportunities.find((item) => item.id === opportunityId);

    if (!opportunity) {
      return;
    }

    const currentSchedule = opportunitySchedules.get(opportunity.id) ?? { date: '', time: '' };
    updateOpportunitySchedule(opportunity, date, currentSchedule.time);
  };

  return {
    selectedDate,
    setSelectedDate,
    agendaViewMode,
    setAgendaViewMode,
    opportunitySchedules,
    dayOpportunities,
    unscheduledOpportunities,
    scheduledCount,
    weekDates,
    weekOpportunities,
    weekRangeLabel,
    moveAgendaWindow,
    goToToday,
    opportunitiesForDate,
    handleDraftChange,
    handleScheduleDrop,
    handleDateDrop,
  };
}

