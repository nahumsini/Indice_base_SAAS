import { Mail, MessageCircle, Phone, Store, Globe2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ProductsTranslations } from '../translations';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';

const contactIcons = {
  whatsapp: MessageCircle,
  email: Mail,
  phone: Phone,
  website: Globe2,
};

const contactHref = (config: PublicCatalogConfig) => {
  const value = config.contactValue.trim();
  if (!value) return null;
  if (config.contactMethod === 'email') return `mailto:${value}`;
  if (config.contactMethod === 'phone') return `tel:${value.replace(/[^+\d]/g, '')}`;
  if (config.contactMethod === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

export function PublicCatalogHeader({
  config,
  t,
  compact = false,
}: {
  config: PublicCatalogConfig;
  t: ProductsTranslations;
  compact?: boolean;
}) {
  const ContactIcon = contactIcons[config.contactMethod];
  const href = contactHref(config);

  if (compact) {
    return (
      <header className="w-full min-w-0 max-w-full overflow-hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-0 px-4 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#B63B32]">{t.publicCatalog.moduleEyebrow}</p>
              <h1 className="mt-1 text-2xl font-black leading-7 text-slate-950 dark:text-white">{config.title}</h1>
              {config.companyName || config.businessName ? (
                <p className="mt-1 truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                  {[config.companyName, config.businessName].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
          {config.description ? (
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{config.description}</p>
          ) : null}
          {href ? (
            <Button asChild variant="outline" className="mt-4 h-10 w-full gap-2 rounded-xl border-[#FF6B5E]/30 font-black text-[#B63B32] hover:bg-[#FF6B5E]/5">
              <a href={href} target={config.contactMethod === 'phone' || config.contactMethod === 'email' ? undefined : '_blank'} rel="noreferrer">
                <ContactIcon className="h-4 w-4" />
                {config.contactCtaLabel || t.publicCatalog.contactCta}
              </a>
            </Button>
          ) : null}
        </div>
        {config.coverImageUrl ? (
          <div className="px-4 pb-4">
            <img src={config.coverImageUrl} alt={config.title} className="aspect-[16/7] w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-800" />
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="bg-white dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-9 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-normal text-[#B63B32]">{t.publicCatalog.moduleEyebrow}</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl dark:text-white">{config.title}</h1>
            {config.companyName || config.unitName || config.businessName ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {[config.companyName, config.unitName, config.businessName].filter(Boolean).join(' / ')}
              </p>
            ) : null}
            <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">{config.description}</p>
          </div>
        </div>

        {href ? (
          <Button asChild className="h-11 gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-black text-white shadow-sm hover:bg-[#E85C50]">
            <a href={href} target={config.contactMethod === 'phone' || config.contactMethod === 'email' ? undefined : '_blank'} rel="noreferrer">
              <ContactIcon className="h-4 w-4" />
              {config.contactCtaLabel || t.publicCatalog.contactCta}
            </a>
          </Button>
        ) : null}
      </div>
      {config.coverImageUrl ? (
        <div className="mx-auto max-w-7xl px-5 pb-6 md:px-8">
          <img
            src={config.coverImageUrl}
            alt={config.title}
            className="h-64 w-full rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-800"
          />
        </div>
      ) : null}
    </header>
  );
}
