import { FailureToast } from '../../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../../components/SuccessToast';
import { KioskPublicShell } from '../../../../../components/kiosk-engine/KioskPublicShell';
import { PublicKioskHeader } from './PublicKioskHeader';
import { PublicKioskIdentityPanel } from './PublicKioskIdentityPanel';
import { usePublicKioskController } from './hooks/usePublicKioskController';

export default function Kiosk() {
  const {
    activeActivityLocation,
    activityStateLabel,
    activeTodayActivity,
    bootstrap,
    busyState,
    canCheckIn,
    canCheckOut,
    clearFailureToast,
    clearSuccessToast,
    copy,
    credentialPlaceholder,
    credentialValue,
    currentTime,
    errorMessage,
    evidenceMode,
    faceErrorMessage,
    faceStatus,
    faceVerificationSessionId,
    failureToastMessage,
    fallbackPhotoUpload,
    formatActivityDate,
    formatActivityTime,
    handleEvidenceModeChange,
    handleFaceError,
    handleFaceRestart,
    handleFaceVerification,
    handleIdentify,
    handlePunch,
    identificationToken,
    identifiedHrUser,
    isLoading,
    isOnline,
    isSessionExpiring,
    kioskLocationLabel,
    kioskSteps,
    loadingDescription,
    loadingTitle,
    locationButtonLabel,
    locationState,
    nextActionLabel,
    requestLocation,
    resetFlow,
    selectedLocale,
    setCredentialValue,
    showFailureToast,
    successMessage,
  } = usePublicKioskController();
  return (
    <>
      <LoadingBarOverlay
        isVisible={isLoading || busyState !== 'idle'}
        title={loadingTitle}
        description={loadingDescription}
      />

      <SuccessToast
        isVisible={Boolean(successMessage)}
        message={successMessage}
        onClose={clearSuccessToast}
        className="top-5 bottom-auto left-1/2 right-auto z-[120] block w-auto min-w-0 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 p-3 sm:bottom-auto sm:right-auto"
        durationMs={2600}
      />

      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={clearFailureToast}
        className="top-5 bottom-auto left-1/2 right-auto z-[120] block w-auto min-w-0 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 p-3 sm:bottom-auto sm:right-auto"
        durationMs={4200}
      />

      <KioskPublicShell
        maxWidthClassName="max-w-[480px]"
        minimalContent={!identifiedHrUser}
        loadingOverlay={null}
        banners={(
          <>
            {!isOnline ? (
              <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                {copy.network.offline}
              </div>
            ) : null}
            {isSessionExpiring ? (
              <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
                {copy.network.sessionExpiring}
              </div>
            ) : null}
          </>
        )}
        header={(
          <PublicKioskHeader
              bootstrap={bootstrap}
              copy={copy}
              currentTime={currentTime}
              selectedLocale={selectedLocale}
          />
        )}
      >
        <PublicKioskIdentityPanel
                activeActivityLocation={activeActivityLocation}
                activityStateLabel={activityStateLabel}
                activeTodayActivity={activeTodayActivity}
                busyState={busyState}
                canCheckIn={canCheckIn && isOnline}
                canCheckOut={canCheckOut && isOnline}
                copy={copy}
                credentialPlaceholder={credentialPlaceholder}
                credentialValue={credentialValue}
                errorMessage={errorMessage}
                evidenceMode={evidenceMode}
                faceErrorMessage={faceErrorMessage}
                faceStatus={faceStatus}
                faceVerificationSessionId={faceVerificationSessionId}
                fallbackPhotoUpload={fallbackPhotoUpload}
                identificationToken={identificationToken}
                identifiedHrUser={identifiedHrUser}
                isLoading={isLoading}
                kioskLocationLabel={kioskLocationLabel}
                kioskSteps={kioskSteps}
                locationButtonLabel={locationButtonLabel}
                locationState={locationState}
                nextActionLabel={nextActionLabel}
                formatActivityDate={formatActivityDate}
                formatActivityTime={formatActivityTime}
                onCredentialChange={setCredentialValue}
                onEvidenceModeChange={handleEvidenceModeChange}
                onFaceError={handleFaceError}
                onFaceRestart={handleFaceRestart}
                onFaceVerification={handleFaceVerification}
                onIdentify={() => void handleIdentify()}
                onPhotoError={showFailureToast}
                onPunch={(eventType) => void handlePunch(eventType)}
                onRequestLocation={() => void requestLocation()}
                onReset={() => resetFlow()}
        />
      </KioskPublicShell>
    </>
  );
}
