import { useCallback, useState } from 'react';

export function useControlToasts() {
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [failureToastMessage, setFailureToastMessage] = useState('');

  const showSuccessToast = useCallback((message: string) => {
    setErrorMessage('');
    setFailureToastMessage('');
    setSuccessMessage('');
    window.setTimeout(() => setSuccessMessage(message), 0);
  }, []);

  const showFailureToast = useCallback((message: string) => {
    setSuccessMessage('');
    setErrorMessage(message);
    setFailureToastMessage('');
    window.setTimeout(() => setFailureToastMessage(message), 0);
  }, []);

  const clearControlMessages = useCallback(() => {
    setErrorMessage('');
    setFailureToastMessage('');
  }, []);

  const dismissSuccessToast = useCallback(() => {
    setSuccessMessage('');
  }, []);

  const dismissFailureToast = useCallback(() => {
    setFailureToastMessage('');
  }, []);

  return {
    errorMessage,
    successMessage,
    failureToastMessage,
    showSuccessToast,
    showFailureToast,
    clearControlMessages,
    dismissSuccessToast,
    dismissFailureToast,
  };
}
