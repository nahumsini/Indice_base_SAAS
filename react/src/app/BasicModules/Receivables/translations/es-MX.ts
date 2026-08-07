import type { ReceivablesTranslations } from './types';

export const esMX: ReceivablesTranslations = {
  module: {
    title: 'Cartera',
    subtitle: 'Administra ventas a credito, vencimientos, abonos y politicas comerciales de clientes.',
    loadingTitle: 'Cargando cartera',
    loadingDescription: 'Abriendo la seccion seleccionada.',
    navLabel: 'Cartera',
    openBalanceLabel: 'Saldo abierto',
  },
  tabs: {
    'accounts-receivable': 'Cuentas por Cobrar',
    'credit-customers': 'Clientes a Credito',
    'credit-sales': 'Ventas a Credito',
    payments: 'Abonos',
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Cliente, venta o referencia',
    period: 'Periodo',
    status: 'Status',
    unit: 'Unidad',
    business: 'Negocio',
    all: 'Todos',
    allUnits: 'Todas',
    periodOptions: {
      all: 'Todos',
      today: 'Hoy',
      this_week: 'Esta semana',
      this_month: 'Este mes',
      last_month: 'Mes anterior',
    },
  },
  kpiEngine: {
    currency: {
      consolidatedIn: 'Consolidado en',
      nativeOrigin: 'Origen nativo',
      partialTotal: 'Total parcial',
      excludedRecords: (count) => `${count} registros excluidos`,
      dailyRate: 'Tipo de cambio diario',
      unavailable: 'No disponible',
    },
    creditSales: {
      labels: {
        receivableTotal: 'por cobrar',
        visibleSales: 'visibles',
        activeSales: 'activas',
        monthlyFlow: 'pago mensual',
        totalInterest: 'interes',
        completedSales: 'cerradas',
      },
      alerts: {
        nativeCurrencyTotal: (label) => `Nativo ${label}`,
        active: (count) => `${count} activas`,
        simulated: (count) => `${count} en simulacion`,
        blocked: (count) => `${count} detenidas`,
        multiCurrency: (count) => `${count} divisas`,
      },
      segments: {
        active: 'Activas',
        setup: 'Simulacion',
        completed: 'Cerradas',
        stopped: 'Detenidas',
      },
      insight: ({
        active,
        blocked,
        completed,
        nativeTotal,
        preferredCurrency,
        receivableTotal,
        setup,
        total,
        visible,
      }) => {
        if (visible === 0) {
          return 'No hay ventas a credito visibles con los filtros actuales; ajusta periodo, status, unidad o negocio para revisar cartera.';
        }

        if (blocked > 0) {
          return `${blocked} ventas a credito estan detenidas y conviene revisarlas antes de proyectar cobranza.`;
        }

        if (setup > 0) {
          return `${setup} ventas estan en simulacion o aprobacion; completa la corrida financiera antes de convertirlas en cobranza activa.`;
        }

        if (active > 0) {
          return `${active} ventas activas sostienen ${receivableTotal} estimados por cobrar en ${preferredCurrency}. Total nativo: ${nativeTotal}.`;
        }

        return `${completed} ventas cerradas dentro de ${visible} visibles de ${total}. La cartera filtrada queda conciliada en ${preferredCurrency}.`;
      },
    },
    accountsReceivable: {
      labels: {
        openBalance: 'saldo abierto',
        visibleInstallments: 'vencimientos',
        overdue: 'vencidos',
        dueSoon: 'por vencer',
        paid: 'pagados',
        partial: 'parciales',
      },
      alerts: {
        nativeCurrencyTotal: (label) => `Nativo ${label}`,
        overdue: (count) => `${count} vencidos`,
        dueSoon: (count) => `${count} por vencer`,
        multiCurrency: (count) => `${count} divisas`,
      },
      segments: {
        dueSoon: 'Por vencer',
        onTime: 'A tiempo',
        overdue: 'Vencidos',
        paid: 'Pagados',
        partial: 'Parciales',
      },
      insight: ({
        dueSoon,
        nativeTotal,
        openBalance,
        overdue,
        preferredCurrency,
        total,
        visible,
      }) => {
        if (visible === 0) {
          return 'No hay vencimientos visibles con los filtros actuales; ajusta periodo, status, unidad o negocio para revisar cobranza.';
        }

        if (overdue > 0) {
          return `${overdue} vencimientos requieren seguimiento inmediato. Saldo filtrado: ${openBalance} en ${preferredCurrency}.`;
        }

        if (dueSoon > 0) {
          return `${dueSoon} vencimientos estan por llegar; conviene preparar recordatorios antes de que caigan vencidos.`;
        }

        return `${visible} de ${total} vencimientos quedan conciliados en el filtro. Total nativo: ${nativeTotal}.`;
      },
    },
    payments: {
      labels: {
        card: 'tarjeta',
        cash: 'efectivo',
        totalPaid: 'abonado',
        transfer: 'transferencias',
        visiblePayments: 'abonos',
        withReceipt: 'con archivo',
      },
      alerts: {
        missingReceipts: (count) => `${count} sin comprobante`,
        nativeCurrencyTotal: (label) => `Nativo ${label}`,
        withReceipts: (count) => `${count} con comprobante`,
      },
      segments: {
        card: 'Tarjeta',
        cash: 'Efectivo',
        other: 'Otros',
        transfer: 'Transferencia',
      },
      insight: ({
        missingReceipts,
        nativeTotal,
        preferredCurrency,
        totalPaid,
        visible,
        withReceipts,
      }) => {
        if (visible === 0) {
          return 'No hay abonos visibles con los filtros actuales; registra un pago o ajusta el periodo para revisar comprobantes.';
        }

        if (missingReceipts > 0) {
          return `${missingReceipts} abonos aun no tienen comprobante adjunto. Total visible: ${totalPaid} en ${preferredCurrency}.`;
        }

        return `${withReceipts} abonos tienen respaldo adjunto. Total nativo registrado: ${nativeTotal}.`;
      },
    },
    creditCustomers: {
      labels: {
        active: 'activos',
        available: 'disponible',
        blocked: 'bloqueados',
        creditLine: 'linea total',
        review: 'revision',
        visibleCustomers: 'clientes',
      },
      alerts: {
        active: (count) => `${count} activos`,
        blocked: (count) => `${count} bloqueados`,
        review: (count) => `${count} en revision`,
      },
      segments: {
        active: 'Activos',
        blocked: 'Bloqueados',
        review: 'Revision',
      },
      insight: ({
        active,
        available,
        blocked,
        creditLine,
        preferredCurrency,
        review,
        visible,
      }) => {
        if (visible === 0) {
          return 'No hay clientes a credito visibles con los filtros actuales; ajusta unidad, negocio o status.';
        }

        if (blocked > 0 || review > 0) {
          return `${review + blocked} clientes requieren revision de politica antes de liberar nuevas ventas a credito.`;
        }

        return `${active} clientes activos tienen ${available} disponibles de ${creditLine} configurados en ${preferredCurrency}.`;
      },
    },
  },
  status: {
    active: 'Activa',
    approved: 'Aprobada',
    cancelled: 'Cancelada',
    completed: 'Completada',
    draft: 'Borrador',
    due_soon: 'Por vencer',
    on_time: 'A tiempo',
    overdue: 'Vencida',
    paid: 'Pagada',
    partial: 'Parcial',
    rejected: 'Rechazada',
    restructured: 'Reestructurada',
    simulated: 'Simulada',
  },
  creditCustomerStatus: {
    active: 'Activo',
    blocked: 'Bloqueado',
    review: 'En revision',
  },
  paymentMethods: {
    card: 'Tarjeta',
    cash: 'Efectivo',
    check: 'Cheque',
    transfer: 'Transferencia',
    wallet: 'Billetera',
  },
  common: {
    cancel: 'Cancelar',
    close: 'Cerrar',
    financeUser: 'Finanzas',
    noReference: 'Sin referencia',
  },
  views: {
    creditSales: {
      title: 'Ventas a Credito',
      subtitle: 'Ventas transformadas a credito y corridas financieras seleccionadas.',
      action: 'Nueva venta a credito',
      columnsAction: 'Columnas',
      rowActions: {
        detail: 'Ver detalle',
        schedule: 'Ver corrida',
      },
      empty: 'No hay ventas a credito con estos filtros.',
      itemLabel: 'ventas',
      table: {
        actions: 'Acciones',
        due: 'Vence',
        business: 'Negocio',
        customer: 'Cliente',
        monthlyPayment: 'Pago mensual',
        amount: 'Monto',
        run: 'Corrida',
        sale: 'Venta',
        status: 'Status',
        unit: 'Unidad',
      },
    },
    accountsReceivable: {
      title: 'Cuentas por Cobrar',
      subtitle: 'Consulta vencimientos, saldos y estatus de pago por periodo.',
      rowActions: {
        files: 'Ver archivos',
        payment: 'Registrar abono',
      },
      columnsAction: 'Columnas',
      empty: 'No hay vencimientos por cobrar con estos filtros.',
      itemLabel: 'vencimientos',
      table: {
        actions: 'Acciones',
        amount: 'Monto',
        balance: 'Saldo',
        business: 'Negocio',
        customer: 'Cliente',
        dueDate: 'Vencimiento',
        installment: 'Cuota',
        paid: 'Abonado',
        sale: 'Venta',
        status: 'Status',
        unit: 'Unidad',
      },
    },
    payments: {
      title: 'Abonos',
      subtitle: 'Registro de pagos aplicados a ventas a credito.',
      action: 'Registrar abono',
      columnsAction: 'Columnas',
      rowActions: {
        files: 'Ver comprobantes',
      },
      empty: 'No hay abonos con estos filtros.',
      itemLabel: 'abonos',
      table: {
        actions: 'Acciones',
        amount: 'Monto',
        customer: 'Cliente',
        date: 'Fecha',
        files: 'Comprobantes',
        method: 'Metodo',
        reference: 'Referencia',
        registeredBy: 'Registro',
        sale: 'Venta',
      },
    },
    creditCustomers: {
      title: 'Clientes a Credito',
      subtitle: 'Politicas por cliente, limite mensual y linea de credito.',
      action: 'Agregar cliente',
      columnsAction: 'Columnas',
      rowActions: {
        delete: 'Eliminar politica',
        edit: 'Editar politica',
      },
      empty: 'No hay clientes a credito con estos filtros.',
      itemLabel: 'clientes',
      table: {
        actions: 'Acciones',
        annualInterest: 'Interes',
        available: 'Disponible',
        business: 'Negocio',
        customer: 'Cliente',
        line: 'Linea',
        monthlyLimit: 'Limite mensual',
        status: 'Status',
        term: 'Plazo',
        unit: 'Unidad',
      },
    },
  },
  modals: {
    creditSale: {
      title: 'Crear venta a credito',
      description: 'Selecciona una venta, simula interes compuesto y aprueba la corrida financiera.',
      sourceSale: 'Venta origen',
      creditCustomer: 'Cliente a credito',
      creditCustomerHelp: 'El ticket conserva su folio de origen, pero la deuda queda ligada al cliente aprobado.',
      creditCustomerRequired: 'Selecciona un cliente a credito activo para poder aprobar esta venta.',
      noActiveCreditCustomers: 'No hay clientes a credito activos para asignar esta venta.',
      financedAmount: 'Monto a financiar',
      firstDueDate: 'Primer vencimiento',
      months: 'Meses',
      annualInterest: 'Interes anual',
      simulations: 'Corridas financieras',
      monthlyPayment: 'Pago mensual',
      totalInterest: 'Interes total',
      approve: 'Aprobar corrida',
      noSales: 'No hay ventas disponibles para convertir a credito.',
      detailTitle: 'Detalle de venta a credito',
      detailDescription: 'Consulta el origen, cliente, importe y condiciones aprobadas.',
      scheduleTitle: 'Corrida financiera',
      scheduleDescription: 'Calendario estimado de vencimientos generado desde la corrida aprobada.',
      originalAmount: 'Monto original',
      totalPayable: 'Total a pagar',
      term: 'Plazo',
      source: 'Origen',
      firstDueDateLabel: 'Primer vencimiento',
      installment: 'Cuota',
      dueDate: 'Vencimiento',
      balance: 'Saldo',
      availableLine: (amount, months) => `Linea disponible: ${amount} - plazo sugerido ${months} meses`,
      noPolicy: 'Cliente sin politica guardada. Puedes simular la corrida y crear la politica despues.',
      inactivePolicy: 'La politica del cliente no esta activa; selecciona otro cliente a credito o actualiza su status.',
      overLimit: 'El monto financiado excede la linea disponible del cliente seleccionado.',
    },
    payment: {
      title: 'Registrar abono',
      description: 'Aplica un pago a una cuenta abierta y actualiza saldos pendientes.',
      account: 'Cuenta',
      pendingBalance: 'Saldo pendiente',
      amount: 'Monto',
      method: 'Metodo',
      reference: 'Referencia',
      registeredBy: 'Registrado por',
      receipt: 'Comprobante',
      receiptHint: 'Sube imagen, PDF o archivo de respaldo del comprobante.',
      uploadReceipt: 'Subir comprobante',
      replaceReceipt: 'Reemplazar comprobante',
      removeReceipt: 'Quitar comprobante',
      save: 'Guardar abono',
      noAccounts: 'No hay cuentas abiertas para aplicar abonos.',
    },
    files: {
      title: 'Archivos de respaldo',
      description: 'Consulta comprobantes, estados de cuenta o respaldos ligados a este movimiento.',
      amount: 'Monto',
      download: 'Descargar',
      empty: 'No hay archivos registrados para este movimiento.',
      missing: 'Sin archivo',
      noPreview: 'Vista previa no disponible para este formato.',
      open: 'Abrir archivo',
      reference: 'Referencia',
      registeredOn: 'Registrado',
    },
    creditPolicy: {
      title: 'Agregar cliente a credito',
      editTitle: 'Editar cliente a credito',
      description: 'Define linea, limite mensual, plazo sugerido y politica comercial del cliente.',
      editDescription: 'Actualiza linea, limite mensual, plazo sugerido y estado de la politica.',
      customer: 'Cliente',
      creditLine: 'Linea de credito',
      monthlyLimit: 'Limite mensual',
      suggestedTerm: 'Plazo sugerido',
      annualInterest: 'Interes anual',
      status: 'Status',
      notes: 'Notas',
      save: 'Guardar politica',
      update: 'Actualizar politica',
      noCustomers: 'No hay clientes disponibles para agregar.',
      deleteTitle: 'Eliminar politica de credito',
      deleteDescription: (customerName) => `Esta accion quitara a ${customerName} de clientes a credito en esta vista.`,
      deleteAction: 'Eliminar politica',
      deleteConfirm: (customerName) => `Eliminar la politica de credito de ${customerName}?`,
    },
  },
  errors: {
    createCreditPolicy: 'No se pudo crear la politica de credito.',
    createCreditSale: 'No se pudo crear la venta a credito.',
    registerPayment: 'No se pudo registrar el abono.',
  },
};
