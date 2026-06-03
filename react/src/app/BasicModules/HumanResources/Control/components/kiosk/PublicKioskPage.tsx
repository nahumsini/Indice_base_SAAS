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
    kioskLocationLabel,
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

      <main className="min-h-dvh bg-[linear-gradient(135deg,_#eef6fb_0%,_#fbfdff_48%,_#edf8f4_100%)] px-3 py-3 text-slate-900 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_54%,_#06201a_100%)] dark:text-slate-100 sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_24px_80px_-52px_rgba(89,195,165,0.5)] dark:border-slate-700/80 dark:bg-slate-950 dark:shadow-[0_28px_90px_-48px_rgba(0,0,0,0.85)]">
            <PublicKioskHeader
              bootstrap={bootstrap}
              copy={copy}
              currentTime={currentTime}
              detectedLocale={detectedLocale}
              kioskLocationLabel={kioskLocationLabel}
              localeOptions={localeOptions}
              selectedLocale={selectedLocale}
              onLocaleChange={setKioskLocale}
            />

            <div className="bg-slate-50/70 px-4 py-4 dark:bg-slate-900/55 sm:px-6">
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
