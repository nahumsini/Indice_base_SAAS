// Lesson presentation only. Assessment questions and answers remain server-owned.
export const inductionLocales = ['en-CA', 'en-US', 'es-MX', 'es-CO', 'fr-CA', 'pt-BR', 'ko-CA', 'zh-CA'] as const;
export type InductionLocale = typeof inductionLocales[number];
const localeIndex: Record<InductionLocale, number> = { 'en-CA': 0, 'en-US': 0, 'es-MX': 1, 'es-CO': 1, 'fr-CA': 2, 'pt-BR': 3, 'ko-CA': 4, 'zh-CA': 5 };
// Columns: Canadian English, Spanish, Canadian French, Brazilian Portuguese, Korean, Chinese.
const messages = {
  "lesson0": [
    "People",
    "Personas",
    "Personnes",
    "Pessoas",
    "사람",
    "人员"
  ],
  "lesson1": [
    "Clarity about who participates, their responsibilities and how they work.",
    "Claridad sobre quién participa, qué responsabilidad tiene y cómo está trabajando.",
    "Savoir qui participe, quelles sont ses responsabilités et comment il travaille.",
    "Clareza sobre quem participa, suas responsabilidades e como trabalha.",
    "누가 참여하고 어떤 책임을 맡으며 어떻게 일하는지 명확히 합니다.",
    "明确谁参与、承担什么责任以及工作情况。"
  ],
  "lesson2": [
    "Do we have the right people?",
    "¿Tenemos a las personas correctas?",
    "Avons-nous les bonnes personnes?",
    "Temos as pessoas certas?",
    "적합한 인력을 갖추고 있습니까?",
    "我们是否拥有合适的人员？"
  ],
  "lesson3": [
    "Does each person know their responsibilities?",
    "¿Cada persona conoce su responsabilidad?",
    "Chaque personne connaît-elle ses responsabilités?",
    "Cada pessoa conhece suas responsabilidades?",
    "각자가 자신의 책임을 알고 있습니까?",
    "每个人是否清楚自己的责任？"
  ],
  "lesson4": [
    "Can we see attendance, performance and incidents?",
    "¿Podemos ver asistencia, desempeño e incidencias?",
    "Pouvons-nous voir l’assiduité, le rendement et les incidents?",
    "Podemos acompanhar presença, desempenho e ocorrências?",
    "출근, 성과 및 사건을 확인할 수 있습니까?",
    "我们能否查看考勤、绩效和异常情况？"
  ],
  "lesson5": [
    "Human Resources, users, attendance, payroll and workplace climate.",
    "Recursos Humanos, usuarios, asistencia, nómina y clima laboral.",
    "Ressources humaines, utilisateurs, assiduité, paie et climat de travail.",
    "Recursos Humanos, usuários, presença, folha de pagamento e clima organizacional.",
    "인사, 사용자, 출근, 급여 및 조직 분위기입니다.",
    "人力资源、用户、考勤、薪资和工作氛围。"
  ],
  "lesson6": [
    "Processes",
    "Procesos",
    "Processus",
    "Processos",
    "프로세스",
    "流程"
  ],
  "lesson7": [
    "Turn daily operations into repeatable, measurable activities that rely less on memory.",
    "Convertir la operación diaria en actividades repetibles, medibles y menos dependientes de la memoria.",
    "Transformer les opérations quotidiennes en activités répétables et mesurables qui dépendent moins de la mémoire.",
    "Transformar a operação diária em atividades repetíveis, mensuráveis e menos dependentes da memória.",
    "일상 업무를 기억에 덜 의존하는 반복 가능하고 측정 가능한 활동으로 만듭니다.",
    "将日常运营转化为可重复、可衡量且较少依赖记忆的活动。"
  ],
  "lesson8": [
    "How is the work done?",
    "¿Cómo se realiza el trabajo?",
    "Comment le travail est-il réalisé?",
    "Como o trabalho é realizado?",
    "업무는 어떻게 수행됩니까?",
    "工作如何完成？"
  ],
  "lesson9": [
    "Who should act next?",
    "¿Quién debe actuar después?",
    "Qui doit agir ensuite?",
    "Quem deve agir a seguir?",
    "다음에는 누가 행동해야 합니까?",
    "下一步应由谁行动？"
  ],
  "lesson10": [
    "Where are activities delayed or lost?",
    "¿Dónde se retrasan o pierden las actividades?",
    "Où les activités sont-elles retardées ou perdues?",
    "Onde as atividades atrasam ou se perdem?",
    "활동이 어디에서 지연되거나 누락됩니까?",
    "哪些环节出现延迟或遗漏？"
  ],
  "lesson11": [
    "Processes and Tasks, projects, calendars, evidence and kiosks.",
    "Procesos y tareas, proyectos, calendarios, evidencias y kioscos.",
    "Processus et tâches, projets, calendriers, preuves et kiosques.",
    "Processos e Tarefas, projetos, calendários, evidências e quiosques.",
    "프로세스 및 작업, 프로젝트, 일정, 증빙 및 키오스크입니다.",
    "流程和任务、项目、日历、证据和自助终端。"
  ],
  "lesson12": [
    "Products",
    "Productos",
    "Produits",
    "Produtos",
    "제품",
    "产品"
  ],
  "lesson13": [
    "Connect what the company offers with inventory, customers, sales and delivery.",
    "Conectar lo que la empresa ofrece con inventario, clientes, ventas y entrega.",
    "Relier l’offre de l’entreprise aux stocks, aux clients, aux ventes et à la livraison.",
    "Conectar o que a empresa oferece ao estoque, aos clientes, às vendas e à entrega.",
    "회사의 제공 상품을 재고, 고객, 판매 및 납품과 연결합니다.",
    "将公司提供的产品与库存、客户、销售和交付连接起来。"
  ],
  "lesson14": [
    "What do we sell, and at what margin?",
    "¿Qué vendemos y con qué margen?",
    "Que vendons-nous et avec quelle marge?",
    "O que vendemos e com qual margem?",
    "무엇을 판매하며 이익률은 얼마입니까?",
    "我们销售什么，利润率是多少？"
  ],
  "lesson15": [
    "What do we have available?",
    "¿Qué tenemos disponible?",
    "Qu’avons-nous de disponible?",
    "O que temos disponível?",
    "현재 무엇을 제공할 수 있습니까?",
    "我们有哪些可用资源？"
  ],
  "lesson16": [
    "Which business opportunities are we pursuing?",
    "¿Qué oportunidades comerciales estamos atendiendo?",
    "Quelles occasions commerciales poursuivons-nous?",
    "Quais oportunidades comerciais estamos atendendo?",
    "어떤 영업 기회를 추진하고 있습니까?",
    "我们正在跟进哪些商业机会？"
  ],
  "lesson17": [
    "Sales, CRM, quotes, Point of Sale, inventory, purchasing and receivables.",
    "Ventas, CRM, cotizaciones, Punto de Venta, inventarios, compras y cartera.",
    "Ventes, CRM, devis, point de vente, stocks, achats et comptes clients.",
    "Vendas, CRM, orçamentos, Ponto de Venda, estoque, compras e contas a receber.",
    "영업, CRM, 견적, 판매 시점 관리, 재고, 구매 및 미수금입니다.",
    "销售、CRM、报价、销售点、库存、采购和应收账款。"
  ],
  "lesson18": [
    "Finance",
    "Finanzas",
    "Finances",
    "Finanças",
    "재무",
    "财务"
  ],
  "lesson19": [
    "Turn operational transactions into financial control and decision signals.",
    "Transformar movimientos operativos en control financiero y señales para decidir.",
    "Transformer les mouvements opérationnels en contrôle financier et en signaux pour décider.",
    "Transformar movimentações operacionais em controle financeiro e sinais para decidir.",
    "업무 거래를 재무 관리와 의사결정 신호로 전환합니다.",
    "将业务交易转化为财务管控和决策信号。"
  ],
  "lesson20": [
    "What do we spend on?",
    "¿En qué gastamos?",
    "À quoi dépensons-nous l’argent?",
    "Em que gastamos?",
    "어디에 지출하고 있습니까?",
    "我们把钱花在哪里？"
  ],
  "lesson21": [
    "What do we owe, and what is owed to us?",
    "¿Qué debemos y qué nos deben?",
    "Que devons-nous et que nous doit-on?",
    "O que devemos e o que nos devem?",
    "얼마를 갚아야 하며 얼마를 받아야 합니까?",
    "我们欠多少，别人欠我们多少？"
  ],
  "lesson22": [
    "Does the operation generate profit and cash?",
    "¿La operación genera utilidad y efectivo?",
    "L’activité génère-t-elle du bénéfice et des liquidités?",
    "A operação gera lucro e caixa?",
    "업무가 이익과 현금을 창출합니까?",
    "运营是否产生利润和现金？"
  ],
  "lesson23": [
    "Expenses, Petty Cash, receivables, budgets, accounting and KPIs.",
    "Gastos, Caja Chica, cuentas por cobrar, presupuestos, contabilidad y KPIs.",
    "Dépenses, petite caisse, comptes clients, budgets, comptabilité et indicateurs.",
    "Despesas, Caixa Pequeno, contas a receber, orçamentos, contabilidade e indicadores.",
    "비용, 소액 현금, 미수금, 예산, 회계 및 KPI입니다.",
    "费用、备用金、应收账款、预算、会计和关键绩效指标。"
  ],
  "lesson24": [
    "Mexico",
    "México",
    "Mexique",
    "México",
    "멕시코",
    "墨西哥"
  ],
  "lesson25": [
    "Help family businesses and SMEs professionalize after growing through spreadsheets, messaging and separate controls.",
    "Profesionalizar empresas familiares y pymes que crecieron con hojas de cálculo, mensajería y controles separados.",
    "Professionnaliser les entreprises familiales et les PME qui ont grandi avec des feuilles de calcul, la messagerie et des contrôles séparés.",
    "Profissionalizar empresas familiares e PMEs que cresceram com planilhas, mensagens e controles separados.",
    "스프레드시트, 메시지 및 개별 관리 방식으로 성장한 가족 기업과 중소기업의 체계화를 돕습니다.",
    "帮助依靠电子表格、消息和独立管控发展起来的家族企业及中小企业实现专业化。"
  ],
  "lesson26": [
    "Cash control, attendance, expenses, inventory, branches and visibility for the owner.",
    "Control de efectivo, asistencia, gastos, inventario, sucursales y visibilidad para el propietario.",
    "Contrôle de la caisse, assiduité, dépenses, stocks, succursales et visibilité pour le propriétaire.",
    "Controle de caixa, presença, despesas, estoque, filiais e visibilidade para o proprietário.",
    "현금 관리, 출근, 비용, 재고, 지점 및 소유자의 현황 파악입니다.",
    "现金管控、考勤、费用、库存、分支机构和所有者可视化。"
  ],
  "lesson27": [
    "Petty Cash, Human Resources, Expenses, Point of Sale and Inventory.",
    "Caja Chica, Recursos Humanos, Gastos, Punto de Venta e Inventarios.",
    "Petite caisse, Ressources humaines, Dépenses, Point de vente et Stocks.",
    "Caixa Pequeno, Recursos Humanos, Despesas, Ponto de Venda e Estoque.",
    "소액 현금, 인사, 비용, 판매 시점 관리 및 재고입니다.",
    "备用金、人力资源、费用、销售点和库存。"
  ],
  "lesson28": [
    "Colombia",
    "Colombia",
    "Colombie",
    "Colômbia",
    "콜롬비아",
    "哥伦比亚"
  ],
  "lesson29": [
    "Support service, trading and distributed-operation businesses that need clearer responsibilities and follow-up.",
    "Acompañar negocios de servicios, comercio y operación distribuida que necesitan ordenar responsabilidades y seguimiento.",
    "Accompagner les entreprises de services, de commerce et d’opérations réparties qui doivent organiser les responsabilités et le suivi.",
    "Apoiar empresas de serviços, comércio e operação distribuída que precisam organizar responsabilidades e acompanhamento.",
    "책임과 후속 관리를 정리해야 하는 서비스, 상업 및 분산 운영 기업을 지원합니다.",
    "支持需要理清职责和跟进机制的服务、贸易及分布式运营企业。"
  ],
  "lesson30": [
    "Processes, tasks, receivables, sales control, attendance and profitability analysis.",
    "Procesos, tareas, cartera, control comercial, asistencia y análisis de rentabilidad.",
    "Processus, tâches, comptes clients, contrôle commercial, assiduité et analyse de rentabilité.",
    "Processos, tarefas, contas a receber, controle comercial, presença e análise de rentabilidade.",
    "프로세스, 작업, 미수금, 영업 관리, 출근 및 수익성 분석입니다.",
    "流程、任务、应收账款、销售管控、考勤和盈利分析。"
  ],
  "lesson31": [
    "Processes and Tasks, Sales, Receivables, Human Resources and KPIs.",
    "Procesos y Tareas, Ventas, Cartera, Recursos Humanos y KPIs.",
    "Processus et tâches, Ventes, Comptes clients, Ressources humaines et Indicateurs.",
    "Processos e Tarefas, Vendas, Contas a Receber, Recursos Humanos e Indicadores.",
    "프로세스 및 작업, 영업, 미수금, 인사 및 KPI입니다.",
    "流程和任务、销售、应收账款、人力资源和关键绩效指标。"
  ],
  "lesson32": [
    "Canada",
    "Canadá",
    "Canada",
    "Canadá",
    "캐나다",
    "加拿大"
  ],
  "lesson33": [
    "Serve multicultural companies that value traceability, documentation, self-service and standardized operations.",
    "Servir empresas multiculturales que valoran trazabilidad, documentación, autoservicio y operación estandarizada.",
    "Servir les entreprises multiculturelles qui valorisent la traçabilité, la documentation, le libre-service et les opérations normalisées.",
    "Atender empresas multiculturais que valorizam rastreabilidade, documentação, autosserviço e operação padronizada.",
    "추적 가능성, 문서화, 셀프서비스 및 표준화된 업무를 중시하는 다문화 기업을 지원합니다.",
    "服务重视可追溯性、文档、自助服务和标准化运营的多元文化企业。"
  ],
  "lesson34": [
    "Standardization, permissions, evidence, mobile-team oversight and executive insight.",
    "Estandarización, permisos, evidencia, control de equipos móviles y lectura ejecutiva.",
    "Normalisation, permissions, preuves, gestion des équipes mobiles et vision de la direction.",
    "Padronização, permissões, evidências, controle de equipes móveis e visão executiva.",
    "표준화, 권한, 증빙, 현장 이동 팀 관리 및 경영진의 통찰입니다.",
    "标准化、权限、证据、移动团队管理和管理层洞察。"
  ],
  "lesson35": [
    "Processes and Tasks, Human Resources, KPIs and self-service modules.",
    "Procesos y Tareas, Recursos Humanos, KPIs y módulos de autoservicio.",
    "Processus et tâches, Ressources humaines, Indicateurs et modules libre-service.",
    "Processos e Tarefas, Recursos Humanos, Indicadores e módulos de autosserviço.",
    "프로세스 및 작업, 인사, KPI 및 셀프서비스 모듈입니다.",
    "流程和任务、人力资源、关键绩效指标和自助服务模块。"
  ],
  "lesson36": [
    "United States",
    "Estados Unidos",
    "États-Unis",
    "Estados Unidos",
    "미국",
    "美国"
  ],
  "lesson37": [
    "Support small businesses and Latino-owned businesses that need to grow while retaining control and reducing reliance on the founder.",
    "Apoyar pequeñas empresas y negocios latinos que requieren crecer sin perder control ni depender del fundador.",
    "Soutenir les petites entreprises et les entreprises latino-américaines qui veulent grandir sans perdre le contrôle ni dépendre du fondateur.",
    "Apoiar pequenas empresas e negócios latinos que precisam crescer sem perder o controle nem depender do fundador.",
    "관리를 유지하고 창업자 의존도를 줄이면서 성장해야 하는 소기업과 라틴계 기업을 지원합니다.",
    "支持需要在保持管控、减少创始人依赖的同时发展的中小企业和拉丁裔企业。"
  ],
  "lesson38": [
    "Delegation, branch operations, sales, inventory, follow-up and straightforward financial control.",
    "Delegación, operación por sucursal, ventas, inventario, seguimiento y control financiero sencillo.",
    "Délégation, opérations par succursale, ventes, stocks, suivi et contrôle financier simple.",
    "Delegação, operação por filial, vendas, estoque, acompanhamento e controle financeiro simples.",
    "업무 위임, 지점 운영, 판매, 재고, 후속 관리 및 간단한 재무 관리입니다.",
    "授权、分支运营、销售、库存、跟进和简明财务管控。"
  ],
  "lesson39": [
    "Home Dashboard, Sales, Inventory, Processes and Tasks, and Finance.",
    "Panel Inicial, Ventas, Inventarios, Procesos y Tareas y Finanzas.",
    "Tableau de bord initial, Ventes, Stocks, Processus et tâches et Finances.",
    "Painel Inicial, Vendas, Estoque, Processos e Tarefas e Finanças.",
    "홈 대시보드, 영업, 재고, 프로세스 및 작업, 재무입니다.",
    "主页仪表板、销售、库存、流程和任务及财务。"
  ],
  "lesson40": [
    "Brazil",
    "Brasil",
    "Brésil",
    "Brasil",
    "브라질",
    "巴西"
  ],
  "lesson41": [
    "Organize commercial and staff operations in companies with large teams and multiple service locations.",
    "Ordenar operaciones comerciales y de personal en empresas con equipos amplios y múltiples puntos de atención.",
    "Organiser les opérations commerciales et du personnel dans les entreprises ayant de grandes équipes et plusieurs points de service.",
    "Organizar operações comerciais e de pessoal em empresas com equipes amplas e vários pontos de atendimento.",
    "대규모 팀과 여러 서비스 지점을 가진 기업의 거래 및 인력 업무를 정리합니다.",
    "梳理拥有大型团队和多个服务网点的企业的商业与人员运营。"
  ],
  "lesson42": [
    "Visibility by unit and oversight of people, products, expenses and performance.",
    "Visibilidad por unidad, control de personas, productos, gastos y desempeño.",
    "Visibilité par unité et contrôle des personnes, des produits, des dépenses et du rendement.",
    "Visibilidade por unidade e controle de pessoas, produtos, despesas e desempenho.",
    "단위별 현황 및 인력, 제품, 비용, 성과 관리입니다.",
    "按单位查看情况，管控人员、产品、费用和绩效。"
  ],
  "lesson43": [
    "Human Resources, Point of Sale, Inventory, Expenses and KPIs.",
    "Recursos Humanos, Punto de Venta, Inventarios, Gastos y KPIs.",
    "Ressources humaines, Point de vente, Stocks, Dépenses et Indicateurs.",
    "Recursos Humanos, Ponto de Venda, Estoque, Despesas e Indicadores.",
    "인사, 판매 시점 관리, 재고, 비용 및 KPI입니다.",
    "人力资源、销售点、库存、费用和关键绩效指标。"
  ],
  "lesson44": [
    "Home Dashboard",
    "Panel Inicial",
    "Tableau de bord initial",
    "Painel Inicial",
    "홈 대시보드",
    "主页仪表板"
  ],
  "lesson45": [
    "Build the organizational foundation used by the other modules.",
    "Construye la base organizacional sobre la que trabajan los demás módulos.",
    "Construire la base organisationnelle utilisée par les autres modules.",
    "Construir a base organizacional usada pelos demais módulos.",
    "다른 모듈이 사용하는 조직 기반을 구축합니다.",
    "构建其他模块运行所依赖的组织基础。"
  ],
  "lesson46": [
    "Company profile and details",
    "Perfil y datos de la empresa",
    "Profil et renseignements de l’entreprise",
    "Perfil e dados da empresa",
    "회사 프로필 및 정보",
    "公司资料和信息"
  ],
  "lesson47": [
    "Business units and structure",
    "Unidades de negocio y estructura",
    "Unités d’affaires et structure",
    "Unidades de negócio e estrutura",
    "사업 단위 및 구조",
    "业务单位和组织架构"
  ],
  "lesson48": [
    "Users and permissions",
    "Usuarios y permisos",
    "Utilisateurs et permissions",
    "Usuários e permissões",
    "사용자 및 권한",
    "用户和权限"
  ],
  "lesson49": [
    "Business maturity assessment",
    "Diagnóstico de madurez empresarial",
    "Diagnostic de maturité de l’entreprise",
    "Diagnóstico de maturidade empresarial",
    "기업 성숙도 진단",
    "企业成熟度评估"
  ],
  "lesson50": [
    "Avoid starting operations without accountable people, structure or business context.",
    "Evita comenzar a operar sin responsables, estructura o contexto empresarial.",
    "Éviter de démarrer sans responsables, structure ou contexte d’entreprise.",
    "Evitar começar a operar sem responsáveis, estrutura ou contexto empresarial.",
    "담당자, 구조 또는 기업 배경 없이 업무를 시작하는 일을 방지합니다.",
    "避免在缺少负责人、架构或企业背景的情况下开始运营。"
  ],
  "lesson51": [
    "Human Resources",
    "Recursos Humanos",
    "Ressources humaines",
    "Recursos Humanos",
    "인사",
    "人力资源"
  ],
  "lesson52": [
    "Centralize information and operations related to employees.",
    "Centraliza la información y operación relacionada con los colaboradores.",
    "Centraliser l’information et les opérations liées aux employés.",
    "Centralizar informações e operações relacionadas aos colaboradores.",
    "직원 관련 정보와 업무를 중앙에서 관리합니다.",
    "集中管理员工相关信息和业务。"
  ],
  "lesson53": [
    "Onboarding and employee records",
    "Altas y expedientes",
    "Embauches et dossiers",
    "Admissões e cadastros",
    "입사 및 직원 기록",
    "入职和员工档案"
  ],
  "lesson54": [
    "Positions, departments and responsible people",
    "Puestos, áreas y responsables",
    "Postes, services et responsables",
    "Cargos, áreas e responsáveis",
    "직책, 부서 및 담당자",
    "岗位、部门和负责人"
  ],
  "lesson55": [
    "Attendance and schedules",
    "Asistencia y horarios",
    "Assiduité et horaires",
    "Presença e horários",
    "출근 및 일정",
    "考勤和排班"
  ],
  "lesson56": [
    "Documents, incidents and payroll",
    "Documentos, incidencias y nómina",
    "Documents, incidents et paie",
    "Documentos, ocorrências e folha de pagamento",
    "문서, 사건 및 급여",
    "文档、异常情况和薪资"
  ],
  "lesson57": [
    "Understand who is on the team, where they are and what needs attention.",
    "Ayuda a saber quién integra el equipo, dónde está y qué necesita atención.",
    "Savoir qui fait partie de l’équipe, où chacun se trouve et ce qui nécessite une attention.",
    "Saber quem integra a equipe, onde está e o que precisa de atenção.",
    "팀 구성원과 위치, 주의가 필요한 사항을 파악합니다.",
    "了解团队成员、所在位置以及需要关注的事项。"
  ],
  "lesson58": [
    "Processes and Tasks",
    "Procesos y Tareas",
    "Processus et tâches",
    "Processos e Tarefas",
    "프로세스 및 작업",
    "流程和任务"
  ],
  "lesson59": [
    "Organize recurring work and team responsibilities.",
    "Organiza el trabajo recurrente y las responsabilidades del equipo.",
    "Organiser le travail récurrent et les responsabilités de l’équipe.",
    "Organizar o trabalho recorrente e as responsabilidades da equipe.",
    "반복 업무와 팀의 책임을 정리합니다.",
    "组织重复性工作和团队职责。"
  ],
  "lesson60": [
    "Processes and stages",
    "Procesos y etapas",
    "Processus et étapes",
    "Processos e etapas",
    "프로세스 및 단계",
    "流程和阶段"
  ],
  "lesson61": [
    "Tasks, priorities and dates",
    "Tareas, prioridades y fechas",
    "Tâches, priorités et dates",
    "Tarefas, prioridades e datas",
    "작업, 우선순위 및 날짜",
    "任务、优先级和日期"
  ],
  "lesson62": [
    "Projects and calendars",
    "Proyectos y calendarios",
    "Projets et calendriers",
    "Projetos e calendários",
    "프로젝트 및 일정",
    "项目和日历"
  ],
  "lesson63": [
    "Evidence, comments and follow-up",
    "Evidencia, comentarios y seguimiento",
    "Preuves, commentaires et suivi",
    "Evidências, comentários e acompanhamento",
    "증빙, 의견 및 후속 관리",
    "证据、评论和跟进"
  ],
  "lesson64": [
    "Reduce forgotten tasks, informal follow-up and dependence on one person.",
    "Reduce olvidos, seguimiento informal y dependencia de una sola persona.",
    "Réduire les oublis, le suivi informel et la dépendance envers une seule personne.",
    "Reduzir esquecimentos, acompanhamento informal e dependência de uma única pessoa.",
    "업무 누락, 비공식 후속 관리 및 한 사람에 대한 의존도를 줄입니다.",
    "减少遗忘、非正式跟进和对个人的依赖。"
  ],
  "lesson65": [
    "Expenses",
    "Gastos",
    "Dépenses",
    "Despesas",
    "비용",
    "费用"
  ],
  "lesson66": [
    "Record, classify and control company spending.",
    "Registra, clasifica y controla los egresos de la empresa.",
    "Enregistrer, classer et contrôler les dépenses de l’entreprise.",
    "Registrar, classificar e controlar as despesas da empresa.",
    "회사 지출을 기록, 분류 및 관리합니다.",
    "记录、分类和管控公司支出。"
  ],
  "lesson67": [
    "Entry and receipts",
    "Captura y comprobantes",
    "Saisie et justificatifs",
    "Lançamentos e comprovantes",
    "입력 및 영수증",
    "录入和凭证"
  ],
  "lesson68": [
    "Categories and suppliers",
    "Categorías y proveedores",
    "Catégories et fournisseurs",
    "Categorias e fornecedores",
    "분류 및 공급업체",
    "类别和供应商"
  ],
  "lesson69": [
    "Approvals",
    "Aprobaciones",
    "Approbations",
    "Aprovações",
    "승인",
    "审批"
  ],
  "lesson70": [
    "Budgets and ledger accounts",
    "Presupuestos y cuentas contables",
    "Budgets et comptes comptables",
    "Orçamentos e contas contábeis",
    "예산 및 회계 계정",
    "预算和会计科目"
  ],
  "lesson71": [
    "Understand where money is used and control deviations.",
    "Permite entender en qué se utiliza el dinero y controlar desviaciones.",
    "Comprendre où l’argent est utilisé et contrôler les écarts.",
    "Entender onde o dinheiro é usado e controlar desvios.",
    "자금의 사용처를 파악하고 편차를 관리합니다.",
    "了解资金用途并控制偏差。"
  ],
  "lesson72": [
    "Petty Cash",
    "Caja Chica",
    "Petite caisse",
    "Caixa Pequeno",
    "소액 현금",
    "备用金"
  ],
  "lesson73": [
    "Control operating funds and small cash transactions.",
    "Controla fondos operativos y movimientos de efectivo de bajo monto.",
    "Contrôler les fonds opérationnels et les petits mouvements de caisse.",
    "Controlar fundos operacionais e movimentações de caixa de pequeno valor.",
    "운영 자금과 소액 현금 거래를 관리합니다.",
    "管控运营资金和小额现金交易。"
  ],
  "lesson74": [
    "Funds and responsible people",
    "Fondos y responsables",
    "Fonds et responsables",
    "Fundos e responsáveis",
    "자금 및 담당자",
    "资金和负责人"
  ],
  "lesson75": [
    "Receipts, withdrawals and reimbursements",
    "Ingresos, retiros y reembolsos",
    "Encaissements, retraits et remboursements",
    "Entradas, retiradas e reembolsos",
    "입금, 출금 및 환급",
    "收款、提款和报销"
  ],
  "lesson76": [
    "Supporting receipts",
    "Comprobantes",
    "Justificatifs",
    "Comprovantes",
    "증빙 영수증",
    "凭证"
  ],
  "lesson77": [
    "Closings and statements",
    "Cortes y estados",
    "Clôtures et relevés",
    "Fechamentos e extratos",
    "마감 및 명세서",
    "结算和报表"
  ],
  "lesson78": [
    "Reduce cash leakage, unsupported transactions and cash discrepancies.",
    "Disminuye fugas, movimientos sin evidencia y diferencias de efectivo.",
    "Réduire les pertes, les mouvements sans preuve et les écarts de caisse.",
    "Reduzir perdas, movimentações sem evidência e diferenças de caixa.",
    "현금 유출, 증빙 없는 거래 및 현금 차이를 줄입니다.",
    "减少资金流失、无凭证交易和现金差异。"
  ],
  "lesson79": [
    "Point of Sale",
    "Punto de Venta",
    "Point de vente",
    "Ponto de Venda",
    "판매 시점 관리",
    "销售点"
  ],
  "lesson80": [
    "Process in-person sales connected to products, customers and registers.",
    "Ejecuta ventas presenciales conectadas con productos, clientes y cajas.",
    "Exécuter les ventes en personne en lien avec les produits, les clients et les caisses.",
    "Realizar vendas presenciais conectadas a produtos, clientes e caixas.",
    "제품, 고객 및 계산대와 연결된 대면 판매를 처리합니다.",
    "处理连接产品、客户和收银台的线下销售。"
  ],
  "lesson81": [
    "Payments and receipts",
    "Cobro y tickets",
    "Paiements et reçus",
    "Pagamentos e recibos",
    "결제 및 영수증",
    "付款和小票"
  ],
  "lesson82": [
    "Customers and products",
    "Clientes y productos",
    "Clients et produits",
    "Clientes e produtos",
    "고객 및 제품",
    "客户和产品"
  ],
  "lesson83": [
    "Registers and closings",
    "Cajas y cortes",
    "Caisses et clôtures",
    "Caixas e fechamentos",
    "계산대 및 마감",
    "收银台和结算"
  ],
  "lesson84": [
    "Kiosks and self-service",
    "Kioscos y autoservicio",
    "Kiosques et libre-service",
    "Quiosques e autosserviço",
    "키오스크 및 셀프서비스",
    "自助终端和自助服务"
  ],
  "lesson85": [
    "Connect daily transactions with the rest of the operation.",
    "Conecta la transacción diaria con el resto de la operación.",
    "Relier les transactions quotidiennes au reste des opérations.",
    "Conectar as transações diárias ao restante da operação.",
    "일일 거래를 나머지 업무와 연결합니다.",
    "将日常交易与其他业务连接起来。"
  ],
  "lesson86": [
    "Sales and CRM",
    "Ventas y CRM",
    "Ventes et CRM",
    "Vendas e CRM",
    "영업 및 CRM",
    "销售和 CRM"
  ],
  "lesson87": [
    "Follow the customer relationship from prospecting to after-sales service.",
    "Da seguimiento a la relación comercial desde el prospecto hasta la posventa.",
    "Suivre la relation commerciale du prospect au service après-vente.",
    "Acompanhar a relação comercial da prospecção ao pós-venda.",
    "잠재 고객 발굴부터 사후 서비스까지 고객 관계를 관리합니다.",
    "跟进从潜在客户到售后的商业关系。"
  ],
  "lesson88": [
    "Customers and contacts",
    "Clientes y contactos",
    "Clients et contacts",
    "Clientes e contatos",
    "고객 및 연락처",
    "客户和联系人"
  ],
  "lesson89": [
    "Opportunities and follow-up",
    "Oportunidades y seguimiento",
    "Occasions et suivi",
    "Oportunidades e acompanhamento",
    "기회 및 후속 관리",
    "商机和跟进"
  ],
  "lesson90": [
    "Quotes",
    "Cotizaciones",
    "Devis",
    "Orçamentos",
    "견적",
    "报价"
  ],
  "lesson91": [
    "Sales, contracts and commissions",
    "Ventas, contratos y comisiones",
    "Ventes, contrats et commissions",
    "Vendas, contratos e comissões",
    "판매, 계약 및 수수료",
    "销售、合同和佣金"
  ],
  "lesson92": [
    "Avoid lost opportunities and manage a repeatable sales process.",
    "Evita perder oportunidades y permite administrar un proceso comercial repetible.",
    "Éviter de perdre des occasions et gérer un processus commercial répétable.",
    "Evitar oportunidades perdidas e administrar um processo comercial repetível.",
    "기회를 놓치지 않고 반복 가능한 영업 프로세스를 관리합니다.",
    "避免错失商机，管理可重复的销售流程。"
  ],
  "lesson93": [
    "Inventory",
    "Inventarios",
    "Stocks",
    "Estoque",
    "재고",
    "库存"
  ],
  "lesson94": [
    "Control products, stock, warehouses and purchasing.",
    "Controla productos, existencias, almacenes y abastecimiento.",
    "Contrôler les produits, les stocks, les entrepôts et l’approvisionnement.",
    "Controlar produtos, estoques, armazéns e abastecimento.",
    "제품, 재고, 창고 및 조달을 관리합니다.",
    "管控产品、存货、仓库和补货。"
  ],
  "lesson95": [
    "Catalog and variants",
    "Catálogo y variantes",
    "Catalogue et variantes",
    "Catálogo e variações",
    "카탈로그 및 변형",
    "目录和变体"
  ],
  "lesson96": [
    "Stock and movements",
    "Existencias y movimientos",
    "Stocks et mouvements",
    "Estoque e movimentações",
    "재고 및 이동",
    "存货和变动"
  ],
  "lesson97": [
    "Warehouses",
    "Almacenes",
    "Entrepôts",
    "Armazéns",
    "창고",
    "仓库"
  ],
  "lesson98": [
    "Suppliers and purchase orders",
    "Proveedores y órdenes de compra",
    "Fournisseurs et bons de commande",
    "Fornecedores e pedidos de compra",
    "공급업체 및 구매 주문",
    "供应商和采购订单"
  ],
  "lesson99": [
    "Reduce shortages, improvised purchasing and differences between sales and stock.",
    "Reduce faltantes, compras improvisadas y diferencias entre venta y existencia.",
    "Réduire les ruptures, les achats improvisés et les écarts entre ventes et stocks.",
    "Reduzir faltas, compras improvisadas e diferenças entre vendas e estoque.",
    "품절, 즉흥적 구매 및 판매와 재고 간 차이를 줄입니다.",
    "减少缺货、临时采购以及销售与库存之间的差异。"
  ],
  "lesson100": [
    "Receivables",
    "Cartera",
    "Comptes clients",
    "Contas a Receber",
    "미수금",
    "应收账款"
  ],
  "lesson101": [
    "Organize credit sales, balances, due dates and collections.",
    "Organiza ventas a crédito, saldos, vencimientos y cobranza.",
    "Organiser les ventes à crédit, les soldes, les échéances et le recouvrement.",
    "Organizar vendas a prazo, saldos, vencimentos e cobrança.",
    "외상 판매, 잔액, 기한 및 수금을 정리합니다.",
    "组织赊销、余额、到期日和收款。"
  ],
  "lesson102": [
    "Credit customers",
    "Clientes de crédito",
    "Clients à crédit",
    "Clientes a prazo",
    "외상 고객",
    "赊销客户"
  ],
  "lesson103": [
    "Accounts receivable",
    "Cuentas por cobrar",
    "Comptes clients",
    "Contas a receber",
    "미수금",
    "应收账款"
  ],
  "lesson104": [
    "Payments and allocations",
    "Pagos y aplicaciones",
    "Paiements et imputations",
    "Pagamentos e aplicações",
    "결제 및 배분",
    "付款和核销"
  ],
  "lesson105": [
    "Due dates and follow-up",
    "Vencimientos y seguimiento",
    "Échéances et suivi",
    "Vencimentos e acompanhamento",
    "기한 및 후속 관리",
    "到期日和跟进"
  ],
  "lesson106": [
    "Turn unpaid sales into a visible plan for recovering cash.",
    "Convierte ventas pendientes en un plan visible de recuperación de efectivo.",
    "Transformer les ventes impayées en plan visible de recouvrement des liquidités.",
    "Transformar vendas pendentes em um plano visível de recuperação de caixa.",
    "미결제 판매를 눈에 보이는 현금 회수 계획으로 전환합니다.",
    "将未付销售款转化为清晰可见的现金回收计划。"
  ],
  "lesson107": [
    "Turn module activity into information for decision-making.",
    "Convierte la actividad de los módulos en información para decidir.",
    "Transformer l’activité des modules en information pour décider.",
    "Transformar a atividade dos módulos em informação para decidir.",
    "모듈 활동을 의사결정을 위한 정보로 전환합니다.",
    "将模块活动转化为决策信息。"
  ],
  "lesson108": [
    "Executive indicators",
    "Indicadores ejecutivos",
    "Indicateurs de direction",
    "Indicadores executivos",
    "경영 지표",
    "管理层指标"
  ],
  "lesson109": [
    "Filters and comparisons",
    "Filtros y comparativos",
    "Filtres et comparaisons",
    "Filtros e comparativos",
    "필터 및 비교",
    "筛选和对比"
  ],
  "lesson110": [
    "Financial statements",
    "Estados financieros",
    "États financiers",
    "Demonstrações financeiras",
    "재무제표",
    "财务报表"
  ],
  "lesson111": [
    "Automated reports",
    "Reportes automatizados",
    "Rapports automatisés",
    "Relatórios automatizados",
    "자동 보고서",
    "自动报表"
  ],
  "lesson112": [
    "Move from entering data to understanding trends, risks and priorities.",
    "Ayuda a pasar de capturar datos a comprender tendencias, riesgos y prioridades.",
    "Passer de la saisie de données à la compréhension des tendances, des risques et des priorités.",
    "Passar da captura de dados à compreensão de tendências, riscos e prioridades.",
    "데이터 입력을 넘어 추세, 위험 및 우선순위를 이해합니다.",
    "从录入数据转向理解趋势、风险和优先事项。"
  ],
  "lesson113": [
    "Define the structure",
    "Definir estructura",
    "Définir la structure",
    "Definir a estrutura",
    "구조 정의",
    "定义架构"
  ],
  "lesson114": [
    "Configure the company, units, users, positions and permissions.",
    "Configura empresa, unidades, usuarios, puestos y permisos.",
    "Configurer l’entreprise, les unités, les utilisateurs, les postes et les permissions.",
    "Configurar empresa, unidades, usuários, cargos e permissões.",
    "회사, 단위, 사용자, 직책 및 권한을 설정합니다.",
    "配置公司、单位、用户、岗位和权限。"
  ],
  "lesson115": [
    "Assign responsibility",
    "Asignar responsables",
    "Assigner les responsables",
    "Atribuir responsáveis",
    "담당자 배정",
    "分配负责人"
  ],
  "lesson116": [
    "Every activity has a person, a date and a clear expectation.",
    "Cada actividad tiene una persona, una fecha y una expectativa clara.",
    "Chaque activité a une personne, une date et une attente claire.",
    "Cada atividade tem uma pessoa, uma data e uma expectativa clara.",
    "각 활동에는 담당자, 날짜 및 명확한 기대 결과가 있습니다.",
    "每项活动都有负责人、日期和明确预期。"
  ],
  "lesson117": [
    "Execute processes",
    "Ejecutar procesos",
    "Exécuter les processus",
    "Executar processos",
    "프로세스 실행",
    "执行流程"
  ],
  "lesson118": [
    "The team works with tasks, evidence and visible follow-up.",
    "El equipo trabaja con tareas, evidencias y seguimiento visible.",
    "L’équipe travaille avec des tâches, des preuves et un suivi visible.",
    "A equipe trabalha com tarefas, evidências e acompanhamento visível.",
    "팀은 작업, 증빙 및 눈에 보이는 후속 관리로 업무를 수행합니다.",
    "团队通过任务、证据和可见的跟进开展工作。"
  ],
  "lesson119": [
    "Sell or deliver",
    "Vender o entregar",
    "Vendre ou livrer",
    "Vender ou entregar",
    "판매 또는 납품",
    "销售或交付"
  ],
  "lesson120": [
    "Commercial operations connect customers, products and commitments.",
    "La operación comercial conecta clientes, productos y compromisos.",
    "Les opérations commerciales relient les clients, les produits et les engagements.",
    "A operação comercial conecta clientes, produtos e compromissos.",
    "거래 업무는 고객, 제품 및 약속을 연결합니다.",
    "商业运营连接客户、产品和承诺。"
  ],
  "lesson121": [
    "Record transactions",
    "Registrar movimientos",
    "Enregistrer les mouvements",
    "Registrar movimentações",
    "거래 기록",
    "记录交易"
  ],
  "lesson122": [
    "Sales, expenses, inventory and cash leave evidence.",
    "Ventas, gastos, inventario y efectivo dejan evidencia.",
    "Les ventes, les dépenses, les stocks et la caisse laissent des preuves.",
    "Vendas, despesas, estoque e caixa deixam evidências.",
    "판매, 비용, 재고 및 현금에 대한 증빙이 남습니다.",
    "销售、费用、库存和现金留下证据。"
  ],
  "lesson123": [
    "Measure results",
    "Medir resultados",
    "Mesurer les résultats",
    "Medir resultados",
    "결과 측정",
    "衡量结果"
  ],
  "lesson124": [
    "Operational data becomes indicators and alerts.",
    "Los datos operativos se convierten en indicadores y alertas.",
    "Les données opérationnelles deviennent des indicateurs et des alertes.",
    "Os dados operacionais se tornam indicadores e alertas.",
    "업무 데이터가 지표와 알림으로 전환됩니다.",
    "业务数据转化为指标和提醒。"
  ],
  "lesson125": [
    "Improve",
    "Mejorar",
    "Améliorer",
    "Melhorar",
    "개선",
    "改进"
  ],
  "lesson126": [
    "The owner makes informed decisions and the consultant supports the change.",
    "El dueño decide con contexto y el consultor acompaña el cambio.",
    "Le propriétaire décide avec du contexte et le consultant accompagne le changement.",
    "O proprietário decide com contexto e o consultor acompanha a mudança.",
    "소유자는 배경 정보를 바탕으로 결정하고 컨설턴트는 변화를 지원합니다.",
    "所有者根据背景信息决策，顾问协助推进变革。"
  ],
  "lesson127": [
    "“I feel like cash is going missing”",
    "“Siento que se pierde dinero en efectivo”",
    "« J’ai l’impression que de l’argent liquide disparaît »",
    "“Sinto que o dinheiro em espécie está sumindo”",
    "“현금이 새는 것 같습니다”",
    "“我感觉现金在流失”"
  ],
  "lesson128": [
    "Funds, responsible people, receipts and closings lack traceability.",
    "Falta trazabilidad de fondos, responsables, comprobantes y cortes.",
    "Les fonds, les responsables, les justificatifs et les clôtures manquent de traçabilité.",
    "Falta rastreabilidade de fundos, responsáveis, comprovantes e fechamentos.",
    "자금, 담당자, 영수증 및 마감의 추적 정보가 부족합니다.",
    "资金、负责人、凭证和结算缺乏可追溯性。"
  ],
  "lesson129": [
    "Every transaction is linked to a person, evidence and a status.",
    "Cada movimiento queda asociado a una persona, evidencia y estado.",
    "Chaque mouvement est lié à une personne, à une preuve et à un état.",
    "Cada movimentação fica associada a uma pessoa, uma evidência e um status.",
    "모든 거래가 담당자, 증빙 및 상태와 연결됩니다.",
    "每笔交易都关联到人员、证据和状态。"
  ],
  "lesson130": [
    "“My staff arrive whenever they want”",
    "“Mi personal llega cuando quiere”",
    "« Mon personnel arrive quand il veut »",
    "“Meu pessoal chega quando quer”",
    "“직원들이 제멋대로 출근합니다”",
    "“员工想什么时候来就什么时候来”"
  ],
  "lesson131": [
    "There is no reliable view of schedules, attendance and incidents.",
    "No existe una lectura confiable de horarios, asistencia e incidencias.",
    "Il n’existe pas de vue fiable des horaires, de l’assiduité et des incidents.",
    "Não há uma visão confiável de horários, presença e ocorrências.",
    "일정, 출근 및 사건에 대한 신뢰할 수 있는 정보가 없습니다.",
    "缺少对排班、考勤和异常情况的可靠了解。"
  ],
  "lesson132": [
    "The company gains records, rules and follow-up for its team.",
    "La empresa obtiene registros, reglas y seguimiento sobre su equipo.",
    "L’entreprise obtient des registres, des règles et un suivi de son équipe.",
    "A empresa obtém registros, regras e acompanhamento da equipe.",
    "회사는 팀에 대한 기록, 규칙 및 후속 관리 수단을 갖추게 됩니다.",
    "公司获得团队记录、规则和跟进机制。"
  ],
  "lesson133": [
    "“Everything depends on me remembering things”",
    "“Todo depende de que yo recuerde las cosas”",
    "« Tout dépend de ce que je me rappelle »",
    "“Tudo depende de eu lembrar das coisas”",
    "“모든 일이 제 기억에 달려 있습니다”",
    "“一切都靠我记住”"
  ],
  "lesson134": [
    "Knowledge lives in messages and people rather than a repeatable process.",
    "El conocimiento está en mensajes y personas, no en un proceso repetible.",
    "Les connaissances se trouvent dans les messages et les personnes, pas dans un processus répétable.",
    "O conhecimento está nas mensagens e nas pessoas, não em um processo repetível.",
    "지식이 반복 가능한 프로세스가 아닌 메시지와 사람에게 흩어져 있습니다.",
    "知识存在于消息和个人中，而非可重复的流程中。"
  ],
  "lesson135": [
    "Work is assigned, performed, checked and improved without depending on the founder.",
    "El trabajo se asigna, ejecuta, comprueba y mejora sin depender del fundador.",
    "Le travail est attribué, exécuté, vérifié et amélioré sans dépendre du fondateur.",
    "O trabalho é atribuído, executado, comprovado e melhorado sem depender do fundador.",
    "창업자에게 의존하지 않고 업무를 배정, 수행, 확인 및 개선합니다.",
    "无需依赖创始人，即可分配、执行、验证和改进工作。"
  ],
  "lesson136": [
    "“We have prospects, but nobody follows up”",
    "“Tenemos prospectos, pero nadie les da seguimiento”",
    "« Nous avons des prospects, mais personne ne fait le suivi »",
    "“Temos interessados, mas ninguém acompanha”",
    "“잠재 고객은 있는데 아무도 후속 연락을 하지 않습니다”",
    "“我们有潜在客户，但没人跟进”"
  ],
  "lesson137": [
    "There are no clear owners, stages or visible next sales actions.",
    "No hay responsables, etapas ni siguiente acción comercial visible.",
    "Aucun responsable, aucune étape ni prochaine action commerciale n’est visible.",
    "Não há responsáveis, etapas nem próxima ação comercial visível.",
    "담당자, 단계 또는 다음 영업 활동이 명확하지 않습니다.",
    "没有明确负责人、阶段或可见的下一步销售行动。"
  ],
  "lesson138": [
    "Every opportunity retains its context, responsible person and next step.",
    "Cada oportunidad conserva contexto, responsable y próximo paso.",
    "Chaque occasion conserve son contexte, son responsable et sa prochaine étape.",
    "Cada oportunidade mantém o contexto, o responsável e o próximo passo.",
    "각 기회에 배경 정보, 담당자 및 다음 단계가 유지됩니다.",
    "每个商机保留背景、负责人和下一步。"
  ],
  "lesson139": [
    "“Inventory never matches”",
    "“El inventario nunca coincide”",
    "« Les stocks ne correspondent jamais »",
    "“O estoque nunca confere”",
    "“재고가 늘 맞지 않습니다”",
    "“库存总是对不上”"
  ],
  "lesson140": [
    "Purchasing, sales and warehouse movements are disconnected.",
    "Las compras, ventas y movimientos de almacén están desconectados.",
    "Les achats, les ventes et les mouvements d’entrepôt sont déconnectés.",
    "Compras, vendas e movimentações de armazém estão desconectadas.",
    "구매, 판매 및 창고 이동이 서로 연결되지 않습니다.",
    "采购、销售和仓库变动相互脱节。"
  ],
  "lesson141": [
    "Stock levels are explained through verifiable movements and accountable people.",
    "La existencia se explica mediante movimientos y responsables verificables.",
    "Les stocks s’expliquent par des mouvements et des responsables vérifiables.",
    "O estoque é explicado por movimentações e responsáveis verificáveis.",
    "검증 가능한 이동과 담당자를 통해 재고 수준을 설명합니다.",
    "通过可核实的变动和负责人解释库存数量。"
  ],
  "lesson142": [
    "Show every module to impress the customer.",
    "Mostrar todos los módulos para impresionar al cliente.",
    "Montrer tous les modules pour impressionner le client.",
    "Mostrar todos os módulos para impressionar o cliente.",
    "고객에게 인상을 주기 위해 모든 모듈을 보여줍니다.",
    "展示所有模块以给客户留下印象。"
  ],
  "lesson143": [
    "This overwhelms the conversation and turns the session into a catalog without context.",
    "Satura la conversación y convierte la sesión en un catálogo sin contexto.",
    "Cela surcharge la conversation et transforme la séance en catalogue sans contexte.",
    "Isso sobrecarrega a conversa e transforma a sessão em um catálogo sem contexto.",
    "대화가 과도해지고 세션이 배경 설명 없는 상품 나열로 변합니다.",
    "这会使交流过载，将会话变成没有背景的产品目录。"
  ],
  "lesson144": [
    "Diagnose the problem and demonstrate only the workflow that creates value.",
    "Diagnosticar el dolor y demostrar solo el recorrido que genera valor.",
    "Diagnostiquer le problème et démontrer uniquement le parcours qui crée de la valeur.",
    "Diagnosticar a dor e demonstrar apenas o fluxo que gera valor.",
    "문제를 진단하고 가치를 창출하는 흐름만 시연합니다.",
    "诊断痛点，仅演示能创造价值的流程。"
  ],
  "lesson145": [
    "Correct. First understand the business, then connect the problem, pillar, module and result.",
    "Correcto. Primero se entiende la empresa; después se conectan dolor, pilar, módulo y resultado.",
    "Exact. Comprenez d’abord l’entreprise, puis reliez le problème, le pilier, le module et le résultat.",
    "Correto. Primeiro entenda a empresa; depois conecte dor, pilar, módulo e resultado.",
    "맞습니다. 먼저 기업을 이해한 다음 문제, 핵심 축, 모듈 및 결과를 연결합니다.",
    "正确。先理解企业，再连接痛点、支柱、模块和结果。"
  ],
  "lesson146": [
    "Offer a discount before understanding the operation.",
    "Ofrecer un descuento antes de conocer la operación.",
    "Offrir un rabais avant de comprendre les opérations.",
    "Oferecer desconto antes de conhecer a operação.",
    "업무를 이해하기 전에 할인을 제안합니다.",
    "在了解运营前提供折扣。"
  ],
  "lesson147": [
    "Price does not replace diagnosis. Value must be established first.",
    "El precio no sustituye el diagnóstico. Primero debe construirse valor.",
    "Le prix ne remplace pas le diagnostic. Il faut d’abord établir la valeur.",
    "O preço não substitui o diagnóstico. Primeiro é preciso construir valor.",
    "가격은 진단을 대신하지 못합니다. 먼저 가치를 확립해야 합니다.",
    "价格不能代替诊断。必须先建立价值。"
  ],
  "lesson148": [
    "Interactive induction",
    "Inducción interactiva",
    "Introduction interactive",
    "Integração interativa",
    "대화형 입문",
    "互动入门"
  ],
  "lesson149": [
    "Learn · connect · check",
    "Aprende · relaciona · comprueba",
    "Apprendre · relier · vérifier",
    "Aprender · relacionar · verificar",
    "학습 · 연결 · 확인",
    "学习 · 关联 · 检验"
  ],
  "lesson150": [
    "Understand Indice before selling Indice",
    "Entender Índice antes de vender Índice",
    "Comprendre Indice avant de vendre Indice",
    "Entender a Indice antes de vender a Indice",
    "Indice를 판매하기 전에 이해하기",
    "先理解 Indice，再销售 Indice"
  ],
  "lesson151": [
    "Do not memorize a catalog. Learn to recognize a business problem, connect it to the four pillars and demonstrate a concrete result.",
    "No memorices un catálogo. Aprende a reconocer el problema empresarial, conectarlo con los cuatro pilares y demostrar un resultado concreto.",
    "Ne mémorisez pas un catalogue. Apprenez à reconnaître le problème de l’entreprise, à le relier aux quatre piliers et à démontrer un résultat concret.",
    "Não memorize um catálogo. Aprenda a reconhecer o problema empresarial, conectá-lo aos quatro pilares e demonstrar um resultado concreto.",
    "상품 목록을 암기하지 마세요. 기업의 문제를 파악하고 네 가지 핵심 축에 연결하여 구체적인 결과를 보여주는 법을 배우세요.",
    "不要背产品目录。学会识别企业问题，将其连接到四大支柱，并展示具体结果。"
  ],
  "lesson152": [
    "Visibility",
    "Visibilidad",
    "Visibilité",
    "Visibilidade",
    "가시성",
    "可见性"
  ],
  "lesson153": [
    "Control",
    "Control",
    "Contrôle",
    "Controle",
    "관리",
    "管控"
  ],
  "lesson154": [
    "Decisions",
    "Decisión",
    "Décisions",
    "Decisão",
    "의사결정",
    "决策"
  ],
  "lesson155": [
    "The 20-second explanation",
    "La explicación en 20 segundos",
    "L’explication en 20 secondes",
    "A explicação em 20 segundos",
    "20초 설명",
    "20 秒说明"
  ],
  "lesson156": [
    "“Indice connects people, processes, products and finance so a company can see what is happening, control its operations and make informed decisions.”",
    "“Índice conecta personas, procesos, productos y finanzas para que una empresa pueda ver lo que ocurre, controlar su operación y decidir con información.”",
    "« Indice relie les personnes, les processus, les produits et les finances pour que l’entreprise voie ce qui se passe, contrôle ses opérations et décide avec de l’information. »",
    "“A Indice conecta pessoas, processos, produtos e finanças para a empresa enxergar o que acontece, controlar sua operação e decidir com informação.”",
    "“Indice는 사람, 프로세스, 제품 및 재무를 연결하여 기업이 상황을 파악하고 업무를 관리하며 정보에 기반한 결정을 내리도록 돕습니다.”",
    "“Indice 连接人员、流程、产品和财务，让企业看清现状、管控运营，并根据信息做出决策。”"
  ],
  "lesson157": [
    "Distributor rule:",
    "Regla del distribuidor:",
    "Règle du distributeur :",
    "Regra do distribuidor:",
    "유통업체의 원칙:",
    "分销商原则："
  ],
  "lesson158": [
    "if the explanation begins by listing modules, it is not yet communicating Indice’s value.",
    "si la explicación comienza enumerando módulos, todavía no está comunicando el valor de Índice.",
    "si l’explication commence par une liste de modules, elle ne communique pas encore la valeur d’Indice.",
    "se a explicação começa listando módulos, ainda não está comunicando o valor da Indice.",
    "설명을 모듈 나열로 시작한다면 아직 Indice의 가치를 전달하지 못하고 있는 것입니다.",
    "如果说明以罗列模块开始，就还没有传达 Indice 的价值。"
  ],
  "lesson159": [
    "Indice methodology",
    "Metodología Índice",
    "Méthodologie Indice",
    "Metodologia Indice",
    "Indice 방법론",
    "Indice 方法论"
  ],
  "lesson160": [
    "Explore the four pillars",
    "Explora los cuatro pilares",
    "Explorer les quatre piliers",
    "Explore os quatro pilares",
    "네 가지 핵심 축 탐색",
    "探索四大支柱"
  ],
  "lesson161": [
    "Select each pillar and practice the questions that help map the company.",
    "Selecciona cada pilar y practica las preguntas que ayudan a construir el mapa de la empresa.",
    "Sélectionnez chaque pilier et pratiquez les questions qui aident à dresser le portrait de l’entreprise.",
    "Selecione cada pilar e pratique as perguntas que ajudam a mapear a empresa.",
    "각 핵심 축을 선택하고 기업의 구조를 파악하는 데 도움이 되는 질문을 연습하세요.",
    "选择每个支柱，练习有助于了解企业全貌的问题。"
  ],
  "lesson162": [
    "Indice pillars",
    "Pilares de Índice",
    "Piliers d’Indice",
    "Pilares da Indice",
    "Indice 핵심 축",
    "Indice 支柱"
  ],
  "lesson165": [
    "Related modules:",
    "Módulos relacionados:",
    "Modules connexes :",
    "Módulos relacionados:",
    "관련 모듈:",
    "相关模块："
  ],
  "lesson166": [
    "Connected system",
    "Sistema conectado",
    "Système connecté",
    "Sistema conectado",
    "연결된 시스템",
    "互联系统"
  ],
  "lesson167": [
    "Follow the operational journey",
    "Sigue el recorrido de la operación",
    "Suivre le parcours opérationnel",
    "Siga o percurso da operação",
    "업무 흐름 따라가기",
    "跟随运营流程"
  ],
  "lesson168": [
    "Indice is more than isolated modules. Select a stage to see how activity becomes a decision.",
    "Índice no son módulos aislados. Selecciona una etapa para ver cómo la actividad se transforma en una decisión.",
    "Indice ne se limite pas à des modules isolés. Sélectionnez une étape pour voir comment l’activité devient une décision.",
    "A Indice não é um conjunto de módulos isolados. Selecione uma etapa para ver como a atividade se transforma em decisão.",
    "Indice는 독립된 모듈의 집합이 아닙니다. 단계를 선택하여 활동이 의사결정으로 이어지는 과정을 확인하세요.",
    "Indice 不只是孤立模块。选择一个阶段，查看活动如何转化为决策。"
  ],
  "lesson169": [
    "Operational journey",
    "Recorrido operativo",
    "Parcours opérationnel",
    "Percurso operacional",
    "업무 흐름",
    "运营流程"
  ],
  "lesson171": [
    "Previous stage",
    "Etapa anterior",
    "Étape précédente",
    "Etapa anterior",
    "이전 단계",
    "上一阶段"
  ],
  "lesson172": [
    "Next stage",
    "Siguiente etapa",
    "Étape suivante",
    "Próxima etapa",
    "다음 단계",
    "下一阶段"
  ],
  "lesson173": [
    "Consultative practice",
    "Práctica consultiva",
    "Pratique de consultation",
    "Prática consultiva",
    "상담 실습",
    "顾问式实践"
  ],
  "lesson174": [
    "Turn a problem into a solution",
    "Convierte un dolor en una solución",
    "Transformer un problème en solution",
    "Transforme uma dor em solução",
    "문제를 해결책으로 전환",
    "将痛点转化为解决方案"
  ],
  "lesson175": [
    "Choose what the customer says. The academy shows the right reasoning before presenting a module.",
    "Elige lo que dice el cliente. La academia te muestra el razonamiento correcto antes de presentar un módulo.",
    "Choisissez les propos du client. L’académie montre le bon raisonnement avant de présenter un module.",
    "Escolha o que o cliente diz. A academia mostra o raciocínio correto antes de apresentar um módulo.",
    "고객의 말을 선택하세요. 아카데미가 모듈 제시 전에 올바른 사고 과정을 보여줍니다.",
    "选择客户的话。学院会在介绍模块前展示正确的推理方式。"
  ],
  "lesson176": [
    "Customer problems",
    "Dolores del cliente",
    "Problèmes du client",
    "Dores do cliente",
    "고객의 문제",
    "客户痛点"
  ],
  "lesson177": [
    "Reasoning map",
    "Mapa de razonamiento",
    "Carte du raisonnement",
    "Mapa de raciocínio",
    "사고 과정 지도",
    "推理图"
  ],
  "lesson178": [
    "1. Problem",
    "1. Dolor",
    "1. Problème",
    "1. Dor",
    "1. 문제",
    "1. 痛点"
  ],
  "lesson179": [
    "2. Diagnosis",
    "2. Diagnóstico",
    "2. Diagnostic",
    "2. Diagnóstico",
    "2. 진단",
    "2. 诊断"
  ],
  "lesson180": [
    "3. Pillar and module",
    "3. Pilar y módulo",
    "3. Pilier et module",
    "3. Pilar e módulo",
    "3. 핵심 축과 모듈",
    "3. 支柱和模块"
  ],
  "lesson182": [
    "4. Result",
    "4. Resultado",
    "4. Résultat",
    "4. Resultado",
    "4. 결과",
    "4. 结果"
  ],
  "lesson183": [
    "How to present it:",
    "Cómo presentarlo:",
    "Comment le présenter :",
    "Como apresentar:",
    "제시 방법:",
    "如何展示："
  ],
  "lesson184": [
    "demonstrate only the functions that prove this result. Then confirm with the customer that they address the need.",
    "demuestra únicamente las funciones que prueban este resultado. Después confirma con el cliente si resuelven su necesidad.",
    "démontrez uniquement les fonctions qui prouvent ce résultat. Vérifiez ensuite avec le client qu’elles répondent à son besoin.",
    "demonstre apenas as funções que comprovam esse resultado. Depois confirme com o cliente se atendem à necessidade.",
    "이 결과를 입증하는 기능만 시연하세요. 그런 다음 고객의 요구를 해결하는지 확인하세요.",
    "仅演示能证明此结果的功能，然后与客户确认是否满足需求。"
  ],
  "lesson185": [
    "Commercial insight",
    "Lectura comercial",
    "Lecture commerciale",
    "Visão comercial",
    "시장 이해",
    "商业洞察"
  ],
  "lesson186": [
    "Adapt the conversation to the market",
    "Adapta la conversación al mercado",
    "Adapter la conversation au marché",
    "Adapte a conversa ao mercado",
    "시장에 맞게 대화 조정",
    "根据市场调整交流"
  ],
  "lesson187": [
    "Select a country to review a business hypothesis. Validate it with the customer; it is not a statistical or regulatory promise.",
    "Selecciona un país para revisar una hipótesis comercial. Debe validarse con el cliente y no representa una promesa estadística o regulatoria.",
    "Sélectionnez un pays pour examiner une hypothèse commerciale. Elle doit être validée avec le client et ne constitue pas une promesse statistique ou réglementaire.",
    "Selecione um país para revisar uma hipótese comercial. Valide-a com o cliente; não representa uma promessa estatística ou regulatória.",
    "국가를 선택하여 사업 가설을 검토하세요. 고객과 검증해야 하며 통계적 또는 규제상의 보장이 아닙니다.",
    "选择一个国家以查看商业假设。须与客户验证，这并非统计或监管方面的承诺。"
  ],
  "lesson188": [
    "Markets",
    "Mercados",
    "Marchés",
    "Mercados",
    "시장",
    "市场"
  ],
  "lesson190": [
    "Conversation",
    "Conversación",
    "Conversation",
    "Conversa",
    "대화",
    "交流"
  ],
  "lesson191": [
    "Starting point",
    "Puerta de entrada",
    "Point d’entrée",
    "Porta de entrada",
    "시작점",
    "切入点"
  ],
  "lesson192": [
    "Applied catalog",
    "Catálogo aplicado",
    "Catalogue appliqué",
    "Catálogo aplicado",
    "활용 중심 카탈로그",
    "应用目录"
  ],
  "lesson193": [
    "Explore modules by value",
    "Explora los módulos por valor",
    "Explorer les modules par leur valeur",
    "Explore os módulos pelo valor",
    "가치별 모듈 탐색",
    "按价值探索模块"
  ],
  "lesson194": [
    "Select a module to understand its purpose, essential functions and the change it brings to the company.",
    "Selecciona un módulo para comprender su propósito, sus funciones esenciales y el cambio que produce en la empresa.",
    "Sélectionnez un module pour comprendre son objectif, ses fonctions essentielles et le changement qu’il apporte à l’entreprise.",
    "Selecione um módulo para entender seu propósito, funções essenciais e a mudança que produz na empresa.",
    "모듈을 선택하여 목적, 핵심 기능 및 기업에 가져올 변화를 이해하세요.",
    "选择一个模块，了解其目的、核心功能及其为企业带来的改变。"
  ],
  "lesson195": [
    "Basic modules",
    "Módulos básicos",
    "Modules de base",
    "Módulos básicos",
    "기본 모듈",
    "基础模块"
  ],
  "lesson196": [
    "Value for the customer:",
    "Valor para el cliente:",
    "Valeur pour le client :",
    "Valor para o cliente:",
    "고객에게 제공하는 가치:",
    "客户价值："
  ],
  "lesson197": [
    "Quick check",
    "Comprobación rápida",
    "Vérification rapide",
    "Verificação rápida",
    "빠른 확인",
    "快速检验"
  ],
  "lesson198": [
    "How should a demonstration begin?",
    "¿Cómo debe comenzar una demostración?",
    "Comment une démonstration doit-elle commencer?",
    "Como uma demonstração deve começar?",
    "시연은 어떻게 시작해야 합니까?",
    "演示应该如何开始？"
  ],
  "lesson199": [
    "Select an answer to check your understanding of the consultative approach.",
    "Selecciona una respuesta para comprobar si comprendiste la lógica consultiva.",
    "Sélectionnez une réponse pour vérifier votre compréhension de la démarche de consultation.",
    "Selecione uma resposta para verificar se entendeu a lógica consultiva.",
    "답을 선택하여 상담 방식에 대한 이해를 확인하세요.",
    "选择一个答案，检验您是否理解顾问式思路。"
  ],
  "pillarCount": [
    "Pillar {current} of {total}",
    "Pilar {current} de {total}",
    "Pilier {current} sur {total}",
    "Pilar {current} de {total}",
    "{total}개 중 {current}번째 축",
    "第 {current} 个支柱，共 {total} 个"
  ],
  "stageCount": [
    "Stage {current}",
    "Etapa {current}",
    "Étape {current}",
    "Etapa {current}",
    "{current}단계",
    "第 {current} 阶段"
  ],
  "marketOpportunity": [
    "Opportunity in {country}",
    "Oportunidad en {country}",
    "Occasion commerciale : {country}",
    "Oportunidade em {country}",
    "{country}의 기회",
    "{country}的机会"
  ],
  "kpis": [
    "KPIs",
    "KPIs",
    "Indicateurs de performance",
    "Indicadores de desempenho",
    "핵심 성과 지표",
    "关键绩效指标"
  ]
} as const satisfies Record<string, readonly [string, string, string, string, string, string]>;
export type InductionMessage = keyof typeof messages;
export function getInductionCopy(value?: string) {
  const locale = inductionLocales.includes(value as InductionLocale) ? value as InductionLocale : 'en-CA';
  const number = (value: number, minimumIntegerDigits = 1) => new Intl.NumberFormat(locale, { minimumIntegerDigits }).format(value);
  const t = (key: InductionMessage, values: Record<string, string | number> = {}) => {
    const template: string = messages[key][localeIndex[locale]];
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = values[name];
      return value == null ? placeholder : typeof value === 'number' ? number(value) : value;
    });
  };
  return { locale, t, number };
}
