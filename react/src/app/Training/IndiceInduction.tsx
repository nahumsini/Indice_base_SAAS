import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Landmark,
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

const operatingJourney = [
  { title: 'Definir estructura', text: 'Configura empresa, unidades, usuarios, puestos y permisos.' },
  { title: 'Asignar responsables', text: 'Cada actividad tiene una persona, una fecha y una expectativa clara.' },
  { title: 'Ejecutar procesos', text: 'El equipo trabaja con tareas, evidencias y seguimiento visible.' },
  { title: 'Vender o entregar', text: 'La operación comercial conecta clientes, productos y compromisos.' },
  { title: 'Registrar movimientos', text: 'Ventas, gastos, inventario y efectivo dejan evidencia.' },
  { title: 'Medir resultados', text: 'Los datos operativos se convierten en indicadores y alertas.' },
  { title: 'Mejorar', text: 'El dueño decide con contexto y el consultor acompaña el cambio.' },
];

const painScenarios = [
  {
    pain: '“Siento que se pierde dinero en efectivo”',
    diagnosis: 'Falta trazabilidad de fondos, responsables, comprobantes y cortes.',
    module: 'Caja Chica',
    pillar: 'Finanzas',
    result: 'Cada movimiento queda asociado a una persona, evidencia y estado.',
  },
  {
    pain: '“Mi personal llega cuando quiere”',
    diagnosis: 'No existe una lectura confiable de horarios, asistencia e incidencias.',
    module: 'Recursos Humanos',
    pillar: 'Personas',
    result: 'La empresa obtiene registros, reglas y seguimiento sobre su equipo.',
  },
  {
    pain: '“Todo depende de que yo recuerde las cosas”',
    diagnosis: 'El conocimiento está en mensajes y personas, no en un proceso repetible.',
    module: 'Procesos y Tareas',
    pillar: 'Procesos',
    result: 'El trabajo se asigna, ejecuta, comprueba y mejora sin depender del fundador.',
  },
  {
    pain: '“Tenemos prospectos, pero nadie les da seguimiento”',
    diagnosis: 'No hay responsables, etapas ni siguiente acción comercial visible.',
    module: 'Ventas y CRM',
    pillar: 'Productos',
    result: 'Cada oportunidad conserva contexto, responsable y próximo paso.',
  },
  {
    pain: '“El inventario nunca coincide”',
    diagnosis: 'Las compras, ventas y movimientos de almacén están desconectados.',
    module: 'Inventarios',
    pillar: 'Productos',
    result: 'La existencia se explica mediante movimientos y responsables verificables.',
  },
];

const knowledgeOptions = [
  { label: 'Mostrar todos los módulos para impresionar al cliente.', correct: false, feedback: 'Satura la conversación y convierte la sesión en un catálogo sin contexto.' },
  { label: 'Diagnosticar el dolor y demostrar solo el recorrido que genera valor.', correct: true, feedback: 'Correcto. Primero se entiende la empresa; después se conectan dolor, pilar, módulo y resultado.' },
  { label: 'Ofrecer un descuento antes de conocer la operación.', correct: false, feedback: 'El precio no sustituye el diagnóstico. Primero debe construirse valor.' },
];

export function IndiceInduction() {
  const [activePillar, setActivePillar] = useState(0);
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [activeCountry, setActiveCountry] = useState(0);
  const [activeScenario, setActiveScenario] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const [knowledgeAnswer, setKnowledgeAnswer] = useState<number | null>(null);

  const selectedPillar = pillars[activePillar];
  const SelectedPillarIcon = selectedPillar.icon;
  const selectedMarket = countries[activeCountry];
  const selectedScenario = painScenarios[activeScenario];
  const selectedModule = modules[activeModule];
  const SelectedModuleIcon = selectedModule.icon;

  return (
    <div className="space-y-6" data-training-view="induction">
      <section className="overflow-hidden rounded-xl border border-[#59C3A5]/25 bg-white dark:border-[#59C3A5]/30 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]"><Sparkles className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">Inducción interactiva</p><p className="text-xs text-slate-500 dark:text-slate-400">Aprende · relaciona · comprueba</p></div></div>
            <h2 className="mt-5 max-w-3xl text-3xl font-medium leading-tight text-slate-950 dark:text-white">Entender Índice antes de vender Índice</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">No memorices un catálogo. Aprende a reconocer el problema empresarial, conectarlo con los cuatro pilares y demostrar un resultado concreto.</p>
            <div className="mt-6 flex flex-wrap gap-2">{['Visibilidad', 'Control', 'Decisión'].map((item, index) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#177D66] text-[10px] text-white">{index + 1}</span>{item}</span>)}</div>
          </div>
          <div className="border-t border-[#59C3A5]/20 bg-[#59C3A5]/8 p-6 dark:bg-[#59C3A5]/10 lg:border-l lg:border-t-0">
            <p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">La explicación en 20 segundos</p>
            <blockquote className="mt-3 text-lg leading-7 text-slate-900 dark:text-white">“Índice conecta personas, procesos, productos y finanzas para que una empresa pueda ver lo que ocurre, controlar su operación y decidir con información.”</blockquote>
            <div className="mt-5 rounded-xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Regla del distribuidor:</span> si la explicación comienza enumerando módulos, todavía no está comunicando el valor de Índice.</div>
          </div>
        </div>
      </section>

      <InteractiveSection number="01" eyebrow="Metodología Índice" title="Explora los cuatro pilares" description="Selecciona cada pilar y practica las preguntas que ayudan a construir el mapa de la empresa.">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="tablist" aria-label="Pilares de Índice">{pillars.map((pillar, index) => { const Icon = pillar.icon; const active = index === activePillar; return <button key={pillar.title} type="button" role="tab" aria-selected={active} onClick={() => setActivePillar(index)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${active ? 'border-transparent bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5] hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: active ? `${pillar.color}30` : `${pillar.color}18`, color: active ? '#fff' : pillar.color }}><Icon className="h-4 w-4" /></span><span>{pillar.title}</span></button>; })}</div>
          <article role="tabpanel" className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${selectedPillar.color}18`, color: selectedPillar.color }}><SelectedPillarIcon className="h-6 w-6" /></span><div><p className="text-xs font-medium" style={{ color: selectedPillar.color }}>Pilar {activePillar + 1} de 4</p><h4 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{selectedPillar.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedPillar.promise}</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">{selectedPillar.questions.map((question) => <div key={question} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Target className="h-4 w-4" style={{ color: selectedPillar.color }} /><p className="mt-3 text-sm leading-5 text-slate-700 dark:text-slate-200">{question}</p></div>)}</div>
            <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">Módulos relacionados:</span> {selectedPillar.modules}</p>
          </article>
        </div>
      </InteractiveSection>

      <InteractiveSection number="02" eyebrow="Sistema conectado" title="Sigue el recorrido de la operación" description="Índice no son módulos aislados. Selecciona una etapa para ver cómo la actividad se transforma en una decisión.">
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7" role="tablist" aria-label="Recorrido operativo">{operatingJourney.map((step, index) => <button key={step.title} type="button" role="tab" aria-selected={activeJourneyStep === index} onClick={() => setActiveJourneyStep(index)} className={`min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeJourneyStep === index ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}><span className="text-xs opacity-70">0{index + 1}</span><span className="mt-2 block text-sm font-medium leading-5">{step.title}</span></button>)}</div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-blue-50 p-4 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"><div><p className="text-xs font-medium text-blue-700 dark:text-blue-300">Etapa {activeJourneyStep + 1}</p><p className="mt-1 text-sm leading-6">{operatingJourney[activeJourneyStep].text}</p></div><div className="flex shrink-0 gap-2"><IconButton label="Etapa anterior" disabled={activeJourneyStep === 0} onClick={() => setActiveJourneyStep((value) => Math.max(0, value - 1))}><ArrowLeft className="h-4 w-4" /></IconButton><IconButton label="Siguiente etapa" disabled={activeJourneyStep === operatingJourney.length - 1} onClick={() => setActiveJourneyStep((value) => Math.min(operatingJourney.length - 1, value + 1))}><ArrowRight className="h-4 w-4" /></IconButton></div></div>
      </InteractiveSection>

      <InteractiveSection number="03" eyebrow="Práctica consultiva" title="Convierte un dolor en una solución" description="Elige lo que dice el cliente. La academia te muestra el razonamiento correcto antes de presentar un módulo.">
        <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <div className="space-y-2" role="listbox" aria-label="Dolores del cliente">{painScenarios.map((scenario, index) => <button key={scenario.pain} type="button" role="option" aria-selected={activeScenario === index} onClick={() => setActiveScenario(index)} className={`w-full rounded-xl border p-4 text-left text-sm leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeScenario === index ? 'border-[#177D66] bg-[#59C3A5]/10 text-slate-950 dark:text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{scenario.pain}</button>)}</div>
          <div className="rounded-xl bg-slate-950 p-5 text-white dark:bg-slate-800">
            <p className="text-xs font-medium text-[#8FE0CA]">Mapa de razonamiento</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><ReasoningCard label="1. Dolor" value={selectedScenario.pain} /><ReasoningCard label="2. Diagnóstico" value={selectedScenario.diagnosis} /><ReasoningCard label="3. Pilar y módulo" value={`${selectedScenario.pillar} · ${selectedScenario.module}`} /><ReasoningCard label="4. Resultado" value={selectedScenario.result} /></div>
            <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300"><span className="font-medium text-white">Cómo presentarlo:</span> demuestra únicamente las funciones que prueban este resultado. Después confirma con el cliente si resuelven su necesidad.</p>
          </div>
        </div>
      </InteractiveSection>

      <InteractiveSection number="04" eyebrow="Lectura comercial" title="Adapta la conversación al mercado" description="Selecciona un país para revisar una hipótesis comercial. Debe validarse con el cliente y no representa una promesa estadística o regulatoria.">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Mercados">{countries.map((market, index) => <button key={market.country} type="button" role="tab" aria-selected={activeCountry === index} onClick={() => setActiveCountry(index)} className={`rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeCountry === index ? 'border-[#177D66] bg-[#177D66] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{market.flag} {market.country}</button>)}</div>
        <article className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 lg:grid-cols-[1.1fr_.9fr]">
          <div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">Oportunidad en {selectedMarket.country}</p><p className="mt-2 text-base leading-7 text-slate-800 dark:text-slate-100">{selectedMarket.opportunity}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><InfoCard label="Conversación" value={selectedMarket.conversation} tone="blue" /><InfoCard label="Puerta de entrada" value={selectedMarket.entry} tone="aqua" /></div>
        </article>
      </InteractiveSection>

      <InteractiveSection number="05" eyebrow="Catálogo aplicado" title="Explora los módulos por valor" description="Selecciona un módulo para comprender su propósito, sus funciones esenciales y el cambio que produce en la empresa.">
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Módulos básicos">{modules.map((module, index) => <button key={module.title} type="button" role="tab" aria-selected={activeModule === index} onClick={() => setActiveModule(index)} className={`shrink-0 rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeModule === index ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{module.title}</button>)}</div>
        <article className="mt-4 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[.8fr_1.2fr]">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${selectedModule.color}18`, color: selectedModule.color }}><SelectedModuleIcon className="h-6 w-6" /></span><div><h4 className="text-xl font-medium text-slate-950 dark:text-white">{selectedModule.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedModule.purpose}</p><p className="mt-4 rounded-xl bg-[#59C3A5]/10 p-4 text-sm leading-6 text-slate-700 dark:text-slate-200"><span className="font-medium text-[#177D66] dark:text-[#8FE0CA]">Valor para el cliente:</span> {selectedModule.value}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">{selectedModule.functions.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />{feature}</div>)}</div>
        </article>
      </InteractiveSection>

      <section className="rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 dark:bg-[#59C3A5]/10">
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">Comprobación rápida</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">¿Cómo debe comenzar una demostración?</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Selecciona una respuesta para comprobar si comprendiste la lógica consultiva.</p></div><div className="space-y-2">{knowledgeOptions.map((option, index) => { const selected = knowledgeAnswer === index; return <button key={option.label} type="button" onClick={() => setKnowledgeAnswer(index)} className={`w-full rounded-xl border p-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${selected ? option.correct ? 'border-[#177D66] bg-white text-slate-950 dark:bg-slate-900 dark:text-white' : 'border-rose-300 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100' : 'border-white/80 bg-white/70 text-slate-700 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'}`}><span className="flex items-start gap-3"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? option.correct ? 'border-[#177D66] bg-[#177D66] text-white' : 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>{selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}</span><span><span>{option.label}</span>{selected ? <span className="mt-2 block text-xs leading-5 opacity-80">{option.feedback}</span> : null}</span></span></button>; })}</div></div>
      </section>
    </div>
  );
}

function InteractiveSection({ number, eyebrow, title, description, children }: { number: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:p-6"><div className="mb-5 flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-sm font-medium text-[#177D66] dark:text-[#8FE0CA]">{number}</span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{eyebrow}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></div></div>{children}</section>;
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-white text-blue-700 transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">{children}</button>;
}

function ReasoningCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-medium text-[#8FE0CA]">{label}</p><p className="mt-2 text-sm leading-6 text-slate-200">{value}</p></div>;
}

function InfoCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'aqua' }) {
  const toneClasses = tone === 'blue' ? 'bg-blue-50 text-blue-950 dark:bg-blue-950/35 dark:text-blue-100' : 'bg-[#59C3A5]/10 text-slate-800 dark:text-slate-100';
  return <div className={`rounded-xl p-4 ${toneClasses}`}><p className="text-xs font-medium opacity-70">{label}</p><p className="mt-2 text-sm leading-6">{value}</p></div>;
}
