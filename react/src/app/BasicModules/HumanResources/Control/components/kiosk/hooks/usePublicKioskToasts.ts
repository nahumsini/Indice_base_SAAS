import { useEffect, useRef, useState } from 'react';

interface UsePublicKioskToastsInput {
  onErrorMessageChange: (message: string) => void;
}

export function usePublicKioskToasts({ onErrorMessageChange }: UsePublicKioskToastsInput) {
  const [successMessage, setSuccessMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');
  const successTimeoutRef = useRef<number | null>(null);
  const failureTimeoutRef = useRef<number | null>(null);

  const clearSuccessTimer = () => {
    if (successTimeoutRef.current !== null) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  const clearFailureTimer = () => {
    if (failureTimeoutRef.current !== null) {
      window.clearTimeout(failureTimeoutRef.current);
      failureTimeoutRef.current = null;
    }
  };

  const clearFailureToast = () => {
    setFailureToastMessage('');
  };

  const clearSuccessToast = () => {
    setSuccessMessage('');
  };

  const clearFailureToastState = () => {
    clearFailureTimer();
    setFailureToastMessage('');
  };

  const showSuccessToast = (message: string) => {
    clearSuccessTimer();
    clearFailureTimer();
    onErrorMessageChange('');
    setFailureToastMessage('');
    setSuccessMessage('');
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessMessage(message);
      successTimeoutRef.current = null;
    }, 10);
  };

  const showFailureToast = (message: string) => {
    clearSuccessTimer();
    clearFailureTimer();
    setSuccessMessage('');
    onErrorMessageChange(message);
    setFailureToastMessage('');
    failureTimeoutRef.current = window.setTimeout(() => {
      setFailureToastMessage(message);
      failureTimeoutRef.current = null;
    }, 10);
  };

  useEffect(() => () => {
    clearSuccessTimer();
    clearFailureTimer();
  }, []);

  return {
    clearFailureToast,
    clearFailureToastState,
    clearSuccessToast,
    failureToastMessage,
    showFailureToast,
    showSuccessToast,
    successMessage,
  };
}
