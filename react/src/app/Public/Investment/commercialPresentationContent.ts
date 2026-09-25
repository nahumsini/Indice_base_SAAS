import type { InvestmentLocale } from './investmentContent';

export type CommercialPresentationTab = 'proposal' | 'operation' | 'capabilities' | 'agents' | 'pricing' | 'implementation';

type Localized<T> = Record<InvestmentLocale, T>;
type CommercialCard = { title: string; description: string };
type CommercialLane = CommercialCard & { label: string; tools: readonly string[] };
type CommercialPillar = CommercialCard & { emoji: string; tools: readonly string[] };
type CommercialStep = CommercialCard & { label: string };
type CommercialPlan = CommercialCard & { id: 'controla' | 'escala' | 'corporate'; includes: readonly string[] };
type CommercialSectionBase = { eyebrow: string; title: string; lead: string; next: string };

export type CommercialPresentationCopy = {
  subtitle: string;
  sectionSummary: string;
  centralLabel: string;
  footer: string;
  proposal: CommercialSectionBase & {
    statement: string;
    frictionsTitle: string;
    frictions: readonly CommercialCard[];
    resultsTitle: string;
    results: readonly CommercialCard[];
  };
  operation: CommercialSectionBase & {
    lanesTitle: string;
    lanes: readonly CommercialLane[];
    foundationTitle: string;
    foundationDescription: string;
  };
  capabilities: CommercialSectionBase & {
    pillarsTitle: string;
    pillars: readonly CommercialPillar[];
    packagesTitle: string;
    packages: readonly CommercialCard[];
    scopeNote: string;
  };
  agents: CommercialSectionBase & {
    coordinatorLabel: string;
    coordinatorTitle: string;
    coordinatorDescription: string;
    agentsTitle: string;
    agents: readonly CommercialCard[];
    questionsTitle: string;
    questions: readonly string[];
    permissionTitle: string;
    permissionDescription: string;
  };
  pricing: CommercialSectionBase & {
    plansTitle: string;
    plans: readonly CommercialPlan[];
    monthlyLabel: string;
    pendingPriceLabel: string;
    annualLabel: string;
    beforeTaxLabel: string;
    commonTitle: string;
    commonItems: readonly string[];
    offerLabel: string;
    offerTitle: string;
    offerDescription: string;
    offerPriceLabel: string;
    offerIncludesTitle: string;
    offerIncludes: readonly string[];
    offerCondition: string;
  };
  implementation: CommercialSectionBase & {
    stepsTitle: string;
    steps: readonly CommercialStep[];
    trialLabel: string;
    trialDescription: string;
    supportTitle: string;
    supportDescription: string;
    cta: string;
  };
};

const byLocale = <T,>(es: T, en: T, fr: T, pt: T, ko: T, zh: T): Localized<T> => ({
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
});

export const commercialPresentationTabs: readonly (readonly [CommercialPresentationTab, Localized<string>, string])[] = [
  ['proposal', byLocale('La propuesta', 'The proposal', 'La proposition', 'A proposta', '제안', '我们的方案'), '✨'],
  ['operation', byLocale('Operación conectada', 'Connected operation', 'Opération connectée', 'Operação conectada', '연결된 운영', '互联运营'), '🔗'],
  ['capabilities', byLocale('Capacidades', 'Capabilities', 'Capacités', 'Capacidades', '핵심 역량', '平台能力'), '🧩'],
  ['agents', byLocale('Lupita y sus agentes', 'Lupita and her agents', 'Lupita et ses agents', 'Lupita e seus agentes', '루피타와 에이전트', 'Lupita 与智能体'), '🤖'],
  ['pricing', byLocale('Precios', 'Pricing', 'Tarifs', 'Preços', '요금', '价格'), '💳'],
  ['implementation', byLocale('Implementación', 'Implementation', 'Mise en œuvre', 'Implementação', '도입', '实施'), '🚀'],
];

// Public Mexico rates from commercial-master-2026-09-21.
// Amounts are presentation data only; billing remains authoritative in its own domain.
export const commercialPlanPrices: Record<CommercialPlan['id'], {
  monthlyMxn: number;
  annualMxn: number;
  setupMxn: number;
  setupPromotionMxn: number;
}> & {
  includedPeople: number;
  additionalBlockSize: number;
  additionalBlockMonthlyMxn: number;
  additionalBlockAnnualMxn: number;
  annualDiscountPercent: number;
  setupPromotionThrough: string;
} = {
  controla: { monthlyMxn: 2999, annualMxn: 28790.40, setupMxn: 9999, setupPromotionMxn: 4999 },
  escala: { monthlyMxn: 5499, annualMxn: 52790.40, setupMxn: 14999, setupPromotionMxn: 7499.50 },
  corporate: { monthlyMxn: 9499, annualMxn: 91190.40, setupMxn: 24999, setupPromotionMxn: 12499.50 },
  includedPeople: 10,
  additionalBlockSize: 10,
  additionalBlockMonthlyMxn: 899,
  additionalBlockAnnualMxn: 8630.40,
  annualDiscountPercent: 20,
  setupPromotionThrough: '2026-10',
} as const;

export const resolveCommercialPresentationTab = (value: string | null): CommercialPresentationTab => (
  commercialPresentationTabs.find(([tab]) => tab === value)?.[0] ?? 'proposal'
);

const es: CommercialPresentationCopy = {
  subtitle: 'ERP personalizado, agentes digitales y acompañamiento humano',
  sectionSummary: 'Resumen comercial',
  centralLabel: 'Idea central',
  footer: 'Presentación comercial · Las capacidades se habilitan de acuerdo con el alcance, los permisos y la configuración contratada.',
  proposal: {
    eyebrow: '01 · La nueva propuesta',
    title: 'Tu empresa, respaldada por agentes de IA para ayudarte a dirigir.',
    lead: 'Profesionaliza tu empresa sin multiplicar tu estructura gerencial: un ERP adaptado a tus procesos, agentes de IA para analizar y dar seguimiento, y consultoría para acompañar a tu equipo.',
    statement: 'Tu equipo opera. Los agentes analizan y coordinan. Tú decides.',
    frictionsTitle: 'Lo que hoy frena el crecimiento',
    frictions: [
      { title: 'Información dispersa', description: 'Personas, ventas, inventarios y gastos viven en herramientas separadas.' },
      { title: 'Dirección saturada', description: 'Las decisiones y el seguimiento dependen demasiado del dueño.' },
      { title: 'Reacción tardía', description: 'Los problemas aparecen cuando ya consumieron tiempo, dinero o clientes.' },
    ],
    resultsTitle: 'Lo que cambia con Índice',
    results: [
      { title: 'Una operación conectada', description: 'Cada área trabaja sobre una misma fuente de información.' },
      { title: 'Prioridades interpretadas', description: 'Los agentes convierten datos en alertas y preguntas útiles.' },
      { title: 'Decisiones bajo control', description: 'La tecnología propone y coordina; la persona responsable decide.' },
    ],
    next: 'La propuesta no es sumar otra aplicación: es construir una forma más clara de operar y dirigir.',
  },
  operation: {
    eyebrow: '02 · Cómo se vive',
    title: 'Tres formas de trabajar. Una sola empresa conectada.',
    lead: 'Cada persona entra por la experiencia que necesita, mientras Índice conserva permisos, contexto y trazabilidad en una misma base operativa.',
    lanesTitle: 'Una experiencia para cada responsabilidad',
    lanes: [
      { label: 'Equipo operativo', title: 'Multikiosco', description: 'La operación sucede desde el teléfono, con flujos rápidos y guiados.', tools: ['Asistencia', 'Tareas', 'Gastos', 'Ventas'] },
      { label: 'Administración', title: 'Índice web y móvil', description: 'Los responsables organizan, validan y dan seguimiento a cada área.', tools: ['Procesos', 'Inventarios', 'Finanzas', 'Reportes'] },
      { label: 'Dirección', title: 'ChatGPT o Claude', description: 'Consulta el negocio en lenguaje natural. La conexión se valida durante la implementación según compatibilidad, cuenta y permisos.', tools: ['Preguntas', 'Alertas', 'Análisis', 'Seguimiento'] },
    ],
    foundationTitle: 'El ERP es la fuente de verdad',
    foundationDescription: 'Personas, catálogos, movimientos y resultados se conectan con permisos por rol. Así, cada interfaz muestra solo lo necesario sin perder el contexto de toda la empresa.',
    next: 'Una sola operación puede sentirse simple para el equipo y completa para la dirección.',
  },
  capabilities: {
    eyebrow: '03 · Qué resuelve',
    title: 'Una base operativa para toda la empresa.',
    lead: 'Más de 120 herramientas adaptativas organizan el trabajo diario sin obligar a la empresa a cambiar de plataforma conforme crece.',
    pillarsTitle: 'Cuatro capacidades conectadas',
    pillars: [
      { emoji: '👥', title: 'Personas', description: 'Ordena al equipo y sus responsabilidades.', tools: ['Recursos Humanos', 'Asistencia', 'Nómina'] },
      { emoji: '✅', title: 'Procesos', description: 'Convierte acuerdos en ejecución verificable.', tools: ['Tareas', 'Procesos', 'Evidencias'] },
      { emoji: '📦', title: 'Productos y clientes', description: 'Conecta la operación comercial de principio a fin.', tools: ['CRM', 'Ventas', 'Inventarios', 'POS'] },
      { emoji: '📊', title: 'Finanzas', description: 'Hace visible el uso del dinero y los resultados.', tools: ['Gastos', 'Presupuestos', 'Caja', 'KPIs'] },
    ],
    packagesTitle: 'Una capacidad acorde con cada etapa',
    packages: [
      { title: 'Controla', description: 'Panel Inicial, Recursos Humanos y Tareas y Procesos.' },
      { title: 'Escala', description: 'Todo Controla + Gastos, Caja Chica e Inventarios; elige Ventas o POS.' },
      { title: 'Corporativo', description: 'Todo Escala + Ventas y POS juntos, Cartera y el módulo ejecutivo de KPIs.' },
    ],
    scopeNote: 'Cada módulo conserva sus indicadores internos. El Modo Aprendiz explica las herramientas para convertirlas en hábitos de trabajo; la configuración depende del alcance contratado.',
    next: 'Índice crece por capacidad: se comienza con lo necesario y se amplía cuando la empresa está lista.',
  },
  agents: {
    eyebrow: '04 · Inteligencia aplicada',
    title: 'Lupita coordina especialistas para cada área.',
    lead: 'La conversación con IA deja de ser genérica: los agentes trabajan con el contexto y los permisos de la empresa para ayudar a interpretar la operación.',
    coordinatorLabel: 'Agente coordinadora',
    coordinatorTitle: 'Lupita entiende la pregunta y reúne al especialista correcto.',
    coordinatorDescription: 'Consulta tu empresa desde ChatGPT o Claude. Durante la implementación validamos la conexión según compatibilidad, tu cuenta y los permisos que autorices.',
    agentsTitle: 'Un especialista según la necesidad',
    agents: [
      { title: 'Agente Controla', description: 'Personas, asistencia, tareas y cumplimiento.' },
      { title: 'Agente Escala', description: 'Clientes, ventas, inventarios y seguimiento comercial.' },
      { title: 'Agente Finanzas', description: 'Gastos, presupuestos, caja y señales financieras.' },
      { title: 'Agente Corporativo', description: 'Cartera, indicadores y perspectiva estratégica para comparar resultados y alternativas.' },
    ],
    questionsTitle: 'Preguntas que se vuelven accionables',
    questions: ['¿Quién faltó hoy?', '¿Qué tareas están vencidas?', '¿Qué productos requieren atención?', '¿Cómo van ventas, gastos y cobranza?'],
    permissionTitle: 'La decisión sigue siendo humana',
    permissionDescription: 'Cada agente consulta únicamente información autorizada. Las decisiones y acciones sensibles permanecen bajo aprobación de la persona responsable.',
    next: 'La IA no reemplaza el criterio: reduce el tiempo necesario para llegar a una decisión informada.',
  },
  pricing: {
    eyebrow: '05 · Inversión',
    title: 'Planes claros para comenzar y crecer.',
    lead: 'Tres paquetes con ERP, agentes y acompañamiento. Incluyen 10 personas y la capacidad crece en bloques de diez.',
    plansTitle: 'Paquetes mensuales para México',
    plans: [
      { id: 'controla', title: 'Controla', description: 'Ordena al equipo y convierte acuerdos en seguimiento.', includes: ['Panel Inicial y estructura de empresa', 'Recursos Humanos', 'Tareas y Procesos'] },
      { id: 'escala', title: 'Escala', description: 'Conecta personas, dinero y operación comercial.', includes: ['Todo Controla', 'Gastos y Caja Chica', 'Ventas o POS con Inventarios'] },
      { id: 'corporate', title: 'Corporativo', description: 'Integra la operación completa y amplía la lectura directiva.', includes: ['Todo Escala, con Ventas y POS juntos', 'Cartera', 'Módulo ejecutivo de KPIs'] },
    ],
    monthlyLabel: 'al mes',
    pendingPriceLabel: 'Por confirmar',
    annualLabel: 'Plan anual',
    beforeTaxLabel: 'Precios en MXN antes de IVA',
    commonTitle: 'Todos los paquetes incluyen',
    commonItems: ['10 personas', 'Lupita y agentes según módulos y permisos', '1 consultoría mensual de 60 minutos', 'Modo Aprendiz'],
    offerLabel: 'Alta promocional · Hasta octubre de 2026',
    offerTitle: 'Implementación ajustada al paquete de tu empresa.',
    offerDescription: 'Un pago único para comenzar con diagnóstico, configuración, capacitación y acompañamiento de arranque.',
    offerPriceLabel: 'Alta promocional por paquete',
    offerIncludesTitle: 'Incluye',
    offerIncludes: ['Diagnóstico y definición de alcance', 'Configuración del ERP y agentes autorizados', 'Alta y capacitación para hasta 10 personas', 'Activación y acompañamiento de arranque'],
    offerCondition: 'El descuento anual del 20% aplica a la suscripción y a los bloques adicionales, no al alta. Precios antes de IVA y sujetos a confirmación de alcance.',
    next: 'Una inversión definida para ordenar la operación hoy y ampliar capacidades conforme crece la empresa.',
  },
  implementation: {
    eyebrow: '06 · El siguiente paso',
    title: 'La tecnología comienza entendiendo tu empresa.',
    lead: 'La implementación parte del problema real, configura una primera capacidad útil y acompaña al equipo para convertirla en hábito.',
    stepsTitle: 'Un recorrido claro y progresivo',
    steps: [
      { label: '01', title: 'Entender', description: 'Diagnóstico inicial sin costo para conocer operación, prioridades y oportunidad.' },
      { label: '02', title: 'Definir', description: 'Acordamos paquete, capacidad y alcance. Al contratar se pagan el alta y la primera mensualidad.' },
      { label: '03', title: 'Configurar', description: 'Adaptación, capacitación y activación; los desarrollos especiales se cotizan por separado.' },
      { label: '04', title: 'Continuar', description: 'Seguimiento de adopción y una sesión mensual de consultoría de 60 minutos.' },
    ],
    trialLabel: 'Hasta 15 días de prueba',
    trialDescription: 'Conoce Índice antes de contratar. La implementación es necesaria en todos los paquetes y se acuerda según tus procesos.',
    supportTitle: 'Acompañamiento humano',
    supportDescription: 'Un consultor ayuda a interpretar necesidades, ordenar prioridades y sostener la adopción.',
    cta: 'Solicitar diagnóstico sin costo',
    next: 'Tu siguiente capítulo comienza con una conversación.',
  },
};

const en: CommercialPresentationCopy = {
  ...es,
  subtitle: 'Customized ERP, digital agents, and human guidance', sectionSummary: 'Commercial overview', centralLabel: 'Core idea',
  footer: 'Commercial presentation · Capabilities are enabled according to the contracted scope, permissions, and configuration.',
  proposal: { eyebrow: '01 · The new proposal', title: 'Your company, backed by AI agents that help you lead.', lead: 'Professionalize your business without multiplying your management structure: an ERP adapted to your workflows, AI agents for analysis and follow-up, and consulting to guide your team.', statement: 'Your team operates. Agents analyze and coordinate. You decide.', frictionsTitle: 'What slows growth today', frictions: [{ title: 'Scattered information', description: 'People, sales, inventory, and expenses live in separate tools.' }, { title: 'Overloaded leadership', description: 'Too many decisions and follow-ups depend on the owner.' }, { title: 'Late reactions', description: 'Problems become visible after they have consumed time, money, or customers.' }], resultsTitle: 'What changes with Índice', results: [{ title: 'One connected operation', description: 'Every area works from the same source of information.' }, { title: 'Interpreted priorities', description: 'Agents turn data into useful alerts and questions.' }, { title: 'Decisions under control', description: 'Technology proposes and coordinates; the accountable person decides.' }], next: 'The proposal is not another app: it is a clearer way to operate and lead.' },
  operation: { eyebrow: '02 · How it works', title: 'Three ways to work. One connected company.', lead: 'Each person enters through the experience they need while Índice preserves permissions, context, and traceability in one operating base.', lanesTitle: 'An experience for every responsibility', lanes: [{ label: 'Operating team', title: 'Multi-kiosk', description: 'Daily work happens from a phone through fast, guided flows.', tools: ['Attendance', 'Tasks', 'Expenses', 'Sales'] }, { label: 'Administration', title: 'Índice web and mobile', description: 'Managers organize, validate, and follow up across every area.', tools: ['Processes', 'Inventory', 'Finance', 'Reports'] }, { label: 'Leadership', title: 'ChatGPT or Claude', description: 'Ask about the business in natural language. Connection is validated during implementation based on compatibility, account, and permissions.', tools: ['Questions', 'Alerts', 'Analysis', 'Follow-up'] }], foundationTitle: 'The ERP is the source of truth', foundationDescription: 'People, catalogs, transactions, and results are connected with role-based permissions. Each interface shows what is needed without losing company-wide context.', next: 'The same operation can feel simple for the team and complete for leadership.' },
  capabilities: { eyebrow: '03 · What it solves', title: 'One operating base for the entire company.', lead: 'More than 120 adaptive tools organize daily work without forcing the company to switch platforms as it grows.', pillarsTitle: 'Four connected capabilities', pillars: [{ emoji: '👥', title: 'People', description: 'Organize the team and its responsibilities.', tools: ['Human Resources', 'Attendance', 'Payroll'] }, { emoji: '✅', title: 'Processes', description: 'Turn agreements into verifiable execution.', tools: ['Tasks', 'Processes', 'Evidence'] }, { emoji: '📦', title: 'Products and customers', description: 'Connect commercial operations end to end.', tools: ['CRM', 'Sales', 'Inventory', 'POS'] }, { emoji: '📊', title: 'Finance', description: 'Make the use of money and results visible.', tools: ['Expenses', 'Budgets', 'Cash', 'KPIs'] }], packagesTitle: 'The right capacity for each stage', packages: [{ title: 'Control', description: 'Home Panel, Human Resources, and Tasks and Processes.' }, { title: 'Scale', description: 'Everything in Control + Expenses, Petty Cash, and Inventory; choose Sales or POS.' }, { title: 'Corporate', description: 'Everything in Scale + Sales and POS together, Receivables, and the executive KPI module.' }], scopeNote: 'Each module keeps its internal indicators. Learning Mode helps turn tools into working habits; configuration depends on the contracted scope.', next: 'Índice grows by capability: start with what matters and expand when the company is ready.' },
  agents: { eyebrow: '04 · Applied intelligence', title: 'Lupita coordinates specialists for every area.', lead: 'AI conversations stop being generic: agents work with company context and permissions to help interpret operations.', coordinatorLabel: 'Coordinating agent', coordinatorTitle: 'Lupita understands the question and brings in the right specialist.', coordinatorDescription: 'Ask about your company from ChatGPT or Claude. During implementation we validate the connection based on compatibility, your account, and authorized permissions.', agentsTitle: 'A specialist for each need', agents: [{ title: 'Control Agent', description: 'People, attendance, tasks, and compliance.' }, { title: 'Scale Agent', description: 'Customers, sales, inventory, and commercial follow-up.' }, { title: 'Finance Agent', description: 'Expenses, budgets, cash, and financial signals.' }, { title: 'Corporate Agent', description: 'Receivables, indicators, and strategic perspective to compare results and alternatives.' }], questionsTitle: 'Questions that become actionable', questions: ['Who was absent today?', 'Which tasks are overdue?', 'Which products need attention?', 'How are sales, expenses, and collections doing?'], permissionTitle: 'The decision remains human', permissionDescription: 'Each agent only accesses authorized information. Sensitive decisions and actions remain subject to approval by the accountable person.', next: 'AI does not replace judgment: it shortens the path to an informed decision.' },
  pricing: { eyebrow: '05 · Investment', title: 'Clear plans to start and grow.', lead: 'Three packages with ERP, agents, and guidance. Ten people are included, and capacity expands in blocks of ten.', plansTitle: 'Monthly packages for Mexico', plans: [{ id: 'controla', title: 'Control', description: 'Organize the team and turn commitments into follow-up.', includes: ['Home Panel and company structure', 'Human Resources', 'Tasks and Processes'] }, { id: 'escala', title: 'Scale', description: 'Connect people, money, and commercial operations.', includes: ['Everything in Control', 'Expenses and Petty Cash', 'Sales or POS with Inventory'] }, { id: 'corporate', title: 'Corporate', description: 'Integrate the full operation and broaden executive insight.', includes: ['Everything in Scale, with Sales and POS together', 'Receivables', 'Executive KPI module'] }], monthlyLabel: 'per month', pendingPriceLabel: 'To be confirmed', annualLabel: 'Annual plan', beforeTaxLabel: 'Prices in MXN before taxes', commonTitle: 'Every package includes', commonItems: ['10 people', 'Lupita and agents based on modules and permissions', 'One 60-minute consulting session each month', 'Learning Mode'], offerLabel: 'Promotional setup · Through October 2026', offerTitle: 'Implementation sized to your company package.', offerDescription: 'A one-time payment to begin with assessment, configuration, training, and launch guidance.', offerPriceLabel: 'Promotional setup by package', offerIncludesTitle: 'Includes', offerIncludes: ['Assessment and scope definition', 'ERP and authorized agent configuration', 'Setup and training for up to 10 people', 'Activation and launch guidance'], offerCondition: 'The 20% annual discount applies to subscriptions and additional blocks, not setup. Prices are before VAT and subject to scope confirmation.', next: 'A defined investment to organize operations now and expand capabilities as the company grows.' },
  implementation: { eyebrow: '06 · The next step', title: 'Technology starts by understanding your company.', lead: 'Implementation begins with the real problem, configures a useful first capability, and guides the team until it becomes a habit.', stepsTitle: 'A clear, progressive journey', steps: [{ label: '01', title: 'Understand', description: 'A free initial assessment of operations, priorities, and opportunity.' }, { label: '02', title: 'Define', description: 'Agree on package, capacity, and scope. Setup and the first month are paid when subscribing.' }, { label: '03', title: 'Configure', description: 'Adapt, train, and activate; special development is quoted separately.' }, { label: '04', title: 'Continue', description: 'Adoption follow-up and one 60-minute consulting session each month.' }], trialLabel: 'Up to a 15-day trial', trialDescription: 'Try Índice before subscribing. Implementation is required for every package and scoped to your workflows.', supportTitle: 'Human guidance', supportDescription: 'A consultant helps interpret needs, order priorities, and sustain adoption.', cta: 'Request a free assessment', next: 'Your next chapter begins with a conversation.' },
};

const fr: CommercialPresentationCopy = {
  ...en,
  subtitle: 'ERP personnalisé, agents numériques et accompagnement humain', sectionSummary: 'Résumé commercial', centralLabel: 'Idée centrale', footer: 'Présentation commerciale · Les capacités sont activées selon la portée, les permissions et la configuration convenues.',
  proposal: { ...en.proposal, eyebrow: '01 · La nouvelle proposition', title: 'Votre entreprise, soutenue par des agents d’IA pour mieux la diriger.', lead: 'Professionnalisez votre entreprise sans multiplier la structure de direction : un ERP adapté à vos processus, des agents d’IA pour analyser et suivre, et du conseil pour accompagner l’équipe.', statement: 'Votre équipe exécute. Les agents analysent et coordonnent. Vous décidez.', frictionsTitle: 'Ce qui freine la croissance', frictions: [{ title: 'Information dispersée', description: 'Le personnel, les ventes, les stocks et les dépenses se trouvent dans des outils séparés.' }, { title: 'Direction surchargée', description: 'Trop de décisions et de suivis dépendent de la personne propriétaire.' }, { title: 'Réaction tardive', description: 'Les problèmes deviennent visibles après avoir consommé temps, argent ou clientèle.' }], resultsTitle: 'Ce qui change avec Índice', results: [{ title: 'Une opération connectée', description: 'Chaque secteur travaille à partir de la même source d’information.' }, { title: 'Des priorités interprétées', description: 'Les agents transforment les données en alertes et questions utiles.' }, { title: 'Des décisions maîtrisées', description: 'La technologie propose et coordonne; la personne responsable décide.' }], next: 'La proposition n’est pas une application de plus : c’est une façon plus claire d’opérer et de diriger.' },
  operation: { ...en.operation, eyebrow: '02 · L’expérience', title: 'Trois façons de travailler. Une seule entreprise connectée.', lead: 'Chaque personne accède à l’expérience dont elle a besoin, tandis qu’Índice conserve permissions, contexte et traçabilité dans une même base opérationnelle.', lanesTitle: 'Une expérience pour chaque responsabilité', lanes: [{ label: 'Équipe opérationnelle', title: 'Multikiosque', description: 'Le travail quotidien s’effectue sur téléphone avec des flux rapides et guidés.', tools: ['Présence', 'Tâches', 'Dépenses', 'Ventes'] }, { label: 'Administration', title: 'Índice web et mobile', description: 'Les responsables organisent, valident et suivent chaque secteur.', tools: ['Processus', 'Stocks', 'Finances', 'Rapports'] }, { label: 'Direction', title: 'ChatGPT ou Claude', description: 'Interrogez l’entreprise en langage naturel. La connexion est validée à la mise en œuvre selon la compatibilité, le compte et les permissions.', tools: ['Questions', 'Alertes', 'Analyse', 'Suivi'] }], foundationTitle: 'L’ERP est la source de vérité', foundationDescription: 'Le personnel, les catalogues, les mouvements et les résultats sont reliés par des permissions selon le rôle. Chaque interface montre le nécessaire sans perdre le contexte global.', next: 'Une même opération peut être simple pour l’équipe et complète pour la direction.' },
  capabilities: { ...en.capabilities, eyebrow: '03 · Ce que nous résolvons', title: 'Une base opérationnelle pour toute l’entreprise.', lead: 'Plus de 120 outils adaptatifs organisent le travail quotidien sans imposer un changement de plateforme à mesure que l’entreprise grandit.', pillarsTitle: 'Quatre capacités connectées', pillars: [{ emoji: '👥', title: 'Personnel', description: 'Organiser l’équipe et ses responsabilités.', tools: ['Ressources humaines', 'Présence', 'Paie'] }, { emoji: '✅', title: 'Processus', description: 'Transformer les accords en exécution vérifiable.', tools: ['Tâches', 'Processus', 'Preuves'] }, { emoji: '📦', title: 'Produits et clientèle', description: 'Relier l’opération commerciale de bout en bout.', tools: ['CRM', 'Ventes', 'Stocks', 'PDV'] }, { emoji: '📊', title: 'Finances', description: 'Rendre visibles l’utilisation de l’argent et les résultats.', tools: ['Dépenses', 'Budgets', 'Caisse', 'ICP'] }], packagesTitle: 'La bonne capacité à chaque étape', packages: [{ title: 'Contrôler', description: 'Panel initial, Ressources humaines et Tâches et processus.' }, { title: 'Évoluer', description: 'Tout Contrôle + Dépenses, Petite caisse et Stocks; choisissez Ventes ou PDV.' }, { title: 'Corporatif', description: 'Tout Croissance + Ventes et PDV ensemble, Comptes clients et module exécutif d’ICP.' }], scopeNote: 'Chaque module conserve ses indicateurs internes. Le Mode Apprenti transforme les outils en habitudes; la configuration dépend de la portée convenue.', next: 'Índice évolue par capacité : on commence par l’essentiel et on élargit lorsque l’entreprise est prête.' },
  agents: { ...en.agents, eyebrow: '04 · Intelligence appliquée', title: 'Lupita coordonne des spécialistes pour chaque domaine.', lead: 'La conversation avec l’IA cesse d’être générique : les agents utilisent le contexte et les permissions de l’entreprise pour interpréter les opérations.', coordinatorLabel: 'Agente coordinatrice', coordinatorTitle: 'Lupita comprend la question et mobilise le bon spécialiste.', coordinatorDescription: 'Interrogez votre entreprise depuis ChatGPT ou Claude. Nous validons la connexion lors de la mise en œuvre selon la compatibilité, votre compte et les permissions autorisées.', agentsTitle: 'Un spécialiste selon le besoin', agents: [{ title: 'Agent Contrôle', description: 'Personnel, présence, tâches et conformité.' }, { title: 'Agent Croissance', description: 'Clientèle, ventes, stocks et suivi commercial.' }, { title: 'Agent Finances', description: 'Dépenses, budgets, caisse et signaux financiers.' }, { title: 'Agent Corporatif', description: 'Comptes clients, indicateurs et perspective stratégique pour comparer résultats et options.' }], questionsTitle: 'Des questions qui deviennent actionnables', questions: ['Qui était absent aujourd’hui?', 'Quelles tâches sont en retard?', 'Quels produits demandent une attention?', 'Comment évoluent ventes, dépenses et recouvrement?'], permissionTitle: 'La décision demeure humaine', permissionDescription: 'Chaque agent consulte uniquement les informations autorisées. Les décisions et actions sensibles restent soumises à l’approbation de la personne responsable.', next: 'L’IA ne remplace pas le jugement : elle raccourcit le chemin vers une décision éclairée.' },
  pricing: { ...en.pricing, eyebrow: '05 · Investissement', title: 'Des forfaits clairs pour commencer et évoluer.', lead: 'Trois forfaits avec ERP, agents et accompagnement. Dix personnes sont incluses et la capacité augmente par blocs de dix.', plansTitle: 'Forfaits mensuels pour le Mexique', plans: [{ id: 'controla', title: 'Contrôle', description: 'Organiser l’équipe et transformer les engagements en suivi.', includes: ['Panel initial et structure d’entreprise', 'Ressources humaines', 'Tâches et processus'] }, { id: 'escala', title: 'Croissance', description: 'Relier le personnel, l’argent et l’opération commerciale.', includes: ['Tout Contrôle', 'Dépenses et petite caisse', 'Ventes ou PDV avec stocks'] }, { id: 'corporate', title: 'Corporatif', description: 'Intégrer toute l’opération et élargir la lecture de direction.', includes: ['Tout Croissance, avec Ventes et PDV ensemble', 'Comptes clients', 'Module exécutif d’ICP'] }], monthlyLabel: 'par mois', pendingPriceLabel: 'À confirmer', annualLabel: 'Forfait annuel', beforeTaxLabel: 'Prix en MXN avant taxes', commonTitle: 'Tous les forfaits comprennent', commonItems: ['10 personnes', 'Lupita et agents selon les modules et permissions', 'Une consultation mensuelle de 60 minutes', 'Mode Apprenti'], offerLabel: 'Mise en service promotionnelle · Jusqu’en octobre 2026', offerTitle: 'Mise en œuvre adaptée au forfait de votre entreprise.', offerDescription: 'Un paiement unique pour démarrer avec diagnostic, configuration, formation et accompagnement au lancement.', offerPriceLabel: 'Mise en service promotionnelle par forfait', offerIncludesTitle: 'Comprend', offerIncludes: ['Diagnostic et définition de la portée', 'Configuration de l’ERP et des agents autorisés', 'Activation et formation de 10 personnes au maximum', 'Accompagnement au démarrage'], offerCondition: 'La remise annuelle de 20 % s’applique à l’abonnement et aux blocs supplémentaires, pas à la mise en service. Prix avant TVA et sous réserve de confirmation de la portée.', next: 'Un investissement défini pour organiser les opérations et ajouter des capacités au rythme de la croissance.' },
  implementation: { ...en.implementation, eyebrow: '06 · La prochaine étape', title: 'La technologie commence par comprendre votre entreprise.', lead: 'La mise en œuvre part du problème réel, configure une première capacité utile et accompagne l’équipe jusqu’à son adoption.', stepsTitle: 'Un parcours clair et progressif', steps: [{ label: '01', title: 'Comprendre', description: 'Un diagnostic initial sans frais des opérations, priorités et possibilités.' }, { label: '02', title: 'Définir', description: 'Convenir du forfait, de la capacité et de la portée. La mise en œuvre et le premier mois sont payés à la souscription.' }, { label: '03', title: 'Configurer', description: 'Adapter, former et activer; tout développement spécial est chiffré séparément.' }, { label: '04', title: 'Poursuivre', description: 'Suivi de l’adoption et une séance-conseil mensuelle de 60 minutes.' }], trialLabel: 'Jusqu’à 15 jours d’essai', trialDescription: 'Découvrez Índice avant de souscrire. La mise en œuvre est requise pour chaque forfait et adaptée à vos processus.', supportTitle: 'Accompagnement humain', supportDescription: 'Un consultant aide à interpréter les besoins, ordonner les priorités et soutenir l’adoption.', cta: 'Demander un diagnostic sans frais', next: 'Votre prochain chapitre commence par une conversation.' },
};

const pt: CommercialPresentationCopy = {
  ...en,
  subtitle: 'ERP personalizado, agentes digitais e acompanhamento humano', sectionSummary: 'Resumo comercial', centralLabel: 'Ideia central', footer: 'Apresentação comercial · As capacidades são habilitadas conforme o escopo, as permissões e a configuração contratada.',
  proposal: { ...es.proposal, eyebrow: '01 · A nova proposta', title: 'Sua empresa, apoiada por agentes de IA para ajudar você a liderar.', lead: 'Profissionalize sua empresa sem multiplicar a estrutura gerencial: ERP adaptado aos seus processos, agentes de IA para analisar e acompanhar, e consultoria para orientar a equipe.', statement: 'Sua equipe opera. Os agentes analisam e coordenam. Você decide.', frictionsTitle: 'O que hoje limita o crescimento', frictions: [{ title: 'Informações dispersas', description: 'Pessoas, vendas, estoques e despesas ficam em ferramentas separadas.' }, { title: 'Liderança sobrecarregada', description: 'Decisões e acompanhamentos dependem demais da pessoa proprietária.' }, { title: 'Reação tardia', description: 'Os problemas aparecem depois de consumir tempo, dinheiro ou clientes.' }], resultsTitle: 'O que muda com Índice', results: [{ title: 'Uma operação conectada', description: 'Cada área trabalha a partir da mesma fonte de informações.' }, { title: 'Prioridades interpretadas', description: 'Os agentes transformam dados em alertas e perguntas úteis.' }, { title: 'Decisões sob controle', description: 'A tecnologia propõe e coordena; a pessoa responsável decide.' }], next: 'A proposta não é adicionar outro aplicativo: é construir uma forma mais clara de operar e liderar.' },
  operation: { ...en.operation, eyebrow: '02 · Como funciona', title: 'Três formas de trabalhar. Uma única empresa conectada.', lead: 'Cada pessoa acessa a experiência de que precisa, enquanto Índice preserva permissões, contexto e rastreabilidade em uma mesma base operacional.', lanesTitle: 'Uma experiência para cada responsabilidade', lanes: [{ label: 'Equipe operacional', title: 'Multiquiosque', description: 'A operação acontece no telefone com fluxos rápidos e guiados.', tools: ['Presença', 'Tarefas', 'Despesas', 'Vendas'] }, { label: 'Administração', title: 'Índice web e móvel', description: 'Responsáveis organizam, validam e acompanham cada área.', tools: ['Processos', 'Estoques', 'Finanças', 'Relatórios'] }, { label: 'Liderança', title: 'ChatGPT ou Claude', description: 'Consulte o negócio em linguagem natural. A conexão é validada na implementação conforme compatibilidade, conta e permissões.', tools: ['Perguntas', 'Alertas', 'Análises', 'Acompanhamento'] }], foundationTitle: 'O ERP é a fonte da verdade', foundationDescription: 'Pessoas, catálogos, movimentações e resultados são conectados com permissões por função. Cada interface mostra somente o necessário sem perder o contexto da empresa.', next: 'A mesma operação pode ser simples para a equipe e completa para a liderança.' },
  capabilities: { ...en.capabilities, eyebrow: '03 · O que resolve', title: 'Uma base operacional para toda a empresa.', lead: 'Mais de 120 ferramentas adaptativas organizam o trabalho diário sem obrigar a empresa a mudar de plataforma conforme cresce.', pillarsTitle: 'Quatro capacidades conectadas', pillars: [{ emoji: '👥', title: 'Pessoas', description: 'Organiza a equipe e suas responsabilidades.', tools: ['Recursos Humanos', 'Presença', 'Folha'] }, { emoji: '✅', title: 'Processos', description: 'Transforma acordos em execução verificável.', tools: ['Tarefas', 'Processos', 'Evidências'] }, { emoji: '📦', title: 'Produtos e clientes', description: 'Conecta a operação comercial de ponta a ponta.', tools: ['CRM', 'Vendas', 'Estoques', 'PDV'] }, { emoji: '📊', title: 'Finanças', description: 'Torna visíveis o uso do dinheiro e os resultados.', tools: ['Despesas', 'Orçamentos', 'Caixa', 'KPIs'] }], packagesTitle: 'A capacidade certa para cada etapa', packages: [{ title: 'Controle', description: 'Painel Inicial, Recursos Humanos e Tarefas e Processos.' }, { title: 'Escala', description: 'Tudo do Controle + Despesas, Caixa Pequeno e Estoque; escolha Vendas ou PDV.' }, { title: 'Corporativo', description: 'Tudo do Escala + Vendas e PDV juntos, Contas a Receber e módulo executivo de KPIs.' }], scopeNote: 'Cada módulo mantém seus indicadores internos. O Modo Aprendiz transforma ferramentas em hábitos; a configuração depende do escopo contratado.', next: 'Índice cresce por capacidade: começa com o necessário e amplia quando a empresa estiver pronta.' },
  agents: { ...en.agents, eyebrow: '04 · Inteligência aplicada', title: 'Lupita coordena especialistas para cada área.', lead: 'A conversa com IA deixa de ser genérica: os agentes trabalham com o contexto e as permissões da empresa para interpretar a operação.', coordinatorLabel: 'Agente coordenadora', coordinatorTitle: 'Lupita entende a pergunta e reúne o especialista certo.', coordinatorDescription: 'Consulte a empresa pelo ChatGPT ou Claude. Na implementação validamos a conexão conforme compatibilidade, conta e permissões autorizadas.', agentsTitle: 'Um especialista para cada necessidade', agents: [{ title: 'Agente Controle', description: 'Pessoas, presença, tarefas e conformidade.' }, { title: 'Agente Escala', description: 'Clientes, vendas, estoque e acompanhamento comercial.' }, { title: 'Agente Finanças', description: 'Despesas, orçamentos, caixa e sinais financeiros.' }, { title: 'Agente Corporativo', description: 'Contas a receber, indicadores e perspectiva estratégica para comparar resultados e alternativas.' }], questionsTitle: 'Perguntas que se tornam acionáveis', questions: ['Quem faltou hoje?', 'Quais tarefas estão vencidas?', 'Quais produtos precisam de atenção?', 'Como estão vendas, despesas e cobranças?'], permissionTitle: 'A decisão continua humana', permissionDescription: 'Cada agente consulta apenas informações autorizadas. Decisões e ações sensíveis continuam sujeitas à aprovação da pessoa responsável.', next: 'A IA não substitui o critério: reduz o caminho até uma decisão informada.' },
  pricing: { ...en.pricing, eyebrow: '05 · Investimento', title: 'Planos claros para começar e crescer.', lead: 'Três pacotes com ERP, agentes e acompanhamento. Dez pessoas estão incluídas e a capacidade cresce em blocos de dez.', plansTitle: 'Pacotes mensais para o México', plans: [{ id: 'controla', title: 'Controle', description: 'Organiza a equipe e transforma compromissos em acompanhamento.', includes: ['Painel Inicial e estrutura empresarial', 'Recursos Humanos', 'Tarefas e Processos'] }, { id: 'escala', title: 'Escala', description: 'Conecta pessoas, dinheiro e operação comercial.', includes: ['Tudo do Controle', 'Despesas e Caixa Pequeno', 'Vendas ou PDV com Estoque'] }, { id: 'corporate', title: 'Corporativo', description: 'Integra toda a operação e amplia a visão executiva.', includes: ['Tudo do Escala, com Vendas e PDV juntos', 'Contas a receber', 'Módulo executivo de KPIs'] }], monthlyLabel: 'por mês', pendingPriceLabel: 'A confirmar', annualLabel: 'Plano anual', beforeTaxLabel: 'Preços em MXN antes de impostos', commonTitle: 'Todos os pacotes incluem', commonItems: ['10 pessoas', 'Lupita e agentes conforme módulos e permissões', 'Uma consultoria mensal de 60 minutos', 'Modo Aprendiz'], offerLabel: 'Implantação promocional · Até outubro de 2026', offerTitle: 'Implementação ajustada ao pacote da sua empresa.', offerDescription: 'Um pagamento único para começar com diagnóstico, configuração, treinamento e acompanhamento inicial.', offerPriceLabel: 'Implantação promocional por pacote', offerIncludesTitle: 'Inclui', offerIncludes: ['Diagnóstico e definição de escopo', 'Configuração do ERP e agentes autorizados', 'Cadastro e treinamento de até 10 pessoas', 'Ativação e acompanhamento inicial'], offerCondition: 'O desconto anual de 20% vale para assinatura e blocos adicionais, não para a implantação. Preços antes do IVA e sujeitos à confirmação do escopo.', next: 'Um investimento definido para organizar a operação e ampliar capacidades conforme a empresa cresce.' },
  implementation: { ...en.implementation, eyebrow: '06 · O próximo passo', title: 'A tecnologia começa entendendo sua empresa.', lead: 'A implementação parte do problema real, configura uma primeira capacidade útil e acompanha a equipe até que se torne um hábito.', stepsTitle: 'Uma jornada clara e progressiva', steps: [{ label: '01', title: 'Entender', description: 'Diagnóstico inicial sem custo da operação, das prioridades e da oportunidade.' }, { label: '02', title: 'Definir', description: 'Definimos pacote, capacidade e escopo. A implementação e a primeira mensalidade são pagas na contratação.' }, { label: '03', title: 'Configurar', description: 'Adaptação, capacitação e ativação; desenvolvimentos especiais são cotados separadamente.' }, { label: '04', title: 'Continuar', description: 'Acompanhamento da adoção e uma sessão mensal de consultoria de 60 minutos.' }], trialLabel: 'Até 15 dias de teste', trialDescription: 'Conheça Índice antes de contratar. A implementação é necessária em todos os pacotes e adaptada aos seus processos.', supportTitle: 'Acompanhamento humano', supportDescription: 'Um consultor ajuda a interpretar necessidades, ordenar prioridades e sustentar a adoção.', cta: 'Solicitar diagnóstico sem custo', next: 'Seu próximo capítulo começa com uma conversa.' },
};

const ko: CommercialPresentationCopy = {
  ...en,
  subtitle: '맞춤형 ERP, 디지털 에이전트, 사람의 컨설팅', sectionSummary: '상업 프레젠테이션 요약', centralLabel: '핵심 아이디어', footer: '상업 프레젠테이션 · 기능은 계약된 범위, 권한 및 설정에 따라 활성화됩니다.',
  proposal: { ...en.proposal, eyebrow: '01 · 새로운 제안', title: '회사의 운영과 의사결정을 돕는 AI 에이전트.', lead: '관리 조직을 늘리지 않고 경영을 전문화하세요. 업무에 맞춘 ERP, 분석과 후속 관리를 돕는 AI 에이전트, 팀을 지원하는 컨설팅을 결합합니다.', statement: '팀은 실행하고, 에이전트는 분석하고 조율하며, 리더는 결정합니다.', frictionsTitle: '성장을 가로막는 문제', frictions: [{ title: '분산된 정보', description: '인력, 매출, 재고, 비용 정보가 서로 다른 도구에 흩어져 있습니다.' }, { title: '과부하된 경영진', description: '너무 많은 결정과 후속 조치가 대표에게 집중됩니다.' }, { title: '늦은 대응', description: '시간, 비용, 고객을 잃은 뒤에야 문제가 드러납니다.' }], resultsTitle: 'Índice가 만드는 변화', results: [{ title: '하나로 연결된 운영', description: '모든 부서가 동일한 정보원에서 업무를 수행합니다.' }, { title: '해석된 우선순위', description: '에이전트가 데이터를 유용한 경보와 질문으로 바꿉니다.' }, { title: '통제 가능한 의사결정', description: '기술은 제안하고 조율하며 책임자가 결정합니다.' }], next: '또 하나의 앱이 아니라 더 명확하게 운영하고 이끄는 방식을 제공합니다.' },
  operation: { ...en.operation, eyebrow: '02 · 사용 방식', title: '세 가지 업무 경험, 하나로 연결된 회사.', lead: '각 사용자는 필요한 방식으로 접속하고, Índice는 하나의 운영 기반에서 권한과 맥락, 추적성을 유지합니다.', lanesTitle: '역할에 맞는 경험', lanes: [{ label: '운영팀', title: '멀티키오스크', description: '휴대전화에서 빠르고 안내된 흐름으로 일상 업무를 처리합니다.', tools: ['출퇴근', '업무', '비용', '매출'] }, { label: '관리자', title: 'Índice 웹·모바일', description: '담당자가 각 영역을 정리하고 검증하며 후속 조치합니다.', tools: ['프로세스', '재고', '재무', '보고서'] }, { label: '경영진', title: 'ChatGPT 또는 Claude', description: '자연어로 회사 현황을 조회합니다. 도입 시 호환성, 계정, 권한에 따라 연결을 검증합니다.', tools: ['질문', '경보', '분석', '후속 조치'] }], foundationTitle: 'ERP는 신뢰할 수 있는 단일 정보원입니다', foundationDescription: '인력, 카탈로그, 거래, 결과가 역할별 권한으로 연결됩니다. 각 인터페이스는 회사 전체의 맥락을 유지하면서 필요한 정보만 보여 줍니다.', next: '같은 운영이 팀에는 단순하고 경영진에는 완전하게 보입니다.' },
  capabilities: { ...en.capabilities, eyebrow: '03 · 해결 범위', title: '회사 전체를 위한 하나의 운영 기반.', lead: '120개 이상의 적응형 도구가 회사의 성장에 맞춰 일상 업무를 체계화합니다.', pillarsTitle: '서로 연결된 네 가지 역량', pillars: [{ emoji: '👥', title: '인력', description: '팀과 책임을 체계적으로 관리합니다.', tools: ['인사', '출퇴근', '급여'] }, { emoji: '✅', title: '프로세스', description: '합의한 내용을 검증 가능한 실행으로 전환합니다.', tools: ['업무', '프로세스', '증빙'] }, { emoji: '📦', title: '제품과 고객', description: '상업 운영 전 과정을 연결합니다.', tools: ['CRM', '매출', '재고', 'POS'] }, { emoji: '📊', title: '재무', description: '자금 사용과 결과를 명확히 보여 줍니다.', tools: ['비용', '예산', '현금', 'KPI'] }], packagesTitle: '성장 단계에 맞는 역량', packages: [{ title: 'Controla', description: '초기 패널, 인사 관리, 업무와 프로세스를 제공합니다.' }, { title: 'Escala', description: 'Controla 전체에 비용, 소액 현금, 재고를 더하고 판매 또는 POS를 선택합니다.' }, { title: 'Corporativo', description: 'Escala 전체에 판매와 POS 모두, 미수금, 경영 KPI 모듈을 더합니다.' }], scopeNote: '각 모듈의 내부 지표는 유지됩니다. 학습 모드는 도구를 업무 습관으로 정착시키며 설정은 계약 범위에 따릅니다.', next: '필요한 역량부터 시작하고 회사가 준비되면 확장합니다.' },
  agents: { ...en.agents, eyebrow: '04 · 업무에 적용되는 지능', title: '루피타가 각 영역의 전문 에이전트를 조율합니다.', lead: '에이전트는 회사의 맥락과 권한을 바탕으로 운영을 해석하므로 AI 대화가 더 이상 일반적인 답변에 머물지 않습니다.', coordinatorLabel: '조정 에이전트', coordinatorTitle: '루피타가 질문을 이해하고 적합한 전문가를 연결합니다.', coordinatorDescription: 'ChatGPT 또는 Claude에서 회사 현황을 조회하세요. 도입 시 호환성, 계정, 승인한 권한에 따라 연결을 검증합니다.', agentsTitle: '필요에 맞는 전문가', agents: [{ title: 'Controla 에이전트', description: '인력, 출퇴근, 업무, 준수 현황을 다룹니다.' }, { title: 'Escala 에이전트', description: '고객, 매출, 재고, 영업 후속 관리를 다룹니다.' }, { title: '재무 에이전트', description: '비용, 예산, 현금, 재무 신호를 다룹니다.' }, { title: '기업 에이전트', description: '미수금, 지표, 전략적 관점을 통해 결과와 대안을 비교합니다.' }], questionsTitle: '실행으로 이어지는 질문', questions: ['오늘 누가 결근했나요?', '기한이 지난 업무는 무엇인가요?', '주의가 필요한 제품은 무엇인가요?', '매출, 비용, 수금 현황은 어떤가요?'], permissionTitle: '최종 결정은 사람이 합니다', permissionDescription: '각 에이전트는 허가된 정보만 조회합니다. 민감한 결정과 조치는 책임자의 승인을 거쳐야 합니다.', next: 'AI는 판단을 대체하지 않고, 정보에 근거한 결정까지의 시간을 줄입니다.' },
  pricing: { ...en.pricing, eyebrow: '05 · 투자', title: '시작과 성장을 위한 명확한 요금제.', lead: 'ERP, 에이전트, 지원을 결합한 세 패키지에 10명이 포함되며 용량은 10명 단위로 늘어납니다.', plansTitle: '멕시코 월간 패키지', plans: [{ id: 'controla', title: 'Controla', description: '팀을 정리하고 약속을 후속 관리로 전환합니다.', includes: ['초기 패널과 기업 구조', '인사 관리', '업무와 프로세스'] }, { id: 'escala', title: 'Escala', description: '인력, 자금, 상업 운영을 연결합니다.', includes: ['Controla 전체', '비용과 소액 현금', '판매 또는 POS와 재고'] }, { id: 'corporate', title: 'Corporativo', description: '전체 운영을 통합하고 경영 시야를 넓힙니다.', includes: ['Escala 전체와 판매 및 POS 모두', '미수금', '경영 KPI 모듈'] }], monthlyLabel: '월', pendingPriceLabel: '확인 예정', annualLabel: '연간 요금제', beforeTaxLabel: '세금 별도 MXN 요금', commonTitle: '모든 패키지 포함 사항', commonItems: ['10명 포함', '모듈과 권한에 따른 Lupita 및 에이전트', '매월 60분 컨설팅 1회', '학습 모드'], offerLabel: '프로모션 도입비 · 2026년 10월까지', offerTitle: '회사 패키지에 맞춘 도입 서비스.', offerDescription: '진단, 설정, 교육 및 초기 정착 지원을 포함한 1회 결제입니다.', offerPriceLabel: '패키지별 프로모션 도입비', offerIncludesTitle: '포함 사항', offerIncludes: ['진단과 범위 정의', 'ERP와 승인된 에이전트 설정', '최대 10명 등록 및 교육', '활성화와 초기 정착 지원'], offerCondition: '연간 20% 할인은 구독과 추가 블록에 적용되며 도입비에는 적용되지 않습니다. 부가세 별도이며 범위 확인이 필요합니다.', next: '운영을 정리하고 성장에 따라 역량을 확대하기 위한 명확한 투자입니다.' },
  implementation: { ...en.implementation, eyebrow: '06 · 다음 단계', title: '기술 도입은 회사를 이해하는 것에서 시작합니다.', lead: '실제 문제에서 출발해 유용한 첫 기능을 설정하고 팀이 습관으로 정착시킬 때까지 지원합니다.', stepsTitle: '명확하고 점진적인 여정', steps: [{ label: '01', title: '이해', description: '운영, 우선순위, 기회를 파악하는 무료 초기 진단입니다.' }, { label: '02', title: '정의', description: '패키지, 인원, 범위를 정합니다. 계약 시 도입비와 첫 달 구독료를 납부합니다.' }, { label: '03', title: '설정', description: '맞춤 설정, 교육, 활성화를 진행하며 특별 개발은 별도 견적입니다.' }, { label: '04', title: '지속', description: '도입을 점검하고 매월 60분 컨설팅을 진행합니다.' }], trialLabel: '최대 15일 체험', trialDescription: '계약 전에 Índice를 체험하세요. 모든 패키지에 도입이 필요하며 업무 흐름에 맞춰 범위를 정합니다.', supportTitle: '사람의 컨설팅 지원', supportDescription: '컨설턴트가 요구사항을 해석하고 우선순위를 정하며 도입을 지속하도록 돕습니다.', cta: '무료 진단 요청', next: '회사의 다음 장은 한 번의 대화에서 시작됩니다.' },
};

const zh: CommercialPresentationCopy = {
  ...en,
  subtitle: '定制 ERP、数字智能体与人工顾问支持', sectionSummary: '商业演示摘要', centralLabel: '核心理念', footer: '商业演示 · 功能将根据合同范围、权限和配置启用。',
  proposal: { ...en.proposal, eyebrow: '01 · 全新方案', title: '让 AI 智能体协助您管理企业。', lead: '无需扩大管理架构，也能提升经营专业度：适配业务流程的 ERP、协助分析和跟进的 AI 智能体，以及支持团队的顾问服务。', statement: '团队负责执行，智能体分析协调，您负责决策。', frictionsTitle: '当前阻碍增长的问题', frictions: [{ title: '信息分散', description: '人员、销售、库存与费用分散在不同工具中。' }, { title: '管理层过载', description: '过多决策和跟进工作依赖企业负责人。' }, { title: '反应滞后', description: '问题往往在消耗时间、资金或客户后才显现。' }], resultsTitle: 'Índice 带来的改变', results: [{ title: '统一互联的运营', description: '各业务领域基于同一信息源开展工作。' }, { title: '经过解读的优先事项', description: '智能体将数据转化为有用的提醒与问题。' }, { title: '可控的决策', description: '技术负责建议与协调，责任人做出最终决定。' }], next: '这不是增加一个应用，而是建立更清晰的运营与管理方式。' },
  operation: { ...en.operation, eyebrow: '02 · 使用方式', title: '三种工作方式，一家互联企业。', lead: '每个人使用适合自己职责的体验，Índice 则在同一运营基础上保留权限、上下文与可追溯性。', lanesTitle: '适配每种职责的体验', lanes: [{ label: '一线团队', title: '多功能自助终端', description: '通过手机上的快速引导流程完成日常运营。', tools: ['考勤', '任务', '费用', '销售'] }, { label: '行政管理', title: 'Índice 网页端与移动端', description: '负责人组织、验证并跟进各业务领域。', tools: ['流程', '库存', '财务', '报告'] }, { label: '管理层', title: 'ChatGPT 或 Claude', description: '用自然语言查询企业。实施时根据兼容性、账户和权限验证连接。', tools: ['提问', '提醒', '分析', '跟进'] }], foundationTitle: 'ERP 是唯一可信数据源', foundationDescription: '人员、目录、业务记录和结果通过基于角色的权限连接。每个界面只展示所需内容，同时保留企业全局上下文。', next: '同一套运营对团队足够简单，对管理层足够完整。' },
  capabilities: { ...en.capabilities, eyebrow: '03 · 解决范围', title: '覆盖整个企业的统一运营基础。', lead: '120 多种自适应工具帮助企业组织日常工作，并在成长过程中无需更换平台。', pillarsTitle: '四项互联能力', pillars: [{ emoji: '👥', title: '人员', description: '组织团队及其职责。', tools: ['人力资源', '考勤', '薪资'] }, { emoji: '✅', title: '流程', description: '将约定转化为可验证的执行。', tools: ['任务', '流程', '凭证'] }, { emoji: '📦', title: '产品与客户', description: '连接端到端商业运营。', tools: ['CRM', '销售', '库存', 'POS'] }, { emoji: '📊', title: '财务', description: '清晰呈现资金使用与经营结果。', tools: ['费用', '预算', '现金', 'KPI'] }], packagesTitle: '匹配不同阶段的能力', packages: [{ title: 'Controla', description: '初始面板、人力资源、任务与流程。' }, { title: 'Escala', description: 'Controla 全部内容，加上费用、备用金和库存；选择销售或 POS。' }, { title: 'Corporativo', description: 'Escala 全部内容，同时加入销售、POS、应收账款及管理 KPI 模块。' }], scopeNote: '各模块保留内部指标。学习模式帮助将工具转化为工作习惯，配置以约定范围为准。', next: '从当前需要的能力开始，在企业准备好后继续扩展。' },
  agents: { ...en.agents, eyebrow: '04 · 应用型智能', title: 'Lupita 协调各业务领域的专业智能体。', lead: '智能体结合企业上下文与权限解读运营，让 AI 对话不再停留在泛泛回答。', coordinatorLabel: '协调智能体', coordinatorTitle: 'Lupita 理解问题，并召集合适的专业智能体。', coordinatorDescription: '通过 ChatGPT 或 Claude 查询企业状况。实施时根据兼容性、账户及授权权限验证连接。', agentsTitle: '按需调用专业智能体', agents: [{ title: 'Controla 智能体', description: '人员、考勤、任务与合规。' }, { title: 'Escala 智能体', description: '客户、销售、库存与业务跟进。' }, { title: '财务智能体', description: '费用、预算、现金与财务信号。' }, { title: '企业智能体', description: '通过应收账款、指标及战略视角比较结果和备选方案。' }], questionsTitle: '转化为行动的问题', questions: ['今天谁缺勤？', '哪些任务已逾期？', '哪些产品需要关注？', '销售、费用和回款情况如何？'], permissionTitle: '最终决定仍由人做出', permissionDescription: '每个智能体只能访问已授权信息。敏感决策与操作仍须由责任人批准。', next: 'AI 不会替代判断，而是缩短做出明智决策所需的时间。' },
  pricing: { ...en.pricing, eyebrow: '05 · 投资', title: '清晰的方案，支持起步与成长。', lead: '三个套餐均包含 ERP、智能体和顾问支持，涵盖 10 人；容量按每 10 人扩展。', plansTitle: '墨西哥月度套餐', plans: [{ id: 'controla', title: 'Controla', description: '组织团队，并将承诺转化为持续跟进。', includes: ['初始面板与企业结构', '人力资源', '任务与流程'] }, { id: 'escala', title: 'Escala', description: '连接人员、资金与商业运营。', includes: ['Controla 全部内容', '费用与备用金', '销售或 POS 与库存'] }, { id: 'corporate', title: 'Corporativo', description: '整合完整运营并拓展管理视角。', includes: ['Escala 全部内容，同时包含销售和 POS', '应收账款', '管理 KPI 模块'] }], monthlyLabel: '每月', pendingPriceLabel: '待确认', annualLabel: '年度套餐', beforeTaxLabel: 'MXN 价格，不含税', commonTitle: '所有套餐均包含', commonItems: ['10 人', '根据模块与权限启用 Lupita 及智能体', '每月一次 60 分钟咨询', '学习模式'], offerLabel: '优惠实施费 · 截至 2026 年 10 月', offerTitle: '按企业套餐配置实施服务。', offerDescription: '一次性付款，包含诊断、配置、培训与上线支持。', offerPriceLabel: '各套餐优惠实施费', offerIncludesTitle: '包含', offerIncludes: ['诊断与范围定义', 'ERP 与授权智能体配置', '最多 10 人开通与培训', '启用与上线陪伴'], offerCondition: '年付 20% 优惠适用于订阅和额外容量，不适用于实施费。价格不含增值税，并须确认实施范围。', next: '以明确投入整理当前运营，并随企业成长扩展能力。' },
  implementation: { ...en.implementation, eyebrow: '06 · 下一步', title: '技术实施从理解您的企业开始。', lead: '我们从真实问题出发，配置第一项实用能力，并陪伴团队将其转化为习惯。', stepsTitle: '清晰、渐进的实施路径', steps: [{ label: '01', title: '理解', description: '免费初步诊断运营、优先事项与机会。' }, { label: '02', title: '定义', description: '约定套餐、人数和范围。签约时支付实施费用与首月订阅费。' }, { label: '03', title: '配置', description: '完成适配、培训与启用；特殊开发另行报价。' }, { label: '04', title: '持续', description: '跟进采用情况，并每月提供一次 60 分钟咨询。' }], trialLabel: '最多 15 天试用', trialDescription: '签约前体验 Índice。所有套餐都需要实施，并根据业务流程约定范围。', supportTitle: '人工顾问支持', supportDescription: '顾问帮助解读需求、梳理优先级并持续推动采用。', cta: '申请免费诊断', next: '企业的下一篇章，从一次对话开始。' },
};

export const commercialPresentationContent: Localized<CommercialPresentationCopy> = byLocale(es, en, fr, pt, ko, zh);

export const commercialExperienceCopy = byLocale(
  { diagram: 'La tecnología detrás de una mejor decisión', preview: 'Vistas del producto · Datos de demostración', explore: 'Explora Lupita y sus especialidades', hint: 'Abre una especialidad para conocer su enfoque', fullscreen: 'Pantalla completa', exitFullscreen: 'Salir de pantalla completa', scope: 'Esquema de la propuesta. Las herramientas disponibles dependen de los módulos, permisos y funciones habilitadas; no todas las especialidades operan como agentes autónomos.' },
  { diagram: 'The technology behind a better decision', preview: 'Product previews · Demo data', explore: 'Explore Lupita and her specialties', hint: 'Open a specialty to discover its focus', fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', scope: 'Proposal diagram. Available tools depend on enabled modules, permissions and features; not every specialty operates as an autonomous agent.' },
  { diagram: 'La technologie derrière une meilleure décision', preview: 'Vues du produit · Données de démonstration', explore: 'Explorez Lupita et ses spécialités', hint: 'Ouvrez une spécialité pour découvrir son rôle', fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran', scope: 'Schéma de la proposition. Les outils disponibles dépendent des modules, autorisations et fonctions activés ; chaque spécialité ne fonctionne pas nécessairement comme un agent autonome.' },
  { diagram: 'A tecnologia por trás de uma decisão melhor', preview: 'Visões do produto · Dados de demonstração', explore: 'Explore Lupita e suas especialidades', hint: 'Abra uma especialidade para conhecer seu foco', fullscreen: 'Tela cheia', exitFullscreen: 'Sair da tela cheia', scope: 'Esquema da proposta. As ferramentas disponíveis dependem dos módulos, permissões e funções habilitados; nem toda especialidade opera como agente autônomo.' },
  { diagram: '더 나은 의사결정을 위한 기술', preview: '제품 미리보기 · 데모 데이터', explore: '루피타와 전문 분야 살펴보기', hint: '전문 분야를 열어 역할을 확인하세요', fullscreen: '전체 화면', exitFullscreen: '전체 화면 종료', scope: '제안 구성도입니다. 사용 가능한 도구는 활성화된 모듈, 권한 및 기능에 따라 다릅니다. 모든 전문 분야가 자율 에이전트로 작동하는 것은 아닙니다.' },
  { diagram: '支持更好决策的技术', preview: '产品预览 · 演示数据', explore: '了解 Lupita 及其专业领域', hint: '展开专业领域，了解其侧重点', fullscreen: '全屏', exitFullscreen: '退出全屏', scope: '方案示意图。可用工具取决于已启用的模块、权限与功能；并非每个专业领域都作为自主智能体运行。' },
);

export const commercialPricingUiCopy = byLocale(
  { annualSavings: 'Ahorra 20% con pago anual', additionalBlock: 'Bloque adicional de 10 personas', regularSetup: 'Precio regular', oneTime: 'pago único' },
  { annualSavings: 'Save 20% with annual billing', additionalBlock: 'Additional block of 10 people', regularSetup: 'Regular price', oneTime: 'one-time payment' },
  { annualSavings: 'Économisez 20 % avec le paiement annuel', additionalBlock: 'Bloc supplémentaire de 10 personnes', regularSetup: 'Prix régulier', oneTime: 'paiement unique' },
  { annualSavings: 'Economize 20% com pagamento anual', additionalBlock: 'Bloco adicional de 10 pessoas', regularSetup: 'Preço regular', oneTime: 'pagamento único' },
  { annualSavings: '연간 결제로 20% 절약', additionalBlock: '10명 추가 블록', regularSetup: '정가', oneTime: '1회 결제' },
  { annualSavings: '按年付费可省 20%', additionalBlock: '额外 10 人容量', regularSetup: '原价', oneTime: '一次性付款' },
);
