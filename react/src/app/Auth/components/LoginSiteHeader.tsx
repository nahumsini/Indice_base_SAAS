import { Check, ChevronDown, Globe, Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { languages, useLanguage } from '../../shared/context';
import type { LoginShellCopy } from '../translations/loginShell';
import { IndiceBrandLogo } from './IndiceBrandLogo';
import { PUBLIC_DIAGNOSIS_URL, PUBLIC_SITE_URL } from './loginSiteLinks';

const publicLinks = (copy: LoginShellCopy) => [
  { label: copy.agents, href: `${PUBLIC_SITE_URL}/index.php#lupita` },
  { label: copy.methodology, href: `${PUBLIC_SITE_URL}/metodologia.php` },
  { label: copy.modules, href: `${PUBLIC_SITE_URL}/modulos.php` },
  { label: copy.plans, href: `${PUBLIC_SITE_URL}/planes.php` },
];

export function LoginSiteHeader({ copy }: { copy: LoginShellCopy }) {
  const { currentLanguage, setCurrentLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = publicLinks(copy);

  const languagePicker = (showName: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={copy.chooseLanguage}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3 text-sm font-medium text-[#142442] transition hover:border-[#b6caec] hover:text-[#2563eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
        >
          <Globe className="h-4 w-4 text-[#2563eb]" aria-hidden="true" />
          <span aria-hidden="true">{currentLanguage.flag}</span>
          {showName ? <span className="max-w-36 truncate">{currentLanguage.name}</span> : null}
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onSelect={() => setCurrentLanguage(language)}
            className="flex cursor-pointer items-center gap-2"
          >
            <span aria-hidden="true">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {language.code === currentLanguage.code ? <Check className="h-4 w-4 text-[#2563eb]" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#dce5f1] bg-white/95 backdrop-blur-xl">
      <a
        href="#login-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-[#142442] focus:outline-2 focus:outline-[#2563eb]"
      >
        {copy.skipToLogin}
      </a>
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href={`${PUBLIC_SITE_URL}/index.php`} aria-label="Indice" className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]">
          <IndiceBrandLogo alt="" className="h-[38px] w-[114px]" imageClassName="w-[163px]" />
        </a>

        <nav aria-label={copy.navigation} className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2.5 py-2 text-[13px] font-medium text-[#142442] transition hover:text-[#2563eb] focus-visible:outline-2 focus-visible:outline-[#2563eb]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {languagePicker(false)}
          <span aria-current="page" className="px-2 py-2 text-[13px] font-semibold text-[#2563eb]">
            {copy.signIn}
          </span>
          <a
            href={PUBLIC_DIAGNOSIS_URL}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563eb] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
          >
            {copy.diagnosis}
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {languagePicker(false)}
          <button
            type="button"
            aria-label={mobileOpen ? copy.closeMenu : copy.openMenu}
            aria-expanded={mobileOpen}
            aria-controls="login-site-mobile-nav"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#dce5f1] bg-white text-[#142442] focus-visible:outline-2 focus-visible:outline-[#2563eb]"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav id="login-site-mobile-nav" aria-label={copy.navigation} className="border-t border-[#dce5f1] bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto grid max-w-[1280px] gap-1">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="rounded-lg px-3 py-3 text-sm font-medium text-[#142442] hover:bg-[#f3f7fd]">
                {link.label}
              </a>
            ))}
            <span aria-current="page" className="rounded-lg px-3 py-3 text-sm font-semibold text-[#2563eb]">
              {copy.signIn}
            </span>
            <a href={PUBLIC_DIAGNOSIS_URL} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white">
              {copy.diagnosis}
            </a>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
