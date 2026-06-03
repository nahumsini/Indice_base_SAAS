import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { flushSync } from 'react-dom';
import type { ManualLocationValues } from '../../../../../../components/ManualLocationFields';
import { resolveProfileCountry } from '../../../../../../shared/profileCountries';
import { normalizePhoneInputForCountry } from '../../../../../../shared/validation/phone';
import {
  createEmptyEmployeeFormData,
  dateInputValue,
  isCorporateHeadquartersLabel,
  isCorporateOfficeUnitLabel,
} from '../model';
import type {
  EmployeeFieldKey,
  EmployeeFormData,
  EmployeeFormFieldChangeHandler,
  EmployeeModalProps,
} from '../types';
import { readEmployeeFormDataFromDom } from './readEmployeeFormDataFromDom';

interface UseEmployeeModalFormStateParams {
  businessOptions: EmployeeModalProps['businessOptions'];
  initialData?: EmployeeFormData | null;
  isOpen: boolean;
  mode: EmployeeModalProps['mode'];
  onClose: () => void;
  unitOptions: EmployeeModalProps['unitOptions'];
}

export interface EmployeeModalFormState {
  formData: EmployeeFormData;
  formRef: ReturnType<typeof useRef<HTMLFormElement | null>>;
  setFormData: Dispatch<SetStateAction<EmployeeFormData>>;
  setStatusFeedback: Dispatch<SetStateAction<string>>;
  setTouchedFields: Dispatch<SetStateAction<Partial<Record<EmployeeFieldKey, boolean>>>>;
  statusFeedback: string;
  syncFormDataFromDom: () => EmployeeFormData;
  touchedFields: Partial<Record<EmployeeFieldKey, boolean>>;
  updateField: EmployeeFormFieldChangeHandler;
  handleLocationChange: (updates: Partial<ManualLocationValues>) => void;
  handleClose: (options?: { clearDraft?: boolean }) => void;
  handleSaveDraft: (feedback: string) => void;
  saveLocalDraft: (data: EmployeeFormData) => void;
}

export function useEmployeeModalFormState({
  businessOptions,
  initialData,
  isOpen,
  mode,
  onClose,
  unitOptions,
}: UseEmployeeModalFormStateParams): EmployeeModalFormState {
  const formRef = useRef<HTMLFormElement | null>(null);
  const formDataRef = useRef<EmployeeFormData>(createEmptyEmployeeFormData());
  const localDraftDataRef = useRef<EmployeeFormData | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(createEmptyEmployeeFormData());
  const [touchedFields, setTouchedFields] = useState<Partial<Record<EmployeeFieldKey, boolean>>>({});
  const [statusFeedback, setStatusFeedback] = useState('');
  const resolvedCountry = resolveProfileCountry(formData.registrationCountry);
  const modalUnitOptions = (unitOptions ?? []).filter((option) => option.value !== 'all' && option.value !== 'all-units');
  const modalBusinessOptions = (businessOptions ?? []).filter(
    (option) => option.value !== 'all' && option.value !== 'all-businesses',
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextInitialData = initialData
      ? structuredClone(initialData)
      : localDraftDataRef.current && mode === 'create'
        ? structuredClone(localDraftDataRef.current)
        : createEmptyEmployeeFormData();
    formDataRef.current = nextInitialData;
    setFormData(nextInitialData);
    setTouchedFields({});
    setStatusFeedback('');
  }, [initialData, isOpen, mode]);

  useEffect(() => {
    if (!statusFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setStatusFeedback(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [statusFeedback]);

  const syncFormDataFromDom = () => {
    const formElement = formRef.current;
    if (!formElement) {
      return formDataRef.current;
    }

    const nextFormData = readEmployeeFormDataFromDom(formElement, formDataRef.current);

    formDataRef.current = nextFormData;
    flushSync(() => {
      setFormData(nextFormData);
    });
    return nextFormData;
  };

  const updateField: EmployeeFormFieldChangeHandler = (field, value) => {
    setFormData((current) => {
      if (field === 'registrationCountry') {
        const nextCountry = resolveProfileCountry(String(value ?? ''));
        const next = {
          ...current,
          registrationCountry: String(value ?? ''),
          stateProvince: '',
          city: '',
          postalCode: '',
          mobilePhone: nextCountry ? normalizePhoneInputForCountry(current.mobilePhone, nextCountry) : current.mobilePhone,
          alternatePhone: nextCountry ? normalizePhoneInputForCountry(current.alternatePhone, nextCountry) : current.alternatePhone,
          emergencyContactPhone: nextCountry ? normalizePhoneInputForCountry(current.emergencyContactPhone, nextCountry) : current.emergencyContactPhone,
        };
        formDataRef.current = next;
        return next;
      }

      if (field === 'mobilePhone' || field === 'alternatePhone' || field === 'emergencyContactPhone') {
        const next = {
          ...current,
          [field]: resolvedCountry
            ? normalizePhoneInputForCountry(String(value ?? ''), resolvedCountry)
            : String(value ?? ''),
        };
        formDataRef.current = next;
        return next;
      }

      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'businessUnitId') {
        const nextUnitId = String(value ?? '').trim();
        const nextUnit = modalUnitOptions.find((option) => option.value === nextUnitId);
        const corporateOfficeBusiness = modalBusinessOptions.find((option) => (
          (option.unitId === nextUnitId || option.unit_id === nextUnitId)
          && isCorporateHeadquartersLabel(option.label)
        ));
        const currentBusinessMatchesUnit = modalBusinessOptions.some(
          (option) => (
            option.value === current.businessId
            && (option.unitId === nextUnitId || option.unit_id === nextUnitId)
            && !isCorporateHeadquartersLabel(option.label)
          ),
        );

        next.businessId = nextUnit && isCorporateOfficeUnitLabel(nextUnit.label)
          ? corporateOfficeBusiness?.value ?? ''
          : currentBusinessMatchesUnit
            ? current.businessId
            : '';
        next.scheduleLocationId = '';
      }

      if (field === 'businessId') {
        next.scheduleLocationId = '';
      }

      if (field === 'hireDate') {
        const nextHireDate = String(value ?? '').trim();
        if (!current.scheduleStartDate || current.scheduleStartDate === current.hireDate) {
          next.scheduleStartDate = nextHireDate;
        }
        if (!current.scheduleEndDate || current.scheduleEndDate === current.hireDate || current.scheduleEndDate < nextHireDate) {
          next.scheduleEndDate = nextHireDate;
        }
      }

      if (field === 'scheduleOnHire' && value === true && !current.scheduleStartDate) {
        const nextScheduleDate = current.hireDate || dateInputValue();
        next.scheduleStartDate = nextScheduleDate;
        next.scheduleEndDate = current.scheduleEndDate || nextScheduleDate;
      }
      if (field === 'scheduleOnHire' && value === true && current.scheduleStartDate && !current.scheduleEndDate) {
        next.scheduleEndDate = current.scheduleStartDate;
      }

      if (field === 'scheduleStartDate') {
        const nextStartDate = String(value ?? '').trim();
        if (!current.scheduleEndDate || current.scheduleEndDate < nextStartDate) {
          next.scheduleEndDate = nextStartDate;
        }
      }

      if (field === 'scheduleLocationRule' && value !== 'exact') {
        next.scheduleLocationId = '';
      }

      formDataRef.current = next;
      return next;
    });

    if (field in touchedFields) {
      setTouchedFields((current) => ({
        ...current,
        [field as EmployeeFieldKey]: true,
      }));
    }
  };

  const handleLocationChange = (updates: Partial<ManualLocationValues>) => {
    const current = formDataRef.current;
    const next = {
      ...current,
      registrationCountry: updates.pais ?? current.registrationCountry,
      stateProvince: updates.estado ?? current.stateProvince,
      city: updates.ciudad ?? current.city,
      postalCode: updates.cp ?? current.postalCode,
    };

    if (updates.pais !== undefined) {
      const nextCountry = resolveProfileCountry(updates.pais);
      next.mobilePhone = nextCountry
        ? normalizePhoneInputForCountry(current.mobilePhone, nextCountry)
        : current.mobilePhone;
      next.alternatePhone = nextCountry
        ? normalizePhoneInputForCountry(current.alternatePhone, nextCountry)
        : current.alternatePhone;
      next.emergencyContactPhone = nextCountry
        ? normalizePhoneInputForCountry(current.emergencyContactPhone, nextCountry)
        : current.emergencyContactPhone;
    }

    formDataRef.current = next;
    setFormData(next);
  };

  const handleClose = ({ clearDraft = true }: { clearDraft?: boolean } = {}) => {
    if (clearDraft) {
      localDraftDataRef.current = null;
    }
    setTouchedFields({});
    setStatusFeedback('');
    formDataRef.current = createEmptyEmployeeFormData();
    onClose();
  };

  const handleSaveDraft = (feedback: string) => {
    const nextFormData = syncFormDataFromDom();
    localDraftDataRef.current = nextFormData;
    setStatusFeedback(feedback);
    onClose();
  };

  const saveLocalDraft = (data: EmployeeFormData) => {
    localDraftDataRef.current = data;
  };

  return {
    formData,
    formRef,
    handleClose,
    handleLocationChange,
    handleSaveDraft,
    saveLocalDraft,
    setFormData,
    setStatusFeedback,
    setTouchedFields,
    statusFeedback,
    syncFormDataFromDom,
    touchedFields,
    updateField,
  };
}
