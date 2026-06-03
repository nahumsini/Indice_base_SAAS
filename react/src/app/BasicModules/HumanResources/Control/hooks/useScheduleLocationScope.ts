import { useMemo } from 'react';
import type { BackendBusiness, BackendUnit } from '../../../../api/dashboard';
import type {
  AttendanceControlAssignment,
  AttendanceControlLocation,
} from '../../../../api/humanResources';
import type { ControlTranslations } from '../translations';
import {
  formatPreviewList,
  getBusinessUnitId,
  toPositiveNumber,
  uniquePositiveNumbers,
} from '../utils/scheduleFormatters';

interface UseScheduleLocationScopeInput {
  activeLocationOptions: AttendanceControlLocation[];
  appliedNegocioFilter: string;
  appliedUnidadFilter: string;
  copy: ControlTranslations;
  organizationBusinesses: BackendBusiness[];
  organizationUnits: BackendUnit[];
  selectedAssignments: AttendanceControlAssignment[];
  selectedEmployeeCount: number;
}

export function useScheduleLocationScope({
  activeLocationOptions,
  appliedNegocioFilter,
  appliedUnidadFilter,
  copy,
  organizationBusinesses,
  organizationUnits,
  selectedAssignments,
  selectedEmployeeCount,
}: UseScheduleLocationScopeInput) {
  const selectedBusinessIds = useMemo(
    () => uniquePositiveNumbers(selectedAssignments.map((assignment) => assignment.business_id)),
    [selectedAssignments],
  );
  const selectedUnitIds = useMemo(
    () => uniquePositiveNumbers(selectedAssignments.map((assignment) => assignment.unit_id)),
    [selectedAssignments],
  );
  const selectedBusinessKey = selectedBusinessIds.join(',');
  const selectedUnitKey = selectedUnitIds.join(',');
  const appliedBusinessId = toPositiveNumber(appliedNegocioFilter);
  const appliedUnitId = toPositiveNumber(appliedUnidadFilter);
  const hasSelectedEmployees = selectedEmployeeCount > 0;
  const scopedBusinessIds = hasSelectedEmployees
    ? selectedBusinessIds.length === 1 || selectedUnitIds.length === 0
      ? selectedBusinessIds
      : []
    : appliedBusinessId
      ? [appliedBusinessId]
      : [];
  const scopedUnitIds = hasSelectedEmployees
    ? scopedBusinessIds.length === 0
      ? selectedUnitIds
      : []
    : scopedBusinessIds.length === 0 && appliedUnitId
      ? [appliedUnitId]
      : [];
  const scopedBusinessKey = scopedBusinessIds.join(',');
  const scopedUnitKey = scopedUnitIds.join(',');
  const hasLocationScope = scopedBusinessIds.length > 0 || scopedUnitIds.length > 0;

  const scopedExactLocationOptions = useMemo(() => {
    if (scopedBusinessIds.length > 0) {
      const scopedBusinessIdSet = new Set(scopedBusinessIds);
      return activeLocationOptions.filter((location) => (
        typeof location.business_id === 'number' && scopedBusinessIdSet.has(location.business_id)
      ));
    }

    if (scopedUnitIds.length > 0) {
      const scopedUnitIdSet = new Set(scopedUnitIds);
      return activeLocationOptions.filter((location) => (
        typeof location.unit_id === 'number' && scopedUnitIdSet.has(location.unit_id)
      ));
    }

    return activeLocationOptions;
  }, [activeLocationOptions, scopedBusinessKey, scopedUnitKey]);

  const exactLocationOptions = hasLocationScope && scopedExactLocationOptions.length === 0
    ? activeLocationOptions
    : scopedExactLocationOptions;

  const businessNameById = useMemo(() => {
    const names = new Map<number, string>();
    organizationBusinesses.forEach((business) => {
      names.set(business.id, business.name || copy.labels.business);
    });
    selectedAssignments.forEach((assignment) => {
      if (typeof assignment.business_id === 'number' && assignment.business_id > 0 && assignment.business_name) {
        names.set(assignment.business_id, assignment.business_name);
      }
    });
    return names;
  }, [copy, organizationBusinesses, selectedAssignments]);

  const unitNameById = useMemo(() => {
    const names = new Map<number, string>();
    organizationUnits.forEach((unit) => {
      names.set(unit.id, unit.name || copy.labels.unit);
    });
    selectedAssignments.forEach((assignment) => {
      if (typeof assignment.unit_id === 'number' && assignment.unit_id > 0 && assignment.unit_name) {
        names.set(assignment.unit_id, assignment.unit_name);
      }
    });
    return names;
  }, [copy, organizationUnits, selectedAssignments]);

  const selectedEmployeeBusinessWarning = useMemo(() => {
    if (selectedEmployeeCount === 0 || selectedAssignments.length === 0) {
      return '';
    }

    const missingBusinessCount = selectedAssignments.filter((assignment) => !assignment.business_id).length;
    if (missingBusinessCount > 0) {
      return copy.schedule.location.summaries.missingBusinessWarning(missingBusinessCount);
    }

    const businessIdsWithoutLocations = selectedBusinessIds.filter((businessId) =>
      !activeLocationOptions.some((location) => location.business_id === businessId),
    );
    if (businessIdsWithoutLocations.length > 0) {
      const businessNames = businessIdsWithoutLocations.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.noActiveBusinessLocation(
        formatPreviewList(businessNames, copy.schedule.location.summaries.selectedBusiness, copy.schedule),
      );
    }

    return '';
  }, [activeLocationOptions, businessNameById, copy, selectedAssignments, selectedBusinessIds, selectedEmployeeCount]);

  const locationScopeSummary = useMemo(() => {
    if (hasSelectedEmployees && selectedAssignments.length === 0) {
      return copy.schedule.location.summaries.loadingSelectedDetails;
    }

    if (scopedBusinessIds.length === 1) {
      const businessId = scopedBusinessIds[0];
      return copy.schedule.location.summaries.forBusiness(
        businessNameById.get(businessId) || copy.schedule.location.summaries.selectedBusiness,
      );
    }

    if (scopedBusinessIds.length > 1) {
      const businessNames = scopedBusinessIds.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.fromBusinesses(
        formatPreviewList(businessNames, copy.schedule.location.summaries.selectedBusinesses, copy.schedule),
      );
    }

    if (scopedUnitIds.length === 1) {
      const unitId = scopedUnitIds[0];
      return copy.schedule.location.summaries.forUnit(
        unitNameById.get(unitId) || copy.schedule.location.summaries.selectedUnit,
      );
    }

    if (scopedUnitIds.length > 1) {
      const unitNames = scopedUnitIds.map((unitId) => unitNameById.get(unitId) || `Unit ${unitId}`);
      return copy.schedule.location.summaries.fromUnits(
        formatPreviewList(unitNames, copy.schedule.location.summaries.selectedUnits, copy.schedule),
      );
    }

    if (appliedBusinessId) {
      return copy.schedule.location.summaries.forBusiness(
        businessNameById.get(appliedBusinessId) || copy.schedule.location.summaries.currentBusinessFilter,
      );
    }

    if (appliedUnitId) {
      return copy.schedule.location.summaries.forUnit(
        unitNameById.get(appliedUnitId) || copy.schedule.location.summaries.currentUnitFilter,
      );
    }

    return copy.schedule.location.summaries.allLocations;
  }, [
    appliedBusinessId,
    appliedUnitId,
    businessNameById,
    copy,
    hasSelectedEmployees,
    selectedAssignments.length,
    scopedBusinessIds,
    scopedBusinessKey,
    scopedUnitIds,
    scopedUnitKey,
    unitNameById,
  ]);

  const employeeBusinessLocationSummary = useMemo(() => {
    if (selectedEmployeeCount === 0) {
      return copy.schedule.location.summaries.assignedBusinessLocation;
    }

    if (selectedAssignments.length === 0) {
      return copy.schedule.location.summaries.assignedBusinessLocationPending;
    }

    if (selectedBusinessIds.length === 1) {
      const businessId = selectedBusinessIds[0];
      return copy.schedule.location.summaries.assignedBusinessLocationName(
        businessNameById.get(businessId) || copy.schedule.location.summaries.assignedBusinessFallback,
      );
    }

    if (selectedBusinessIds.length > 1) {
      const businessNames = selectedBusinessIds.map((businessId) => businessNameById.get(businessId) || `Business ${businessId}`);
      return copy.schedule.location.summaries.multipleBusinessLocations(
        formatPreviewList(businessNames, copy.schedule.location.summaries.multipleBusinessesFallback, copy.schedule),
      );
    }

    return copy.schedule.location.summaries.needAssignedBusiness;
  }, [businessNameById, copy, selectedAssignments.length, selectedBusinessIds, selectedBusinessKey, selectedEmployeeCount]);

  const locationScopeFallbackMessage = hasLocationScope && scopedExactLocationOptions.length === 0 && activeLocationOptions.length > 0
    ? copy.schedule.location.summaries.noScopedLocationFallback
    : '';
  const exactLocationWarning = selectedBusinessIds.length > 1
    ? copy.schedule.location.summaries.exactLocationWarning
    : '';

  return {
    employeeBusinessLocationSummary,
    exactLocationOptions,
    exactLocationWarning,
    locationScopeFallbackMessage,
    locationScopeSummary,
    selectedEmployeeBusinessWarning,
  };
}
