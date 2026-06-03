import { FailureToast } from '../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../components/SuccessToast';
import { Button } from '../../../../components/ui/button';

interface EmployeesFeedbackLayerProps {
  failureMessage: string;
  isBusy: boolean;
  loadError: string;
  loadingDescription: string;
  loadingTitle: string;
  onCloseFailure: () => void;
  onCloseSuccess: () => void;
  onRetryLoad: () => void;
  retryLoadLabel: string;
  successMessage: string;
}

export function EmployeesFeedbackLayer({
  failureMessage,
  isBusy,
  loadError,
  loadingDescription,
  loadingTitle,
  onCloseFailure,
  onCloseSuccess,
  onRetryLoad,
  retryLoadLabel,
  successMessage,
}: EmployeesFeedbackLayerProps) {
  return (
    <>
      <LoadingBarOverlay
        isVisible={isBusy}
        title={loadingTitle}
        description={loadingDescription}
      />

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={onCloseSuccess}
      />

      <FailureToast
        isVisible={Boolean(failureMessage)}
        message={failureMessage}
        onClose={onCloseFailure}
      />

      {loadError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={onRetryLoad}>
              {retryLoadLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
