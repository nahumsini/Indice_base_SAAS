import { useEffect, useMemo, useState } from 'react';
import {
  dashboardApi,
  type BackendBusiness,
  type BackendUnit,
} from '../../../../api/dashboard';
import { getBusinessUnitId } from '../utils/contractSiteUtils';

interface UseContractSiteScopeOptionsInput {
  isOpen: boolean;
  loadErrorMessage: string;
  selectedBusinessId: string;
  selectedUnitId: string;
  onBusinessReset: () => void;
  onError: (message: string) => void;
}

export function useContractSiteScopeOptions({
  isOpen,
  loadErrorMessage,
  selectedBusinessId,
  selectedUnitId,
  onBusinessReset,
  onError,
}: UseContractSiteScopeOptionsInput) {
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [isLoadingScopeOptions, setIsLoadingScopeOptions] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;
    setIsLoadingScopeOptions(true);

    Promise.all([
      dashboardApi.listUnits(),
      dashboardApi.listBusinesses(),
    ])
      .then(([nextUnits, nextBusinesses]) => {
        if (!active) {
          return;
        }
        setUnits(nextUnits);
        setBusinesses(nextBusinesses);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setUnits([]);
        setBusinesses([]);
        onError(error instanceof Error ? error.message : loadErrorMessage);
      })
      .finally(() => {
        if (active) {
          setIsLoadingScopeOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, loadErrorMessage, onError]);

  const filteredBusinessOptions = useMemo(() => (
    businesses.filter((business) => {
      if (!selectedUnitId) {
        return true;
      }
      return String(getBusinessUnitId(business) ?? '') === selectedUnitId;
    })
  ), [businesses, selectedUnitId]);

  useEffect(() => {
    if (!selectedBusinessId) {
      return;
    }

    const isStillValid = filteredBusinessOptions.some((business) => String(business.id) === selectedBusinessId);
    if (!isStillValid) {
      onBusinessReset();
    }
  }, [filteredBusinessOptions, onBusinessReset, selectedBusinessId]);

  const selectedUnit = useMemo(
    () => units.find((unit) => String(unit.id) === selectedUnitId) ?? null,
    [selectedUnitId, units],
  );

  const selectedBusiness = useMemo(
    () => filteredBusinessOptions.find((business) => String(business.id) === selectedBusinessId) ?? null,
    [filteredBusinessOptions, selectedBusinessId],
  );

  return {
    filteredBusinessOptions,
    isLoadingScopeOptions,
    selectedBusiness,
    selectedUnit,
    units,
  };
}
