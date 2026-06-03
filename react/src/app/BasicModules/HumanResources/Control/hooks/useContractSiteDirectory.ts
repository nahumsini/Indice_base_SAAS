import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AttendanceControlAssignment,
  AttendanceControlLocation,
} from '../../../../api/humanResources';
import { contractSitesPerPage } from '../constants/contractSiteConstants';
import type { ContractSiteFilter, DraftLocation } from '../types/contractSiteTypes';
import {
  assignmentBelongsToContractSite,
  attendanceTouchedContractSite,
  toDraftLocation,
} from '../utils/contractSiteUtils';

interface UseContractSiteDirectoryInput {
  assignments: AttendanceControlAssignment[];
  draftLocations: DraftLocation[];
  locations: AttendanceControlLocation[];
}

export function useContractSiteDirectory({
  assignments,
  draftLocations,
  locations,
}: UseContractSiteDirectoryInput) {
  const [contractSiteFilter, setContractSiteFilter] = useState<ContractSiteFilter>('all');
  const [contractSitePage, setContractSitePage] = useState(1);
  const [selectedContractSiteId, setSelectedContractSiteId] = useState<string | null>(null);

  const assignedEmployeeDetailsByContractSite = useMemo(() => {
    const details = new Map<number, AttendanceControlAssignment[]>();
    assignments.forEach((assignment) => {
      const locationId = assignment.active_work_site?.location_id;
      if (!locationId) {
        return;
      }
      details.set(locationId, [...(details.get(locationId) ?? []), assignment]);
    });
    return details;
  }, [assignments]);

  const locationDrafts = useMemo(() => (
    locations.map((location) => {
      const draft = toDraftLocation(location);
      const assignedEmployees = assignedEmployeeDetailsByContractSite.get(location.id) ?? [];
      return {
        ...draft,
        assignedEmployeeCount: assignedEmployees.length,
        assignedEmployeeNames: assignedEmployees.map((assignment) => assignment.user_name).join(', ') || undefined,
      };
    })
  ), [assignedEmployeeDetailsByContractSite, locations]);

  const activeLocationsCount = useMemo(
    () => draftLocations.filter((location) => location.status === 'active').length,
    [draftLocations],
  );

  const assignedLocationsCount = useMemo(
    () => draftLocations.filter((location) => location.assignedEmployeeCount > 0).length,
    [draftLocations],
  );

  const filteredDraftLocations = useMemo(() => (
    draftLocations.filter((location) => {
      switch (contractSiteFilter) {
        case 'assigned':
          return location.assignedEmployeeCount > 0;
        case 'unassigned':
          return location.assignedEmployeeCount === 0;
        case 'active':
          return location.status === 'active';
        case 'inactive':
          return location.status === 'inactive';
        default:
          return true;
      }
    })
  ), [contractSiteFilter, draftLocations]);

  const contractSiteTotalPages = Math.max(1, Math.ceil(filteredDraftLocations.length / contractSitesPerPage));
  const safeContractSitePage = Math.min(contractSitePage, contractSiteTotalPages);

  const paginatedDraftLocations = useMemo(() => {
    const startIndex = (safeContractSitePage - 1) * contractSitesPerPage;
    return filteredDraftLocations.slice(startIndex, startIndex + contractSitesPerPage);
  }, [filteredDraftLocations, safeContractSitePage]);

  const contractSitePaginationStart = filteredDraftLocations.length === 0
    ? 0
    : (safeContractSitePage - 1) * contractSitesPerPage + 1;
  const contractSitePaginationEnd = filteredDraftLocations.length === 0
    ? 0
    : contractSitePaginationStart + paginatedDraftLocations.length - 1;

  useEffect(() => {
    setContractSitePage(1);
  }, [contractSiteFilter]);

  useEffect(() => {
    if (contractSitePage > contractSiteTotalPages) {
      setContractSitePage(contractSiteTotalPages);
    }
  }, [contractSitePage, contractSiteTotalPages]);

  const selectedContractSite = useMemo(
    () => draftLocations.find((location) => location.id === selectedContractSiteId) ?? null,
    [draftLocations, selectedContractSiteId],
  );

  const selectedContractSitePersistedId = selectedContractSite?.persistedId ?? null;

  const selectedContractSiteActivity = useMemo(() => {
    if (!selectedContractSitePersistedId) {
      return [];
    }

    return assignments
      .filter((assignment) =>
        assignmentBelongsToContractSite(assignment, selectedContractSitePersistedId)
        || attendanceTouchedContractSite(assignment, selectedContractSitePersistedId),
      )
      .map((assignment) => ({
        assignment,
        assignedToSite: assignmentBelongsToContractSite(assignment, selectedContractSitePersistedId),
        checkedInAtSite: assignment.first_location?.id === selectedContractSitePersistedId,
        checkedOutAtSite: assignment.last_location?.id === selectedContractSitePersistedId,
      }))
      .sort((left, right) => left.assignment.user_name.localeCompare(right.assignment.user_name));
  }, [assignments, selectedContractSitePersistedId]);

  const goToNextContractSitePage = useCallback(() => {
    setContractSitePage((page) => Math.min(contractSiteTotalPages, page + 1));
  }, [contractSiteTotalPages]);

  const goToPreviousContractSitePage = useCallback(() => {
    setContractSitePage((page) => Math.max(1, page - 1));
  }, []);

  const resetContractSiteDirectory = useCallback(() => {
    setContractSiteFilter('all');
    setContractSitePage(1);
    setSelectedContractSiteId(null);
  }, []);

  return {
    activeLocationsCount,
    assignedLocationsCount,
    contractSiteFilter,
    contractSitePaginationEnd,
    contractSitePaginationStart,
    contractSiteTotalPages,
    filteredDraftLocations,
    goToNextContractSitePage,
    goToPreviousContractSitePage,
    locationDrafts,
    paginatedDraftLocations,
    resetContractSiteDirectory,
    safeContractSitePage,
    selectedContractSite,
    selectedContractSiteActivity,
    setContractSiteFilter,
    setSelectedContractSiteId,
  };
}
