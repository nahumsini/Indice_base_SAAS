import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  humanResourcesApi,
  type AttendanceControlAssignment,
} from '../../../../api/humanResources';
import type { BackendBusiness } from '../../../../api/dashboard';
import { employeesPerPage } from '../constants/scheduleConstants';
import type { ControlTranslations } from '../translations';
import { getBusinessUnitId } from '../utils/scheduleFormatters';

interface UseScheduleCandidatesInput {
  copy: ControlTranslations;
  defaultAvailabilityDate: string;
  isOpen: boolean;
  organizationBusinesses: BackendBusiness[];
  todayDate: string;
  onAvailabilityDateApplied: () => void;
  onDateError: (message: string) => void;
  onLoadError: (message: string) => void;
  onLoadingStart: () => void;
  onPageChanged: () => void;
  resolveBusinessFilterForUnit: (businessId: string, unitId: string) => string;
}

export function useScheduleCandidates({
  copy,
  defaultAvailabilityDate,
  isOpen,
  organizationBusinesses,
  todayDate,
  onAvailabilityDateApplied,
  onDateError,
  onLoadError,
  onLoadingStart,
  onPageChanged,
  resolveBusinessFilterForUnit,
}: UseScheduleCandidatesInput) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unidadFilter, setUnidadFilter] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [appliedUnidadFilter, setAppliedUnidadFilter] = useState('');
  const [appliedNegocioFilter, setAppliedNegocioFilter] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState(defaultAvailabilityDate);
  const [appliedAvailabilityDate, setAppliedAvailabilityDate] = useState(defaultAvailabilityDate);
  const [candidateAssignments, setCandidateAssignments] = useState<AttendanceControlAssignment[]>([]);
  const [candidateTotalCount, setCandidateTotalCount] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(1);
  const [, setCandidateAvailableCount] = useState(0);
  const [candidateBusyCount, setCandidateBusyCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const assignmentEffectiveStartDate = appliedAvailabilityDate || defaultAvailabilityDate;
  const hasPastAssignmentStartDate = assignmentEffectiveStartDate < todayDate;
  const assignmentDateError = hasPastAssignmentStartDate
    ? copy.schedule.errors.effectiveDatePast
    : '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSearchQuery('');
    setUnidadFilter('');
    setNegocioFilter('');
    setAppliedSearchQuery('');
    setAppliedUnidadFilter('');
    setAppliedNegocioFilter('');
    setAvailabilityDate(defaultAvailabilityDate);
    setAppliedAvailabilityDate(defaultAvailabilityDate);
    setCandidateAssignments([]);
    setCandidateTotalCount(0);
    setCandidateTotalPages(1);
    setCandidateAvailableCount(0);
    setCandidateBusyCount(0);
    setCurrentPage(1);
  }, [defaultAvailabilityDate, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (assignmentDateError) {
      setIsLoadingCandidates(false);
      setCandidateAssignments([]);
      setCandidateTotalCount(0);
      setCandidateTotalPages(1);
      setCandidateAvailableCount(0);
      setCandidateBusyCount(0);
      onDateError(assignmentDateError);
      return;
    }

    let active = true;
    setIsLoadingCandidates(true);
    onLoadingStart();

    humanResourcesApi.listAttendanceScheduleCandidates({
      date: assignmentEffectiveStartDate,
      page: currentPage,
      size: employeesPerPage,
      search: appliedSearchQuery,
      unit_id: appliedUnidadFilter,
      business_id: appliedNegocioFilter,
    })
      .then((response) => {
        if (!active) {
          return;
        }

        setCandidateAssignments(response.items);
        setCandidateTotalCount(response.total_count);
        setCandidateTotalPages(response.total_pages);
        setCandidateAvailableCount(response.available_count);
        setCandidateBusyCount(response.busy_count);
        if (response.page !== currentPage) {
          setCurrentPage(response.page);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : copy.schedule.errors.loadScheduleCandidates;
        setCandidateAssignments([]);
        setCandidateTotalCount(0);
        setCandidateTotalPages(1);
        onLoadError(message);
      })
      .finally(() => {
        if (active) {
          setIsLoadingCandidates(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    appliedNegocioFilter,
    appliedSearchQuery,
    appliedUnidadFilter,
    assignmentDateError,
    assignmentEffectiveStartDate,
    copy,
    currentPage,
    isOpen,
    onDateError,
    onLoadError,
    onLoadingStart,
  ]);

  const totalPages = Math.max(1, candidateTotalPages);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * employeesPerPage;
  const paginatedAssignments = candidateAssignments;
  const paginationStart = candidateTotalCount === 0 ? 0 : pageStartIndex + 1;
  const paginationEnd = candidateTotalCount === 0 ? 0 : pageStartIndex + paginatedAssignments.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedAvailabilityDate, appliedNegocioFilter, appliedSearchQuery, appliedUnidadFilter, isOpen]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const changePage = useCallback((page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) {
      return;
    }

    setCurrentPage(page);
    onPageChanged();
  }, [onPageChanged, safeCurrentPage, totalPages]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>([1, totalPages, safeCurrentPage]);
    if (safeCurrentPage - 1 > 1) {
      pages.add(safeCurrentPage - 1);
    }
    if (safeCurrentPage + 1 < totalPages) {
      pages.add(safeCurrentPage + 1);
    }

    const sortedPages = Array.from(pages).sort((left, right) => left - right);
    const items: Array<number | 'ellipsis'> = [];

    sortedPages.forEach((page, index) => {
      const previousPage = sortedPages[index - 1];
      if (previousPage && page - previousPage > 1) {
        items.push('ellipsis');
      }
      items.push(page);
    });

    return items;
  }, [safeCurrentPage, totalPages]);

  const applyCandidateFilters = useCallback((
    nextUnitFilter = unidadFilter,
    nextBusinessFilter = negocioFilter,
    nextAvailabilityDate = availabilityDate,
  ) => {
    const resolvedBusinessFilter = resolveBusinessFilterForUnit(nextBusinessFilter, nextUnitFilter);
    const resolvedAvailabilityDate = nextAvailabilityDate || defaultAvailabilityDate;
    setNegocioFilter(resolvedBusinessFilter);
    setCurrentPage(1);
    setAppliedSearchQuery(searchQuery);
    setAppliedUnidadFilter(nextUnitFilter);
    setAppliedNegocioFilter(resolvedBusinessFilter);
    setAppliedAvailabilityDate(resolvedAvailabilityDate);
  }, [
    availabilityDate,
    defaultAvailabilityDate,
    negocioFilter,
    resolveBusinessFilterForUnit,
    searchQuery,
    unidadFilter,
  ]);

  const handleUnitFilterChange = useCallback((value: string) => {
    const nextBusinessFilter = resolveBusinessFilterForUnit(negocioFilter, value);
    setUnidadFilter(value);
    setNegocioFilter(nextBusinessFilter);
    applyCandidateFilters(value, nextBusinessFilter);
  }, [applyCandidateFilters, negocioFilter, resolveBusinessFilterForUnit]);

  const handleBusinessFilterChange = useCallback((value: string) => {
    const selectedBusiness = organizationBusinesses.find((option) => String(option.id) === value);
    const selectedBusinessUnitId = selectedBusiness ? getBusinessUnitId(selectedBusiness) : null;
    const nextUnitFilter = value && !unidadFilter && selectedBusinessUnitId
      ? String(selectedBusinessUnitId)
      : unidadFilter;

    setUnidadFilter(nextUnitFilter);
    setNegocioFilter(value);
    applyCandidateFilters(nextUnitFilter, value);
  }, [applyCandidateFilters, organizationBusinesses, unidadFilter]);

  const handleAvailabilityDateChange = useCallback((value: string) => {
    setAvailabilityDate(value);
    if (!value) {
      return;
    }
    applyCandidateFilters(unidadFilter, negocioFilter, value);
    onAvailabilityDateApplied();
  }, [applyCandidateFilters, negocioFilter, onAvailabilityDateApplied, unidadFilter]);

  return {
    applySearchFilters: applyCandidateFilters,
    assignmentDateError,
    assignmentEffectiveStartDate,
    appliedNegocioFilter,
    appliedUnidadFilter,
    availabilityDate,
    candidateAssignments,
    candidateBusyCount,
    candidateTotalCount,
    changePage,
    currentPage: safeCurrentPage,
    handleAvailabilityDateChange,
    handleBusinessFilterChange,
    handleUnitFilterChange,
    isLoadingCandidates,
    negocioFilter,
    paginatedAssignments,
    paginationEnd,
    paginationItems,
    paginationStart,
    searchQuery,
    setSearchQuery,
    todayDate,
    totalPages,
    unidadFilter,
  };
}
