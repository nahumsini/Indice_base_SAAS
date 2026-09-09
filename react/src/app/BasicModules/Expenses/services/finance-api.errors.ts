import { ApiClientError } from '../../../lib/apiClient';

const statusMessages: Record<number, string> = {
  401: 'Tu sesion expiro. Inicia sesion de nuevo para guardar cambios.',
  403: 'No tienes permisos para completar esta accion en Finance.',
  404: 'No encontramos el registro solicitado en Finance.',
  409: 'Finance detecto un conflicto con datos existentes.',
  500: 'Finance no pudo completar la operacion. Intenta de nuevo mas tarde.',
};

const backendMessageTranslations: Record<string, string> = {
  'The statement balance changed. Refresh and review it before closing.': 'El saldo del corte cambió. Actualiza la vista y revisa el importe antes de cerrar.',
  'A later statement is already closed. Its opening balance cannot be rewritten.': 'Hay un corte posterior cerrado cuyo saldo inicial cambiaría. Revisa la secuencia de cortes antes de continuar.',
  'No verified exchange rate is available for the payroll deduction date.': 'No hay un tipo de cambio verificado para la fecha del cargo a nómina. El corte y el cargo no se guardaron.',
  'The fund must have a responsible collaborator before charging a shortage to payroll.': 'Asigna un colaborador responsable al fondo antes de cargar el faltante a nómina.',
  'The fund responsible user is not an active company collaborator.': 'El responsable del fondo debe ser un colaborador activo de esta empresa.',
  'Petty cash statement is already closed.': 'El corte ya está cerrado. Sus movimientos se conservan en el historial.',
  'Petty cash statement has receipts pending expense creation.': 'Autoriza o rechaza los registros pendientes antes de cerrar el corte. Los autorizados no requieren adjunto.',
  'Petty cash settlement line requires evidence before authorization.': 'La autorización sin comprobante requiere un administrador.',
  'The accounting account belongs to the source fund and cannot be changed here.': 'Esta cuenta está vinculada al fondo de origen y no se puede cambiar desde Gastos.',
  'This expense has a posted journal entry. Use an accounting adjustment to preserve the ledger.': 'El gasto ya tiene un asiento publicado. Su cuenta requiere un ajuste contable.',
  'The expense changed. Reload it before changing its accounting account.': 'El gasto cambió. Actualiza la lista antes de cambiar su cuenta contable.',
  'The expense changed. Reload it before editing.': 'El gasto cambió. Actualiza la lista antes de editarlo.',
  'This import was already saved. Reload Expenses before importing another batch.': 'Este lote ya se guardó. Actualiza Gastos antes de iniciar otro lote.',
  'This expense is protected and cannot be edited in a batch.': 'El gasto está protegido y no admite edición masiva.',
  'Fund expenses must be managed from their source fund.': 'Este gasto debe gestionarse desde su fondo de origen.',
  'Only draft expenses can be updated.': 'El gasto ya fue registrado y no admite edición de sus importes.',
  'Cancelled or rejected expenses cannot be reclassified.': 'Los gastos cancelados o rechazados no admiten reclasificación.',
  'Imported expenses must start pending.': 'Los gastos importados deben comenzar pendientes de pago.',
  'Expense not found.': 'No se encontró el gasto en tu ámbito de acceso.',
  'accountingAccountId is invalid for this company.': 'Selecciona una cuenta contable activa de esta empresa.',
  'paymentAccountId is invalid for this company.': 'Selecciona una cuenta de pago activa de esta empresa, en la moneda del gasto y que no pertenezca a un fondo.',
  'providerId is invalid for this company.': 'Selecciona un proveedor de esta empresa.',
  'unitId is invalid for this company.': 'Actualiza la lista y selecciona una unidad de esta empresa.',
  'businessId is invalid for this company.': 'Selecciona un negocio de la unidad indicada.',
  'requestedByUserId is invalid for this company.': 'Actualiza tu sesión: el solicitante no pertenece a esta empresa.',
  'totalAmount must equal subtotalAmount plus taxAmount.': 'El total debe ser igual al subtotal más impuestos.',

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
      const row = /^Row (\d+): (.+)$/.exec(backendMessage);
      if (row) return `Fila ${row[1]}: ${backendMessageTranslations[row[2]] ?? 'No se pudo guardar. Revisa sus datos, cuentas y permisos.'}`;
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
