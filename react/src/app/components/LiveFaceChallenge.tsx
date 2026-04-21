import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, RefreshCw, ScanFace, VideoOff } from 'lucide-react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { AttendancePhotoSelection } from './AttendancePhotoCaptureCard';
import { Button } from './ui/button';

type ChallengeStepId = 'neutral' | 'left' | 'right';
type ChallengeStatus =
  | 'initializing'
  | 'camera_error'
  | 'no_face'
  | 'multiple_faces'
  | 'hold_neutral'
  | 'hold_left'
  | 'hold_right'
  | 'submitting'
  | 'success'
  | 'error';

export interface LiveFaceChallengeCapture {
  step: ChallengeStepId;
  photo: AttendancePhotoSelection;
}

export interface LiveFaceChallengeCopy {
  autoCaptureBadge: string;
  preparing: string;
  noFace: string;
  multipleFaces: string;
  neutralPrompt: string;
  neutralHold: string;
  leftPrompt: string;
  leftHold: string;
  rightPrompt: string;
  rightHold: string;
  submitting: string;
  success: string;
  retry: string;
  cancel: string;
  holdMeterLabel: string;
  stepLabels: Record<ChallengeStepId, string>;
  cameraUnsupported: string;
  cameraPermissionDenied: string;
  cameraUnavailable: string;
}

interface LiveFaceChallengeProps {
  title: string;
  helperText: string;
  onSubmit: (captures: LiveFaceChallengeCapture[]) => Promise<void>;
  onCancel?: () => void;
  onError?: (message: string) => void;
  onRestart?: () => void;
  resetToken?: string | number;
  copy?: Partial<LiveFaceChallengeCopy>;
}

const CHALLENGE_STEPS: ChallengeStepId[] = ['neutral', 'left', 'right'];
const ANALYSIS_INTERVAL_MS = 125;
const STABLE_HOLD_MS = 700;
const POST_CAPTURE_DEBOUNCE_MS = 400;
const JPEG_QUALITY = 0.9;
const NEUTRAL_THRESHOLD = 0.08;
const SIDE_THRESHOLD = 0.1;

const LEFT_EYE_INDICES = [33, 133] as const;
const RIGHT_EYE_INDICES = [362, 263] as const;
const NOSE_TIP_INDEX = 1;

const defaultCopy: LiveFaceChallengeCopy = {
  autoCaptureBadge: 'Automatic capture',
  preparing: 'Preparing the camera and face guidance.',
  noFace: 'Position one face inside the frame to continue.',
  multipleFaces: 'Only one face can be visible during the challenge.',
  neutralPrompt: 'Look straight at the camera.',
  neutralHold: 'Hold still. Capturing the neutral pose.',
  leftPrompt: 'Turn your face slightly to the left.',
  leftHold: 'Hold that left turn. Capturing now.',
  rightPrompt: 'Turn your face slightly to the right.',
  rightHold: 'Hold that right turn. Capturing now.',
  submitting: 'Uploading captures and completing the biometric check.',
  success: 'Biometric capture completed successfully.',
  retry: 'Retry challenge',
  cancel: 'Cancel',
  holdMeterLabel: 'Hold steady to auto-capture',
  stepLabels: {
    neutral: 'Look straight',
    left: 'Turn left',
    right: 'Turn right',
  },
  cameraUnsupported: 'This browser cannot open the webcam.',
  cameraPermissionDenied: 'Allow camera access to continue.',
  cameraUnavailable: 'The webcam could not be started.',
};

export function LiveFaceChallenge({
  title,
  helperText,
  onSubmit,
  onCancel,
  onError,
  onRestart,
  resetToken,
  copy,
}: LiveFaceChallengeProps) {
  const mergedCopy = useMemo(
    () => ({
      ...defaultCopy,
      ...copy,
      stepLabels: {
        ...defaultCopy.stepLabels,
        ...(copy?.stepLabels ?? {}),
      },
    }),
    [copy],
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const mountedRef = useRef(true);
  const initializationTokenRef = useRef(0);
  const analysisBusyRef = useRef(false);
  const lastAnalysisAtRef = useRef(0);
  const lastCaptureAtRef = useRef(0);
  const holdStartedAtRef = useRef<number | null>(null);
  const neutralBaselineRef = useRef<number | null>(null);
  const currentStepIndexRef = useRef(0);
  const statusRef = useRef<ChallengeStatus>('initializing');
  const captureBufferRef = useRef<Partial<Record<ChallengeStepId, AttendancePhotoSelection>>>({});
  const onSubmitRef = useRef(onSubmit);
  const onErrorRef = useRef(onError);
  const onRestartRef = useRef(onRestart);

  const [status, setStatus] = useState<ChallengeStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedSteps, setCapturedSteps] = useState<Partial<Record<ChallengeStepId, boolean>>>({});
  const [holdProgress, setHoldProgress] = useState(0);
  const [poseSatisfied, setPoseSatisfied] = useState(false);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onRestartRef.current = onRestart;
  }, [onRestart]);

  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopResources = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    analysisBusyRef.current = false;
  };

  const resetStepState = () => {
    captureBufferRef.current = {};
    neutralBaselineRef.current = null;
    currentStepIndexRef.current = 0;
    holdStartedAtRef.current = null;
    lastAnalysisAtRef.current = 0;
    lastCaptureAtRef.current = 0;
    setCurrentStepIndex(0);
    setCapturedSteps({});
    setHoldProgress(0);
    setPoseSatisfied(false);
    setErrorMessage('');
  };

  const setTerminalError = (nextStatus: 'camera_error' | 'error', message: string) => {
    holdStartedAtRef.current = null;
    setPoseSatisfied(false);
    setHoldProgress(0);
    setErrorMessage(message);
    setStatus(nextStatus);
    onErrorRef.current?.(message);
  };

  const captureCurrentFrame = () => new Promise<AttendancePhotoSelection>((resolve, reject) => {
    if (!videoRef.current || !canvasRef.current) {
      reject(new Error(mergedCopy.cameraUnavailable));
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error(mergedCopy.cameraUnavailable));
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      reject(new Error(mergedCopy.cameraUnavailable));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(mergedCopy.cameraUnavailable));
        return;
      }

      resolve({
        previewUrl: '',
        file: blob,
        contentType: 'image/jpeg',
      });
    }, 'image/jpeg', JPEG_QUALITY);
  });

  const buildCapturePayload = () => CHALLENGE_STEPS.map((step) => {
    const photo = captureBufferRef.current[step];
    if (!photo) {
      throw new Error('Biometric capture sequence is incomplete.');
    }
    return { step, photo };
  });

  const updateHoldState = (isSatisfied: boolean, progress: number) => {
    setPoseSatisfied(isSatisfied);
    setHoldProgress(progress);
  };

  const scheduleAnalysisLoop = () => {
    const loop = async (frameTime: number) => {
      if (!mountedRef.current || !videoRef.current || !landmarkerRef.current) {
        return;
      }

      rafRef.current = window.requestAnimationFrame((nextFrameTime) => {
        void loop(nextFrameTime);
      });

      if (
        analysisBusyRef.current ||
        statusRef.current === 'initializing' ||
        statusRef.current === 'camera_error' ||
        statusRef.current === 'submitting' ||
        statusRef.current === 'success' ||
        statusRef.current === 'error'
      ) {
        return;
      }

      if (frameTime - lastAnalysisAtRef.current < ANALYSIS_INTERVAL_MS) {
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      analysisBusyRef.current = true;
      lastAnalysisAtRef.current = frameTime;

      try {
        const landmarker = landmarkerRef.current;
        if (!landmarker) {
          return;
        }

        const result = landmarker.detectForVideo(video, frameTime);
        const faces = result.faceLandmarks ?? [];

        if (faces.length === 0) {
          holdStartedAtRef.current = null;
          updateHoldState(false, 0);
          setStatus('no_face');
          return;
        }

        if (faces.length > 1) {
          holdStartedAtRef.current = null;
          updateHoldState(false, 0);
          setStatus('multiple_faces');
          return;
        }

        const currentStep = CHALLENGE_STEPS[currentStepIndexRef.current];
        const currentStatus = `hold_${currentStep}` as const;
        const yaw = computeYawProxy(faces[0]);
        const neutralBaseline = neutralBaselineRef.current ?? 0;
        const isPoseValid = isPoseSatisfied(currentStep, yaw, neutralBaseline);

        setStatus(currentStatus);

        if (!isPoseValid || frameTime - lastCaptureAtRef.current < POST_CAPTURE_DEBOUNCE_MS) {
          holdStartedAtRef.current = null;
          updateHoldState(false, 0);
          return;
        }

        if (holdStartedAtRef.current === null) {
          holdStartedAtRef.current = frameTime;
          updateHoldState(true, 0);
          return;
        }

        const elapsed = frameTime - holdStartedAtRef.current;
        const progress = Math.min(elapsed / STABLE_HOLD_MS, 1);
        updateHoldState(true, progress);

        if (elapsed < STABLE_HOLD_MS) {
          return;
        }

        holdStartedAtRef.current = null;
        lastCaptureAtRef.current = frameTime;

        const photo = await captureCurrentFrame();
        captureBufferRef.current[currentStep] = photo;
        setCapturedSteps((current) => ({ ...current, [currentStep]: true }));

        if (currentStep === 'neutral') {
          neutralBaselineRef.current = yaw;
        }

        if (currentStepIndexRef.current < CHALLENGE_STEPS.length - 1) {
          const nextStepIndex = currentStepIndexRef.current + 1;
          currentStepIndexRef.current = nextStepIndex;
          setCurrentStepIndex(nextStepIndex);
          updateHoldState(false, 0);
          setStatus(`hold_${CHALLENGE_STEPS[nextStepIndex]}` as const);
          return;
        }

        setStatus('submitting');
        updateHoldState(false, 0);
        await onSubmitRef.current(buildCapturePayload());

        if (!mountedRef.current) {
          return;
        }

        stopResources();
        setStatus('success');
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Biometric capture failed.';
        stopResources();
        setTerminalError('error', message);
      } finally {
        analysisBusyRef.current = false;
      }
    };

    rafRef.current = window.requestAnimationFrame((frameTime) => {
      void loop(frameTime);
    });
  };

  const initializeChallenge = async () => {
    const initializationToken = initializationTokenRef.current + 1;
    initializationTokenRef.current = initializationToken;

    stopResources();
    resetStepState();
    setStatus('initializing');
    onRestartRef.current?.();

    if (!navigator.mediaDevices?.getUserMedia) {
      setTerminalError('camera_error', mergedCopy.cameraUnsupported);
      return;
    }

    let nextStream: MediaStream | null = null;
    let nextLandmarker: FaceLandmarker | null = null;

    try {
      const [{ FilesetResolver, FaceLandmarker: RuntimeFaceLandmarker }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }),
      ]);

      nextStream = stream;
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      nextLandmarker = await RuntimeFaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/face_landmarker.task',
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      if (!mountedRef.current || initializationToken !== initializationTokenRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        nextLandmarker.close();
        return;
      }

      if (!videoRef.current) {
        throw new Error(mergedCopy.cameraUnavailable);
      }

      const video = videoRef.current;
      video.srcObject = nextStream;

      await new Promise<void>((resolve, reject) => {
        const handleReady = () => {
          cleanup();
          resolve();
        };
        const handleFailure = () => {
          cleanup();
          reject(new Error(mergedCopy.cameraUnavailable));
        };
        const cleanup = () => {
          video.removeEventListener('loadedmetadata', handleReady);
          video.removeEventListener('error', handleFailure);
        };

        video.addEventListener('loadedmetadata', handleReady);
        video.addEventListener('error', handleFailure);

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          cleanup();
          resolve();
        }
      });

      await video.play();

      if (!mountedRef.current || initializationToken !== initializationTokenRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        nextLandmarker.close();
        return;
      }

      streamRef.current = nextStream;
      landmarkerRef.current = nextLandmarker;
      setStatus('hold_neutral');
      scheduleAnalysisLoop();
    } catch (error) {
      nextStream?.getTracks().forEach((track) => track.stop());
      nextLandmarker?.close();

      if (!mountedRef.current || initializationToken !== initializationTokenRef.current) {
        return;
      }

      const message = resolveInitializationError(error, mergedCopy);
      setTerminalError('camera_error', message);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void initializeChallenge();

    return () => {
      mountedRef.current = false;
      initializationTokenRef.current += 1;
      stopResources();
    };
  }, [resetToken]);

  const currentStep = CHALLENGE_STEPS[currentStepIndex];

  const statusContent = useMemo(() => {
    switch (status) {
      case 'initializing':
        return {
          icon: <ScanFace className="h-5 w-5" />,
          title: title,
          message: mergedCopy.preparing,
          tone: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100',
        };
      case 'camera_error':
        return {
          icon: <VideoOff className="h-5 w-5" />,
          title: title,
          message: errorMessage,
          tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200',
        };
      case 'no_face':
        return {
          icon: <Camera className="h-5 w-5" />,
          title: mergedCopy.stepLabels[currentStep],
          message: mergedCopy.noFace,
          tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
        };
      case 'multiple_faces':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: mergedCopy.stepLabels[currentStep],
          message: mergedCopy.multipleFaces,
          tone: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200',
        };
      case 'hold_neutral':
        return {
          icon: <ScanFace className="h-5 w-5" />,
          title: mergedCopy.stepLabels.neutral,
          message: poseSatisfied ? mergedCopy.neutralHold : mergedCopy.neutralPrompt,
          tone: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100',
        };
      case 'hold_left':
        return {
          icon: <ScanFace className="h-5 w-5" />,
          title: mergedCopy.stepLabels.left,
          message: poseSatisfied ? mergedCopy.leftHold : mergedCopy.leftPrompt,
          tone: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100',
        };
      case 'hold_right':
        return {
          icon: <ScanFace className="h-5 w-5" />,
          title: mergedCopy.stepLabels.right,
          message: poseSatisfied ? mergedCopy.rightHold : mergedCopy.rightPrompt,
          tone: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100',
        };
      case 'submitting':
        return {
          icon: <RefreshCw className="h-5 w-5 animate-spin" />,
          title: title,
          message: mergedCopy.submitting,
          tone: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          title: title,
          message: mergedCopy.success,
          tone: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200',
        };
      case 'error':
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: title,
          message: errorMessage,
          tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-200',
        };
    }
  }, [currentStep, errorMessage, mergedCopy, poseSatisfied, status, title]);

  const showRetry = status === 'camera_error' || status === 'error' || status === 'success';
  const isBusy = status === 'initializing' || status === 'submitting';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#143675]/10 text-[#143675] dark:bg-[#143675]/20 dark:text-[#8bb3ff]">
            <ScanFace className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-[#143675]/10 px-3 py-1 text-xs font-medium text-[#143675] dark:bg-[#143675]/20 dark:text-[#8bb3ff]">
          {mergedCopy.autoCaptureBadge}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {CHALLENGE_STEPS.map((step, index) => {
          const isActive = currentStepIndex === index && status !== 'success';
          const isCaptured = Boolean(capturedSteps[step]);
          return (
            <div
              key={step}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isCaptured
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : isActive
                    ? 'bg-[#143675] text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {mergedCopy.stepLabels[step]}
            </div>
          );
        })}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-black dark:border-gray-700">
        <div className="relative">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-[360px] w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[72%] w-[52%] rounded-[48%] border-2 border-white/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 py-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">
              {mergedCopy.stepLabels[currentStep]}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{statusContent.message}</p>
          </div>
        </div>
      </div>

      <div className={`mt-4 rounded-xl border px-4 py-4 ${statusContent.tone}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {statusContent.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{statusContent.title}</p>
            <p className="mt-1 text-sm opacity-90">{statusContent.message}</p>
          </div>
        </div>

        {status.startsWith('hold_') ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.16em]">
              <span>{mergedCopy.holdMeterLabel}</span>
              <span>{Math.round(holdProgress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/40 dark:bg-black/20">
              <div
                className="h-full rounded-full bg-current transition-all duration-100"
                style={{ width: `${Math.round(holdProgress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={!onCancel || isBusy}
        >
          {mergedCopy.cancel}
        </Button>
        {showRetry ? (
          <Button
            type="button"
            className="bg-[#143675] text-white hover:bg-[#0f2855]"
            onClick={() => {
              void initializeChallenge();
            }}
            disabled={isBusy}
          >
            {mergedCopy.retry}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function averageX(landmarks: Array<{ x: number }>, indices: readonly number[]) {
  return indices.reduce((total, index) => total + (landmarks[index]?.x ?? 0), 0) / indices.length;
}

function computeYawProxy(landmarks: Array<{ x: number }>) {
  const leftEyeCenterX = averageX(landmarks, LEFT_EYE_INDICES);
  const rightEyeCenterX = averageX(landmarks, RIGHT_EYE_INDICES);
  const noseX = landmarks[NOSE_TIP_INDEX]?.x ?? 0.5;
  const eyeMidX = (leftEyeCenterX + rightEyeCenterX) / 2;
  const eyeDistance = Math.max(Math.abs(rightEyeCenterX - leftEyeCenterX), 0.001);
  return (noseX - eyeMidX) / eyeDistance;
}

function isPoseSatisfied(step: ChallengeStepId, yaw: number, neutralBaseline: number) {
  switch (step) {
    case 'neutral':
      return Math.abs(yaw) <= NEUTRAL_THRESHOLD;
    case 'left':
      return yaw - neutralBaseline >= SIDE_THRESHOLD;
    case 'right':
      return neutralBaseline - yaw >= SIDE_THRESHOLD;
    default:
      return false;
  }
}

function resolveInitializationError(error: unknown, copy: LiveFaceChallengeCopy) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return copy.cameraPermissionDenied;
  }

  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return copy.cameraUnavailable;
  }

  return error instanceof Error ? error.message : copy.cameraUnavailable;
}
