import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  CircleDollarSign,
  RefreshCw,
  Search,
  WalletCards,
} from 'lucide-react';
import {
  applyReceivablePayment,
  getReceivableMetrics,
  normalizeReceivable,
  readStoredReceivables,
  saveStoredReceivables,
  type ReceivableAccount,
  type ReceivablePayment,
  type ReceivableStatus,
} from '../../../CommerceCore/receivables';
import { CreditKpiCard } from './CreditKpiCard';
import { ReceivablePaymentModal } from './ReceivablePaymentModal';
import { ReceivablesTable } from './ReceivablesTable';

const statusLabels: Record<ReceivableStatus, string> = {
  current: 'Vigente',
  due_today: 'Vence hoy',
  overdue: 'Vencida',
  partial: 'Parcial',
  paid: 'Liquidada',
  blocked: 'Bloqueada',
  written_off: 'Incobrable',
};

const formatCurrency = (amount: number, currency = 'MXN') => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency,
}).format(amount);

export function ReceivablesPanel() {
  const [receivables, setReceivables] = useState<ReceivableAccount[]>(() => (
    readStoredReceivables().map(normalizeReceivable)
  ));
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReceivableStatus | 'all'>('all');
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableAccount | null>(null);
  const [notice, setNotice] = useState('');

  const metrics = useMemo(() => getReceivableMetrics(receivables), [receivables]);

  const filteredReceivables = useMemo(() => receivables.filter((receivable) => {
    const query = search.trim().toLowerCase();
    const haystack = [
      receivable.customerName,
      receivable.customerId,
      receivable.saleNumber,
      receivable.creditRuleName,
      receivable.businessUnitName,
      receivable.businessName,
      receivable.notes,
    ].filter(Boolean).join(' ').toLowerCase();

    return (!query || haystack.includes(query)) && (status === 'all' || receivable.status === status);
  }), [receivables, search, status]);

  const balanceByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    receivables.forEach((receivable) => {
      if (receivable.status === 'paid' || receivable.status === 'written_off') {
        return;
      }
      totals.set(receivable.currency, (totals.get(receivable.currency) ?? 0) + receivable.balance);
    });
    return Array.from(totals.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [receivables]);

  const refreshReceivables = () => {
    setReceivables(readStoredReceivables().map(normalizeReceivable));
    setNotice('Cartera actualizada desde ventas POS a credito.');
  };

  const handleSavePayment = (payment: Omit<ReceivablePayment, 'id'>) => {
    if (!selectedReceivable) {
      return;
    }

    const updatedReceivable = applyReceivablePayment(selectedReceivable, payment);
    const nextReceivables = receivables.map((receivable) => (
      receivable.id === updatedReceivable.id ? updatedReceivable : receivable
    ));
    setReceivables(nextReceivables);
    saveStoredReceivables(nextReceivables);
    setSelectedReceivable(null);
    setNotice(`Abono de ${formatCurrency(payment.amount, updatedReceivable.currency)} registrado para ${updatedReceivable.customerName}.`);
  };

  const totalForDistribution = Math.max(1, receivables.length);
  const distribution = {
    current: getPercent(receivables.filter((receivable) => receivable.status === 'current').length, totalForDistribution),
    dueToday: getPercent(receivables.filter((receivable) => receivable.status === 'due_today').length, totalForDistribution),
    overdue: getPercent(receivables.filter((receivable) => receivable.status === 'overdue').length, totalForDistribution),
    partial: getPercent(receivables.filter((receivable) => receivable.status === 'partial').length, totalForDistribution),
    paid: getPercent(receivables.filter((receivable) => receivable.status === 'paid').length, totalForDistribution),
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <CreditKpiCard icon={WalletCards} label="Cuentas abiertas" value={String(metrics.openAccounts)} tone="blue" />
        <CreditKpiCard icon={CircleDollarSign} label="Saldo pendiente" value={formatCurrency(metrics.totalBalance)} tone="orange" />
        <CreditKpiCard icon={AlertTriangle} label="Saldo vencido" value={formatCurrency(metrics.overdueBalance)} tone="red" />
        <CreditKpiCard icon={CalendarClock} label="Vencen hoy" value={String(metrics.dueTodayAccounts)} tone="orange" />
        <CreditKpiCard icon={CheckCircle} label="Liquidadas" value={String(metrics.paidAccounts)} tone="green" />
        <CreditKpiCard icon={CircleDollarSign} label="Cobrado" value={formatCurrency(metrics.collectedAmount)} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_minmax(180px,260px)_auto]">
          <label className="relative min-w-0">
            <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Buscar</span>
            <Search className="absolute left-3 top-[34px] h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cliente, venta, unidad o politica"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </label>
          <Field label="Estado">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ReceivableStatus | 'all')}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={refreshReceivables}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 lg:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        {balanceByCurrency.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {balanceByCurrency.map(([currency, balance]) => (
              <span key={currency} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                {currency} pendiente: {formatCurrency(balance, currency)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="bg-blue-500" style={{ width: `${distribution.current}%` }} />
          <div className="bg-yellow-500" style={{ width: `${distribution.dueToday}%` }} />
          <div className="bg-red-500" style={{ width: `${distribution.overdue}%` }} />
          <div className="bg-amber-500" style={{ width: `${distribution.partial}%` }} />
          <div className="bg-emerald-500" style={{ width: `${distribution.paid}%` }} />
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          {filteredReceivables.length} cuentas visibles; {metrics.overdueAccounts} vencidas y {formatCurrency(metrics.totalBalance)} pendientes de cobro.
        </div>
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
            {notice}
          </div>
        )}
      </div>

      <ReceivablesTable receivables={filteredReceivables} onRegisterPayment={setSelectedReceivable} />
      <ReceivablePaymentModal receivable={selectedReceivable} onClose={() => setSelectedReceivable(null)} onSave={handleSavePayment} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

function getPercent(count: number, total: number) {
  return (count / total) * 100;
}
