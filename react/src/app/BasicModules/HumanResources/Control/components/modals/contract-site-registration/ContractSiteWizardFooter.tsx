import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type {
  ContractSiteCopy,
  ContractSiteWizardStep,
} from '../../../types/contractSiteTypes';

interface ContractSiteWizardFooterProps {
  canContinueWizard: boolean;
  copy: ContractSiteCopy;
  currentWizardStepIndex: number;
  editingLocationId: string | null;
  hasCompleteFormInput: boolean;
  wizardStep: ContractSiteWizardStep;
  onAddOrUpdate: () => void;
  onBack: () => void;
  onCancelEditing: () => void;
  onContinue: () => void;
}

export function ContractSiteWizardFooter({
  canContinueWizard,
  copy,
  currentWizardStepIndex,
  editingLocationId,
  hasCompleteFormInput,
  wizardStep,
  onAddOrUpdate,
  onBack,
  onCancelEditing,
  onContinue,
}: ContractSiteWizardFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {wizardStep === 'review'
          ? copy.form.reviewFooterHint
          : copy.form.stepFooterHint}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {currentWizardStepIndex > 0 ? (
          <Button onClick={onBack} type="button" variant="outline" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            {copy.form.back}
          </Button>
        ) : null}
        {editingLocationId ? (
          <Button onClick={onCancelEditing} type="button" variant="outline">
            {copy.form.cancelEditing}
          </Button>
        ) : null}
        {wizardStep === 'review' ? (
          <Button onClick={onAddOrUpdate} type="button" className="gap-2 bg-[#59C3A5] text-slate-950 hover:bg-[#3AAE90]" disabled={!hasCompleteFormInput}>
            <Check className="h-4 w-4" />
            {editingLocationId ? copy.form.updateLocation : copy.form.addLocation}
          </Button>
        ) : (
          <Button onClick={onContinue} type="button" className="gap-2 bg-[#59C3A5] text-slate-950 hover:bg-[#3AAE90]" disabled={!canContinueWizard}>
            {copy.form.continue}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
