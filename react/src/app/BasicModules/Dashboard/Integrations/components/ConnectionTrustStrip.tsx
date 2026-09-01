import { CheckCircle2, ShieldCheck, Unplug } from 'lucide-react';
import type { IntegrationsTranslations } from '../translations';

export function ConnectionTrustStrip({ copy }: { copy: IntegrationsTranslations }) {
  const items = [
    { icon: ShieldCheck, ...copy.trust.choose },
    { icon: CheckCircle2, ...copy.trust.confirm },
    { icon: Unplug, ...copy.trust.stop },
  ];

  return (
    <section className="rounded-xl border border-[#59C3A5]/45 bg-[#59C3A5]/10 p-4 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
      <div className="mb-4">
        <h3 className="text-base font-medium text-slate-950 dark:text-white">{copy.trust.title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.trust.description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(({ icon: Icon, label, description }) => (
          <div key={label} className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/80">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-950 dark:text-white">{label}</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
