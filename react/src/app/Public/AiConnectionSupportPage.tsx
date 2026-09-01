import type { ReactNode } from 'react';
import { ExternalLink, LifeBuoy, LockKeyhole } from 'lucide-react';
import { IndiceBrandLogo } from '../Auth/components/IndiceBrandLogo';

const supportEmail = 'contacto@indiceapp.com';

export function AiConnectionSupportPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#EFF6FF_0%,_#F8FAFC_55%,_#EEF4FA_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <a href="https://indiceapp.com" aria-label="Ir al sitio de Índice">
            <IndiceBrandLogo alt="Índice" className="h-12 w-40" imageClassName="w-[188px]" />
          </a>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm">
            <LockKeyhole className="h-4 w-4" /> Conexión protegida
          </span>
        </header>

        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5">
          <div className="border-b border-blue-100 bg-blue-600 px-6 py-7 text-white sm:px-10">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><LifeBuoy className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-semibold text-blue-100">Soporte para Conectar IA</p>
                <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Conecta tu asistente sin compartir tu contraseña</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Índice conserva los permisos de tu empresa y valida cada consulta.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-10">
            <SupportSection title="1. Inicia la conexión">
              En Índice abre <strong>Panel Inicial → Conectar IA</strong>, selecciona <strong>Conectar mi asistente</strong> y revisa las áreas que deseas autorizar.
            </SupportSection>
            <SupportSection title="2. Autoriza desde ChatGPT">
              Busca Índice en Complementos, pulsa <strong>Conectar</strong>, inicia sesión en Índice y aprueba los permisos mostrados. No copies ni pegues claves.
            </SupportSection>
            <SupportSection title="3. Haz tu primera consulta">
              Prueba con “¿Cuánto vendí hoy?”, “¿Qué productos tienen inventario bajo?”, “¿Qué gastos están vencidos?” o “Muéstrame mis tareas pendientes”.
            </SupportSection>
            <SupportSection title="4. Confirma antes de registrar">
              Las acciones muestran una vista previa. Revisa nombres, fechas, importes, monedas y fondos; confirma únicamente si todo es correcto.
            </SupportSection>
            <SupportSection title="Si la conexión no responde">
              Comprueba que tu cuenta y empresa estén activas, que el permiso solicitado continúe vigente y que la conexión no haya vencido o sido revocada. Si cambiaste permisos, cierra y vuelve a conectar el asistente.
            </SupportSection>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Ayuda directa</p>
              <p className="mt-2 leading-6">Incluye el nombre de tu empresa, la hora aproximada del problema y la pregunta que intentabas realizar. No envíes contraseñas, códigos de acceso ni tokens.</p>
              <a className="mt-3 inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-800" href={`mailto:${supportEmail}`}>
                {supportEmail} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SupportSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{children}</p>
    </section>
  );
}
