import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '../../../../../shared/context';
import { useEmployeesTranslations } from '../../hooks/useEmployeesTranslations';
import { EmployeeModalFrame } from './components/EmployeeModalFrame';
import type { WizardStep } from './components/StepProgress';
import { useEmployeeCustomJobOptions } from './hooks/useEmployeeCustomJobOptions';
import { useEmployeeModalDocuments } from './hooks/useEmployeeModalDocuments';
import { useEmployeeModalFormState } from './hooks/useEmployeeModalFormState';
import { useEmployeeModalOptions } from './hooks/useEmployeeModalOptions';
import { modalStepIcons } from './model';
import type { EmployeeModalProps } from './model';
import { getEmployeeModalStepFields, validateEmployeeFormData } from './validation';
import { BasicInfoStepFields } from './steps/BasicInfoStepFields';
import { ContactStepFields } from './steps/ContactStepFields';
import { DocumentsStepFields } from './steps/DocumentsStepFields';
import { JobStepFields } from './steps/JobStepFields';

export const EmployeeModal = CreateEmployeeModal;

export function CreateEmployeeModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = 'create',
  unitOptions,
  businessOptions,
  attendanceLocations = [],
}: EmployeeModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = useEmployeesTranslations().modal;

  const [currentStep, setCurrentStep] = useState(1);
  const {
    addCustomJobOption,
    customJobOptions,
    persistCurrentJobOptions,
  } = useEmployeeCustomJobOptions();
  const {
    formData,
    formRef,
    handleClose: closeForm,
    handleLocationChange,
    saveLocalDraft,
    setFormData,
    setStatusFeedback,
    setTouchedFields,
    statusFeedback,
    syncFormDataFromDom,
    touchedFields,
    updateField,
  } = useEmployeeModalFormState({
    businessOptions,
    initialData,
    isOpen,
    mode,
    onClose,
    unitOptions,
  });
  const {
    documentErrors,
    handleDocumentSelection,
    handleToggleDocumentRemoval,
    resetDocumentErrors,
  } = useEmployeeModalDocuments({ copy, setFormData });
  const modalSteps = useMemo<readonly WizardStep[]>(
    () => copy.steps.map((step, index) => ({
      ...step,
      icon: modalStepIcons[index] ?? User,
    })),
    [copy.steps],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentStep(1);
    resetDocumentErrors();
  }, [initialData, isOpen, mode, resetDocumentErrors]);

  const {
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
  } = useEmployeeModalOptions({
    attendanceLocations,
    businessOptions,
    copy,
    currentLanguageCode: currentLanguage.code,
    customJobOptions,
    formData,
    unitOptions,
  });

  const isCreateMode = mode === 'create';

  useEffect(() => {
    if (!selectedUnitIsCorporateOffice || formData.businessId) {
      return;
    }

    const corporateOfficeBusiness = filteredBusinessOptions.find((option) => option.tone === 'corporate');
    if (corporateOfficeBusiness) {
      updateField('businessId', corporateOfficeBusiness.value);
    }
  }, [filteredBusinessOptions, formData.businessId, selectedUnitIsCorporateOffice]);

  useEffect(() => {
    if (formData.scheduleLocationRule !== 'exact' || !formData.scheduleLocationId) {
      return;
    }

    const locationStillAvailable = scheduleLocationOptions.some((option) => option.value === formData.scheduleLocationId);
    if (!locationStillAvailable) {
      updateField('scheduleLocationId', '');
    }
  }, [formData.scheduleLocationId, formData.scheduleLocationRule, scheduleLocationOptions]);

  const validationErrors = useMemo(
    () => validateEmployeeFormData({ copy, data: formData, isCreateMode }),
    [copy, formData, isCreateMode],
  );
  const stepFields = useMemo(
    () => getEmployeeModalStepFields({ data: formData, isCreateMode }),
    [formData, isCreateMode],
  );

  const currentStepFields = stepFields[currentStep] ?? [];

  const markCurrentStepTouched = () => {
    setTouchedFields((current) => {
      const next = { ...current };
      currentStepFields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const handleClose = ({ clearDraft = true }: { clearDraft?: boolean } = {}) => {
    setCurrentStep(1);
    resetDocumentErrors();
    closeForm({ clearDraft });
  };

  const handleContinue = async () => {
    const nextFormData = syncFormDataFromDom();
    const nextValidationErrors = validateEmployeeFormData({
      copy,
      data: nextFormData,
      isCreateMode,
    });

    if (currentStepFields.some((field) => nextValidationErrors[field])) {
      markCurrentStepTouched();
      return;
    }

    persistCurrentJobOptions(nextFormData, {
      allPositionOptions,
      departmentOptions,
    });

    if (currentStep < modalSteps.length) {
      if (currentStep === 1 && isCreateMode) {
        saveLocalDraft(nextFormData);
        setStatusFeedback(copy.feedback.profileStarted);
      }
      setCurrentStep((step) => step + 1);
      return;
    }

    await Promise.resolve(onSave(nextFormData));
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  const currentStepValid = currentStepFields.every((field) => !validationErrors[field]);
  const primaryButtonLabel = currentStep === 1
    ? copy.buttons.continue
    : currentStep === modalSteps.length
      ? isCreateMode
        ? copy.buttons.createEmployee
        : copy.buttons.save
      : copy.buttons.next;

  return (
    <EmployeeModalFrame
      copy={copy}
      currentStep={currentStep}
      currentStepValid={currentStepValid}
      formRef={formRef}
      mode={mode}
      primaryButtonLabel={primaryButtonLabel}
      statusFeedback={statusFeedback}
      steps={modalSteps}
      onBack={() => setCurrentStep((step) => Math.max(1, step - 1))}
      onClose={() => handleClose()}
      onStepInvalid={markCurrentStepTouched}
      onStepSelect={setCurrentStep}
      onSubmit={(event) => {
        event.preventDefault();
        void handleContinue();
      }}
    >
          {currentStep === 1 ? (
            <BasicInfoStepFields
              copy={copy}
              formData={formData}
              touchedFields={touchedFields}
              validationErrors={validationErrors}
              onFieldChange={updateField}
            />
          ) : null}

          {currentStep === 2 ? (
            <ContactStepFields
              copy={copy}
              countryOptions={countryOptions}
              formData={formData}
              touchedFields={touchedFields}
              validationErrors={validationErrors}
              onFieldChange={updateField}
              onLocationChange={handleLocationChange}
            />
          ) : null}

          {currentStep === 3 ? (
            <JobStepFields
              copy={copy}
              businessBelongingHelper={businessBelongingHelper}
              businessBelongingHelperTone={businessBelongingHelperTone}
              departmentOptions={departmentOptions}
              filteredBusinessOptions={filteredBusinessOptions}
              formData={formData}
              isCreateMode={isCreateMode}
              positionOptions={positionOptions}
              scheduleLocationOptions={scheduleLocationOptions}
              selectedBusinessOption={selectedBusinessOption}
              selectedUnitIsCorporateOffice={selectedUnitIsCorporateOffice}
              touchedFields={touchedFields}
              unitOptionsWithBelonging={unitOptionsWithBelonging}
              validationErrors={validationErrors}
              onAddCustomJobOption={(kind, value) => (
                addCustomJobOption(
                  kind,
                  value,
                  kind === 'departments' ? departmentOptions : allPositionOptions,
                )
              )}
              onFieldChange={updateField}
            />
          ) : null}

          {currentStep === 4 ? (
            <DocumentsStepFields
              copy={copy}
              documentErrors={documentErrors}
              documents={formData.documents}
              onDocumentSelection={handleDocumentSelection}
              onToggleDocumentRemoval={handleToggleDocumentRemoval}
            />
          ) : null}
    </EmployeeModalFrame>
  );
}
