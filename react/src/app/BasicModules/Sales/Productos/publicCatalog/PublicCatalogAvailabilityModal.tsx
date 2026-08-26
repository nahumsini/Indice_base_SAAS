import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { useProductsResolvedLocale, type ProductsTranslations } from '../translations';
import { publicCatalogApi } from './publicCatalogApi';
import type { PublicCatalogAvailability, PublicCatalogItem } from './types/publicCatalogTypes';

const monthKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
const localDateKey = (value: Date) => (
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
);

export function PublicCatalogAvailabilityModal({
  item,
  open,
  embedded,
  online,
  token,
  csrfToken,
  t,
  onOpenChange,
}: {
  item: PublicCatalogItem | null;
  open: boolean;
  embedded: boolean;
  online: boolean;
  token?: string;
  csrfToken?: string;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useProductsResolvedLocale();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [availability, setAvailability] = useState<PublicCatalogAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const activeMonth = monthKey(month);
  const today = localDateKey(new Date());

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setAvailability(null);
    setError('');
  }, [item?.id, open]);

  useEffect(() => {
    if (!open || !item) return undefined;
    if (embedded) {
      setAvailability(null);
      setLoading(false);
      setError(t.publicCatalog.availability.previewUnavailable);
      return undefined;
    }
    if (!online || !token || !csrfToken) {
      setAvailability(null);
      setLoading(false);
      setError(t.publicCatalog.availability.unavailable);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    publicCatalogApi.availability(token, csrfToken, Number(item.id), activeMonth)
      .then((response) => {
        if (cancelled) return;
        if (response.sourceStatus !== 'ready') {
          setAvailability(null);
          setError(t.publicCatalog.availability.unavailable);
          return;
        }
        setAvailability(response);
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability(null);
          setError(t.publicCatalog.availability.unavailable);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeMonth, csrfToken, embedded, item, online, open, retryKey, t, token]);

  const monthLabel = useMemo(() => new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(month), [locale, month]);
  const weekdayLabels = useMemo(() => Array.from({ length: 7 }, (_, index) => (
    new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(new Date(2024, 0, 7 + index))
      .replace('.', '')
  )), [locale]);
  const daysByDate = useMemo(() => new Map(
    (availability?.month === activeMonth ? availability.days : []).map((day) => [day.date, day]),
  ), [activeMonth, availability]);
  const slots = useMemo(() => {
    const leading = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length }, (_, index) => index + 1),
    ];
  }, [month]);

  const moveMonth = (difference: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + difference, 1));
  };

  return (
    <KioskModalFrame
      open={open}
      onOpenChange={onOpenChange}
      size="form"
      surface="public"
      tone="coral"
      busy={loading}
      title={t.publicCatalog.availability.title}
      description={t.publicCatalog.availability.description(item?.name ?? '')}
      icon={<CalendarDays className="h-5 w-5" />}
      bodyClassName="space-y-4 bg-slate-50 dark:bg-slate-950"
      footer={(
        <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
          {t.publicCatalog.availability.close}
        </Button>
      )}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-11 w-11 rounded-xl"
            disabled={month.getFullYear() <= 2000 && month.getMonth() === 0}
            aria-label={t.publicCatalog.availability.previousMonth}
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="capitalize text-base font-medium text-slate-950 dark:text-white">{monthLabel}</h3>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-11 w-11 rounded-xl"
            disabled={month.getFullYear() >= 2100 && month.getMonth() === 11}
            aria-label={t.publicCatalog.availability.nextMonth}
            onClick={() => moveMonth(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
          {weekdayLabels.map((label, index) => (
            <div key={`${label}-${index}`} className="py-1 text-center text-[11px] font-medium text-slate-500" role="columnheader">
              {label}
            </div>
          ))}
          {slots.map((day, index) => {
            if (day == null) return <span key={`empty-${index}`} aria-hidden="true" />;
            const date = `${activeMonth}-${String(day).padStart(2, '0')}`;
            const status = daysByDate.get(date)?.status;
            const isToday = date === today;
            const statusLabel = status === 'occupied'
              ? t.publicCatalog.availability.occupied
              : t.publicCatalog.availability.available;
            return (
              <div
                key={date}
                role="gridcell"
                aria-label={`${day}, ${statusLabel}${isToday ? `, ${t.publicCatalog.availability.today}` : ''}`}
                className={cn(
                  'relative grid aspect-square min-h-10 place-items-center rounded-lg border text-sm font-medium transition-colors',
                  status === 'available' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
                  status === 'occupied' && 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
                  !status && 'border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950',
                  isToday && 'ring-2 ring-[#FF6B5E] ring-offset-1 dark:ring-offset-slate-900',
                )}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-400" />{t.publicCatalog.availability.available}</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-rose-400" />{t.publicCatalog.availability.occupied}</span>
          <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full ring-2 ring-[#FF6B5E]" />{t.publicCatalog.availability.today}</span>
        </div>
      </div>

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          {t.publicCatalog.availability.loading}
        </div>
      ) : null}
      {!loading && availability?.stale ? (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-5 text-amber-800">
          {t.publicCatalog.availability.stale}
        </p>
      ) : null}
      {!loading && error ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-5 text-amber-900">
          <p>{error}</p>
          {!embedded && online ? (
            <Button type="button" variant="outline" className="mt-3 h-10 bg-white" onClick={() => setRetryKey((current) => current + 1)}>
              <RefreshCw className="h-4 w-4" /> {t.publicCatalog.availability.retry}
            </Button>
          ) : null}
        </div>
      ) : null}
    </KioskModalFrame>
  );
}
