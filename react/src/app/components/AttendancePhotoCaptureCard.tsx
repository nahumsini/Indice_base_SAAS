import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { Button } from './ui/button';

export interface AttendancePhotoSelection {
  previewUrl: string;
  file: Blob;
  contentType: string;
}

interface AttendancePhotoCaptureCardProps {
  title: string;
  requiredText: string;
  takePhotoLabel: string;
  chooseFromGalleryLabel: string;
  retakePhotoLabel: string;
  captureLabel: string;
  cancelLabel: string;
  helperText: string;
  photo: AttendancePhotoSelection | null;
  disabled?: boolean;
  onPhotoChange: (photo: AttendancePhotoSelection | null) => void;
  onError: (message: string) => void;
  errors: {
    cameraUnsupported: string;
    cameraPermissionDenied: string;
    cameraUnavailable: string;
  };
}

export function AttendancePhotoCaptureCard({
  title,
  requiredText,
  takePhotoLabel,
  chooseFromGalleryLabel,
  retakePhotoLabel,
  captureLabel,
  cancelLabel,
  helperText,
  photo,
  disabled = false,
  onPhotoChange,
  onError,
  errors,
}: AttendancePhotoCaptureCardProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
    setIsStartingCamera(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (disabled && isCameraOpen) {
      stopCamera();
    }
  }, [disabled, isCameraOpen]);

  const startCamera = async () => {
    if (disabled) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onError(errors.cameraUnsupported);
      return;
    }

    setIsStartingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);

      requestAnimationFrame(() => {
        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {
          onError(errors.cameraUnavailable);
          stopCamera();
        });
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        onError(errors.cameraPermissionDenied);
      } else {
        onError(errors.cameraUnavailable);
      }
      stopCamera();
    } finally {
      setIsStartingCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      onError(errors.cameraUnavailable);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      onError(errors.cameraUnavailable);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      onError(errors.cameraUnavailable);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        onError(errors.cameraUnavailable);
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      onPhotoChange({
        previewUrl,
        file: blob,
        contentType: 'image/jpeg',
      });
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const chooseFromGallery = () => {
    if (disabled) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    onPhotoChange({
      previewUrl: nextUrl,
      file,
      contentType: file.type || 'image/jpeg',
    });
    event.target.value = '';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#143675]/10 text-[#143675] dark:bg-[#143675]/20 dark:text-[#8bb3ff]">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{requiredText}</p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelection}
      />

      {isCameraOpen ? (
        <>
          <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-black dark:border-gray-700">
            <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" className="bg-[#143675] text-white hover:bg-[#0f2855]" onClick={capturePhoto}>
              {captureLabel}
            </Button>
            <Button type="button" variant="outline" onClick={stopCamera}>
              {cancelLabel}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={disabled || isStartingCamera}
              onClick={() => {
                void startCamera();
              }}
            >
              <Camera className="h-4 w-4" />
              {photo ? retakePhotoLabel : takePhotoLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={disabled}
              onClick={chooseFromGallery}
            >
              <ImagePlus className="h-4 w-4" />
              {chooseFromGalleryLabel}
            </Button>
          </div>

          {photo ? (
            <img
              src={photo.previewUrl}
              alt={title}
              className="mb-4 h-40 w-full rounded-lg object-cover"
            />
          ) : null}
        </>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
    </div>
  );
}
