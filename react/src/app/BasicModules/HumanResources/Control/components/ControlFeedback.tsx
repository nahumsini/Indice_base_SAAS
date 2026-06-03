import { Button } from '../../../../components/ui/button';
import { FailureToast } from '../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../components/SuccessToast';

export interface ControlFeedbackProps {
  errorMessage: string;
  failureToastMessage: string;
  isOverlayVisible: boolean;
  loadingOverlayDescription: string;
  loadingOverlayTitle: string;
  retryLabel: string;
  showErrorBanner: boolean;
  successMessage: string;
  onDismissFailure: () => void;
  onDismissSuccess: () => void;
  onRetry: () => void;
}

export function ControlFeedback({
  errorMessage,
  failureToastMessage,
  isOverlayVisible,
  loadingOverlayDescription,
  loadingOverlayTitle,
  retryLabel,
  showErrorBanner,
  successMessage,
  onDismissFailure,
  onDismissSuccess,
  onRetry,
}: ControlFeedbackProps) {
  return (
    <>
      <LoadingBarOverlay
        isVisible={isOverlayVisible}
        title={loadingOverlayTitle}
        description={loadingOverlayDescription}
      />

      {showErrorBanner ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        </div>
      ) : null}

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={onDismissSuccess}
      />

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={onDismissFailure}
      />
    </>
  );
}
