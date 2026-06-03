import { useEffect, useMemo, useState } from 'react';
import type { AttendanceControlOverviewResponse } from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import {
  allFilterValue,
  assignmentBusinessFilterKey,
  assignmentUnitFilterKey,
  attendanceListBatchSize,
  attendanceStatusFilterValues,
} from '../utils/control.utils';

interface UseControlAttendanceFiltersParams {
  controlDate: string;
  copy: ControlTranslations;
  overview: AttendanceControlOverviewResponse | null;
}

export function useControlAttendanceFilters({
  controlDate,
  copy,
  overview,
}: UseControlAttendanceFiltersParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState(allFilterValue);
  const [businessFilter, setBusinessFilter] = useState(allFilterValue);
  const [statusFilter, setStatusFilter] = useState(allFilterValue);
  const [attendanceListPage, setAttendanceListPage] = useState(1);

  const unitFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    overview?.assignments.forEach((assignment) => {
      options.set(assignmentUnitFilterKey(assignment), assignment.unit_name || copy.labels.noUnit);
    });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [copy.labels.noUnit, overview?.assignments]);

  const businessFilterOptions = useMemo(() => {
    const options = new Map<string, string>();
    overview?.assignments
      .filter((assignment) => unitFilter === allFilterValue || assignmentUnitFilterKey(assignment) === unitFilter)
      .forEach((assignment) => {
        options.set(assignmentBusinessFilterKey(assignment), assignment.business_name || copy.labels.noBusiness);
      });

    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [copy.labels.noBusiness, overview?.assignments, unitFilter]);

  useEffect(() => {
    if (
      unitFilter !== allFilterValue &&
      !unitFilterOptions.some((option) => option.value === unitFilter)
    ) {
      setUnitFilter(allFilterValue);
      setBusinessFilter(allFilterValue);
    }
  }, [unitFilter, unitFilterOptions]);

  useEffect(() => {
    if (
      businessFilter !== allFilterValue &&
      !businessFilterOptions.some((option) => option.value === businessFilter)
    ) {
      setBusinessFilter(allFilterValue);
    }
  }, [businessFilter, businessFilterOptions]);

  const filteredAssignments = useMemo(() => {
    if (!overview) {
      return [];
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();
    return overview.assignments.filter((assignment) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          assignment.user_name,
          assignment.user_code,
          assignment.position_title,
          assignment.department,
          assignment.unit_name,
          assignment.business_name,
          assignment.schedule_template_name,
          assignment.active_work_site?.location_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesUnit = unitFilter === allFilterValue || assignmentUnitFilterKey(assignment) === unitFilter;
      const matchesBusiness = businessFilter === allFilterValue || assignmentBusinessFilterKey(assignment) === businessFilter;

      return matchesSearch && matchesUnit && matchesBusiness;
    });
  }, [businessFilter, overview, searchQuery, unitFilter]);

  const statusFilterOptions = useMemo(() => {
    const statusCounts = filteredAssignments.reduce(
      (counts, assignment) => {
        const status = assignment.corrected_status ?? assignment.today_status;
        counts.set(status, (counts.get(status) ?? 0) + 1);
        return counts;
      },
      new Map<string, number>(),
    );

    return [
      {
        value: allFilterValue,
        label: copy.filters.all,
        count: filteredAssignments.length,
      },
      ...attendanceStatusFilterValues.map((status) => ({
        value: status,
        label: copy.statuses[status],
        count: statusCounts.get(status) ?? 0,
      })),
    ];
  }, [copy.filters.all, copy.statuses, filteredAssignments]);

  const statusFilteredAssignments = useMemo(
    () => (
      statusFilter === allFilterValue
        ? filteredAssignments
        : filteredAssignments.filter((assignment) => (assignment.corrected_status ?? assignment.today_status) === statusFilter)
    ),
    [filteredAssignments, statusFilter],
  );

  useEffect(() => {
    if (
      statusFilter !== allFilterValue &&
      !statusFilterOptions.some((option) => option.value === statusFilter)
    ) {
      setStatusFilter(allFilterValue);
    }
  }, [statusFilter, statusFilterOptions]);

  useEffect(() => {
    setAttendanceListPage(1);
  }, [businessFilter, controlDate, overview?.date, searchQuery, statusFilter, unitFilter]);

  const attendanceListPageCount = Math.max(1, Math.ceil(statusFilteredAssignments.length / attendanceListBatchSize));
  const currentAttendanceListPage = Math.min(attendanceListPage, attendanceListPageCount);
  const attendanceListStartIndex = (currentAttendanceListPage - 1) * attendanceListBatchSize;
  const visibleAttendanceAssignments = useMemo(
    () => statusFilteredAssignments.slice(attendanceListStartIndex, attendanceListStartIndex + attendanceListBatchSize),
    [attendanceListStartIndex, statusFilteredAssignments],
  );
  const attendanceListShowingStart = statusFilteredAssignments.length === 0 ? 0 : attendanceListStartIndex + 1;
  const attendanceListShowingEnd = Math.min(attendanceListStartIndex + visibleAttendanceAssignments.length, statusFilteredAssignments.length);

  useEffect(() => {
    if (attendanceListPage > attendanceListPageCount) {
      setAttendanceListPage(attendanceListPageCount);
    }
  }, [attendanceListPage, attendanceListPageCount]);

  return {
    searchQuery,
    setSearchQuery,
    unitFilter,
    setUnitFilter,
    businessFilter,
    setBusinessFilter,
    statusFilter,
    setStatusFilter,
    attendanceListPage,
    setAttendanceListPage,
    unitFilterOptions,
    businessFilterOptions,
    statusFilterOptions,
    statusFilteredAssignments,
    visibleAttendanceAssignments,
    attendanceListPageCount,
    currentAttendanceListPage,
    attendanceListShowingStart,
    attendanceListShowingEnd,
  };
}
