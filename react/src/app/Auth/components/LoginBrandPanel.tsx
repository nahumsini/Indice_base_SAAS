import indiceLogoUrl from '../../../assets/indice-logo.png';
import { LoginIllustration } from './LoginIllustration';
import type { LoginPageCopy } from './loginTypes';

const cardAccentClasses = [
  'border-[#155CFF]/20 bg-[#155CFF]/8 text-[#155CFF]',
  'border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#C94C42]',
  'border-[#59C3A5]/25 bg-[#59C3A5]/12 text-[#16836B]',
] as const;

export function LoginBrandPanel({ copy }: { copy: LoginPageCopy }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_28px_90px_-48px_rgba(21,92,255,0.45)] backdrop-blur xl:p-8">
      <div className="relative flex h-full flex-col gap-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative h-24 w-full max-w-[360px] overflow-hidden">
              <img
                src={indiceLogoUrl}
                alt={copy.logoAlt}
                className="absolute left-1/2 top-1/2 w-[420px] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-[#155CFF]/20 bg-[#155CFF]/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#155CFF]">
              {copy.operatingSystemLabel}
            </span>
          </div>

          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#FF6B5E]">
              {copy.workspaceBadge}
            </p>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-[#222831] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.03]">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {copy.subtitle}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {copy.frameworkLabel}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {copy.pillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="rounded-[22px] border border-slate-200 bg-white/82 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xl">
                    {pillar.icon}
                  </span>
                  <h2 className="text-sm font-bold text-[#222831]">{pillar.title}</h2>
                </div>
                <p className="text-xs leading-5 text-slate-500">{pillar.description}</p>
                <div
                  className="mt-4 h-1.5 rounded-full"
                  style={{
                    backgroundColor: ['#FF6B5E', '#F4C84A', '#59C3A5', '#155CFF'][index] ?? '#155CFF',
                  }}
                />
              </article>
            ))}
          </div>
        </div>

        <LoginIllustration copy={copy} />

        <div className="grid gap-3 lg:grid-cols-3">
          {copy.featureCards.map((feature, index) => (
            <article
              key={feature.title}
              className="rounded-[24px] border bg-white/86 p-5 shadow-sm backdrop-blur"
            >
              <div className={`mb-4 h-2 w-14 rounded-full border ${cardAccentClasses[index] ?? cardAccentClasses[0]}`} />
              <h2 className="text-base font-bold text-[#222831]">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
