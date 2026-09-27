export type CompactDiagnosisCopy = {
  subtitle: string;
  scope: string;
  clearFilters: string;
  moreActions: string;
  navigation: {
    ariaLabel: string;
    diagnosis: string;
    crossings: string;
    swot: string;
    sources: string;
  };
  summary: {
    status: string;
    ime: string;
    coverage: string;
    signals: string;
    critical: string;
    watch: string;
    missing: string;
    ready: string;
    review: string;
  };
  priority: {
    title: string;
    evidence: string;
    action: string;
    noIssue: string;
  };
  sectors: {
    title: string;
    open: string;
    close: string;
    showAll: string;
    showLess: string;
  };
  tools: {
    title: string;
    hint: string;
    back: string;
  };
  crossing: {
    detected: string;
    customize: string;
    evidence: string;
    noDetected: string;
    createComparison: string;
    available: string;
    instruction: string;
    comparison: string;
    selected: string;
    maximum: string;
    clear: string;
    empty: string;
    remove: string;
  };
};

const es: CompactDiagnosisCopy = {
  subtitle: 'Problemas, cruces y acciones con datos del sistema.',
  scope: 'Alcance',
  clearFilters: 'Limpiar',
  moreActions: 'Más acciones',
  navigation: {
    ariaLabel: 'Análisis de matrices',
    diagnosis: 'Diagnóstico',
    crossings: 'Cruces KPI',
    swot: 'FODA operativo',
    sources: 'Fuentes',
  },
  summary: {
    status: 'Estado operativo',
    ime: 'IME',
    coverage: 'Cobertura',
    signals: 'señales',
    critical: 'críticas',
    watch: 'en atención',
    missing: 'sin datos',
    ready: 'Listo para decidir',
    review: 'Requiere revisión',
  },
  priority: {
    title: 'Prioridad principal',
    evidence: 'Evidencia',
    action: 'Acción',
    noIssue: 'No hay una prioridad activa en este alcance.',
  },
  sectors: {
    title: 'Áreas',
    open: 'Ver señales',
    close: 'Cerrar detalle',
    showAll: 'Ver todas',
    showLess: 'Ver menos',
  },
  tools: {
    title: 'Herramientas de análisis',
    hint: 'BCG, salud, rentabilidad e inventario.',
    back: 'Volver al diagnóstico',
  },
  crossing: {
    detected: 'Detectados', customize: 'Personalizar', evidence: 'KPI relacionados',
    noDetected: 'No hay cruces automáticos en este alcance.', createComparison: 'Crear comparación',
    available: 'KPIs disponibles', instruction: 'Elige hasta cuatro KPI para compararlos.',
    comparison: 'Comparación personalizada', selected: 'seleccionados', maximum: 'Máximo cuatro KPI.',
    clear: 'Limpiar', empty: 'Selecciona KPI para verlos juntos.', remove: 'Quitar KPI',
  },
};

const en: CompactDiagnosisCopy = {
  subtitle: 'Issues, KPI crossings, and actions based on system data.',
  scope: 'Scope',
  clearFilters: 'Clear',
  moreActions: 'More actions',
  navigation: {
    ariaLabel: 'Matrix analysis',
    diagnosis: 'Diagnosis',
    crossings: 'KPI crossings',
    swot: 'Operational SWOT',
    sources: 'Sources',
  },
  summary: {
    status: 'Operating status',
    ime: 'IME',
    coverage: 'Coverage',
    signals: 'signals',
    critical: 'critical',
    watch: 'watch',
    missing: 'missing data',
    ready: 'Ready to decide',
    review: 'Review required',
  },
  priority: {
    title: 'Main priority',
    evidence: 'Evidence',
    action: 'Action',
    noIssue: 'There is no active priority in this scope.',
  },
  sectors: {
    title: 'Areas',
    open: 'View signals',
    close: 'Close detail',
    showAll: 'View all',
    showLess: 'View less',
  },
  tools: {
    title: 'Analysis tools',
    hint: 'BCG, health, profitability, and inventory.',
    back: 'Back to diagnosis',
  },
  crossing: {
    detected: 'Detected', customize: 'Customize', evidence: 'Related KPIs',
    noDetected: 'There are no automatic crossings in this scope.', createComparison: 'Create comparison',
    available: 'Available KPIs', instruction: 'Choose up to four KPIs to compare.',
    comparison: 'Custom comparison', selected: 'selected', maximum: 'Maximum four KPIs.',
    clear: 'Clear', empty: 'Select KPIs to view them together.', remove: 'Remove KPI',
  },
};

const fr: CompactDiagnosisCopy = {
  ...en,
  subtitle: 'Problèmes, croisements KPI et actions fondés sur les données du système.',
  scope: 'Périmètre',
  clearFilters: 'Effacer',
  moreActions: 'Plus d’actions',
  navigation: { ariaLabel: 'Analyse des matrices', diagnosis: 'Diagnostic', crossings: 'Croisements KPI', swot: 'FFOM opérationnelle', sources: 'Sources' },
  summary: { status: 'État opérationnel', ime: 'IME', coverage: 'Couverture', signals: 'signaux', critical: 'critiques', watch: 'à surveiller', missing: 'sans données', ready: 'Prêt à décider', review: 'Révision requise' },
  priority: { title: 'Priorité principale', evidence: 'Preuve', action: 'Action', noIssue: 'Aucune priorité active dans ce périmètre.' },
  sectors: { title: 'Domaines', open: 'Voir les signaux', close: 'Fermer le détail', showAll: 'Tout voir', showLess: 'Voir moins' },
  tools: { title: 'Outils d’analyse', hint: 'BCG, santé, rentabilité et inventaire.', back: 'Retour au diagnostic' },
  crossing: { detected: 'Détectés', customize: 'Personnaliser', evidence: 'KPI liés', noDetected: 'Aucun croisement automatique dans ce périmètre.', createComparison: 'Créer une comparaison', available: 'KPI disponibles', instruction: 'Choisissez jusqu’à quatre KPI à comparer.', comparison: 'Comparaison personnalisée', selected: 'sélectionnés', maximum: 'Maximum quatre KPI.', clear: 'Effacer', empty: 'Sélectionnez des KPI pour les voir ensemble.', remove: 'Retirer le KPI' },
};

const pt: CompactDiagnosisCopy = {
  ...en,
  subtitle: 'Problemas, cruzamentos de KPI e ações com dados do sistema.',
  scope: 'Escopo',
  clearFilters: 'Limpar',
  moreActions: 'Mais ações',
  navigation: { ariaLabel: 'Análise de matrizes', diagnosis: 'Diagnóstico', crossings: 'Cruzamentos KPI', swot: 'FOFA operacional', sources: 'Fontes' },
  summary: { status: 'Estado operacional', ime: 'IME', coverage: 'Cobertura', signals: 'sinais', critical: 'críticos', watch: 'em atenção', missing: 'sem dados', ready: 'Pronto para decidir', review: 'Revisão necessária' },
  priority: { title: 'Prioridade principal', evidence: 'Evidência', action: 'Ação', noIssue: 'Não há prioridade ativa neste escopo.' },
  sectors: { title: 'Áreas', open: 'Ver sinais', close: 'Fechar detalhe', showAll: 'Ver todos', showLess: 'Ver menos' },
  tools: { title: 'Ferramentas de análise', hint: 'BCG, saúde, rentabilidade e estoque.', back: 'Voltar ao diagnóstico' },
  crossing: { detected: 'Detectados', customize: 'Personalizar', evidence: 'KPI relacionados', noDetected: 'Não há cruzamentos automáticos neste escopo.', createComparison: 'Criar comparação', available: 'KPIs disponíveis', instruction: 'Escolha até quatro KPIs para comparar.', comparison: 'Comparação personalizada', selected: 'selecionados', maximum: 'Máximo de quatro KPIs.', clear: 'Limpar', empty: 'Selecione KPIs para vê-los juntos.', remove: 'Remover KPI' },
};

const ko: CompactDiagnosisCopy = {
  ...en,
  subtitle: '시스템 데이터로 문제, KPI 연결 및 조치를 확인합니다.',
  scope: '범위',
  clearFilters: '초기화',
  moreActions: '추가 작업',
  navigation: { ariaLabel: '매트릭스 분석', diagnosis: '진단', crossings: 'KPI 연결', swot: '운영 SWOT', sources: '데이터 출처' },
  summary: { status: '운영 상태', ime: 'IME', coverage: '데이터 범위', signals: '신호', critical: '심각', watch: '주의', missing: '데이터 없음', ready: '의사결정 가능', review: '검토 필요' },
  priority: { title: '최우선 과제', evidence: '근거', action: '조치', noIssue: '이 범위에는 활성 우선순위가 없습니다.' },
  sectors: { title: '영역', open: '신호 보기', close: '상세 닫기', showAll: '모두 보기', showLess: '간단히 보기' },
  tools: { title: '분석 도구', hint: 'BCG, 상태, 수익성 및 재고.', back: '진단으로 돌아가기' },
  crossing: { detected: '감지됨', customize: '맞춤 설정', evidence: '관련 KPI', noDetected: '이 범위에서 자동 KPI 연결이 없습니다.', createComparison: '비교 만들기', available: '사용 가능한 KPI', instruction: '비교할 KPI를 최대 4개 선택하세요.', comparison: '맞춤 비교', selected: '선택됨', maximum: '최대 4개의 KPI를 선택할 수 있습니다.', clear: '초기화', empty: '함께 볼 KPI를 선택하세요.', remove: 'KPI 제거' },
};

const zh: CompactDiagnosisCopy = {
  ...en,
  subtitle: '根据系统数据查看问题、KPI 关联和行动。',
  scope: '范围',
  clearFilters: '清除',
  moreActions: '更多操作',
  navigation: { ariaLabel: '矩阵分析', diagnosis: '诊断', crossings: 'KPI 关联', swot: '运营 SWOT', sources: '数据来源' },
  summary: { status: '运营状态', ime: 'IME', coverage: '覆盖率', signals: '信号', critical: '严重', watch: '关注', missing: '无数据', ready: '可用于决策', review: '需要复核' },
  priority: { title: '首要问题', evidence: '证据', action: '行动', noIssue: '当前范围没有活动优先事项。' },
  sectors: { title: '领域', open: '查看信号', close: '关闭详情', showAll: '查看全部', showLess: '收起' },
  tools: { title: '分析工具', hint: 'BCG、健康度、盈利能力和库存。', back: '返回诊断' },
  crossing: { detected: '已检测', customize: '自定义', evidence: '相关 KPI', noDetected: '当前范围没有自动 KPI 关联。', createComparison: '创建比较', available: '可用 KPI', instruction: '最多选择四个 KPI 进行比较。', comparison: '自定义比较', selected: '已选择', maximum: '最多四个 KPI。', clear: '清除', empty: '选择 KPI 以并排查看。', remove: '移除 KPI' },
};

export const compactDiagnosisTranslations: Record<string, CompactDiagnosisCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
