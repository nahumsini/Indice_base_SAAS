import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, CalendarClock, CreditCard, FileText, ReceiptText, Search, Send, Wallet } from 'lucide-react';
import { useTablePagination } from '../../../hooks/useTablePagination';
import { useSalesCrm } from '../../Sales/salesCrmContext';
import type { SaleRecord } from '../../Sales/Sales/types/salesTypes';
import { PointOfSaleTablePagination } from '../shared/components/PointOfSaleTablePagination';
import { PointOfSaleTitleBar } from '../shared/components/PointOfSaleTitleBar';

type FiscalStatusFilter = 'all' | 'pending' | 'ready' | 'issued';
type PeriodFilter = 'today' | 'this_month' | 'all';

const fiscalStatusLabels: Record<Exclude<FiscalStatusFilter, 'all'>, string> = {
  pending: 'Pendiente',
  ready: 'Lista',
  issued: 'Emitida',
};

const fiscalStatusClasses: Record<Exclude<FiscalStatusFilter, 'all'>, string> = {
  pending: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-900/30 dark:text-amber-300',
  ready: 'border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-500/30 dark:bg-blue-900/30 dark:text-blue-300',
  issued: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/30 dark:text-emerald-300',
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
  const navigate = useNavigate();
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

  const openCreditSale = (sale: SaleRecord) => {
    const candidateSaleId = sale.backendId ? `sales:${sale.backendId}` : sale.id;
    navigate(`/receivables/credit-sales?candidateSaleId=${encodeURIComponent(candidateSaleId)}&openCreditSale=1`);
  };

  return (
    <div className="space-y-5">
      <PointOfSaleTitleBar
        eyebrow="Comprobantes POS"
        icon="🧾"
        rhIndent
        title="Facturacion retail"
        subtitle="Revisa tickets POS y prepara la emision fiscal cuando el cliente tenga datos completos."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Wallet} label="Venta filtrada" value={formatCurrency(kpis.total)} />
        <Kpi icon={ReceiptText} label="Tickets" value={String(kpis.tickets)} tone="blue" />
        <Kpi icon={FileText} label="Impuesto" value={formatCurrency(kpis.tax)} tone="green" />
        <Kpi icon={AlertTriangle} label="Pendientes" value={String(kpis.pending)} tone={kpis.pending > 0 ? 'orange' : 'green'} />
      </div>

      <div className="rounded-[20px] border border-[#F4C84A]/35 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold text-[#7C5604] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10 dark:text-[#FAD76A]">
        {kpis.pending > 0
          ? `${kpis.pending} tickets necesitan cliente fiscal antes de emitir factura.`
          : 'Los tickets filtrados tienen informacion suficiente para preparar facturacion.'}
      </div>

      {notice && (
        <div className="rounded-[20px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {notice}
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Filtros</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_repeat(2,minmax(180px,1fr))]">
          <label className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar ticket, cliente, metodo o divisa"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <Select value={period} onChange={(value) => setPeriod(value as PeriodFilter)} options={periodLabels} />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as FiscalStatusFilter)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(fiscalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-gray-900/40">
              <tr>
                {['Ticket', 'Cliente', 'Fecha', 'Metodo', 'Subtotal', 'Impuesto', 'Total', 'Estado fiscal', 'Acciones'].map((header) => (
                  <th key={header} className={`px-5 py-5 text-sm font-semibold text-slate-500 dark:text-slate-400 ${header === 'Acciones' ? 'text-right' : 'text-left'}`}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {salesPagination.paginatedRows.map((sale) => {
                const fiscalStatus = getFiscalStatus(sale);
                return (
                  <tr key={sale.id} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-700/40">
                    <td className="px-5 py-4 font-bold text-slate-950 dark:text-white">{sale.saleDocumentReference ?? sale.saleNumber}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">{sale.customerName}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatDate(sale.saleDate)}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{sale.paymentMethod}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCurrency(sale.subtotal)}</td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-200">{formatCurrency(sale.taxTotal)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-950 dark:text-white">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${fiscalStatusClasses[fiscalStatus]}`}>
                        {fiscalStatusLabels[fiscalStatus]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-gray-900">
                        <button
                          onClick={() => openCreditSale(sale)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                          aria-label={`Pasar ticket ${sale.saleNumber} a credito`}
                          title="Pasar a credito"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setNotice(`El ticket ${sale.saleNumber} queda listo para conectar emision fiscal y envio al cliente.`)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
                          aria-label={`Preparar factura ${sale.saleNumber}`}
                          title="Preparar factura"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="p-8 text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Sin tickets POS con esos filtros</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registra ventas o cambia el periodo.</p>
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
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    orange: 'bg-[#FFF3F1] text-[#B63B32] dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]',
  };

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{label}</p><p className="text-lg font-bold text-slate-950 dark:text-white">{value}</p></div>
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 shadow-none outline-none transition focus:border-[#FF6B5E] focus:ring-2 focus:ring-[#FF6B5E]/20 dark:border-slate-700 dark:bg-gray-900 dark:text-white"
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
