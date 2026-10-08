import indiceLogoUrl from '../../../assets/indice-logo.png';
import type { LoginShellCopy } from '../translations/loginShell';
import { PUBLIC_DIAGNOSIS_URL, PUBLIC_SITE_URL } from './loginSiteLinks';

const footerLinkClass = 'leading-6 text-white/75 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function LoginSiteFooter({ copy, signInHref = '#login-main' }: { copy: LoginShellCopy; signInHref?: string }) {
  return (
    <footer className="bg-[#0d2348] text-white/75">
      <div className="mx-auto max-w-[1280px] px-4 py-9 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-[2.3fr_1fr_1fr_1.2fr] lg:gap-x-10">
          <div className="col-span-2 lg:col-span-1">
            <a href={`${PUBLIC_SITE_URL}/index.php`} aria-label="Indice" className="inline-flex rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <span className="relative block h-10 w-[123px] overflow-hidden" aria-hidden="true">
                <img src={indiceLogoUrl} alt="" className="absolute left-1/2 top-1/2 w-[178px] max-w-none -translate-x-1/2 -translate-y-[45%]" />
                <img src={indiceLogoUrl} alt="" className="absolute left-1/2 top-1/2 w-[178px] max-w-none -translate-x-1/2 -translate-y-[45%] brightness-0 invert [clip-path:inset(0_0_0_39%)]" />
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6">{copy.footerDescription}</p>
            <a href="mailto:contacto@indiceapp.com" className={`${footerLinkClass} mt-2 inline-block text-sm text-[#8fe0ca]`}>
              contacto@indiceapp.com
            </a>
          </div>

          <FooterGroup title={copy.product} links={[
            { label: copy.agents, href: `${PUBLIC_SITE_URL}/index.php#lupita` },
            { label: copy.modules, href: `${PUBLIC_SITE_URL}/modulos.php` },
            { label: copy.plans, href: `${PUBLIC_SITE_URL}/planes.php` },
            { label: copy.methodology, href: `${PUBLIC_SITE_URL}/metodologia.php` },
            { label: copy.apprentice, href: `${PUBLIC_SITE_URL}/modo-aprendiz.php` },
          ]} />
          <FooterGroup title={copy.company} links={[
            { label: copy.about, href: `${PUBLIC_SITE_URL}/nosotros.php` },
            { label: copy.blog, href: `${PUBLIC_SITE_URL}/blog.php` },
            { label: copy.help, href: `${PUBLIC_SITE_URL}/ayuda.php` },
          ]} />
          <FooterGroup title={copy.support} links={[
            { label: copy.contact, href: PUBLIC_DIAGNOSIS_URL },
            { label: copy.signIn, href: signInHref },
            { label: copy.privacy, href: `${PUBLIC_SITE_URL}/privacidad.php` },
            { label: copy.terms, href: `${PUBLIC_SITE_URL}/terminos.php` },
          ]} />
        </div>

        <div className="mt-9 grid gap-4 border-t border-white/15 pt-5 text-xs leading-5 md:grid-cols-2">
          <div>
            <strong className="font-semibold text-white/90">Índice Technologies Inc.</strong>
            <p>130 King St W, Toronto, ON, M5X1E3, Canada · Exchange Tower</p>
            <a href="mailto:contacto@indiceapp.com" className={footerLinkClass}>contacto@indiceapp.com</a>
          </div>
          <div className="md:text-right">
            <p>© {new Date().getFullYear()} Indice. {copy.rights}</p>
            <p className="mt-1">
              <a href={`${PUBLIC_SITE_URL}/privacidad.php`} className={footerLinkClass}>{copy.privacy}</a>
              <span aria-hidden="true"> · </span>
              <a href={`${PUBLIC_SITE_URL}/terminos.php`} className={footerLinkClass}>{copy.terms}</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[#8fe0ca]">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={footerLinkClass}>{link.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
