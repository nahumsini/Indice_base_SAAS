import { useCallback, useEffect, useMemo, useState } from 'react';
import { dashboardApi, type BackendBusiness, type BackendUnit } from '../../../../api/dashboard';
import type { ControlTranslations } from '../translations';
import { getBusinessUnitId } from '../utils/scheduleFormatters';

interface UseScheduleOrganizationOptionsInput {
  copy: ControlTranslations;
  isOpen: boolean;
  onLoadError: (message: string) => void;
}

export function useScheduleOrganizationOptions({
  copy,
  isOpen,
  onLoadError,
}: UseScheduleOrganizationOptionsInput) {
  const [organizationUnits, setOrganizationUnits] = useState<BackendUnit[]>([]);
  const [organizationBusinesses, setOrganizationBusinesses] = useState<BackendBusiness[]>([]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    setOrganizationUnits([]);
    setOrganizationBusinesses([]);

    Promise.all([
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ])
      .then(([nextUnits, nextBusinesses]) => {
        if (!active) {
          return;
        }

        setOrganizationUnits(nextUnits);
        setOrganizationBusinesses(nextBusinesses);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : copy.schedule.errors.loadOrganizationUnits;
        setOrganizationUnits([]);
        setOrganizationBusinesses([]);
        onLoadError(message);
      });

    return () => {
      active = false;
    };
  }, [copy, isOpen, onLoadError]);

  const unitOptions = useMemo(
    () => organizationUnits.map((option) => [String(option.id), option.name || copy.labels.unit] as const),
    [copy, organizationUnits],
  );

  const resolveBusinessFilterForUnit = useCallback((businessId: string, unitId: string) => {
    if (!businessId || !unitId) {
      return businessId;
    }

    const selectedBusiness = organizationBusinesses.find((option) => String(option.id) === businessId);
    if (!selectedBusiness) {
      return '';
    }

    return String(getBusinessUnitId(selectedBusiness) ?? '') === unitId ? businessId : '';
  }, [organizationBusinesses]);

  return {
    organizationBusinesses,
    organizationUnits,
    resolveBusinessFilterForUnit,
    unitOptions,
  };
}
