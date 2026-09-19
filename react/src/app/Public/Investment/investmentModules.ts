import type { InvestmentLocale } from './investmentContent';

export type InvestmentModuleKind = 'core' | 'operational';
export type InvestmentModuleTone = 'aqua' | 'blue' | 'coral' | 'green' | 'orange' | 'purple' | 'yellow';

const moduleMeta = [
  { id: 'home-panel', emoji: '🏠', kind: 'core', tone: 'blue' },
  { id: 'human-resources', emoji: '👥', kind: 'operational', tone: 'aqua' },
  { id: 'processes-tasks', emoji: '✅', kind: 'operational', tone: 'yellow' },
  { id: 'sales', emoji: '💼', kind: 'operational', tone: 'coral' },
  { id: 'point-of-sale', emoji: '🛒', kind: 'operational', tone: 'orange' },
  { id: 'inventory', emoji: '📦', kind: 'operational', tone: 'coral' },
  { id: 'expenses', emoji: '💸', kind: 'operational', tone: 'green' },
  { id: 'petty-cash', emoji: '💰', kind: 'operational', tone: 'green' },
  { id: 'receivables', emoji: '📙', kind: 'operational', tone: 'green' },
  { id: 'kpis', emoji: '📈', kind: 'core', tone: 'purple' },
] as const;

export type InvestmentModuleId = typeof moduleMeta[number]['id'];

type ModuleCopy = {
  name: string;
  functions: readonly [string, string];
  tools: readonly string[];
};

type ModuleCatalogSource = {
  title: string;
  description: string;
  caption: string;
  columns: { module: string; functions: string; tools: string };
  kinds: Record<InvestmentModuleKind, string>;
  scrollHint: string;
  sharedLabel: string;
  sharedNote: string;
  modules: Record<InvestmentModuleId, ModuleCopy>;
};

export type InvestmentModuleEntry = ModuleCopy & typeof moduleMeta[number];

export type InvestmentModuleCatalog = Omit<ModuleCatalogSource, 'modules'> & {
  modules: readonly InvestmentModuleEntry[];
};

const buildCatalog = (source: ModuleCatalogSource): InvestmentModuleCatalog => ({
  ...source,
  modules: moduleMeta.map(meta => ({ ...meta, ...source.modules[meta.id] })),
});

const es = buildCatalog({
  title: 'Módulos, funciones y herramientas',
  description: 'Índice integra ocho módulos operativos con Panel Inicial e Indicadores como núcleo incluido. La oferta comercial los combina según el plan, sin duplicar información ni procesos.',
  caption: 'Catálogo de los módulos actuales de Índice con sus funciones y herramientas principales.',
  columns: { module: 'Módulo', functions: 'Funciones', tools: 'Herramientas' },
  kinds: { core: 'Núcleo incluido', operational: 'Módulo operativo' },
  scrollHint: 'Desliza horizontalmente para ver la tabla completa.',
  sharedLabel: 'Base compartida',
  sharedNote: 'Todos los módulos comparten empresas, unidades, usuarios, permisos, divisas y una misma fuente de información.',
  modules: {
    'home-panel': {
      name: 'Panel Inicial',
      functions: ['Configurar la identidad, estructura y diagnóstico de la empresa.', 'Administrar perfiles, usuarios, consultoría e integraciones.'],
      tools: ['Perfil', 'Estructura empresarial', 'Perfil empresarial', 'Consultoría', 'Integraciones', 'Usuarios'],
    },
    'human-resources': {
      name: 'Recursos Humanos',
      functions: ['Centralizar colaboradores y su historial laboral.', 'Controlar asistencia, nómina, activos, permisos e incentivos.'],
      tools: ['Colaboradores', 'Asistencia', 'Control de asistencia', 'Nómina', 'Comunicados', 'Activos', 'Actas', 'Permisos', 'Incentivos', 'Indicadores'],
    },
    'processes-tasks': {
      name: 'Procesos y Tareas',
      functions: ['Organizar trabajo por responsable, fecha y prioridad.', 'Estandarizar proyectos y procesos recurrentes, con seguimiento de cumplimiento.'],
      tools: ['Agenda', 'Proyectos', 'Procesos', 'KPIs'],
    },
    sales: {
      name: 'Ventas',
      functions: ['Gestionar el ciclo comercial desde la oportunidad hasta la venta.', 'Dar seguimiento a resultados, comisiones y destinos de cobro.'],
      tools: ['Clientes', 'Oportunidades', 'Cotizaciones', 'Ventas', 'KPIs', 'Comisiones', 'Cuentas de pago'],
    },
    'point-of-sale': {
      name: 'Punto de Venta',
      functions: ['Operar ventas de mostrador desde cajas y turnos controlados.', 'Gestionar cortes, clientes, kioscos e indicadores de operación.'],
      tools: ['Cajas y turnos', 'Venta', 'Cortes de caja', 'Kioscos', 'Clientes', 'KPIs'],
    },
    inventory: {
      name: 'Inventarios',
      functions: ['Controlar productos, existencias y movimientos por almacén.', 'Coordinar proveedores, compras y descuentos para los canales de venta.'],
      tools: ['Productos', 'Almacenes', 'Inventario', 'Proveedores', 'Órdenes de compra', 'Descuentos'],
    },
    expenses: {
      name: 'Gastos',
      functions: ['Registrar y comprobar gastos con trazabilidad financiera.', 'Controlar presupuestos, proveedores, cuentas y resultados.'],
      tools: ['Gastos', 'Control presupuestal', 'Proveedores', 'Cuentas contables', 'Cuentas de pago', 'Indicadores'],
    },
    'petty-cash': {
      name: 'Caja Chica',
      functions: ['Administrar fondos, movimientos y comprobantes por responsable.', 'Conciliar saldos, cerrar cortes y vigilar el uso del efectivo.'],
      tools: ['Fondos', 'Saldos', 'Cortes', 'Indicadores'],
    },
    receivables: {
      name: 'Cartera',
      functions: ['Definir clientes y políticas para ventas a crédito.', 'Controlar saldos, vencimientos, parcialidades y abonos.'],
      tools: ['Clientes a crédito', 'Ventas a crédito', 'Cuentas por cobrar', 'Abonos', 'Indicadores'],
    },
    kpis: {
      name: 'Indicadores',
      functions: ['Convertir la operación de cada módulo en lectura ejecutiva.', 'Preparar informes contables y entregas automatizadas.'],
      tools: ['Indicadores', 'Informes contables', 'Informes automatizados'],
    },
  },
});

const en = buildCatalog({
  title: 'Modules, functions, and tools',
  description: 'Índice combines eight operational modules with the Home Panel and Indicators as its included core. Commercial plans package them without duplicating information or processes.',
  caption: 'Catalogue of the current Índice modules with their main functions and tools.',
  columns: { module: 'Module', functions: 'Functions', tools: 'Tools' },
  kinds: { core: 'Included core', operational: 'Operational module' },
  scrollHint: 'Swipe horizontally to view the complete table.',
  sharedLabel: 'Shared foundation',
  sharedNote: 'Every module shares companies, business units, users, permissions, currencies, and one source of information.',
  modules: {
    'home-panel': {
      name: 'Home Panel',
      functions: ['Configure company identity, structure, and assessment.', 'Manage profiles, users, consulting, and integrations.'],
      tools: ['Profile', 'Business structure', 'Business profile', 'Consulting', 'Integrations', 'Users'],
    },
    'human-resources': {
      name: 'Human Resources',
      functions: ['Centralize employees and their work history.', 'Manage attendance, payroll, assets, leave, and incentives.'],
      tools: ['Employees', 'Attendance', 'Attendance control', 'Payroll', 'Announcements', 'Assets', 'Records', 'Leave', 'Incentives', 'Indicators'],
    },
    'processes-tasks': {
      name: 'Processes & Tasks',
      functions: ['Organize work by owner, date, and priority.', 'Standardize projects and recurring processes while tracking completion.'],
      tools: ['Agenda', 'Projects', 'Processes', 'KPIs'],
    },
    sales: {
      name: 'Sales',
      functions: ['Manage the commercial cycle from opportunity to sale.', 'Track results, commissions, and payment destinations.'],
      tools: ['Customers', 'Opportunities', 'Quotes', 'Sales', 'KPIs', 'Commissions', 'Payment accounts'],
    },
    'point-of-sale': {
      name: 'Point of Sale',
      functions: ['Run counter sales through controlled registers and shifts.', 'Manage closings, customers, kiosks, and operating indicators.'],
      tools: ['Registers & shifts', 'Sale', 'Cash closings', 'Kiosks', 'Customers', 'KPIs'],
    },
    inventory: {
      name: 'Inventory',
      functions: ['Control products, stock, and movements by warehouse.', 'Coordinate suppliers, purchasing, and discounts across sales channels.'],
      tools: ['Products', 'Warehouses', 'Inventory', 'Suppliers', 'Purchase orders', 'Discounts'],
    },
    expenses: {
      name: 'Expenses',
      functions: ['Record and substantiate expenses with financial traceability.', 'Control budgets, suppliers, accounts, and results.'],
      tools: ['Expenses', 'Budget control', 'Suppliers', 'Accounting accounts', 'Payment accounts', 'Indicators'],
    },
    'petty-cash': {
      name: 'Petty Cash',
      functions: ['Manage funds, movements, and receipts by custodian.', 'Reconcile balances, close periods, and oversee cash use.'],
      tools: ['Funds', 'Balances', 'Closings', 'Indicators'],
    },
    receivables: {
      name: 'Receivables',
      functions: ['Define customers and policies for credit sales.', 'Control balances, due dates, installments, and payments.'],
      tools: ['Credit customers', 'Credit sales', 'Accounts receivable', 'Payments', 'Indicators'],
    },
    kpis: {
      name: 'Indicators',
      functions: ['Turn each module’s operations into an executive view.', 'Prepare accounting reports and automated delivery.'],
      tools: ['Indicators', 'Accounting reports', 'Automated reports'],
    },
  },
});

const fr = buildCatalog({
  title: 'Modules, fonctions et outils',
  description: 'Índice réunit huit modules opérationnels, ainsi que le panneau d’accueil et les indicateurs dans son noyau inclus. Les offres commerciales les regroupent sans dupliquer les données ni les processus.',
  caption: 'Catalogue des modules actuels d’Índice avec leurs principales fonctions et leurs outils.',
  columns: { module: 'Module', functions: 'Fonctions', tools: 'Outils' },
  kinds: { core: 'Noyau inclus', operational: 'Module opérationnel' },
  scrollHint: 'Faites glisser horizontalement pour voir le tableau complet.',
  sharedLabel: 'Base commune',
  sharedNote: 'Tous les modules partagent les entreprises, les unités, les utilisateurs, les autorisations, les devises et une même source d’information.',
  modules: {
    'home-panel': {
      name: 'Panneau d’accueil',
      functions: ['Configurer l’identité, la structure et le diagnostic de l’entreprise.', 'Gérer les profils, les utilisateurs, le conseil et les intégrations.'],
      tools: ['Profil', 'Structure d’entreprise', 'Profil de l’entreprise', 'Conseil', 'Intégrations', 'Utilisateurs'],
    },
    'human-resources': {
      name: 'Ressources humaines',
      functions: ['Centraliser les collaborateurs et leur historique professionnel.', 'Gérer la présence, la paie, les actifs, les congés et les primes.'],
      tools: ['Collaborateurs', 'Présence', 'Contrôle des présences', 'Paie', 'Communications', 'Actifs', 'Dossiers', 'Congés', 'Primes', 'Indicateurs'],
    },
    'processes-tasks': {
      name: 'Processus et tâches',
      functions: ['Organiser le travail par responsable, date et priorité.', 'Normaliser les projets et les processus récurrents, puis suivre leur exécution.'],
      tools: ['Agenda', 'Projets', 'Processus', 'KPI'],
    },
    sales: {
      name: 'Ventes',
      functions: ['Gérer le cycle commercial, de l’occasion jusqu’à la vente.', 'Suivre les résultats, les commissions et les destinations de paiement.'],
      tools: ['Clients', 'Occasions', 'Soumissions', 'Ventes', 'KPI', 'Commissions', 'Comptes de paiement'],
    },
    'point-of-sale': {
      name: 'Point de vente',
      functions: ['Effectuer les ventes au comptoir au moyen de caisses et de quarts contrôlés.', 'Gérer les clôtures, les clients, les bornes et les indicateurs opérationnels.'],
      tools: ['Caisses et quarts', 'Vente', 'Clôtures de caisse', 'Bornes', 'Clients', 'KPI'],
    },
    inventory: {
      name: 'Stocks',
      functions: ['Contrôler les produits, les stocks et les mouvements par entrepôt.', 'Coordonner les fournisseurs, les achats et les rabais pour chaque canal de vente.'],
      tools: ['Produits', 'Entrepôts', 'Stocks', 'Fournisseurs', 'Bons de commande', 'Rabais'],
    },
    expenses: {
      name: 'Dépenses',
      functions: ['Enregistrer et justifier les dépenses avec une traçabilité financière.', 'Contrôler les budgets, les fournisseurs, les comptes et les résultats.'],
      tools: ['Dépenses', 'Contrôle budgétaire', 'Fournisseurs', 'Comptes comptables', 'Comptes de paiement', 'Indicateurs'],
    },
    'petty-cash': {
      name: 'Petite caisse',
      functions: ['Gérer les fonds, les mouvements et les reçus par responsable.', 'Rapprocher les soldes, clôturer les périodes et surveiller l’utilisation des espèces.'],
      tools: ['Fonds', 'Soldes', 'Clôtures', 'Indicateurs'],
    },
    receivables: {
      name: 'Comptes clients',
      functions: ['Définir les clients et les politiques pour les ventes à crédit.', 'Contrôler les soldes, les échéances, les versements et les paiements.'],
      tools: ['Clients à crédit', 'Ventes à crédit', 'Comptes clients', 'Versements', 'Indicateurs'],
    },
    kpis: {
      name: 'Indicateurs',
      functions: ['Transformer les opérations de chaque module en vue de direction.', 'Préparer les rapports comptables et leur livraison automatisée.'],
      tools: ['Indicateurs', 'Rapports comptables', 'Rapports automatisés'],
    },
  },
});

const pt = buildCatalog({
  title: 'Módulos, funções e ferramentas',
  description: 'O Índice reúne oito módulos operacionais com o Painel Inicial e os Indicadores como núcleo incluído. Os planos comerciais os combinam sem duplicar informações nem processos.',
  caption: 'Catálogo dos módulos atuais do Índice com suas principais funções e ferramentas.',
  columns: { module: 'Módulo', functions: 'Funções', tools: 'Ferramentas' },
  kinds: { core: 'Núcleo incluído', operational: 'Módulo operacional' },
  scrollHint: 'Deslize horizontalmente para ver a tabela completa.',
  sharedLabel: 'Base compartilhada',
  sharedNote: 'Todos os módulos compartilham empresas, unidades, usuários, permissões, moedas e uma única fonte de informação.',
  modules: {
    'home-panel': {
      name: 'Painel Inicial',
      functions: ['Configurar a identidade, a estrutura e o diagnóstico da empresa.', 'Administrar perfis, usuários, consultoria e integrações.'],
      tools: ['Perfil', 'Estrutura empresarial', 'Perfil da empresa', 'Consultoria', 'Integrações', 'Usuários'],
    },
    'human-resources': {
      name: 'Recursos Humanos',
      functions: ['Centralizar colaboradores e seu histórico profissional.', 'Controlar frequência, folha de pagamento, ativos, licenças e incentivos.'],
      tools: ['Colaboradores', 'Frequência', 'Controle de frequência', 'Folha de pagamento', 'Comunicados', 'Ativos', 'Registros', 'Licenças', 'Incentivos', 'Indicadores'],
    },
    'processes-tasks': {
      name: 'Processos e Tarefas',
      functions: ['Organizar o trabalho por responsável, data e prioridade.', 'Padronizar projetos e processos recorrentes, acompanhando a execução.'],
      tools: ['Agenda', 'Projetos', 'Processos', 'KPIs'],
    },
    sales: {
      name: 'Vendas',
      functions: ['Gerenciar o ciclo comercial da oportunidade até a venda.', 'Acompanhar resultados, comissões e destinos de recebimento.'],
      tools: ['Clientes', 'Oportunidades', 'Cotações', 'Vendas', 'KPIs', 'Comissões', 'Contas de pagamento'],
    },
    'point-of-sale': {
      name: 'Ponto de Venda',
      functions: ['Operar vendas no balcão com caixas e turnos controlados.', 'Gerenciar fechamentos, clientes, quiosques e indicadores operacionais.'],
      tools: ['Caixas e turnos', 'Venda', 'Fechamentos de caixa', 'Quiosques', 'Clientes', 'KPIs'],
    },
    inventory: {
      name: 'Estoques',
      functions: ['Controlar produtos, estoques e movimentações por armazém.', 'Coordenar fornecedores, compras e descontos para os canais de venda.'],
      tools: ['Produtos', 'Armazéns', 'Estoque', 'Fornecedores', 'Ordens de compra', 'Descontos'],
    },
    expenses: {
      name: 'Despesas',
      functions: ['Registrar e comprovar despesas com rastreabilidade financeira.', 'Controlar orçamentos, fornecedores, contas e resultados.'],
      tools: ['Despesas', 'Controle orçamentário', 'Fornecedores', 'Contas contábeis', 'Contas de pagamento', 'Indicadores'],
    },
    'petty-cash': {
      name: 'Caixa Pequeno',
      functions: ['Administrar fundos, movimentações e comprovantes por responsável.', 'Conciliar saldos, fechar períodos e supervisionar o uso do dinheiro.'],
      tools: ['Fundos', 'Saldos', 'Fechamentos', 'Indicadores'],
    },
    receivables: {
      name: 'Contas a receber',
      functions: ['Definir clientes e políticas para vendas a crédito.', 'Controlar saldos, vencimentos, parcelas e pagamentos.'],
      tools: ['Clientes a crédito', 'Vendas a crédito', 'Contas a receber', 'Pagamentos', 'Indicadores'],
    },
    kpis: {
      name: 'Indicadores',
      functions: ['Transformar a operação de cada módulo em visão executiva.', 'Preparar relatórios contábeis e entregas automatizadas.'],
      tools: ['Indicadores', 'Relatórios contábeis', 'Relatórios automatizados'],
    },
  },
});

const ko = buildCatalog({
  title: '모듈, 기능 및 도구',
  description: 'Índice는 8개의 운영 모듈과 기본 제공되는 시작 패널 및 지표를 하나로 연결합니다. 상용 요금제는 정보나 프로세스를 중복하지 않고 이를 조합합니다.',
  caption: 'Índice의 현재 모듈과 주요 기능 및 도구 목록.',
  columns: { module: '모듈', functions: '기능', tools: '도구' },
  kinds: { core: '기본 제공 핵심 기능', operational: '운영 모듈' },
  scrollHint: '표 전체를 보려면 가로로 스와이프하세요.',
  sharedLabel: '공통 기반',
  sharedNote: '모든 모듈은 회사, 사업 단위, 사용자, 권한, 통화 및 하나의 정보 원천을 공유합니다.',
  modules: {
    'home-panel': {
      name: '시작 패널',
      functions: ['회사 정보, 조직 구조 및 진단을 설정합니다.', '프로필, 사용자, 컨설팅 및 연동을 관리합니다.'],
      tools: ['프로필', '조직 구조', '기업 프로필', '컨설팅', '연동', '사용자'],
    },
    'human-resources': {
      name: '인사 관리',
      functions: ['임직원 정보와 근무 이력을 한곳에서 관리합니다.', '근태, 급여, 자산, 휴가 및 인센티브를 관리합니다.'],
      tools: ['임직원', '근태', '근태 관리', '급여', '공지', '자산', '기록', '휴가', '인센티브', '지표'],
    },
    'processes-tasks': {
      name: '프로세스 및 업무',
      functions: ['담당자, 날짜 및 우선순위별로 업무를 구성합니다.', '프로젝트와 반복 프로세스를 표준화하고 이행을 추적합니다.'],
      tools: ['일정', '프로젝트', '프로세스', 'KPI'],
    },
    sales: {
      name: '영업',
      functions: ['영업 기회부터 판매까지의 상업 주기를 관리합니다.', '성과, 수수료 및 결제 수취 계정을 추적합니다.'],
      tools: ['고객', '영업 기회', '견적', '판매', 'KPI', '수수료', '결제 계정'],
    },
    'point-of-sale': {
      name: '판매 시점(POS)',
      functions: ['관리되는 계산대와 교대 근무로 매장 판매를 운영합니다.', '마감, 고객, 키오스크 및 운영 지표를 관리합니다.'],
      tools: ['계산대 및 교대', '판매', '현금 마감', '키오스크', '고객', 'KPI'],
    },
    inventory: {
      name: '재고 관리',
      functions: ['창고별 제품, 재고 및 이동을 관리합니다.', '판매 채널의 공급업체, 구매 및 할인을 조정합니다.'],
      tools: ['제품', '창고', '재고', '공급업체', '구매 주문', '할인'],
    },
    expenses: {
      name: '비용',
      functions: ['재무 추적성을 유지하며 비용과 증빙을 기록합니다.', '예산, 공급업체, 계정 및 결과를 관리합니다.'],
      tools: ['비용', '예산 관리', '공급업체', '회계 계정', '결제 계정', '지표'],
    },
    'petty-cash': {
      name: '소액 현금',
      functions: ['담당자별 자금, 이동 및 증빙을 관리합니다.', '잔액을 조정하고 마감하며 현금 사용을 감독합니다.'],
      tools: ['자금', '잔액', '마감', '지표'],
    },
    receivables: {
      name: '매출채권',
      functions: ['신용 판매를 위한 고객과 정책을 정의합니다.', '잔액, 만기, 분할 납부 및 수금을 관리합니다.'],
      tools: ['신용 고객', '신용 판매', '매출채권', '수금', '지표'],
    },
    kpis: {
      name: '지표',
      functions: ['각 모듈의 운영 데이터를 경영진 관점으로 전환합니다.', '회계 보고서와 자동 배포를 준비합니다.'],
      tools: ['지표', '회계 보고서', '자동 보고서'],
    },
  },
});

const zh = buildCatalog({
  title: '模块、功能与工具',
  description: 'Índice 将八个运营模块与默认包含的首页面板和指标整合在一起。商业方案按需组合这些能力，不重复数据或流程。',
  caption: 'Índice 当前模块及其主要功能与工具目录。',
  columns: { module: '模块', functions: '功能', tools: '工具' },
  kinds: { core: '默认核心功能', operational: '运营模块' },
  scrollHint: '横向滑动即可查看完整表格。',
  sharedLabel: '共享基础',
  sharedNote: '所有模块共享公司、业务单位、用户、权限、币种以及同一信息源。',
  modules: {
    'home-panel': {
      name: '首页面板',
      functions: ['配置企业身份、组织结构和经营诊断。', '管理个人资料、用户、咨询服务和系统集成。'],
      tools: ['个人资料', '企业结构', '企业档案', '咨询服务', '系统集成', '用户'],
    },
    'human-resources': {
      name: '人力资源',
      functions: ['集中管理员工及其工作履历。', '管理考勤、薪资、资产、请假和激励。'],
      tools: ['员工', '考勤', '考勤管理', '薪资', '公告', '资产', '档案', '请假', '激励', '指标'],
    },
    'processes-tasks': {
      name: '流程与任务',
      functions: ['按负责人、日期和优先级组织工作。', '标准化项目和周期性流程，并跟踪完成情况。'],
      tools: ['日程', '项目', '流程', 'KPI'],
    },
    sales: {
      name: '销售',
      functions: ['管理从商机到成交的完整销售周期。', '跟踪业绩、佣金和收款账户。'],
      tools: ['客户', '商机', '报价', '销售', 'KPI', '佣金', '收款账户'],
    },
    'point-of-sale': {
      name: '销售点',
      functions: ['通过受控收银台和班次开展门店销售。', '管理结班、客户、自助终端和运营指标。'],
      tools: ['收银台与班次', '销售', '收银结班', '自助终端', '客户', 'KPI'],
    },
    inventory: {
      name: '库存',
      functions: ['按仓库管理产品、库存和出入库变动。', '协调各销售渠道的供应商、采购和折扣。'],
      tools: ['产品', '仓库', '库存', '供应商', '采购订单', '折扣'],
    },
    expenses: {
      name: '费用',
      functions: ['记录并凭证化费用，保留财务追溯链。', '管理预算、供应商、账户和结果。'],
      tools: ['费用', '预算控制', '供应商', '会计科目', '付款账户', '指标'],
    },
    'petty-cash': {
      name: '备用金',
      functions: ['按负责人管理资金、变动和凭证。', '核对余额、完成结算并监督现金使用。'],
      tools: ['资金', '余额', '结算', '指标'],
    },
    receivables: {
      name: '应收账款',
      functions: ['定义赊销客户及信用政策。', '管理余额、到期日、分期和收款。'],
      tools: ['信用客户', '赊销', '应收账款', '收款', '指标'],
    },
    kpis: {
      name: '指标',
      functions: ['将各模块运营数据转化为管理层视图。', '生成会计报告并设置自动发送。'],
      tools: ['指标', '会计报告', '自动化报告'],
    },
  },
});

export const investmentModuleCatalog: Record<InvestmentLocale, InvestmentModuleCatalog> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
