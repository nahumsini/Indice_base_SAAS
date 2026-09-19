import type { ExecutiveDiagnosisKind, ExecutiveDiagnosisSectorId, ExecutiveKpiStatus } from './types';

type FindingCopy = { title: string; action: string };

export type DiagnosisCopy = {
  title: string;
  subtitle: string;
  eyebrow: string;
  actions: { export: string; print: string; refresh: string; retry: string };
  filters: {
    title: string;
    subtitle: string;
    unit: string;
    business: string;
    period: string;
    from: string;
    to: string;
    allUnits: string;
    allBusinesses: string;
  };
  periods: Record<string, string>;
  context: { period: string; currency: string; scope: string; updated: string; contract: string };
  overview: {
    title: string;
    score: string;
    noScore: string;
    coverage: string;
    priority: string;
    ready: string;
    review: string;
    methodology: string;
  };
  sectorsTitle: string;
  sectorsSubtitle: string;
  sectors: Record<ExecutiveDiagnosisSectorId, string>;
  statuses: Record<ExecutiveKpiStatus, string>;
  kinds: Record<ExecutiveDiagnosisKind, string>;
  findings: Record<string, FindingCopy>;
  mapTitle: string;
  mapSubtitle: string;
  crossTitle: string;
  crossSubtitle: string;
  cross: Record<string, FindingCopy>;
  evidence: string;
  recommendedAction: string;
  moreSignals: string;
  noFindings: string;
  loading: string;
  error: string;
  source: string;
  unavailable: string;
  partial: string;
  current: string;
  previous: string;
  reportTitle: string;
  reportSubtitle: string;
};

const es: DiagnosisCopy = {
  title: 'Matrices empresariales',
  subtitle: 'Modelos de decisión construidos con evidencia del sistema: IME, FODA, BCG y matrices operativas especializadas.',
  eyebrow: 'Autoevaluador ejecutivo · diagnosis/1.1',
  actions: { export: 'Exportar', print: 'Imprimir', refresh: 'Actualizar', retry: 'Reintentar' },
  filters: {
    title: 'Contexto del análisis',
    subtitle: 'Todas las matrices usan el mismo alcance y periodo para mantener una lectura comparable.',
    unit: 'Unidad', business: 'Negocio', period: 'Periodo', from: 'Desde', to: 'Hasta',
    allUnits: 'Todas las unidades', allBusinesses: 'Todos los negocios',
  },
  periods: { monthly: 'Mensual', bimonthly: 'Bimestral', quarterly: 'Trimestral', semester: 'Semestral', annual: 'Anual', custom: 'Personalizado' },
  context: { period: 'Periodo', currency: 'Moneda consolidada', scope: 'Alcance', updated: 'Actualización', contract: 'Contrato' },
  overview: {
    title: 'Lectura general', score: 'IME empresarial', noScore: 'Sin puntaje', coverage: 'Cobertura', priority: 'Dimensión prioritaria',
    ready: 'Evidencia apta para orientar decisiones', review: 'Revisión requerida antes de decidir',
    methodology: 'El puntaje pondera reglas disponibles; un dato ausente reduce cobertura y nunca se convierte en cero.',
  },
  sectorsTitle: 'Las cuatro dimensiones IME',
  sectorsSubtitle: 'Cada dimensión muestra su madurez, evidencia y palancas de evolución.',
  sectors: { people: 'Personas', processes: 'Procesos', products: 'Productos', finance: 'Finanzas' },
  statuses: { healthy: 'Sano', watch: 'Atención', critical: 'Crítico' },
  kinds: { strength: 'Fortalezas', symptom: 'Debilidades detectadas', opportunity: 'Oportunidades', data_gap: 'Amenazas a la decisión' },
  findings: {
    people_attendance: { title: 'Regularidad de asistencia', action: 'Revisar ausencias, permisos y cobertura de registros.' },
    people_punctuality: { title: 'Puntualidad operativa', action: 'Analizar retrasos recurrentes y ajustar coordinación o turnos.' },
    process_completion: { title: 'Cumplimiento de procesos', action: 'Destrabar tareas del periodo y confirmar sus criterios de cierre.' },
    process_overdue: { title: 'Rezago vencido', action: 'Priorizar tareas vencidas por impacto, fecha y responsable.' },
    process_ownership: { title: 'Responsables definidos', action: 'Asignar dueño y fecha a cada tarea operativa abierta.' },
    product_stockouts: { title: 'Disponibilidad de producto', action: 'Reponer ubicaciones agotadas y validar la causa del faltante.' },
    product_low_stock: { title: 'Cobertura de inventario', action: 'Revisar mínimos, demanda y próximos reabastecimientos.' },
    product_sales_momentum: { title: 'Impulso comercial', action: 'Comparar la venta con el periodo anterior y explicar la variación.' },
    product_conversion: { title: 'Conversión comercial', action: 'Revisar oportunidades perdidas, etapa y seguimiento.' },
    product_pos_sales: { title: 'Venta en punto de venta', action: 'Comparar los cortes cerrados con el periodo anterior y explicar la variación.' },
    product_pos_cash_accuracy: { title: 'Exactitud de efectivo POS', action: 'Revisar faltantes, sobrantes y cortes con diferencia antes de conciliar caja.' },
    finance_budget_control: { title: 'Control presupuestal', action: 'Corregir desviaciones y gastos sin línea presupuestal activa.' },
    finance_overdue_payables: { title: 'Pagos vencidos', action: 'Ordenar compromisos vencidos por urgencia y disponibilidad.' },
    finance_petty_cash_usage: { title: 'Uso de caja chica', action: 'Validar límites, saldos y comprobaciones pendientes.' },
    finance_fund_attention: { title: 'Fondos que requieren atención', action: 'Conciliar fondos con saldo bajo o estado irregular.' },
    finance_overdue_receivables: { title: 'Cartera vencida', action: 'Priorizar parcialidades vencidas por antigüedad, cliente e importe.' },
  },
  mapTitle: 'Matriz FODA automatizada',
  mapSubtitle: 'FODA operativo basado en evidencia del sistema. Las amenazas representan riesgos para decidir por datos faltantes; no se inventan factores externos.',
  crossTitle: 'Patrones entre sectores',
  crossSubtitle: 'Relaciones detectadas por reglas explícitas; son hipótesis de revisión, no causalidad demostrada.',
  cross: {
    capacity_coordination_risk: { title: 'Capacidad y coordinación bajo presión', action: 'Cruzar ausencias con tareas vencidas antes de reasignar trabajo.' },
    demand_fulfillment_risk: { title: 'Demanda con riesgo de surtido', action: 'Alinear venta, inventario disponible y reposición.' },
    cash_control_risk: { title: 'Control de efectivo fragmentado', action: 'Coordinar pagos vencidos, fondos en atención y conciliaciones.' },
    commercial_supply_drag: { title: 'Fricción entre conversión y disponibilidad', action: 'Revisar si la cobertura de producto está limitando el cierre comercial.' },
    revenue_collection_gap: { title: 'Venta sin conversión suficiente a efectivo', action: 'Cruzar crecimiento comercial, cartera vencida y plan de cobranza.' },
    cash_reconciliation_risk: { title: 'Control de efectivo fragmentado', action: 'Conciliar diferencias de POS y fondos de caja chica en una misma revisión.' },
  },
  evidence: 'Evidencia', recommendedAction: 'Acción sugerida', moreSignals: 'Ver todas las señales', noFindings: 'Sin hallazgos en esta categoría.',
  loading: 'Construyendo diagnóstico', error: 'No se pudo cargar el diagnóstico.', source: 'Fuente', unavailable: 'Sin datos', partial: 'Cobertura parcial', current: 'Actual', previous: 'Anterior',
  reportTitle: 'Índice IME', reportSubtitle: 'Índice de Madurez Empresarial de Personas, Procesos, Productos y Finanzas.',
};

const en: DiagnosisCopy = {
  title: 'Business matrices',
  subtitle: 'Decision models built from system evidence: IME, SWOT, BCG, and specialized operating matrices.',
  eyebrow: 'Executive self-assessment · diagnosis/1.1',
  actions: { export: 'Export', print: 'Print', refresh: 'Refresh', retry: 'Retry' },
  filters: {
    title: 'Analysis context', subtitle: 'Every matrix uses the same scope and period to maintain a comparable reading.',
    unit: 'Unit', business: 'Business', period: 'Period', from: 'From', to: 'To', allUnits: 'All units', allBusinesses: 'All businesses',
  },
  periods: { monthly: 'Monthly', bimonthly: 'Two months', quarterly: 'Quarterly', semester: 'Half-year', annual: 'Annual', custom: 'Custom' },
  context: { period: 'Period', currency: 'Consolidated currency', scope: 'Scope', updated: 'Updated', contract: 'Contract' },
  overview: {
    title: 'Overall reading', score: 'Enterprise IME', noScore: 'No score', coverage: 'Coverage', priority: 'Priority dimension',
    ready: 'Evidence is ready to guide decisions', review: 'Review required before deciding',
    methodology: 'The score weights available rules; missing data lowers coverage and is never treated as zero.',
  },
  sectorsTitle: 'The four IME dimensions', sectorsSubtitle: 'Each dimension shows its maturity, evidence, and evolution levers.',
  sectors: { people: 'People', processes: 'Processes', products: 'Products', finance: 'Finance' },
  statuses: { healthy: 'Healthy', watch: 'Watch', critical: 'Critical' },
  kinds: { strength: 'Strengths', symptom: 'Detected weaknesses', opportunity: 'Opportunities', data_gap: 'Decision threats' },
  findings: {
    people_attendance: { title: 'Attendance consistency', action: 'Review absences, leave, and record coverage.' },
    people_punctuality: { title: 'Operational punctuality', action: 'Analyze recurring delays and adjust coordination or shifts.' },
    process_completion: { title: 'Process completion', action: 'Unblock period tasks and confirm completion criteria.' },
    process_overdue: { title: 'Overdue backlog', action: 'Prioritize overdue tasks by impact, date, and owner.' },
    process_ownership: { title: 'Defined ownership', action: 'Assign an owner and date to every open operational task.' },
    product_stockouts: { title: 'Product availability', action: 'Replenish stockouts and validate their root cause.' },
    product_low_stock: { title: 'Inventory coverage', action: 'Review minimums, demand, and incoming replenishment.' },
    product_sales_momentum: { title: 'Sales momentum', action: 'Compare sales with the prior period and explain the change.' },
    product_conversion: { title: 'Sales conversion', action: 'Review lost opportunities, stage, and follow-up.' },
    product_pos_sales: { title: 'Point-of-sale revenue', action: 'Compare closed cash sessions with the prior period and explain the change.' },
    product_pos_cash_accuracy: { title: 'POS cash accuracy', action: 'Review shortages, overages, and discrepant closings before reconciling cash.' },
    finance_budget_control: { title: 'Budget control', action: 'Correct deviations and expenses without an active budget line.' },
    finance_overdue_payables: { title: 'Overdue payables', action: 'Order overdue commitments by urgency and availability.' },
    finance_petty_cash_usage: { title: 'Petty cash use', action: 'Validate limits, balances, and pending settlements.' },
    finance_fund_attention: { title: 'Funds needing attention', action: 'Reconcile low-balance or irregular funds.' },
    finance_overdue_receivables: { title: 'Overdue receivables', action: 'Prioritize overdue instalments by age, customer, and amount.' },
  },
  mapTitle: 'Automated SWOT matrix',
  mapSubtitle: 'An evidence-based operational SWOT. Threats are decision risks caused by missing evidence; external factors are never invented.',
  crossTitle: 'Cross-sector patterns', crossSubtitle: 'Relationships detected by explicit rules; these are review hypotheses, not proven causality.',
  cross: {
    capacity_coordination_risk: { title: 'Capacity and coordination under pressure', action: 'Cross-check absences and overdue tasks before reallocating work.' },
    demand_fulfillment_risk: { title: 'Demand at fulfillment risk', action: 'Align sales, available inventory, and replenishment.' },
    cash_control_risk: { title: 'Fragmented cash control', action: 'Coordinate overdue payments, attention funds, and reconciliations.' },
    commercial_supply_drag: { title: 'Conversion and availability friction', action: 'Check whether product coverage is limiting sales closure.' },
    revenue_collection_gap: { title: 'Revenue is not converting into cash', action: 'Cross-check commercial growth with overdue receivables and the collection plan.' },
    cash_reconciliation_risk: { title: 'Fragmented cash control', action: 'Reconcile POS differences and petty-cash funds in the same review.' },
  },
  evidence: 'Evidence', recommendedAction: 'Suggested action', moreSignals: 'View every signal', noFindings: 'No findings in this category.',
  loading: 'Building diagnosis', error: 'The diagnosis could not be loaded.', source: 'Source', unavailable: 'No data', partial: 'Partial coverage', current: 'Current', previous: 'Previous',
  reportTitle: 'Indice IME', reportSubtitle: 'Enterprise Maturity Index for People, Processes, Products, and Finance.',
};

const fr: DiagnosisCopy = {
  ...en,
  title: 'Matrices d’entreprise', subtitle: "Modèles de décision fondés sur les données du système : IME, FFOM, BCG et matrices opérationnelles spécialisées.",
  eyebrow: 'Autoévaluation exécutive · diagnosis/1.1',
  actions: { export: 'Exporter', print: 'Imprimer', refresh: 'Actualiser', retry: 'Réessayer' },
  filters: { title: "Contexte de l’analyse", subtitle: 'Toutes les matrices utilisent la même portée et la même période.', unit: 'Unité', business: 'Activité', period: 'Période', from: 'Du', to: 'Au', allUnits: 'Toutes les unités', allBusinesses: 'Toutes les activités' },
  context: { period: 'Période', currency: 'Devise consolidée', scope: 'Portée', updated: 'Actualisation', contract: 'Contrat' },
  overview: { title: 'Lecture globale', score: 'IME entreprise', noScore: 'Aucun score', coverage: 'Couverture', priority: 'Dimension prioritaire', ready: 'Données aptes à guider les décisions', review: 'Révision requise avant décision', methodology: "Le score pondère les règles disponibles; une donnée absente réduit la couverture et ne vaut jamais zéro." },
  sectors: { people: 'Personnes', processes: 'Processus', products: 'Produits', finance: 'Finances' },
  statuses: { healthy: 'Sain', watch: 'À surveiller', critical: 'Critique' },
  kinds: { strength: 'Forces', symptom: 'Faiblesses détectées', opportunity: 'Opportunités', data_gap: 'Menaces pour la décision' },
  sectorsTitle: 'Les quatre dimensions IME', sectorsSubtitle: 'Chaque dimension présente sa maturité, ses preuves et ses leviers d’évolution.',
  findings: {
    people_attendance: { title: "Régularité de présence", action: "Vérifier les absences, les congés et la couverture des registres." },
    people_punctuality: { title: 'Ponctualité opérationnelle', action: 'Analyser les retards récurrents et ajuster la coordination ou les quarts.' },
    process_completion: { title: 'Achèvement des processus', action: 'Débloquer les tâches de la période et confirmer les critères de clôture.' },
    process_overdue: { title: 'Retard accumulé', action: 'Prioriser les tâches en retard selon impact, date et responsable.' },
    process_ownership: { title: 'Responsabilités définies', action: 'Attribuer un responsable et une date à chaque tâche ouverte.' },
    product_stockouts: { title: 'Disponibilité des produits', action: 'Réapprovisionner les ruptures et valider leur cause.' },
    product_low_stock: { title: 'Couverture des stocks', action: 'Revoir les minimums, la demande et les prochains réapprovisionnements.' },
    product_sales_momentum: { title: 'Dynamique commerciale', action: 'Comparer les ventes à la période précédente et expliquer la variation.' },
    product_conversion: { title: 'Conversion commerciale', action: 'Revoir les occasions perdues, leur étape et leur suivi.' },
    product_pos_sales: { title: 'Ventes au point de vente', action: 'Comparer les clôtures à la période précédente et expliquer la variation.' },
    product_pos_cash_accuracy: { title: 'Exactitude de caisse POS', action: 'Étudier les écarts de caisse avant le rapprochement.' },
    finance_budget_control: { title: 'Contrôle budgétaire', action: 'Corriger les écarts et les dépenses sans ligne budgétaire active.' },
    finance_overdue_payables: { title: 'Paiements en retard', action: 'Classer les engagements échus selon urgence et disponibilité.' },
    finance_petty_cash_usage: { title: 'Utilisation de la petite caisse', action: 'Valider les limites, soldes et justificatifs en attente.' },
    finance_fund_attention: { title: 'Fonds à surveiller', action: 'Rapprocher les fonds à faible solde ou en situation irrégulière.' },
    finance_overdue_receivables: { title: 'Créances en retard', action: 'Prioriser les échéances selon ancienneté, client et montant.' },
  },
  mapTitle: 'Matrice FFOM automatisée', mapSubtitle: "FFOM opérationnelle fondée sur les preuves. Les menaces sont des risques décisionnels liés aux données manquantes; aucun facteur externe n'est inventé.",
  crossTitle: 'Tendances intersectorielles', crossSubtitle: 'Relations issues de règles explicites : hypothèses de révision, non causalité démontrée.',
  cross: {
    capacity_coordination_risk: { title: 'Capacité et coordination sous pression', action: 'Croiser absences et tâches en retard avant de réaffecter le travail.' },
    demand_fulfillment_risk: { title: "Demande avec risque d'exécution", action: 'Aligner ventes, stocks disponibles et réapprovisionnement.' },
    cash_control_risk: { title: 'Contrôle de trésorerie fragmenté', action: 'Coordonner paiements échus, fonds à surveiller et rapprochements.' },
    commercial_supply_drag: { title: 'Friction entre conversion et disponibilité', action: 'Vérifier si la couverture produit limite la conclusion des ventes.' },
    revenue_collection_gap: { title: 'Ventes insuffisamment converties en trésorerie', action: 'Croiser croissance commerciale, créances en retard et plan de recouvrement.' },
    cash_reconciliation_risk: { title: 'Contrôle de trésorerie fragmenté', action: 'Rapprocher les écarts POS et la petite caisse dans la même revue.' },
  },
  evidence: 'Preuve', recommendedAction: 'Action suggérée', moreSignals: 'Voir tous les signaux', noFindings: 'Aucun constat dans cette catégorie.', loading: 'Création du diagnostic', error: 'Impossible de charger le diagnostic.', source: 'Source', unavailable: 'Aucune donnée', partial: 'Couverture partielle', current: 'Actuel', previous: 'Précédent', reportTitle: 'Indice IME', reportSubtitle: "Indice de maturité de l’entreprise pour les Personnes, Processus, Produits et Finances.",
};

const pt: DiagnosisCopy = {
  ...en,
  title: 'Matrizes empresariais', subtitle: 'Modelos de decisão construídos com evidências do sistema: IME, FOFA, BCG e matrizes operacionais especializadas.',
  eyebrow: 'Autoavaliação executiva · diagnosis/1.1',
  actions: { export: 'Exportar', print: 'Imprimir', refresh: 'Atualizar', retry: 'Tentar novamente' },
  filters: { title: 'Contexto da análise', subtitle: 'Todas as matrizes usam o mesmo escopo e período.', unit: 'Unidade', business: 'Negócio', period: 'Período', from: 'De', to: 'Até', allUnits: 'Todas as unidades', allBusinesses: 'Todos os negócios' },
  context: { period: 'Período', currency: 'Moeda consolidada', scope: 'Escopo', updated: 'Atualização', contract: 'Contrato' },
  overview: { title: 'Leitura geral', score: 'IME empresarial', noScore: 'Sem pontuação', coverage: 'Cobertura', priority: 'Dimensão prioritária', ready: 'Evidências aptas para orientar decisões', review: 'Revisão necessária antes de decidir', methodology: 'A pontuação pondera regras disponíveis; dados ausentes reduzem a cobertura e nunca viram zero.' },
  sectors: { people: 'Pessoas', processes: 'Processos', products: 'Produtos', finance: 'Finanças' },
  statuses: { healthy: 'Saudável', watch: 'Atenção', critical: 'Crítico' },
  kinds: { strength: 'Forças', symptom: 'Fraquezas detectadas', opportunity: 'Oportunidades', data_gap: 'Ameaças à decisão' },
  sectorsTitle: 'As quatro dimensões IME', sectorsSubtitle: 'Cada dimensão mostra sua maturidade, evidências e alavancas de evolução.',
  findings: {
    people_attendance: { title: 'Regularidade de presença', action: 'Revisar ausências, licenças e cobertura de registros.' },
    people_punctuality: { title: 'Pontualidade operacional', action: 'Analisar atrasos recorrentes e ajustar coordenação ou turnos.' },
    process_completion: { title: 'Conclusão de processos', action: 'Destravar tarefas do período e confirmar critérios de conclusão.' },
    process_overdue: { title: 'Atrasos vencidos', action: 'Priorizar tarefas vencidas por impacto, data e responsável.' },
    process_ownership: { title: 'Responsáveis definidos', action: 'Atribuir responsável e data a cada tarefa operacional aberta.' },
    product_stockouts: { title: 'Disponibilidade de produto', action: 'Repor faltas e validar sua causa raiz.' },
    product_low_stock: { title: 'Cobertura de estoque', action: 'Revisar mínimos, demanda e próximos reabastecimentos.' },
    product_sales_momentum: { title: 'Ritmo comercial', action: 'Comparar vendas com o período anterior e explicar a variação.' },
    product_conversion: { title: 'Conversão comercial', action: 'Revisar oportunidades perdidas, etapa e acompanhamento.' },
    product_pos_sales: { title: 'Venda no ponto de venda', action: 'Comparar os fechamentos com o período anterior e explicar a variação.' },
    product_pos_cash_accuracy: { title: 'Exatidão de caixa POS', action: 'Revisar faltas, sobras e fechamentos divergentes antes da conciliação.' },
    finance_budget_control: { title: 'Controle orçamentário', action: 'Corrigir desvios e gastos sem linha orçamentária ativa.' },
    finance_overdue_payables: { title: 'Pagamentos vencidos', action: 'Ordenar compromissos vencidos por urgência e disponibilidade.' },
    finance_petty_cash_usage: { title: 'Uso de caixa pequeno', action: 'Validar limites, saldos e prestações de contas pendentes.' },
    finance_fund_attention: { title: 'Fundos que exigem atenção', action: 'Conciliar fundos com saldo baixo ou estado irregular.' },
    finance_overdue_receivables: { title: 'Contas a receber vencidas', action: 'Priorizar parcelas por idade, cliente e valor.' },
  },
  mapTitle: 'Matriz FOFA automatizada', mapSubtitle: 'FOFA operacional baseada em evidências. As ameaças são riscos de decisão por dados ausentes; fatores externos não são inventados.',
  crossTitle: 'Padrões entre setores', crossSubtitle: 'Relações detectadas por regras explícitas; são hipóteses de revisão, não causalidade comprovada.',
  cross: {
    capacity_coordination_risk: { title: 'Capacidade e coordenação sob pressão', action: 'Cruzar ausências e tarefas vencidas antes de redistribuir trabalho.' },
    demand_fulfillment_risk: { title: 'Demanda com risco de atendimento', action: 'Alinhar vendas, estoque disponível e reposição.' },
    cash_control_risk: { title: 'Controle de caixa fragmentado', action: 'Coordenar pagamentos vencidos, fundos em atenção e conciliações.' },
    commercial_supply_drag: { title: 'Atrito entre conversão e disponibilidade', action: 'Verificar se a cobertura de produto limita o fechamento comercial.' },
    revenue_collection_gap: { title: 'Venda sem conversão suficiente em caixa', action: 'Cruzar crescimento comercial, recebíveis vencidos e plano de cobrança.' },
    cash_reconciliation_risk: { title: 'Controle de caixa fragmentado', action: 'Conciliar diferenças de POS e fundos de caixa pequeno na mesma revisão.' },
  },
  evidence: 'Evidência', recommendedAction: 'Ação sugerida', moreSignals: 'Ver todos os sinais', noFindings: 'Sem achados nesta categoria.', loading: 'Montando diagnóstico', error: 'Não foi possível carregar o diagnóstico.', source: 'Fonte', unavailable: 'Sem dados', partial: 'Cobertura parcial', current: 'Atual', previous: 'Anterior', reportTitle: 'Indice IME', reportSubtitle: 'Índice de Maturidade Empresarial de Pessoas, Processos, Produtos e Finanças.',
};

const ko: DiagnosisCopy = {
  ...en,
  title: '기업 매트릭스', subtitle: '시스템 근거로 구성된 의사결정 모델: IME, SWOT, BCG 및 전문 운영 매트릭스.', eyebrow: '경영진 자체 평가 · diagnosis/1.1',
  actions: { export: '내보내기', print: '인쇄', refresh: '새로고침', retry: '다시 시도' },
  filters: { title: '분석 범위', subtitle: '모든 매트릭스에 동일한 범위와 기간을 적용합니다.', unit: '단위', business: '사업', period: '기간', from: '시작', to: '종료', allUnits: '모든 단위', allBusinesses: '모든 사업' },
  context: { period: '기간', currency: '통합 통화', scope: '범위', updated: '업데이트', contract: '계약' },
  overview: { title: '종합 평가', score: '기업 IME', noScore: '점수 없음', coverage: '데이터 범위', priority: '우선 차원', ready: '의사결정 참고에 충분한 근거', review: '결정 전 검토 필요', methodology: '사용 가능한 규칙만 가중하며, 누락 데이터는 범위를 낮출 뿐 0점으로 처리하지 않습니다.' },
  sectors: { people: '사람', processes: '프로세스', products: '제품', finance: '재무' },
  statuses: { healthy: '양호', watch: '주의', critical: '위험' },
  kinds: { strength: '강점', symptom: '확인된 약점', opportunity: '기회', data_gap: '의사결정 위협' },
  sectorsTitle: 'IME의 네 차원', sectorsSubtitle: '각 차원은 성숙도, 근거 및 발전 지렛대를 보여 줍니다.',
  findings: {
    people_attendance: { title: '출근 규칙성', action: '결근, 휴가 및 출근 기록 범위를 검토합니다.' },
    people_punctuality: { title: '운영 시간 준수', action: '반복 지각을 분석하고 조정 방식이나 근무조를 개선합니다.' },
    process_completion: { title: '프로세스 완료', action: '기간 내 지연된 업무를 해소하고 완료 기준을 확인합니다.' },
    process_overdue: { title: '기한 초과 업무', action: '영향, 날짜, 담당자에 따라 기한 초과 업무를 우선 처리합니다.' },
    process_ownership: { title: '담당자 지정', action: '모든 미완료 운영 업무에 담당자와 날짜를 지정합니다.' },
    product_stockouts: { title: '제품 가용성', action: '품절 위치를 보충하고 근본 원인을 확인합니다.' },
    product_low_stock: { title: '재고 범위', action: '최소 재고, 수요 및 예정 보충을 검토합니다.' },
    product_sales_momentum: { title: '판매 흐름', action: '이전 기간과 판매를 비교하고 변동을 설명합니다.' },
    product_conversion: { title: '판매 전환', action: '실패한 기회, 단계 및 후속 조치를 검토합니다.' },
    product_pos_sales: { title: 'POS 판매', action: '이전 기간과 마감 실적을 비교합니다.' },
    product_pos_cash_accuracy: { title: 'POS 현금 정확도', action: '현금 차이가 있는 마감을 조정 전에 검토합니다.' },
    finance_budget_control: { title: '예산 통제', action: '편차와 활성 예산 항목이 없는 지출을 수정합니다.' },
    finance_overdue_payables: { title: '기한 초과 지급', action: '긴급도와 가용 자금에 따라 지급 의무를 정렬합니다.' },
    finance_petty_cash_usage: { title: '소액 현금 사용', action: '한도, 잔액 및 미정산 항목을 확인합니다.' },
    finance_fund_attention: { title: '주의가 필요한 자금', action: '잔액 부족 또는 비정상 상태의 자금을 조정합니다.' },
    finance_overdue_receivables: { title: '기한 초과 미수금', action: '기간, 고객, 금액별로 연체 회수를 우선순위화합니다.' },
  },
  mapTitle: '자동 SWOT 매트릭스', mapSubtitle: '시스템 근거 기반 운영 SWOT입니다. 위협은 누락 데이터로 인한 의사결정 위험이며 외부 요인을 임의로 추정하지 않습니다.',
  crossTitle: '영역 간 패턴', crossSubtitle: '명시적 규칙으로 찾은 관계이며 검토 가설이지 인과관계의 증명은 아닙니다.',
  cross: {
    capacity_coordination_risk: { title: '역량과 조정 압박', action: '업무 재배치 전에 결근과 기한 초과 업무를 함께 확인합니다.' },
    demand_fulfillment_risk: { title: '수요 이행 위험', action: '판매, 가용 재고 및 보충 계획을 맞춥니다.' },
    cash_control_risk: { title: '분산된 현금 통제', action: '기한 초과 지급, 주의 자금 및 조정을 함께 관리합니다.' },
    commercial_supply_drag: { title: '전환과 가용성의 마찰', action: '제품 범위가 판매 마감을 제한하는지 확인합니다.' },
    revenue_collection_gap: { title: '매출과 현금 회수의 격차', action: '매출 성장과 연체 미수금 및 회수 계획을 교차 검토합니다.' },
    cash_reconciliation_risk: { title: '분산된 현금 통제', action: 'POS 차이와 소액 현금을 함께 조정합니다.' },
  },
  evidence: '근거', recommendedAction: '권장 조치', moreSignals: '모든 신호 보기', noFindings: '이 범주에는 발견 사항이 없습니다.', loading: '진단 생성 중', error: '진단을 불러올 수 없습니다.', source: '출처', unavailable: '데이터 없음', partial: '부분 범위', current: '현재', previous: '이전', reportTitle: 'Indice IME', reportSubtitle: '인력, 프로세스, 제품, 재무의 기업 성숙도 지수.',
};

const zh: DiagnosisCopy = {
  ...en,
  title: '企业矩阵', subtitle: '基于系统证据构建的决策模型：IME、SWOT、BCG 与专业运营矩阵。', eyebrow: '管理层自评 · diagnosis/1.1',
  actions: { export: '导出', print: '打印', refresh: '刷新', retry: '重试' },
  filters: { title: '分析范围', subtitle: '所有矩阵使用相同范围和期间，确保可比。', unit: '单位', business: '业务', period: '期间', from: '开始', to: '结束', allUnits: '所有单位', allBusinesses: '所有业务' },
  context: { period: '期间', currency: '合并币种', scope: '范围', updated: '更新时间', contract: '契约' },
  overview: { title: '整体判断', score: '企业 IME', noScore: '暂无评分', coverage: '数据覆盖', priority: '优先维度', ready: '证据可用于辅助决策', review: '决策前需要复核', methodology: '评分仅加权可用规则；缺失数据只会降低覆盖率，绝不会按零分处理。' },
  sectors: { people: '人员', processes: '流程', products: '产品', finance: '财务' },
  statuses: { healthy: '健康', watch: '关注', critical: '严重' },
  kinds: { strength: '优势', symptom: '已发现劣势', opportunity: '机会', data_gap: '决策威胁' },
  sectorsTitle: 'IME 四个维度', sectorsSubtitle: '每个维度展示其成熟度、证据和成长杠杆。',
  findings: {
    people_attendance: { title: '出勤稳定性', action: '检查缺勤、请假和出勤记录覆盖情况。' },
    people_punctuality: { title: '运营准时性', action: '分析重复迟到并调整协作方式或班次。' },
    process_completion: { title: '流程完成度', action: '解除期间任务阻塞并确认完成标准。' },
    process_overdue: { title: '逾期积压', action: '按影响、日期和负责人处理逾期任务。' },
    process_ownership: { title: '负责人明确', action: '为每项未完成运营任务指定负责人和日期。' },
    product_stockouts: { title: '产品可用性', action: '补充缺货位置并验证根本原因。' },
    product_low_stock: { title: '库存覆盖', action: '检查最低库存、需求和即将到货的补给。' },
    product_sales_momentum: { title: '销售动能', action: '与上期销售比较并解释变化。' },
    product_conversion: { title: '销售转化', action: '检查流失机会、阶段和跟进情况。' },
    product_pos_sales: { title: '销售点营收', action: '将已结账班次与上期对比并解释变化。' },
    product_pos_cash_accuracy: { title: 'POS 现金准确率', action: '在对账前检查现金短款、长款和差异结账。' },
    finance_budget_control: { title: '预算控制', action: '纠正偏差以及没有有效预算项的支出。' },
    finance_overdue_payables: { title: '逾期应付', action: '按紧急程度和资金可用性排序逾期承诺。' },
    finance_petty_cash_usage: { title: '备用金使用', action: '核对限额、余额和待结算项目。' },
    finance_fund_attention: { title: '需关注资金', action: '核对低余额或状态异常的资金。' },
    finance_overdue_receivables: { title: '逾期应收账款', action: '按账龄、客户和金额优先催收。' },
  },
  mapTitle: '自动 SWOT 矩阵', mapSubtitle: '基于系统证据的运营 SWOT。威胁指数据缺失造成的决策风险，不会虚构外部因素。',
  crossTitle: '跨板块模式', crossSubtitle: '由明确规则发现的关系，是复核假设，并非已证明的因果关系。',
  cross: {
    capacity_coordination_risk: { title: '产能与协同承压', action: '重新分配工作前交叉检查缺勤和逾期任务。' },
    demand_fulfillment_risk: { title: '需求履约风险', action: '协调销售、可用库存和补货。' },
    cash_control_risk: { title: '现金控制分散', action: '统一管理逾期付款、需关注资金和对账。' },
    commercial_supply_drag: { title: '转化与供应摩擦', action: '检查产品覆盖是否限制销售成交。' },
    revenue_collection_gap: { title: '营收未充分转化为现金', action: '交叉检查销售增长、逾期应收和催收计划。' },
    cash_reconciliation_risk: { title: '分散的现金控制', action: '在同一次复核中对账 POS 差异和备用金。' },
  },
  evidence: '证据', recommendedAction: '建议行动', moreSignals: '查看全部信号', noFindings: '此类别暂无发现。', loading: '正在生成诊断', error: '无法加载诊断。', source: '来源', unavailable: '无数据', partial: '部分覆盖', current: '当前', previous: '上期', reportTitle: 'Indice IME', reportSubtitle: '人员、流程、产品和财务企业成熟度指数。',
};

export const diagnosisTranslations: Record<string, DiagnosisCopy> = {
  'es-MX': es,
  'es-CO': es,
  'en-US': en,
  'en-CA': en,
  'fr-CA': fr,
  'pt-BR': pt,
  'ko-CA': ko,
  'zh-CA': zh,
};
