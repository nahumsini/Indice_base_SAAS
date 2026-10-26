import { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'lucide-react';
import { useLanguage } from '../../../../../shared/context';
import { useEmployeesTranslations } from '../../hooks/useEmployeesTranslations';
import { EmployeeModalFrame } from './components/EmployeeModalFrame';
import type { WizardStep } from './components/StepProgress';
import { useEmployeeCustomJobOptions } from './hooks/useEmployeeCustomJobOptions';
import { useEmployeeModalDocuments } from './hooks/useEmployeeModalDocuments';
import { useEmployeeModalFormState } from './hooks/useEmployeeModalFormState';
import { useEmployeeModalOptions } from './hooks/useEmployeeModalOptions';
import { focusFirstInvalidControl } from '../../../../../components/indice-modal/modalFormFeedback';
import { getFormFeedbackCopy } from '../../../../../components/indice-modal/formFeedbackCopy';
import { normalizeErrorMessage } from '../../utils/employees.utils';
import { modalStepIcons } from './model';
import type { EmployeeModalProps } from './model';
import { getEmployeeModalStepFields, validateEmployeeFormData } from './validation';
import { BasicInfoStepFields } from './steps/BasicInfoStepFields';
import { ContactStepFields } from './steps/ContactStepFields';
import { DocumentsStepFields } from './steps/DocumentsStepFields';
import { JobStepFields } from './steps/JobStepFields';

import { useEmployeeCanadaPayrollProfile } from './hooks/useEmployeeCanadaPayrollProfile';
import { EmployeeCanadaPayrollSection } from './steps/EmployeeCanadaPayrollSection';
import { canadaPayrollProfileCopy } from '../../../Payroll/components/canadaPayrollProfileCopy';
import { useEmployeeMexicoPayrollProfile } from './hooks/useEmployeeMexicoPayrollProfile';
import { EmployeeMexicoPayrollSection } from './steps/EmployeeMexicoPayrollSection';
import { mexicoPayrollProfileCopy } from '../../../Payroll/components/mexicoPayrollProfileCopy';
import { IndiceModalFrame } from '../../../../../components/indice-modal';
import { Button } from '../../../../../components/ui/button';

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
  const employeeCopy = useEmployeesTranslations();
  const copy = employeeCopy.modal;
  const feedbackCopy = getFormFeedbackCopy(currentLanguage.code);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [discardFiscalDraft, setDiscardFiscalDraft] = useState(false);

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
    setDiscardFiscalDraft(false);
    setSubmitError('');
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
  const mexicoEligible = !isCreateMode && formData.registrationCountry?.trim().toUpperCase() === 'MX'
    && formData.payrollTreatment === 'fiscal_payroll';
  const mexicoDraft = useEmployeeMexicoPayrollProfile({ employeeId: initialData?.employeeId, isOpen, eligible: mexicoEligible });
  const mexicoCopy = mexicoPayrollProfileCopy(currentLanguage.code);
  const canadaEligible = !isCreateMode && formData.registrationCountry?.trim().toUpperCase() === 'CA'
    && formData.payrollTreatment === 'fiscal_payroll';
  const canadaDraft = useEmployeeCanadaPayrollProfile({ employeeId: initialData?.employeeId, isOpen, eligible: canadaEligible, frequency: formData.payPeriod });
  const canadaCopy = canadaPayrollProfileCopy(currentLanguage.code);
  const validateFiscalDraft = () => {
    if (!canadaDraft.valid()) {
      setCurrentStep(3); setSubmitError(canadaCopy.incomplete);
      window.requestAnimationFrame(canadaDraft.focusInvalid); return false;
    }
    if (mexicoDraft.valid()) return true;
    setCurrentStep(3);
    setSubmitError(mexicoCopy.embeddedIncomplete);
    window.requestAnimationFrame(mexicoDraft.focusInvalid);
    return false;
  };

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
    window.requestAnimationFrame(() => focusFirstInvalidControl(formRef.current));
    setTouchedFields((current) => {
      const next = { ...current };
      currentStepFields.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const handleClose = ({ clearDraft = true }: { clearDraft?: boolean } = {}) => {
    if (savingRef.current) return;
    setDiscardFiscalDraft(false);
    setCurrentStep(1);
    setSubmitError('');
    resetDocumentErrors();
    closeForm({ clearDraft });
  };

  const handleContinue = async () => {
    if (savingRef.current) return;
    setSubmitError('');
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

    if (currentStep >= 3 && !validateFiscalDraft()) return;

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

    savingRef.current = true;
    setIsSaving(true);
    try {
      await Promise.resolve(onSave({ ...nextFormData, mexicoPayrollProfile: mexicoDraft.saveRequest(), canadaPayrollProfile: canadaDraft.saveRequest() }));
      savingRef.current = false;
      handleClose();
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error, employeeCopy.errorMessages.save));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  if (discardFiscalDraft) return <IndiceModalFrame open modalType="confirmation" tone="aqua"
    title={mexicoCopy.discard} description={canadaDraft.dirty ? canadaCopy.title : mexicoCopy.title} icon={<User className="h-5 w-5" />}
    closeLabel={mexicoCopy.keep} onOpenChange={open => { if (!open) setDiscardFiscalDraft(false); }}
    footerLeading={<Button variant="outline" onClick={() => setDiscardFiscalDraft(false)}>{mexicoCopy.keep}</Button>}
    footer={<Button data-modal-destructive="true" onClick={() => handleClose()}>{mexicoCopy.leave}</Button>}>
    <p className="p-5 text-sm">{canadaDraft.dirty ? canadaCopy.help : mexicoCopy.embeddedHelp}</p>
  </IndiceModalFrame>;

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
      busy={isSaving}
      submitError={submitError}
      copy={copy}
      currentStep={currentStep}
      currentStepValid={currentStepValid}
      formRef={formRef}
      mode={mode}
      primaryButtonLabel={isSaving ? feedbackCopy.saving : primaryButtonLabel}
      statusFeedback={statusFeedback}
      steps={modalSteps}
      onBack={() => setCurrentStep((step) => Math.max(1, step - 1))}
      onClose={() => { if (savingRef.current) return; if (mexicoDraft.dirty || canadaDraft.dirty) setDiscardFiscalDraft(true); else handleClose(); }}
      onStepInvalid={markCurrentStepTouched}
      onStepSelect={step => { if (step > 3 && !validateFiscalDraft()) return; setCurrentStep(step); }}
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

          <div hidden={currentStep !== 3}>
            <JobStepFields
              fiscalPayrollProfile={mexicoEligible ? <EmployeeMexicoPayrollSection draft={mexicoDraft} locale={currentLanguage.code} busy={isSaving} /> : canadaEligible ? <EmployeeCanadaPayrollSection draft={canadaDraft} locale={currentLanguage.code} busy={isSaving} /> : undefined}
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
          </div>

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
