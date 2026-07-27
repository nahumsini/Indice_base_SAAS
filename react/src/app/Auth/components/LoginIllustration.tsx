import type { LoginPageCopy } from './loginTypes';

const brandBars = [
  { color: '#FF6B5E', height: '42%' },
  { color: '#F4C84A', height: '58%' },
  { color: '#59C3A5', height: '74%' },
  { color: '#2563EB', height: '92%' },
] as const;

export function LoginIllustration({ copy }: { copy: LoginPageCopy }) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/88 p-5 shadow-sm backdrop-blur">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {copy.visualSignalLabel}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[#222831]">{copy.visualTitle}</h2>
        </div>
        <div className="rounded-2xl border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-4 py-2 text-right">
          <p className="text-xl font-bold text-[var(--indice-brand-action)]">{copy.visualMetricValue}</p>
          <p className="text-xs font-semibold text-slate-500">{copy.visualMetricLabel}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex min-h-[188px] items-end justify-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-5 py-6">
          {brandBars.map((bar, index) => (
            <div
              key={bar.color}
              className="flex h-36 w-10 items-end rounded-full bg-white shadow-inner ring-1 ring-slate-200/90"
              aria-hidden="true"
            >
              <div
                className="w-full rounded-full shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                style={{ height: bar.height, backgroundColor: bar.color }}
              />
              <span className="sr-only">{copy.pillars[index]?.title}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-between gap-4">
          <p className="text-sm leading-6 text-slate-600">{copy.visualSubtitle}</p>
          <div className="grid grid-cols-2 gap-2">
            {copy.pillars.map((pillar, index) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
                    style={{ backgroundColor: `${brandBars[index]?.color ?? '#59C3A5'}18` }}
                    aria-hidden="true"
                  >
                    {pillar.icon}
                  </span>
                  <span className="text-sm font-bold text-[#222831]">{pillar.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
