import { useMemo } from 'react';
import {
  PROFILE_COUNTRY_OPTIONS,
  getProfileCountryLabel,
} from '../../../../../../shared/profileCountries';
import { getDepartmentOptionLabels } from '../../../data/departmentOptions';
import { getSuggestedPositionsByDepartment } from '../../../data/departmentPositionMap';
import { getAllPositionLabels } from '../../../data/positionOptions';
import type { EmployeeModalTranslations } from '../../../translations/types';
import {
  compareOrganizationTones,
  formatAttendanceLocationOption,
  isCorporateHeadquartersLabel,
  isCorporateOfficeUnitLabel,
  isUnitHeadquartersLabel,
  mergeTextOptions,
} from '../model';
import type {
  CustomJobOptions,
  EmployeeFormData,
  EmployeeModalProps,
  OrganizationOption,
  OrganizationOptionTone,
} from '../types';

interface UseEmployeeModalOptionsParams {
  attendanceLocations: EmployeeModalProps['attendanceLocations'];
  businessOptions: EmployeeModalProps['businessOptions'];
  copy: EmployeeModalTranslations;
  currentLanguageCode: string;
  customJobOptions: CustomJobOptions;
  formData: EmployeeFormData;
  unitOptions: EmployeeModalProps['unitOptions'];
}

export function useEmployeeModalOptions({
  attendanceLocations,
  businessOptions,
  copy,
  currentLanguageCode,
  customJobOptions,
  formData,
  unitOptions,
}: UseEmployeeModalOptionsParams) {
  const departmentOptions = useMemo(
    () => mergeTextOptions(getDepartmentOptionLabels(currentLanguageCode), customJobOptions.departments),
    [currentLanguageCode, customJobOptions.departments],
  );
  const allPositionOptions = useMemo(
    () => getAllPositionLabels(currentLanguageCode),
    [currentLanguageCode],
  );
  const suggestedPositionOptions = useMemo(
    () => getSuggestedPositionsByDepartment(formData.department, currentLanguageCode),
    [currentLanguageCode, formData.department],
  );
  const positionOptions = useMemo(
    () => mergeTextOptions(
      suggestedPositionOptions,
      customJobOptions.positions,
      formData.position ? [formData.position] : [],
    ),
    [customJobOptions.positions, formData.position, suggestedPositionOptions],
  );
  const modalUnitOptions = useMemo(
    () => (unitOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-units'),
    [unitOptions],
  );
  const modalBusinessOptions = useMemo(
    () => (businessOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-businesses'),
    [businessOptions],
  );
  const belongingCopy = copy.belonging;
  const selectedUnitOption = useMemo(
    () => modalUnitOptions.find((option) => option.value === formData.businessUnitId) ?? null,
    [formData.businessUnitId, modalUnitOptions],
  );
  const selectedUnitIsCorporateOffice = Boolean(
    selectedUnitOption && isCorporateOfficeUnitLabel(selectedUnitOption.label),
  );
  const unitOptionsWithBelonging = useMemo<OrganizationOption[]>(() => (
    modalUnitOptions.map((option) => {
      const isCorporateUnit = isCorporateOfficeUnitLabel(option.label);

      return {
        ...option,
        label: isCorporateUnit ? belongingCopy.corporateBusinessBadge : option.label,
        badge: isCorporateUnit ? belongingCopy.corporateUnitBadge : belongingCopy.businessUnitBadge,
        description: isCorporateUnit
          ? belongingCopy.corporateUnitDescription
          : belongingCopy.businessUnitDescription,
        tone: isCorporateUnit ? 'corporate' : 'unit',
      };
    })
  ), [belongingCopy, modalUnitOptions]);
  const filteredBusinessOptions = useMemo<OrganizationOption[]>(() => {
    if (!formData.businessUnitId) {
      return [];
    }

    const selectedUnitLabel = selectedUnitOption?.label ?? '';

    return modalBusinessOptions
      .filter((option) => (
        (option.unitId === formData.businessUnitId || option.unit_id === formData.businessUnitId)
        && (selectedUnitIsCorporateOffice || !isCorporateHeadquartersLabel(option.label))
      ))
      .map((option) => {
        const isCorporateBusiness = isCorporateHeadquartersLabel(option.label);
        const isHeadquartersBusiness = !isCorporateBusiness
          && isUnitHeadquartersLabel(option.label, selectedUnitLabel);
        const tone: OrganizationOptionTone = isCorporateBusiness
          ? 'corporate'
          : isHeadquartersBusiness
            ? 'unit'
            : 'business';

        return {
          ...option,
          badge: isCorporateBusiness
            ? belongingCopy.corporateBusinessBadge
            : isHeadquartersBusiness
              ? belongingCopy.unitHeadquartersBadge
              : belongingCopy.operatingBusinessBadge,
          description: isCorporateBusiness
            ? belongingCopy.corporateBusinessDescription
            : isHeadquartersBusiness
              ? belongingCopy.unitHeadquartersDescription(selectedUnitLabel || option.label)
              : belongingCopy.operatingBusinessDescription,
          tone,
        };
      })
      .sort((first, second) => {
        const toneOrder = compareOrganizationTones(first.tone, second.tone);
        if (toneOrder !== 0) {
          return toneOrder;
        }
        return first.label.localeCompare(second.label, currentLanguageCode);
      });
  }, [
    belongingCopy,
    currentLanguageCode,
    formData.businessUnitId,
    modalBusinessOptions,
    selectedUnitIsCorporateOffice,
    selectedUnitOption,
  ]);
  const selectedBusinessOption = useMemo(
    () => filteredBusinessOptions.find((option) => option.value === formData.businessId) ?? null,
    [filteredBusinessOptions, formData.businessId],
  );
  const hasHeadquartersBusinessOption = useMemo(
    () => filteredBusinessOptions.some((option) => option.tone === 'corporate' || option.tone === 'unit'),
    [filteredBusinessOptions],
  );
  const businessBelongingHelper = useMemo(() => {
    if (!formData.businessUnitId) {
      return belongingCopy.selectUnitFirst;
    }

    if (selectedUnitIsCorporateOffice) {
      return belongingCopy.corporateAutoSummary;
    }

    if (selectedUnitOption && selectedBusinessOption) {
      return belongingCopy.belongingSummary(
        selectedUnitOption.label,
        selectedBusinessOption.label,
        selectedBusinessOption.badge ?? '',
      );
    }

    return hasHeadquartersBusinessOption
      ? belongingCopy.businessHelper
      : belongingCopy.noHeadquartersOption;
  }, [
    belongingCopy,
    formData.businessUnitId,
    hasHeadquartersBusinessOption,
    selectedUnitIsCorporateOffice,
    selectedBusinessOption,
    selectedUnitOption,
  ]);
  const businessBelongingHelperTone: 'default' | 'warning' =
    formData.businessUnitId && !hasHeadquartersBusinessOption ? 'warning' : 'default';
  const activeAttendanceLocations = useMemo(
    () => (attendanceLocations ?? []).filter((location) => location.status !== 'inactive'),
    [attendanceLocations],
  );
  const scheduleLocationOptions = useMemo(() => {
    const matchingLocations = activeAttendanceLocations.filter((location) => {
      if (formData.businessId) {
        return String(location.business_id ?? '') === formData.businessId;
      }
      if (formData.businessUnitId) {
        return String(location.unit_id ?? '') === formData.businessUnitId;
      }
      return true;
    });

    return matchingLocations.map((location) => ({
      value: String(location.id),
      label: formatAttendanceLocationOption(location),
    }));
  }, [activeAttendanceLocations, formData.businessId, formData.businessUnitId]);
  const countryOptions = useMemo(
    () => PROFILE_COUNTRY_OPTIONS.map((country) => ({
      value: country.code,
      label: getProfileCountryLabel(country, currentLanguageCode),
    })),
    [currentLanguageCode],
  );

  return {
    allPositionOptions,
    businessBelongingHelper,
    businessBelongingHelperTone,
    countryOptions,
    departmentOptions,
    filteredBusinessOptions,
    modalBusinessOptions,
    modalUnitOptions,
    positionOptions,
    scheduleLocationOptions,
    selectedBusinessOption,
    selectedUnitIsCorporateOffice,
    unitOptionsWithBelonging,
  };
}
