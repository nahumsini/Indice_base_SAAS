import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AgendaFocusFilter,
  OptionFilter,
  PeriodFilter,
  StatusFilter,
} from '../types';
import {
  addDays,
  dateInputValueToDate,
  endOfMonth,
  endOfWeek,
  isDateInputValue,
  startOfMonth,
  startOfWeek,
  toDateInputValue,
} from '../utils/agendaDateUtils';

export const agendaStatusFilterValues: Exclude<StatusFilter, 'all'>[] = [
  'pending',
  'pending_overdue',
  'in_progress',
  'paused',
  'completed',
  'overdue',
  'audited',
];

const agendaPeriodFilterValues: PeriodFilter[] = ['all', 'today', 'tomorrow', 'yesterday', 'week', 'month', 'custom'];
export const agendaFocusFilterValues: AgendaFocusFilter[] = ['mine', 'delegated', 'team'];
const agendaFiltersStorageKey = 'processes-tasks-agenda-filters-v1';
const agendaTodayLookbackDays = 365;
const agendaAllRange = { from: '1900-01-01', to: '2999-12-31' };

type StoredAgendaFilters = {
  search?: string;
  focus?: AgendaFocusFilter;
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

function isAgendaFocusFilter(value: string | null | undefined): value is AgendaFocusFilter {
  return agendaFocusFilterValues.includes(value as AgendaFocusFilter);
}

function isAgendaStatusFilter(value: string | null | undefined): value is StatusFilter {
  return value === 'all' || agendaStatusFilterValues.includes(value as Exclude<StatusFilter, 'all'>);
}

function normalizeLegacyStatus(value: string | null | undefined): StatusFilter | null {
  if (isAgendaStatusFilter(value)) {
    return value;
  }

  switch (value) {
    case 'pending_audit':
      return 'completed';
    case 'open':
    case 'cancelled':
      return 'all';
    default:
      return null;
  }
}

function normalizeLegacyFocus(
  period: string | null | undefined,
  focus: string | null | undefined,
): AgendaFocusFilter | null {
  if (isAgendaFocusFilter(focus)) {
    return focus;
  }

  switch (period) {
    case 'mine':
      return 'mine';
    case 'delegated':
      return 'delegated';
    case 'team':
    case 'overdue':
    case 'pendingAudit':
      return 'team';
    default:
      return null;
  }
}

function agendaDeepLinkFilters(search: string) {
  const params = new URLSearchParams(search);
  const period = params.get('period');
  const focus = params.get('focus');
  const status = params.get('status');
  const from = params.get('from');
  const to = params.get('to');
  const query = params.get('search') ?? params.get('q');

  return {
    search: query?.trim() || null,
    focus: normalizeLegacyFocus(period, focus),
    period: isAgendaPeriodFilter(period) ? period : null,
    status: normalizeLegacyStatus(status),
    unit: params.get('unit'),
    business: params.get('business'),
    project: params.get('project'),
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
    const focus = parsedFilters.focus;
    const status = parsedFilters.status;
    const legacyFocus = normalizeLegacyFocus(period, focus);

    return {
      search: parsedFilters.search || undefined,
      focus: legacyFocus ?? undefined,
      period: isAgendaPeriodFilter(period) ? period : undefined,
      status: normalizeLegacyStatus(status) ?? undefined,
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
    case 'all':
      return agendaAllRange;
    case 'today':
      return {
        from: toDateInputValue(addDays(today, -agendaTodayLookbackDays)),
        to: toDateInputValue(today),
      };
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return {
        from: toDateInputValue(tomorrow),
        to: toDateInputValue(tomorrow),
      };
    }
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return {
        from: toDateInputValue(addDays(yesterday, -agendaTodayLookbackDays)),
        to: toDateInputValue(yesterday),
      };
    }
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
    case 'custom':
      if (customTo < toDateInputValue(today)) {
        return {
          from: toDateInputValue(addDays(dateInputValueToDate(customFrom), -agendaTodayLookbackDays)),
          to: customTo,
        };
      }

      return {
        from: customFrom,
        to: customTo,
      };
  }
}

export function useAgendaFilters(search: string) {
  const initialDeepLinkFilters = useMemo(() => agendaDeepLinkFilters(search), []);
  const storedAgendaFilters = useMemo(() => getStoredAgendaFilters(), []);
  const [searchQuery, setSearchQuery] = useState(
    () => initialDeepLinkFilters.search ?? storedAgendaFilters.search ?? '',
  );
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(
    initialDeepLinkFilters.period ?? storedAgendaFilters.period ?? 'today',
  );
  const [focusFilter, setFocusFilter] = useState<AgendaFocusFilter>(
    initialDeepLinkFilters.focus ?? storedAgendaFilters.focus ?? 'mine',
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
  const [projectFilter, setProjectFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.project ?? storedAgendaFilters.project ?? 'all',
  );
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
    if (filters.focus) {
      setFocusFilter(filters.focus);
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
    if (filters.search !== null) {
      setSearchQuery(filters.search);
    }
    if (filters.unit) {
      setUnitFilter(filters.unit);
    }
    if (filters.business) {
      setBusinessFilter(filters.business);
    }
    if (filters.project) {
      setProjectFilter(filters.project);
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
        search: searchQuery,
        period: periodFilter,
        focus: focusFilter,
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
    focusFilter,
    periodFilter,
    projectFilter,
    searchQuery,
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

  const clearFilters = useCallback(() => {
    const today = toDateInputValue(new Date());
    setSearchQuery('');
    setPeriodFilter('all');
    setFocusFilter('team');
    setStatusFilter('all');
    setUnitFilter('all');
    setBusinessFilter('all');
    setProjectFilter('all');
    setCollaboratorFilter('all');
    setCustomDateFrom(today);
    setCustomDateTo(today);
  }, []);

  return {
    activeRange,
    businessFilter,
    collaboratorFilter,
    clearFilters,
    customDateFrom,
    customDateTo,
    focusFilter,
    handleCustomDateFromChange,
    handleCustomDateToChange,
    periodFilter,
    projectFilter,
    searchQuery,
    setBusinessFilter,
    setCollaboratorFilter,
    setFocusFilter,
    setPeriodFilter,
    setProjectFilter,
    setSearchQuery,
    setStatusFilter,
    setUnitFilter,
    statusFilter,
    unitFilter,
  };
}
