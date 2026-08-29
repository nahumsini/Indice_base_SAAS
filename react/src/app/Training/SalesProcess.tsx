import { useState } from 'react';
import {
  BriefcaseBusiness,
  CalendarCheck,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Handshake,
  Lightbulb,
  Megaphone,
  MessageCircle,
  Presentation,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  X,
} from 'lucide-react';
import { IndiceWorkspaceNavigation } from '../components/frontend-os';

type SalesStage = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  objective: string;
  description: string;
  color: string;
  icon: typeof MessageCircle;
  actions: string[];
  questions: string[];
  avoid: string[];
  result: string;
  evidence: string;
  resourceIds: string[];
};

type CommercialResource = {
  id: string;
  title: string;
  description: string;
  category: 'Consultoría' | 'Producto' | 'Operación' | 'Crecimiento' | 'Legal';
  version: string;
  updatedAt: string;
  editable?: boolean;
  required?: boolean;
};

const resources: CommercialResource[] = [
  {
    id: 'consulting-guide', title: 'Guía de consultoría comercial', category: 'Consultoría', version: '1.0', updatedAt: 'Agosto 2026', required: true,
    description: 'Método completo para preparar y conducir una sesión de diagnóstico de 60 a 90 minutos.',
    editable: true,
  },
  {
    id: 'basic-modules', title: 'Descripción técnica de módulos básicos', category: 'Producto', version: '1.0', updatedAt: 'Agosto 2026', required: true,
    description: 'Funciones principales, virtudes y alcance de los módulos que el distribuidor debe dominar.',
    editable: true,
  },
  {
    id: 'operating-manual', title: 'Manual operativo para distribuidores', category: 'Operación', version: '1.0', updatedAt: 'Agosto 2026', required: true,
    description: 'Responsabilidades, acompañamiento, certificaciones, comisiones, marca y reglas de operación.',
    editable: true,
  },
  {
    id: 'income-guide', title: 'Guía de evolución de ingresos', category: 'Crecimiento', version: '1.0', updatedAt: 'Agosto 2026',
    description: 'Escenarios en pesos mexicanos para comprender el valor de construir una cartera recurrente.',
    editable: true,
  },
  {
    id: 'agreement-draft', title: 'Borrador de contrato de distribución', category: 'Legal', version: 'Borrador 1.0', updatedAt: 'Agosto 2026',
    description: 'Documento de referencia sujeto a revisión y aprobación legal antes de su firma.',
    editable: true,
  },
];

const stages: SalesStage[] = [
  {
    id: 'contact', number: 1, title: 'Contacto y confianza', shortTitle: 'Contacto', icon: MessageCircle, color: '#2563EB',
    objective: 'Conseguir una conversación real y despertar confianza.',
    description: 'El primer contacto no busca vender todo Índice. Busca conocer a la persona, entender brevemente su empresa y acordar el siguiente paso.',
    actions: ['Investiga el giro, tamaño y contexto de la empresa.', 'Preséntate como distribuidor autorizado de Índice.', 'Escucha antes de explicar el producto.', 'Registra el contacto y acuerda una siguiente conversación.'],
    questions: ['¿A qué se dedica la empresa?', '¿Cuántas personas participan en la operación?', '¿Qué parte del negocio consume más tiempo actualmente?'],
    avoid: ['Enumerar todos los módulos.', 'Enviar una cotización sin conocer la necesidad.', 'Presionar para cerrar durante el primer mensaje.'],
    result: 'Prospecto contactado y siguiente conversación acordada.',
    evidence: 'Contacto, origen del lead, necesidad inicial y próxima acción registrados.',
    resourceIds: ['operating-manual'],
  },
  {
    id: 'demo', number: 2, title: 'Descubrimiento y demo', shortTitle: 'Demo', icon: Presentation, color: '#06A88D',
    objective: 'Conseguir una consultoría de diagnóstico de 60 a 90 minutos.',
    description: 'La demostración debe ser breve y contextual. Enseña el valor de Índice sin convertir la conversación en una capacitación completa.',
    actions: ['Confirma el problema que el prospecto quiere resolver.', 'Explica Índice como plataforma más acompañamiento.', 'Muestra únicamente una vista o función relacionada.', 'Invita a una consultoría gratuita y agenda fecha.'],
    questions: ['¿Cómo controlan hoy esa operación?', '¿Qué ocurre cuando la información no está disponible?', '¿Quién debería participar en una sesión de diagnóstico?'],
    avoid: ['Dar una demostración genérica demasiado larga.', 'Prometer funciones sin validar el alcance.', 'Terminar sin proponer fecha para la consultoría.'],
    result: 'Consultoría agendada con participantes y propósito definidos.',
    evidence: 'Fecha, asistentes y dolor inicial documentados.',
    resourceIds: ['basic-modules', 'consulting-guide'],
  },
  {
    id: 'consulting', number: 3, title: 'Consultoría y diagnóstico', shortTitle: 'Consultoría', icon: Search, color: '#F0B429',
    objective: 'Entender qué le duele al cliente y recomendar la solución correcta.',
    description: 'Construye el mapa de Personas, Procesos, Productos y Finanzas. Después presenta solamente los módulos capaces de resolver los problemas prioritarios.',
    actions: ['Rompe el hielo durante los primeros 5 a 10 minutos.', 'Entrevista y construye el mapa de los cuatro pilares.', 'Confirma impacto, urgencia y prioridad de cada dolor.', 'Demuestra los módulos relevantes y construye valor.'],
    questions: ['¿Qué le gustaría mejorar primero?', '¿Dónde siente que pierde control, dinero o tiempo?', '¿Cómo sabría que la solución está funcionando?'],
    avoid: ['Convertir la sesión en interrogatorio.', 'Presentar todos los módulos.', 'Hablar de precio antes de construir valor.'],
    result: 'Diagnóstico documentado, solución recomendada y propuesta presentada.',
    evidence: 'Mapa empresarial, dolores, módulos recomendados y acuerdos.',
    resourceIds: ['consulting-guide', 'basic-modules'],
  },
  {
    id: 'closing', number: 4, title: 'Cierre y acuerdos', shortTitle: 'Cierre', icon: Handshake, color: '#F66B61',
    objective: 'Convertir la propuesta en una decisión y un siguiente paso concreto.',
    description: 'Cuando el cliente no compra durante la consultoría, el cierre continúa como una etapa con responsables, objeciones y fechas claras.',
    actions: ['Confirma alcance, módulos, usuarios y responsables.', 'Identifica la objeción real y quién toma la decisión.', 'Agrega valor antes de reducir el precio.', 'Documenta propuesta, condiciones y próxima fecha.'],
    questions: ['¿Qué necesita resolver antes de comenzar?', '¿Quién más participa en la decisión?', '¿Qué fecha tendría sentido para iniciar?'],
    avoid: ['Bajar el precio como primera respuesta.', 'Improvisar promociones no autorizadas.', 'Dejar el seguimiento sin fecha.'],
    result: 'Venta ganada o motivo real de pérdida claramente registrado.',
    evidence: 'Propuesta, objeciones, decisión y compromiso siguiente.',
    resourceIds: ['operating-manual', 'income-guide'],
  },
  {
    id: 'implementation', number: 5, title: 'Implementación', shortTitle: 'Implementación', icon: ClipboardCheck, color: '#8B5CF6',
    objective: 'Lograr que el cliente use correctamente los módulos contratados.',
    description: 'La implementación comienza después del pago. Las sesiones dependen del paquete contratado y cada una debe producir un avance verificable.',
    actions: ['Realiza onboarding y confirma responsables.', 'Agenda las sesiones incluidas en el paquete.', 'Configura y capacita módulo por módulo.', 'Documenta acuerdos, pendientes y evidencia de uso.'],
    questions: ['¿Quién será responsable de cada módulo?', '¿Qué información debe prepararse antes de la sesión?', '¿Qué resultado verificaremos al terminar?'],
    avoid: ['Agendar sesiones sin objetivo.', 'Capacitar sin datos ni responsables.', 'Dar por implementado un módulo que nadie utiliza.'],
    result: 'Módulos configurados, usuarios capacitados y operación iniciada.',
    evidence: 'Sesiones agendadas, responsables, acuerdos y pruebas de adopción.',
    resourceIds: ['basic-modules', 'operating-manual'],
  },
  {
    id: 'follow-up', number: 6, title: 'Seguimiento mensual', shortTitle: 'Seguimiento', icon: CalendarCheck, color: '#177D66',
    objective: 'Mantener la adopción, resolver obstáculos y fortalecer la permanencia.',
    description: 'El acompañamiento no termina con la implementación. Cada cliente debe tener una llamada mensual para revisar uso, resultados y nuevas necesidades.',
    actions: ['Agenda la llamada mensual con anticipación.', 'Revisa uso, resultados, dudas y pendientes.', 'Recomienda mejoras o módulos cuando exista valor real.', 'Escala a corporativo lo que no puedas resolver.'],
    questions: ['¿Qué mejoró desde la última sesión?', '¿Qué función todavía no está siendo utilizada?', '¿Qué obstáculo debemos resolver este mes?'],
    avoid: ['Contactar al cliente solamente para cobrar.', 'Esperar a que el cliente reporte un problema.', 'Recomendar módulos sin necesidad comprobada.'],
    result: 'Cliente acompañado, próxima sesión agendada y plan actualizado.',
    evidence: 'Minuta mensual, problemas, recomendaciones y siguiente fecha.',
    resourceIds: ['operating-manual', 'consulting-guide'],
  },
];

export function SalesProcess({ basePath }: { basePath: string }) {
  const [activeId, setActiveId] = useState(stages[0].id);
  const [selectedResource, setSelectedResource] = useState<CommercialResource | null>(null);
  const active = stages.find((stage) => stage.id === activeId) ?? stages[0];
  const ActiveIcon = active.icon;
  const activeResources = resources.filter((resource) => active.resourceIds.includes(resource.id));

  return (
    <div className="space-y-5" data-training-view="sales-process">
      <section className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-5 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><BriefcaseBusiness className="h-5 w-5" /></span>
            <div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">Método comercial Índice</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">De prospecto a relación de largo plazo</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">La venta no termina al cobrar. Escucha, diagnostica, implementa y acompaña para que el cliente obtenga control real de su empresa.</p></div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 text-sm sm:flex">
            <div className="rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">Etapas</p><p className="mt-1 font-medium text-slate-950 dark:text-white">6 obligatorias</p></div>
            <div className="rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">Resultado</p><p className="mt-1 font-medium text-slate-950 dark:text-white">Cliente activo</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3"><Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-[#257B68] dark:text-[#8FE0CA]" /><div><h4 className="font-medium text-slate-950 dark:text-white">Primero identifica el origen del lead</h4><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Redes sociales y prospección directa son fuentes de oportunidades, no etapas de venta. Registra el origen para medir qué canal genera mejores clientes.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LeadSource icon={Users} title="Lead de redes sociales" description="Llegó por campañas, contenido, formularios o mensajes en redes." />
          <LeadSource icon={Target} title="Lead de prospección" description="Fue identificado y contactado directamente por el distribuidor." />
        </div>
      </section>

      <IndiceWorkspaceNavigation
        ariaLabel="Etapas del proceso de venta"
        tone="aqua"
        variant="workflow"
        value={activeId}
        onValueChange={setActiveId}
        items={stages.map((stage) => ({ id: stage.id, label: stage.shortTitle, description: `Etapa ${stage.number}`, icon: <stage.icon /> }))}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-t-4 p-5" style={{ borderTopColor: active.color, backgroundColor: `${active.color}0D` }}>
            <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${active.color}18`, color: active.color }}><ActiveIcon className="h-5 w-5" /></span><div><p className="text-xs font-medium" style={{ color: active.color }}>Etapa {active.number} de 6</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{active.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{active.description}</p></div></div>
          </div>
          <div className="border-t border-slate-100 p-6 dark:border-slate-800">
            <InfoHeading icon={Target} title="Objetivo de la etapa" /><p className="mt-2 text-sm font-medium leading-6 text-slate-800 dark:text-slate-200">{active.objective}</p>
            <div className="mt-6"><InfoHeading icon={CheckCircle2} title="Acciones obligatorias" /><List items={active.actions} tone="success" /></div>
            <div className="mt-6"><InfoHeading icon={Lightbulb} title="Preguntas recomendadas" /><List items={active.questions} tone="question" /></div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-red-100 bg-red-50/70 p-5 dark:border-red-900 dark:bg-red-950/20"><InfoHeading icon={ShieldAlert} title="Evita estos errores" tone="danger" /><List items={active.avoid} tone="danger" /></article>
          <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"><InfoHeading icon={Sparkles} title="Resultado para avanzar" tone="success" /><p className="mt-3 text-sm font-medium leading-6 text-emerald-950 dark:text-emerald-100">{active.result}</p></article>
          <article className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20"><InfoHeading icon={ClipboardCheck} title="Evidencia requerida" tone="question" /><p className="mt-3 text-sm leading-6 text-blue-950 dark:text-blue-100">{active.evidence}</p><p className="mt-4 border-t border-blue-200 pt-4 text-xs leading-5 text-blue-700 dark:border-blue-900 dark:text-blue-300">La evidencia se validará dentro de la Ruta de certificación. Leer esta guía no acredita la competencia.</p></article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <InfoHeading icon={FileText} title="Recursos para esta etapa" />
            <div className="mt-3 space-y-2">{activeResources.map((resource) => <button key={resource.id} type="button" onClick={() => setSelectedResource(resource)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left outline-none transition hover:border-[#59C3A5] hover:bg-[#59C3A5]/5 focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:border-slate-700 dark:hover:bg-slate-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#257B68] dark:text-[#8FE0CA]"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-900 dark:text-white">{resource.title}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Ver o descargar · v{resource.version}</span></span><Eye className="h-4 w-4 shrink-0 text-slate-400" /></button>)}</div>
          </article>
        </aside>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">Biblioteca comercial</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">Kit comercial Índice</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Consulta siempre la versión publicada aquí. Los materiales obligatorios forman parte de la preparación para la certificación inicial.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"><FileText className="h-4 w-4" />{resources.length} documentos vigentes</span></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} basePath={basePath} onPreview={() => setSelectedResource(resource)} />)}</div>
      </section>

      {selectedResource ? <ResourcePreview resource={selectedResource} basePath={basePath} onClose={() => setSelectedResource(null)} /> : null}
    </div>
  );
}

function ResourceCard({ resource, basePath, onPreview }: { resource: CommercialResource; basePath: string; onPreview: () => void }) {
  return <article className="flex min-h-64 flex-col rounded-xl border border-slate-200 bg-slate-50/40 p-5 dark:border-slate-700 dark:bg-slate-800/50"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><FileText className="h-5 w-5" /></span>{resource.required ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800"><BadgeCheck className="h-3.5 w-3.5" />Obligatorio</span> : null}</div><p className="mt-4 text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">{resource.category}</p><h4 className="mt-1 font-medium text-slate-950 dark:text-white">{resource.title}</h4><p className="mt-2 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{resource.description}</p><div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-700"><span>v{resource.version}</span><span>{resource.updatedAt}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={onPreview} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-white px-3 text-sm font-medium text-[#257B68] hover:bg-[#59C3A5]/5 dark:bg-slate-900 dark:text-[#8FE0CA]"><Eye className="h-4 w-4" />Ver guía</button><a href={resourceUrl(basePath, resource, 'pdf', true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white hover:bg-[#126553]"><Download className="h-4 w-4" />PDF</a></div></article>;
}

function ResourcePreview({ resource, basePath, onClose }: { resource: CommercialResource; basePath: string; onClose: () => void }) {
  const pdfUrl = resourceUrl(basePath, resource, 'pdf', false);
  const pdfDownloadUrl = resourceUrl(basePath, resource, 'pdf', true);
  const editableUrl = resourceUrl(basePath, resource, 'docx', true);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={resource.title}><div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"><header className="flex items-center gap-4 border-b border-[#59C3A5]/30 bg-[#59C3A5]/5 px-5 py-4 dark:bg-[#59C3A5]/10"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><FileText className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="truncate font-medium text-slate-950 dark:text-white">{resource.title}</h3><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{resource.category} · versión {resource.version} · {resource.updatedAt}</p></div><div className="hidden items-center gap-2 sm:flex">{resource.editable ? <a href={editableUrl} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Download className="h-4 w-4" />Editable</a> : null}<a href={pdfDownloadUrl} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white hover:bg-[#126553]"><Download className="h-4 w-4" />Descargar PDF</a></div><button type="button" onClick={onClose} aria-label="Cerrar documento" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#59C3A5] dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></header><iframe src={pdfUrl} title={resource.title} className="min-h-0 flex-1 bg-slate-100" /><footer className="flex gap-2 border-t border-slate-200 p-3 sm:hidden dark:border-slate-700">{resource.editable ? <a href={editableUrl} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"><Download className="h-4 w-4" />Editable</a> : null}<a href={pdfDownloadUrl} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#177D66] text-sm font-medium text-white"><Download className="h-4 w-4" />PDF</a></footer></div></div>;
}

function resourceUrl(basePath: string, resource: CommercialResource, format: 'pdf' | 'docx', download: boolean) {
  return `${basePath}/resources/${resource.id}/${format}${download ? '?download=true' : ''}`;
}

function LeadSource({ icon: Icon, title, description }: { icon: typeof Users; title: string; description: string }) {
  return <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/10 text-[#257B68] dark:text-[#8FE0CA]"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div></div>;
}

function InfoHeading({ icon: Icon, title, tone = 'default' }: { icon: typeof Target; title: string; tone?: 'default' | 'danger' | 'success' | 'question' }) {
  const color = tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-emerald-700' : tone === 'question' ? 'text-blue-600' : 'text-slate-700';
  return <div className={`flex items-center gap-2 ${color}`}><Icon className="h-4 w-4" /><h4 className="text-sm font-medium text-slate-950 dark:text-white">{title}</h4></div>;
}

function List({ items, tone }: { items: string[]; tone: 'success' | 'question' | 'danger' }) {
  const dot = tone === 'danger' ? 'bg-red-500' : tone === 'question' ? 'bg-blue-500' : 'bg-emerald-500';
  return <ul className="mt-3 space-y-2.5">{items.map((entry) => <li key={entry} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{entry}</li>)}</ul>;
}
