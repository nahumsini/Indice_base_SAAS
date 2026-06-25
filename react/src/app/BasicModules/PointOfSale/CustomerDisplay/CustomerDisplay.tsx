import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  customerDisplayApi,
  type CustomerDisplayItem,
  type CustomerDisplayStateResponse,
} from '../shared/customerDisplay/customerDisplayApi';

export default function CustomerDisplay() {
  const { deviceToken } = useParams();
  return deviceToken ? <LiveCustomerDisplay deviceToken={deviceToken} /> : <PairCustomerDisplay />;
}

function PairCustomerDisplay() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get('code') ?? '';
  const [pairingCode, setPairingCode] = useState(initialCode);
  const [deviceName, setDeviceName] = useState('Pantalla cliente');
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState('');
  const autoPairAttempted = useRef(false);

  const pairDisplay = async () => {
    if (!pairingCode.trim()) {
      setError('Ingresa el código de emparejamiento.');
      return;
    }
    setIsPairing(true);
    setError('');
    try {
      const response = await customerDisplayApi.pair({
        pairingCode,
        deviceName,
      });
      navigate(response.displayUrl, { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo emparejar la pantalla.');
    } finally {
      setIsPairing(false);
    }
  };

  useEffect(() => {
    if (initialCode && !autoPairAttempted.current) {
      autoPairAttempted.current = true;
      void pairDisplay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111827] p-6 text-white">
      <section className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white p-8 text-[#222831] shadow-2xl">
        <div className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#59C3A5]/15 text-5xl" aria-hidden="true">
            🪞
          </span>
          <p className="mt-5 text-xs font-black uppercase tracking-normal text-[#FF6B5E]">Pantalla espejo POS</p>
          <h1 className="mt-2 text-4xl font-black">Conectar pantalla</h1>
          <p className="mt-3 text-base font-semibold text-gray-600">
            Introduce el código que aparece en la caja para mostrar el ticket al cliente en tiempo real.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-black uppercase text-gray-500">Código de caja</span>
            <input
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              className="mt-2 min-h-16 w-full rounded-2xl border-2 border-gray-200 px-5 text-center text-4xl font-black tracking-[0.18em] outline-none transition focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15"
              maxLength={8}
            />
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase text-gray-500">Nombre de pantalla</span>
            <input
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-gray-200 px-4 text-base font-bold outline-none transition focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15"
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => { void pairDisplay(); }}
            disabled={isPairing}
            className="min-h-14 w-full rounded-2xl bg-[#FF6B5E] px-5 py-3 text-lg font-black text-white shadow-lg transition hover:bg-[#ff5a4b] disabled:opacity-60"
          >
            {isPairing ? 'Conectando...' : 'Conectar pantalla'}
          </button>
        </div>
      </section>
    </main>
  );
}

function LiveCustomerDisplay({ deviceToken }: { deviceToken: string }) {
  const [state, setState] = useState<CustomerDisplayStateResponse | null>(null);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      try {
        const response = await customerDisplayApi.getState(deviceToken);
        if (!cancelled) {
          setState(response);
          setError('');
          setLastRefresh(new Date());
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la pantalla.');
        }
      }
    };

    void loadState();
    const intervalId = window.setInterval(loadState, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [deviceToken]);

  const items = useMemo(() => Array.isArray(state?.items) ? state.items : [], [state?.items]);
  const currency = state?.currencyCode || 'MXN';
  const isIdle = !state || items.length === 0 || state.status === 'IDLE';
  const discountAmount = toNumber(state?.discountAmount ?? 0);
  const hasDiscount = discountAmount > 0;

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F8FA] text-[#222831]">
      <div className="mx-auto flex h-screen max-w-[1920px] flex-col p-8">
        <header className="flex items-center justify-between rounded-[32px] bg-[#222831] px-8 py-6 text-white shadow-xl">
          <div className="flex items-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white text-5xl" aria-hidden="true">
              🛍️
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#F4C84A]">Pantalla cliente</p>
              <h1 className="text-4xl font-black">{state?.cashRegisterName || 'Caja POS'}</h1>
              <p className="mt-1 text-lg font-semibold text-gray-300">
                {state?.cashRegisterCode || 'Conectando caja'} · {lastRefresh ? 'en vivo' : 'preparando'}
              </p>
            </div>
          </div>
          <div className="rounded-[24px] bg-white/10 px-6 py-4 text-right">
            <p className="text-sm font-black uppercase text-gray-300">Estado</p>
            <p className="text-2xl font-black">{statusLabel(state?.status)}</p>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-3xl border border-red-200 bg-red-50 px-6 py-4 text-xl font-black text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-h-0 overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-8 py-6">
              <p className="text-sm font-black uppercase tracking-normal text-[#FF6B5E]">Ticket actual</p>
              <h2 className="mt-1 text-4xl font-black">
                {isIdle ? 'Caja lista' : `${state?.itemCount ?? items.length} articulo${(state?.itemCount ?? items.length) === 1 ? '' : 's'}`}
              </h2>
            </div>

            {isIdle ? (
              <div className="flex h-full min-h-[460px] flex-col items-center justify-center p-10 text-center">
                <span className="text-8xl" aria-hidden="true">✨</span>
                <h3 className="mt-8 text-5xl font-black">Listo para atenderte</h3>
                <p className="mt-4 max-w-2xl text-2xl font-semibold text-gray-500">
                  Los productos y el total aparecerán aquí conforme avance la venta.
                </p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <DisplayItemRow
                      key={`${item.sku ?? item.productName}-${index}`}
                      item={item}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-5">
            <div className={`rounded-[32px] p-7 text-white shadow-xl ${state?.status === 'PAID' ? 'bg-[#59C3A5]' : 'bg-[#222831]'}`}>
              <p className="text-lg font-black uppercase opacity-80">Total</p>
              <p className="mt-4 break-words text-6xl font-black leading-none">
                {formatMoney(state?.totalAmount ?? 0, currency)}
              </p>
            </div>

            <div className="grid gap-4">
              <TotalTile label="Subtotal" value={formatMoney(state?.subtotalAmount ?? 0, currency)} />
              {hasDiscount && (
                <TotalTile
                  label="Descuento"
                  value={`-${formatMoney(discountAmount, currency)}`}
                  tone="coral"
                />
              )}
              <TotalTile label="Impuesto" value={formatMoney(state?.taxAmount ?? 0, currency)} />
              <TotalTile label="Pagado" value={formatMoney(state?.paidAmount ?? 0, currency)} tone="aqua" />
              <TotalTile
                label={Number(state?.changeAmount ?? 0) > 0 ? 'Cambio' : 'Falta'}
                value={formatMoney(Number(state?.changeAmount ?? 0) > 0 ? state?.changeAmount ?? 0 : state?.balanceAmount ?? 0, currency)}
                tone={Number(state?.changeAmount ?? 0) > 0 ? 'aqua' : 'yellow'}
              />
            </div>

            <div className="mt-auto rounded-[32px] border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-6">
              <p className="text-2xl font-black text-[#14745F]">
                {state?.customerMessage || 'Gracias por tu compra'}
              </p>
              <p className="mt-2 text-base font-semibold text-gray-600">
                Esta pantalla es solo informativa y se actualiza automáticamente.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function DisplayItemRow({ item, currency }: { item: CustomerDisplayItem; currency: string }) {
  const discountAmount = toNumber(item.discountAmount);
  const hasDiscount = discountAmount > 0;

  return (
    <article className="grid grid-cols-[88px_minmax(0,1fr)_minmax(160px,220px)] items-center gap-5 rounded-[28px] border border-gray-200 bg-[#F7F8FA] p-5">
      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-[24px] bg-[#F4C84A]/25 text-[#222831]">
        <span className="text-3xl font-black leading-none">{item.quantity}</span>
        <span className="text-xs font-black uppercase">uds</span>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-3xl font-black">{item.productName}</h3>
        <p className="mt-1 text-lg font-bold text-gray-500">
          {formatMoney(item.unitPrice, currency)} c/u {item.sku ? `· ${item.sku}` : ''}
        </p>
        {hasDiscount && (
          <p className="mt-3 inline-flex items-center rounded-full bg-[#FF6B5E]/10 px-3 py-1 text-base font-black text-[#C74337]">
            Descuento -{formatMoney(discountAmount, currency)}
          </p>
        )}
      </div>
      <p className="text-right text-4xl font-black">{formatMoney(item.lineTotalAmount, currency)}</p>
    </article>
  );
}

function TotalTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'aqua' | 'yellow' | 'coral';
}) {
  const toneClassName = {
    default: 'bg-white',
    aqua: 'bg-[#59C3A5]/10',
    yellow: 'bg-[#F4C84A]/20',
    coral: 'bg-[#FF6B5E]/10',
  }[tone];
  return (
    <div className={`rounded-[26px] border border-gray-200 p-5 ${toneClassName}`}>
      <p className="text-sm font-black uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function toNumber(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function statusLabel(status?: string) {
  return {
    IDLE: 'Lista',
    ACTIVE: 'En venta',
    READY_TO_PAY: 'Por cobrar',
    PAID: 'Pagado',
    CLOSED: 'Cerrada',
  }[status ?? 'IDLE'] ?? 'En vivo';
}

function formatMoney(value: number | string, currency: string) {
  const amount = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}
