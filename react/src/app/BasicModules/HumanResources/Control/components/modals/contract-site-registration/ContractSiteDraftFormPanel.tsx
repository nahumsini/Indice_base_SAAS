import type { RefObject } from 'react';
import type {
  BackendBusiness,
  BackendUnit,
} from '../../../../../../api/dashboard';
import type {
  ContractSiteCopy,
  ContractSiteWizardStep,
} from '../../../types/contractSiteTypes';
import { ContractSiteBasicStep } from './ContractSiteBasicStep';
import { ContractSiteLocationStep } from './ContractSiteLocationStep';
import { ContractSiteReviewStep } from './ContractSiteReviewStep';
import { ContractSiteWizardFooter } from './ContractSiteWizardFooter';
import { ContractSiteWizardStepper } from './ContractSiteWizardStepper';

interface ContractSiteDraftFormPanelProps {
  altitud: string;
  businessOptions: BackendBusiness[];
  canContinueWizard: boolean;
  contractDaysForForm: number | null;
  contractEndDate: string;
  contractStartDate: string;
  contractStatus: 'active' | 'inactive';
  copy: ContractSiteCopy;
  currentWizardStepIndex: number;
  editingLocationId: string | null;
  enlaceGoogleMaps: string;
  formSectionRef: RefObject<HTMLDivElement | null>;
  hasCompleteFormInput: boolean;
  hasValidLocationInformation: boolean;
  isExtractingCoordinates: boolean;
  isLoadingScopeOptions: boolean;
  latitud: string;
  longitud: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  nombre: string;
  parsedRadiusForForm: number;
  radio: string;
  selectedBusiness: BackendBusiness | null;
  selectedBusinessId: string;
  selectedUnit: BackendUnit | null;
  selectedUnitId: string;
  showAdvancedLocationFields: boolean;
  steps: Array<{ id: ContractSiteWizardStep; title: string; description: string }>;
  units: BackendUnit[];
  wizardStep: ContractSiteWizardStep;
  onAddOrUpdate: () => void;
  onAdvancedFieldsToggle: () => void;
  onAltitudeChange: (value: string) => void;
  onBack: () => void;
  onBusinessChange: (value: string) => void;
  onCancelEditing: () => void;
  onContinue: () => void;
  onContractEndDateChange: (value: string) => void;
  onContractStartDateChange: (value: string) => void;
  onExtractCoordinates: () => void;
  onGetCurrentLocation: () => void;
  onGoogleMapsLinkChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onRadiusChange: (value: string) => void;
  onStatusChange: (value: 'active' | 'inactive') => void;
  onStepChange: (step: ContractSiteWizardStep) => void;
  onUnitChange: (value: string) => void;
}

export function ContractSiteDraftFormPanel({
  altitud,
  businessOptions,
  canContinueWizard,
  contractDaysForForm,
  contractEndDate,
  contractStartDate,
  contractStatus,
  copy,
  currentWizardStepIndex,
  editingLocationId,
  enlaceGoogleMaps,
  formSectionRef,
  hasCompleteFormInput,
  hasValidLocationInformation,
  isExtractingCoordinates,
  isLoadingScopeOptions,
  latitud,
  longitud,
  nameInputRef,
  nombre,
  parsedRadiusForForm,
  radio,
  selectedBusiness,
  selectedBusinessId,
  selectedUnit,
  selectedUnitId,
  showAdvancedLocationFields,
  steps,
  units,
  wizardStep,
  onAddOrUpdate,
  onAdvancedFieldsToggle,
  onAltitudeChange,
  onBack,
  onBusinessChange,
  onCancelEditing,
  onContinue,
  onContractEndDateChange,
  onContractStartDateChange,
  onExtractCoordinates,
  onGetCurrentLocation,
  onGoogleMapsLinkChange,
  onLatitudeChange,
  onLongitudeChange,
  onNameChange,
  onRadiusChange,
  onStatusChange,
  onStepChange,
  onUnitChange,
}: ContractSiteDraftFormPanelProps) {
  return (
    <div ref={formSectionRef} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900/70">
        <ContractSiteWizardStepper
          copy={copy}
          currentWizardStepIndex={currentWizardStepIndex}
          steps={steps}
          title={editingLocationId ? copy.form.editTitle : copy.form.createTitle}
          wizardStep={wizardStep}
          onStepChange={onStepChange}
        />
      </div>

      <div className="p-5">
        {wizardStep === 'basic' ? (
          <ContractSiteBasicStep
            businessOptions={businessOptions}
            contractDaysForForm={contractDaysForForm}
            contractEndDate={contractEndDate}
            contractStartDate={contractStartDate}
            copy={copy}
            isLoadingScopeOptions={isLoadingScopeOptions}
            nameInputRef={nameInputRef}
            nombre={nombre}
            selectedBusiness={selectedBusiness}
            selectedBusinessId={selectedBusinessId}
            selectedUnit={selectedUnit}
            selectedUnitId={selectedUnitId}
            units={units}
            onBusinessChange={onBusinessChange}
            onContractEndDateChange={onContractEndDateChange}
            onContractStartDateChange={onContractStartDateChange}
            onNameChange={onNameChange}
            onUnitChange={onUnitChange}
          />
        ) : null}

        {wizardStep === 'location' ? (
          <ContractSiteLocationStep
            altitud={altitud}
            copy={copy}
            enlaceGoogleMaps={enlaceGoogleMaps}
            hasValidLocationInformation={hasValidLocationInformation}
            isExtractingCoordinates={isExtractingCoordinates}
            latitud={latitud}
            longitud={longitud}
            parsedRadiusForForm={parsedRadiusForForm}
            radio={radio}
            showAdvancedLocationFields={showAdvancedLocationFields}
            onAdvancedFieldsToggle={onAdvancedFieldsToggle}
            onAltitudeChange={onAltitudeChange}
            onExtractCoordinates={onExtractCoordinates}
            onGetCurrentLocation={onGetCurrentLocation}
            onGoogleMapsLinkChange={onGoogleMapsLinkChange}
            onLatitudeChange={onLatitudeChange}
            onLongitudeChange={onLongitudeChange}
            onRadiusChange={onRadiusChange}
          />
        ) : null}

        {wizardStep === 'review' ? (
          <ContractSiteReviewStep
            contractDaysForForm={contractDaysForForm}
            contractEndDate={contractEndDate}
            contractStartDate={contractStartDate}
            contractStatus={contractStatus}
            copy={copy}
            hasValidLocationInformation={hasValidLocationInformation}
            latitud={latitud}
            longitud={longitud}
            nombre={nombre}
            radio={radio}
            selectedBusiness={selectedBusiness}
            selectedUnit={selectedUnit}
            onStatusChange={onStatusChange}
          />
        ) : null}
      </div>

      <ContractSiteWizardFooter
        canContinueWizard={canContinueWizard}
        copy={copy}
        currentWizardStepIndex={currentWizardStepIndex}
        editingLocationId={editingLocationId}
        hasCompleteFormInput={hasCompleteFormInput}
        wizardStep={wizardStep}
        onAddOrUpdate={onAddOrUpdate}
        onBack={onBack}
        onCancelEditing={onCancelEditing}
        onContinue={onContinue}
      />
    </div>
  );
}
