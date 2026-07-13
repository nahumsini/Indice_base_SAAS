import type { RefObject, ReactNode } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { FailureToast } from '../../../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../../../components/SuccessToast';
import type { ContractSiteCopy } from '../../../types/contractSiteTypes';

interface ContractSiteRegistrationFrameProps {
  children: ReactNode;
  copy: ContractSiteCopy;
  errorMessage: string;
  failureToastMessage: string;
  hasChanges: boolean;
  hasCompleteFormInput: boolean;
  isExtractingCoordinates: boolean;
  isSaving: boolean;
  loadingOverlayCopy: {
    title: string;
    description: string;
  };
  locationAction: 'save' | 'load' | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  successToastMessage: string;
  onClose: () => void;
  onFailureToastClose: () => void;
  onSave: () => void;
  onSuccessToastClose: () => void;
}

export function ContractSiteRegistrationFrame({
  children,
  copy,
  errorMessage,
  failureToastMessage,
  hasChanges,
  hasCompleteFormInput,
  isExtractingCoordinates,
  isSaving,
  loadingOverlayCopy,
  locationAction,
  scrollContainerRef,
  successToastMessage,
  onClose,
  onFailureToastClose,
  onSave,
  onSuccessToastClose,
}: ContractSiteRegistrationFrameProps) {
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
        onClose={onSuccessToastClose}
      />
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={onFailureToastClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[28px] border border-[#59C3A5]/30 bg-white text-gray-900 shadow-2xl dark:border-[#59C3A5]/25 dark:bg-gray-950 dark:text-gray-100">
          <div className="flex shrink-0 items-center justify-between bg-[#59C3A5] px-6 py-4 text-white dark:bg-[#59C3A5]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white shadow-sm">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight text-white">{copy.modalTitle}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-white/80">
                  {copy.modalDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label={copy.closeModal}
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

            {children}
          </div>

          <div className="flex shrink-0 items-center justify-end bg-[#59C3A5] px-6 py-3 dark:bg-[#59C3A5]">
            <div className="flex items-center gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/25 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white disabled:border-white/10 disabled:text-white/45"
                disabled={isSaving}
              >
                {copy.actions.close}
              </Button>
              <Button
                onClick={onSave}
                className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5] disabled:bg-white/45 disabled:text-[#59C3A5]/60"
                disabled={(!hasChanges && !hasCompleteFormInput) || isSaving}
              >
                {copy.actions.save}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
