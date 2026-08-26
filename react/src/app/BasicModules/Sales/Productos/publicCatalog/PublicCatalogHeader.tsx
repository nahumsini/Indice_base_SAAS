import { useState } from 'react';
import { ArrowUpRight, Globe2, Mail, MessageCircle, Phone, Store } from 'lucide-react';
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

function PublicCatalogCompanyMark({
  config,
  compact,
}: {
  config: PublicCatalogConfig;
  compact: boolean;
}) {
  const logoUrl = config.companyLogoUrl?.trim() ?? '';
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const showLogo = Boolean(logoUrl) && failedLogoUrl !== logoUrl;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#FF6B5E]/25 bg-white/80 text-[#B63B32] shadow-sm dark:bg-slate-950/70 dark:text-[#FF9B91] ${compact ? 'h-11 w-11' : 'h-14 w-14'}`}
    >
      {showLogo ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-2"
          loading="eager"
          decoding="async"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      ) : (
        <Store aria-hidden="true" className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      )}
    </div>
  );
}

export function PublicCatalogHeader({
  config,
  itemCount,
  t,
  compact = false,
}: {
  config: PublicCatalogConfig;
  itemCount: number;
  t: ProductsTranslations;
  compact?: boolean;
}) {
  const ContactIcon = contactIcons[config.contactMethod];
  const href = contactHref(config);
  const externalContact = config.contactMethod !== 'phone' && config.contactMethod !== 'email';

  if (compact) {
    return (
      <header className="w-full min-w-0 overflow-hidden border-b border-[#FF6B5E]/20 bg-[linear-gradient(145deg,rgba(255,107,94,.12),rgba(255,255,255,1)_52%)] dark:bg-[linear-gradient(145deg,rgba(255,107,94,.15),rgba(2,6,23,1)_55%)]">
        <div className="min-w-0 px-4 py-4">
          <div className="flex items-center gap-3">
            <PublicCatalogCompanyMark config={config} compact />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-mediumr text-[#B63B32] dark:text-[#FF9B91]">{t.publicCatalog.moduleEyebrow}</p>
              <h1 className="mt-1 line-clamp-2 text-2xl font-medium leading-7 text-slate-950 dark:text-white">{config.title}</h1>
              {config.companyName || config.businessName ? (
                <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {[config.companyName, config.businessName].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
          {config.description ? (
            <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{config.description}</p>
          ) : null}
          <span className="mt-3 inline-flex rounded-full border border-[#FF6B5E]/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#9F3028] dark:bg-slate-950/70 dark:text-[#FF9B91]">
            {t.publicCatalog.productsFound(itemCount)}
          </span>
          {href ? (
            <Button asChild className="mt-4 h-12 w-full gap-2 rounded-xl bg-[#FF6B5E] font-medium text-[#222831] shadow-sm hover:bg-[#E85C50]">
              <a href={href} target={externalContact ? '_blank' : undefined} rel="noreferrer">
                <ContactIcon className="h-4 w-4" />
                {config.contactCtaLabel || t.publicCatalog.contactCta}
                <ArrowUpRight className="ml-auto h-4 w-4" />
              </a>
            </Button>
          ) : null}
        </div>
        {config.coverImageUrl ? (
          <div className="px-4 pb-4">
            <img src={config.coverImageUrl} alt={config.title} className="aspect-[16/7] w-full rounded-2xl border border-white/70 object-cover shadow-sm dark:border-slate-800" />
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="overflow-hidden border-b border-[#FF6B5E]/20 bg-[linear-gradient(120deg,rgba(255,107,94,.13),rgba(255,255,255,1)_48%)] dark:bg-[linear-gradient(120deg,rgba(255,107,94,.15),rgba(2,6,23,1)_52%)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-7 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4 lg:max-w-[72%]">
          <PublicCatalogCompanyMark config={config} compact={false} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#B63B32] dark:text-[#FF9B91]">{t.publicCatalog.moduleEyebrow}</p>
            <h1 className="mt-1 text-3xl font-medium leading-tight text-slate-950 md:text-[2.35rem] dark:text-white">{config.title}</h1>
            {config.companyName || config.unitName || config.businessName ? (
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {[config.companyName, config.unitName, config.businessName].filter(Boolean).join(' / ')}
              </p>
            ) : null}
            {config.description ? <p className="mt-2 max-w-3xl text-base font-medium leading-6 text-slate-600 dark:text-slate-300">{config.description}</p> : null}
            <span className="mt-4 inline-flex rounded-full border border-[#FF6B5E]/20 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#9F3028] dark:bg-slate-950/70 dark:text-[#FF9B91]">
              {t.publicCatalog.productsFound(itemCount)}
            </span>
          </div>
        </div>
        {href ? (
          <Button asChild className="h-12 shrink-0 gap-2 rounded-xl bg-[#FF6B5E] px-5 text-sm font-medium text-[#222831] shadow-md shadow-[#FF6B5E]/20 hover:bg-[#E85C50]">
            <a href={href} target={externalContact ? '_blank' : undefined} rel="noreferrer">
              <ContactIcon className="h-4 w-4" />
              {config.contactCtaLabel || t.publicCatalog.contactCta}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
      </div>
      {config.coverImageUrl ? (
        <div className="mx-auto max-w-7xl px-6 pb-6 md:px-8">
          <img src={config.coverImageUrl} alt={config.title} className="h-56 w-full rounded-2xl border border-white/70 object-cover shadow-sm dark:border-slate-800" />
        </div>
      ) : null}
    </header>
  );
}
