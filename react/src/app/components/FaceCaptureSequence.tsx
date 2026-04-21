import { useEffect, useMemo, useState } from 'react';
import { AttendancePhotoCaptureCard, type AttendancePhotoSelection } from './AttendancePhotoCaptureCard';
import { Button } from './ui/button';

export interface FaceCaptureStep {
  id: string;
  title: string;
  helperText: string;
}

interface FaceCaptureSequenceProps {
  steps: readonly FaceCaptureStep[];
  onSubmit: (captures: Array<{ step: string; photo: AttendancePhotoSelection }>) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

export function FaceCaptureSequence({
  steps,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  disabled = false,
  onError,
}: FaceCaptureSequenceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captures, setCaptures] = useState<Record<string, AttendancePhotoSelection | null>>({});
  const [errorMessage, setErrorMessage] = useState('');

  const stepSignature = useMemo(
    () => steps.map((step) => step.id).join('|'),
    [steps],
  );

  useEffect(() => {
    setCurrentIndex(0);
    setCaptures({});
    setErrorMessage('');
  }, [stepSignature]);

  const currentStep = steps[currentIndex];
  const currentPhoto = captures[currentStep?.id] ?? null;
  const isLastStep = currentIndex === steps.length - 1;

  const orderedCaptures = useMemo(
    () => steps
      .map((step) => ({ step: step.id, photo: captures[step.id] }))
      .filter((item): item is { step: string; photo: AttendancePhotoSelection } => Boolean(item.photo)),
    [captures, steps],
  );

  const handlePhotoChange = (photo: AttendancePhotoSelection | null) => {
    setCaptures((current) => ({
      ...current,
      [currentStep.id]: photo,
    }));
    setErrorMessage('');
  };

  const handleNext = async () => {
    if (!currentPhoto) {
      const message = 'Capture the requested pose before continuing.';
      setErrorMessage(message);
      onError?.(message);
      return;
    }

    if (isLastStep) {
      try {
        setErrorMessage('');
        await onSubmit(orderedCaptures);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Face capture workflow failed.';
        setErrorMessage(message);
        onError?.(message);
      }
      return;
    }

    setCurrentIndex((current) => current + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = Boolean(captures[step.id]);
          return (
            <button
              key={step.id}
              type="button"
              disabled={disabled || isSubmitting}
              onClick={() => setCurrentIndex(index)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#143675] text-white'
                  : isCompleted
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {step.title}
            </button>
          );
        })}
      </div>

      <AttendancePhotoCaptureCard
        title={currentStep.title}
        requiredText="Required capture"
        takePhotoLabel="Open camera"
        chooseFromGalleryLabel="Choose file"
        retakePhotoLabel="Retake"
        captureLabel="Capture"
        cancelLabel="Cancel"
        helperText={currentStep.helperText}
        photo={currentPhoto}
        disabled={disabled || isSubmitting}
        onPhotoChange={handlePhotoChange}
        onError={(message) => {
          setErrorMessage(message);
          onError?.(message);
        }}
        errors={{
          cameraUnsupported: 'This browser cannot open the webcam.',
          cameraPermissionDenied: 'Allow camera access to continue.',
          cameraUnavailable: 'The webcam could not be started.',
        }}
      />

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
          disabled={currentIndex === 0 || isSubmitting}
        >
          Back
        </Button>
        <Button
          type="button"
          className="bg-[#143675] text-white hover:bg-[#0f2855]"
          onClick={() => void handleNext()}
          disabled={isSubmitting}
        >
          {isLastStep ? submitLabel : 'Next pose'}
        </Button>
      </div>
    </div>
  );
}
