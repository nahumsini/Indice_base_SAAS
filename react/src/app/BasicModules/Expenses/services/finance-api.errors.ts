import { ApiClientError } from '../../../lib/apiClient';

const statusMessages: Record<number, string> = {
  400: 'Revisa los datos marcados en el formulario y vuelve a intentar.',
  401: 'Tu sesion expiro. Inicia sesion de nuevo para guardar cambios.',
  403: 'No tienes permisos para completar esta accion en Finance.',
  404: 'No encontramos el registro solicitado en Finance.',
  409: 'Finance detecto un conflicto con datos existentes.',
  500: 'Finance no pudo completar la operacion. Intenta de nuevo mas tarde.',
};

const backendMessageTranslations: Record<string, string> = {
  'A fund supports up to 50 managed assets.': 'Puedes agregar hasta 50 activos al fondo.',
  'Every managed asset requires a valid type and name.': 'Completa el tipo y el nombre de cada activo, o quita las partidas vacías.',
  'Managed asset name or reference is too long.': 'El nombre del activo admite hasta 180 caracteres y la referencia hasta 120.',
  'A reversal reason is required (maximum 500 characters).': 'Escribe un motivo de hasta 500 caracteres para deshacer el pago.',
  'Expense payment not found.': 'No se encontró el pago en este gasto.',
  'The expense changed. Reload it before reversing a payment.': 'El gasto cambió. Cierra y vuelve a abrir Editar gasto para revisar el saldo actualizado.',
  'This expense requires its source correction workflow.': 'Este gasto está cerrado o pertenece a otra operación. Corrígelo desde su módulo de origen.',
  'This expense has posted accounting entries. Use an accounting adjustment.': 'Este gasto ya tiene asientos contabilizados. Necesita un ajuste contable.',
  'Only the last recorded active payment can be reversed.': 'Solo se puede deshacer el último pago activo. Actualiza el gasto para revisarlo.',
  'Payment history must be reconciled before this expense can be reopened.': 'El historial y el saldo del gasto no coinciden. Es necesario conciliarlos antes de deshacer el pago.',
  'This payment must be corrected by its source module.': 'Este pago se debe corregir desde su módulo de origen.',
  'The original bank movement could not be identified. Reconcile the payment first.': 'No se pudo identificar la salida bancaria original. Concilia el pago antes de corregirlo.',
  'The original bank movement does not match the payment.': 'La salida bancaria original no coincide con el pago. No se guardó la corrección.',
  'This payment was reversed. Use a new payment request.': 'Este pago ya fue revertido. Inicia un nuevo pago si deseas volver a liquidar el gasto.',
  'Select between 1 and 200 budget lines.': 'Selecciona entre 1 y 200 líneas presupuestales.',
  'Invalid or duplicate budget line selection.': 'La selección contiene líneas inválidas o repetidas. Actualiza la tabla.',
  'Budget line not found.': 'No se encontró la línea presupuestal en tu ámbito de acceso.',
  'A budget line changed. Reload the selection before retrying.': 'Una línea presupuestal cambió. Actualiza la tabla y vuelve a seleccionar.',
  'Closed or archived budget lines cannot be changed in bulk.': 'Las líneas cerradas o archivadas no se pueden modificar en masa.',
  'A reason of at least 8 characters is required to delete budget lines.': 'Escribe un motivo de al menos 8 caracteres para eliminar las líneas.',
  'The business must belong to the unit of every selected budget line.': 'El negocio debe pertenecer a la unidad de todas las líneas seleccionadas.',
  'Budget lines with execution or linked funds cannot be deleted or moved to another unit or business.': 'Las líneas con ejecución o fondos vinculados no se pueden eliminar ni cambiar de unidad o negocio.',
  'Select an active accounting account from this company.': 'Selecciona una cuenta contable activa de esta empresa.',

  'Paid imports require a payment account on every row.': 'Selecciona una cuenta de pago en cada fila para importar gastos pagados.',
  'Paid imports require an expense date no later than today.': 'Un gasto pagado no puede tener una fecha futura. Corrige la fecha o impórtalo como pendiente.',
  'Includes tax must be true or false.': 'Revisa la palomita Incluye impuesto de esta fila.',
  'Import amount must be positive with at most two decimal places.': 'El monto debe ser mayor a cero y tener máximo dos decimales.',
  'Select the included tax rate.': 'Selecciona la tasa del impuesto incluido en el monto.',
  'Included tax rate must be greater than zero and at most 100 percent.': 'La tasa del impuesto incluido debe ser mayor a cero y no superar el 100%.',
  'Select between 1 and 200 expenses and provide a date and request key.': 'Selecciona entre 1 y 200 gastos e indica una fecha válida.',
  'Select a payment account and a payment date no later than today.': 'Selecciona una cuenta de pago y una fecha hasta hoy.',
  'Pending expenses require a due date today or later.': 'Para dejarlos pendientes, el vencimiento debe ser hoy o después.',
  'Overdue expenses require a due date before today.': 'Para dejarlos vencidos, el vencimiento debe ser anterior a hoy.',
  'Payment date cannot precede the expense date.': 'La fecha de pago no puede ser anterior a la fecha del gasto.',
  'Linked or posted expenses require their source workflow.': 'Los gastos vinculados o contabilizados requieren un ajuste desde su operación de origen.',
  'Only open expenses with a remaining balance can change here. Paid expenses require a reversal.': 'Selecciona gastos abiertos con saldo. Para reabrir un gasto pagado primero se requiere revertir el pago.',
  "An expense changed. Reload the selection before retrying.": "Un gasto cambió. Actualiza la vista y revisa la selección antes de reintentar.",
  "A receipt changed. Reload the selection before retrying.": "Un comprobante cambió. Actualiza la vista y revisa la selección antes de reintentar.",
  "Fund expenses must be changed from Petty Cash.": "Los gastos de fondos se modifican desde Caja chica.",
  "Linked or posted expenses require an adjustment from their source workflow.": "Los gastos vinculados o contabilizados requieren un ajuste desde su operación de origen.",
  "Cancelled, rejected or closed expenses cannot be changed in bulk.": "La selección contiene gastos cancelados, rechazados o cerrados que no se pueden modificar en masa.",
  "Only unpaid draft expenses can be deleted. Paid expenses require a reversal.": "Solo se pueden eliminar borradores sin pagos. Los gastos pagados requieren una reversión.",
  "A reason is required to delete expenses.": "Escribe el motivo para eliminar los gastos.",
  "A reason is required to reverse receipts.": "Escribe el motivo para revertir los comprobantes.",
  "A fully paid expense has no future payment account to change.": "Un gasto completamente pagado no tiene una cuenta para pagos futuros que cambiar.",
  "A fund custody account cannot be selected for an ordinary expense.": "La cuenta de custodia de un fondo no puede usarse como cuenta prevista de un gasto ordinario.",
  "Select an active provider from this company.": "Selecciona un proveedor activo de esta empresa.",
  "Select an active reference from this company.": "Selecciona una cuenta o proveedor activo de esta empresa.",
  "Select a unit from this company.": "Selecciona una unidad de esta empresa.",
  "Changing unit requires company-wide access.": "Cambiar de unidad requiere acceso corporativo.",
  "The business must belong to the unit of every selected expense.": "El negocio debe pertenecer a la unidad de todos los gastos seleccionados.",
  "The business is outside your operating scope.": "El negocio está fuera de tu ámbito de acceso.",
  "This cut is closed. Its receipts cannot be changed.": "Este corte está cerrado. Sus comprobantes no se pueden modificar.",
  "Every receipt must belong to the selected fund and cut.": "Todos los comprobantes deben pertenecer al fondo y corte seleccionados.",
  "Rejected or reversed receipts cannot be changed in bulk.": "Los comprobantes rechazados o revertidos no se pueden modificar en masa.",
  "The linked expense must be reconciled before changing this receipt.": "Es necesario conciliar el gasto vinculado antes de modificar este comprobante.",
  "An authorized internal expense requires an accounting account.": "Un gasto interno autorizado debe conservar una cuenta contable.",
  "Select between 1 and 200 expenses.": "Selecciona entre 1 y 200 gastos.",
  "Select between 1 and 200 receipts.": "Selecciona entre 1 y 200 comprobantes.",

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
  'The corrected expense total must be greater than zero.': 'El total corregido debe ser mayor a cero.',
  'A correction cannot replace the source budget or purchase order.': 'La corrección debe conservar el presupuesto o pedido de origen.',
  'An expense with payments or a budget must retain its original currency.': 'Conserva la moneda original: este gasto ya tiene pagos o un presupuesto vinculado.',
  'The corrected total is below payments already recorded. Correct or reverse the excess payment first.': 'El total es menor a lo ya pagado. Primero corrige o revierte el pago excedente; sus movimientos se conservan.',
  'Changing the expense cannot move an existing payment to another account.': 'La edición conserva la cuenta de los pagos ya registrados.',
  'A paid expense cannot have a future expense date.': 'Un gasto pagado no puede tener una fecha futura.',
  'Closed, cancelled, rejected or purchase-order expenses require their source correction workflow.': 'Corrige este registro desde su operación de origen: está cerrado, cancelado, rechazado o vinculado a un pedido.',
  'idempotencyKey was already used for a different payment.': 'Este intento corresponde a otro pago. Actualiza la vista y revisa el historial antes de continuar.',
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
