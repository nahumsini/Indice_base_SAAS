// Public editorial content only: never populate this presentation with tenant data.
export const investmentLocaleCodes = ['es-MX', 'es-CO', 'en-US', 'en-CA', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'] as const;
export type InvestmentLocale = typeof investmentLocaleCodes[number];
export type InvestmentTab = 'overview' | 'modules' | 'market' | 'business' | 'partners' | 'ai' | 'proforma';
export type InvestmentItem = { title: string; description: string };
export type InvestmentSection = {
  eyebrow: string; title: string; description: string; takeaway: string; takeawayDetail: string;
  itemsTitle: string; items: InvestmentItem[]; evidenceTitle: string; evidence: InvestmentItem[]; next: string;
};

export const investmentMcpMetrics = {
  currentTools: 32,
  roadmapTargetMonth: '2026-10',
  roadmapTargetToolsApprox: 64,
} as const;

type Localized<T> = Record<InvestmentLocale, T>;
type Pair = readonly [string, string];
type OverviewParagraphs = readonly [string, string, string];
type CustomerJourneyUi = { phases: readonly [string, string]; highlight: string; resultLabel: string };
type PartnerPortalUi = {
  eyebrow: string; title: string; description: string; badge: string;
  libraryTitle: string; libraryDescription: string; portalLink: string; accessNote: string; downloadLabel: string;
  resources: readonly { id: string; title: string }[];
};

const byLocale = <T,>(es: T, en: T, fr: T, pt: T, ko: T, zh: T): Localized<T> => ({
  'es-MX': es, 'es-CO': es, 'en-US': en, 'en-CA': en, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
});
const items = (pairs: readonly Pair[]): InvestmentItem[] => pairs.map(([title, description]) => ({ title, description }));
const section = (
  eyebrow: string, title: string, description: string, takeaway: string, takeawayDetail: string,
  itemsTitle: string, itemPairs: readonly Pair[], evidenceTitle: string, evidencePairs: readonly Pair[], next: string,
): InvestmentSection => ({ eyebrow, title, description, takeaway, takeawayDetail, itemsTitle, items: items(itemPairs), evidenceTitle, evidence: items(evidencePairs), next });

export const investmentTabs: readonly (readonly [InvestmentTab, Localized<string>])[] = [
  ['overview', byLocale('Índice en breve', 'Índice at a glance', 'Aperçu d’Índice', 'Índice em resumo', 'Índice 개요', 'Índice 概览')],
  ['modules', byLocale('Módulos', 'Modules', 'Modules', 'Módulos', '모듈', '模块')],
  ['market', byLocale('Mercado meta', 'Target market', 'Marché cible', 'Mercado-alvo', '목표 시장', '目标市场')],
  ['business', byLocale('Modelo de negocio', 'Business model', 'Modèle d’affaires', 'Modelo de negócio', '비즈니스 모델', '商业模式')],
  ['partners', byLocale('Distribuidores', 'Distributors', 'Distributeurs', 'Distribuidores', '유통 파트너', '分销商')],
  ['ai', byLocale('IA', 'AI', 'IA', 'IA', 'AI', '人工智能')],
  ['proforma', byLocale('Proforma', 'Pro forma', 'Pro forma', 'Pro forma', '프로포마', '预计财务模型')],
];
export const resolveInvestmentTab = (value: string | null): InvestmentTab => investmentTabs.find(([tab]) => tab === value)?.[0] ?? 'overview';

export const investmentOverviewParagraphs: Localized<OverviewParagraphs> = byLocale<OverviewParagraphs>(
  [
    'Índice es una plataforma SaaS modular para PYMES que integra en un solo entorno la gestión de personas, procesos, ventas, inventarios, gastos y finanzas. Cada empresa puede activar únicamente los módulos que necesita y ampliar sus capacidades conforme evoluciona.',
    'El sistema ayuda a centralizar la información, estandarizar procesos, coordinar equipos y dar seguimiento a las actividades con datos actualizados. Así reduce tareas manuales y dispersión de información, mejora el control operativo y facilita decisiones oportunas.',
    'Índice está diseñado para crecer junto con la empresa, incorporando más usuarios, unidades y procesos sin cambiar de plataforma. Su implementación incluye acompañamiento de consultoría para diagnosticar necesidades, configurar los flujos, capacitar al equipo y promover una adopción progresiva y sostenible.',
  ],
  [
    'Índice is a modular SaaS platform for SMBs that brings people, processes, sales, inventory, expenses, and finance together in one environment. Each company can activate only the modules it needs and expand its capabilities as it evolves.',
    'The system helps centralize information, standardize processes, coordinate teams, and track activities using up-to-date data. This reduces manual work and fragmented information, strengthens operational control, and supports timely decision-making.',
    'Índice is designed to grow alongside the company, adding more users, business units, and processes without switching platforms. Its implementation includes consulting support to assess needs, configure workflows, train the team, and promote gradual, sustainable adoption.',
  ],
  [
    'Índice est une plateforme SaaS modulaire destinée aux PME qui réunit dans un même environnement la gestion du personnel, des processus, des ventes, des stocks, des dépenses et des finances. Chaque entreprise peut activer uniquement les modules dont elle a besoin et élargir ses capacités à mesure qu’elle évolue.',
    'Le système aide à centraliser l’information, à normaliser les processus, à coordonner les équipes et à suivre les activités à partir de données à jour. Il réduit ainsi les tâches manuelles et la dispersion de l’information, améliore le contrôle opérationnel et facilite la prise de décisions au moment opportun.',
    'Índice est conçue pour évoluer avec l’entreprise en intégrant davantage d’utilisateurs, d’unités d’affaires et de processus sans avoir à changer de plateforme. Sa mise en œuvre comprend un accompagnement-conseil pour évaluer les besoins, configurer les flux de travail, former l’équipe et favoriser une adoption progressive et durable.',
  ],
  [
    'Índice é uma plataforma SaaS modular para PMEs que integra, em um único ambiente, a gestão de pessoas, processos, vendas, estoques, despesas e finanças. Cada empresa pode ativar apenas os módulos de que precisa e ampliar suas capacidades conforme evolui.',
    'O sistema ajuda a centralizar as informações, padronizar processos, coordenar equipes e acompanhar as atividades com dados atualizados. Assim, reduz tarefas manuais e a dispersão de informações, melhora o controle operacional e facilita decisões no momento certo.',
    'Índice foi projetado para crescer junto com a empresa, incorporando mais usuários, unidades e processos sem a necessidade de mudar de plataforma. Sua implementação inclui acompanhamento consultivo para diagnosticar necessidades, configurar fluxos, capacitar a equipe e promover uma adoção progressiva e sustentável.',
  ],
  [
    'Índice는 인사, 프로세스, 영업, 재고, 비용 및 재무를 하나의 환경에 통합하는 중소기업용 모듈형 SaaS 플랫폼입니다. 각 기업은 필요한 모듈만 활성화하고 성장 단계에 따라 기능을 확장할 수 있습니다.',
    '시스템은 정보를 중앙화하고, 프로세스를 표준화하며, 팀 간 협업을 조율하고, 최신 데이터를 기반으로 활동을 추적할 수 있도록 지원합니다. 이를 통해 수작업과 정보 분산을 줄이고 운영 통제를 강화하며 적시에 의사결정을 내릴 수 있습니다.',
    'Índice는 기업과 함께 성장하도록 설계되어 플랫폼을 변경하지 않고도 사용자, 사업 단위, 프로세스를 추가할 수 있습니다. 도입 과정에는 요구 사항 진단, 업무 흐름 설정, 팀 교육을 위한 컨설팅 지원이 포함되며, 점진적이고 지속 가능한 정착을 돕습니다.',
  ],
  [
    'Índice 是面向中小企业的模块化 SaaS 平台，将人员、流程、销售、库存、费用和财务整合到同一环境中。企业可仅启用当前所需的模块，并随着发展逐步扩展功能。',
    '该系统利用最新数据，帮助企业集中管理信息、规范流程、协调团队并跟踪各项活动，从而减少手工作业和信息分散，提升运营管控能力，并支持及时决策。',
    'Índice 旨在与企业共同成长，无需更换平台即可增加用户、业务单元和流程。实施过程中包含咨询支持，帮助企业诊断需求、配置工作流、培训团队，并推动渐进且可持续的应用落地。',
  ],
);

export const marketSource = {
  titles: byLocale('INEGI · Censos Económicos 2024', 'INEGI · 2024 Economic Censuses', 'INEGI · Recensements économiques 2024', 'INEGI · Censos Econômicos 2024', 'INEGI · 2024년 경제 센서스', 'INEGI · 2024 年经济普查'),
  url: 'https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/ce2024_mn00.pdf',
} as const;
export const marketSignals = [
  { value: '5,468,180', labels: byLocale('Unidades económicas en México', 'Economic establishments in Mexico', 'Unités économiques au Mexique', 'Unidades econômicas no México', '멕시코 내 경제 사업체', '墨西哥经济单位') },
  { value: '1,266,352', labels: byLocale('Con al menos una herramienta digital', 'Using at least one digital tool', 'Utilisant au moins un outil numérique', 'Com pelo menos uma ferramenta digital', '하나 이상의 디지털 도구를 사용하는 사업체', '至少使用一种数字工具') },
] as const;

export const customerJourneyUi: Localized<CustomerJourneyUi> = byLocale(
  { phases: ['Captación y activación', 'Acompañamiento continuo'], highlight: 'Sesión sin costo · punto decisivo', resultLabel: 'Resultado del recorrido' },
  { phases: ['Acquisition and activation', 'Ongoing support'], highlight: 'Free session · pivotal moment', resultLabel: 'Journey outcome' },
  { phases: ['Acquisition et activation', 'Accompagnement continu'], highlight: 'Séance sans frais · moment décisif', resultLabel: 'Résultat du parcours' },
  { phases: ['Captação e ativação', 'Acompanhamento contínuo'], highlight: 'Sessão sem custo · momento decisivo', resultLabel: 'Resultado da jornada' },
  { phases: ['고객 유치 및 활성화', '지속적인 동행'], highlight: '무료 세션 · 핵심 전환점', resultLabel: '고객 여정의 결과' },
  { phases: ['获客与启用', '持续陪伴'], highlight: '免费咨询 · 关键节点', resultLabel: '客户旅程成果' },
);

export const partnerPortalUi: Localized<PartnerPortalUi> = byLocale(
  {
    eyebrow: 'Academia Índice · 100 % web', title: 'Formación, exámenes y certificación en la misma plataforma.',
    description: 'El avance queda registrado por etapa; cada evaluación se presenta en línea y el examen final emite un certificado verificable y descargable.', badge: 'Ruta certificada',
    libraryTitle: 'Documentación para distribuidores y consultores', libraryDescription: 'Material operativo vigente en PDF, disponible desde la biblioteca protegida del portal.',
    portalLink: 'Abrir academia y biblioteca', accessNote: 'Las descargas requieren una sesión autorizada de distribuidor.', downloadLabel: 'Descargar PDF',
    resources: [{ id: 'consulting-guide', title: 'Guía de consultoría comercial' }, { id: 'basic-modules', title: 'Descripción técnica de módulos básicos' }, { id: 'operating-manual', title: 'Manual operativo para distribuidores' }],
  },
  {
    eyebrow: 'Índice Academy · 100% web-based', title: 'Training, exams, and certification on the same platform.',
    description: 'Progress is recorded by stage; every assessment is completed online, and the final exam issues a downloadable, verifiable certificate.', badge: 'Certified pathway',
    libraryTitle: 'Distributor and consultant documentation', libraryDescription: 'Current operating material in PDF, available from the portal’s protected library.',
    portalLink: 'Open academy and library', accessNote: 'Downloads require an authorized distributor session.', downloadLabel: 'Download PDF',
    resources: [{ id: 'consulting-guide', title: 'Commercial consulting guide' }, { id: 'basic-modules', title: 'Basic modules technical overview' }, { id: 'operating-manual', title: 'Distributor operating manual' }],
  },
  {
    eyebrow: 'Académie Índice · 100 % en ligne', title: 'Formation, examens et certification sur une même plateforme.',
    description: 'La progression est enregistrée par étape; chaque évaluation se déroule en ligne et l’examen final produit un certificat vérifiable et téléchargeable.', badge: 'Parcours certifié',
    libraryTitle: 'Documentation pour distributeurs et consultants', libraryDescription: 'Documents opérationnels à jour en PDF, accessibles dans la bibliothèque protégée du portail.',
    portalLink: 'Ouvrir l’académie et la bibliothèque', accessNote: 'Les téléchargements nécessitent une session de distributeur autorisée.', downloadLabel: 'Télécharger le PDF',
    resources: [{ id: 'consulting-guide', title: 'Guide de consultation commerciale' }, { id: 'basic-modules', title: 'Aperçu technique des modules de base' }, { id: 'operating-manual', title: 'Manuel opérationnel des distributeurs' }],
  },
  {
    eyebrow: 'Academia Índice · 100% on-line', title: 'Treinamento, exames e certificação na mesma plataforma.',
    description: 'O progresso fica registrado por etapa; cada avaliação é realizada on-line e o exame final emite um certificado verificável e disponível para download.', badge: 'Trilha certificada',
    libraryTitle: 'Documentação para distribuidores e consultores', libraryDescription: 'Material operacional vigente em PDF, disponível na biblioteca protegida do portal.',
    portalLink: 'Abrir academia e biblioteca', accessNote: 'Os downloads exigem uma sessão autorizada de distribuidor.', downloadLabel: 'Baixar PDF',
    resources: [{ id: 'consulting-guide', title: 'Guia de consultoria comercial' }, { id: 'basic-modules', title: 'Visão técnica dos módulos básicos' }, { id: 'operating-manual', title: 'Manual operacional para distribuidores' }],
  },
  {
    eyebrow: 'Índice 아카데미 · 100% 웹', title: '교육, 시험, 인증을 하나의 플랫폼에서 제공합니다.',
    description: '단계별 진도가 기록되고 모든 평가를 온라인으로 진행하며, 최종 시험을 통과하면 검증 가능하고 다운로드할 수 있는 인증서가 발급됩니다.', badge: '인증 과정',
    libraryTitle: '유통 파트너 및 컨설턴트 문서', libraryDescription: '최신 운영 자료를 보호된 포털 라이브러리에서 PDF로 제공합니다.',
    portalLink: '아카데미 및 자료실 열기', accessNote: '다운로드에는 승인된 유통 파트너 세션이 필요합니다.', downloadLabel: 'PDF 다운로드',
    resources: [{ id: 'consulting-guide', title: '상업 컨설팅 가이드' }, { id: 'basic-modules', title: '기본 모듈 기술 개요' }, { id: 'operating-manual', title: '유통 파트너 운영 매뉴얼' }],
  },
  {
    eyebrow: 'Índice 学院 · 100% 在线', title: '在同一平台完成培训、考试与认证。',
    description: '系统按阶段记录进度；所有评估均在线完成，通过最终考试后可获得可验证、可下载的证书。', badge: '认证路径',
    libraryTitle: '分销商与顾问文档', libraryDescription: '最新版运营资料以 PDF 形式存放在受保护的门户资料库中。',
    portalLink: '打开学院与资料库', accessNote: '下载需要获得授权的分销商会话。', downloadLabel: '下载 PDF',
    resources: [{ id: 'consulting-guide', title: '商业咨询指南' }, { id: 'basic-modules', title: '基础模块技术概览' }, { id: 'operating-manual', title: '分销商运营手册' }],
  },
);

const sectionsEs: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · Qué es Índice', 'Índice es un sistema SaaS modular de gestión empresarial.',
    'Conecta en un solo sistema a las personas, los procesos, las ventas, los gastos y las finanzas. Cada área trabaja con información compartida y permisos según su responsabilidad.',
    'Cada actividad se registra una vez y actualiza el contexto del negocio.', 'La empresa puede comenzar con los módulos que necesita y ampliar la plataforma conforme crece.',
    'Qué aporta', [['Control operativo', 'Permite conocer qué sucede, quién es responsable y qué requiere atención.'], ['Trabajo coordinado', 'Reduce capturas duplicadas y la conciliación entre herramientas aisladas.'], ['Decisiones con datos', 'Convierte la operación diaria en seguimiento, alertas e indicadores actualizados.']],
    'Qué buscamos demostrar', [['Valor temprano', 'Completar un flujo útil durante la implementación.'], ['Uso recurrente', 'Incorporar Índice a la rutina del equipo.'], ['Escala sostenible', 'Crecer sin elevar proporcionalmente el costo de servir.']],
    'A continuación, los módulos que convierten esta propuesta en operaciones concretas.',
  ),
  modules: section(
    '02 · Producto modular', 'Módulos especializados sobre una misma fuente de verdad.',
    'El núcleo incluye panel, KPIs, estructura, usuarios, seguridad y facturación; los productos operativos se activan según la oferta.',
    'Modular no significa fragmentado.', 'Cada área conserva su especialidad y comparte personas, catálogos, permisos y resultados.',
    'Productos operativos', [['Recursos Humanos', 'Colaboradores, asistencia, expedientes, activos, permisos y nómina.'], ['Tareas y Procesos', 'Procesos, responsables, agenda y cumplimiento.'], ['Gastos y Caja Chica', 'Gastos, presupuestos, fondos y tesorería.'], ['Ventas e Inventarios', 'Prospectos, cotizaciones, ventas, almacenes y existencias.'], ['POS e Inventarios', 'Caja, pedidos, cortes, compras e inventario.'], ['Cartera', 'Crédito, saldos, vencimientos y cobros.']],
    'Capacidades transversales', [['Multiempresa', 'Operar distintas empresas sin mezclar información.'], ['Multidivisa', 'Operación nativa y lectura consolidada.'], ['Aprendizaje integrado', 'Guías contextuales dentro del producto.']],
    'Concentrar la entrada comercial en dolores repetibles y urgentes.',
  ),
  market: section(
    '03 · Mercado meta', 'Un mercado amplio, abordado desde segmentos concretos.',
    'PYMES que coordinan ventas, inventario, cobros, gastos y equipos mediante hojas de cálculo y herramientas aisladas.',
    'Segmentar por dolor operativo.', 'El mejor prospecto reconoce el costo de conciliar información y tiene un líder para el cambio.',
    'Perfiles prioritarios', [['Empresas de 10 a 30 colaboradores', 'Negocios en expansión cuyos procesos comienzan a desbordar el control manual y necesitan estructura para seguir creciendo.'], ['Equipos con información dispersa', 'Empresas que coordinan ventas, gastos, inventario y tareas en herramientas separadas y necesitan una operación conectada.'], ['Operaciones dependientes de personas clave', 'Negocios que necesitan delegar responsabilidades y estandarizar procesos sin perder visibilidad ni control.']],
    'Señales de encaje', [['Momento de crecimiento', 'Empresas de 10 a 30 colaboradores cuyo volumen ya rebasa hojas de cálculo, chats y seguimiento manual.'], ['Fricción operativa', 'Información dispersa, trabajo duplicado y retrasos que ya afectan el servicio, las ventas o la caja.'], ['Dependencia crítica', 'La operación descansa en pocas personas y en conocimiento que todavía no está documentado.']],
    'Avanzar primero con empresas donde el costo del desorden ya supera el esfuerzo de implementar Índice.',
  ),
  business: section(
    '04 · Modelo de negocio', 'Del primer contacto al acompañamiento continuo.',
    'Índice llega al cliente mediante una venta consultiva: primero escucha y diagnostica, después implementa una solución prioritaria y mantiene una relación mensual orientada a la adopción y los resultados.',
    'La venta comienza dando claridad y continúa demostrando valor.', 'La primera sesión debe ayudar al prospecto a entender mejor su empresa, incluso si todavía no compra.',
    'Recorrido del cliente', [['Contacto y confianza', 'Conocemos la empresa, su tamaño y la operación que más la desborda. El objetivo es escuchar y acordar la siguiente conversación, no presentar todos los módulos.'], ['Consultoría inicial sin costo', 'En 60 a 90 minutos mapeamos Personas, Procesos, Productos y Finanzas, priorizamos el dolor y mostramos únicamente la solución pertinente.'], ['Implementación enfocada', 'Tras definir el alcance y contratar, configuramos los módulos, capacitamos a los responsables y validamos un primer flujo real.'], ['Seguimiento del consultor', 'El consultor asignado revisa uso, pendientes y bloqueos, documenta acuerdos y acompaña al equipo hasta lograr autonomía.'], ['Sesión mensual incluida', 'Una sesión virtual de 60 minutos revisa adopción, resultados y el siguiente avance; se agenda por anticipado y no se acumula.'], ['Otra mirada desde la red', 'Desde la plataforma, el cliente puede solicitar a su distribuidor o a otro consultor de Índice para una perspectiva distinta, según el tema y la disponibilidad.']],
    'Cómo se sostiene la relación', [['Suscripción modular', 'La empresa contrata mensual o anualmente y amplía módulos o usuarios conforme obtiene valor.'], ['Consultoría incluida', 'La suscripción activa incluye una sesión virtual mensual de 60 minutos para sostener la adopción y la cercanía.'], ['Atención adicional', 'Las sesiones extra y la atención presencial se cotizan por separado, sin confundir software con servicios.']],
    'Un cliente activo, acompañado y con una ruta de mejora continua.',
  ),
  partners: section(
    '05 · Distribuidores', 'Una red certificada que vende, implementa y acompaña.',
    'El distribuidor-consultor amplía el alcance comercial de Índice y conserva responsabilidad sobre la adopción: abre la relación, diagnostica, configura, capacita y da seguimiento mensual.',
    'El canal se mide por clientes activos y retenidos.', 'La política del programa exige certificación vigente; la plataforma registra formación, evaluaciones y certificados.',
    'Resumen de su trabajo', [['Abre la relación', 'Prospecta de forma ética, escucha el contexto y agenda la consultoría inicial.'], ['Diagnostica y propone', 'Prioriza el dolor, muestra únicamente el flujo pertinente y define alcance, responsables y siguiente paso.'], ['Implementa y capacita', 'Configura módulos, prepara datos, forma a los responsables y valida el primer flujo real.'], ['Acompaña y retiene', 'Revisa uso y bloqueos cada mes, documenta acuerdos y escala a Índice lo que requiere apoyo especializado.']],
    'Ruta de certificación en la web', [['Formación guiada', 'Siete etapas combinan conocimiento del producto, práctica operativa y método comercial.'], ['Exámenes en línea', 'Cada etapa tiene una evaluación web y la ruta termina con un examen final de competencia consultiva.'], ['Certificado verificable', 'Al aprobar, se genera un PDF con folio, QR, vigencia de 365 días y validación pública.']],
    'Escalar una red certificada sin perder la calidad de implementación ni la cercanía con el cliente.',
  ),
  ai: section(
    '06 · Inteligencia artificial', 'ChatGPT conectado a Índice mediante MCP.',
    'Desde una conversación, el usuario puede consultar información y ejecutar acciones acotadas sobre la operación real de su empresa, siempre dentro de sus permisos.',
    '32 herramientas disponibles hoy.', 'Son 24 de consulta y referencia, más 8 de vista previa y ejecución para cuatro acciones confirmadas; todas respetan permisos y alcance.',
    'Funciones actuales del MCP de ChatGPT', [['Dirección y alertas · 3', 'Ventas del día, panorama ejecutivo y asuntos que requieren atención.'], ['Personas y asistencia · 3', 'Buscar colaboradores, consultar su panorama y detectar excepciones de asistencia.'], ['Tareas y procesos · 4', 'Listar y revisar tareas, además de previsualizar y crear nuevas tareas.'], ['Ventas y caja · 4', 'Consultar resúmenes, listas y detalles de ventas, junto con el estado de caja.'], ['Productos e inventario · 3', 'Buscar productos, consultar detalles y revisar existencias consolidadas.'], ['Gastos · 5', 'Consultar resúmenes, listas y detalles, y crear borradores con vista previa.'], ['Caja chica y tesorería · 6', 'Consultar fondos, registrar gastos y agregar dinero mediante confirmación previa.'], ['Cuentas por cobrar · 1', 'Revisar saldos, vencimientos y situación general de la cartera.'], ['Contexto y referencias · 3', 'Consultar empresa, unidades, negocios y cuentas de pago autorizadas.']],
    'Conexiones y hoja de ruta', [['ChatGPT · Disponible', 'Se conecta mediante una app privada MCP y un inicio de sesión seguro; solo recibe la información autorizada para ese usuario.'], ['Claude · En desarrollo', 'La conexión mediante la misma capa MCP está en desarrollo y todavía no forma parte de la oferta disponible.'], ['Octubre de 2026 · Lanzamiento previsto', 'Está previsto ampliar el catálogo de 32 a cerca de 64 herramientas e incorporar operaciones masivas con vista previa, confirmación y trazabilidad.']],
    'Convertir la conversación en trabajo útil hoy y ampliar el alcance de forma controlada en octubre de 2026.',
  ),
  proforma: section(
    '07 · Proforma de expansión', 'De una cartera local a una red nacional.',
    'El objetivo es formar al menos un distribuidor-consultor por entidad federativa. Con una meta base de $15,000 MXN de nueva facturación mensual, cada cartera conservada se suma a la siguiente.',
    'La recurrencia convierte ritmo local en escala nacional.', 'La simulación produciría $35.1 millones en ventas del año 1 con 30 consultores y $70.2 millones con 60, antes de IVA y bajo los supuestos mostrados.',
    'Ritmos por consultor', [['Ruta $10 mil', 'Añadir $10,000 mensuales cerraría diciembre con $120,000 de cartera y $780,000 vendidos en el año.'], ['Ruta $20 mil', 'Añadir $20,000 mensuales cerraría diciembre con $240,000 de cartera y $1.56 millones vendidos.'], ['Ruta $30 mil', 'Añadir $30,000 mensuales cerraría diciembre con $360,000 de cartera y $2.34 millones vendidos.']],
    'Escala territorial', [['30 consultores', 'Primera cobertura: $35.1 millones en ventas ilustrativas del año 1.'], ['32 entidades', 'Meta territorial: al menos un consultor certificado en cada entidad federativa.'], ['60 consultores', 'Red reforzada: $70.2 millones en ventas ilustrativas del año 1.']],
    'Construir cobertura nacional sin perder la cercanía, la calidad de implementación ni la disciplina financiera.',
  ),
};

const sectionsEn: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · What is Índice?', 'Índice is a modular SaaS business management system.',
    'It brings people, processes, sales, expenses, and finance together in one system. Each area works with shared information and permissions based on its responsibilities.',
    'Each activity is recorded once and updates the business context.', 'The company can start with the modules it needs and expand the platform as it grows.',
    'What it delivers', [['Operational control', 'Shows what is happening, who is responsible, and what needs attention.'], ['Coordinated work', 'Reduces duplicate data entry and reconciliation between disconnected tools.'], ['Data-driven decisions', 'Turns daily operations into tracking, alerts, and up-to-date indicators.']],
    'What we aim to prove', [['Early value', 'Complete a useful workflow during implementation.'], ['Recurring use', 'Make Índice part of the team’s routine.'], ['Sustainable scale', 'Grow without increasing service cost at the same rate.']],
    'Next, the modules that turn this proposal into concrete operations.',
  ),
  modules: section(
    '02 · Modular product', 'Specialized modules sharing one source of truth.',
    'The core includes the dashboard, KPIs, structure, users, security, and billing; operational products activate according to the subscribed offer.',
    'Modular does not mean fragmented.', 'Each area stays specialized while sharing people, catalogues, permissions, and results.',
    'Operational products', [['Human Resources', 'People, attendance, records, assets, permissions, and payroll.'], ['Tasks & Processes', 'Processes, owners, schedules, and compliance.'], ['Expenses & Petty Cash', 'Expenses, budgets, funds, and treasury.'], ['Sales & Inventory', 'Prospects, quotes, sales, warehouses, and stock.'], ['POS & Inventory', 'Checkout, orders, closings, purchasing, and inventory.'], ['Receivables', 'Credit, balances, due dates, and collections.']],
    'Cross-product capabilities', [['Multi-company', 'Operate separate companies without mixing information.'], ['Multi-currency', 'Native operations and consolidated reporting.'], ['Embedded learning', 'Contextual guidance inside the product.']],
    'Focus commercial entry on repeatable, urgent pain.',
  ),
  market: section(
    '03 · Target market', 'A broad market approached through focused segments.',
    'SMBs coordinating sales, inventory, collections, expenses, and teams through spreadsheets and disconnected tools.',
    'Segment by operational pain.', 'The best prospect understands the cost of reconciling information and has an internal change owner.',
    'Priority profiles', [['Companies with 10–30 employees', 'Growing businesses whose processes are outgrowing manual controls and need structure to keep scaling.'], ['Teams with scattered information', 'Companies managing sales, expenses, inventory, and tasks across separate tools that need a connected operation.'], ['Operations dependent on key people', 'Businesses that need to delegate responsibilities and standardize processes without losing visibility or control.']],
    'Fit signals', [['Growth inflection point', 'Businesses with 10–30 employees whose workload has outgrown spreadsheets, chats, and manual follow-up.'], ['Operational friction', 'Fragmented information, duplicate work, and delays now affect service, sales, or cash flow.'], ['Key-person dependency', 'Daily operations rely on a few people and knowledge that has not yet been documented.']],
    'Move first on companies where the cost of disorder already outweighs the effort required to implement Índice.',
  ),
  business: section(
    '04 · Business model', 'From first contact to ongoing support.',
    'Índice reaches customers through consultative selling: it listens and diagnoses first, then implements a priority solution and maintains a monthly relationship focused on adoption and outcomes.',
    'The sale begins by creating clarity and continues by proving value.', 'The first session should help prospects understand their business better, even if they are not ready to buy.',
    'Customer journey', [['Contact and trust', 'We learn about the company, its size, and the operation under the most pressure. The goal is to listen and agree on the next conversation, not present every module.'], ['Free initial consultation', 'In 60 to 90 minutes, we map People, Processes, Products, and Finance, prioritize the pain point, and show only the relevant solution.'], ['Focused implementation', 'After scope and purchase are agreed, we configure the modules, train the owners, and validate a first real workflow.'], ['Consultant follow-up', 'The assigned consultant reviews usage, open items, and blockers, documents agreements, and supports the team until it becomes autonomous.'], ['Included monthly session', 'A 60-minute virtual session reviews adoption, outcomes, and the next advance; it is scheduled in advance and does not roll over.'], ['Another perspective from the network', 'From the platform, customers can request their distributor or another Índice consultant for a different perspective, based on topic and availability.']],
    'How the relationship is sustained', [['Modular subscription', 'The company subscribes monthly or annually and expands modules or users as it gains value.'], ['Included consulting', 'An active subscription includes one 60-minute virtual session each month to sustain adoption and a close relationship.'], ['Additional support', 'Extra sessions and in-person service are quoted separately, keeping software and services distinct.']],
    'An active, supported customer with a continuous-improvement path.',
  ),
  partners: section(
    '05 · Distributors', 'A certified network that sells, implements, and supports.',
    'The consulting distributor expands Índice’s commercial reach while remaining accountable for adoption: opening the relationship, diagnosing, configuring, training, and following up each month.',
    'The channel is measured by active, retained customers.', 'Program policy requires current certification; the platform records training, assessments, and certificates.',
    'Summary of their work', [['Open the relationship', 'Prospect ethically, listen to the context, and schedule the initial consultation.'], ['Diagnose and propose', 'Prioritize the pain point, show only the relevant workflow, and define scope, owners, and the next step.'], ['Implement and train', 'Configure modules, prepare data, train owners, and validate the first real workflow.'], ['Support and retain', 'Review usage and blockers each month, document agreements, and escalate issues requiring specialist Índice support.']],
    'Web certification pathway', [['Guided training', 'Seven stages combine product knowledge, operational practice, and the commercial method.'], ['Online exams', 'Each stage has a web assessment, and the pathway ends with a final consulting competency exam.'], ['Verifiable certificate', 'Passing generates a PDF with a certificate number, QR code, 365-day validity, and public verification.']],
    'Scale a certified network without losing implementation quality or customer closeness.',
  ),
  ai: section(
    '06 · Artificial intelligence', 'ChatGPT connected to Índice through MCP.',
    'From a conversation, users can query information and perform bounded actions on their company’s real operations, always within their permissions.',
    '32 tools available today.', 'They include 24 query and reference tools plus 8 preview and execution steps for four confirmed actions; all respect permissions and scope.',
    'Current ChatGPT MCP functions', [['Leadership and alerts · 3', 'Today’s sales, executive business snapshot, and items requiring attention.'], ['People and attendance · 3', 'Search employees, view their overview, and detect attendance exceptions.'], ['Tasks and processes · 4', 'List and inspect tasks, then preview and create new tasks.'], ['Sales and cash · 4', 'Review sales summaries, lists, and details together with cash status.'], ['Products and inventory · 3', 'Search products, view details, and review consolidated stock.'], ['Expenses · 5', 'Review summaries, lists, and details, and create drafts with a preview.'], ['Petty cash and treasury · 6', 'Review funds, record fund expenses, and add money with prior confirmation.'], ['Receivables · 1', 'Review balances, due dates, and the overall receivables position.'], ['Context and references · 3', 'Review the authorized company, units, businesses, and payment accounts.']],
    'Connections and roadmap', [['ChatGPT · Available', 'Connects through a private MCP app and secure sign-in; it receives only information authorized for that user.'], ['Claude · In development', 'A connection through the same MCP layer is in development and is not yet part of the available offer.'], ['October 2026 · Planned release', 'The planned release expands the catalogue from 32 to roughly 64 tools and adds bulk operations with preview, confirmation, and traceability.']],
    'Turn conversation into useful work today and expand its reach in a controlled way in October 2026.',
  ),
  proforma: section(
    '07 · Expansion pro forma', 'From a local portfolio to a national network.',
    'The goal is to train at least one consulting distributor per federal entity. With a base target of MXN 15,000 in new monthly billing, every retained portfolio adds to the next one.',
    'Recurring revenue turns local pace into national scale.', 'The simulation would produce MXN 35.1 million in year-one sales with 30 consultants and MXN 70.2 million with 60, before VAT and under the assumptions shown.',
    'Consultant paces', [['MXN 10k path', 'Adding MXN 10,000 monthly would close December with a MXN 120,000 portfolio and MXN 780,000 sold during the year.'], ['MXN 20k path', 'Adding MXN 20,000 monthly would close December with a MXN 240,000 portfolio and MXN 1.56 million sold.'], ['MXN 30k path', 'Adding MXN 30,000 monthly would close December with a MXN 360,000 portfolio and MXN 2.34 million sold.']],
    'Territorial scale', [['30 consultants', 'Initial coverage: MXN 35.1 million in illustrative year-one sales.'], ['32 entities', 'Territorial goal: at least one certified consultant in every federal entity.'], ['60 consultants', 'Reinforced network: MXN 70.2 million in illustrative year-one sales.']],
    'Build national coverage without losing closeness, implementation quality, or financial discipline.',
  ),
};

const sectionsFr: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · Qu’est-ce qu’Índice?', 'Índice est un système SaaS modulaire de gestion d’entreprise.',
    'Il relie dans un même système les personnes, les processus, les ventes, les dépenses et les finances. Chaque domaine travaille avec de l’information partagée et des autorisations adaptées à ses responsabilités.',
    'Chaque activité est enregistrée une seule fois et actualise le contexte de l’entreprise.', 'L’entreprise peut commencer avec les modules dont elle a besoin et élargir la plateforme à mesure qu’elle grandit.',
    'Ce qu’il apporte', [['Contrôle opérationnel', 'Permet de savoir ce qui se passe, qui en est responsable et ce qui requiert une attention.'], ['Travail coordonné', 'Réduit les saisies en double et les rapprochements entre des outils isolés.'], ['Décisions fondées sur les données', 'Transforme les activités quotidiennes en suivi, en alertes et en indicateurs à jour.']],
    'Ce que nous voulons démontrer', [['Valeur rapide', 'Terminer un flux utile pendant la mise en œuvre.'], ['Usage récurrent', 'Intégrer Índice à la routine de l’équipe.'], ['Croissance durable', 'Croître sans augmenter le coût de service au même rythme.']],
    'Voici maintenant les modules qui transforment cette proposition en opérations concrètes.',
  ),
  modules: section(
    '02 · Produit modulaire', 'Des modules spécialisés reposant sur une source de vérité commune.',
    'Le noyau comprend le tableau de bord, les KPI, la structure, les utilisateurs, la sécurité et la facturation; les produits opérationnels sont activés selon l’offre.',
    'Modulaire ne signifie pas fragmenté.', 'Chaque domaine conserve sa spécialité tout en partageant les personnes, les catalogues, les autorisations et les résultats.',
    'Produits opérationnels', [['Ressources humaines', 'Collaborateurs, présence, dossiers, actifs, autorisations et paie.'], ['Tâches et processus', 'Processus, responsables, calendrier et conformité.'], ['Dépenses et petite caisse', 'Dépenses, budgets, fonds et trésorerie.'], ['Ventes et stocks', 'Prospects, soumissions, ventes, entrepôts et stocks.'], ['PDV et stocks', 'Caisse, commandes, clôtures, achats et stocks.'], ['Comptes clients', 'Crédit, soldes, échéances et recouvrement.']],
    'Capacités transversales', [['Multientreprise', 'Exploiter différentes entreprises sans mélanger leurs données.'], ['Multidevise', 'Opérations natives et lecture consolidée.'], ['Apprentissage intégré', 'Guides contextuels dans le produit.']],
    'Concentrer l’entrée commerciale sur des problèmes urgents et reproductibles.',
  ),
  market: section(
    '03 · Marché cible', 'Un vaste marché abordé par des segments précis.',
    'Des PME qui coordonnent les ventes, les stocks, le recouvrement, les dépenses et les équipes à l’aide de feuilles de calcul et d’outils isolés.',
    'Segmenter selon la douleur opérationnelle.', 'Le meilleur prospect comprend le coût du rapprochement de l’information et dispose d’un responsable interne du changement.',
    'Profils prioritaires', [['Entreprises de 10 à 30 employés', 'Des entreprises en croissance dont les processus dépassent le contrôle manuel et qui ont besoin d’une structure pour poursuivre leur expansion.'], ['Équipes aux informations dispersées', 'Des entreprises qui gèrent les ventes, les dépenses, les stocks et les tâches dans des outils distincts et qui ont besoin d’une gestion intégrée.'], ['Opérations dépendantes de personnes clés', 'Des entreprises qui doivent déléguer les responsabilités et standardiser leurs processus sans perdre en visibilité ni en contrôle.']],
    'Signaux d’adéquation', [['Croissance charnière', 'Entreprises de 10 à 30 employés dont la charge de travail dépasse désormais les feuilles de calcul, la messagerie et les suivis manuels.'], ['Friction opérationnelle', 'L’information dispersée, le travail en double et les retards nuisent déjà au service, aux ventes ou aux liquidités.'], ['Dépendance envers des personnes clés', 'Les activités quotidiennes reposent sur quelques personnes et sur un savoir qui n’est pas encore documenté.']],
    'Cibler d’abord les entreprises où le coût du désordre dépasse déjà l’effort requis pour implanter Índice.',
  ),
  business: section(
    '04 · Modèle d’affaires', 'Du premier contact à un accompagnement continu.',
    'Índice rejoint ses clients par une démarche-conseil : écouter et diagnostiquer d’abord, puis mettre en œuvre une solution prioritaire et maintenir une relation mensuelle axée sur l’adoption et les résultats.',
    'La vente commence par apporter de la clarté et se poursuit en démontrant la valeur.', 'La première séance doit aider le prospect à mieux comprendre son entreprise, même s’il n’est pas encore prêt à acheter.',
    'Parcours client', [['Contact et confiance', 'Nous découvrons l’entreprise, sa taille et l’activité la plus débordée. L’objectif est d’écouter et de convenir du prochain échange, pas de présenter tous les modules.'], ['Consultation initiale sans frais', 'En 60 à 90 minutes, nous cartographions les Personnes, les Processus, les Produits et les Finances, priorisons le problème et présentons seulement la solution pertinente.'], ['Mise en œuvre ciblée', 'Après avoir défini la portée et conclu l’abonnement, nous configurons les modules, formons les responsables et validons un premier flux réel.'], ['Suivi par le consultant', 'Le consultant attitré examine l’utilisation, les tâches en attente et les obstacles, documente les ententes et accompagne l’équipe vers l’autonomie.'], ['Séance mensuelle incluse', 'Une séance virtuelle de 60 minutes examine l’adoption, les résultats et la prochaine avancée; elle est planifiée à l’avance et ne se cumule pas.'], ['Un autre regard du réseau', 'Depuis la plateforme, le client peut demander son distributeur ou un autre consultant Índice pour une perspective différente, selon le sujet et les disponibilités.']],
    'Comment la relation se maintient', [['Abonnement modulaire', 'L’entreprise souscrit mensuellement ou annuellement et ajoute des modules ou des utilisateurs à mesure qu’elle obtient de la valeur.'], ['Consultation incluse', 'Un abonnement actif inclut une séance virtuelle mensuelle de 60 minutes pour soutenir l’adoption et la proximité.'], ['Accompagnement additionnel', 'Les séances supplémentaires et le service en personne sont facturés séparément afin de distinguer le logiciel des services.']],
    'Un client actif, accompagné et engagé dans une démarche d’amélioration continue.',
  ),
  partners: section(
    '05 · Distributeurs', 'Un réseau certifié qui vend, met en œuvre et accompagne.',
    'Le distributeur-conseil étend la portée commerciale d’Índice tout en restant responsable de l’adoption : il ouvre la relation, diagnostique, configure, forme et effectue le suivi mensuel.',
    'Le canal se mesure par des clients actifs et fidélisés.', 'La politique du programme exige une certification valide; la plateforme consigne la formation, les évaluations et les certificats.',
    'Résumé de son travail', [['Ouvrir la relation', 'Prospecter de façon éthique, écouter le contexte et planifier la consultation initiale.'], ['Diagnostiquer et proposer', 'Prioriser le problème, présenter uniquement le flux pertinent et définir la portée, les responsables et la prochaine étape.'], ['Mettre en œuvre et former', 'Configurer les modules, préparer les données, former les responsables et valider le premier flux réel.'], ['Accompagner et fidéliser', 'Examiner chaque mois l’utilisation et les blocages, documenter les ententes et transmettre à Índice ce qui exige un soutien spécialisé.']],
    'Parcours de certification en ligne', [['Formation guidée', 'Sept étapes réunissent la connaissance du produit, la pratique opérationnelle et la méthode commerciale.'], ['Examens en ligne', 'Chaque étape comporte une évaluation Web et le parcours se termine par un examen final de compétence-conseil.'], ['Certificat vérifiable', 'La réussite génère un PDF avec numéro, code QR, validité de 365 jours et validation publique.']],
    'Développer un réseau certifié sans perdre la qualité de mise en œuvre ni la proximité client.',
  ),
  ai: section(
    '06 · Intelligence artificielle', 'ChatGPT connecté à Índice par MCP.',
    'Depuis une conversation, l’utilisateur peut consulter de l’information et exécuter des actions limitées sur les opérations réelles de son entreprise, toujours selon ses autorisations.',
    '32 outils disponibles aujourd’hui.', 'Ils comprennent 24 outils de consultation et de référence, plus 8 étapes d’aperçu et d’exécution pour quatre actions confirmées; tous respectent les autorisations et la portée.',
    'Fonctions MCP actuelles de ChatGPT', [['Direction et alertes · 3', 'Ventes du jour, portrait exécutif et éléments qui exigent une attention.'], ['Personnel et présence · 3', 'Rechercher des employés, consulter leur portrait et détecter les exceptions de présence.'], ['Tâches et processus · 4', 'Lister et examiner les tâches, puis prévisualiser et créer de nouvelles tâches.'], ['Ventes et caisse · 4', 'Consulter les résumés, listes et détails des ventes ainsi que l’état de caisse.'], ['Produits et stocks · 3', 'Rechercher des produits, consulter les détails et vérifier les stocks consolidés.'], ['Dépenses · 5', 'Consulter résumés, listes et détails, puis créer des brouillons avec aperçu.'], ['Petite caisse et trésorerie · 6', 'Consulter les fonds, enregistrer des dépenses et ajouter de l’argent avec confirmation préalable.'], ['Comptes clients · 1', 'Examiner les soldes, les échéances et la situation globale des comptes clients.'], ['Contexte et références · 3', 'Consulter l’entreprise, les unités, les activités et les comptes de paiement autorisés.']],
    'Connexions et feuille de route', [['ChatGPT · Disponible', 'Connexion par une application MCP privée et une authentification sécurisée; seules les informations autorisées pour cet utilisateur sont transmises.'], ['Claude · En développement', 'La connexion par la même couche MCP est en développement et ne fait pas encore partie de l’offre disponible.'], ['Octobre 2026 · Lancement prévu', 'Le lancement prévu porte le catalogue de 32 à environ 64 outils et ajoute des opérations en lot avec aperçu, confirmation et traçabilité.']],
    'Transformer la conversation en travail utile dès maintenant et élargir sa portée de façon contrôlée en octobre 2026.',
  ),
  proforma: section(
    '07 · Pro forma d’expansion', 'D’un portefeuille local à un réseau national.',
    'L’objectif est de former au moins un distributeur-conseil par entité fédérée. Avec une cible de base de 15 000 MXN de nouvelle facturation mensuelle, chaque portefeuille conservé s’ajoute au suivant.',
    'Les revenus récurrents transforment le rythme local en échelle nationale.', 'La simulation produirait 35,1 millions MXN de ventes la première année avec 30 conseillers et 70,2 millions avec 60, avant TVA et selon les hypothèses présentées.',
    'Rythmes par conseiller', [['Parcours 10 k MXN', 'Ajouter 10 000 MXN par mois mènerait à un portefeuille de 120 000 MXN en décembre et à 780 000 MXN vendus sur l’année.'], ['Parcours 20 k MXN', 'Ajouter 20 000 MXN par mois mènerait à un portefeuille de 240 000 MXN et à 1,56 million MXN vendus.'], ['Parcours 30 k MXN', 'Ajouter 30 000 MXN par mois mènerait à un portefeuille de 360 000 MXN et à 2,34 millions MXN vendus.']],
    'Échelle territoriale', [['30 conseillers', 'Couverture initiale : 35,1 millions MXN de ventes illustratives la première année.'], ['32 entités', 'Objectif territorial : au moins un conseiller certifié dans chaque entité fédérée.'], ['60 conseillers', 'Réseau renforcé : 70,2 millions MXN de ventes illustratives la première année.']],
    'Construire une couverture nationale sans perdre la proximité, la qualité de mise en œuvre ni la discipline financière.',
  ),
};

const sectionsPt: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · O que é o Índice?', 'Índice é um sistema SaaS modular de gestão empresarial.',
    'Conecta pessoas, processos, vendas, despesas e finanças em um único sistema. Cada área trabalha com informações compartilhadas e permissões de acordo com sua responsabilidade.',
    'Cada atividade é registrada uma única vez e atualiza o contexto do negócio.', 'A empresa pode começar com os módulos de que precisa e ampliar a plataforma à medida que cresce.',
    'O que oferece', [['Controle operacional', 'Permite saber o que está acontecendo, quem é responsável e o que requer atenção.'], ['Trabalho coordenado', 'Reduz lançamentos duplicados e a conciliação entre ferramentas isoladas.'], ['Decisões baseadas em dados', 'Transforma a operação diária em acompanhamento, alertas e indicadores atualizados.']],
    'O que buscamos demonstrar', [['Valor inicial', 'Concluir um fluxo útil durante a implementação.'], ['Uso recorrente', 'Incorporar o Índice à rotina da equipe.'], ['Escala sustentável', 'Crescer sem elevar o custo de atendimento na mesma proporção.']],
    'A seguir, os módulos que transformam esta proposta em operações concretas.',
  ),
  modules: section(
    '02 · Produto modular', 'Módulos especializados sobre uma única fonte de verdade.',
    'O núcleo inclui painel, KPIs, estrutura, usuários, segurança e faturamento; os produtos operacionais são ativados conforme a oferta.',
    'Modular não significa fragmentado.', 'Cada área preserva sua especialidade e compartilha pessoas, catálogos, permissões e resultados.',
    'Produtos operacionais', [['Recursos Humanos', 'Colaboradores, frequência, prontuários, ativos, permissões e folha de pagamento.'], ['Tarefas e Processos', 'Processos, responsáveis, agenda e conformidade.'], ['Despesas e Caixa Pequeno', 'Despesas, orçamentos, fundos e tesouraria.'], ['Vendas e Estoques', 'Prospectos, cotações, vendas, armazéns e existências.'], ['PDV e Estoques', 'Caixa, pedidos, fechamentos, compras e estoque.'], ['Contas a receber', 'Crédito, saldos, vencimentos e cobranças.']],
    'Capacidades transversais', [['Multiempresa', 'Operar empresas diferentes sem misturar informações.'], ['Multimoeda', 'Operação nativa e visão consolidada.'], ['Aprendizagem integrada', 'Guias contextuais dentro do produto.']],
    'Concentrar a entrada comercial em dores repetíveis e urgentes.',
  ),
  market: section(
    '03 · Mercado-alvo', 'Um mercado amplo, abordado por segmentos concretos.',
    'PMEs que coordenam vendas, estoque, cobranças, despesas e equipes por meio de planilhas e ferramentas isoladas.',
    'Segmentar pela dor operacional.', 'O melhor prospect reconhece o custo de conciliar informações e conta com um líder interno para a mudança.',
    'Perfis prioritários', [['Empresas com 10 a 30 colaboradores', 'Negócios em expansão cujos processos estão superando os controles manuais e precisam de estrutura para continuar crescendo.'], ['Equipes com informações dispersas', 'Empresas que gerenciam vendas, despesas, estoque e tarefas em ferramentas separadas e precisam de uma operação integrada.'], ['Operações dependentes de pessoas-chave', 'Negócios que precisam delegar responsabilidades e padronizar processos sem perder visibilidade nem controle.']],
    'Sinais de aderência', [['Ponto de virada do crescimento', 'Empresas com 10 a 30 colaboradores cujo volume já ultrapassou planilhas, mensagens e acompanhamentos manuais.'], ['Fricção operacional', 'Informações dispersas, trabalho duplicado e atrasos já afetam atendimento, vendas ou caixa.'], ['Dependência de pessoas-chave', 'A operação depende de poucas pessoas e de conhecimento ainda não documentado.']],
    'Avançar primeiro com empresas em que o custo da desorganização já supera o esforço para implantar o Índice.',
  ),
  business: section(
    '04 · Modelo de negócio', 'Do primeiro contato ao acompanhamento contínuo.',
    'A Índice chega ao cliente por meio de uma venda consultiva: primeiro escuta e diagnostica, depois implementa uma solução prioritária e mantém uma relação mensal focada em adoção e resultados.',
    'A venda começa oferecendo clareza e continua demonstrando valor.', 'A primeira sessão deve ajudar o prospect a compreender melhor sua empresa, mesmo que ainda não esteja pronto para comprar.',
    'Jornada do cliente', [['Contato e confiança', 'Conhecemos a empresa, seu porte e a operação que mais está sob pressão. O objetivo é escutar e combinar a próxima conversa, não apresentar todos os módulos.'], ['Consultoria inicial sem custo', 'Em 60 a 90 minutos, mapeamos Pessoas, Processos, Produtos e Finanças, priorizamos a dor e mostramos somente a solução pertinente.'], ['Implementação focada', 'Depois de definir o escopo e contratar, configuramos os módulos, capacitamos os responsáveis e validamos um primeiro fluxo real.'], ['Acompanhamento do consultor', 'O consultor responsável revisa uso, pendências e obstáculos, documenta acordos e acompanha a equipe até que ela ganhe autonomia.'], ['Sessão mensal incluída', 'Uma sessão virtual de 60 minutos revisa adoção, resultados e o próximo avanço; é agendada com antecedência e não se acumula.'], ['Outra perspectiva da rede', 'Pela plataforma, o cliente pode solicitar seu distribuidor ou outro consultor da Índice para obter uma perspectiva diferente, conforme o tema e a disponibilidade.']],
    'Como a relação se sustenta', [['Assinatura modular', 'A empresa contrata mensal ou anualmente e amplia módulos ou usuários conforme obtém valor.'], ['Consultoria incluída', 'A assinatura ativa inclui uma sessão virtual mensal de 60 minutos para sustentar a adoção e a proximidade.'], ['Atendimento adicional', 'Sessões extras e atendimento presencial são cotados separadamente, mantendo software e serviços distintos.']],
    'Um cliente ativo, acompanhado e com uma jornada de melhoria contínua.',
  ),
  partners: section(
    '05 · Distribuidores', 'Uma rede certificada que vende, implementa e acompanha.',
    'O distribuidor consultor amplia o alcance comercial da Índice e continua responsável pela adoção: abre o relacionamento, diagnostica, configura, capacita e acompanha mensalmente.',
    'O canal é medido por clientes ativos e retidos.', 'A política do programa exige certificação vigente; a plataforma registra treinamento, avaliações e certificados.',
    'Resumo do trabalho', [['Abrir o relacionamento', 'Prospectar de forma ética, ouvir o contexto e agendar a consultoria inicial.'], ['Diagnosticar e propor', 'Priorizar a dor, mostrar apenas o fluxo pertinente e definir escopo, responsáveis e próximo passo.'], ['Implementar e capacitar', 'Configurar módulos, preparar dados, treinar responsáveis e validar o primeiro fluxo real.'], ['Acompanhar e reter', 'Revisar uso e bloqueios mensalmente, documentar acordos e escalar à Índice o que exige apoio especializado.']],
    'Trilha de certificação na web', [['Treinamento guiado', 'Sete etapas combinam conhecimento do produto, prática operacional e método comercial.'], ['Exames on-line', 'Cada etapa tem uma avaliação na web e a trilha termina com um exame final de competência consultiva.'], ['Certificado verificável', 'A aprovação gera um PDF com número, QR, validade de 365 dias e verificação pública.']],
    'Escalar uma rede certificada sem perder a qualidade da implementação nem a proximidade com o cliente.',
  ),
  ai: section(
    '06 · Inteligência artificial', 'ChatGPT conectado ao Índice por MCP.',
    'A partir de uma conversa, o usuário pode consultar informações e executar ações limitadas sobre a operação real da empresa, sempre dentro de suas permissões.',
    '32 ferramentas disponíveis hoje.', 'São 24 ferramentas de consulta e referência, mais 8 etapas de pré-visualização e execução para quatro ações confirmadas; todas respeitam permissões e escopo.',
    'Funções atuais do MCP no ChatGPT', [['Gestão e alertas · 3', 'Vendas do dia, panorama executivo e assuntos que exigem atenção.'], ['Pessoas e frequência · 3', 'Buscar colaboradores, consultar seu panorama e detectar exceções de frequência.'], ['Tarefas e processos · 4', 'Listar e revisar tarefas, além de visualizar e criar novas tarefas.'], ['Vendas e caixa · 4', 'Consultar resumos, listas e detalhes de vendas junto com o status do caixa.'], ['Produtos e estoque · 3', 'Buscar produtos, consultar detalhes e revisar o estoque consolidado.'], ['Despesas · 5', 'Consultar resumos, listas e detalhes e criar rascunhos com pré-visualização.'], ['Caixa pequeno e tesouraria · 6', 'Consultar fundos, registrar despesas e adicionar dinheiro com confirmação prévia.'], ['Contas a receber · 1', 'Revisar saldos, vencimentos e a situação geral das contas a receber.'], ['Contexto e referências · 3', 'Consultar empresa, unidades, negócios e contas de pagamento autorizadas.']],
    'Conexões e roteiro', [['ChatGPT · Disponível', 'Conecta-se por um aplicativo MCP privado e login seguro; recebe apenas as informações autorizadas para esse usuário.'], ['Claude · Em desenvolvimento', 'A conexão pela mesma camada MCP está em desenvolvimento e ainda não faz parte da oferta disponível.'], ['Outubro de 2026 · Lançamento previsto', 'O lançamento previsto amplia o catálogo de 32 para cerca de 64 ferramentas e incorpora operações em massa com pré-visualização, confirmação e rastreabilidade.']],
    'Transformar a conversa em trabalho útil hoje e ampliar seu alcance de forma controlada em outubro de 2026.',
  ),
  proforma: section(
    '07 · Pro forma de expansão', 'De uma carteira local a uma rede nacional.',
    'O objetivo é formar ao menos um distribuidor-consultor por entidade federativa. Com uma meta base de MXN 15.000 em novo faturamento mensal, cada carteira mantida se soma à seguinte.',
    'A recorrência transforma ritmo local em escala nacional.', 'A simulação produziria MXN 35,1 milhões em vendas no primeiro ano com 30 consultores e MXN 70,2 milhões com 60, antes do IVA e sob as premissas apresentadas.',
    'Ritmos por consultor', [['Rota MXN 10 mil', 'Adicionar MXN 10.000 por mês encerraria dezembro com carteira de MXN 120.000 e MXN 780.000 vendidos no ano.'], ['Rota MXN 20 mil', 'Adicionar MXN 20.000 por mês encerraria dezembro com carteira de MXN 240.000 e MXN 1,56 milhão vendidos.'], ['Rota MXN 30 mil', 'Adicionar MXN 30.000 por mês encerraria dezembro com carteira de MXN 360.000 e MXN 2,34 milhões vendidos.']],
    'Escala territorial', [['30 consultores', 'Cobertura inicial: MXN 35,1 milhões em vendas ilustrativas no primeiro ano.'], ['32 entidades', 'Meta territorial: ao menos um consultor certificado em cada entidade federativa.'], ['60 consultores', 'Rede reforçada: MXN 70,2 milhões em vendas ilustrativas no primeiro ano.']],
    'Construir cobertura nacional sem perder proximidade, qualidade de implementação ou disciplina financeira.',
  ),
};

const sectionsKo: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · Índice란?', 'Índice는 모듈형 SaaS 기업 관리 시스템입니다.',
    '인력, 프로세스, 영업, 비용 및 재무를 하나의 시스템으로 연결합니다. 각 부서는 공유 정보를 활용하며 담당 업무에 따른 권한을 가집니다.',
    '각 활동은 한 번만 기록되며 기업 운영의 전체 맥락을 최신 상태로 유지합니다.', '기업은 필요한 모듈부터 시작해 성장에 따라 플랫폼을 확장할 수 있습니다.',
    '제공 가치', [['운영 관리', '현재 상황, 담당자, 주의가 필요한 항목을 파악할 수 있습니다.'], ['업무 조율', '중복 입력과 서로 분리된 도구 간 대조 작업을 줄입니다.'], ['데이터 기반 의사결정', '일상 운영을 추적 정보, 알림 및 최신 지표로 전환합니다.']],
    '입증하려는 것', [['초기 가치', '구현 중 유용한 워크플로 하나를 완료합니다.'], ['반복 사용', 'Índice를 팀의 일상 업무에 정착시킵니다.'], ['지속 가능한 확장', '서비스 비용이 같은 비율로 증가하지 않도록 성장합니다.']],
    '다음은 이 제안을 구체적인 운영으로 전환하는 모듈입니다.',
  ),
  modules: section(
    '02 · 모듈형 제품', '하나의 신뢰할 수 있는 데이터 원천을 공유하는 전문 모듈.',
    '핵심 영역에는 대시보드, KPI, 조직 구조, 사용자, 보안 및 청구가 포함되며 운영 제품은 선택한 상품에 따라 활성화됩니다.',
    '모듈형은 분절을 의미하지 않습니다.', '각 영역은 전문성을 유지하면서 사람, 카탈로그, 권한 및 결과를 공유합니다.',
    '운영 제품', [['인사 관리', '임직원, 근태, 인사 기록, 자산, 권한 및 급여.'], ['업무 및 프로세스', '프로세스, 책임자, 일정 및 준수 현황.'], ['비용 및 소액 현금', '비용, 예산, 자금 및 자금 관리.'], ['영업 및 재고', '잠재고객, 견적, 판매, 창고 및 재고.'], ['POS 및 재고', '결제, 주문, 마감, 구매 및 재고.'], ['매출채권', '신용, 잔액, 만기 및 수금.']],
    '공통 기능', [['다중 회사', '정보를 섞지 않고 여러 회사를 운영합니다.'], ['다중 통화', '통화별 운영과 통합 조회를 지원합니다.'], ['통합 학습', '제품 안에서 맥락에 맞는 안내를 제공합니다.']],
    '반복적이고 긴급한 운영 문제에 영업 진입점을 집중합니다.',
  ),
  market: section(
    '03 · 목표 시장', '구체적인 세그먼트로 접근하는 폭넓은 시장.',
    '스프레드시트와 분리된 도구로 영업, 재고, 수금, 비용 및 팀을 관리하는 중소기업입니다.',
    '운영상의 문제를 기준으로 세분화합니다.', '가장 적합한 잠재고객은 정보 대조 비용을 이해하고 변화를 이끌 내부 책임자를 두고 있습니다.',
    '우선 공략 대상', [['직원 10~30명 규모의 기업', '성장 과정에서 수작업 관리만으로는 프로세스를 감당하기 어려워져, 지속적인 확장을 위한 체계가 필요한 기업입니다.'], ['정보가 분산된 팀', '영업, 비용, 재고, 업무를 서로 다른 도구로 관리해 통합 운영이 필요한 기업입니다.'], ['핵심 인력 의존도가 높은 조직', '가시성과 통제력을 유지하면서 책임을 위임하고 프로세스를 표준화해야 하는 기업입니다.']],
    '적합성 신호', [['성장 전환점', '직원 10~30명 규모로, 업무량이 스프레드시트·메신저·수작업 추적만으로 감당하기 어려운 기업입니다.'], ['운영 마찰', '흩어진 정보, 중복 업무, 지연이 이미 고객 서비스, 매출 또는 현금 흐름에 영향을 주고 있습니다.'], ['핵심 인력 의존', '일상 운영이 소수 인력과 아직 문서화되지 않은 노하우에 의존하고 있습니다.']],
    '운영 혼란의 비용이 Índice 도입 노력보다 이미 큰 기업부터 공략합니다.',
  ),
  business: section(
    '04 · 비즈니스 모델', '첫 접점부터 지속적인 동행까지.',
    'Índice는 컨설팅형 영업으로 고객에게 다가갑니다. 먼저 경청하고 진단한 뒤 우선 과제를 구현하며, 도입과 성과를 중심으로 매월 관계를 이어 갑니다.',
    '영업은 명확성을 제공하는 데서 시작해 가치 입증으로 이어집니다.', '첫 세션은 구매 여부와 관계없이 잠재 고객이 자신의 회사를 더 잘 이해하도록 도와야 합니다.',
    '고객 여정', [['접촉과 신뢰', '회사의 규모와 가장 과부하된 운영 영역을 파악합니다. 모든 모듈을 소개하기보다 경청하고 다음 대화를 약속하는 것이 목적입니다.'], ['무료 초기 컨설팅', '60~90분 동안 인력, 프로세스, 제품, 재무를 파악하고 핵심 문제를 우선순위화한 뒤 관련 솔루션만 보여 줍니다.'], ['집중 구현', '범위와 계약을 확정한 뒤 모듈을 설정하고 담당자를 교육하며 첫 실제 업무 흐름을 검증합니다.'], ['담당 컨설턴트 후속 지원', '담당 컨설턴트가 사용 현황, 미해결 과제와 장애물을 검토하고 합의 사항을 기록하며 팀이 자립할 때까지 지원합니다.'], ['포함된 월간 세션', '60분 화상 세션에서 도입, 성과와 다음 진전을 검토합니다. 미리 예약하며 다음 달로 이월되지 않습니다.'], ['네트워크의 다른 관점', '고객은 플랫폼에서 주제와 일정에 따라 자신의 유통 파트너나 다른 Índice 컨설턴트를 요청해 새로운 관점을 얻을 수 있습니다.']],
    '관계를 지속하는 방식', [['모듈형 구독', '회사는 월간 또는 연간으로 구독하고 가치를 확인하면서 모듈이나 사용자를 확장합니다.'], ['포함된 컨설팅', '활성 구독에는 도입과 긴밀한 관계를 유지하기 위한 월 1회 60분 화상 세션이 포함됩니다.'], ['추가 지원', '추가 세션과 대면 서비스는 별도로 견적을 제공해 소프트웨어와 서비스를 구분합니다.']],
    '지속적인 개선 경로를 갖춘, 활발히 사용하고 지원받는 고객.',
  ),
  partners: section(
    '05 · 유통 파트너', '판매, 구현, 지원을 수행하는 인증 네트워크.',
    '컨설팅 유통 파트너는 Índice의 영업 범위를 넓히면서 도입에 대한 책임을 유지합니다. 관계를 시작하고 진단, 설정, 교육 및 월간 후속 지원을 수행합니다.',
    '채널은 활성 고객과 유지 고객으로 평가합니다.', '프로그램 정책상 유효한 인증이 필요하며, 플랫폼은 교육, 평가 및 인증서를 기록합니다.',
    '업무 요약', [['관계 시작', '윤리적으로 잠재고객을 발굴하고 상황을 경청한 뒤 초기 컨설팅을 예약합니다.'], ['진단 및 제안', '핵심 문제를 우선순위화하고 관련 업무 흐름만 보여 주며 범위, 담당자와 다음 단계를 정합니다.'], ['구현 및 교육', '모듈을 설정하고 데이터를 준비하며 담당자를 교육하고 첫 실제 업무 흐름을 검증합니다.'], ['지원 및 유지', '매월 사용 현황과 장애물을 검토하고 합의를 기록하며 전문 지원이 필요한 사안을 Índice에 전달합니다.']],
    '웹 인증 과정', [['단계별 교육', '7개 단계에서 제품 지식, 운영 실습 및 영업 방법론을 결합합니다.'], ['온라인 시험', '각 단계에 웹 평가가 있으며 과정은 최종 컨설팅 역량 시험으로 마무리됩니다.'], ['검증 가능한 인증서', '합격하면 인증 번호, QR, 365일 유효 기간 및 공개 검증 기능을 갖춘 PDF가 발급됩니다.']],
    '구현 품질과 고객과의 긴밀한 관계를 유지하면서 인증 네트워크를 확장합니다.',
  ),
  ai: section(
    '06 · 인공지능', 'MCP를 통해 Índice에 연결된 ChatGPT.',
    '사용자는 대화에서 자신의 권한 범위 안에서 회사의 실제 운영 정보를 조회하고 제한된 작업을 실행할 수 있습니다.',
    '현재 32개 도구 제공.', '조회·참조 도구 24개와 확인된 네 가지 작업을 위한 미리보기·실행 단계 8개로 구성되며 모두 권한과 범위를 준수합니다.',
    '현재 ChatGPT MCP 기능', [['경영 및 알림 · 3', '오늘의 매출, 경영 현황 및 주의가 필요한 항목을 확인합니다.'], ['인사 및 근태 · 3', '직원을 검색하고 개요를 확인하며 근태 예외를 탐지합니다.'], ['업무 및 프로세스 · 4', '업무 목록과 상세를 확인하고 새 업무를 미리 본 뒤 생성합니다.'], ['매출 및 현금 · 4', '매출 요약, 목록, 상세와 현금 상태를 확인합니다.'], ['제품 및 재고 · 3', '제품을 검색하고 상세와 통합 재고를 확인합니다.'], ['비용 · 5', '요약, 목록, 상세를 확인하고 미리보기 후 초안을 생성합니다.'], ['소액 현금 및 재무 · 6', '자금을 확인하고 사전 확인을 거쳐 지출 등록과 입금을 실행합니다.'], ['미수금 · 1', '잔액, 만기일 및 전체 미수금 상태를 확인합니다.'], ['업무 맥락 및 참조 · 3', '승인된 회사, 단위, 사업 및 결제 계정을 확인합니다.']],
    '연결 및 로드맵', [['ChatGPT · 사용 가능', '비공개 MCP 앱과 안전한 로그인을 통해 연결되며 해당 사용자에게 승인된 정보만 전달됩니다.'], ['Claude · 개발 중', '동일한 MCP 계층을 통한 연결을 개발 중이며 아직 제공되는 기능에는 포함되지 않습니다.'], ['2026년 10월 · 출시 예정', '예정된 출시에서는 도구 카탈로그를 32개에서 약 64개로 확대하고 미리보기, 확인 및 추적 기능이 있는 대량 작업을 추가합니다.']],
    '현재 대화를 유용한 업무로 전환하고 2026년 10월에 통제된 방식으로 범위를 확대합니다.',
  ),
  proforma: section(
    '07 · 확장 프로포마', '지역 포트폴리오에서 전국 네트워크로.',
    '각 연방 행정구역에 최소 한 명의 유통 컨설턴트를 육성하는 것이 목표입니다. 매월 MXN 15,000의 신규 청구 목표를 달성하면 유지된 포트폴리오가 다음 달에도 누적됩니다.',
    '반복 매출은 지역의 실행 속도를 전국 규모로 전환합니다.', '제시된 가정과 부가세 제외 기준으로 컨설턴트 30명은 첫해 MXN 3,510만, 60명은 MXN 7,020만의 매출을 만드는 시뮬레이션입니다.',
    '컨설턴트별 속도', [['MXN 1만 경로', '매월 MXN 10,000을 추가하면 12월 포트폴리오는 MXN 120,000, 연간 매출은 MXN 780,000입니다.'], ['MXN 2만 경로', '매월 MXN 20,000을 추가하면 12월 포트폴리오는 MXN 240,000, 연간 매출은 MXN 156만입니다.'], ['MXN 3만 경로', '매월 MXN 30,000을 추가하면 12월 포트폴리오는 MXN 360,000, 연간 매출은 MXN 234만입니다.']],
    '지역 확장', [['컨설턴트 30명', '초기 커버리지: 첫해 예시 매출 MXN 3,510만.'], ['32개 행정구역', '지역 목표: 각 연방 행정구역에 최소 한 명의 인증 컨설턴트.'], ['컨설턴트 60명', '강화된 네트워크: 첫해 예시 매출 MXN 7,020만.']],
    '친밀한 지원, 구현 품질 및 재무 규율을 유지하면서 전국 커버리지를 구축합니다.',
  ),
};

const sectionsZh: Record<InvestmentTab, InvestmentSection> = {
  overview: section(
    '01 · 什么是 Índice？', 'Índice 是一套模块化 SaaS 企业管理系统。',
    '它将人员、流程、销售、费用和财务连接在同一系统中。各部门共享信息，并按职责获得相应权限。',
    '每项活动只需记录一次，即可更新企业的整体业务信息。', '企业可以从所需模块开始，并随着成长扩展平台。',
    '带来的价值', [['运营管控', '帮助了解正在发生什么、由谁负责，以及哪些事项需要关注。'], ['协同工作', '减少重复录入以及在相互孤立的工具之间进行核对。'], ['数据驱动决策', '将日常运营转化为跟踪、提醒和最新指标。']],
    '我们希望验证什么', [['早期价值', '在实施期间完成一个有用的工作流程。'], ['持续使用', '让 Índice 融入团队的日常工作。'], ['可持续扩展', '实现增长，而服务成本不按同等比例上升。']],
    '接下来介绍把这一方案落地为具体运营的各个模块。',
  ),
  modules: section(
    '02 · 模块化产品', '基于同一可信数据源的专业模块。',
    '核心包含仪表板、KPI、组织结构、用户、安全和计费；运营产品根据所选方案启用。',
    '模块化不等于割裂。', '每个领域保持专业性，同时共享人员、目录、权限和结果。',
    '运营产品', [['人力资源', '员工、考勤、档案、资产、权限和薪资。'], ['任务与流程', '流程、负责人、日程和合规。'], ['费用与备用金', '费用、预算、资金和资金管理。'], ['销售与库存', '潜在客户、报价、销售、仓库和库存。'], ['POS 与库存', '收银、订单、结算、采购和库存。'], ['应收账款', '信用、余额、到期日和收款。']],
    '跨模块能力', [['多公司', '运营不同公司，同时避免信息混用。'], ['多币种', '支持原生业务操作和合并查看。'], ['内嵌学习', '在产品内提供与当前情境相关的指导。']],
    '将商业切入点聚焦于重复出现且紧迫的运营问题。',
  ),
  market: section(
    '03 · 目标市场', '以明确细分市场切入广阔市场。',
    '通过电子表格和彼此孤立的工具来协调销售、库存、收款、费用和团队的中小企业。',
    '按运营痛点进行细分。', '理想潜在客户理解信息核对的成本，并有内部负责人推动变革。',
    '优先客户画像', [['拥有10至30名员工的企业', '正在快速增长，现有人工管控已难以承载业务流程，需要建立体系以继续扩张。'], ['信息分散的团队', '销售、费用、库存和任务分散在不同工具中，需要实现一体化运营。'], ['依赖关键人员的运营模式', '企业需要在保持业务可视性和管控力的同时，下放职责并标准化流程。']],
    '匹配信号', [['增长临界点', '员工规模为10至30人，业务量已超出电子表格、聊天工具和人工跟进所能承载的企业。'], ['运营摩擦', '信息分散、重复劳动与延误已经开始影响服务、销售或现金流。'], ['关键人员依赖', '日常运营依赖少数员工及尚未沉淀为文档的经验。']],
    '优先推进运营混乱成本已经超过实施 Índice 所需投入的企业。',
  ),
  business: section(
    '04 · 商业模式', '从首次接触到持续陪伴。',
    'Índice 通过顾问式销售触达客户：先倾听并诊断，再实施优先解决方案，并以采用和成果为中心维持每月联系。',
    '销售始于提供清晰判断，并通过持续创造价值推进。', '首次咨询应帮助潜在客户更好地理解企业，即使他们尚未准备购买。',
    '客户旅程', [['接触与信任', '了解企业规模和压力最大的运营环节。目标是倾听并约定下一次沟通，而不是展示所有模块。'], ['免费初次咨询', '在 60 至 90 分钟内梳理人员、流程、产品和财务，确定核心痛点，并只展示相关解决方案。'], ['聚焦实施', '明确范围并签约后，我们配置模块、培训负责人，并验证第一个真实业务流程。'], ['顾问持续跟进', '指定顾问检查使用情况、待办事项和阻碍，记录共识，并陪伴团队逐步实现自主运营。'], ['每月包含一次咨询', '一次 60 分钟线上咨询用于复盘采用情况、成果和下一步进展；需提前预约且不可累积。'], ['来自顾问网络的不同视角', '客户可在平台中根据主题和可用时间，请求自己的经销商或另一位 Índice 顾问提供不同视角。']],
    '如何维持客户关系', [['模块化订阅', '企业按月或按年订阅，并在获得价值后逐步增加模块或用户。'], ['内含咨询', '有效订阅每月包含一次 60 分钟线上咨询，以持续推动采用并保持紧密联系。'], ['额外服务', '额外咨询和线下服务单独报价，明确区分软件与服务。']],
    '一位持续活跃、获得支持并沿着持续改进路径前进的客户。',
  ),
  partners: section(
    '05 · 分销商', '一支负责销售、实施与陪伴的认证网络。',
    '顾问型分销商在扩大 Índice 商业覆盖面的同时对客户采用负责：建立关系、诊断、配置、培训并按月跟进。',
    '渠道以活跃且持续使用的客户来衡量。', '项目政策要求保持有效认证；平台记录培训、评估和证书。',
    '工作摘要', [['建立关系', '合规开发潜在客户、倾听业务背景并预约初次咨询。'], ['诊断并提出方案', '确定核心痛点，只展示相关工作流程，并明确范围、负责人和下一步。'], ['实施并培训', '配置模块、准备数据、培训负责人并验证首个真实业务流程。'], ['陪伴并促进留存', '每月检查使用情况和阻碍，记录共识，并将需要专业支持的问题升级至 Índice。']],
    '网页认证路径', [['引导式培训', '七个阶段结合产品知识、运营实践和商业方法。'], ['在线考试', '每个阶段都有网页评估，最后完成顾问能力终试。'], ['可验证证书', '通过后生成带编号、二维码、365 天有效期和公开验证功能的 PDF。']],
    '在保持实施质量和客户关系的同时扩展认证网络。',
  ),
  ai: section(
    '06 · 人工智能', '通过 MCP 将 ChatGPT 连接到 Índice。',
    '用户可以在对话中查询企业真实运营信息并执行受限操作，所有能力始终受其权限约束。',
    '目前提供 32 项工具。', '其中包括 24 项查询与参考工具，以及针对四项确认操作的 8 个预览与执行步骤；全部遵循权限和范围。',
    '当前 ChatGPT MCP 功能', [['管理与提醒 · 3', '查询当日销售、经营概览和需要关注的事项。'], ['人员与考勤 · 3', '搜索员工、查看人员概览并发现考勤异常。'], ['任务与流程 · 4', '列出和查看任务，并在预览后创建新任务。'], ['销售与现金 · 4', '查看销售汇总、列表、详情和现金状态。'], ['产品与库存 · 3', '搜索产品、查看详情并检查汇总库存。'], ['费用 · 5', '查看汇总、列表和详情，并通过预览创建草稿。'], ['备用金与资金 · 6', '查看资金，并在事先确认后登记支出或增加资金。'], ['应收账款 · 1', '查看余额、到期日和整体应收账款状况。'], ['业务情境与参考资料 · 3', '查看获授权的企业、单位、业务和付款账户。']],
    '连接与路线图', [['ChatGPT · 已提供', '通过私有 MCP 应用和安全登录连接；只接收该用户获授权的信息。'], ['Claude · 开发中', '正在开发通过同一 MCP 层连接 Claude 的能力，目前尚未作为可用功能提供。'], ['2026 年 10 月 · 计划发布', '计划发布的版本将工具目录从 32 项扩大到约 64 项，并加入带预览、确认和追踪的大批量操作。']],
    '现在让对话转化为实际工作，并在 2026 年 10 月以受控方式扩大能力范围。',
  ),
  proforma: section(
    '07 · 扩张预计模型', '从本地客户组合走向全国网络。',
    '目标是在每个联邦实体至少培养一名分销顾问。以每月新增 MXN 15,000 账单为基础目标，已留存的客户组合会持续叠加。',
    '经常性收入把本地执行节奏转化为全国规模。', '在所列假设且不含增值税的情况下，30 名顾问第一年可模拟产生 MXN 3,510 万销售额，60 名顾问可产生 MXN 7,020 万。',
    '每名顾问的节奏', [['MXN 1 万路径', '每月新增 MXN 10,000，十二月客户组合为 MXN 120,000，全年销售额为 MXN 780,000。'], ['MXN 2 万路径', '每月新增 MXN 20,000，十二月客户组合为 MXN 240,000，全年销售额为 MXN 156 万。'], ['MXN 3 万路径', '每月新增 MXN 30,000，十二月客户组合为 MXN 360,000，全年销售额为 MXN 234 万。']],
    '区域规模', [['30 名顾问', '初步覆盖：第一年示例销售额 MXN 3,510 万。'], ['32 个实体', '区域目标：每个联邦实体至少一名认证顾问。'], ['60 名顾问', '强化网络：第一年示例销售额 MXN 7,020 万。']],
    '在不牺牲客户距离、实施质量和财务纪律的前提下建立全国覆盖。',
  ),
};

export const investmentSections: Localized<Record<InvestmentTab, InvestmentSection>> = byLocale(
  sectionsEs, sectionsEn, sectionsFr, sectionsPt, sectionsKo, sectionsZh,
);
