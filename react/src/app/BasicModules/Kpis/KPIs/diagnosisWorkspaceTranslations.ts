import type { ExecutiveDiagnosisKind, ExecutiveDiagnosisSectorId } from './types';

export type DiagnosisViewId = 'overview' | 'sectors' | 'map' | 'health' | 'portfolio' | 'profitability' | 'inventory' | 'patterns';

export type DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: string;
    items: Record<DiagnosisViewId, string>;
  };
  filters: {
    clear: string;
    results: string;
  };
  context: {
    nativeCurrencies: string;
    exchangeRateDate: string;
    dataQuality: string;
    ready: string;
    review: string;
  };
  summary: {
    title: string;
    subtitle: string;
    readiness: string;
    sectors: string;
    openDetail: string;
  };
  sectors: {
    title: string;
    subtitle: string;
    selector: string;
    detail: string;
  };
  actions: {
    exportView: string;
    printView: string;
    openModule: string;
    reviewSales: string;
  };
  modules: Record<string, string>;
  resultUnits: {
    findings: string;
    products: string;
  };
  sectorShortcuts: Record<ExecutiveDiagnosisSectorId, string>;
  swot: {
    acronym: string;
    letters: Record<ExecutiveDiagnosisKind, string>;
  };
  maturity: {
    routeTitle: string;
    routeSubtitle: string;
    currentLevel: string;
    nextLevel: string;
    nextStep: string;
    leversTitle: string;
    leversSubtitle: string;
    criticalLevers: string;
    complete: string;
    noScore: string;
    methodologyNote: string;
    stages: string[];
    stageDescriptions: string[];
  };
};

const es: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: 'Matrices empresariales',
    items: {
      overview: 'Índice IME',
      sectors: 'Dimensiones IME',
      map: 'Matriz FODA',
      health: 'Salud empresarial',
      portfolio: 'Matriz BCG',
      profitability: 'Rentabilidad–Rotación',
      inventory: 'Inventario inteligente',
      patterns: 'Conexiones',
    },
  },
  filters: { clear: 'Limpiar filtros', results: 'Resultados del alcance' },
  context: {
    nativeCurrencies: 'Monedas de origen', exchangeRateDate: 'Tipo de cambio', dataQuality: 'Calidad de datos',
    ready: 'Lista para orientar decisiones', review: 'Revisión de datos requerida',
  },
  summary: {
    title: 'Panorama de madurez',
    subtitle: 'Ocho señales para reconocer el nivel actual y decidir qué dimensión desarrollar primero.',
    readiness: 'Preparación para decidir', sectors: 'Puntaje del sector', openDetail: 'Abrir análisis',
  },
  sectors: {
    title: 'Madurez por dimensión',
    subtitle: 'Explora Personas, Procesos, Productos y Finanzas como dimensiones de una misma evolución empresarial.',
    selector: 'Dimensiones del IME', detail: 'Lectura de madurez',
  },
  actions: {
    exportView: 'Exportar vista', printView: 'Imprimir vista', openModule: 'Abrir', reviewSales: 'Revisar en Ventas',
  },
  modules: {
    'human-resources': 'Recursos Humanos', 'processes-tasks': 'Procesos y tareas', inventory: 'Inventario',
    sales: 'Ventas', expenses: 'Gastos', 'petty-cash': 'Caja chica',
  },
  resultUnits: { findings: 'hallazgos', products: 'productos' },
  sectorShortcuts: { people: 'Ver Personas', processes: 'Ver Procesos', products: 'Ver Productos', finance: 'Ver Finanzas' },
  swot: { acronym: 'FODA', letters: { strength: 'F', opportunity: 'O', symptom: 'D', data_gap: 'A' } },
  maturity: {
    routeTitle: 'Ruta de madurez', routeSubtitle: 'Del control inicial a una empresa que aprende y evoluciona con evidencia.',
    currentLevel: 'Nivel actual', nextLevel: 'Siguiente nivel', nextStep: 'Palanca recomendada para avanzar',
    leversTitle: 'Palancas de evolución', leversSubtitle: 'Cada hallazgo conecta evidencia real con una acción concreta.', criticalLevers: 'Palancas críticas',
    complete: 'Madurez evolutiva alcanzada', noScore: 'Aún no hay evidencia suficiente para ubicar esta dimensión.',
    methodologyNote: 'Los niveles son una lectura educativa del puntaje IME y no modifican su cálculo.',
    stages: ['Inicial', 'Reactiva', 'Estructurada', 'Gestionada', 'Evolutiva'],
    stageDescriptions: [
      'El control es incipiente y todavía falta evidencia confiable.',
      'La operación responde a problemas y depende de atención manual.',
      'Ya existen prácticas repetibles; toca cerrar variaciones.',
      'La operación se mide y coordina con consistencia.',
      'La empresa aprende, anticipa y mejora con evidencia.',
    ],
  },
};

const en: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: 'Business matrices',
    items: { overview: 'Indice IME', sectors: 'IME dimensions', map: 'SWOT matrix', health: 'Business health', portfolio: 'BCG matrix', profitability: 'Profitability–Rotation', inventory: 'Smart inventory', patterns: 'Connections' },
  },
  filters: { clear: 'Clear filters', results: 'Scope results' },
  context: {
    nativeCurrencies: 'Source currencies', exchangeRateDate: 'Exchange rate', dataQuality: 'Data quality',
    ready: 'Ready to guide decisions', review: 'Data review required',
  },
  summary: {
    title: 'Maturity overview',
    subtitle: 'Eight signals to recognize the current level and decide which dimension to develop first.',
    readiness: 'Decision readiness', sectors: 'Sector score', openDetail: 'Open analysis',
  },
  sectors: {
    title: 'Maturity by dimension',
    subtitle: 'Explore People, Processes, Products, and Finance as dimensions of the same enterprise evolution.',
    selector: 'IME dimensions', detail: 'Maturity reading',
  },
  actions: { exportView: 'Export view', printView: 'Print view', openModule: 'Open', reviewSales: 'Review in Sales' },
  modules: {
    'human-resources': 'Human Resources', 'processes-tasks': 'Processes and tasks', inventory: 'Inventory',
    sales: 'Sales', expenses: 'Expenses', 'petty-cash': 'Petty cash',
  },
  resultUnits: { findings: 'findings', products: 'products' },
  sectorShortcuts: { people: 'View People', processes: 'View Processes', products: 'View Products', finance: 'View Finance' },
  swot: { acronym: 'SWOT', letters: { strength: 'S', opportunity: 'O', symptom: 'W', data_gap: 'T' } },
  maturity: {
    routeTitle: 'Maturity path', routeSubtitle: 'From initial control to an enterprise that learns and evolves through evidence.',
    currentLevel: 'Current level', nextLevel: 'Next level', nextStep: 'Recommended lever to advance',
    leversTitle: 'Evolution levers', leversSubtitle: 'Every finding connects real evidence to a concrete action.', criticalLevers: 'Critical levers',
    complete: 'Evolutionary maturity achieved', noScore: 'There is not enough evidence to place this dimension yet.',
    methodologyNote: 'Levels are an educational reading of the IME score and do not change its calculation.',
    stages: ['Initial', 'Reactive', 'Structured', 'Managed', 'Evolutionary'],
    stageDescriptions: [
      'Control is emerging and reliable evidence is still limited.',
      'Operations respond to problems and depend on manual attention.',
      'Repeatable practices exist; the next task is closing variation.',
      'Operations are measured and coordinated consistently.',
      'The enterprise learns, anticipates, and improves through evidence.',
    ],
  },
};

const fr: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: 'Matrices d’entreprise',
    items: { overview: 'Indice IME', sectors: 'Dimensions IME', map: 'Matrice FFOM', health: 'Santé de l’entreprise', portfolio: 'Matrice BCG', profitability: 'Rentabilité–Rotation', inventory: 'Inventaire intelligent', patterns: 'Connexions' },
  },
  filters: { clear: 'Effacer les filtres', results: 'Résultats de la portée' },
  context: {
    nativeCurrencies: 'Devises sources', exchangeRateDate: 'Taux de change', dataQuality: 'Qualité des données',
    ready: 'Prêt à guider les décisions', review: 'Révision des données requise',
  },
  summary: {
    title: 'Panorama de maturité',
    subtitle: 'Huit signaux pour reconnaître le niveau actuel et choisir la dimension à développer en premier.',
    readiness: 'Préparation à la décision', sectors: 'Note du secteur', openDetail: 'Ouvrir l’analyse',
  },
  sectors: {
    title: 'Maturité par dimension',
    subtitle: 'Explorez Personnes, Processus, Produits et Finances comme dimensions d’une même évolution.',
    selector: 'Dimensions IME', detail: 'Lecture de maturité',
  },
  actions: { exportView: 'Exporter la vue', printView: 'Imprimer la vue', openModule: 'Ouvrir', reviewSales: 'Voir dans Ventes' },
  modules: {
    'human-resources': 'Ressources humaines', 'processes-tasks': 'Processus et tâches', inventory: 'Inventaire',
    sales: 'Ventes', expenses: 'Dépenses', 'petty-cash': 'Petite caisse',
  },
  resultUnits: { findings: 'constats', products: 'produits' },
  sectorShortcuts: { people: 'Voir Personnes', processes: 'Voir Processus', products: 'Voir Produits', finance: 'Voir Finances' },
  swot: { acronym: 'FFOM', letters: { strength: 'F', opportunity: 'O', symptom: 'F', data_gap: 'M' } },
  maturity: {
    routeTitle: 'Parcours de maturité', routeSubtitle: 'Du contrôle initial à une entreprise qui apprend et évolue par les preuves.',
    currentLevel: 'Niveau actuel', nextLevel: 'Niveau suivant', nextStep: 'Levier recommandé pour avancer',
    leversTitle: 'Leviers d’évolution', leversSubtitle: 'Chaque constat relie une preuve réelle à une action concrète.', criticalLevers: 'Leviers critiques',
    complete: 'Maturité évolutive atteinte', noScore: 'Les preuves sont encore insuffisantes pour situer cette dimension.',
    methodologyNote: 'Les niveaux sont une lecture éducative du score IME et ne modifient pas son calcul.',
    stages: ['Initiale', 'Réactive', 'Structurée', 'Gérée', 'Évolutive'],
    stageDescriptions: [
      'Le contrôle débute et les preuves fiables restent limitées.',
      'L’exploitation réagit aux problèmes et dépend d’interventions manuelles.',
      'Des pratiques reproductibles existent; il faut réduire les variations.',
      'L’exploitation est mesurée et coordonnée avec constance.',
      'L’entreprise apprend, anticipe et s’améliore par les preuves.',
    ],
  },
};

const pt: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: 'Matrizes empresariais',
    items: { overview: 'Índice IME', sectors: 'Dimensões IME', map: 'Matriz FOFA', health: 'Saúde empresarial', portfolio: 'Matriz BCG', profitability: 'Rentabilidade–Rotação', inventory: 'Estoque inteligente', patterns: 'Conexões' },
  },
  filters: { clear: 'Limpar filtros', results: 'Resultados do escopo' },
  context: {
    nativeCurrencies: 'Moedas de origem', exchangeRateDate: 'Taxa de câmbio', dataQuality: 'Qualidade dos dados',
    ready: 'Pronto para orientar decisões', review: 'Revisão de dados necessária',
  },
  summary: {
    title: 'Panorama de maturidade',
    subtitle: 'Oito sinais para reconhecer o nível atual e escolher qual dimensão desenvolver primeiro.',
    readiness: 'Preparação para decidir', sectors: 'Pontuação do setor', openDetail: 'Abrir análise',
  },
  sectors: {
    title: 'Maturidade por dimensão',
    subtitle: 'Explore Pessoas, Processos, Produtos e Finanças como dimensões da mesma evolução empresarial.',
    selector: 'Dimensões do IME', detail: 'Leitura de maturidade',
  },
  actions: { exportView: 'Exportar visão', printView: 'Imprimir visão', openModule: 'Abrir', reviewSales: 'Revisar em Vendas' },
  modules: {
    'human-resources': 'Recursos Humanos', 'processes-tasks': 'Processos e tarefas', inventory: 'Estoque',
    sales: 'Vendas', expenses: 'Despesas', 'petty-cash': 'Caixa pequeno',
  },
  resultUnits: { findings: 'achados', products: 'produtos' },
  sectorShortcuts: { people: 'Ver Pessoas', processes: 'Ver Processos', products: 'Ver Produtos', finance: 'Ver Finanças' },
  swot: { acronym: 'FOFA', letters: { strength: 'F', opportunity: 'O', symptom: 'F', data_gap: 'A' } },
  maturity: {
    routeTitle: 'Rota de maturidade', routeSubtitle: 'Do controle inicial a uma empresa que aprende e evolui com evidências.',
    currentLevel: 'Nível atual', nextLevel: 'Próximo nível', nextStep: 'Alavanca recomendada para avançar',
    leversTitle: 'Alavancas de evolução', leversSubtitle: 'Cada achado conecta evidência real a uma ação concreta.', criticalLevers: 'Alavancas críticas',
    complete: 'Maturidade evolutiva alcançada', noScore: 'Ainda não há evidências suficientes para posicionar esta dimensão.',
    methodologyNote: 'Os níveis são uma leitura educativa da pontuação IME e não alteram seu cálculo.',
    stages: ['Inicial', 'Reativa', 'Estruturada', 'Gerenciada', 'Evolutiva'],
    stageDescriptions: [
      'O controle é incipiente e ainda falta evidência confiável.',
      'A operação reage a problemas e depende de atenção manual.',
      'Já existem práticas repetíveis; agora é preciso reduzir variações.',
      'A operação é medida e coordenada com consistência.',
      'A empresa aprende, antecipa e melhora com evidências.',
    ],
  },
};

const ko: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: '기업 매트릭스',
    items: { overview: 'IME 지수', sectors: 'IME 차원', map: 'SWOT 매트릭스', health: '기업 건강', portfolio: 'BCG 매트릭스', profitability: '수익성–회전율', inventory: '스마트 재고', patterns: '연결' },
  },
  filters: { clear: '필터 지우기', results: '범위 결과' },
  context: {
    nativeCurrencies: '원본 통화', exchangeRateDate: '환율 기준일', dataQuality: '데이터 품질',
    ready: '의사결정 참고 가능', review: '데이터 검토 필요',
  },
  summary: {
    title: '성숙도 개요', subtitle: '현재 수준을 파악하고 먼저 발전시킬 차원을 정하는 여덟 가지 신호입니다.',
    readiness: '의사결정 준비도', sectors: '부문 점수', openDetail: '분석 열기',
  },
  sectors: {
    title: '차원별 성숙도', subtitle: '인력, 프로세스, 제품, 재무를 하나의 기업 발전을 이루는 차원으로 살펴보세요.',
    selector: 'IME 차원', detail: '성숙도 읽기',
  },
  actions: { exportView: '보기 내보내기', printView: '보기 인쇄', openModule: '열기', reviewSales: '판매에서 검토' },
  modules: {
    'human-resources': '인사', 'processes-tasks': '프로세스 및 작업', inventory: '재고',
    sales: '판매', expenses: '비용', 'petty-cash': '소액 현금',
  },
  resultUnits: { findings: '개 발견', products: '개 제품' },
  sectorShortcuts: { people: '인력 보기', processes: '프로세스 보기', products: '제품 보기', finance: '재무 보기' },
  swot: { acronym: 'SWOT', letters: { strength: 'S', opportunity: 'O', symptom: 'W', data_gap: 'T' } },
  maturity: {
    routeTitle: '성숙도 경로', routeSubtitle: '초기 통제에서 근거로 학습하고 발전하는 기업까지의 여정입니다.',
    currentLevel: '현재 수준', nextLevel: '다음 수준', nextStep: '발전을 위한 권장 지렛대',
    leversTitle: '발전 지렛대', leversSubtitle: '각 발견 사항은 실제 근거를 구체적인 행동과 연결합니다.', criticalLevers: '핵심 지렛대',
    complete: '진화형 성숙도 달성', noScore: '이 차원의 수준을 정하기에는 아직 근거가 부족합니다.',
    methodologyNote: '수준은 IME 점수를 교육적으로 해석한 것이며 계산 방식은 바뀌지 않습니다.',
    stages: ['초기', '대응형', '구조화', '관리형', '진화형'],
    stageDescriptions: [
      '통제가 시작 단계이며 신뢰할 근거가 아직 제한적입니다.',
      '문제에 대응하며 수동 관리에 의존합니다.',
      '반복 가능한 방식이 있으며 변동을 줄여야 합니다.',
      '운영을 일관되게 측정하고 조정합니다.',
      '기업이 근거로 학습하고 예측하며 개선합니다.',
    ],
  },
};

const zh: DiagnosisWorkspaceCopy = {
  navigation: {
    ariaLabel: '企业矩阵',
    items: { overview: 'IME 指数', sectors: 'IME 维度', map: 'SWOT 矩阵', health: '企业健康', portfolio: 'BCG 矩阵', profitability: '盈利–周转', inventory: '智能库存', patterns: '连接' },
  },
  filters: { clear: '清除筛选条件', results: '范围结果' },
  context: {
    nativeCurrencies: '来源币种', exchangeRateDate: '汇率日期', dataQuality: '数据质量',
    ready: '可用于辅助决策', review: '需要检查数据',
  },
  summary: {
    title: '成熟度全景', subtitle: '通过八个信号识别当前水平，并决定优先发展哪个维度。',
    readiness: '决策准备度', sectors: '领域得分', openDetail: '打开分析',
  },
  sectors: {
    title: '按维度查看成熟度', subtitle: '将人员、流程、产品和财务作为同一企业成长路径的四个维度。',
    selector: 'IME 维度', detail: '成熟度解读',
  },
  actions: { exportView: '导出当前视图', printView: '打印当前视图', openModule: '打开', reviewSales: '在销售中查看' },
  modules: {
    'human-resources': '人力资源', 'processes-tasks': '流程与任务', inventory: '库存',
    sales: '销售', expenses: '费用', 'petty-cash': '备用金',
  },
  resultUnits: { findings: '项发现', products: '件产品' },
  sectorShortcuts: { people: '查看人员', processes: '查看流程', products: '查看产品', finance: '查看财务' },
  swot: { acronym: 'SWOT', letters: { strength: 'S', opportunity: 'O', symptom: 'W', data_gap: 'T' } },
  maturity: {
    routeTitle: '成熟度路径', routeSubtitle: '从初始控制走向能够依靠证据学习和进化的企业。',
    currentLevel: '当前水平', nextLevel: '下一水平', nextStep: '建议优先推进的杠杆',
    leversTitle: '成长杠杆', leversSubtitle: '每项发现都把真实证据连接到具体行动。', criticalLevers: '关键杠杆',
    complete: '已达到进化型成熟度', noScore: '目前证据不足，尚不能定位此维度。',
    methodologyNote: '这些水平是对 IME 得分的教育性解读，不会改变计算方式。',
    stages: ['初始型', '响应型', '结构型', '管理型', '进化型'],
    stageDescriptions: [
      '控制刚刚起步，可靠证据仍然有限。',
      '运营主要响应问题，并依赖人工关注。',
      '已有可重复实践，下一步是减少波动。',
      '运营得到持续衡量和协调。',
      '企业依靠证据学习、预判并持续改进。',
    ],
  },
};

export const diagnosisWorkspaceTranslations: Record<string, DiagnosisWorkspaceCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
