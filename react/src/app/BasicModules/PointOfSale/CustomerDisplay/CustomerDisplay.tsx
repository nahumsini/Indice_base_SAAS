import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { useKioskSessionBoundary } from '../../../components/kiosk-engine/useKioskSessionBoundary';
import { ApiClientError } from '../../../lib/apiClient';
import {
  completeKioskIdempotentOperation,
  kioskIdempotencyKeyFor,
} from '../../../components/kiosk-engine/kioskIdempotency';
import {
  customerDisplayApi,
  type CustomerDisplayItem,
  type CustomerDisplayStateResponse,
} from '../shared/customerDisplay/customerDisplayApi';
import {
  type PointOfSaleKioskTranslations,
  usePointOfSaleKioskTranslations,
} from '../Kiosks/kioskTranslations';

export default function CustomerDisplay() {
  const { deviceToken } = useParams();
  return deviceToken ? <LiveCustomerDisplay deviceToken={deviceToken} /> : <PairCustomerDisplay />;
}

function PairCustomerDisplay() {
  const { copy } = usePointOfSaleKioskTranslations();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = useRef(searchParams.get('code') ?? '').current;
  const [pairingCode, setPairingCode] = useState(initialCode);
  const [deviceName, setDeviceName] = useState(copy.customerDisplayPublic.defaultDeviceName);
  const [isReady, setIsReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState('');
  const autoPairAttempted = useRef(false);
  const { isOnline } = useKioskSessionBoundary({
    active: false,
    inactivityTimeoutSeconds: 60,
    onExpire: () => undefined,
  });

  useLayoutEffect(() => {
    if (!searchParams.has('code')) return;
    const sanitizedParams = new URLSearchParams(searchParams);
    sanitizedParams.delete('code');
    setSearchParams(sanitizedParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const preparePairing = useCallback(async () => {
    setIsPreparing(true);
    setError('');
    try {
      await customerDisplayApi.pairingBootstrap();
      setIsReady(true);
      return true;
    } catch (requestError) {
      setIsReady(false);
      setError(publicCustomerDisplayError(requestError, copy.customerDisplayPublic.prepareError, copy));
      return false;
    } finally {
      setIsPreparing(false);
    }
  }, [copy]);

  const pairDisplay = useCallback(async () => {
    if (!pairingCode.trim()) {
      setError(copy.customerDisplayPublic.codeRequired);
      return;
    }
    if (!isOnline) {
      setError(copy.customerDisplayPublic.offline);
      return;
    }
    if (!isReady && !(await preparePairing())) return;
    setIsPairing(true);
    setError('');
    const payload = { pairingCode: pairingCode.trim(), deviceName: deviceName.trim() };
    const operation = 'pos-customer-display-pair';
    try {
      const response = await customerDisplayApi.pair(
        payload,
        kioskIdempotencyKeyFor(operation, payload),
      );
      completeKioskIdempotentOperation(operation);
      navigate(response.displayUrl, { replace: true });
    } catch (requestError) {
      setError(publicCustomerDisplayError(requestError, copy.customerDisplayPublic.pairingError, copy));
    } finally {
      setIsPairing(false);
    }
  }, [copy, deviceName, isOnline, isReady, navigate, pairingCode, preparePairing]);

  useEffect(() => {
    if (isOnline) void preparePairing();
  }, [isOnline, preparePairing]);

  useEffect(() => {
    if (initialCode && isReady && !autoPairAttempted.current) {
      autoPairAttempted.current = true;
      void pairDisplay();
    }
  }, [initialCode, isReady, pairDisplay]);

  return (
    <KioskPublicShell
      maxWidthClassName="max-w-2xl"
      errorMessage={error || (!isOnline ? copy.customerDisplayPublic.shellOffline : null)}
      header={(
        <header className="bg-[#222831] px-5 py-5 text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F4C84A]">{copy.customerDisplayPublic.kioskEyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{copy.customerDisplayPublic.connectTitle}</h1>
          <p className="mt-2 text-sm text-gray-300">{copy.customerDisplayPublic.connectDescription}</p>
        </header>
      )}
      loadingOverlay={isPreparing && isOnline ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50" role="status">
          <div className="rounded-lg bg-white px-5 py-4 font-semibold text-slate-900 shadow-xl">
            {copy.customerDisplayPublic.preparingKiosk}
          </div>
        </div>
      ) : null}
    >
      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-4 text-[#222831] dark:text-white">
        <div className="text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#59C3A5]/15 text-4xl" aria-hidden="true">
            ↔
          </span>
          <h2 className="mt-5 text-3xl font-semibold">{copy.customerDisplayPublic.registerCodeTitle}</h2>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            {copy.customerDisplayPublic.registerCodeHelp}
          </p>
        </div>

        <div className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{copy.customerDisplayPublic.registerCode}</span>
            <input
              value={pairingCode}
              onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              inputMode="text"
              autoComplete="one-time-code"
              aria-label={copy.customerDisplayPublic.pairingCodeLabel}
              className="mt-2 min-h-16 w-full rounded-lg border-2 border-gray-200 bg-white px-5 text-center text-3xl font-semibold tracking-[0.18em] text-[#222831] outline-none transition focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              maxLength={8}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{copy.customerDisplayPublic.displayName}</span>
            <input
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
              maxLength={160}
              className="mt-2 min-h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-base font-medium text-[#222831] outline-none transition focus:border-[#59C3A5] focus:ring-4 focus:ring-[#59C3A5]/15 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <button
            type="button"
            onClick={() => { void pairDisplay(); }}
            disabled={isPairing || isPreparing || !isOnline}
            className="min-h-14 w-full rounded-lg bg-[#FF6B5E] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#e85c50] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPairing ? copy.customerDisplayPublic.connecting : copy.customerDisplayPublic.connect}
          </button>
        </div>
      </section>
    </KioskPublicShell>
  );
}

function LiveCustomerDisplay({ deviceToken }: { deviceToken: string }) {
  const { copy, locale } = usePointOfSaleKioskTranslations();
  const [state, setState] = useState<CustomerDisplayStateResponse | null>(null);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pollGeneration, setPollGeneration] = useState(0);
  const { isOnline } = useKioskSessionBoundary({
    active: false,
    inactivityTimeoutSeconds: 60,
    onExpire: () => undefined,
  });

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;
    let activeRequest: AbortController | null = null;
    let terminal = false;
    setState(null);
    setError('');
    setLastRefresh(null);

    if (!isOnline) {
      return () => { cancelled = true; };
    }

    const scheduleNextPoll = (delayMs: number) => {
      if (cancelled || terminal) return;
      retryTimer = window.setTimeout(() => { void loadState(); }, delayMs);
    };

    const loadState = async () => {
      if (cancelled || terminal || activeRequest) return;
      activeRequest = new AbortController();
      try {
        const response = await customerDisplayApi.getState(deviceToken, activeRequest.signal);
        if (!cancelled) {
          setState(response);
          setError('');
          setLastRefresh(new Date());
        }
      } catch (requestError) {
        if (cancelled || isAbortError(requestError)) return;
        if (isTerminalCustomerDisplayError(requestError)) {
          terminal = true;
          setState(null);
          setLastRefresh(null);
          setError(copy.customerDisplayPublic.displayUnavailable);
        } else {
          setError(publicCustomerDisplayError(requestError, copy.customerDisplayPublic.loadError, copy));
        }
      } finally {
        activeRequest = null;
        scheduleNextPoll(terminal ? 0 : 1000);
      }
    };

    void loadState();
    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      activeRequest?.abort();
    };
  }, [copy, deviceToken, isOnline, pollGeneration]);

  const items = useMemo(() => Array.isArray(state?.items) ? state.items : [], [state?.items]);
  const currency = state?.currencyCode || 'MXN';
  const isIdle = !state || items.length === 0 || state.status === 'IDLE';
  const discountAmount = toNumber(state?.discountAmount ?? 0);
  const hasDiscount = discountAmount > 0;

  if (!state) {
    const statusMessage = !isOnline
      ? copy.customerDisplayPublic.offline
      : error || copy.customerDisplayPublic.preparingDisplay;
    return (
      <KioskPublicShell
        maxWidthClassName="max-w-2xl"
        errorMessage={error || null}
        header={(
          <header className="bg-[#222831] px-6 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F4C84A]">{copy.customerDisplayPublic.kioskEyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold">{copy.customerDisplayPublic.displayTitle}</h1>
          </header>
        )}
      >
        <div role="status" className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <MonitorStatusIcon online={isOnline && !error} />
            <p className="mt-5 text-lg font-semibold">{statusMessage}</p>
            {error && isOnline ? (
              <button type="button" onClick={() => setPollGeneration(current => current + 1)} className="mt-5 min-h-11 rounded-lg bg-[#FF6B5E] px-5 font-semibold text-white">
                {copy.common.retry}
              </button>
            ) : null}
          </div>
        </div>
      </KioskPublicShell>
    );
  }

  return (
    <KioskPublicShell
      maxWidthClassName="max-w-[1920px]"
      errorMessage={error || null}
      header={(
        <header className="flex flex-col gap-4 bg-[#222831] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-base font-black text-[#222831] sm:h-20 sm:w-20 sm:rounded-3xl sm:text-xl" aria-hidden="true">
              POS
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[#F4C84A] sm:text-sm">{copy.customerDisplayPublic.liveEyebrow}</p>
              <h1 className="truncate text-2xl font-black sm:text-3xl lg:text-4xl">{state.kioskName || state.cashRegisterName || copy.customerDisplayPublic.defaultRegister}</h1>
              <p className="mt-1 truncate text-sm font-bold text-gray-200 sm:text-lg">{state.companyName}</p>
              <p className="hidden text-sm font-semibold text-gray-300 sm:block lg:text-base">
                {[state.unitName, state.businessName, state.warehouseName].filter(Boolean).join(' · ')}
              </p>
              <p className="text-sm font-semibold text-gray-300 lg:text-base">
                {state.cashRegisterCode || copy.customerDisplayPublic.connectingRegister} · {lastRefresh ? copy.customerDisplayPublic.live : copy.customerDisplayPublic.preparing}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-left sm:shrink-0 sm:px-6 sm:py-4 sm:text-right">
            <p className="text-xs font-black uppercase text-gray-300 sm:text-sm">{copy.customerDisplayPublic.status}</p>
            <p className="text-xl font-black sm:text-2xl">{statusLabel(state.status, copy)}</p>
          </div>
        </header>
      )}
    >
        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:rounded-3xl">
            <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
              <p className="text-sm font-black uppercase tracking-normal text-[#FF6B5E]">{copy.customerDisplayPublic.currentReceipt}</p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl lg:text-4xl">
                {isIdle ? copy.customerDisplayPublic.registerReady : copy.customerDisplayPublic.itemCount(state.itemCount ?? items.length)}
              </h2>
            </div>

            {isIdle ? (
              <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center p-6 text-center sm:min-h-[360px] sm:p-10">
                <span className="text-5xl sm:text-7xl" aria-hidden="true">✓</span>
                <h3 className="mt-5 text-3xl font-black sm:mt-7 sm:text-4xl lg:text-5xl">{copy.customerDisplayPublic.readyTitle}</h3>
                <p className="mt-3 max-w-2xl text-lg font-semibold text-gray-500 dark:text-gray-300 sm:text-xl lg:text-2xl">
                  {copy.customerDisplayPublic.readyDescription}
                </p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {items.map((item, index) => (
                    <DisplayItemRow
                      key={`${item.sku ?? item.productName}-${index}`}
                      item={item}
                      currency={currency}
                      copy={copy}
                      locale={locale}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="flex min-h-0 flex-col gap-4 sm:gap-5">
            <div className={`rounded-2xl p-5 text-white shadow-xl sm:rounded-3xl sm:p-7 ${state.status === 'PAID' ? 'bg-[#59C3A5]' : 'bg-[#222831]'}`}>
              <p className="text-base font-black uppercase opacity-80 sm:text-lg">{copy.customerDisplayPublic.total}</p>
              <p className="mt-3 break-words text-4xl font-black leading-none sm:mt-4 sm:text-5xl lg:text-6xl">
                {formatMoney(state.totalAmount ?? 0, currency, locale)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-1">
              <TotalTile label={copy.customerDisplayPublic.subtotal} value={formatMoney(state.subtotalAmount ?? 0, currency, locale)} />
              {hasDiscount && (
                <TotalTile
                  label={copy.customerDisplayPublic.discount}
                  value={`-${formatMoney(discountAmount, currency, locale)}`}
                  tone="coral"
                />
              )}
              <TotalTile label={copy.customerDisplayPublic.tax} value={formatMoney(state.taxAmount ?? 0, currency, locale)} />
              <TotalTile label={copy.customerDisplayPublic.paid} value={formatMoney(state.paidAmount ?? 0, currency, locale)} tone="aqua" />
              <TotalTile
                label={Number(state.changeAmount ?? 0) > 0 ? copy.customerDisplayPublic.change : copy.customerDisplayPublic.due}
                value={formatMoney(Number(state.changeAmount ?? 0) > 0 ? state.changeAmount ?? 0 : state.balanceAmount ?? 0, currency, locale)}
                tone={Number(state.changeAmount ?? 0) > 0 ? 'aqua' : 'yellow'}
              />
            </div>

            <div className="mt-auto rounded-2xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 sm:rounded-3xl sm:p-6">
              <p className="text-xl font-black text-[#14745F] sm:text-2xl">
                {state.customerMessage || copy.customerDisplayPublic.thankYou}
              </p>
              <p className="mt-2 text-base font-semibold text-gray-600 dark:text-gray-300">
                {copy.customerDisplayPublic.informational}
              </p>
            </div>
          </aside>
        </section>
    </KioskPublicShell>
  );
}

function MonitorStatusIcon({ online }: { online: boolean }) {
  return (
    <span className={`mx-auto grid h-20 w-20 place-items-center rounded-3xl text-3xl ${online ? 'bg-[#59C3A5]/15 text-[#14745F]' : 'bg-amber-100 text-amber-800'}`} aria-hidden="true">
      {online ? '↔' : '×'}
    </span>
  );
}

function DisplayItemRow({ item, currency, copy, locale }: {
  item: CustomerDisplayItem;
  currency: string;
  copy: PointOfSaleKioskTranslations;
  locale: string;
}) {
  const discountAmount = toNumber(item.discountAmount);
  const hasDiscount = discountAmount > 0;

  return (
    <article className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-gray-200 bg-[#F7F8FA] p-3 dark:border-gray-700 dark:bg-gray-950/60 sm:grid-cols-[72px_minmax(0,1fr)_minmax(120px,190px)] sm:gap-4 sm:rounded-3xl sm:p-4 lg:gap-5 lg:p-5">
      <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-[#F4C84A]/25 text-[#222831] sm:h-[72px] sm:w-[72px] sm:rounded-3xl">
        <span className="text-2xl font-black leading-none sm:text-3xl">{item.quantity}</span>
        <span className="text-xs font-black uppercase">{copy.customerDisplayPublic.units}</span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-xl font-black sm:truncate sm:text-2xl lg:text-3xl">{item.productName}</h3>
        <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-300 sm:text-base lg:text-lg">
          {formatMoney(item.unitPrice, currency, locale)} {copy.customerDisplayPublic.each} {item.sku ? `· ${item.sku}` : ''}
        </p>
        {hasDiscount && (
          <p className="mt-2 inline-flex items-center rounded-full bg-[#FF6B5E]/10 px-3 py-1 text-sm font-black text-[#C74337] sm:mt-3 sm:text-base">
            {copy.customerDisplayPublic.discount} -{formatMoney(discountAmount, currency, locale)}
          </p>
        )}
      </div>
      <p className="col-span-2 text-right text-2xl font-black sm:col-span-1 sm:text-3xl lg:text-4xl">{formatMoney(item.lineTotalAmount, currency, locale)}</p>
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
    default: 'bg-white dark:bg-gray-900',
    aqua: 'bg-[#59C3A5]/10',
    yellow: 'bg-[#F4C84A]/20',
    coral: 'bg-[#FF6B5E]/10',
  }[tone];
  return (
    <div className={`rounded-2xl border border-gray-200 p-4 dark:border-gray-700 sm:rounded-3xl sm:p-5 ${toneClassName}`}>
      <p className="text-sm font-black uppercase text-gray-500 dark:text-gray-300">{label}</p>
      <p className="mt-2 break-words text-2xl font-black sm:text-3xl">{value}</p>
    </div>
  );
}

function toNumber(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function statusLabel(status: string | undefined, copy: PointOfSaleKioskTranslations) {
  const labels: Record<string, string> = copy.customerDisplayPublic.statusLabels;
  return labels[status ?? 'IDLE'] ?? copy.customerDisplayPublic.statusLabels.fallback;
}

function formatMoney(value: number | string, currency: string, locale: string) {
  const amount = typeof value === 'number' ? value : Number(value);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'MXN',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isTerminalCustomerDisplayError(error: unknown) {
  return error instanceof ApiClientError
    && [401, 403, 404, 410].includes(error.status);
}

function publicCustomerDisplayError(
  error: unknown,
  fallback: string,
  copy: PointOfSaleKioskTranslations,
) {
  if (error instanceof ApiClientError && error.status === 429) {
    return copy.customerDisplayPublic.tooManyRequests;
  }
  return fallback;
}
