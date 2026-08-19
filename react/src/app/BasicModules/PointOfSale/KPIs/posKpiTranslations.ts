import { useMemo } from 'react';
import { useLanguage } from '../../../shared/context';
import { resolvePointOfSaleLocale, type PointOfSaleLocale } from '../translations';
import type { PosKpiPeriod } from './utils/posKpiAnalytics';

type Widen<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result
  : T extends string
    ? string
    : T extends object
      ? { readonly [Key in keyof T]: Widen<T[Key]> }
      : T;

export const enCAPosKpi = {
  common: {
    cashRegister: (id: number) => `Register ${id}`,
    warehouse: (id: number) => `Warehouse ${id}`,
    closedSale: 'closed sale',
    retry: 'Retry',
    previous: 'Previous',
    next: 'Next',
  },
  period: {
    options: [
      { value: 'today' as const, label: 'Today' },
      { value: 'this_week' as const, label: 'Week' },
      { value: 'this_month' as const, label: 'Month' },
      { value: 'all' as const, label: 'All' },
    ],
    labels: {
      today: 'Today',
      this_week: 'This week',
      this_month: 'This month',
      all: 'Full history',
    } satisfies Record<PosKpiPeriod, string>,
  },
  titleBar: {
    eyebrow: 'Retail operations',
    title: 'Point-of-sale KPIs',
    subtitle: 'Executive view of closings, tickets, payment mix, and cash differences by period.',
    print: 'Print report',
  },
  filters: {
    title: 'POS reading filters',
    refresh: 'Refresh KPIs',
  },
  states: {
    loading: 'Loading real POS closings for the selected period.',
    empty: 'No real cash closings exist in this period. Open and close a shift to feed these KPIs.',
    paymentBreakdownLimited: 'The payment breakdown shows cash from the list; use a shorter period to load every payment method.',
    paymentBreakdownPending: 'The monetary breakdown by method will appear when the backend provides the authoritative aggregation by payment method.',
  },
  cards: {
    revenue: 'POS sales',
    tickets: 'Tickets',
    cashSales: 'Cash sales',
    cashDifference: 'Cash difference',
    expectedCash: 'Expected cash',
    countedCash: 'Counted cash',
    closings: 'Closings',
    topWarehouse: 'Top warehouse',
    averageTicket: (value: string) => `Avg. ticket ${value}`,
    cashRegistered: 'Registered cash collection',
    overShortRate: (value: string) => `${value} over cash`,
    backendCalculated: 'Calculated by backend',
    reportedClosings: 'Reported in closings',
    recordsAvailable: (count: number) => `${count} available records`,
    noDominantWarehouse: 'No dominant warehouse',
  },
  context: {
    preferredCurrency: (currency: string) => `Preferred currency: ${currency}`,
    readClosings: (closings: number, total: number) => `Closings read: ${closings} / ${total}`,
    native: (value: string) => `Native: ${value}`,
    configuredRate: 'Configured rate',
    dailyRate: 'Daily rate',
  },
  signals: {
    title: 'POS executive signals',
    subtitle: 'Cash, ticket, and operating stability readout for the period.',
    requiresReview: 'Requires review',
    operational: 'Operational',
    noClosings: 'No closings',
    cashAccuracy: 'Cash accuracy',
    closedTickets: 'Closed tickets',
    executiveReadout: 'Executive readout',
    closingsFeed: (count: number) => `${count} closings feed the readout.`,
  },
  operating: {
    salesByClosing: 'Sales by closing',
    salesByClosingHelp: 'Operating rhythm by closing hour.',
    noClosings: 'No cash closings in the period.',
    paymentMix: 'Payment mix',
    noPayments: 'No payments recorded in the period.',
    charged: 'charged',
    topRegisters: 'Registers with sales',
    noRegisterClosings: 'No closings by register in the period',
    topWarehouses: 'POS warehouses',
    noWarehouseClosings: 'No closings by warehouse in the period',
    currencies: 'POS currencies',
    noCurrencies: 'No currencies recorded in the period.',
  },
  table: {
    title: 'Closings feeding KPIs',
    subtitle: 'Quick audit of shifts, tickets, sales, and cash differences.',
    rows: 'Rows',
    columns: ['Closing', 'Register', 'Warehouse', 'Tickets', 'Total sales', 'Expected cash', 'Difference'],
    empty: 'No closings to show for the period.',
    pageSummary: (page: number, totalPages: number, totalItems: number) => `Page ${page} / ${totalPages} - ${totalItems} closings`,
  },
  report: {
    paymentMix: 'Payment mix',
    salesByHour: 'Sales by hour',
    topRegisters: 'Registers with highest sales',
    topWarehouses: 'Warehouses with highest sales',
    documentName: 'Point-of-sale KPIs',
    period: 'Period',
    preferredCurrency: 'Preferred currency',
    includedClosings: 'Included closings',
    availableRecords: 'Available records',
    title: 'Point-of-sale KPIs',
    subtitle: 'Executive view of closings, tickets, payment mix, and cash differences by period.',
    emptyTable: 'No cash closings in the period.',
    headers: ['Closing', 'Date', 'Register', 'Warehouse', 'Tickets', 'Sales', 'Difference'],
    tableTitle: 'Cash closing detail',
  },
  insights: {
    difference: (value: string, currency: string) => `There is a net cash difference of ${value} ${currency}; review cash audits before closing the period.`,
    noClosings: (period: string) => `No POS closings are visible in ${period}; KPIs activate when the first shift is closed.`,
    tickets: (tickets: number, period: string) => `${tickets} tickets closed in ${period}; POS sales are ready for financial follow-up.`,
    closingsWithoutTickets: (closings: number, period: string) => `${closings} closings without tickets in ${period}; review operations before comparing sales.`,
  },
} as const;

export type PosKpiCopy = Widen<typeof enCAPosKpi>;

export const esMXPosKpi: PosKpiCopy = {
  common: {
    cashRegister: (id) => `Caja ${id}`,
    warehouse: (id) => `Almacén ${id}`,
    closedSale: 'venta cerrada',
    retry: 'Reintentar',
    previous: 'Anterior',
    next: 'Siguiente',
  },
  period: {
    options: [
      { value: 'today', label: 'Hoy' },
      { value: 'this_week', label: 'Semana' },
      { value: 'this_month', label: 'Mes' },
      { value: 'all', label: 'Todo' },
    ],
    labels: {
      today: 'Hoy',
      this_week: 'Esta semana',
      this_month: 'Este mes',
      all: 'Todo el historial',
    },
  },
  titleBar: {
    eyebrow: 'Retail operativo',
    title: 'KPIs de punto de venta',
    subtitle: 'Lectura ejecutiva de cierres, tickets, mezcla de pago y diferencias de caja por periodo.',
    print: 'Imprimir reporte',
  },
  filters: {
    title: 'Filtros de lectura POS',
    refresh: 'Actualizar KPIs',
  },
  states: {
    loading: 'Cargando cierres reales de POS para el periodo seleccionado.',
    empty: 'No hay cierres de caja reales en este periodo. Abre y cierra un turno para alimentar estos KPIs.',
    paymentBreakdownLimited: 'El desglose por método muestra efectivo del listado; usa un periodo más corto para cargar todos los métodos.',
    paymentBreakdownPending: 'El desglose monetario por método se mostrará cuando el backend entregue la agregación autoritativa por forma de pago.',
  },
  cards: {
    revenue: 'Venta POS',
    tickets: 'Tickets',
    cashSales: 'Venta efectivo',
    cashDifference: 'Diferencia caja',
    expectedCash: 'Efectivo esperado',
    countedCash: 'Efectivo contado',
    closings: 'Cierres',
    topWarehouse: 'Almacén líder',
    averageTicket: (value) => `Ticket prom. ${value}`,
    cashRegistered: 'Cobro cash registrado',
    overShortRate: (value) => `${value} sobre efectivo`,
    backendCalculated: 'Calculado por backend',
    reportedClosings: 'Reportado en cierres',
    recordsAvailable: (count) => `${count} registros disponibles`,
    noDominantWarehouse: 'Sin almacén dominante',
  },
  context: {
    preferredCurrency: (currency) => `Moneda preferida: ${currency}`,
    readClosings: (closings, total) => `Cierres leídos: ${closings} / ${total}`,
    native: (value) => `Nativo: ${value}`,
    configuredRate: 'Tasa configurada',
    dailyRate: 'Tasa diaria',
  },
  signals: {
    title: 'Señales ejecutivas POS',
    subtitle: 'Lectura de caja, tickets y estabilidad operativa del periodo.',
    requiresReview: 'Requiere revisión',
    operational: 'Operativo',
    noClosings: 'Sin cierres',
    cashAccuracy: 'Precisión de caja',
    closedTickets: 'Tickets cerrados',
    executiveReadout: 'Lectura ejecutiva',
    closingsFeed: (count) => `${count} cierres alimentan la lectura.`,
  },
  operating: {
    salesByClosing: 'Ventas por cierre',
    salesByClosingHelp: 'Ritmo operativo según hora de arqueo.',
    noClosings: 'Sin cierres de caja en el periodo.',
    paymentMix: 'Mezcla de pago',
    noPayments: 'Sin pagos registrados en el periodo.',
    charged: 'cobrado',
    topRegisters: 'Cajas con venta',
    noRegisterClosings: 'Sin cierres por caja en el periodo',
    topWarehouses: 'Almacenes POS',
    noWarehouseClosings: 'Sin cierres por almacén en el periodo',
    currencies: 'Divisas POS',
    noCurrencies: 'Sin divisas registradas en el periodo.',
  },
  table: {
    title: 'Cierres que alimentan los KPIs',
    subtitle: 'Auditoría rápida de turnos, tickets, ventas y diferencias de caja.',
    rows: 'Filas',
    columns: ['Cierre', 'Caja', 'Almacén', 'Tickets', 'Venta total', 'Efectivo esperado', 'Diferencia'],
    empty: 'Sin cierres para mostrar en el periodo.',
    pageSummary: (page, totalPages, totalItems) => `Página ${page} / ${totalPages} - ${totalItems} cierres`,
  },
  report: {
    paymentMix: 'Mezcla de pago',
    salesByHour: 'Venta por hora',
    topRegisters: 'Cajas con mayor venta',
    topWarehouses: 'Almacenes con mayor venta',
    documentName: 'KPIs de punto de venta',
    period: 'Periodo',
    preferredCurrency: 'Moneda preferida',
    includedClosings: 'Cierres incluidos',
    availableRecords: 'Registros disponibles',
    title: 'KPIs de punto de venta',
    subtitle: 'Lectura ejecutiva de cierres, tickets, mezcla de pago y diferencias de caja por periodo.',
    emptyTable: 'No hay cierres de caja en el periodo.',
    headers: ['Cierre', 'Fecha', 'Caja', 'Almacén', 'Tickets', 'Venta', 'Diferencia'],
    tableTitle: 'Detalle de cierres de caja',
  },
  insights: {
    difference: (value, currency) => `Hay una diferencia neta de caja de ${value} ${currency}; revisa arqueos antes de cerrar el periodo.`,
    noClosings: (period) => `No hay cierres POS visibles en ${period}; los KPIs se activan cuando se cierre el primer turno.`,
    tickets: (tickets, period) => `${tickets} tickets cerrados en ${period}; la venta POS ya está lista para seguimiento financiero.`,
    closingsWithoutTickets: (closings, period) => `${closings} cierres sin tickets en ${period}; revisa operaciones antes de comparar ventas.`,
  },
};

const copyByLocale: Record<PointOfSaleLocale, PosKpiCopy> = {
  'en-CA': enCAPosKpi,
  'en-US': enCAPosKpi,
  'es-MX': esMXPosKpi,
  'es-CO': esMXPosKpi,
  'fr-CA': enCAPosKpi,
  'pt-BR': enCAPosKpi,
  'ko-CA': enCAPosKpi,
  'zh-CA': enCAPosKpi,
};

export function getPosKpiCopy(locale: PointOfSaleLocale): PosKpiCopy {
  return copyByLocale[locale];
}

export function usePosKpiCopy() {
  const { currentLanguage } = useLanguage();
  const locale = useMemo(() => resolvePointOfSaleLocale(currentLanguage.code), [currentLanguage.code]);
  const copy = useMemo(() => getPosKpiCopy(locale), [locale]);
  return { copy, locale };
}
