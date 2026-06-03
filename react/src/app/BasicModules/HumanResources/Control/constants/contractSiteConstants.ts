import type { ContractSiteCopy, ContractSiteWizardStep } from '../types/contractSiteTypes';

export const contractSitesPerPage = 10;
export const LOCATION_MODAL_MINIMUM_LOADING_MS = 2000;
export const contractSiteWizardStepIds: ContractSiteWizardStep[] = ['basic', 'location', 'review'];

export const getContractSiteWizardSteps = (copy: ContractSiteCopy) => contractSiteWizardStepIds.map((id) => ({
  id,
  ...copy.wizard.steps[id],
}));
