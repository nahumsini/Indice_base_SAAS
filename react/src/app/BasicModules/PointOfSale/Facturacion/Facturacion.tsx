import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, FileText, ReceiptText, Search, Send, Wallet } from 'lucide-react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import type { SaleRecord } from '../../Sales/Sales/types/salesTypes';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';

type FiscalStatusFilter = 'all' | 'pending' | 'ready' | 'issued';
type PeriodFilter = 'today' | 'this_month' | 'all';

const fiscalStatusLabels: Record<Exclude<FiscalStatusFilter, 'all'>, string> = {
  pending: 'Pendiente',
  ready: 'Lista',
  issued: 'Emitida',
};

const fiscalStatusClasses: Record<Exclude<FiscalStatusFilter, 'all'>, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ready: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  issued: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoy',
  this_month: 'Este mes',
  all: 'Todo',
};

function isPointOfSaleSale(sale: SaleRecord) {
  return sale.quoteReference === 'POS direct' || sale.saleDocumentReference?.startsWith('TICKET-');
}

function getFiscalStatus(sale: SaleRecord): Exclude<FiscalStatusFilter, 'all'> {
  if (sale.saleDocumentReference?.startsWith('INV-')) {
    return 'issued';
  }

  if (sale.customerName && sale.customerName !== 'Cliente mostrador' && sale.taxTotal >= 0) {
    return 'ready';
  }

  return 'pending';
}

function isInPeriod(sale: SaleRecord, period: PeriodFilter) {
  if (period === 'all') {
    return true;
  }

  const saleDate = new Date(`${sale.saleDate}T12:00:00`);
  const today = new Date();

  if (period === 'today') {
    return saleDate.toDateString() === today.toDateString();
  }

  return saleDate.getFullYear() === today.getFullYear() && saleDate.getMonth() === today.getMonth();
}

export default function Facturacion() {
  const { salesRecords } = useSalesCrm();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [status, setStatus] = useState<FiscalStatusFilter>('all');
  const [notice, setNotice] = useState('');

  const posSales = useMemo(() => salesRecords.filter(isPointOfSaleSale), [salesRecords]);

  const filteredSales = useMemo(() => posSales.filter((sale) => {
    const query = search.trim().toLowerCase();
    const haystack = `${sale.saleNumber} ${sale.customerName} ${sale.paymentMethod} ${sale.currency}`.toLowerCase();
    const fiscalStatus = getFiscalStatus(sale);

    return (!query || haystack.includes(query))
      && isInPeriod(sale, period)
      && (status === 'all' || fiscalStatus === status);
  }), [period, posSales, search, status]);
  const salesPaginationResetKey = useMemo(
    () => `${search}:${period}:${status}:${filteredSales.map((sale) => sale.id).join('|')}`,
    [filteredSales, period, search, status],
  );
  const salesPagination = useTablePagination({
    resetKey: salesPaginationResetKey,
    rows: filteredSales,
  });

  const kpis = useMemo(() => ({
    total: filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    tax: filteredSales.reduce((sum, sale) => sum + sale.taxTotal, 0),
    tickets: filteredSales.length,
    pending: filteredSales.filter((sale) => getFiscalStatus(sale) === 'pending').length,
  }), [filteredSales]);

  const currency = filteredSales[0]?.currency ?? posSales[0]?.currency ?? 'MXN';
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold uppercase text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            <ReceiptText className="h-3.5 w-3.5" />
            Comprobantes POS
          </div>
          <h2 className="text-2xl font-black text-gray-950 dark:text-white">Facturacion retail</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Revisa tickets POS y prepara la emision fiscal cuando el cliente tenga datos completos.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Venta filtrada" value={formatCurrency(kpis.total)} />
        <Kpi icon={ReceiptText} label="Tickets" value={String(kpis.tickets)} tone="blue" />
        <Kpi icon={FileText} label="Impuesto" value={formatCurrency(kpis.tax)} tone="green" />
        <Kpi icon={AlertTriangle} label="Pendientes" value={String(kpis.pending)} tone={kpis.pending > 0 ? 'orange' : 'green'} />
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-100">
        {kpis.pending > 0
          ? `${kpis.pending} tickets necesitan cliente fiscal antes de emitir factura.`
          : 'Los tickets filtrados tienen informacion suficiente para preparar facturacion.'}
      </div>

      {notice && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-100">
          {notice}
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[1.4fr_repeat(2,minmax(180px,1fr))]">
        <label className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar ticket, cliente, metodo o divisa"
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <Select value={period} onChange={(value) => setPeriod(value as PeriodFilter)} options={periodLabels} />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as FiscalStatusFilter)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(fiscalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {['Ticket', 'Cliente', 'Fecha', 'Metodo', 'Subtotal', 'Impuesto', 'Total', 'Estado fiscal', ''].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {salesPagination.paginatedRows.map((sale) => {
                const fiscalStatus = getFiscalStatus(sale);
                return (
                  <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 font-bold text-gray-950 dark:text-white">{sale.saleDocumentReference ?? sale.saleNumber}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{sale.customerName}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatDate(sale.saleDate)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{sale.paymentMethod}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(sale.subtotal)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{formatCurrency(sale.taxTotal)}</td>
                    <td className="px-4 py-3 font-black text-gray-950 dark:text-white">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${fiscalStatusClasses[fiscalStatus]}`}>
                        {fiscalStatusLabels[fiscalStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setNotice(`El ticket ${sale.saleNumber} queda listo para conectar emision fiscal y envio al cliente.`)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        aria-label={`Preparar factura ${sale.saleNumber}`}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="p-8 text-center">
              <p className="font-semibold text-gray-700 dark:text-gray-200">Sin tickets POS con esos filtros</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registra ventas o cambia el periodo.</p>
            </div>
          )}
        </div>
        <PointOfSaleTablePagination {...salesPagination} itemLabel="tickets" />
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'gray' }: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
  tone?: 'gray' | 'blue' | 'green' | 'orange';
}) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p><p className="text-lg font-black text-gray-950 dark:text-white">{value}</p></div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="relative min-w-0">
      <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      >
        {Object.entries(options).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </label>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
