import { useCallback, useMemo } from 'react';
import {
  allFilterValue,
  inlineUnassignedValue,
  organizationToneOrder,
} from '../constants/employees.constants';
import type {
  EmployeeBusinessOption,
  EmployeeUnitOption,
  OrganizationOptionTone,
  OrganizationSelectOption,
} from '../types/employees.types';
import type { EmployeesTranslations } from '../translations';
import {
  isCorporateHeadquartersLabel,
  isCorporateOfficeUnitLabel,
  isUnitHeadquartersLabel,
} from '../utils/employees.utils';

interface EmployeeInlineOrganizationParams {
  businessOptions: EmployeeBusinessOption[];
  locale: string;
  organizationCopy: EmployeesTranslations['modal']['belonging'];
  unitOptions: EmployeeUnitOption[];
}

export function useEmployeeInlineOrganization({
  businessOptions,
  locale,
  organizationCopy,
  unitOptions,
}: EmployeeInlineOrganizationParams) {
  const modalUnitOptions = useMemo(
    () => unitOptions.filter((option) => option.value !== allFilterValue && option.value !== 'all-units'),
    [unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => businessOptions.filter((option) => option.value !== allFilterValue && option.value !== 'all-businesses'),
    [businessOptions],
  );
  const inlineOrganizationCopy = organizationCopy;
  const inlineUnitOptions = useMemo<OrganizationSelectOption[]>(
    () =>
      modalUnitOptions.map((option) => {
        const isCorporateUnit = isCorporateOfficeUnitLabel(option.label);

        return {
          ...option,
          label: isCorporateUnit ? inlineOrganizationCopy.corporateBusinessBadge : option.label,
          badge: isCorporateUnit ? inlineOrganizationCopy.corporateUnitBadge : inlineOrganizationCopy.businessUnitBadge,
          description: isCorporateUnit
            ? inlineOrganizationCopy.corporateUnitDescription
            : inlineOrganizationCopy.businessUnitDescription,
          tone: isCorporateUnit ? 'corporate' : 'unit',
        };
      }),
    [inlineOrganizationCopy, modalUnitOptions],
  );

  const getInlineBusinessOptionsForUnit = useCallback((unitId: string): OrganizationSelectOption[] => {
    if (!unitId || unitId === inlineUnassignedValue || unitId === allFilterValue) {
      return [];
    }

    const selectedUnitOption = modalUnitOptions.find((option) => option.value === unitId) ?? null;
    const selectedUnitLabel = selectedUnitOption?.label ?? '';
    const selectedUnitIsCorporateOffice = Boolean(
      selectedUnitOption && isCorporateOfficeUnitLabel(selectedUnitOption.label),
    );

    return modalBusinessOptions
      .filter((option) => (
        (option.unitId === unitId || option.unit_id === unitId)
        && (selectedUnitIsCorporateOffice || !isCorporateHeadquartersLabel(option.label))
      ))
      .map((option) => {
        const isCorporateBusiness = isCorporateHeadquartersLabel(option.label);
        const isHeadquartersBusiness = !isCorporateBusiness && isUnitHeadquartersLabel(option.label, selectedUnitLabel);
        const tone: OrganizationOptionTone = isCorporateBusiness
          ? 'corporate'
          : isHeadquartersBusiness
            ? 'unit'
            : 'business';

        return {
          ...option,
          label: isCorporateBusiness ? inlineOrganizationCopy.corporateBusinessBadge : option.label,
          badge: isCorporateBusiness
            ? inlineOrganizationCopy.corporateBusinessBadge
            : isHeadquartersBusiness
              ? inlineOrganizationCopy.unitHeadquartersBadge
              : inlineOrganizationCopy.operatingBusinessBadge,
          description: isCorporateBusiness
            ? inlineOrganizationCopy.corporateBusinessDescription
            : isHeadquartersBusiness
              ? inlineOrganizationCopy.unitHeadquartersDescription(selectedUnitLabel || option.label)
              : inlineOrganizationCopy.operatingBusinessDescription,
          tone,
        };
      })
      .sort((first, second) => {
        const firstOrder = organizationToneOrder[first.tone ?? 'default'];
        const secondOrder = organizationToneOrder[second.tone ?? 'default'];
        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }
        return first.label.localeCompare(second.label, locale);
      });
  }, [
    inlineOrganizationCopy,
    locale,
    modalBusinessOptions,
    modalUnitOptions,
  ]);

  const resolveDefaultBusinessIdForUnit = useCallback((unitId: string, currentBusinessId: string) => {
    const nextBusinessOptions = getInlineBusinessOptionsForUnit(unitId);
    const currentBusinessOption = nextBusinessOptions.find((option) => option.value === currentBusinessId);
    if (currentBusinessOption) {
      return currentBusinessOption.value;
    }

    const headquartersOption = nextBusinessOptions.find(
      (option) => option.tone === 'corporate' || option.tone === 'unit',
    );

    return headquartersOption?.value ?? nextBusinessOptions[0]?.value ?? '';
  }, [getInlineBusinessOptionsForUnit]);

  return {
    getInlineBusinessOptionsForUnit,
    inlineUnitOptions,
    resolveDefaultBusinessIdForUnit,
  };
}
