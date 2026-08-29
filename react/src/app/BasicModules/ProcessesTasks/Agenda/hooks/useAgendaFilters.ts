import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspaceNavigationMemory } from '../../../../hooks/useWorkspaceNavigationMemory';
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
const agendaTodayLookbackDays = 365;
const agendaAllRange = { from: '1900-01-01', to: '2999-12-31' };

type AgendaWorkspaceState = {
  searchQuery: string;
  focusFilter: AgendaFocusFilter;
  periodFilter: PeriodFilter;
  statusFilter: StatusFilter;
  unitFilter: OptionFilter;
  businessFilter: OptionFilter;
  projectFilter: OptionFilter;
  collaboratorFilter: OptionFilter;
  customDateFrom: string;
  customDateTo: string;
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
  const initialToday = useMemo(() => toDateInputValue(new Date()), []);
  const workspaceDefaults = useMemo<AgendaWorkspaceState>(() => ({
    searchQuery: '',
    focusFilter: 'mine',
    periodFilter: 'today',
    statusFilter: 'all',
    unitFilter: 'all',
    businessFilter: 'all',
    projectFilter: 'all',
    collaboratorFilter: 'all',
    customDateFrom: initialToday,
    customDateTo: initialToday,
  }), [initialToday]);
  const [searchQuery, setSearchQuery] = useState(
    () => initialDeepLinkFilters.search ?? workspaceDefaults.searchQuery,
  );
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(
    initialDeepLinkFilters.period ?? workspaceDefaults.periodFilter,
  );
  const [focusFilter, setFocusFilter] = useState<AgendaFocusFilter>(
    initialDeepLinkFilters.focus ?? workspaceDefaults.focusFilter,
  );
  const [customDateFrom, setCustomDateFrom] = useState(
    () => initialDeepLinkFilters.from ?? workspaceDefaults.customDateFrom,
  );
  const [customDateTo, setCustomDateTo] = useState(
    () => initialDeepLinkFilters.to ?? workspaceDefaults.customDateTo,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialDeepLinkFilters.status ?? workspaceDefaults.statusFilter,
  );
  const [unitFilter, setUnitFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.unit ?? workspaceDefaults.unitFilter,
  );
  const [businessFilter, setBusinessFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.business ?? workspaceDefaults.businessFilter,
  );
  const [projectFilter, setProjectFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.project ?? workspaceDefaults.projectFilter,
  );
  const [collaboratorFilter, setCollaboratorFilter] = useState<OptionFilter>(
    initialDeepLinkFilters.collaborator ?? workspaceDefaults.collaboratorFilter,
  );

  const workspaceState = useMemo<AgendaWorkspaceState>(() => ({
    searchQuery,
    focusFilter,
    periodFilter,
    statusFilter,
    unitFilter,
    businessFilter,
    projectFilter,
    collaboratorFilter,
    customDateFrom,
    customDateTo,
  }), [
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

  useWorkspaceNavigationMemory({
    moduleKey: 'processes-tasks',
    tabKey: 'calendar',
    state: workspaceState,
    defaults: workspaceDefaults,
    onRestore: (restoredState) => {
      const deepLink = agendaDeepLinkFilters(window.location.search);
      setSearchQuery(deepLink.search ?? (typeof restoredState.searchQuery === 'string' ? restoredState.searchQuery : ''));
      setFocusFilter(deepLink.focus ?? (isAgendaFocusFilter(restoredState.focusFilter) ? restoredState.focusFilter : 'mine'));
      setPeriodFilter(deepLink.period ?? (isAgendaPeriodFilter(restoredState.periodFilter) ? restoredState.periodFilter : 'today'));
      setStatusFilter(deepLink.status ?? (isAgendaStatusFilter(restoredState.statusFilter) ? restoredState.statusFilter : 'all'));
      setUnitFilter(deepLink.unit ?? (typeof restoredState.unitFilter === 'string' ? restoredState.unitFilter : 'all'));
      setBusinessFilter(deepLink.business ?? (typeof restoredState.businessFilter === 'string' ? restoredState.businessFilter : 'all'));
      setProjectFilter(deepLink.project ?? (typeof restoredState.projectFilter === 'string' ? restoredState.projectFilter : 'all'));
      setCollaboratorFilter(deepLink.collaborator ?? (typeof restoredState.collaboratorFilter === 'string' ? restoredState.collaboratorFilter : 'all'));
      setCustomDateFrom(deepLink.from ?? (isDateInputValue(restoredState.customDateFrom) ? restoredState.customDateFrom : initialToday));
      setCustomDateTo(deepLink.to ?? (isDateInputValue(restoredState.customDateTo) ? restoredState.customDateTo : initialToday));
    },
  });

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
    setPeriodFilter('today');
    setFocusFilter('mine');
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
