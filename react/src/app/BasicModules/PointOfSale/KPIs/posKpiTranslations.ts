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
    all: 'All',
    unavailable: 'Unavailable',
    retry: 'Retry',
  },
  period: {
    options: [
      { value: 'today' as const, label: 'Today' },
      { value: 'this_week' as const, label: 'This week' },
      { value: 'this_month' as const, label: 'This month' },
      { value: 'custom' as const, label: 'Custom' },
    ],
    labels: {
      today: 'Today',
      this_week: 'This week',
      this_month: 'This month',
      custom: 'Custom period',
    } satisfies Record<PosKpiPeriod, string>,
  },
  titleBar: {
    title: 'KPIs',
    subtitle: 'Analyze sales, tickets, payment methods, and register performance by period.',
    print: 'Print report',
  },
  filters: {
    title: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Closing, warehouse, register, or cashier',
    period: 'Period',
    warehouse: 'Warehouse',
    cashRegister: 'Register',
    cashier: 'Cashier',
    from: 'From',
    to: 'To',
  },
  states: {
    loading: 'Loading POS results and the previous comparison period.',
    empty: 'No closed POS activity exists for these filters.',
    partialRows: 'The analysis reached the 10,000-closing safety limit. Narrow the period for a complete comparison.',
  },
  comparison: {
    previous: (value: string) => `${value} vs. previous period`,
    unavailable: 'No previous baseline',
    points: (value: string) => `${value} pp vs. previous`,
  },
  cards: {
    revenue: 'POS sales',
    tickets: 'Tickets',
    averageTicket: 'Average ticket',
    averageClosing: 'Average per closing',
    cashAccuracy: 'Cash accuracy',
    cashDifference: 'Cash differences',
    refunds: 'Refunds',
    coverage: 'Register coverage',
    salesDetail: 'Converted to the preferred currency.',
    ticketsDetail: (closings: number) => `${closings} closing(s) included.`,
    averageTicketDetail: 'Sales divided by completed tickets.',
    averageClosingDetail: 'Sales divided by included closings.',
    accuracyDetail: 'Uses absolute shortages and overages; they never cancel out.',
    differenceDetail: (shortage: string, overage: string) => `Short ${shortage} · Over ${overage}`,
    refundDetail: (rate: string) => `${rate}% of period sales.`,
    coverageDetail: (used: number, active: number) => `${used} of ${active} active register(s) sold.`,
  },
  context: {
    preferredCurrency: (currency: string) => `Preferred total: ${currency}`,
    readClosings: (closings: number, total: number) => `Closings analyzed: ${closings} / ${total}`,
    native: (value: string) => `Native: ${value}`,
    configuredRate: 'Configured rate',
    dailyRate: 'Daily rate',
    partial: (records: number, currencies: string) => records > 0
      ? `${records} excluded record(s)${currencies ? ` · ${currencies}` : ''}`
      : 'Partial dataset',
  },
  operating: {
    salesTrend: 'Sales trend',
    salesTrendHelp: 'Current period against the immediately preceding equivalent period.',
    noTrend: 'No daily sales are available for this scope.',
    currentPeriod: 'Current period',
    previousPeriod: 'Previous period',
    paymentMix: 'Payment mix',
    paymentMixHelp: 'Amounts converted to the preferred currency.',
    noPayments: 'No payments were recorded in this period.',
    paymentMethods: {
      CASH: 'Cash',
      CARD: 'Card',
      TRANSFER: 'Transfer',
      CREDIT: 'Credit',
    },
    topRegisters: 'Top registers',
    noRegisterClosings: 'No register activity in the period.',
    topWarehouses: 'Top warehouses',
    noWarehouseClosings: 'No warehouse activity in the period.',
    rankingDetail: (share: number, tickets: number) => `${share.toFixed(1)}% share · ${tickets} ticket(s)`,
    viewFilter: 'Filter',
  },
  alerts: {
    title: 'Attention required',
    subtitle: 'Only conditions that may require an operational decision appear here.',
    partialTitle: 'Incomplete analytical scope',
    partialText: 'Some records could not be included. Narrow the period or review the exchange-rate context.',
    differenceTitle: 'Cash differences detected',
    differenceText: (shortage: string, overage: string) => `Shortages: ${shortage}. Overages: ${overage}.`,
    refundTitle: 'Elevated refund rate',
    refundText: (rate: string) => `Refunds represent ${rate}% of sales in the selected period.`,
    accuracyTitle: 'Cash accuracy needs review',
    accuracyText: (accuracy: string) => `Cash accuracy is ${accuracy}%, below the 99.5% healthy reference.`,
  },
  table: {
    title: 'Register performance',
    subtitle: 'Compare sales, ticket value, cash accuracy, refunds, and the most recent closing.',
    columns: {
      register: 'Register and warehouse',
      sales: 'Sales',
      tickets: 'Tickets',
      averageTicket: 'Average ticket',
      closings: 'Closings',
      accuracy: 'Cash accuracy',
      refunds: 'Refunds',
      lastClosing: 'Last closing',
      actions: 'Actions',
    },
    empty: 'No register performance to show for these filters.',
    itemLabel: 'registers',
    viewClosings: (register: string) => `View closings for ${register}`,
  },
  report: {
    documentName: 'Point-of-sale KPIs',
    period: 'Period',
    preferredCurrency: 'Preferred currency',
    includedClosings: 'Included closings',
    availableRecords: 'Available records',
    title: 'Point-of-sale KPIs',
    subtitle: 'Sales, tickets, payments, and register performance.',
    paymentMix: 'Payment mix',
    salesTrend: 'Sales trend',
    topRegisters: 'Top registers',
    topWarehouses: 'Top warehouses',
    emptyTable: 'No register performance in the period.',
    headers: ['Register', 'Warehouse', 'Sales', 'Tickets', 'Average ticket', 'Accuracy', 'Refunds', 'Last closing'],
    tableTitle: 'Register performance',
  },
} as const;

export type PosKpiCopy = Widen<typeof enCAPosKpi>;

export const esMXPosKpi: PosKpiCopy = {
  common: {
    all: 'Todos',
    unavailable: 'No disponible',
    retry: 'Reintentar',
  },
  period: {
    options: [
      { value: 'today', label: 'Hoy' },
      { value: 'this_week', label: 'Esta semana' },
      { value: 'this_month', label: 'Este mes' },
      { value: 'custom', label: 'Personalizado' },
    ],
    labels: {
      today: 'Hoy',
      this_week: 'Esta semana',
      this_month: 'Este mes',
      custom: 'Periodo personalizado',
    },
  },
  titleBar: {
    title: 'KPIs',
    subtitle: 'Analiza ventas, tickets, medios de pago y desempeño de cajas por periodo.',
    print: 'Imprimir reporte',
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Corte, almacén, caja o cajero',
    period: 'Periodo',
    warehouse: 'Almacén',
    cashRegister: 'Caja',
    cashier: 'Cajero',
    from: 'Desde',
    to: 'Hasta',
  },
  states: {
    loading: 'Cargando resultados POS y el periodo anterior para comparación.',
    empty: 'No hay actividad POS cerrada para estos filtros.',
    partialRows: 'El análisis alcanzó el límite de seguridad de 10,000 cortes. Reduce el periodo para obtener una comparación completa.',
  },
  comparison: {
    previous: (value) => `${value} vs. periodo anterior`,
    unavailable: 'Sin base anterior',
    points: (value) => `${value} pp vs. anterior`,
  },
  cards: {
    revenue: 'Ventas POS',
    tickets: 'Tickets',
    averageTicket: 'Ticket promedio',
    averageClosing: 'Venta promedio por corte',
    cashAccuracy: 'Precisión de caja',
    cashDifference: 'Diferencias de caja',
    refunds: 'Devoluciones',
    coverage: 'Cobertura de cajas',
    salesDetail: 'Convertido a la divisa preferida.',
    ticketsDetail: (closings) => `${closings} corte(s) incluidos.`,
    averageTicketDetail: 'Ventas divididas entre tickets terminados.',
    averageClosingDetail: 'Ventas divididas entre cortes incluidos.',
    accuracyDetail: 'Usa faltantes y sobrantes absolutos; nunca se cancelan.',
    differenceDetail: (shortage, overage) => `Faltante ${shortage} · Sobrante ${overage}`,
    refundDetail: (rate) => `${rate}% de las ventas del periodo.`,
    coverageDetail: (used, active) => `${used} de ${active} caja(s) activas vendieron.`,
  },
  context: {
    preferredCurrency: (currency) => `Total preferido: ${currency}`,
    readClosings: (closings, total) => `Cortes analizados: ${closings} / ${total}`,
    native: (value) => `Nativo: ${value}`,
    configuredRate: 'Tasa configurada',
    dailyRate: 'Tasa diaria',
    partial: (records, currencies) => records > 0
      ? `${records} registro(s) excluidos${currencies ? ` · ${currencies}` : ''}`
      : 'Conjunto de datos parcial',
  },
  operating: {
    salesTrend: 'Tendencia de ventas',
    salesTrendHelp: 'Periodo actual contra el periodo equivalente inmediatamente anterior.',
    noTrend: 'No hay ventas diarias disponibles para este alcance.',
    currentPeriod: 'Periodo actual',
    previousPeriod: 'Periodo anterior',
    paymentMix: 'Mezcla de pago',
    paymentMixHelp: 'Importes convertidos a la divisa preferida.',
    noPayments: 'No hay pagos registrados en este periodo.',
    paymentMethods: {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      TRANSFER: 'Transferencia',
      CREDIT: 'Crédito',
    },
    topRegisters: 'Cajas con mayor venta',
    noRegisterClosings: 'No hay actividad por caja en el periodo.',
    topWarehouses: 'Almacenes con mayor venta',
    noWarehouseClosings: 'No hay actividad por almacén en el periodo.',
    rankingDetail: (share, tickets) => `${share.toFixed(1)}% participación · ${tickets} ticket(s)`,
    viewFilter: 'Filtrar',
  },
  alerts: {
    title: 'Requiere atención',
    subtitle: 'Aquí solo aparecen condiciones que pueden necesitar una decisión operativa.',
    partialTitle: 'Alcance analítico incompleto',
    partialText: 'Algunos registros no pudieron incluirse. Reduce el periodo o revisa el contexto de tipo de cambio.',
    differenceTitle: 'Diferencias de efectivo detectadas',
    differenceText: (shortage, overage) => `Faltantes: ${shortage}. Sobrantes: ${overage}.`,
    refundTitle: 'Nivel elevado de devoluciones',
    refundText: (rate) => `Las devoluciones representan ${rate}% de las ventas del periodo seleccionado.`,
    accuracyTitle: 'La precisión de caja necesita revisión',
    accuracyText: (accuracy) => `La precisión es ${accuracy}%, por debajo de la referencia saludable de 99.5%.`,
  },
  table: {
    title: 'Rendimiento por caja',
    subtitle: 'Compara ventas, valor del ticket, precisión, devoluciones y el cierre más reciente.',
    columns: {
      register: 'Caja y almacén',
      sales: 'Ventas',
      tickets: 'Tickets',
      averageTicket: 'Ticket promedio',
      closings: 'Cortes',
      accuracy: 'Precisión de caja',
      refunds: 'Devoluciones',
      lastClosing: 'Último cierre',
      actions: 'Acciones',
    },
    empty: 'No hay rendimiento por caja para mostrar con estos filtros.',
    itemLabel: 'cajas',
    viewClosings: (register) => `Ver cortes de ${register}`,
  },
  report: {
    documentName: 'KPIs de punto de venta',
    period: 'Periodo',
    preferredCurrency: 'Divisa preferida',
    includedClosings: 'Cortes incluidos',
    availableRecords: 'Registros disponibles',
    title: 'KPIs de punto de venta',
    subtitle: 'Ventas, tickets, medios de pago y rendimiento de cajas.',
    paymentMix: 'Mezcla de pago',
    salesTrend: 'Tendencia de ventas',
    topRegisters: 'Cajas con mayor venta',
    topWarehouses: 'Almacenes con mayor venta',
    emptyTable: 'No hay rendimiento por caja en el periodo.',
    headers: ['Caja', 'Almacén', 'Ventas', 'Tickets', 'Ticket promedio', 'Precisión', 'Devoluciones', 'Último cierre'],
    tableTitle: 'Rendimiento por caja',
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
