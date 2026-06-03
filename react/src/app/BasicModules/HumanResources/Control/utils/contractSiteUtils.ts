import type { BackendBusiness, BackendUnit } from '../../../../api/dashboard';
import type {
  AttendanceControlAssignment,
  AttendanceControlLocation,
} from '../../../../api/humanResources';
import type { ContractSiteCopy, DraftLocation } from '../types/contractSiteTypes';

export const getBusinessUnitId = (business: BackendBusiness) => business.unitId ?? business.unit_id ?? null;

export const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);

const timeToMinutes = (value?: string | null) => {
  const [hours, minutes] = timeToInput(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

export const calculateDailyHours = (startTime?: string | null, endTime?: string | null) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }
  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
};

export const toBackendTime = (value: string) => `${timeToInput(value)}:00`;
export const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const contractDaysBetween = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate || !endDate) {
    return null;
  }
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
};

export const formatContractDays = (startDate: string | null | undefined, endDate: string | null | undefined, copy: ContractSiteCopy) => {
  const days = contractDaysBetween(startDate, endDate);
  if (!days) {
    return copy.days.rangeNeeded;
  }
  return copy.days.count(days);
};

export const toDraftLocation = (location: AttendanceControlLocation): DraftLocation => {
  const requiredStartTime = timeToInput(location.required_start_time) || '08:00';
  const requiredEndTime = timeToInput(location.required_end_time) || '16:00';
  const derivedHours = calculateDailyHours(requiredStartTime, requiredEndTime);
  const contractStartDate = location.contract_start_date || todayInputValue();
  const contractEndDate = location.contract_end_date || contractStartDate;

  return {
    id: `persisted-${location.id}`,
    persistedId: location.id,
    unitId: location.unit_id ?? null,
    unitName: location.unit_name ?? undefined,
    businessId: location.business_id ?? null,
    businessName: location.business_name ?? undefined,
    contractStartDate,
    contractEndDate,
    nombre: location.name,
    latitud: location.latitude,
    longitud: location.longitude,
    radio: location.radius_meters,
    requiredHoursPerDay: location.required_hours_per_day || derivedHours || 8,
    requiredStartTime,
    requiredEndTime,
    status: location.status === 'inactive' ? 'inactive' : 'active',
    assignedEmployeeCount: location.assigned_user_count ?? 0,
    assignedEmployeeNames: location.assigned_user_names ?? undefined,
  };
};

export const assignmentBelongsToContractSite = (assignment: AttendanceControlAssignment, contractSiteId: number) =>
  assignment.active_work_site?.location_id === contractSiteId;

export const attendanceTouchedContractSite = (assignment: AttendanceControlAssignment, contractSiteId: number) =>
  assignment.first_location?.id === contractSiteId || assignment.last_location?.id === contractSiteId;

export const formatDateTime = (value: string | null | undefined, copy: ContractSiteCopy) => {
  if (!value) {
    return copy.notRegistered;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const hasText = (value: string) => value.trim().length > 0;

export interface ContractSiteFormInput {
  altitud: string;
  contractEndDate: string;
  contractStartDate: string;
  contractStatus: 'active' | 'inactive';
  controlDate: string;
  enlaceGoogleMaps: string;
  latitud: string;
  longitud: string;
  nombre: string;
  radio: string;
}

export interface BuildDraftLocationInput extends Omit<ContractSiteFormInput, 'controlDate'> {
  copy: ContractSiteCopy;
  draftLocations: DraftLocation[];
  editingLocationId: string | null;
  requiredEndTime: string;
  requiredHoursPerDay: string;
  requiredStartTime: string;
  selectedBusiness: BackendBusiness | null;
  selectedUnit: BackendUnit | null;
}

export const hasPendingContractSiteFormInput = ({
  altitud,
  contractEndDate,
  contractStartDate,
  contractStatus,
  controlDate,
  enlaceGoogleMaps,
  latitud,
  longitud,
  nombre,
  radio,
}: ContractSiteFormInput) => (
  Boolean(
    hasText(nombre)
    || hasText(latitud)
    || hasText(longitud)
    || hasText(enlaceGoogleMaps)
    || hasText(altitud)
    || radio.trim() !== '80'
    || contractStartDate.trim() !== controlDate
    || contractEndDate.trim() !== controlDate
    || contractStatus !== 'active'
  )
);

export const hasCompleteContractSiteFormInput = ({
  contractEndDate,
  contractStartDate,
  latitud,
  longitud,
  nombre,
  radio,
  selectedBusiness,
  selectedUnit,
}: {
  contractEndDate: string;
  contractStartDate: string;
  latitud: string;
  longitud: string;
  nombre: string;
  radio: string;
  selectedBusiness: BackendBusiness | null;
  selectedUnit: BackendUnit | null;
}) => {
  const parsedLat = Number(latitud);
  const parsedLng = Number(longitud);
  const parsedRadio = Number(radio);

  return Boolean(
    selectedUnit
    && selectedBusiness
    && hasText(nombre)
    && !Number.isNaN(parsedLat)
    && !Number.isNaN(parsedLng)
    && !Number.isNaN(parsedRadio)
    && parsedRadio > 0
    && contractDaysBetween(contractStartDate, contractEndDate) !== null
  );
};

export const buildDraftLocationFromForm = ({
  altitud,
  contractEndDate,
  contractStartDate,
  contractStatus,
  copy,
  draftLocations,
  editingLocationId,
  enlaceGoogleMaps,
  latitud,
  longitud,
  nombre,
  radio,
  requiredEndTime,
  requiredHoursPerDay,
  requiredStartTime,
  selectedBusiness,
  selectedUnit,
}: BuildDraftLocationInput): { draft: DraftLocation | null; errorMessage: string | null } => {
  const parsedLat = Number(latitud);
  const parsedLng = Number(longitud);
  const parsedRadio = Number(radio);
  const parsedContractDays = contractDaysBetween(contractStartDate, contractEndDate);
  const parsedRequiredHours = Number(requiredHoursPerDay);
  const safeRequiredStartTime = timeToInput(requiredStartTime) || '08:00';
  const safeRequiredEndTime = timeToInput(requiredEndTime) || '16:00';
  const fallbackRequiredHours = calculateDailyHours(safeRequiredStartTime, safeRequiredEndTime) || 8;

  if (!selectedUnit || !selectedBusiness) {
    return {
      draft: null,
      errorMessage: copy.errors.selectUnitAndBusiness,
    };
  }

  if (!hasText(nombre) || Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || Number.isNaN(parsedRadio) || parsedRadio <= 0) {
    return {
      draft: null,
      errorMessage: copy.errors.completeRequiredFields,
    };
  }

  if (!parsedContractDays) {
    return {
      draft: null,
      errorMessage: copy.errors.validContractDates,
    };
  }

  const editingLocation = editingLocationId
    ? draftLocations.find((location) => location.id === editingLocationId)
    : null;

  return {
    draft: {
      id: editingLocationId ?? `new-${Date.now()}`,
      persistedId: editingLocation?.persistedId,
      unitId: selectedUnit.id,
      unitName: selectedUnit.name,
      businessId: selectedBusiness.id,
      businessName: selectedBusiness.name,
      contractStartDate,
      contractEndDate,
      nombre: nombre.trim(),
      latitud: parsedLat,
      longitud: parsedLng,
      radio: parsedRadio,
      requiredHoursPerDay: Number((Number.isFinite(parsedRequiredHours) && parsedRequiredHours > 0 ? parsedRequiredHours : fallbackRequiredHours).toFixed(2)),
      requiredStartTime: safeRequiredStartTime,
      requiredEndTime: safeRequiredEndTime,
      status: contractStatus,
      assignedEmployeeCount: editingLocation?.assignedEmployeeCount ?? 0,
      assignedEmployeeNames: editingLocation?.assignedEmployeeNames,
      enlaceGoogleMaps: enlaceGoogleMaps.trim() || undefined,
      altitud: altitud.trim() || undefined,
    },
    errorMessage: null,
  };
};

export const getContractSiteDraftChanges = (
  draftLocations: DraftLocation[],
  persistedLocationSnapshot: Map<number, DraftLocation>,
) => {
  const updatedDrafts = draftLocations.filter((location) => {
    if (!location.persistedId) {
      return false;
    }
    const originalLocation = persistedLocationSnapshot.get(location.persistedId);
    return Boolean(originalLocation) && !areDraftLocationsEqual(location, originalLocation);
  });
  const newDrafts = draftLocations.filter((location) => !location.persistedId);

  return {
    draftsToPersist: [...updatedDrafts, ...newDrafts],
    newDrafts,
    updatedDrafts,
  };
};

export const getContractSiteDraftValidationError = (draftsToPersist: DraftLocation[], copy: ContractSiteCopy) => {
  const invalidScopeDraft = draftsToPersist.find((location) => !hasValidDraftScope(location));
  if (invalidScopeDraft) {
    return copy.errors.everySiteNeedsScope;
  }

  const invalidDataDraft = draftsToPersist.find((location) => !hasText(location.nombre) || !hasValidDraftCoordinates(location));
  if (invalidDataDraft) {
    return copy.errors.everySiteNeedsLocation;
  }

  const invalidRequirementDraft = draftsToPersist.find((location) => !hasValidDraftRequirements(location));
  if (invalidRequirementDraft) {
    return copy.errors.everySiteNeedsRequirements;
  }

  return '';
};

export const hasValidDraftScope = (location: DraftLocation) => (
  typeof location.unitId === 'number'
  && location.unitId > 0
  && typeof location.businessId === 'number'
  && location.businessId > 0
);

export const hasValidDraftCoordinates = (location: DraftLocation) => (
  Number.isFinite(location.latitud)
  && Number.isFinite(location.longitud)
  && Number.isFinite(location.radio)
  && location.radio > 0
);

export const hasValidDraftRequirements = (location: DraftLocation) => (
  Boolean(location.contractStartDate)
  && Boolean(location.contractEndDate)
  && contractDaysBetween(location.contractStartDate, location.contractEndDate) !== null
);

export const areDraftLocationsEqual = (left: DraftLocation, right: DraftLocation) => (
  (left.unitId ?? null) === (right.unitId ?? null)
  && (left.businessId ?? null) === (right.businessId ?? null)
  && left.contractStartDate === right.contractStartDate
  && left.contractEndDate === right.contractEndDate
  && left.nombre.trim() === right.nombre.trim()
  && left.latitud === right.latitud
  && left.longitud === right.longitud
  && left.radio === right.radio
  && left.requiredHoursPerDay === right.requiredHoursPerDay
  && left.requiredStartTime === right.requiredStartTime
  && left.requiredEndTime === right.requiredEndTime
  && left.status === right.status
);

export const waitForNextPaint = () => (
  new Promise<void>((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }

    setTimeout(resolve, 0);
  })
);
