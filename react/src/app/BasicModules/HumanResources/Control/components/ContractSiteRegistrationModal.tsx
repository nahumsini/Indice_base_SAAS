import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListChecks,
  MapPin,
  Pencil,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import type { AttendanceControlAssignment, AttendanceControlLocation } from '../../../../api/humanResources';
import { humanResourcesApi } from '../../../../api/humanResources';
import { FailureToast } from '../../../../components/FailureToast';
import { LoadingBarOverlay, runWithMinimumDuration } from '../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../components/SuccessToast';
import {
  dashboardApi,
  type BackendBusiness,
  type BackendUnit,
} from '../../../../api/dashboard';

interface DraftLocation {
  id: string;
  persistedId?: number;
  unitId?: number | null;
  unitName?: string;
  businessId?: number | null;
  businessName?: string;
  contractStartDate: string;
  contractEndDate: string;
  nombre: string;
  latitud: number;
  longitud: number;
  radio: number;
  requiredHoursPerDay: number;
  requiredStartTime: string;
  requiredEndTime: string;
  status: 'active' | 'inactive';
  assignedEmployeeCount: number;
  assignedEmployeeNames?: string;
  enlaceGoogleMaps?: string;
  altitud?: string;
}

type ContractSiteFilter = 'all' | 'assigned' | 'unassigned' | 'active' | 'inactive';
type ContractSiteWizardStep = 'basic' | 'location' | 'schedule' | 'review';
const contractSitesPerPage = 10;
const contractSiteWizardSteps: Array<{
  id: ContractSiteWizardStep;
  title: string;
  description: string;
}> = [
  {
    id: 'basic',
    title: 'Información básica',
    description: 'Nombre, negocio y vigencia.',
  },
  {
    id: 'location',
    title: 'Ubicación',
    description: 'Mapa, radio y coordenadas.',
  },
  {
    id: 'schedule',
    title: 'Horario',
    description: 'Horas y jornada esperada.',
  },
  {
    id: 'review',
    title: 'Revisión',
    description: 'Confirma antes de agregar.',
  },
];

interface ContractSiteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: AttendanceControlLocation[];
  assignments: AttendanceControlAssignment[];
  controlDate: string;
  onReload?: () => Promise<void> | void;
  onSaved?: () => void;
}

const getBusinessUnitId = (business: BackendBusiness) => business.unitId ?? business.unit_id ?? null;
const LOCATION_MODAL_MINIMUM_LOADING_MS = 2000;

const timeToInput = (value?: string | null) => (value ?? '').slice(0, 5);

const timeToMinutes = (value?: string | null) => {
  const [hours, minutes] = timeToInput(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const calculateDailyHours = (startTime?: string | null, endTime?: string | null) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }
  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
};

const toBackendTime = (value: string) => `${timeToInput(value)}:00`;
const todayInputValue = () => new Date().toISOString().slice(0, 10);

const addDaysInputValue = (dateValue: string, days: number) => {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return todayInputValue();
  }
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const contractDaysBetween = (startDate?: string | null, endDate?: string | null) => {
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

const formatContractDays = (startDate?: string | null, endDate?: string | null) => {
  const days = contractDaysBetween(startDate, endDate);
  if (!days) {
    return 'Date range needed';
  }
  return days === 1 ? '1 day' : `${days} days`;
};

const toDraftLocation = (location: AttendanceControlLocation): DraftLocation => {
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

const assignmentBelongsToContractSite = (assignment: AttendanceControlAssignment, contractSiteId: number) =>
  assignment.active_work_site?.location_id === contractSiteId;

const attendanceTouchedContractSite = (assignment: AttendanceControlAssignment, contractSiteId: number) =>
  assignment.first_location?.id === contractSiteId || assignment.last_location?.id === contractSiteId;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Not registered';
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

const formatDateLabel = (value: string) => {
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

const hasText = (value: string) => value.trim().length > 0;

const hasValidDraftScope = (location: DraftLocation) => (
  typeof location.unitId === 'number'
  && location.unitId > 0
  && typeof location.businessId === 'number'
  && location.businessId > 0
);

const hasValidDraftCoordinates = (location: DraftLocation) => (
  Number.isFinite(location.latitud)
  && Number.isFinite(location.longitud)
  && Number.isFinite(location.radio)
  && location.radio > 0
);

const hasValidDraftRequirements = (location: DraftLocation) => (
  Number.isFinite(location.requiredHoursPerDay)
  && location.requiredHoursPerDay > 0
  && location.requiredHoursPerDay <= 24
  && Boolean(location.contractStartDate)
  && Boolean(location.contractEndDate)
  && contractDaysBetween(location.contractStartDate, location.contractEndDate) !== null
  && Boolean(timeToInput(location.requiredStartTime))
  && Boolean(timeToInput(location.requiredEndTime))
  && calculateDailyHours(location.requiredStartTime, location.requiredEndTime) > 0
);

const areDraftLocationsEqual = (left: DraftLocation, right: DraftLocation) => (
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

const waitForNextPaint = () => (
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

export function ContractSiteRegistrationModal({
  isOpen,
  onClose,
  locations,
  assignments,
  controlDate,
  onReload,
  onSaved,
}: ContractSiteRegistrationModalProps) {
  const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
  const [removedLocationIds, setRemovedLocationIds] = useState<number[]>([]);
  const [units, setUnits] = useState<BackendUnit[]>([]);
  const [businesses, setBusinesses] = useState<BackendBusiness[]>([]);
  const [nombre, setNombre] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [enlaceGoogleMaps, setEnlaceGoogleMaps] = useState('');
  const [altitud, setAltitud] = useState('');
  const [radio, setRadio] = useState('80');
  const [contractStartDate, setContractStartDate] = useState(todayInputValue());
  const [contractEndDate, setContractEndDate] = useState(todayInputValue());
  const [requiredHoursPerDay, setRequiredHoursPerDay] = useState('8');
  const [requiredStartTime, setRequiredStartTime] = useState('08:00');
  const [requiredEndTime, setRequiredEndTime] = useState('16:00');
  const [contractStatus, setContractStatus] = useState<'active' | 'inactive'>('active');
  const [contractSiteFilter, setContractSiteFilter] = useState<ContractSiteFilter>('all');
  const [contractSitePage, setContractSitePage] = useState(1);
  const [selectedContractSiteId, setSelectedContractSiteId] = useState<string | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<ContractSiteWizardStep>('basic');
  const [showAdvancedLocationFields, setShowAdvancedLocationFields] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExtractingCoordinates, setIsExtractingCoordinates] = useState(false);
  const [isLoadingScopeOptions, setIsLoadingScopeOptions] = useState(false);
  const [locationAction, setLocationAction] = useState<'save' | 'load' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftLocations(locationDrafts);
    setRemovedLocationIds([]);
    setNombre('');
    setSelectedUnitId('');
    setSelectedBusinessId('');
    setLatitud('');
    setLongitud('');
    setEnlaceGoogleMaps('');
    setAltitud('');
    setRadio('80');
    setContractStartDate(controlDate);
    setContractEndDate(controlDate);
    setRequiredHoursPerDay('8');
	    setRequiredStartTime('08:00');
	    setRequiredEndTime('16:00');
	    setContractStatus('active');
	    setContractSiteFilter('all');
	    setContractSitePage(1);
	    setSelectedContractSiteId(null);
	    setEditingLocationId(null);
    setWizardStep('basic');
    setShowAdvancedLocationFields(false);
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');
  }, [controlDate, isOpen, locationDrafts]);

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
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load units and businesses.');
      })
      .finally(() => {
        if (active) {
          setIsLoadingScopeOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

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

	  const persistedLocationSnapshot = useMemo(
	    () => new Map(locations.map((location) => [location.id, toDraftLocation(location)])),
	    [locations],
  );

  const hasPendingFormInput = useMemo(() => (
    Boolean(
      hasText(nombre)
      || hasText(latitud)
      || hasText(longitud)
      || hasText(enlaceGoogleMaps)
      || hasText(altitud)
      || radio.trim() !== '80'
      || contractStartDate.trim() !== controlDate
      || contractEndDate.trim() !== controlDate
      || requiredHoursPerDay.trim() !== '8'
	      || requiredStartTime.trim() !== '08:00'
	      || requiredEndTime.trim() !== '16:00'
      || contractStatus !== 'active'
    )
  ), [
    altitud,
    contractEndDate,
    contractStartDate,
    controlDate,
    enlaceGoogleMaps,
    latitud,
    longitud,
    nombre,
    radio,
    requiredHoursPerDay,
	    requiredStartTime,
	    requiredEndTime,
    contractStatus,
  ]);

  const hasChanges = useMemo(() => {
    const hasNewDrafts = draftLocations.some((location) => !location.persistedId);
    const hasEditedDrafts = draftLocations.some((location) => {
      if (!location.persistedId) {
        return false;
      }
      const originalLocation = persistedLocationSnapshot.get(location.persistedId);
      return !originalLocation || !areDraftLocationsEqual(location, originalLocation);
    });
    return hasNewDrafts || hasEditedDrafts || removedLocationIds.length > 0;
  }, [draftLocations, persistedLocationSnapshot, removedLocationIds]);

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
      setSelectedBusinessId('');
    }
  }, [filteredBusinessOptions, selectedBusinessId]);

  const selectedUnit = useMemo(
    () => units.find((unit) => String(unit.id) === selectedUnitId) ?? null,
    [selectedUnitId, units],
  );

	  const selectedBusiness = useMemo(
	    () => filteredBusinessOptions.find((business) => String(business.id) === selectedBusinessId) ?? null,
	    [filteredBusinessOptions, selectedBusinessId],
	  );

  const parsedWorkingHoursForForm = useMemo(
    () => Number(requiredHoursPerDay),
    [requiredHoursPerDay],
  );

  const contractDaysForForm = useMemo(
    () => contractDaysBetween(contractStartDate, contractEndDate),
    [contractEndDate, contractStartDate],
  );

  const currentWizardStepIndex = contractSiteWizardSteps.findIndex((step) => step.id === wizardStep);
  const parsedLatitudeForForm = Number(latitud);
  const parsedLongitudeForForm = Number(longitud);
  const parsedRadiusForForm = Number(radio);
  const hasValidBasicInformation = Boolean(
    selectedUnit
    && selectedBusiness
    && hasText(nombre)
    && contractDaysForForm !== null,
  );
  const hasValidLocationInformation = Boolean(
    !Number.isNaN(parsedLatitudeForForm)
    && !Number.isNaN(parsedLongitudeForForm)
    && !Number.isNaN(parsedRadiusForForm)
    && parsedRadiusForForm > 0,
  );
  const hasValidScheduleInformation = Boolean(
    Number.isFinite(parsedWorkingHoursForForm)
    && parsedWorkingHoursForForm > 0
    && parsedWorkingHoursForForm <= 24
    && calculateDailyHours(requiredStartTime, requiredEndTime) > 0,
  );
  const canContinueWizard = wizardStep === 'basic'
    ? hasValidBasicInformation
    : wizardStep === 'location'
      ? hasValidLocationInformation
      : wizardStep === 'schedule'
        ? hasValidScheduleInformation
        : true;
	
	  const hasCompleteFormInput = useMemo(() => {
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
      && contractDaysForForm !== null
      && Number.isFinite(parsedWorkingHoursForForm)
      && parsedWorkingHoursForForm > 0
      && parsedWorkingHoursForForm <= 24
      && calculateDailyHours(requiredStartTime, requiredEndTime) > 0
	    );
	  }, [
    contractDaysForForm,
	    latitud,
	    longitud,
    nombre,
    parsedWorkingHoursForForm,
    radio,
    requiredEndTime,
    requiredStartTime,
    selectedBusiness,
    selectedUnit,
  ]);

  const loadingOverlayCopy = isExtractingCoordinates
    ? {
        title: 'Fetching coordinates',
        description: 'We are resolving the map link and fetching the location coordinates.',
      }
    : locationAction === 'load'
      ? {
        title: 'Loading contract sites',
        description: 'We are refreshing your contract sites now.',
        }
      : {
          title: 'Saving contract sites',
          description: 'We are saving your contract sites now.',
        };

  if (!isOpen) return null;

  const getWizardStepErrorMessage = () => {
    if (wizardStep === 'basic') {
      return 'Completa unidad, negocio, nombre y vigencia antes de continuar.';
    }
    if (wizardStep === 'location') {
      return 'Agrega una ubicación válida usando Google Maps, tu ubicación actual o las opciones avanzadas.';
    }
    if (wizardStep === 'schedule') {
      return 'Configura horas y horario válido antes de revisar.';
    }
    return 'Revisa la información antes de agregar la ubicación.';
  };

  const goToNextWizardStep = () => {
    if (!canContinueWizard) {
      setErrorMessage(getWizardStepErrorMessage());
      return;
    }

    setErrorMessage('');
    setWizardStep(contractSiteWizardSteps[Math.min(currentWizardStepIndex + 1, contractSiteWizardSteps.length - 1)].id);
  };

  const goToPreviousWizardStep = () => {
    setErrorMessage('');
    setWizardStep(contractSiteWizardSteps[Math.max(currentWizardStepIndex - 1, 0)].id);
  };

  const resetDraftForm = () => {
    setNombre('');
    setSelectedUnitId('');
    setSelectedBusinessId('');
    setLatitud('');
    setLongitud('');
	    setEnlaceGoogleMaps('');
	    setAltitud('');
	    setRadio('80');
    setContractStartDate(controlDate);
    setContractEndDate(controlDate);
    setRequiredHoursPerDay('8');
	    setRequiredStartTime('08:00');
	    setRequiredEndTime('16:00');
	    setContractStatus('active');
	    setEditingLocationId(null);
    setWizardStep('basic');
    setShowAdvancedLocationFields(false);
	  };

  const scrollToFormStart = () => {
    const moveToFormStart = () => {
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }

      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(moveToFormStart);
      });
      return;
    }

    setTimeout(moveToFormStart, 0);
  };

  const populateDraftForm = (location: DraftLocation) => {
    setNombre(location.nombre);
    setSelectedUnitId(location.unitId ? String(location.unitId) : '');
    setSelectedBusinessId(location.businessId ? String(location.businessId) : '');
    setLatitud(String(location.latitud));
    setLongitud(String(location.longitud));
	    setEnlaceGoogleMaps(location.enlaceGoogleMaps ?? '');
	    setAltitud(location.altitud ?? '');
	    setRadio(String(location.radio));
    setContractStartDate(location.contractStartDate);
    setContractEndDate(location.contractEndDate);
    setRequiredHoursPerDay(String(location.requiredHoursPerDay));
	    setRequiredStartTime(location.requiredStartTime);
	    setRequiredEndTime(location.requiredEndTime);
    setContractStatus(location.status);
    setEditingLocationId(location.id);
    setWizardStep('basic');
    setShowAdvancedLocationFields(false);
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');
    scrollToFormStart();
  };

  const buildDraftFromForm = (): { draft: DraftLocation | null; errorMessage: string | null } => {
	    const parsedLat = Number(latitud);
	    const parsedLng = Number(longitud);
	    const parsedRadio = Number(radio);
    const parsedRequiredHours = Number(requiredHoursPerDay);
    const parsedContractDays = contractDaysBetween(contractStartDate, contractEndDate);

    if (!selectedUnit || !selectedBusiness) {
      return {
        draft: null,
        errorMessage: 'Select the unit and business before saving this contract site.',
      };
    }

    if (!hasText(nombre) || Number.isNaN(parsedLat) || Number.isNaN(parsedLng) || Number.isNaN(parsedRadio) || parsedRadio <= 0) {
      return {
        draft: null,
        errorMessage: 'Complete the unit, business, name, coordinates, and a valid check-in radius.',
      };
    }

    if (!parsedContractDays) {
      return {
        draft: null,
        errorMessage: 'Select a valid contract start date and end date.',
      };
    }

	    if (
      !Number.isFinite(parsedRequiredHours)
      || parsedRequiredHours <= 0
      || parsedRequiredHours > 24
	    ) {
	      return {
	        draft: null,
	        errorMessage: 'Enter valid working hours between 0.25 and 24.',
	      };
	    }

    if (calculateDailyHours(requiredStartTime, requiredEndTime) <= 0) {
      return {
        draft: null,
        errorMessage: 'Select a valid preferred start and end time for this contract site.',
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
	        requiredHoursPerDay: Number(parsedRequiredHours.toFixed(2)),
	        requiredStartTime,
	        requiredEndTime,
	        status: contractStatus,
        assignedEmployeeCount: editingLocation?.assignedEmployeeCount ?? 0,
        assignedEmployeeNames: editingLocation?.assignedEmployeeNames,
        enlaceGoogleMaps: enlaceGoogleMaps.trim() || undefined,
        altitud: altitud.trim() || undefined,
      },
      errorMessage: null,
    };
  };

  const extractCoordinates = async () => {
    setErrorMessage('');
    setSuccessToastMessage('');
    setFailureToastMessage('');

    if (!enlaceGoogleMaps.trim()) {
      const message = 'Paste a Google Maps link before extracting coordinates.';
      setErrorMessage(message);
      setFailureToastMessage(message);
      return;
    }

    setIsExtractingCoordinates(true);
    await waitForNextPaint();

    try {
      const response = await runWithMinimumDuration(
        humanResourcesApi.extractAttendanceLocationCoordinates({
          map_url: enlaceGoogleMaps.trim(),
        }),
        LOCATION_MODAL_MINIMUM_LOADING_MS,
      );
      setLatitud(String(response.latitude));
      setLongitud(String(response.longitude));
      setSuccessToastMessage('Coordinates fetched successfully.');
    } catch {
      setFailureToastMessage('Having problems in fetching coordinates.');
      setErrorMessage('Having problems in fetching coordinates.');
    } finally {
      setIsExtractingCoordinates(false);
    }
  };

  const handleAgregar = () => {
    const { draft, errorMessage: formErrorMessage } = buildDraftFromForm();
    if (!draft) {
      setErrorMessage(formErrorMessage ?? 'Complete the form before adding this contract site.');
      return;
    }

    setDraftLocations((current) => (
      editingLocationId
        ? current.map((location) => (
          location.id === editingLocationId
            ? draft
            : location
        ))
        : [...current, draft]
    ));

    resetDraftForm();
    setErrorMessage('');
  };

  const handleQuitar = (location: DraftLocation) => {
    setDraftLocations((current) => current.filter((item) => item.id !== location.id));
    if (location.persistedId) {
      setRemovedLocationIds((current) => Array.from(new Set([...current, location.persistedId!])));
    }
    if (editingLocationId === location.id) {
      resetDraftForm();
    }
  };

  const handleGuardar = async () => {
    setSuccessToastMessage('');
    setFailureToastMessage('');
    setErrorMessage('');

    let nextDraftLocations = draftLocations;

    if (hasPendingFormInput) {
      const { draft, errorMessage: formErrorMessage } = buildDraftFromForm();
      if (!draft) {
        const pendingFormMessage = formErrorMessage ?? 'Complete the form before saving this contract site.';
        setFailureToastMessage(pendingFormMessage);
        setErrorMessage(pendingFormMessage);
        return;
      }

      nextDraftLocations = editingLocationId
        ? draftLocations.map((location) => (
          location.id === editingLocationId
            ? draft
            : location
        ))
        : [...draftLocations, draft];
      setDraftLocations(nextDraftLocations);
    }

    const updatedDraftsSource = nextDraftLocations.filter((location) => {
      if (!location.persistedId) {
        return false;
      }
      const originalLocation = persistedLocationSnapshot.get(location.persistedId);
      return Boolean(originalLocation) && !areDraftLocationsEqual(location, originalLocation);
    });
    const newDrafts = nextDraftLocations.filter((location) => !location.persistedId);
    const draftsToPersist = [...updatedDraftsSource, ...newDrafts];

    const invalidScopeDraft = draftsToPersist.find((location) => !hasValidDraftScope(location));
    if (invalidScopeDraft) {
      const scopeMessage = 'Every new or edited contract site needs both a business unit and a business before it can be saved.';
      setFailureToastMessage(scopeMessage);
      setErrorMessage(scopeMessage);
      return;
    }

    const invalidDataDraft = draftsToPersist.find((location) => !hasText(location.nombre) || !hasValidDraftCoordinates(location));
    if (invalidDataDraft) {
      const dataMessage = 'Every new or edited contract site needs a name, coordinates, and a valid check-in radius before it can be saved.';
      setFailureToastMessage(dataMessage);
      setErrorMessage(dataMessage);
      return;
    }

	    const invalidRequirementDraft = draftsToPersist.find((location) => !hasValidDraftRequirements(location));
	    if (invalidRequirementDraft) {
	      const requirementMessage = 'Every new or edited contract site needs valid contract dates, working hours, and preferred work time.';
	      setFailureToastMessage(requirementMessage);
	      setErrorMessage(requirementMessage);
      return;
    }

    setIsSaving(true);
    setLocationAction('save');
    await waitForNextPaint();

    try {
      await runWithMinimumDuration((async () => {
        for (const locationId of removedLocationIds) {
          await humanResourcesApi.deleteAttendanceControlLocation(locationId);
        }

        for (const location of updatedDraftsSource) {
          await humanResourcesApi.updateAttendanceControlLocation(location.persistedId!, {
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            contract_start_date: location.contractStartDate,
            contract_end_date: location.contractEndDate,
            name: location.nombre,
            latitude: location.latitud,
	            longitude: location.longitud,
	            radius_meters: location.radio,
	            required_hours_per_day: location.requiredHoursPerDay,
	            required_start_time: toBackendTime(location.requiredStartTime),
	            required_end_time: toBackendTime(location.requiredEndTime),
	            status: location.status,
	          });
        }

        for (const location of newDrafts) {
          await humanResourcesApi.createAttendanceControlLocation({
            unit_id: location.unitId ?? null,
            business_id: location.businessId ?? null,
            contract_start_date: location.contractStartDate,
            contract_end_date: location.contractEndDate,
            name: location.nombre,
            latitude: location.latitud,
	            longitude: location.longitud,
	            radius_meters: location.radio,
	            required_hours_per_day: location.requiredHoursPerDay,
	            required_start_time: toBackendTime(location.requiredStartTime),
	            required_end_time: toBackendTime(location.requiredEndTime),
	            status: location.status,
	          });
        }

        await Promise.resolve(onReload?.());
      })(), LOCATION_MODAL_MINIMUM_LOADING_MS);
      onSaved?.();
      onClose();
    } catch (error) {
      const saveMessage = error instanceof Error ? error.message : 'Could not save contract sites.';
      setFailureToastMessage(saveMessage);
      setErrorMessage(saveMessage);
    } finally {
      setLocationAction(null);
      setIsSaving(false);
    }
  };

  const handleCargar = async () => {
    setIsSaving(true);
    setLocationAction('load');
    setErrorMessage('');
    await waitForNextPaint();

    try {
      await runWithMinimumDuration(
        Promise.resolve(onReload?.()),
        LOCATION_MODAL_MINIMUM_LOADING_MS,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load contract sites.');
    } finally {
      setLocationAction(null);
      setIsSaving(false);
    }
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Your browser does not support geolocation.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude.toFixed(6));
        setLongitud(position.coords.longitude.toFixed(6));
        if (position.coords.altitude !== null) {
          setAltitud(position.coords.altitude.toFixed(2));
        }
        setErrorMessage('');
      },
      (error) => {
        let nextMessage = 'Could not get the current location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            nextMessage = 'Location permission was denied. Enable location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            nextMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            nextMessage = 'Timed out while getting the location.';
            break;
          default:
            break;
        }
        setErrorMessage(nextMessage);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  };

  return (
    <>
      <LoadingBarOverlay
        isVisible={isExtractingCoordinates || locationAction !== null}
        title={loadingOverlayCopy.title}
        description={loadingOverlayCopy.description}
      />
      <SuccessToast
        isVisible={Boolean(successToastMessage)}
        message={successToastMessage}
        onClose={() => setSuccessToastMessage('')}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white text-gray-900 shadow-2xl dark:border-slate-700 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex shrink-0 items-center justify-between bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">Ubicaciones temporales</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                  Configura ubicaciones temporales, requisitos de trabajo y radio de registro.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-slate-50/70 p-5 dark:bg-slate-950/40">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

          <div className="rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
            <p className="text-sm text-[#59C3A5] dark:text-blue-200">
              Crea ubicaciones temporales para registrar asistencia fuera de la oficina. Puedes inactivarlas sin borrar historial.
            </p>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Ubicaciones activas: {activeLocationsCount}</span>
            <span> · Con asignación: {assignedLocationsCount}</span> ·{' '}
            {hasChanges ? (
              <span className="text-orange-600 dark:text-orange-400">Cambios pendientes</span>
            ) : (
              <span className="text-green-600 dark:text-green-400">Sin cambios pendientes</span>
            )}
          </div>

          <div ref={formSectionRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-950 dark:text-white">
                    {editingLocationId ? 'Editar ubicación temporal' : 'Crear ubicación temporal'}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Te guiamos paso a paso para evitar errores de configuración.
                  </p>
                </div>
                <div className="inline-flex rounded-full border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-3 py-1 text-xs font-semibold text-[#59C3A5] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300">
                  Paso {currentWizardStepIndex + 1} de {contractSiteWizardSteps.length}
                </div>
              </div>

              <div className="mt-4 grid gap-2 lg:grid-cols-4">
                {contractSiteWizardSteps.map((step, index) => {
                  const isCurrent = step.id === wizardStep;
                  const isCompleted = index < currentWizardStepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setWizardStep(step.id)}
                      className={`flex min-h-[76px] items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        isCurrent
                          ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-blue-400/50 dark:bg-blue-400/10 dark:text-blue-200'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5]/30 hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                            ? 'bg-[#59C3A5] text-white'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{step.title}</span>
                        <span className="mt-0.5 block text-xs opacity-75">{step.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              {wizardStep === 'basic' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">Información básica</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Define dónde pertenece esta ubicación y por cuánto tiempo estará activa.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Unidad de negocio *</label>
                      <select
                        value={selectedUnitId}
                        onChange={(event) => setSelectedUnitId(event.target.value)}
                        disabled={isLoadingScopeOptions}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                      >
                        <option value="">{isLoadingScopeOptions ? 'Cargando unidades...' : 'Selecciona una unidad'}</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Negocio *</label>
                      <select
                        value={selectedBusinessId}
                        onChange={(event) => setSelectedBusinessId(event.target.value)}
                        disabled={isLoadingScopeOptions || !selectedUnitId}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-700"
                      >
                        <option value="">
                          {!selectedUnitId
                            ? 'Primero selecciona una unidad'
                            : filteredBusinessOptions.length > 0
                              ? 'Selecciona un negocio'
                              : 'No hay negocios para esta unidad'}
                        </option>
                        {filteredBusinessOptions.map((business) => (
                          <option key={business.id} value={business.id}>{business.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre de la ubicación *</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nombre}
                      onChange={(event) => setNombre(event.target.value)}
                      placeholder="Ej. Obra Plaza Centro"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Usa un nombre fácil de reconocer para supervisores y colaboradores.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Inicio del contrato</label>
                      <input
                        type="date"
                        value={contractStartDate}
                        onChange={(event) => {
                          const nextStartDate = event.target.value;
                          setContractStartDate(nextStartDate);
                          if (contractEndDate && nextStartDate && contractEndDate < nextStartDate) {
                            setContractEndDate(nextStartDate);
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Fin del contrato</label>
                      <input
                        type="date"
                        value={contractEndDate}
                        min={contractStartDate}
                        onChange={(event) => setContractEndDate(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Duración</label>
                      <input
                        type="text"
                        value={contractDaysForForm ? formatContractDays(contractStartDate, contractEndDate) : 'Rango inválido'}
                        readOnly
                        className="w-full rounded-lg border border-gray-300 bg-slate-50 px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {selectedUnit && selectedBusiness ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                      Se guardará en: {selectedUnit.name} / {selectedBusiness.name}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {wizardStep === 'location' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">Ubicación</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Pega un enlace de Google Maps o usa tu ubicación actual. Las coordenadas técnicas quedan ocultas.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Enlace de Google Maps</label>
                      <input
                        type="text"
                        value={enlaceGoogleMaps}
                        onChange={(event) => setEnlaceGoogleMaps(event.target.value)}
                        placeholder="Pega aquí el enlace de Google Maps"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Recomendado: copiar enlace desde Google Maps para evitar errores manuales.
                      </p>
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={() => void extractCoordinates()} variant="outline" type="button" disabled={isExtractingCoordinates}>
                        {isExtractingCoordinates ? 'Extrayendo...' : 'Extraer'}
                      </Button>
                      <Button onClick={getCurrentLocation} type="button" variant="outline" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Usar mi ubicación
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Radio permitido para registrar asistencia</label>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Mientras más pequeño sea el radio, más precisa debe ser la ubicación del colaborador.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={radio}
                          onChange={(event) => setRadio(event.target.value)}
                          min="1"
                          className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">m</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="10"
                      value={Number.isFinite(parsedRadiusForForm) ? Math.min(Math.max(parsedRadiusForForm, 20), 500) : 80}
                      onChange={(event) => setRadio(event.target.value)}
                      className="mt-4 w-full accent-[#59C3A5]"
                    />
                  </div>

                  <div className={`rounded-xl border px-4 py-3 text-sm ${
                    hasValidLocationInformation
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300'
                  }`}>
                    {hasValidLocationInformation
                      ? `Ubicación lista: ${latitud}, ${longitud} con radio de ${radio} m.`
                      : 'Falta detectar o capturar una ubicación válida.'}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvancedLocationFields((current) => !current)}
                    className="text-sm font-semibold text-[#59C3A5] hover:underline dark:text-blue-300"
                  >
                    {showAdvancedLocationFields ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
                  </button>

                  {showAdvancedLocationFields ? (
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Latitud</label>
                        <input
                          type="text"
                          value={latitud}
                          onChange={(event) => setLatitud(event.target.value)}
                          placeholder="21.1619"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Longitud</label>
                        <input
                          type="text"
                          value={longitud}
                          onChange={(event) => setLongitud(event.target.value)}
                          placeholder="-86.8515"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Altitud opcional</label>
                        <input
                          type="text"
                          value={altitud}
                          onChange={(event) => setAltitud(event.target.value)}
                          placeholder="metros sobre nivel del mar"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {wizardStep === 'schedule' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">Horario esperado</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Define la jornada que se usará como referencia para la asistencia en esta ubicación.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Horas por día</label>
                      <input
                        type="number"
                        value={requiredHoursPerDay}
                        onChange={(event) => setRequiredHoursPerDay(event.target.value)}
                        min="0.25"
                        max="24"
                        step="0.25"
                        placeholder="8"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Hora de inicio</label>
                      <input
                        type="time"
                        value={requiredStartTime}
                        onChange={(event) => setRequiredStartTime(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Hora de fin</label>
                      <input
                        type="time"
                        value={requiredEndTime}
                        onChange={(event) => setRequiredEndTime(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                    Jornada configurada: <span className="font-semibold text-slate-950 dark:text-white">{requiredStartTime} - {requiredEndTime}</span>
                    {' '}con <span className="font-semibold text-slate-950 dark:text-white">{requiredHoursPerDay || '0'} h/día</span>.
                  </div>
                </div>
              ) : null}

              {wizardStep === 'review' ? (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#59C3A5]/5 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-[#59C3A5] dark:text-blue-300" />
                    <div>
                      <p className="text-sm font-semibold text-[#59C3A5] dark:text-blue-200">Revisión final</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Confirma que la ubicación sea clara antes de agregarla a la lista.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ubicación</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{nombre || 'Sin nombre'}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedUnit?.name ?? 'Sin unidad'} / {selectedBusiness?.name ?? 'Sin negocio'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vigencia</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{contractStartDate} - {contractEndDate}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{contractDaysForForm ? formatContractDays(contractStartDate, contractEndDate) : 'Rango inválido'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Registro por ubicación</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{hasValidLocationInformation ? `${radio} m de radio` : 'Ubicación pendiente'}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hasValidLocationInformation ? `${latitud}, ${longitud}` : 'Usa Maps o tu ubicación actual'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Horario</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{requiredStartTime} - {requiredEndTime}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{requiredHoursPerDay || '0'} h/día</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-3">
                        <Settings2 className="mt-0.5 h-5 w-5 text-slate-500 dark:text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">Estado de la ubicación</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Puedes marcarla como inactiva sin borrar el historial.
                          </p>
                        </div>
                      </div>
                      <select
                        value={contractStatus}
                        onChange={(event) => setContractStatus(event.target.value as 'active' | 'inactive')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#59C3A5] focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-44"
                      >
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {wizardStep === 'review'
                  ? 'Agregar la ubicación la deja lista para guardar desde el footer.'
                  : 'Avanza solo cuando la información del paso esté completa.'}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {currentWizardStepIndex > 0 ? (
                  <Button onClick={goToPreviousWizardStep} type="button" variant="outline" className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                ) : null}
                {editingLocationId ? (
                  <Button onClick={resetDraftForm} type="button" variant="outline">
                    Cancelar edición
                  </Button>
                ) : null}
                {wizardStep === 'review' ? (
                  <Button onClick={handleAgregar} type="button" className="gap-2 bg-[#59C3A5] text-white hover:bg-[#3AAE90]" disabled={!hasCompleteFormInput}>
                    <Check className="h-4 w-4" />
                    {editingLocationId ? 'Actualizar ubicación' : 'Agregar ubicación'}
                  </Button>
                ) : (
                  <Button onClick={goToNextWizardStep} type="button" className="gap-2 bg-[#59C3A5] text-white hover:bg-[#3AAE90]" disabled={!canContinueWizard}>
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {draftLocations.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/60">
	              <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/50 lg:flex-row lg:items-center lg:justify-between">
	                <div className="space-y-3">
	                  <div>
	                    <p className="text-base font-semibold text-gray-900 dark:text-white">Ubicaciones existentes</p>
	                    <p className="text-sm text-gray-500 dark:text-gray-400">
	                      Consulta, edita o inactiva ubicaciones sin mezclarlo con el alta guiada.
	                    </p>
	                  </div>
	                  <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[#59C3A5]/20 bg-[#59C3A5]/5 px-3 py-2 dark:border-[#8FE0CA]/20 dark:bg-[#8FE0CA]/10">
	                    <span className="text-xs font-semibold uppercase tracking-wide text-[#59C3A5] dark:text-[#8FE0CA]">Fecha mostrada</span>
	                    <span className="text-sm font-semibold text-gray-950 dark:text-white">{formatDateLabel(controlDate)}</span>
	                    <span className="rounded-md bg-white px-2 py-1 font-mono text-xs text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
	                      {controlDate}
	                    </span>
	                  </div>
	                </div>
                <select
                  value={contractSiteFilter}
                  onChange={(event) => setContractSiteFilter(event.target.value as ContractSiteFilter)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white md:w-48"
                >
                  <option value="all">Todas</option>
                  <option value="assigned">Con asignación</option>
                  <option value="unassigned">Sin asignación</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px]">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Unidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Negocio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ubicación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Vigencia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Horario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Asignación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Radio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/60">
	                    {paginatedDraftLocations.map((location) => (
	                      <tr
	                        key={location.id}
	                        className="cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none dark:hover:bg-gray-700/50 dark:focus:bg-gray-700/50"
	                        role="button"
	                        tabIndex={0}
	                        onClick={() => setSelectedContractSiteId(location.id)}
	                        onKeyDown={(event) => {
	                          if (event.key === 'Enter' || event.key === ' ') {
	                            event.preventDefault();
	                            setSelectedContractSiteId(location.id);
	                          }
	                        }}
	                      >
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.unitName || '—'}</td>
	                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.businessName || '—'}</td>
	                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{location.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {location.contractStartDate} - {location.contractEndDate}
                          </span>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatContractDays(location.contractStartDate, location.contractEndDate)}</p>
                        </td>
	                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
	                          <span className="font-medium text-gray-900 dark:text-white">
	                            {location.requiredHoursPerDay} h/día
	                          </span>
	                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Preferido {location.requiredStartTime} - {location.requiredEndTime}</p>
	                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className={location.assignedEmployeeCount > 0 ? 'font-medium text-emerald-700 dark:text-emerald-300' : ''}>
                            {location.assignedEmployeeCount > 0 ? `${location.assignedEmployeeCount} asignados` : 'Sin asignar'}
                          </span>
                          {location.assignedEmployeeNames ? (
                            <p className="mt-1 max-w-56 truncate text-xs text-gray-500 dark:text-gray-400" title={location.assignedEmployeeNames}>
                              {location.assignedEmployeeNames}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            location.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {location.status === 'active' ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{location.radio} m</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
	                            <Button
	                              onClick={(event) => {
	                                event.stopPropagation();
	                                populateDraftForm(location);
	                              }}
	                              variant="ghost"
	                              size="icon"
                              type="button"
                              className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20"
                              aria-label={`Edit ${location.nombre}`}
                              title="Editar ubicación"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
	                            <Button
	                              onClick={(event) => {
	                                event.stopPropagation();
	                                handleQuitar(location);
	                              }}
	                              variant="ghost"
                              size="icon"
                              type="button"
                              disabled={location.assignedEmployeeCount > 0}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                              aria-label={`Delete ${location.nombre}`}
                              title={location.assignedEmployeeCount > 0 ? 'No se puede borrar una ubicación asignada. Márcala como inactiva.' : 'Borrar ubicación'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredDraftLocations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No hay ubicaciones con este filtro.
                </div>
              ) : null}
              {filteredDraftLocations.length > 0 ? (
                <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
                  <span>
                    Mostrando {contractSitePaginationStart}-{contractSitePaginationEnd} de {filteredDraftLocations.length} ubicaciones
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeContractSitePage <= 1}
                      onClick={() => setContractSitePage((page) => Math.max(1, page - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="min-w-20 text-center text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {safeContractSitePage} / {contractSiteTotalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeContractSitePage >= contractSiteTotalPages}
                      onClick={() => setContractSitePage((page) => Math.min(contractSiteTotalPages, page + 1))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-900 dark:text-yellow-200">
              <span className="font-medium">Tip:</span> en Google Maps, comparte la ubicación y pega el enlace. Si el enlace es corto, ábrelo primero y copia la URL final.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5]">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-white/25 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white disabled:border-white/10 disabled:text-white/45"
              disabled={isSaving}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => void handleGuardar()}
              className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5] disabled:bg-white/45 disabled:text-[#59C3A5]/60"
              disabled={(!hasChanges && !hasCompleteFormInput) || isSaving}
            >
              Guardar
            </Button>
          </div>
        </div>
	      </div>
	      </div>
      {selectedContractSite ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white text-gray-900 shadow-2xl dark:border-slate-700 dark:bg-gray-950 dark:text-gray-100">
            <div className="flex shrink-0 items-start justify-between bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">Detalle de ubicación temporal</h3>
                <p className="mt-1 text-sm text-white/80">
                  {selectedContractSite.nombre} · {formatDateLabel(controlDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractSiteId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close contract site detail"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-slate-50/70 p-5 dark:bg-slate-950/40">
	              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Unidad</p>
	                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedContractSite.unitName || 'Sin definir'}</p>
	                </div>
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Negocio</p>
	                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedContractSite.businessName || 'Sin definir'}</p>
	                </div>
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Colaboradores asignados</p>
	                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedContractSite.assignedEmployeeCount}</p>
	                </div>
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</p>
	                  <p className={`mt-1 text-sm font-semibold ${selectedContractSite.status === 'active' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
	                    {selectedContractSite.status === 'active' ? 'Activa' : 'Inactiva'}
	                  </p>
	                </div>
	              </div>

		              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
		                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
		                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Vigencia</p>
		                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
		                    {selectedContractSite.contractStartDate} - {selectedContractSite.contractEndDate}
		                  </p>
		                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
		                    {formatContractDays(selectedContractSite.contractStartDate, selectedContractSite.contractEndDate)}
		                  </p>
		                </div>
		                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
		                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Horario preferido</p>
		                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
		                    {selectedContractSite.requiredStartTime} - {selectedContractSite.requiredEndTime}
		                  </p>
		                </div>
		                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
		                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Horas de trabajo</p>
		                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedContractSite.requiredHoursPerDay} h/día</p>
		                </div>
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Radio de registro</p>
	                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedContractSite.radio} m</p>
	                </div>
	                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
	                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Coordenadas</p>
	                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
	                    {selectedContractSite.latitud}, {selectedContractSite.longitud}
	                  </p>
	                </div>
	              </div>

	              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
	                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/60">
	                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Actividad del día</p>
	                  <p className="text-xs text-gray-500 dark:text-gray-400">Asignación, entrada, salida y ubicación usada en el registro.</p>
	                </div>
	                {selectedContractSiteActivity.length > 0 ? (
	                  <div className="overflow-x-auto">
	                    <table className="w-full min-w-[860px]">
	                      <thead className="bg-white dark:bg-gray-950">
	                        <tr>
	                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Colaborador</th>
	                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Asignado</th>
	                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Entrada</th>
	                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Salida</th>
	                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ubicación registrada</th>
	                        </tr>
	                      </thead>
	                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
	                        {selectedContractSiteActivity.map(({ assignment, assignedToSite, checkedInAtSite, checkedOutAtSite }) => (
	                          <tr key={assignment.user_company_id}>
	                            <td className="px-4 py-3">
	                              <p className="text-sm font-medium text-gray-900 dark:text-white">{assignment.user_name}</p>
	                              <p className="text-xs text-gray-500 dark:text-gray-400">
	                                {assignment.user_code || 'Sin número de colaborador'}
	                                {assignment.position_title ? ` · ${assignment.position_title}` : ''}
	                              </p>
	                            </td>
	                            <td className="px-4 py-3">
	                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
	                                assignedToSite
	                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
	                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
	                              }`}>
	                                {assignedToSite ? 'Asignado' : 'Sin asignar'}
	                              </span>
	                            </td>
	                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
	                              <p>{formatDateTime(assignment.first_check_in_at)}</p>
	                              <p className={checkedInAtSite ? 'text-xs text-emerald-700 dark:text-emerald-300' : 'text-xs text-gray-500 dark:text-gray-400'}>
	                                {assignment.first_location?.name ?? 'Sin ubicación de entrada'}
	                              </p>
	                            </td>
	                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
	                              <p>{formatDateTime(assignment.last_check_out_at)}</p>
	                              <p className={checkedOutAtSite ? 'text-xs text-emerald-700 dark:text-emerald-300' : 'text-xs text-gray-500 dark:text-gray-400'}>
	                                {assignment.last_location?.name ?? 'Sin ubicación de salida'}
	                              </p>
	                            </td>
	                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
	                              <p>Entrada: {checkedInAtSite ? 'Esta ubicación' : assignment.first_location?.name ?? 'Ninguna'}</p>
	                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
	                                Salida: {checkedOutAtSite ? 'Esta ubicación' : assignment.last_location?.name ?? 'Ninguna'}
	                              </p>
	                            </td>
	                          </tr>
	                        ))}
	                      </tbody>
	                    </table>
	                  </div>
	                ) : (
	                  <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
	                    No hay colaboradores asignados a esta ubicación para {formatDateLabel(controlDate)}, ni registros de entrada o salida aquí.
	                  </div>
	                )}
	              </div>
            </div>

            <div className="flex shrink-0 justify-end bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedContractSiteId(null)}
                className="border-white/25 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
	    </>
	  );
	}
