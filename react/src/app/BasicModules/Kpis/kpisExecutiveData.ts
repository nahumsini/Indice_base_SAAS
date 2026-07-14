import {
  AlertTriangle,
  Banknote,
  BarChart3,
  BellRing,
  BookOpenCheck,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Landmark,
  LineChart,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export type KpiStatus = 'healthy' | 'watch' | 'critical';
export type StatementId =
  | 'income'
  | 'balance'
  | 'cash-flow'
  | 'budget'
  | 'payables'
  | 'receivables'
  | 'cash-position'
  | 'commercial-margin'
  | 'inventory'
  | 'trial-balance'
  | 'general-ledger'
  | 'equity'
  | 'taxes';

export type StatementLine = {
  label: string;
  value: number;
  kind?: 'income' | 'expense' | 'asset' | 'liability' | 'equity' | 'subtotal' | 'total' | 'neutral';
  detail?: string;
};

export type StatementTableRow = {
  label: string;
  columns: Array<string | number>;
  status?: KpiStatus;
};

export type FinancialStatement = {
  id: StatementId;
  title: string;
  category: string;
  description: string;
  icon: LucideIcon;
  status: KpiStatus;
  insight: string;
  period: string;
  lines?: StatementLine[];
  columns?: string[];
  rows?: StatementTableRow[];
};

export type CompositeKpiComponent = {
  label: string;
  source: string;
  score: number;
  weight: number;
  drilldown: string;
};

export type CompositeKpi = {
  id: string;
  title: string;
  owner: string;
  score: number;
  target: number;
  status: KpiStatus;
  trend: number;
  formula: string;
  insight: string;
  components: CompositeKpiComponent[];
};

export type BaseMetric = {
  id: string;
  title: string;
  value: string;
  source: string;
  status: KpiStatus;
  description: string;
  icon: LucideIcon;
};

export type AutomationRule = {
  id: string;
  title: string;
  trigger: string;
  audience: string;
  cadence: string;
  status: 'ready' | 'draft' | 'paused';
  nextRun: string;
  description: string;
};

export const KPI_ACCENT = '#147514';
export const KPI_ACCENT_DARK = '#105010';
export const KPI_ACCENT_SOFT = '#EAF7EA';

const financials = {
  revenue: 428500,
  costOfSales: 168200,
  payroll: 92000,
  rentServices: 36500,
  marketing: 24800,
  admin: 18700,
  pettyCashExpenses: 13200,
  otherIncome: 6200,
  interestExpense: 5300,
  taxEstimate: 18500,
  cash: 128400,
  receivables: 86400,
  inventory: 142900,
  prepaid: 18600,
  fixedAssets: 320000,
  accumulatedDepreciation: -62500,
  otherAssets: 24000,
  payables: 79500,
  taxesPayable: 22100,
  payrollLiabilities: 18400,
  shortDebt: 42000,
  longDebt: 188000,
  capital: 250300,
};

export const grossProfit = financials.revenue - financials.costOfSales;
export const operatingExpenses =
  financials.payroll +
  financials.rentServices +
  financials.marketing +
  financials.admin +
  financials.pettyCashExpenses;
export const operatingIncome = grossProfit - operatingExpenses;
export const netIncome =
  operatingIncome + financials.otherIncome - financials.interestExpense - financials.taxEstimate;
export const currentAssets =
  financials.cash + financials.receivables + financials.inventory + financials.prepaid;
export const nonCurrentAssets =
  financials.fixedAssets + financials.accumulatedDepreciation + financials.otherAssets;
export const totalAssets = currentAssets + nonCurrentAssets;
export const currentLiabilities =
  financials.payables + financials.taxesPayable + financials.payrollLiabilities + financials.shortDebt;
export const totalLiabilities = currentLiabilities + financials.longDebt;
export const totalEquity = financials.capital + netIncome;

export function formatCurrency(value: number, locale = 'es-MX', currency = 'MXN') {
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function formatNumber(value: number, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, locale = 'es-MX') {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, style: 'percent' }).format(value / 100);
}

export function statusFromScore(score: number): KpiStatus {
  if (score >= 85) return 'healthy';
  if (score >= 70) return 'watch';
  return 'critical';
}

export const statusLabels: Record<KpiStatus, string> = {
  healthy: 'Sano',
  watch: 'Atencion',
  critical: 'Critico',
};

export const statusClasses: Record<KpiStatus, string> = {
  healthy:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  watch:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
};

export const scoreBarClasses: Record<KpiStatus, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-[#F4C84A]',
  critical: 'bg-rose-500',
};

export const executiveMetrics: BaseMetric[] = [
  {
    id: 'net-income',
    title: 'Utilidad neta proforma',
    value: formatCurrency(netIncome),
    source: 'Estado de resultados',
    status: statusFromScore(78),
    description: 'Resultado gerencial despues de gastos operativos, intereses e impuesto estimado.',
    icon: CircleDollarSign,
  },
  {
    id: 'cash-position',
    title: 'Posicion de caja',
    value: formatCurrency(financials.cash),
    source: 'Caja y bancos',
    status: statusFromScore(88),
    description: 'Liquidez disponible en bancos operativos, caja POS y fondos administrados.',
    icon: WalletCards,
  },
  {
    id: 'gross-margin',
    title: 'Margen bruto',
    value: formatPercent((grossProfit / financials.revenue) * 100),
    source: 'Ventas e inventario',
    status: statusFromScore(86),
    description: 'Relacion entre ingresos y costo de ventas estimado.',
    icon: TrendingUp,
  },
  {
    id: 'budget-risk',
    title: 'Presupuesto comprometido',
    value: '96.5%',
    source: 'Expenses + Budgets',
    status: 'watch',
    description: 'Gasto real mas comprometido contra presupuesto del periodo.',
    icon: Gauge,
  },
  {
    id: 'payables-risk',
    title: 'CxP vencida',
    value: formatCurrency(24200),
    source: 'Gastos por pagar',
    status: 'watch',
    description: 'Pagos vencidos que presionan flujo y reputacion con proveedores.',
    icon: AlertTriangle,
  },
  {
    id: 'receivables',
    title: 'CxC pendiente',
    value: formatCurrency(financials.receivables),
    source: 'Ventas + Receivables',
    status: 'healthy',
    description: 'Saldo pendiente de cobro para convertir a efectivo.',
    icon: ReceiptText,
  },
];

export const compositeKpis: CompositeKpi[] = [
  {
    id: 'financial-health',
    title: 'Salud financiera',
    owner: 'Direccion financiera',
    score: 77,
    target: 85,
    status: 'watch',
    trend: -3,
    formula: 'Liquidez 30% + Rentabilidad 25% + Presupuesto 20% + Riesgo de pago 15% + Caja 10%',
    insight:
      'La utilidad es positiva y la caja alcanza, pero el presupuesto comprometido y la CxP vencida bajan el score.',
    components: [
      { label: 'Liquidez', source: 'Caja + CxC + CxP', score: 82, weight: 30, drilldown: 'Posicion de caja' },
      { label: 'Rentabilidad', source: 'Estado de resultados', score: 76, weight: 25, drilldown: 'Resultados' },
      { label: 'Control presupuestal', source: 'Budgets', score: 71, weight: 20, drilldown: 'Presupuesto vs real' },
      { label: 'Riesgo de pago', source: 'Payables', score: 68, weight: 15, drilldown: 'Cuentas por pagar' },
      { label: 'Cobertura de caja', source: 'Cash flow', score: 84, weight: 10, drilldown: 'Flujo de efectivo' },
    ],
  },
  {
    id: 'operational-health',
    title: 'Salud operativa',
    owner: 'Direccion operativa',
    score: 74,
    target: 85,
    status: 'watch',
    trend: 2,
    formula: 'Productividad 35% + Auditoria 20% + Evidencia 15% + Vencidas 20% + Proyectos 10%',
    insight:
      'La operacion avanza, pero todavia hay cierres por auditar y tareas vencidas que deben resolverse.',
    components: [
      { label: 'Productividad', source: 'Procesos y tareas', score: 78, weight: 35, drilldown: 'Agenda' },
      { label: 'Auditoria', source: 'Tareas auditadas', score: 62, weight: 20, drilldown: 'Auditorias' },
      { label: 'Evidencia', source: 'Adjuntos', score: 72, weight: 15, drilldown: 'Evidencias' },
      { label: 'Vencidas', source: 'Agenda', score: 69, weight: 20, drilldown: 'Tareas vencidas' },
      { label: 'Proyectos', source: 'Projects', score: 84, weight: 10, drilldown: 'Proyectos' },
    ],
  },
  {
    id: 'commercial-health',
    title: 'Salud comercial',
    owner: 'Direccion comercial',
    score: 81,
    target: 85,
    status: 'watch',
    trend: 5,
    formula: 'Ingresos 30% + Margen 25% + Conversion 20% + Ticket 15% + Cobranza 10%',
    insight:
      'Ventas y margen se ven fuertes; la oportunidad esta en conversion y velocidad de cobranza.',
    components: [
      { label: 'Ingresos', source: 'Ventas/POS', score: 86, weight: 30, drilldown: 'Ventas' },
      { label: 'Margen', source: 'Inventario + Ventas', score: 84, weight: 25, drilldown: 'Margen comercial' },
      { label: 'Conversion', source: 'Cotizaciones', score: 73, weight: 20, drilldown: 'Cotizaciones' },
      { label: 'Ticket promedio', source: 'POS', score: 79, weight: 15, drilldown: 'Punto de venta' },
      { label: 'Cobranza', source: 'Receivables', score: 77, weight: 10, drilldown: 'Cuentas por cobrar' },
    ],
  },
];

export const financialStatements: FinancialStatement[] = [
  {
    id: 'income',
    title: 'Estado de resultados gerencial',
    category: 'Rentabilidad',
    description: 'Ingresos, costos, gastos y utilidad proforma del periodo.',
    icon: ChartNoAxesCombined,
    status: 'healthy',
    insight: 'La utilidad neta es positiva; el gasto operativo consume 71.1% del margen bruto.',
    period: 'Mes actual',
    lines: [
      { label: 'Ingresos por ventas', value: financials.revenue, kind: 'income' },
      { label: 'Costo de ventas', value: -financials.costOfSales, kind: 'expense' },
      { label: 'Margen bruto', value: grossProfit, kind: 'subtotal' },
      { label: 'Nomina', value: -financials.payroll, kind: 'expense' },
      { label: 'Renta y servicios', value: -financials.rentServices, kind: 'expense' },
      { label: 'Marketing y ventas', value: -financials.marketing, kind: 'expense' },
      { label: 'Administracion', value: -financials.admin, kind: 'expense' },
      { label: 'Caja chica aplicada', value: -financials.pettyCashExpenses, kind: 'expense' },
      { label: 'Utilidad operativa', value: operatingIncome, kind: 'subtotal' },
      { label: 'Otros ingresos', value: financials.otherIncome, kind: 'income' },
      { label: 'Intereses', value: -financials.interestExpense, kind: 'expense' },
      { label: 'Impuesto estimado', value: -financials.taxEstimate, kind: 'expense' },
      { label: 'Utilidad neta proforma', value: netIncome, kind: 'total' },
    ],
  },
  {
    id: 'balance',
    title: 'Balance general proforma',
    category: 'Posicion financiera',
    description: 'Activos, pasivos y capital estimados con informacion operativa disponible.',
    icon: Landmark,
    status: 'healthy',
    insight: 'El balance esta cuadrado en version proforma; la deuda representa 53.2% de activos.',
    period: 'Corte actual',
    lines: [
      { label: 'Efectivo y bancos', value: financials.cash, kind: 'asset' },
      { label: 'Cuentas por cobrar', value: financials.receivables, kind: 'asset' },
      { label: 'Inventario', value: financials.inventory, kind: 'asset' },
      { label: 'Pagos anticipados', value: financials.prepaid, kind: 'asset' },
      { label: 'Activo circulante', value: currentAssets, kind: 'subtotal' },
      { label: 'Activo fijo', value: financials.fixedAssets, kind: 'asset' },
      { label: 'Depreciacion acumulada', value: financials.accumulatedDepreciation, kind: 'expense' },
      { label: 'Otros activos', value: financials.otherAssets, kind: 'asset' },
      { label: 'Total activos', value: totalAssets, kind: 'total' },
      { label: 'Cuentas por pagar', value: financials.payables, kind: 'liability' },
      { label: 'Impuestos por pagar', value: financials.taxesPayable, kind: 'liability' },
      { label: 'Nomina por pagar', value: financials.payrollLiabilities, kind: 'liability' },
      { label: 'Deuda corto plazo', value: financials.shortDebt, kind: 'liability' },
      { label: 'Deuda largo plazo', value: financials.longDebt, kind: 'liability' },
      { label: 'Total pasivos', value: totalLiabilities, kind: 'subtotal' },
      { label: 'Capital social', value: financials.capital, kind: 'equity' },
      { label: 'Resultado del periodo', value: netIncome, kind: 'equity' },
      { label: 'Total pasivo + capital', value: totalLiabilities + totalEquity, kind: 'total' },
    ],
  },
  {
    id: 'cash-flow',
    title: 'Flujo de efectivo directo',
    category: 'Liquidez',
    description: 'Entradas y salidas operativas para leer caja del periodo.',
    icon: Banknote,
    status: 'healthy',
    insight: 'El flujo neto es positivo por $9,500, pero depende de mantener cobranza activa.',
    period: 'Mes actual',
    lines: [
      { label: 'Caja inicial', value: 118900, kind: 'subtotal' },
      { label: 'Cobros de clientes', value: 431800, kind: 'income' },
      { label: 'Otros ingresos cobrados', value: 6700, kind: 'income' },
      { label: 'Pagos a proveedores', value: -165000, kind: 'expense' },
      { label: 'Nomina pagada', value: -92000, kind: 'expense' },
      { label: 'Gastos operativos pagados', value: -93600, kind: 'expense' },
      { label: 'Impuestos pagados', value: -18500, kind: 'expense' },
      { label: 'Servicio de deuda', value: -12000, kind: 'expense' },
      { label: 'Inversion en equipo', value: -47700, kind: 'expense' },
      { label: 'Flujo neto', value: 9500, kind: 'subtotal' },
      { label: 'Caja final', value: financials.cash, kind: 'total' },
    ],
  },
  {
    id: 'budget',
    title: 'Presupuesto vs real',
    category: 'Control',
    description: 'Lectura ejecutiva de planeado, comprometido, real y disponible.',
    icon: ClipboardList,
    status: 'watch',
    insight: 'El presupuesto aun no esta excedido, pero el comprometido deja poco margen.',
    period: 'Mes actual',
    columns: ['Planeado', 'Comprometido', 'Real', 'Disponible', 'Estado'],
    rows: [
      { label: 'Operacion', columns: [255000, 61000, 185200, 8800, 'Atencion'], status: 'watch' },
      { label: 'Ventas y marketing', columns: [38000, 5200, 24800, 8000, 'Sano'], status: 'healthy' },
      { label: 'Administracion', columns: [25000, 3300, 18700, 3000, 'Sano'], status: 'healthy' },
      { label: 'Caja chica', columns: [12000, 0, 13200, -1200, 'Excedido'], status: 'critical' },
    ],
  },
  {
    id: 'payables',
    title: 'Cuentas por pagar',
    category: 'Riesgo de pago',
    description: 'Antiguedad de saldos por pagar y presion de caja.',
    icon: CalendarClock,
    status: 'watch',
    insight: '$24,200 vencidos requieren priorizacion antes del siguiente corte.',
    period: 'Corte actual',
    columns: ['Saldo', 'Participacion', 'Prioridad'],
    rows: [
      { label: 'Por vencer', columns: [38500, '48.4%', 'Normal'], status: 'healthy' },
      { label: '1 a 7 dias vencido', columns: [16800, '21.1%', 'Alta'], status: 'watch' },
      { label: '8 a 30 dias vencido', columns: [14300, '18.0%', 'Alta'], status: 'watch' },
      { label: 'Mas de 30 dias', columns: [9900, '12.5%', 'Critica'], status: 'critical' },
    ],
  },
  {
    id: 'receivables',
    title: 'Cuentas por cobrar',
    category: 'Cobranza',
    description: 'Antiguedad de saldos pendientes de cobro.',
    icon: ReceiptText,
    status: 'healthy',
    insight: 'El 83.1% de CxC esta dentro de 15 dias; la cartera larga es controlable.',
    period: 'Corte actual',
    columns: ['Saldo', 'Participacion', 'Accion'],
    rows: [
      { label: 'Corriente', columns: [47200, '54.6%', 'Seguimiento regular'], status: 'healthy' },
      { label: '1 a 15 dias', columns: [24600, '28.5%', 'Recordatorio'], status: 'healthy' },
      { label: '16 a 30 dias', columns: [10200, '11.8%', 'Gestion activa'], status: 'watch' },
      { label: 'Mas de 30 dias', columns: [4400, '5.1%', 'Escalar'], status: 'critical' },
    ],
  },
  {
    id: 'cash-position',
    title: 'Posicion de caja',
    category: 'Liquidez',
    description: 'Saldo disponible por cuenta o caja administrada.',
    icon: WalletCards,
    status: 'healthy',
    insight: 'Caja operativa suficiente para 18 dias de egresos promedio.',
    period: 'Corte actual',
    columns: ['Saldo', 'Uso', 'Estado'],
    rows: [
      { label: 'Banco operativo', columns: [95500, 'Pagos generales', 'Sano'], status: 'healthy' },
      { label: 'Banco nomina', columns: [18600, 'Nomina', 'Atencion'], status: 'watch' },
      { label: 'Caja POS', columns: [9600, 'Venta diaria', 'Sano'], status: 'healthy' },
      { label: 'Fondos/caja chica', columns: [4700, 'Reposicion menor', 'Sano'], status: 'healthy' },
    ],
  },
  {
    id: 'commercial-margin',
    title: 'Margen comercial',
    category: 'Rentabilidad comercial',
    description: 'Utilidad bruta por ventas y eficiencia comercial.',
    icon: LineChart,
    status: 'healthy',
    insight: 'Margen bruto fuerte; descuentos y costo de venta deben monitorearse por producto.',
    period: 'Mes actual',
    columns: ['Venta', 'Costo', 'Margen', 'Margen %'],
    rows: [
      { label: 'Productos', columns: [286000, 128300, 157700, '55.1%'], status: 'healthy' },
      { label: 'Servicios', columns: [96500, 23900, 72600, '75.2%'], status: 'healthy' },
      { label: 'POS mostrador', columns: [46000, 16000, 30000, '65.2%'], status: 'healthy' },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventario financiero',
    category: 'Activo operativo',
    description: 'Valor de inventario, ajustes y riesgo de rotacion.',
    icon: PackageCheck,
    status: 'watch',
    insight: '$18,600 de inventario lento puede convertirse en descuento o merma.',
    period: 'Corte actual',
    columns: ['Valor', 'Riesgo', 'Accion'],
    rows: [
      { label: 'Inventario disponible', columns: [142900, 'Normal', 'Mantener'], status: 'healthy' },
      { label: 'Inventario lento', columns: [18600, 'Atencion', 'Liquidar'], status: 'watch' },
      { label: 'Ajustes/mermas', columns: [4200, 'Atencion', 'Auditar'], status: 'watch' },
      { label: 'En transito', columns: [27300, 'Normal', 'Recibir'], status: 'healthy' },
    ],
  },
  {
    id: 'trial-balance',
    title: 'Balanza de comprobacion proforma',
    category: 'Contabilidad',
    description: 'Resumen de saldos deudores y acreedores estimados.',
    icon: BookOpenCheck,
    status: 'healthy',
    insight: 'La balanza proforma cuadra; falta backend de polizas para formalizar auditoria.',
    period: 'Corte actual',
    columns: ['Debe', 'Haber', 'Saldo'],
    rows: [
      { label: 'Bancos', columns: [128400, 0, 128400], status: 'healthy' },
      { label: 'Clientes', columns: [86400, 0, 86400], status: 'healthy' },
      { label: 'Inventario', columns: [142900, 0, 142900], status: 'healthy' },
      { label: 'Proveedores', columns: [0, 79500, -79500], status: 'watch' },
      { label: 'Deuda bancaria', columns: [0, 230000, -230000], status: 'watch' },
      { label: 'Capital', columns: [0, 250300, -250300], status: 'healthy' },
      { label: 'Resultado del periodo', columns: [0, 57500, -57500], status: 'healthy' },
    ],
  },
  {
    id: 'general-ledger',
    title: 'Libro mayor proforma',
    category: 'Contabilidad',
    description: 'Movimientos gerenciales simulados por cuenta principal.',
    icon: Building2,
    status: 'watch',
    insight: 'Vista util para lectura ejecutiva; requiere backend contable para trazabilidad formal.',
    period: 'Mes actual',
    columns: ['Cuenta', 'Debe', 'Haber', 'Referencia'],
    rows: [
      { label: 'Ventas del periodo', columns: ['Ingresos', 0, 428500, 'Ventas/POS'], status: 'healthy' },
      { label: 'Costo de ventas', columns: ['Costo', 168200, 0, 'Inventario'], status: 'healthy' },
      { label: 'Gastos operativos', columns: ['Gastos', 185200, 0, 'Expenses'], status: 'watch' },
      { label: 'Cobros clientes', columns: ['Bancos', 431800, 0, 'Receivables'], status: 'healthy' },
      { label: 'Pagos proveedores', columns: ['Bancos', 0, 165000, 'Payables'], status: 'watch' },
    ],
  },
  {
    id: 'equity',
    title: 'Estado de cambios en capital',
    category: 'Capital',
    description: 'Movimiento proforma de capital y resultados acumulados.',
    icon: ShieldCheck,
    status: 'healthy',
    insight: 'El capital crece por resultado positivo; no se registran retiros en el periodo.',
    period: 'Mes actual',
    columns: ['Inicial', 'Movimiento', 'Final'],
    rows: [
      { label: 'Capital social', columns: [250300, 0, 250300], status: 'healthy' },
      { label: 'Resultado del periodo', columns: [0, 57500, 57500], status: 'healthy' },
      { label: 'Retiros/dividendos', columns: [0, 0, 0], status: 'healthy' },
      { label: 'Capital contable proforma', columns: [250300, 57500, totalEquity], status: 'healthy' },
    ],
  },
  {
    id: 'taxes',
    title: 'Impuestos e IVA estimado',
    category: 'Fiscal gerencial',
    description: 'Lectura estimada de impuestos por pagar con datos operativos.',
    icon: Landmark,
    status: 'watch',
    insight: 'El impuesto esta estimado; requiere reglas fiscales y polizas para precision formal.',
    period: 'Mes actual',
    columns: ['Base', 'Estimado', 'Estado'],
    rows: [
      { label: 'IVA trasladado', columns: [428500, 68560, 'Por declarar'], status: 'watch' },
      { label: 'IVA acreditable', columns: [168200, 26912, 'Por comprobar'], status: 'watch' },
      { label: 'IVA neto estimado', columns: [260300, 41648, 'Atencion'], status: 'watch' },
      { label: 'ISR estimado', columns: [62700, 18500, 'Provisionado'], status: 'healthy' },
    ],
  },
];

export const automationRules: AutomationRule[] = [
  {
    id: 'weekly-executive',
    title: 'Resumen ejecutivo semanal',
    trigger: 'Cada lunes 08:00',
    audience: 'Direccion general',
    cadence: 'Semanal',
    status: 'ready',
    nextRun: 'Proximo lunes',
    description: 'Envia salud financiera, operativa y comercial con acciones recomendadas.',
  },
  {
    id: 'budget-alert',
    title: 'Alerta de presupuesto al 85%',
    trigger: 'Cuando presupuesto comprometido >= 85%',
    audience: 'Finanzas + responsables de unidad',
    cadence: 'Evento',
    status: 'draft',
    nextRun: 'Al detectar riesgo',
    description: 'Notifica excedentes probables antes de convertirlos en gasto real.',
  },
  {
    id: 'payables-risk',
    title: 'CxP vencida critica',
    trigger: 'CxP > 7 dias vencida',
    audience: 'Tesoreria',
    cadence: 'Diaria',
    status: 'ready',
    nextRun: 'Manana 09:00',
    description: 'Prioriza proveedores con riesgo y sugiere plan de pagos.',
  },
  {
    id: 'month-close',
    title: 'Paquete de cierre mensual',
    trigger: 'Ultimo dia del mes',
    audience: 'Direccion + contabilidad',
    cadence: 'Mensual',
    status: 'paused',
    nextRun: 'Pausado',
    description: 'Compila estados proforma, saldos, presupuesto y variaciones relevantes.',
  },
];

export const reportPackages = [
  {
    title: 'Paquete financiero mensual',
    description: 'Estado de resultados, balance, flujo, presupuesto vs real e impuestos estimados.',
    statements: ['income', 'balance', 'cash-flow', 'budget', 'taxes'] as StatementId[],
    icon: BarChart3,
    status: 'ready',
  },
  {
    title: 'Paquete de liquidez',
    description: 'Caja, CxP, CxC, flujo directo y riesgo de pagos a 7/15/30 dias.',
    statements: ['cash-position', 'payables', 'receivables', 'cash-flow'] as StatementId[],
    icon: Banknote,
    status: 'ready',
  },
  {
    title: 'Paquete contable proforma',
    description: 'Balanza, libro mayor, capital e impuestos estimados para revision previa.',
    statements: ['trial-balance', 'general-ledger', 'equity', 'taxes'] as StatementId[],
    icon: BookOpenCheck,
    status: 'draft',
  },
];

export const automationStatusLabels: Record<AutomationRule['status'], string> = {
  ready: 'Listo',
  draft: 'Borrador',
  paused: 'Pausado',
};

export const automationStatusClasses: Record<AutomationRule['status'], string> = {
  ready: statusClasses.healthy,
  draft: statusClasses.watch,
  paused:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
};

export const statementGroups = [
  { id: 'profitability', label: 'Rentabilidad', icon: TrendingUp },
  { id: 'liquidity', label: 'Liquidez', icon: WalletCards },
  { id: 'control', label: 'Control', icon: Gauge },
  { id: 'accounting', label: 'Contabilidad proforma', icon: BookOpenCheck },
  { id: 'risk', label: 'Riesgo', icon: BellRing },
  { id: 'loss', label: 'Fugas', icon: TrendingDown },
];
