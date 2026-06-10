import { ApiClientError } from '../../../lib/apiClient';

const statusMessages: Record<number, string> = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo para guardar cambios.',
  403: 'No tienes permisos para completar esta acción en Finance.',
  404: 'No encontramos el registro solicitado en Finance.',
  409: 'Finance detectó un conflicto con datos existentes.',
  500: 'Finance no pudo completar la operación. Intenta de nuevo más tarde.',
};

export const toFinanceApiErrorMessage = (
  error: unknown,
  fallbackMessage = 'No se pudo conectar con Finance. Se conservaron los datos locales.',
) => {
  if (error instanceof ApiClientError) {
    return statusMessages[error.status] ?? fallbackMessage;
  }
  return fallbackMessage;
};

export const shouldUseMockFallback = (error: unknown) => (
  !(error instanceof ApiClientError) || [401, 403, 404, 500].includes(error.status)
);
