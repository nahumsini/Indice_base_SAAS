import { ApiClientError } from '../../../lib/apiClient';

const statusMessages: Record<number, string> = {
  401: 'Tu sesion expiro. Inicia sesion de nuevo para guardar cambios.',
  403: 'No tienes permisos para completar esta accion en Finance.',
  404: 'No encontramos el registro solicitado en Finance.',
  409: 'Finance detecto un conflicto con datos existentes.',
  500: 'Finance no pudo completar la operacion. Intenta de nuevo mas tarde.',
};

const backendMessageTranslations: Record<string, string> = {
  'An expense with this folio already exists.': 'Ya existe un gasto con este folio.',
  'Cancelled or rejected expenses cannot change status.': 'Los gastos cancelados o rechazados no pueden cambiar de estado.',
  'Expense is already paid.': 'Este gasto ya esta pagado.',
  'Expense payment could not be recorded.': 'No se pudo registrar el abono. Actualiza la lista e intenta de nuevo.',
  'Expense status could not be updated.': 'No se pudo actualizar el estado del gasto. Actualiza la lista e intenta de nuevo.',
  'Invalid request.': 'La solicitud no es valida. Revisa los campos e intenta de nuevo.',
  'Only draft expenses can be deleted.': 'Los gastos registrados se conservan por control contable. Solo puedes eliminar borradores.',
  'Payment account balance could not be updated.': 'No se pudo actualizar el saldo de la cuenta de pago. Revisa que la cuenta este activa.',
  'Payment account currency does not match expense currency.': 'La moneda de la cuenta de pago no coincide con la moneda del gasto.',
  'Payment account not found.': 'No se encontro la cuenta de pago seleccionada.',
  'Payment amount cannot exceed balanceAmount.': 'El abono no puede exceder el saldo pendiente.',
  'Payment amount must be greater than zero.': 'El abono debe ser mayor que cero.',
  'The expense number could not be assigned. Try again.': 'No se pudo asignar el folio del gasto. Intenta nuevamente.',
};

const messageFromPayload = (payload: unknown) => (
  typeof payload === 'object' && payload !== null
    ? (
      (payload as { error?: { message?: string }; message?: string }).error?.message
      ?? (payload as { error?: { message?: string }; message?: string }).message
      ?? ''
    )
    : ''
);

export const toFinanceApiErrorMessage = (
  error: unknown,
  fallbackMessage = 'No se pudo conectar con Finance. Se conservaron los datos locales.',
) => {
  if (error instanceof ApiClientError) {
    const backendMessage = messageFromPayload(error.payload);
    if (backendMessage) {
      const translatedMessage = backendMessageTranslations[backendMessage];
      if (translatedMessage) return translatedMessage;
      return error.status >= 500 ? fallbackMessage : statusMessages[error.status] ?? fallbackMessage;
    }
    return statusMessages[error.status] ?? fallbackMessage;
  }
  return fallbackMessage;
};

export const shouldUseMockFallback = (error: unknown) => (
  !(error instanceof ApiClientError) || [401, 403, 404, 500].includes(error.status)
);
