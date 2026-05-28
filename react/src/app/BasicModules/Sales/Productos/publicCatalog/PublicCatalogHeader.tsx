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

export function PublicCatalogHeader({
  config,
  t,
}: {
  config: PublicCatalogConfig;
  t: ProductsTranslations;
}) {
  const ContactIcon = contactIcons[config.contactMethod];

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B63B32]">{t.publicCatalog.publicCatalog}</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">{config.title}</h1>
            <p className="mt-2 max-w-3xl text-base font-medium leading-7 text-slate-600">{config.description}</p>
          </div>
        </div>

        <Button className="h-11 gap-2 rounded-lg bg-[#FF6B5E] px-5 text-sm font-black text-white hover:bg-[#E85C50]">
          <ContactIcon className="h-4 w-4" />
          {config.contactCtaLabel || t.publicCatalog.contactCta}
        </Button>
      </div>
      {config.coverImageUrl ? (
        <div className="mx-auto max-w-7xl px-5 pb-6 md:px-8">
          <img
            src={config.coverImageUrl}
            alt={config.title}
            className="h-56 w-full rounded-lg border border-slate-200 object-cover shadow-sm"
          />
        </div>
      ) : null}
    </header>
  );
}
