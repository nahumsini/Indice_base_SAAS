import {
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Landmark,
  Lightbulb,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Users,
  Workflow,
} from 'lucide-react';

const pillars = [
  {
    title: 'Personas', icon: Users, color: '#59C3A5',
    promise: 'Claridad sobre quién participa, qué responsabilidad tiene y cómo está trabajando.',
    questions: ['¿Tenemos a las personas correctas?', '¿Cada persona conoce su responsabilidad?', '¿Podemos ver asistencia, desempeño e incidencias?'],
    modules: 'Recursos Humanos, usuarios, asistencia, nómina y clima laboral.',
  },
  {
    title: 'Procesos', icon: Workflow, color: '#F4C84A',
    promise: 'Convertir la operación diaria en actividades repetibles, medibles y menos dependientes de la memoria.',
    questions: ['¿Cómo se realiza el trabajo?', '¿Quién debe actuar después?', '¿Dónde se retrasan o pierden las actividades?'],
    modules: 'Procesos y tareas, proyectos, calendarios, evidencias y kioscos.',
  },
  {
    title: 'Productos', icon: Boxes, color: '#FF6B63',
    promise: 'Conectar lo que la empresa ofrece con inventario, clientes, ventas y entrega.',
    questions: ['¿Qué vendemos y con qué margen?', '¿Qué tenemos disponible?', '¿Qué oportunidades comerciales estamos atendiendo?'],
    modules: 'Ventas, CRM, cotizaciones, Punto de Venta, inventarios, compras y cartera.',
  },
  {
    title: 'Finanzas', icon: CircleDollarSign, color: '#2563EB',
    promise: 'Transformar movimientos operativos en control financiero y señales para decidir.',
    questions: ['¿En qué gastamos?', '¿Qué debemos y qué nos deben?', '¿La operación genera utilidad y efectivo?'],
    modules: 'Gastos, Caja Chica, cuentas por cobrar, presupuestos, contabilidad y KPIs.',
  },
];

const countries = [
  {
    country: 'México', flag: '🇲🇽',
    opportunity: 'Profesionalizar empresas familiares y pymes que crecieron con hojas de cálculo, mensajería y controles separados.',
    conversation: 'Control de efectivo, asistencia, gastos, inventario, sucursales y visibilidad para el propietario.',
    entry: 'Caja Chica, Recursos Humanos, Gastos, Punto de Venta e Inventarios.',
  },
  {
    country: 'Colombia', flag: '🇨🇴',
    opportunity: 'Acompañar negocios de servicios, comercio y operación distribuida que necesitan ordenar responsabilidades y seguimiento.',
    conversation: 'Procesos, tareas, cartera, control comercial, asistencia y análisis de rentabilidad.',
    entry: 'Procesos y Tareas, Ventas, Cartera, Recursos Humanos y KPIs.',
  },
  {
    country: 'Canadá', flag: '🇨🇦',
    opportunity: 'Servir empresas multiculturales que valoran trazabilidad, documentación, autoservicio y operación estandarizada.',
    conversation: 'Estandarización, permisos, evidencia, control de equipos móviles y lectura ejecutiva.',
    entry: 'Procesos y Tareas, Recursos Humanos, KPIs y módulos de autoservicio.',
  },
  {
    country: 'Estados Unidos', flag: '🇺🇸',
    opportunity: 'Apoyar pequeñas empresas y negocios latinos que requieren crecer sin perder control ni depender del fundador.',
    conversation: 'Delegación, operación por sucursal, ventas, inventario, seguimiento y control financiero sencillo.',
    entry: 'Panel Inicial, Ventas, Inventarios, Procesos y Tareas y Finanzas.',
  },
  {
    country: 'Brasil', flag: '🇧🇷',
    opportunity: 'Ordenar operaciones comerciales y de personal en empresas con equipos amplios y múltiples puntos de atención.',
    conversation: 'Visibilidad por unidad, control de personas, productos, gastos y desempeño.',
    entry: 'Recursos Humanos, Punto de Venta, Inventarios, Gastos y KPIs.',
  },
];

const modules = [
  {
    title: 'Panel Inicial', icon: Building2, color: '#2563EB', purpose: 'Construye la base organizacional sobre la que trabajan los demás módulos.',
    functions: ['Perfil y datos de la empresa', 'Unidades de negocio y estructura', 'Usuarios y permisos', 'Diagnóstico de madurez empresarial'],
    value: 'Evita comenzar a operar sin responsables, estructura o contexto empresarial.',
  },
  {
    title: 'Recursos Humanos', icon: Users, color: '#59C3A5', purpose: 'Centraliza la información y operación relacionada con los colaboradores.',
    functions: ['Altas y expedientes', 'Puestos, áreas y responsables', 'Asistencia y horarios', 'Documentos, incidencias y nómina'],
    value: 'Ayuda a saber quién integra el equipo, dónde está y qué necesita atención.',
  },
  {
    title: 'Procesos y Tareas', icon: Workflow, color: '#F4C84A', purpose: 'Organiza el trabajo recurrente y las responsabilidades del equipo.',
    functions: ['Procesos y etapas', 'Tareas, prioridades y fechas', 'Proyectos y calendarios', 'Evidencia, comentarios y seguimiento'],
    value: 'Reduce olvidos, seguimiento informal y dependencia de una sola persona.',
  },
  {
    title: 'Gastos', icon: ReceiptText, color: '#177D66', purpose: 'Registra, clasifica y controla los egresos de la empresa.',
    functions: ['Captura y comprobantes', 'Categorías y proveedores', 'Aprobaciones', 'Presupuestos y cuentas contables'],
    value: 'Permite entender en qué se utiliza el dinero y controlar desviaciones.',
  },
  {
    title: 'Caja Chica', icon: Landmark, color: '#177D66', purpose: 'Controla fondos operativos y movimientos de efectivo de bajo monto.',
    functions: ['Fondos y responsables', 'Ingresos, retiros y reembolsos', 'Comprobantes', 'Cortes y estados'],
    value: 'Disminuye fugas, movimientos sin evidencia y diferencias de efectivo.',
  },
  {
    title: 'Punto de Venta', icon: Store, color: '#FF6B63', purpose: 'Ejecuta ventas presenciales conectadas con productos, clientes y cajas.',
    functions: ['Cobro y tickets', 'Clientes y productos', 'Cajas y cortes', 'Kioscos y autoservicio'],
    value: 'Conecta la transacción diaria con el resto de la operación.',
  },
  {
    title: 'Ventas y CRM', icon: ShoppingCart, color: '#FF6B63', purpose: 'Da seguimiento a la relación comercial desde el prospecto hasta la posventa.',
    functions: ['Clientes y contactos', 'Oportunidades y seguimiento', 'Cotizaciones', 'Ventas, contratos y comisiones'],
    value: 'Evita perder oportunidades y permite administrar un proceso comercial repetible.',
  },
  {
    title: 'Inventarios', icon: PackageSearch, color: '#FF6B63', purpose: 'Controla productos, existencias, almacenes y abastecimiento.',
    functions: ['Catálogo y variantes', 'Existencias y movimientos', 'Almacenes', 'Proveedores y órdenes de compra'],
    value: 'Reduce faltantes, compras improvisadas y diferencias entre venta y existencia.',
  },
  {
    title: 'Cartera', icon: ClipboardList, color: '#177D66', purpose: 'Organiza ventas a crédito, saldos, vencimientos y cobranza.',
    functions: ['Clientes de crédito', 'Cuentas por cobrar', 'Pagos y aplicaciones', 'Vencimientos y seguimiento'],
    value: 'Convierte ventas pendientes en un plan visible de recuperación de efectivo.',
  },
  {
    title: 'KPIs', icon: BarChart3, color: '#8B5CF6', purpose: 'Convierte la actividad de los módulos en información para decidir.',
    functions: ['Indicadores ejecutivos', 'Filtros y comparativos', 'Estados financieros', 'Reportes automatizados'],
    value: 'Ayuda a pasar de capturar datos a comprender tendencias, riesgos y prioridades.',
  },
];

export function IndiceInduction() {
  return (
    <div className="space-y-6" data-training-view="induction">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,.42),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(89,195,165,.25),transparent_34%)] p-7 lg:grid-cols-[1.2fr_.8fr] lg:p-10">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Curso de inducción para distribuidores y vendedores</p><h2 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">Entender Índice antes de vender Índice</h2><p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Índice es un sistema operativo empresarial que conecta personas, procesos, productos y finanzas. Su propósito es dar claridad sobre lo que ocurre, ordenar la ejecución y convertir la actividad diaria en mejores decisiones.</p></div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[['Visibilidad', 'Entender qué está pasando.'], ['Control', 'Asignar, ejecutar y comprobar.'], ['Decisión', 'Actuar con información y contexto.']].map(([title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-300">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Lightbulb className="h-5 w-5" /></span><h3 className="mt-4 text-xl font-semibold text-slate-950">¿Qué problema resuelve?</h3><p className="mt-3 text-sm leading-6 text-slate-600">Las empresas suelen crecer con información dispersa, tareas por mensajes, autorizaciones verbales y reportes que llegan tarde. Índice reúne la estructura, la ejecución y los resultados para que el dueño y su equipo trabajen con una misma versión de la operación.</p><div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>La herramienta no sustituye la gestión.</strong> La vuelve visible, ordenada y medible, mientras la red de consultores acompaña al cliente para convertirla en hábitos de operación.</div></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">La propuesta completa</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{[
          ['Tecnología sencilla', 'Módulos conectados para ejecutar el trabajo cotidiano.'],
          ['Metodología empresarial', 'Un marco común de personas, procesos, productos y finanzas.'],
          ['Acompañamiento humano', 'Distribuidores y consultores cercanos durante la adopción.'],
          ['Relación de largo plazo', 'Mejora continua conforme cambia y crece la empresa.'],
        ].map(([title, text]) => <div key={title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><p className="mt-3 font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-5 text-slate-600">{text}</p></div>)}</div></div>
      </section>

      <section><SectionHeading eyebrow="Metodología Índice" title="Cuatro pilares para controlar una empresa" description="Los pilares no son departamentos aislados. Forman un circuito: las personas ejecutan procesos para entregar productos o servicios, y las finanzas muestran el resultado de esa ejecución." /><div className="mt-4 grid gap-4 md:grid-cols-2">{pillars.map((pillar) => { const Icon = pillar.icon; return <article key={pillar.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: `${pillar.color}18`, color: pillar.color }}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wide" style={{ color: pillar.color }}>Pilar</p><h4 className="text-lg font-semibold text-slate-950">{pillar.title}</h4></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{pillar.promise}</p><div className="mt-4 space-y-2">{pillar.questions.map((question) => <p key={question} className="flex gap-2 text-sm text-slate-700"><Target className="mt-0.5 h-4 w-4 shrink-0" style={{ color: pillar.color }} />{question}</p>)}</div><p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Módulos relacionados:</strong> {pillar.modules}</p></article>; })}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><SectionHeading eyebrow="Cómo se conectan" title="De la actividad diaria a la decisión" description="Un distribuidor debe demostrar el recorrido completo, no módulos aislados." compact /><div className="mt-6 grid gap-3 lg:grid-cols-7">{['1. Definir estructura', '2. Asignar responsables', '3. Ejecutar procesos', '4. Vender o entregar', '5. Registrar movimientos', '6. Medir resultados', '7. Mejorar'].map((step, index) => <div key={step} className="relative rounded-2xl bg-slate-50 p-4 text-center text-sm font-medium text-slate-700">{step}{index < 6 ? <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-blue-400 lg:block">→</span> : null}</div>)}</div></section>

      <section><SectionHeading eyebrow="Lectura comercial" title="Oportunidades por país" description="Estas son hipótesis comerciales cualitativas para orientar la conversación. Deben validarse con cada cliente; no representan estadísticas ni promesas regulatorias." /><div className="mt-4 grid gap-4 lg:grid-cols-2">{countries.map((market) => <article key={market.country} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="text-3xl">{market.flag}</span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oportunidad</p><h4 className="text-lg font-semibold text-slate-950">{market.country}</h4></div></div><p className="mt-4 text-sm leading-6 text-slate-700">{market.opportunity}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-blue-50 p-3"><p className="text-xs font-semibold uppercase text-blue-700">Conversación</p><p className="mt-1 text-xs leading-5 text-blue-900">{market.conversation}</p></div><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-semibold uppercase text-emerald-700">Puerta de entrada</p><p className="mt-1 text-xs leading-5 text-emerald-900">{market.entry}</p></div></div></article>)}</div></section>

      <section><SectionHeading eyebrow="Catálogo base" title="Módulos básicos de Índice" description="El vendedor debe comprender para qué sirve cada módulo, qué funciones agrupa y qué problema empresarial ayuda a resolver." /><div className="mt-4 grid gap-4 lg:grid-cols-2">{modules.map((module) => { const Icon = module.icon; return <article key={module.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${module.color}18`, color: module.color }}><Icon className="h-5 w-5" /></span><div><h4 className="text-lg font-semibold text-slate-950">{module.title}</h4><p className="mt-1 text-sm leading-5 text-slate-600">{module.purpose}</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{module.functions.map((feature) => <p key={feature} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{feature}</p>)}</div><p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-5 text-slate-700"><strong>Valor para el cliente:</strong> {module.value}</p></article>; })}</div></section>

      <section className="rounded-3xl border border-blue-200 bg-[linear-gradient(135deg,#EFF6FF,#ECFDF5)] p-6"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Sparkles className="h-5 w-5" /></span><div><h3 className="text-xl font-semibold text-slate-950">Cómo estudiar esta inducción</h3><ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 sm:grid-cols-2"><li>1. Aprende a explicar Índice sin enumerar funciones.</li><li>2. Comprende los cuatro pilares y cómo se conectan.</li><li>3. Relaciona dolores empresariales con módulos.</li><li>4. Practica una demostración basada en diagnóstico.</li><li>5. Continúa al Programa práctico y completa sus casillas.</li></ol></div></div></section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, compact = false }: { eyebrow: string; title: string; description: string; compact?: boolean }) {
  return <div className={compact ? '' : 'max-w-4xl'}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>;
}
