import { useRef, useState } from 'react';
import type {
  BackendBusiness,
  BackendUnit,
} from '../../../../api/dashboard';
import type {
  ContractSiteCopy,
  ContractSiteWizardStep,
  DraftLocation,
} from '../types/contractSiteTypes';
import {
  buildDraftLocationFromForm,
  todayInputValue,
} from '../utils/contractSiteUtils';

interface UseContractSiteDraftFormInput {
  controlDate: string;
  copy: ContractSiteCopy;
}

export function useContractSiteDraftForm({
  controlDate,
  copy,
}: UseContractSiteDraftFormInput) {
  const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
  const [removedLocationIds, setRemovedLocationIds] = useState<number[]>([]);
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
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<ContractSiteWizardStep>('basic');
  const [showAdvancedLocationFields, setShowAdvancedLocationFields] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

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

  const resetModalDraftState = (locationDrafts: DraftLocation[]) => {
    setDraftLocations(locationDrafts);
    setRemovedLocationIds([]);
    resetDraftForm();
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
    scrollToFormStart();
  };

  const buildDraftFromForm = ({
    selectedBusiness,
    selectedUnit,
  }: {
    selectedBusiness: BackendBusiness | null;
    selectedUnit: BackendUnit | null;
  }) => buildDraftLocationFromForm({
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
  });

  const addOrUpdateDraft = (draft: DraftLocation) => {
    setDraftLocations((current) => (
      editingLocationId
        ? current.map((location) => (
          location.id === editingLocationId
            ? draft
            : location
        ))
        : [...current, draft]
    ));
  };

  const removeDraft = (location: DraftLocation) => {
    setDraftLocations((current) => current.filter((item) => item.id !== location.id));
    if (location.persistedId) {
      setRemovedLocationIds((current) => Array.from(new Set([...current, location.persistedId!])));
    }
    if (editingLocationId === location.id) {
      resetDraftForm();
    }
  };

  const handleContractStartDateChange = (nextStartDate: string) => {
    setContractStartDate(nextStartDate);
    if (contractEndDate && nextStartDate && contractEndDate < nextStartDate) {
      setContractEndDate(nextStartDate);
    }
  };

  return {
    addOrUpdateDraft,
    altitud,
    buildDraftFromForm,
    contractEndDate,
    contractStartDate,
    contractStatus,
    draftLocations,
    editingLocationId,
    enlaceGoogleMaps,
    formSectionRef,
    handleContractStartDateChange,
    latitud,
    longitud,
    nameInputRef,
    nombre,
    populateDraftForm,
    radio,
    removedLocationIds,
    removeDraft,
    resetDraftForm,
    resetModalDraftState,
    scrollContainerRef,
    selectedBusinessId,
    selectedUnitId,
    setAltitud,
    setContractEndDate,
    setContractStatus,
    setDraftLocations,
    setEnlaceGoogleMaps,
    setLatitud,
    setLongitud,
    setNombre,
    setRadio,
    setSelectedBusinessId,
    setSelectedUnitId,
    setShowAdvancedLocationFields,
    setWizardStep,
    showAdvancedLocationFields,
    wizardStep,
  };
}
