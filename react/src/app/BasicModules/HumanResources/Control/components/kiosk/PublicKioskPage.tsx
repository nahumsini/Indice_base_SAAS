import { FailureToast } from '../../../../../components/FailureToast';
import { LoadingBarOverlay } from '../../../../../components/LoadingBarOverlay';
import { SuccessToast } from '../../../../../components/SuccessToast';
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

      <main className="min-h-dvh bg-slate-100 px-0 py-0 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-4 sm:py-4">
        <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col sm:min-h-0">
          <section className="flex min-h-dvh flex-col overflow-hidden bg-white dark:bg-slate-950 sm:min-h-0 sm:rounded-lg sm:border sm:border-slate-200/80 sm:shadow-sm sm:dark:border-slate-700/80">
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

            <div className="flex min-h-0 flex-1 bg-slate-50/80 px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900/55 sm:px-5 sm:py-5">
              <PublicKioskIdentityPanel
                activeActivityLocation={activeActivityLocation}
                activityStateLabel={activityStateLabel}
                activeTodayActivity={activeTodayActivity}
                busyState={busyState}
                canCheckIn={canCheckIn}
                canCheckOut={canCheckOut}
                canIdentify={canIdentify}
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
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
