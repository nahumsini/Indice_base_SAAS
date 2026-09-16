export type SalesKpiWorkspaceCopy = {
  title: string; subtitle: string; refresh: string; print: string; views: string;
  overview: string; analysis: string; units: string; opportunities: string;
  filters: string; clear: string; search: string; searchHelp: string; period: string; unit: string; business: string; seller: string; all: string; unassigned: string;
  today: string; thisWeek: string; thisMonth: string; lastMonth: string;
  context: string; updated: string; asOf: string; consolidated: string; native: string; partial: string; excluded: string; rateConfigured: string; rateDaily: string;
  loading: string; empty: string; sourceError: string; moneyError: string; reportError: string; unavailable: string; viewOpportunities: string;
  cards: {
    registeredSales: string; registeredSalesHelp: string; collected: string; collectedHelp: string;
    receivable: string; receivableHelp: string; averageTicket: string; averageTicketHelp: string;
    pipeline: string; pipelineHelp: string; openOpportunities: string; openOpportunitiesHelp: string;
    overdueFollowUps: string; overdueFollowUpsHelp: string; pendingHandoff: string; pendingHandoffHelp: string;
  };
  funnel: string; funnelHelp: string; funnelOpportunities: string; funnelQuoted: string; funnelApproved: string; funnelSold: string;
  trend: string; trendHelp: string; quoteStatus: string; quoteStatusHelp: string;
  sellerTable: string; sellerHelp: string; unitTable: string; unitHelp: string; opportunityTable: string; opportunityHelp: string;
  statuses: Record<string, string>;
  columns: { name: string; sales: string; opportunities: string; quotes: string; followUps: string; handoff: string; stage: string; owner: string; expectedClose: string; nextAction: string; status: string };
  pagination: { next: string; previous: string; rows: string; page: (current: number, total: number) => string; records: string };
};

const en: SalesKpiWorkspaceCopy = {
  title: 'Sales KPIs', subtitle: 'Commercial and execution signals from one server-scoped source.', refresh: 'Refresh', print: 'Print report', views: 'KPI views',
  overview: 'Overview', analysis: 'Analysis', units: 'By unit', opportunities: 'Opportunities',
  filters: 'Global filters', clear: 'Clear filters', search: 'Search', searchHelp: 'Sale, customer, opportunity, quote, or owner', period: 'Period', unit: 'Unit', business: 'Business', seller: 'Seller', all: 'All', unassigned: 'Unassigned',
  today: 'Today', thisWeek: 'This week', thisMonth: 'This month', lastMonth: 'Last month',
  context: 'The period applies to sale dates, collections, quote creation, and opportunity expected-close dates. Receivable and pending handoff are current stocks.', updated: 'Updated', asOf: 'Business date', consolidated: 'Consolidated in', native: 'Native totals', partial: 'Partial monetary result', excluded: 'Excluded records', rateConfigured: 'Configured rate', rateDaily: 'Daily rate',
  loading: 'Loading KPI source…', empty: 'No records match the current filters.', sourceError: 'The authorized sales KPI source could not be loaded.', moneyError: 'Some monetary totals are unavailable or partial. They are not presented as complete values.', reportError: 'The report could not be generated.', unavailable: 'Unavailable', viewOpportunities: 'View opportunities',
  cards: {
    registeredSales: 'Registered sales', registeredSalesHelp: 'Valid sales dated in the selected period.', collected: 'Collected in period', collectedHelp: 'Collections received during the selected period for included sales.',
    receivable: 'Current receivable', receivableHelp: 'Current outstanding balance in the selected organization/search scope; the period does not reconstruct a past balance.', averageTicket: 'Average ticket', averageTicketHelp: 'Registered sales total divided by valid sales; unavailable when conversion is partial.',
    pipeline: 'Active pipeline', pipelineHelp: 'Open opportunities expected in the selected period.', openOpportunities: 'Open opportunities', openOpportunitiesHelp: 'Current, non-terminal opportunities in the selected expected-close cohort.',
    overdueFollowUps: 'Overdue follow-ups', overdueFollowUpsHelp: 'Open opportunities whose next action is before the business date.', pendingHandoff: 'Pending handoff', pendingHandoffHelp: 'Current unique valid sales pending finance, inventory movement, or delivery; this is a stock, not a period flow.',
  },
  funnel: 'Linked commercial funnel', funnelHelp: 'Each step is linked by opportunity ID; independent populations are not mixed.', funnelOpportunities: 'Opportunities', funnelQuoted: 'With quote', funnelApproved: 'Approved quote', funnelSold: 'With sale',
  trend: 'Registered sales volume', trendHelp: 'Count of valid sales by month.', quoteStatus: 'Quote status', quoteStatusHelp: 'Quotes created in the selected period.',
  sellerTable: 'Activity by seller', sellerHelp: 'Grouped by stable user-company ID when available; ranked by registered sales count.', unitTable: 'Operational comparison by unit', unitHelp: 'Compares record counts with the same definitions; monetary currencies are not mixed.', opportunityTable: 'Opportunity follow-up', opportunityHelp: 'Current cohort ordered with overdue actions first.',
  statuses: { new: 'New', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost', active: 'Active', closed: 'Closed', draft: 'Draft', sent: 'Sent', viewed: 'Viewed', approved: 'Approved', accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired', closed_won: 'Closed won' },
  columns: { name: 'Name', sales: 'Sales', opportunities: 'Open opportunities', quotes: 'Quotes', followUps: 'Overdue follow-ups', handoff: 'Pending handoff', stage: 'Stage', owner: 'Owner', expectedClose: 'Expected close', nextAction: 'Next action', status: 'Status' },
  pagination: { next: 'Next', previous: 'Previous', rows: 'Rows', page: (current, total) => `Page ${current} / ${total}`, records: 'records' },
};

const es: SalesKpiWorkspaceCopy = {
  ...en,
  title: 'KPIs de ventas', subtitle: 'Señales comerciales y de ejecución desde una sola fuente con alcance autorizado.', refresh: 'Actualizar', print: 'Imprimir reporte', views: 'Vistas de KPIs',
  overview: 'Resumen', analysis: 'Análisis', units: 'Por unidad', opportunities: 'Oportunidades',
  filters: 'Filtros globales', clear: 'Limpiar filtros', search: 'Buscar', searchHelp: 'Venta, cliente, oportunidad, cotización o responsable', period: 'Periodo', unit: 'Unidad', business: 'Negocio', seller: 'Vendedor', all: 'Todos', unassigned: 'Sin asignar',
  today: 'Hoy', thisWeek: 'Esta semana', thisMonth: 'Este mes', lastMonth: 'Mes anterior',
  context: 'El periodo aplica a fecha de venta, cobros, creación de cotización y cierre esperado. El saldo por cobrar y la entrega pendiente son inventarios actuales.', updated: 'Actualizado', asOf: 'Fecha operativa', consolidated: 'Consolidado en', native: 'Totales nativos', partial: 'Resultado monetario parcial', excluded: 'Registros excluidos', rateConfigured: 'Tasa configurada', rateDaily: 'Tasa diaria',
  loading: 'Cargando fuente de KPIs…', empty: 'No hay registros para los filtros actuales.', sourceError: 'No se pudo cargar la fuente autorizada de KPIs de ventas.', moneyError: 'Algunos totales monetarios no están disponibles o son parciales. No se presentan como valores completos.', reportError: 'No se pudo generar el reporte.', unavailable: 'No disponible', viewOpportunities: 'Ver oportunidades',
  cards: {
    registeredSales: 'Ventas registradas', registeredSalesHelp: 'Ventas válidas con fecha dentro del periodo.', collected: 'Cobrado en el periodo', collectedHelp: 'Cobros recibidos en el periodo para las ventas incluidas.',
    receivable: 'Saldo por cobrar actual', receivableHelp: 'Saldo actual del alcance de organización/búsqueda; el periodo no reconstruye un saldo histórico.', averageTicket: 'Ticket promedio', averageTicketHelp: 'Total registrado dividido entre ventas válidas; no disponible si la conversión es parcial.',
    pipeline: 'Pipeline activo', pipelineHelp: 'Oportunidades abiertas con cierre esperado en el periodo.', openOpportunities: 'Oportunidades abiertas', openOpportunitiesHelp: 'Oportunidades actuales no terminales del grupo de cierre esperado.',
    overdueFollowUps: 'Seguimientos vencidos', overdueFollowUpsHelp: 'Oportunidades abiertas cuya próxima acción es anterior a la fecha operativa.', pendingHandoff: 'Entrega operativa pendiente', pendingHandoffHelp: 'Ventas válidas actuales pendientes de finanzas, movimiento de inventario o entrega; es inventario actual, no flujo del periodo.',
  },
  funnel: 'Embudo comercial enlazado', funnelHelp: 'Cada paso está enlazado por la oportunidad; no mezcla poblaciones independientes.', funnelOpportunities: 'Oportunidades', funnelQuoted: 'Con cotización', funnelApproved: 'Cotización aprobada', funnelSold: 'Con venta',
  trend: 'Volumen de ventas registradas', trendHelp: 'Cantidad de ventas válidas por mes.', quoteStatus: 'Estado de cotizaciones', quoteStatusHelp: 'Cotizaciones creadas en el periodo seleccionado.',
  sellerTable: 'Actividad por vendedor', sellerHelp: 'Agrupada por ID estable de usuario-empresa cuando existe; ordenada por cantidad de ventas.', unitTable: 'Comparación operativa por unidad', unitHelp: 'Compara conteos con las mismas definiciones; no mezcla monedas.', opportunityTable: 'Seguimiento de oportunidades', opportunityHelp: 'Grupo actual ordenado con acciones vencidas primero.',
  statuses: { new: 'Nueva', qualified: 'Calificada', proposal: 'Propuesta', negotiation: 'Negociación', won: 'Ganada', lost: 'Perdida', active: 'Activa', closed: 'Cerrada', draft: 'Borrador', sent: 'Enviada', viewed: 'Vista', approved: 'Aprobada', accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Vencida', closed_won: 'Ganada' },
  columns: { name: 'Nombre', sales: 'Ventas', opportunities: 'Oportunidades abiertas', quotes: 'Cotizaciones', followUps: 'Seguimientos vencidos', handoff: 'Entrega pendiente', stage: 'Etapa', owner: 'Responsable', expectedClose: 'Cierre esperado', nextAction: 'Próxima acción', status: 'Estado' },
  pagination: { next: 'Siguiente', previous: 'Anterior', rows: 'Filas', page: (current, total) => `Página ${current} / ${total}`, records: 'registros' },
};

const fr: SalesKpiWorkspaceCopy = {
  ...en,
  title: 'ICP des ventes', subtitle: 'Signaux commerciaux et d’exécution provenant d’une source unique à portée autorisée.', refresh: 'Actualiser', print: 'Imprimer le rapport', views: 'Vues des ICP',
  overview: 'Aperçu', analysis: 'Analyse', units: 'Par unité', opportunities: 'Occasions',
  filters: 'Filtres globaux', clear: 'Effacer les filtres', search: 'Rechercher', searchHelp: 'Vente, client, occasion, devis ou responsable', period: 'Période', unit: 'Unité', business: 'Établissement', seller: 'Vendeur', all: 'Tous', unassigned: 'Non attribué',
  today: 'Aujourd’hui', thisWeek: 'Cette semaine', thisMonth: 'Ce mois-ci', lastMonth: 'Mois précédent',
  context: 'La période s’applique aux ventes, encaissements, créations de devis et clôtures prévues. Les créances et transferts en attente sont des stocks actuels.', updated: 'Actualisé', asOf: 'Date opérationnelle', consolidated: 'Consolidé en', native: 'Totaux natifs', partial: 'Résultat monétaire partiel', excluded: 'Enregistrements exclus', rateConfigured: 'Taux configuré', rateDaily: 'Taux quotidien',
  loading: 'Chargement de la source des ICP…', empty: 'Aucun enregistrement ne correspond aux filtres.', sourceError: 'Impossible de charger la source autorisée des ICP de ventes.', moneyError: 'Certains totaux monétaires sont indisponibles ou partiels. Ils ne sont pas présentés comme complets.', reportError: 'Impossible de produire le rapport.', unavailable: 'Indisponible', viewOpportunities: 'Voir les occasions',
  cards: {
    registeredSales: 'Ventes enregistrées', registeredSalesHelp: 'Ventes valides datées dans la période sélectionnée.', collected: 'Encaissé pendant la période', collectedHelp: 'Encaissements reçus pendant la période pour la portée sélectionnée.',
    receivable: 'Créances actuelles', receivableHelp: 'Solde actuel de la portée organisation/recherche; la période ne reconstruit pas un solde historique.', averageTicket: 'Panier moyen', averageTicketHelp: 'Total des ventes enregistrées divisé par les ventes valides; indisponible si la conversion est partielle.',
    pipeline: 'Pipeline actif', pipelineHelp: 'Occasions ouvertes dont la clôture est prévue pendant la période.', openOpportunities: 'Occasions ouvertes', openOpportunitiesHelp: 'Occasions actuelles non terminales de la cohorte de clôture prévue.',
    overdueFollowUps: 'Suivis en retard', overdueFollowUpsHelp: 'Occasions ouvertes dont la prochaine action précède la date opérationnelle.', pendingHandoff: 'Transfert opérationnel en attente', pendingHandoffHelp: 'Ventes valides actuelles en attente des finances, du mouvement de stock ou de la livraison; il s’agit d’un stock actuel.',
  },
  funnel: 'Entonnoir commercial lié', funnelHelp: 'Chaque étape est liée par l’occasion; les populations indépendantes ne sont pas mélangées.', funnelOpportunities: 'Occasions', funnelQuoted: 'Avec devis', funnelApproved: 'Devis approuvé', funnelSold: 'Avec vente',
  trend: 'Volume des ventes enregistrées', trendHelp: 'Nombre de ventes valides par mois.', quoteStatus: 'État des devis', quoteStatusHelp: 'Devis créés pendant la période sélectionnée.',
  sellerTable: 'Activité par vendeur', sellerHelp: 'Regroupée par identifiant utilisateur-entreprise stable lorsqu’il existe; classée par nombre de ventes.', unitTable: 'Comparaison opérationnelle par unité', unitHelp: 'Compare des nombres selon les mêmes définitions, sans mélanger les devises.', opportunityTable: 'Suivi des occasions', opportunityHelp: 'Cohorte actuelle avec les actions en retard en premier.',
  statuses: { new: 'Nouvelle', qualified: 'Qualifiée', proposal: 'Proposition', negotiation: 'Négociation', won: 'Gagnée', lost: 'Perdue', active: 'Active', closed: 'Fermée', draft: 'Brouillon', sent: 'Envoyé', viewed: 'Consulté', approved: 'Approuvé', accepted: 'Accepté', rejected: 'Refusé', expired: 'Expiré', closed_won: 'Gagné' },
  columns: { name: 'Nom', sales: 'Ventes', opportunities: 'Occasions ouvertes', quotes: 'Devis', followUps: 'Suivis en retard', handoff: 'Transfert en attente', stage: 'Étape', owner: 'Responsable', expectedClose: 'Clôture prévue', nextAction: 'Prochaine action', status: 'État' },
  pagination: { next: 'Suivant', previous: 'Précédent', rows: 'Lignes', page: (current, total) => `Page ${current} / ${total}`, records: 'enregistrements' },
};

const pt: SalesKpiWorkspaceCopy = {
  ...en,
  title: 'KPIs de vendas', subtitle: 'Sinais comerciais e de execução de uma única fonte com escopo autorizado.', refresh: 'Atualizar', print: 'Imprimir relatório', views: 'Visões de KPIs',
  overview: 'Visão geral', analysis: 'Análise', units: 'Por unidade', opportunities: 'Oportunidades',
  filters: 'Filtros globais', clear: 'Limpar filtros', search: 'Buscar', searchHelp: 'Venda, cliente, oportunidade, cotação ou responsável', period: 'Período', unit: 'Unidade', business: 'Negócio', seller: 'Vendedor', all: 'Todos', unassigned: 'Não atribuído',
  today: 'Hoje', thisWeek: 'Esta semana', thisMonth: 'Este mês', lastMonth: 'Mês anterior',
  context: 'O período se aplica a vendas, cobranças, criação de cotações e fechamento previsto. Contas a receber e repasses pendentes são saldos atuais.', updated: 'Atualizado', asOf: 'Data operacional', consolidated: 'Consolidado em', native: 'Totais nativos', partial: 'Resultado monetário parcial', excluded: 'Registros excluídos', rateConfigured: 'Taxa configurada', rateDaily: 'Taxa diária',
  loading: 'Carregando a fonte de KPIs…', empty: 'Nenhum registro corresponde aos filtros atuais.', sourceError: 'Não foi possível carregar a fonte autorizada de KPIs de vendas.', moneyError: 'Alguns totais monetários estão indisponíveis ou parciais e não são apresentados como completos.', reportError: 'Não foi possível gerar o relatório.', unavailable: 'Indisponível', viewOpportunities: 'Ver oportunidades',
  cards: {
    registeredSales: 'Vendas registradas', registeredSalesHelp: 'Vendas válidas com data no período selecionado.', collected: 'Recebido no período', collectedHelp: 'Cobranças recebidas no período para o escopo selecionado.',
    receivable: 'Contas a receber atuais', receivableHelp: 'Saldo atual do escopo de organização/busca; o período não reconstrói um saldo histórico.', averageTicket: 'Ticket médio', averageTicketHelp: 'Total registrado dividido pelas vendas válidas; indisponível quando a conversão é parcial.',
    pipeline: 'Pipeline ativo', pipelineHelp: 'Oportunidades abertas com fechamento previsto no período.', openOpportunities: 'Oportunidades abertas', openOpportunitiesHelp: 'Oportunidades atuais não terminais da coorte de fechamento previsto.',
    overdueFollowUps: 'Acompanhamentos atrasados', overdueFollowUpsHelp: 'Oportunidades abertas cuja próxima ação antecede a data operacional.', pendingHandoff: 'Repasse operacional pendente', pendingHandoffHelp: 'Vendas válidas atuais pendentes de finanças, movimento de estoque ou entrega; é um saldo atual.',
  },
  funnel: 'Funil comercial vinculado', funnelHelp: 'Cada etapa é vinculada pela oportunidade; populações independentes não são misturadas.', funnelOpportunities: 'Oportunidades', funnelQuoted: 'Com cotação', funnelApproved: 'Cotação aprovada', funnelSold: 'Com venda',
  trend: 'Volume de vendas registradas', trendHelp: 'Quantidade de vendas válidas por mês.', quoteStatus: 'Status das cotações', quoteStatusHelp: 'Cotações criadas no período selecionado.',
  sellerTable: 'Atividade por vendedor', sellerHelp: 'Agrupada pelo ID estável de usuário-empresa quando disponível; ordenada pela quantidade de vendas.', unitTable: 'Comparação operacional por unidade', unitHelp: 'Compara contagens com as mesmas definições sem misturar moedas.', opportunityTable: 'Acompanhamento de oportunidades', opportunityHelp: 'Coorte atual com ações atrasadas primeiro.',
  statuses: { new: 'Nova', qualified: 'Qualificada', proposal: 'Proposta', negotiation: 'Negociação', won: 'Ganha', lost: 'Perdida', active: 'Ativa', closed: 'Fechada', draft: 'Rascunho', sent: 'Enviada', viewed: 'Visualizada', approved: 'Aprovada', accepted: 'Aceita', rejected: 'Rejeitada', expired: 'Expirada', closed_won: 'Ganha' },
  columns: { name: 'Nome', sales: 'Vendas', opportunities: 'Oportunidades abertas', quotes: 'Cotações', followUps: 'Acompanhamentos atrasados', handoff: 'Repasse pendente', stage: 'Etapa', owner: 'Responsável', expectedClose: 'Fechamento previsto', nextAction: 'Próxima ação', status: 'Status' },
  pagination: { next: 'Próximo', previous: 'Anterior', rows: 'Linhas', page: (current, total) => `Página ${current} / ${total}`, records: 'registros' },
};

const ko: SalesKpiWorkspaceCopy = {
  ...en,
  title: '영업 KPI', subtitle: '권한 범위가 적용된 단일 데이터 원본의 영업 및 실행 지표입니다.', refresh: '새로고침', print: '보고서 인쇄', views: 'KPI 보기',
  overview: '개요', analysis: '분석', units: '단위별', opportunities: '영업 기회',
  filters: '전체 필터', clear: '필터 지우기', search: '검색', searchHelp: '판매, 고객, 영업 기회, 견적 또는 담당자', period: '기간', unit: '단위', business: '사업장', seller: '판매자', all: '전체', unassigned: '미지정',
  today: '오늘', thisWeek: '이번 주', thisMonth: '이번 달', lastMonth: '지난달',
  context: '기간은 판매, 수금, 견적 생성 및 예상 종료일에 적용됩니다. 미수금과 운영 인계 대기는 현재 잔액입니다.', updated: '업데이트', asOf: '영업일', consolidated: '통합 통화', native: '원 통화 합계', partial: '일부 금액 결과', excluded: '제외된 레코드', rateConfigured: '설정 환율', rateDaily: '일일 환율',
  loading: 'KPI 데이터를 불러오는 중…', empty: '현재 필터와 일치하는 레코드가 없습니다.', sourceError: '권한이 적용된 영업 KPI 데이터를 불러오지 못했습니다.', moneyError: '일부 금액 합계가 없거나 불완전하여 완전한 값으로 표시하지 않습니다.', reportError: '보고서를 생성하지 못했습니다.', unavailable: '사용할 수 없음', viewOpportunities: '영업 기회 보기',
  cards: {
    registeredSales: '등록 판매', registeredSalesHelp: '선택 기간에 날짜가 있는 유효 판매입니다.', collected: '기간 수금액', collectedHelp: '선택 범위에서 해당 기간에 받은 수금액입니다.',
    receivable: '현재 미수금', receivableHelp: '선택한 조직/검색 범위의 현재 잔액이며 기간으로 과거 잔액을 재구성하지 않습니다.', averageTicket: '평균 거래액', averageTicketHelp: '등록 판매 합계를 유효 판매 수로 나눈 값이며 환산이 일부이면 표시하지 않습니다.',
    pipeline: '활성 파이프라인', pipelineHelp: '선택 기간에 종료 예정인 열린 영업 기회입니다.', openOpportunities: '열린 영업 기회', openOpportunitiesHelp: '예상 종료 코호트의 현재 비종료 영업 기회입니다.',
    overdueFollowUps: '기한 지난 후속 조치', overdueFollowUpsHelp: '다음 조치일이 영업일보다 이전인 열린 영업 기회입니다.', pendingHandoff: '운영 인계 대기', pendingHandoffHelp: '재무, 재고 이동 또는 배송을 기다리는 현재 유효 판매이며 기간 흐름이 아닌 현재 잔액입니다.',
  },
  funnel: '연결된 영업 퍼널', funnelHelp: '각 단계는 영업 기회 ID로 연결되며 독립 집단을 섞지 않습니다.', funnelOpportunities: '영업 기회', funnelQuoted: '견적 있음', funnelApproved: '승인 견적', funnelSold: '판매 있음',
  trend: '등록 판매량', trendHelp: '월별 유효 판매 건수입니다.', quoteStatus: '견적 상태', quoteStatusHelp: '선택 기간에 생성된 견적입니다.',
  sellerTable: '판매자별 활동', sellerHelp: '가능한 경우 안정적인 사용자-회사 ID로 묶고 등록 판매 건수로 정렬합니다.', unitTable: '단위별 운영 비교', unitHelp: '동일한 정의의 건수를 비교하며 서로 다른 통화를 합산하지 않습니다.', opportunityTable: '영업 기회 후속 조치', opportunityHelp: '기한 지난 조치를 먼저 표시한 현재 코호트입니다.',
  statuses: { new: '신규', qualified: '검증됨', proposal: '제안', negotiation: '협상', won: '성사', lost: '실패', active: '활성', closed: '종료', draft: '초안', sent: '전송됨', viewed: '열람됨', approved: '승인됨', accepted: '수락됨', rejected: '거절됨', expired: '만료됨', closed_won: '성사' },
  columns: { name: '이름', sales: '판매', opportunities: '열린 영업 기회', quotes: '견적', followUps: '기한 지난 후속 조치', handoff: '인계 대기', stage: '단계', owner: '담당자', expectedClose: '예상 종료', nextAction: '다음 조치', status: '상태' },
  pagination: { next: '다음', previous: '이전', rows: '행', page: (current, total) => `${current} / ${total} 페이지`, records: '레코드' },
};

const zh: SalesKpiWorkspaceCopy = {
  ...en,
  title: '销售关键指标', subtitle: '来自单一授权范围数据源的商业与执行信号。', refresh: '刷新', print: '打印报告', views: '指标视图',
  overview: '概览', analysis: '分析', units: '按单位', opportunities: '商机',
  filters: '全局筛选', clear: '清除筛选', search: '搜索', searchHelp: '销售、客户、商机、报价或负责人', period: '期间', unit: '单位', business: '业务点', seller: '销售人员', all: '全部', unassigned: '未分配',
  today: '今天', thisWeek: '本周', thisMonth: '本月', lastMonth: '上月',
  context: '期间适用于销售、收款、报价创建和预计成交日期。应收余额与运营交接待办是当前存量。', updated: '更新时间', asOf: '业务日期', consolidated: '折算为', native: '原币合计', partial: '部分金额结果', excluded: '已排除记录', rateConfigured: '配置汇率', rateDaily: '每日汇率',
  loading: '正在加载指标数据…', empty: '没有符合当前筛选的记录。', sourceError: '无法加载授权范围内的销售指标数据。', moneyError: '部分金额合计不可用或不完整，因此不会显示为完整数值。', reportError: '无法生成报告。', unavailable: '不可用', viewOpportunities: '查看商机',
  cards: {
    registeredSales: '已登记销售', registeredSalesHelp: '日期位于所选期间内的有效销售。', collected: '期间收款', collectedHelp: '所选范围内在该期间收到的款项。',
    receivable: '当前应收余额', receivableHelp: '所选组织/搜索范围的当前余额；期间筛选不会重建历史余额。', averageTicket: '平均客单价', averageTicketHelp: '已登记销售总额除以有效销售数；汇率换算不完整时不可用。',
    pipeline: '活跃管道', pipelineHelp: '预计在所选期间成交的开放商机。', openOpportunities: '开放商机', openOpportunitiesHelp: '预计成交群组中当前尚未结束的商机。',
    overdueFollowUps: '逾期跟进', overdueFollowUpsHelp: '下一行动日期早于业务日期的开放商机。', pendingHandoff: '运营交接待办', pendingHandoffHelp: '等待财务、库存移动或交付的当前有效销售；这是当前存量而非期间流量。',
  },
  funnel: '关联销售漏斗', funnelHelp: '每一步均通过商机 ID 关联，不混合彼此独立的群体。', funnelOpportunities: '商机', funnelQuoted: '已有报价', funnelApproved: '报价已批准', funnelSold: '已有销售',
  trend: '已登记销售量', trendHelp: '每月有效销售数量。', quoteStatus: '报价状态', quoteStatusHelp: '所选期间内创建的报价。',
  sellerTable: '销售人员活动', sellerHelp: '可用时按稳定的用户-公司 ID 分组，并按已登记销售数量排序。', unitTable: '按单位运营比较', unitHelp: '使用相同定义比较记录数量，不合并不同原币。', opportunityTable: '商机跟进', opportunityHelp: '当前群组优先显示逾期行动。',
  statuses: { new: '新建', qualified: '已确认', proposal: '提案', negotiation: '协商中', won: '已赢单', lost: '已失单', active: '进行中', closed: '已关闭', draft: '草稿', sent: '已发送', viewed: '已查看', approved: '已批准', accepted: '已接受', rejected: '已拒绝', expired: '已过期', closed_won: '已赢单' },
  columns: { name: '名称', sales: '销售', opportunities: '开放商机', quotes: '报价', followUps: '逾期跟进', handoff: '交接待办', stage: '阶段', owner: '负责人', expectedClose: '预计成交', nextAction: '下一行动', status: '状态' },
  pagination: { next: '下一页', previous: '上一页', rows: '行数', page: (current, total) => `第 ${current} / ${total} 页`, records: '条记录' },
};

export function getSalesKpiWorkspaceCopy(locale?: string | null) {
  const language = locale?.toLowerCase().split('-')[0];
  return ({ es, fr, pt, ko, zh } as Record<string, SalesKpiWorkspaceCopy>)[language ?? ''] ?? en;
}
