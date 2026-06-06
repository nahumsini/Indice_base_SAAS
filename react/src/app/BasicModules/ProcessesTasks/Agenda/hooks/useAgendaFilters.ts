import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AuditPendingStatusFilter,
  DisplayTaskStatus,
  OpenStatusFilter,
  OptionFilter,
  PeriodFilter,
  StatusFilter,
} from '../types';
import {
  addDays,
  endOfMonth,
  endOfWeek,
  isDateInputValue,
  startOfMonth,
  startOfWeek,
  toDateInputValue,
} from '../utils/agendaDateUtils';

export const agendaStatusFilterValues: Array<DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter> = [
  'open',
  'pending',
  'in_progress',
  'paused',
  'completed',
  'pending_audit',
  'audited',
  'overdue',
  'cancelled',
];

const agendaPeriodFilterValues: PeriodFilter[] = ['mine', 'delegated', 'team', 'week', 'month', 'overdue', 'custom'];
const agendaFiltersStorageKey = 'processes-tasks-agenda-filters-v1';
const allPastStartDate = '1970-01-01';

type StoredAgendaFilters = {
  period?: PeriodFilter;
  status?: StatusFilter;
  unit?: OptionFilter;
  business?: OptionFilter;
  project?: OptionFilter;
  collaborator?: OptionFilter;
  customDateFrom?: string;
  customDateTo?: string;
};

function isAgendaPeriodFilter(value: string | null | undefined): value is PeriodFilter {
  return agendaPeriodFilterValues.includes(value as PeriodFilter);
}

function isAgendaStatusFilter(value: string | null | undefined): value is StatusFilter {
  return (
    value === 'all' ||
    agendaStatusFilterValues.includes(value as DisplayTaskStatus | OpenStatusFilter | AuditPendingStatusFilter)
  );
}

function agendaDeepLinkFilters(search: string) {
  const params = new URLSearchParams(search);
  const period = params.get('period');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');

  return {
    period: isAgendaPeriodFilter(period) ? period : null,
    status: isAgendaStatusFilter(status) ? status : null,
    unit: params.get('unit'),
    business: params.get('business'),
    collaborator: params.get('collaborator'),
    from: isDateInputValue(from) ? from : null,
    to: isDateInputValue(to) ? to : null,
  };
}

function getStoredAgendaFilters(): StoredAgendaFilters {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawFilters = window.sessionStorage.getItem(agendaFiltersStorageKey);
    if (!rawFilters) {
      return {};
    }

    const parsedFilters = JSON.parse(rawFilters) as Partial<Record<keyof StoredAgendaFilters, string>>;
    const period = parsedFilters.period;
    const status = parsedFilters.status;

    return {
      period: isAgendaPeriodFilter(period) ? period : undefined,
      status: isAgendaStatusFilter(status) ? status : undefined,
      unit: parsedFilters.unit || undefined,
      business: parsedFilters.business || undefined,
      project: parsedFilters.project || undefined,
      collaborator: parsedFilters.collaborator || undefined,
      customDateFrom: isDateInputValue(parsedFilters.customDateFrom ?? null) ? parsedFilters.customDateFrom : undefined,
      customDateTo: isDateInputValue(parsedFilters.customDateTo ?? null) ? parsedFilters.customDateTo : undefined,
    };
  } catch {
    return {};
  }
}

function periodRange(period: PeriodFilter, customFrom: string, customTo: string) {
  const today = new Date();

  switch (period) {
    case 'delegated':
      return {
        from: allPastStartDate,
        to: '2099-12-31',
      };
    case 'mine':
    case 'team':
      return {
        from: allPastStartDate,
        to: toDateInputValue(today),
      };
    case 'week':
      return {
        from: toDateInputValue(startOfWeek(today)),
        to: toDateInputValue(endOfWeek(today)),
      };
    case 'month':
      return {
        from: toDateInputValue(startOfMonth(today)),
        to: toDateInputValue(endOfMonth(today)),
      };
    case 'overdue':
      return {
        from: allPastStartDate,
        to: toDateInputValue(addDays(today, -1)),
      };
    case 'custom':
      return {
        from: customFrom,
        to: customTo,
      };
  }
}

export function useAgendaFilters(search: string) {
  const initialDeepLinkFilters = useMemo(() => agendaDeepLinkFilters(search), []);
  const storedAgendaFilters = useMemo(() => getStoredAgendaFilters(), []);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(
    initialDeepLinkFilters.period ?? storedAgendaFilters.period ?? 'mine',
  );
  const [customDateFrom, setCustomDateFrom] = useState(
    () => initialDeepLinkFilters.from ?? storedAgendaFilters.customDateFrom ?? toDateInputValue(new Date()),
  );
  const [customDateTo, setCustomDateTo] = useState(
    () => initialDeepLinkFilters.to ?? storedAgendaFilters.customDateTo ?? toDateInputValue(new Date()),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialDeepLinkFilters.status ?? storedAgendaFilters.status ?? 'all',
  );
  const [unitFilter, setUnitFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.unit ?? storedAgendaFilters.unit ?? 'all',
  );
  const [businessFilter, setBusinessFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.business ?? storedAgendaFilters.business ?? 'all',
  );
  const [projectFilter, setProjectFilter] = useState<OptionFilter>(storedAgendaFilters.project ?? 'all');
  const [collaboratorFilter, setCollaboratorFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.collaborator ?? storedAgendaFilters.collaborator ?? 'all',
  );

  const activeRange = useMemo(
    () => periodRange(periodFilter, customDateFrom, customDateTo),
    [customDateFrom, customDateTo, periodFilter],
  );

  useEffect(() => {
    const filters = agendaDeepLinkFilters(search);

    if (filters.period) {
      setPeriodFilter(filters.period);
    }
    if (filters.from) {
      setCustomDateFrom(filters.from);
    }
    if (filters.to) {
      setCustomDateTo(filters.to);
    }
    if (filters.status) {
      setStatusFilter(filters.status);
    }
    if (filters.unit) {
      setUnitFilter(filters.unit);
    }
    if (filters.business) {
      setBusinessFilter(filters.business);
    }
    if (filters.collaborator) {
      setCollaboratorFilter(filters.collaborator);
    }
  }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(
      agendaFiltersStorageKey,
      JSON.stringify({
        period: periodFilter,
        status: statusFilter,
        unit: unitFilter,
        business: businessFilter,
        project: projectFilter,
        collaborator: collaboratorFilter,
        customDateFrom,
        customDateTo,
      } satisfies StoredAgendaFilters),
    );
  }, [
    businessFilter,
    collaboratorFilter,
    customDateFrom,
    customDateTo,
    periodFilter,
    projectFilter,
    statusFilter,
    unitFilter,
  ]);

  const handleCustomDateFromChange = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }

      setCustomDateFrom(value);
      if (value > customDateTo) {
        setCustomDateTo(value);
      }
    },
    [customDateTo],
  );

  const handleCustomDateToChange = useCallback(
    (value: string) => {
      if (!value) {
        return;
      }

      setCustomDateTo(value);
      if (value < customDateFrom) {
        setCustomDateFrom(value);
      }
    },
    [customDateFrom],
  );

  return {
    activeRange,
    businessFilter,
    collaboratorFilter,
    customDateFrom,
    customDateTo,
    handleCustomDateFromChange,
    handleCustomDateToChange,
    periodFilter,
    projectFilter,
    setBusinessFilter,
    setCollaboratorFilter,
    setPeriodFilter,
    setProjectFilter,
    setStatusFilter,
    setUnitFilter,
    statusFilter,
    unitFilter,
  };
}
