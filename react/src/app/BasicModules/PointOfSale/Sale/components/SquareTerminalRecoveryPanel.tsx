import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { posBackendApi, type PosSquareTerminalPaymentResponse } from '../services/posBackendApi';

interface SquareTerminalRecoveryPanelProps {
  cashRegisterId: number | string;
  shiftId: number | string;
  disabled?: boolean;
  formatCurrency: (amount: number) => string;
  onRecover: (intentId: number | string) => Promise<PosSquareTerminalPaymentResponse | null>;
}

const toNumber = (value: number | string | null | undefined) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const isRecoverableStatus = (status: string) => ['waiting', 'approved', 'uncertain'].includes(status.toLowerCase());

export function SquareTerminalRecoveryPanel({
  cashRegisterId,
  shiftId,
  disabled = false,
  formatCurrency,
  onRecover,
}: SquareTerminalRecoveryPanelProps) {
  const [items, setItems] = useState<PosSquareTerminalPaymentResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await posBackendApi.listRecoverableSquareTerminalPayments({
        cashRegisterId,
        shiftId,
        limit: 10,
      });
      setItems(response.items.filter((item) => isRecoverableStatus(String(item.status))));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Square recovery payments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [cashRegisterId, shiftId]);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const recover = async (intentId: number | string) => {
    setBusyId(`recover-${intentId}`);
    setNotice('');
    const response = await onRecover(intentId);
    if (response) {
      setNotice(response.message || `Square payment ${response.status}.`);
    }
    await load();
    setBusyId('');
  };

  const cancel = async (intentId: number | string) => {
    setBusyId(`cancel-${intentId}`);
    setNotice('');
    try {
      const response = await posBackendApi.cancelSquareTerminalPayment(intentId);
      setNotice(response.message || `Square payment ${response.status}.`);
      await load();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Square payment could not be cancelled.');
    } finally {
      setBusyId('');
    }
  };

  if (!items.length && !loading && !error && !notice) return null;

  return (
    <section className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div>
            <h2 className="font-medium">Square payment recovery</h2>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-200">
              Recover or cancel pending terminal payments before charging again.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || disabled}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/40 dark:bg-slate-950 dark:text-amber-100"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}
      {notice ? <p className="mt-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800">{notice}</p> : null}

      {items.length ? (
        <div className="mt-3 grid gap-2">
          {items.map((item) => {
            const amount = formatCurrency(toNumber(item.amount));
            const recoverBusy = busyId === `recover-${item.intentId}`;
            const cancelBusy = busyId === `cancel-${item.intentId}`;
            return (
              <div key={item.intentId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-amber-500/30 dark:bg-slate-950 dark:text-white">
                <div className="min-w-0">
                  <p className="font-medium">Intent #{item.intentId} · {amount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    {item.status} · {item.squareCheckoutId || 'not sent to Square yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void recover(item.intentId)}
                    disabled={disabled || Boolean(busyId)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <RotateCcw className={`h-4 w-4 ${recoverBusy ? 'animate-spin' : ''}`} />
                    Recover
                  </button>
                  <button
                    type="button"
                    onClick={() => void cancel(item.intentId)}
                    disabled={disabled || Boolean(busyId)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-200 dark:hover:bg-red-500/10"
                  >
                    <XCircle className={`h-4 w-4 ${cancelBusy ? 'animate-spin' : ''}`} />
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
