import type { RefObject, ReactNode } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../../../components/indice-modal';
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
      <IndiceModalFrame
        bodyClassName="space-y-6"
        busy={isSaving || isExtractingCoordinates || locationAction !== null}
        closeLabel={copy.closeModal}
        contentClassName="max-h-[92dvh] sm:max-w-[1180px]"
        description={copy.modalDescription}
        footer={(
          <Button
            onClick={onSave}
            disabled={(!hasChanges && !hasCompleteFormInput) || isSaving}
          >
            {copy.actions.save}
          </Button>
        )}
        footerLeading={(
          <Button
            onClick={onClose}
            variant="outline"
            className="h-11 rounded-xl border-white bg-white px-5 text-sm font-semibold text-slate-600 hover:bg-white/90"
            disabled={isSaving}
          >
            {copy.actions.close}
          </Button>
        )}
        footerSummary={hasChanges ? copy.stats.pendingChanges : copy.stats.noPendingChanges}
        icon={<MapPin className="h-5 w-5" />}
        modalType="wizard"
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        open
        title={copy.modalTitle}
        tone="aqua"
      >
          <div ref={scrollContainerRef} className="space-y-6">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
                {errorMessage}
              </div>
            ) : null}

            {children}
          </div>
      </IndiceModalFrame>
    </>
  );
}
