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
    canIdentify,
    clearFailureToast,
    clearSuccessToast,
    copy,
    credentialPlaceholder,
    credentialValue,
    currentTime,
    detectedLocale,
    errorMessage,
    evidenceMode,
    expiresAt,
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
    hasIdentityEvidence,
    identificationToken,
    identifiedHrUser,
    isLoading,
    isOnline,
    isSessionExpiring,
    kioskGreeting,
    kioskLocationLabel,
    kioskMessage,
    loadingDescription,
    loadingTitle,
    localeOptions,
    locationButtonLabel,
    locationHelpText,
    locationState,
    nextActionLabel,
    requestLocation,
    resetFlow,
    selectedLocale,
    selectedMethod,
    setCredentialValue,
    setKioskLocale,
    showFailureToast,
    successMessage,
    verificationLocationLabel,
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
        maxWidthClassName="max-w-3xl"
        loadingOverlay={null}
        banners={(
          <>
            {!isOnline ? (
              <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                {selectedLocale.startsWith('es')
                  ? 'Sin conexión. Las acciones del kiosko están pausadas.'
                  : 'Offline. Kiosk actions are paused.'}
              </div>
            ) : null}
            {isSessionExpiring ? (
              <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100">
                {selectedLocale.startsWith('es')
                  ? 'Tu sesión está por vencer. Interactúa para continuar.'
                  : 'Your session is about to expire. Interact to continue.'}
              </div>
            ) : null}
          </>
        )}
        header={(
          <PublicKioskHeader
              bootstrap={bootstrap}
              copy={copy}
              currentTime={currentTime}
              detectedLocale={detectedLocale}
              kioskGreeting={kioskGreeting}
              kioskMessage={kioskMessage}
              localeOptions={localeOptions}
              selectedLocale={selectedLocale}
              onLocaleChange={setKioskLocale}
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
                canIdentify={canIdentify && isOnline}
                copy={copy}
                credentialPlaceholder={credentialPlaceholder}
                credentialValue={credentialValue}
                errorMessage={errorMessage}
                evidenceMode={evidenceMode}
                expiresAt={expiresAt}
                faceErrorMessage={faceErrorMessage}
                faceStatus={faceStatus}
                faceVerificationSessionId={faceVerificationSessionId}
                fallbackPhotoUpload={fallbackPhotoUpload}
                hasIdentityEvidence={hasIdentityEvidence}
                identificationToken={identificationToken}
                identifiedHrUser={identifiedHrUser}
                isLoading={isLoading}
                kioskLocationLabel={kioskLocationLabel}
                locationButtonLabel={locationButtonLabel}
                locationHelpText={locationHelpText}
                locationState={locationState}
                nextActionLabel={nextActionLabel}
                selectedLocale={selectedLocale}
                selectedMethod={selectedMethod}
                verificationLocationLabel={verificationLocationLabel}
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
