import { Check, ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { languages, useLanguage } from '../../shared/context';
import { IndiceBrandLogo } from '../components/IndiceBrandLogo';
import type { PublicPlansCopy } from './publicPlansCopy';

type PublicPlansHeaderProps = {
  copy: PublicPlansCopy;
  activePage?: 'plans' | 'login';
};

const publicSiteUrl = 'https://indiceapp.com';

const publicLinks = (copy: PublicPlansCopy, activePage: 'plans' | 'login') => [
  { label: copy.methodology, href: `${publicSiteUrl}/metodologia.php` },
  { label: copy.modules, href: `${publicSiteUrl}/modulos.php` },
  { label: copy.learningMode, href: `${publicSiteUrl}/modo-aprendiz.php` },
  { label: copy.plans, href: `${publicSiteUrl}/planes.php`, current: activePage === 'plans' },
];

export function PublicPlansHeader({ copy, activePage = 'plans' }: PublicPlansHeaderProps) {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = publicLinks(copy, activePage);

  const languagePicker = (compact = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={copy.language}
          className={`inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white font-semibold text-slate-700 shadow-sm transition hover:border-[var(--indice-brand-border)] hover:text-[var(--indice-brand-text)] ${compact ? 'h-11 px-4 text-sm' : 'h-12 min-w-20 px-4'}`}
        >
          <span className="text-xl" aria-hidden="true">{currentLanguage.flag}</span>
          {compact && <span>{currentLanguage.name}</span>}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onSelect={() => setCurrentLanguage(language)}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5"
          >
            <span className="text-lg" aria-hidden="true">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {language.code === currentLanguage.code && <Check className="h-4 w-4 text-[var(--indice-brand-text)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1480px] items-center justify-between gap-8 px-5 sm:px-8">
        <a href={`${publicSiteUrl}/index.php`} aria-label={copy.logoAlt}>
          <IndiceBrandLogo alt={copy.logoAlt} className="h-12 w-40" imageClassName="w-[184px]" />
        </a>

        <nav aria-label={copy.navLabel} className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
              className={`relative py-2 text-base font-semibold transition ${link.current ? 'text-[var(--indice-brand-text)]' : 'text-slate-700 hover:text-[var(--indice-brand-text)]'}`}
            >
              {link.label}
              {link.current && <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-[var(--indice-brand-primary)]" />}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {languagePicker()}
          <Link
            to="/login"
            aria-current={activePage === 'login' ? 'page' : undefined}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--indice-brand-primary)] px-6 text-base font-medium text-white shadow-sm transition hover:bg-[var(--indice-brand-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--indice-brand-border)]"
          >
            {copy.login}
          </Link>
        </div>

        <button
          type="button"
          aria-label={copy.menu}
          aria-expanded={mobileOpen}
          aria-controls="public-navigation-mobile"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 lg:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="public-navigation-mobile" className="max-h-[calc(100dvh-84px)] overflow-y-auto border-t border-slate-100 bg-white px-5 pb-5 pt-3 lg:hidden">
          <nav aria-label={copy.navLabel} className="mx-auto grid max-w-[1480px] gap-1">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="rounded-xl px-3 py-3 font-semibold text-slate-700 hover:bg-[var(--indice-brand-soft)]">
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row">
              {languagePicker(true)}
              <Link to="/login"
            aria-current={activePage === 'login' ? 'page' : undefined} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--indice-brand-primary)] px-5 font-medium text-white">
                {copy.login}
              </Link>
            </div>
          </nav>
        </div>
      )}

      <div aria-hidden="true" className="grid h-1 grid-cols-4">
        <span className="bg-[#59C3A5]" />
        <span className="bg-[#F4C84A]" />
        <span className="bg-[#FF6B5E]" />
        <span className="bg-[#2563EB]" />
      </div>
    </header>
  );
}
