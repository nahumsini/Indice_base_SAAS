import { esMX } from './es-MX';

export const esCO = {
  ...esMX,
  common: {
    ...esMX.common,
    notAvailable: 'Sin dato',
  },
  header: {
    ...esMX.header,
    subtitle: 'Controla ventas ganadas, soportes de pago, validaciones, alistamiento de inventario y comisiones.',
  },
  filters: {
    ...esMX.filters,
    searchPlaceholder: 'Buscar venta, cotización, cliente, vendedor, soporte de pago, unidad o negocio',
  },
  table: {
    ...esMX.table,
    emptyDescription: 'Ajusta filtros o crea una venta desde una cotización aprobada.',
    actions: {
      ...esMX.table.actions,
      prepareMovement: 'Preparar entrega a inventario',
      alreadyPrepared: 'Entrega a inventario ya preparada',
    },
    columns: {
      ...esMX.table.columns,
      paymentEvidence: 'Soporte de pago',
    },
  },
  modal: {
    ...esMX.modal,
    quoteHelper: 'Las ventas normalmente deben generarse desde cotizaciones aprobadas.',
    quoteSelectorHelper: 'Elige primero una cotización aprobada para precargar cliente, vendedor y valor.',
    quoteFallbackHelper: 'Aún no hay cotizaciones aprobadas, por eso se muestran todas para este flujo de preparación.',
    generatedFromQuote: (quoteNumber: string, notes?: string) => (
      notes ? `Generada desde ${quoteNumber}. ${notes}` : `Generada desde ${quoteNumber}.`
    ),
    inventoryHelper: 'Inventario controla la ejecución del stock. Este registro de venta solo prepara la entrega operativa.',
    acceptedQuoteBadge: 'Aprobada',
    fields: {
      ...esMX.modal.fields,
      paymentEvidenceStatus: 'Soporte de pago',
      totalAmount: 'Valor total',
    },
    placeholders: {
      ...esMX.modal.placeholders,
      quoteSelector: 'Selecciona una cotización aprobada',
      notes: 'Notas de ejecución, compromiso con cliente o contexto de validación.',
    },
    operationalContext: {
      ...esMX.modal.operationalContext,
      taxIdentifier: 'NIT',
      fiscalAddress: 'Dirección fiscal DIAN',
    },
  },
  statuses: {
    ...esMX.statuses,
    paymentEvidence: {
      missing: 'Sin soporte',
      uploaded: 'Cargado',
      under_review: 'En revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
    },
  },
  commissionModal: {
    ...esMX.commissionModal,
    description: 'Revisa estado, porcentaje, valor y notas operativas de la comisión.',
    notesPlaceholder: 'Contexto de comisión, notas de aprobación o fecha estimada de pago.',
  },
  summaryPreview: {
    ...esMX.summaryPreview,
    description: 'Revisa la nota de venta antes de imprimirla o compartirla con el cliente.',
    footerNote: 'La nota de venta es un documento comercial y no sustituye una factura fiscal DIAN.',
  },
  guidance: {
    ...esMX.guidance,
    sections: {
      ...esMX.guidance.sections,
      overview: {
        title: 'Resumen de ventas',
        body: 'Una cotización aprobada no es el final del proceso. El registro de venta permite que inventario, finanzas y operación ejecuten el compromiso con el cliente.',
      },
      finance: {
        title: 'Validación financiera',
        body: 'Finanzas valida el soporte de pago antes de tratar la venta como aprobada financieramente.',
      },
    },
  },
} as const;
