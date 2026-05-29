import type { ComponentType } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileSignature,
  Handshake,
  PackageCheck,
  Quote,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { useVentasTranslations } from '../../hooks/useVentasTranslations';

export const salesTabIds = [
  'leads',
  'contacts',
  'quotes',
  'sales',
  'products',
  'inventory',
  'contracts',
  'after-sales',
  'kpis',
] as const;

export type SalesTabId = (typeof salesTabIds)[number];

type SalesTranslationKey = 'prospectos' | 'contactos' | 'cotizacion' | 'sales' | 'productos' | 'inventario' | 'postventa' | 'contrato' | 'kpis';

type SalesTone = 'blue' | 'aqua' | 'yellow' | 'coral' | 'graphite';

type SalesWorkspaceMetric = {
  label: string;
  value: string;
  detail: string;
};

type SalesWorkspaceLane = {
  label: string;
  value: string;
  detail: string;
};

type SalesWorkspaceCopy = {
  badge: string;
  overviewTitle: string;
  overviewSubtitle: string;
  primaryAction: string;
  secondaryAction: string;
  controlLabel: string;
  activeLabel: string;
  rhythmLabel: string;
  overviewMetrics: SalesWorkspaceMetric[];
  signals: Array<{
    label: string;
    value: string;
    tone: SalesTone;
  }>;
  tabs: Record<SalesTabId, {
    eyebrow: string;
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
    metrics: SalesWorkspaceMetric[];
    lanes: SalesWorkspaceLane[];
    signalTitle: string;
    signals: string[];
  }>;
};

export const salesModuleTabs: Array<{
  id: SalesTabId;
  translationKey: SalesTranslationKey;
  icon: ComponentType<{ className?: string }>;
  emoji: string;
  tone: SalesTone;
}> = [
  { id: 'leads', translationKey: 'prospectos', icon: Target, emoji: '🎯', tone: 'blue' },
  { id: 'contacts', translationKey: 'contactos', icon: UsersRound, emoji: '👥', tone: 'aqua' },
  { id: 'quotes', translationKey: 'cotizacion', icon: Quote, emoji: '💬', tone: 'yellow' },
  { id: 'sales', translationKey: 'sales', icon: CircleDollarSign, emoji: '💼', tone: 'coral' },
  { id: 'products', translationKey: 'productos', icon: PackageCheck, emoji: '📦', tone: 'aqua' },
  { id: 'inventory', translationKey: 'inventario', icon: Warehouse, emoji: '🏬', tone: 'coral' },
  { id: 'contracts', translationKey: 'contrato', icon: FileSignature, emoji: '📝', tone: 'graphite' },
  { id: 'after-sales', translationKey: 'postventa', icon: Handshake, emoji: '🤝', tone: 'coral' },
  { id: 'kpis', translationKey: 'kpis', icon: BarChart3, emoji: '📊', tone: 'blue' },
];

export const visibleSalesModuleTabs = salesModuleTabs.filter((tab) => tab.id !== 'contracts');

const toneClasses: Record<SalesTone, {
  accent: string;
  border: string;
  icon: string;
  soft: string;
  text: string;
}> = {
  blue: {
    accent: 'bg-[#2563EB]',
    border: 'border-[#2563EB]/25',
    icon: 'bg-[#2563EB] text-white',
    soft: 'bg-[#2563EB]/10',
    text: 'text-[#2563EB]',
  },
  aqua: {
    accent: 'bg-[#59C3A5]',
    border: 'border-[#59C3A5]/35',
    icon: 'bg-[#59C3A5] text-white',
    soft: 'bg-[#59C3A5]/10',
    text: 'text-[#177d66]',
  },
  yellow: {
    accent: 'bg-[#F4C84A]',
    border: 'border-[#F4C84A]/45',
    icon: 'bg-[#F4C84A] text-[#222831]',
    soft: 'bg-[#F4C84A]/15',
    text: 'text-[#9a6b05]',
  },
  coral: {
    accent: 'bg-[#FF6B5E]',
    border: 'border-[#FF6B5E]/35',
    icon: 'bg-[#FF6B5E] text-white',
    soft: 'bg-[#FF6B5E]/10',
    text: 'text-[#b63b32]',
  },
  graphite: {
    accent: 'bg-[#222831]',
    border: 'border-[#222831]/20 dark:border-white/15',
    icon: 'bg-[#222831] text-white',
    soft: 'bg-[#222831]/5 dark:bg-white/10',
    text: 'text-[#222831] dark:text-white',
  },
};

const salesCopyEs: SalesWorkspaceCopy = {
  badge: 'Indice Sales OS',
  overviewTitle: 'Control comercial',
  overviewSubtitle: 'Prospectos, cotizaciones, productos, inventario, postventa, contratos y KPIs dentro de un flujo comercial claro.',
  primaryAction: 'Crear oportunidad',
  secondaryAction: 'Revisar embudo',
  controlLabel: 'Lectura comercial',
  activeLabel: 'Pipeline activo',
  rhythmLabel: 'Ritmo semanal',
  overviewMetrics: [
    { label: 'Pipeline estimado', value: '$248K', detail: '12 oportunidades abiertas' },
    { label: 'Cotizaciones vivas', value: '18', detail: '6 requieren seguimiento' },
    { label: 'Conversión objetivo', value: '34%', detail: '+4 pts vs periodo anterior' },
    { label: 'Contratos en firma', value: '7', detail: '3 listos para cierre' },
  ],
  signals: [
    { label: 'Seguimiento pendiente', value: '6', tone: 'yellow' },
    { label: 'Clientes en riesgo', value: '2', tone: 'coral' },
    { label: 'Cierres probables', value: '5', tone: 'aqua' },
  ],
  tabs: {
    leads: {
      eyebrow: 'Entrada comercial',
      title: 'Oportunidades comerciales',
      description: 'Vista preparada para gestionar ventas activas ligadas a contactos del directorio.',
      primaryAction: 'Crear oportunidad',
      secondaryAction: 'Segmentar pipeline',
      metrics: [
        { label: 'Prospectos nuevos', value: '24', detail: '8 calificados esta semana' },
        { label: 'Valor potencial', value: '$86K', detail: 'pipeline temprano' },
        { label: 'Siguiente contacto', value: '11', detail: 'vencen en 48 h' },
      ],
      lanes: [
        { label: 'Nuevo', value: '9', detail: 'Captura inicial' },
        { label: 'Calificado', value: '8', detail: 'Necesidad validada' },
        { label: 'Propuesta', value: '5', detail: 'Oferta en preparación' },
        { label: 'Cierre', value: '2', detail: 'Decisión pendiente' },
      ],
      signalTitle: 'Señales de seguimiento',
      signals: ['Registrar fuente de adquisición', 'Asignar responsable comercial', 'Definir próxima acción con fecha'],
    },
    contacts: {
      eyebrow: 'Directorio comercial',
      title: 'Contactos',
      description: 'Base de contactos comerciales para crear oportunidades sin mezclar directorio con ventas activas.',
      primaryAction: 'Agregar contacto',
      secondaryAction: 'Ver directorio',
      metrics: [
        { label: 'Contactos', value: '4', detail: 'base comercial local' },
        { label: 'Con teléfono', value: '4', detail: 'listos para llamada' },
        { label: 'Con correo', value: '4', detail: 'listos para email' },
      ],
      lanes: [
        { label: 'Referidos', value: '1', detail: 'Origen validado' },
        { label: 'Website', value: '1', detail: 'Entrada digital' },
        { label: 'Social', value: '1', detail: 'Prospección activa' },
        { label: 'Campaña', value: '1', detail: 'Seguimiento comercial' },
      ],
      signalTitle: 'Orden del CRM',
      signals: ['Crear contacto antes de oportunidad', 'Mantener datos de contacto limpios', 'Ligar oportunidades al contacto correcto'],
    },
    quotes: {
      eyebrow: 'Oferta comercial',
      title: 'Cotizaciones',
      description: 'Superficie lista para controlar versiones, margen, vigencia y respuesta del cliente.',
      primaryAction: 'Nueva cotización',
      secondaryAction: 'Ver vencidas',
      metrics: [
        { label: 'Enviadas', value: '18', detail: 'vigentes' },
        { label: 'Por vencer', value: '5', detail: 'menos de 3 días' },
        { label: 'Margen promedio', value: '41%', detail: 'estimado' },
      ],
      lanes: [
        { label: 'Borrador', value: '4', detail: 'Sin enviar' },
        { label: 'En revisión', value: '6', detail: 'Cliente evaluando' },
        { label: 'Negociación', value: '5', detail: 'Ajuste activo' },
        { label: 'Aceptada', value: '3', detail: 'Lista para contrato' },
      ],
      signalTitle: 'Control de propuesta',
      signals: ['Validar margen antes de enviar', 'Mantener vigencia visible', 'Convertir aceptadas a contrato'],
    },
    sales: {
      eyebrow: 'Cierre comercial',
      title: 'Ventas ganadas',
      description: 'Registro operativo donde una cotización aceptada se convierte en venta lista para ejecución.',
      primaryAction: 'Nueva venta',
      secondaryAction: 'Ver validaciones',
      metrics: [
        { label: 'Ventas ganadas', value: '24', detail: 'cotizaciones aceptadas' },
        { label: 'Validación pendiente', value: '6', detail: 'finanzas o inventario' },
        { label: 'Comisiones', value: '$18K', detail: 'generadas' },
      ],
      lanes: [
        { label: 'Pendiente', value: '6', detail: 'Validación comercial' },
        { label: 'Finanzas', value: '12', detail: 'Pago aprobado' },
        { label: 'Inventario', value: '10', detail: 'Listo para salida' },
        { label: 'Entregado', value: '8', detail: 'Ejecución completada' },
      ],
      signalTitle: 'Puente operativo',
      signals: ['Crear venta desde cotización aceptada', 'Separar cierre comercial de inventario', 'Pasar validación a finanzas y postventa'],
    },
    products: {
      eyebrow: 'Catálogo comercial',
      title: 'Productos y servicios',
      description: 'Base preparada para ordenar oferta, precio, margen, disponibilidad y paquetes comerciales.',
      primaryAction: 'Agregar producto',
      secondaryAction: 'Revisar precios',
      metrics: [
        { label: 'Activos', value: '42', detail: 'productos y servicios' },
        { label: 'Sin precio', value: '3', detail: 'requieren definición' },
        { label: 'Mayor margen', value: 'Servicio Pro', detail: '62% estimado' },
      ],
      lanes: [
        { label: 'Productos', value: '28', detail: 'Venta directa' },
        { label: 'Servicios', value: '9', detail: 'Entrega programada' },
        { label: 'Paquetes', value: '5', detail: 'Oferta combinada' },
        { label: 'Revisión', value: '3', detail: 'Precio pendiente' },
      ],
      signalTitle: 'Claridad de oferta',
      signals: ['Separar producto y servicio', 'Alinear precio con margen', 'Marcar disponibilidad comercial'],
    },
    inventory: {
      eyebrow: 'Control de stock',
      title: 'Inventario',
      description: 'Capa preparada para ubicar stock, revisar mínimos y registrar movimientos sin mezclar el catálogo comercial.',
      primaryAction: 'Nuevo movimiento',
      secondaryAction: 'Ver columnas',
      metrics: [
        { label: 'Items rastreados', value: '2', detail: 'con control de inventario' },
        { label: 'Stock bajo', value: '1', detail: 'requiere atención' },
        { label: 'Valor estimado', value: '$32K', detail: 'stock local' },
      ],
      lanes: [
        { label: 'Saludable', value: '1', detail: 'Sobre mínimo' },
        { label: 'Bajo', value: '1', detail: 'Reordenar pronto' },
        { label: 'Agotado', value: '1', detail: 'Validar antes de POS' },
        { label: 'Sin rastreo', value: '3', detail: 'Servicios o internos' },
      ],
      signalTitle: 'Señales de inventario',
      signals: ['Separar catálogo de existencias', 'Registrar movimientos con responsable', 'Preparar ubicaciones para POS futuro'],
    },
    'after-sales': {
      eyebrow: 'Relación posterior',
      title: 'Gestión postventa',
      description: 'Espacio preparado para renovaciones, tickets, entregas, garantías y satisfacción del cliente.',
      primaryAction: 'Nueva gestión',
      secondaryAction: 'Ver clientes',
      metrics: [
        { label: 'Casos abiertos', value: '14', detail: '4 de prioridad alta' },
        { label: 'Renovaciones', value: '6', detail: 'próximos 30 días' },
        { label: 'Satisfacción', value: '91%', detail: 'último pulso' },
      ],
      lanes: [
        { label: 'Entrega', value: '5', detail: 'En curso' },
        { label: 'Soporte', value: '4', detail: 'Seguimiento activo' },
        { label: 'Renovación', value: '3', detail: 'Oportunidad' },
        { label: 'Cerrado', value: '2', detail: 'Validado' },
      ],
      signalTitle: 'Continuidad comercial',
      signals: ['Cuidar cuentas con reclamos', 'Convertir soporte en renovación', 'Registrar aprendizaje de entrega'],
    },
    contracts: {
      eyebrow: 'Cierre formal',
      title: 'Contrato digital',
      description: 'Base preparada para documentos, aprobaciones, firma, vigencia y trazabilidad del cierre.',
      primaryAction: 'Crear contrato',
      secondaryAction: 'Ver pendientes',
      metrics: [
        { label: 'En firma', value: '7', detail: '3 con cliente' },
        { label: 'Por aprobar', value: '4', detail: 'revisión interna' },
        { label: 'Cierre estimado', value: '$72K', detail: 'valor contractual' },
      ],
      lanes: [
        { label: 'Borrador', value: '3', detail: 'Datos incompletos' },
        { label: 'Aprobación', value: '4', detail: 'Revisión interna' },
        { label: 'Firma', value: '7', detail: 'Cliente / empresa' },
        { label: 'Activo', value: '9', detail: 'Vigente' },
      ],
      signalTitle: 'Trazabilidad legal',
      signals: ['Conectar contrato con cotización', 'Mantener aprobador visible', 'Controlar vigencia y renovación'],
    },
    kpis: {
      eyebrow: 'Lectura ejecutiva',
      title: 'KPIs comerciales',
      description: 'Tablero preparado para medir conversión, velocidad, valor de pipeline, cierres y retención.',
      primaryAction: 'Actualizar KPIs',
      secondaryAction: 'Exportar lectura',
      metrics: [
        { label: 'Conversión', value: '34%', detail: '+4 pts' },
        { label: 'Ticket promedio', value: '$12.4K', detail: 'pipeline activo' },
        { label: 'Ciclo de venta', value: '18 días', detail: 'promedio' },
      ],
      lanes: [
        { label: 'Adquisición', value: '24', detail: 'nuevos leads' },
        { label: 'Cotización', value: '18', detail: 'ofertas vivas' },
        { label: 'Cierre', value: '7', detail: 'contratos' },
        { label: 'Retención', value: '91%', detail: 'satisfacción' },
      ],
      signalTitle: 'Indicadores clave',
      signals: ['Medir conversión por fuente', 'Separar ventas de margen', 'Vigilar velocidad de cierre'],
    },
  },
};

const salesCopyEn: SalesWorkspaceCopy = {
  ...salesCopyEs,
  badge: 'Indice Sales OS',
  overviewTitle: 'Commercial control',
  overviewSubtitle: 'Leads, quotes, products, inventory, after-sales, contracts, and KPIs inside a clear commercial flow.',
  primaryAction: 'New opportunity',
  secondaryAction: 'Review pipeline',
  controlLabel: 'Commercial reading',
  activeLabel: 'Active pipeline',
  rhythmLabel: 'Weekly rhythm',
};

export function getSalesIdentityCopy(moduleTitle?: string): SalesWorkspaceCopy {
  return moduleTitle?.toLowerCase() === 'sales' ? salesCopyEn : salesCopyEs;
}

export function IndiceSalesMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-grid h-8 grid-cols-4 items-end gap-1', className)} aria-hidden="true">
      <span className="h-3 rounded-md bg-[#FF6B5E]" />
      <span className="h-5 rounded-md bg-[#F4C84A]" />
      <span className="h-7 rounded-md bg-[#59C3A5]" />
      <span className="h-8 rounded-md bg-[#2563EB]" />
    </span>
  );
}

export function toneClass(tone: SalesTone) {
  return toneClasses[tone];
}

export function SalesWorkspacePlaceholder({ section }: { section: SalesTabId }) {
  const t = useVentasTranslations();
  const copy = getSalesIdentityCopy(t.title);
  const blueprint = copy.tabs[section];
  const tab = salesModuleTabs.find((item) => item.id === section) ?? salesModuleTabs[0];
  const tone = toneClass(tab.tone);

  return (
    <section className="space-y-5">
      <div className={cn('rounded-lg border p-6 shadow-sm', tone.border, tone.soft)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-2xl shadow-sm ring-1', tone.border)}>
              <span aria-hidden="true">{tab.emoji}</span>
            </div>
            <div className="min-w-0">
              <p className={cn('text-xs font-bold uppercase tracking-[0.16em]', tone.text)}>{blueprint.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{blueprint.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{blueprint.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className={cn(
              'h-11 rounded-lg px-4 shadow-sm',
              tone.icon,
              tab.tone === 'blue' && 'hover:bg-[#1D4ED8]',
              tab.tone === 'aqua' && 'hover:bg-[#3AAE90]',
              tab.tone === 'yellow' && 'hover:bg-[#E5B835]',
              tab.tone === 'coral' && 'hover:bg-[#E8564B]',
              tab.tone === 'graphite' && 'hover:bg-slate-700',
            )}>
              <CheckCircle2 className="h-4 w-4" />
              {blueprint.primaryAction}
            </Button>
            <Button variant="outline" className="h-11 rounded-lg border-slate-200 bg-white px-4 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
              <ArrowRight className="h-4 w-4" />
              {blueprint.secondaryAction}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {blueprint.metrics.map((metric, index) => (
          <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className={cn('mb-4 h-1 w-12 rounded-full', toneClass(salesModuleTabs[index]?.tone ?? tab.tone).accent)} />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{metric.value}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{metric.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.activeLabel}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{blueprint.title}</p>
            </div>
            <TrendingUp className={cn('h-5 w-5', tone.text)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {blueprint.lanes.map((lane) => (
              <article key={lane.label} className={cn('rounded-lg border p-4', tone.border, tone.soft)}>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{lane.label}</p>
                <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">{lane.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">{lane.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4C84A]/20 text-[#9a6b05]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{blueprint.signalTitle}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.controlLabel}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {blueprint.signals.map((signal) => (
              <div key={signal} className="flex items-start gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#59C3A5]" />
                <p className="text-sm leading-6 text-slate-800 dark:text-slate-100">{signal}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export { CircleDollarSign, ClipboardCheck, UsersRound };
