import indiceLogoUrl from '../../../assets/indice-logo.png';
import type { LoginPageCopy } from './loginTypes';

const pillarColors = [
  '#59C3A5',
  '#F4C84A',
  '#FF6B5E',
  '#147514',
] as const;

export function LoginBrandPanel({ copy }: { copy: LoginPageCopy }) {
  return (
    <section className="relative order-2 overflow-hidden rounded-[24px] border border-white/90 bg-white/90 p-5 shadow-[0_28px_90px_-48px_rgba(23,125,102,0.30)] backdrop-blur sm:p-6 lg:order-1 lg:rounded-[28px] lg:p-7 xl:p-8">
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[var(--indice-brand-aqua)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-[var(--indice-brand-aqua)]/7 blur-3xl" />

      <div className="relative flex flex-col">
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div className="relative h-16 w-64 overflow-hidden">
            <img
              src={indiceLogoUrl}
              alt={copy.logoAlt}
              className="absolute left-1/2 top-1/2 w-[292px] max-w-none -translate-x-1/2 -translate-y-[45%]"
            />
          </div>
          <span className="inline-flex w-fit items-center rounded-full border border-[var(--indice-brand-border)] bg-[var(--indice-brand-soft)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--indice-brand-action)]">
            {copy.operatingSystemLabel}
          </span>
        </div>

        <div className="max-w-3xl lg:mt-7 xl:mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--indice-brand-action)] sm:text-sm">
            {copy.workspaceBadge}
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-[#222831] sm:text-4xl lg:text-[2.65rem] lg:leading-[1.04] xl:text-[2.9rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-7 lg:mt-8">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
              {copy.frameworkLabel}
            </p>
            <span className="text-xs font-semibold text-[var(--indice-brand-action)]">
              {copy.visualMetricValue} {copy.visualMetricLabel}
            </span>
          </div>

          <div className="relative grid grid-cols-2 gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/75 p-3 sm:p-4 lg:gap-x-12 lg:gap-y-3 lg:p-4">
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-20 -translate-x-1/2 bg-slate-300 lg:block" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-20 w-px -translate-y-1/2 bg-slate-300 lg:block" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-slate-50 bg-[var(--indice-brand-action)] text-center text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-lg shadow-emerald-950/15 lg:flex">
              Indice
            </div>

            {copy.pillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="relative rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ backgroundColor: `${pillarColors[index] ?? '#59C3A5'}1F` }}
                    aria-hidden="true"
                  >
                    {pillar.icon}
                  </span>
                  <h2 className="text-sm font-bold text-[#222831]">{pillar.title}</h2>
                </div>
                <p className="mt-1.5 hidden text-xs leading-[1.15rem] text-slate-500 lg:block">
                  {pillar.description}
                </p>
                <span
                  className="absolute inset-x-3 bottom-0 h-1 rounded-full sm:inset-x-4"
                  style={{ backgroundColor: pillarColors[index] ?? '#59C3A5' }}
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>

          <p className="mt-3 text-center text-sm leading-5 text-slate-600 lg:text-left">
            {copy.visualSubtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
