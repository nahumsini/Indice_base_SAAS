import { Bot, Building2, CircleCheck, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { IndiceBrandLogo } from './IndiceBrandLogo';

type OAuthLoginBrandPanelProps = {
  companyName: string;
  logoAlt: string;
};

export function OAuthLoginBrandPanel({ companyName, logoAlt }: OAuthLoginBrandPanelProps) {
  return (
    <section className="relative order-2 overflow-hidden rounded-[24px] border border-[var(--indice-brand-border)] bg-[var(--indice-brand-action)] p-6 text-[var(--indice-brand-shell-foreground)] shadow-[0_28px_90px_-48px_rgba(37,99,235,0.55)] lg:order-1 lg:rounded-[28px] lg:p-8 xl:p-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <IndiceBrandLogo alt={logoAlt} className="hidden h-16 w-64 rounded-2xl bg-white/95 px-4 lg:flex" imageClassName="w-[250px]" />
        <span className="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Bot className="h-6 w-6" /></span>
        <p className="mt-5 text-sm font-medium text-[var(--indice-brand-shell-muted)]">Conexión de asistente en curso</p>
        <h1 className="mt-2 max-w-xl text-3xl font-medium tracking-tight sm:text-4xl">Ingresa para revisar el acceso</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--indice-brand-shell-muted)] sm:text-base">Después de iniciar sesión volverás a una pantalla segura donde podrás revisar la empresa, la información y las acciones solicitadas antes de autorizar.</p>

        <div className="mt-8 space-y-3 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
          <OAuthLoginPoint icon={<Building2 />} title={companyName || 'Tu empresa'} description="La conexión quedará aislada en la empresa con la que ingreses." />
          <OAuthLoginPoint icon={<ShieldCheck />} title="Tú conservas el control" description="El asistente nunca recibe tu contraseña y sólo usa permisos vigentes." />
          <OAuthLoginPoint icon={<CircleCheck />} title="Nada se autoriza todavía" description="Primero podrás revisar y aceptar o cancelar la solicitud." />
        </div>

        <ol className="mt-7 grid grid-cols-3 gap-2 text-xs text-[var(--indice-brand-shell-muted)]" aria-label="Progreso de conexión">
          <li className="rounded-xl bg-white/15 px-3 py-3 text-white"><span className="block font-medium">1 · Ingresar</span><span>Ahora</span></li>
          <li className="rounded-xl border border-white/15 px-3 py-3"><span className="block font-medium">2 · Revisar</span><span>Permisos</span></li>
          <li className="rounded-xl border border-white/15 px-3 py-3"><span className="block font-medium">3 · Finalizar</span><span>Regresar</span></li>
        </ol>
      </div>
    </section>
  );
}

function OAuthLoginPoint({ description, icon, title }: { description: string; icon: ReactNode; title: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">{icon}</span>
      <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs leading-5 text-[var(--indice-brand-shell-muted)]">{description}</p></div>
    </div>
  );
}
