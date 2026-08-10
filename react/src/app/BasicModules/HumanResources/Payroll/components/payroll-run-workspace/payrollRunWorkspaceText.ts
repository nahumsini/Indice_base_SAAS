export type PayrollRunWorkspaceText = {
  adjustments: string;
  all: string;
  actions: string;
  addDeduction: string;
  addEarning: string;
  applyIncentive: string;
  attendancePeriod: string;
  audit: string;
  back: string;
  breakdown: string;
  calculatedDeductions: string;
  calculatedDeductionsDescription: string;
  calculations: string;
  collaborators: string;
  concepts: string;
  confirmDiscard: string;
  discard: string;
  discardDescription: string;
  dirty: string;
  deductionsTotal: string;
  discounts: string;
  export: string;
  exportCsvDescription: string;
  exportDescription: string;
  exportPdfDescription: string;
  filters: string;
  earningsTotal: string;
  incentiveApplied: string;
  incentiveApplyError: string;
  incentiveAvailable: string;
  incentiveLoadError: string;
  incentivePermissionLocked: string;
  incentiveRunLocked: string;
  incentives: string;
  incentiveSourceNotice: string;
  governmentReportingDescription: string;
  governmentReportingTitle: string;
  kpiConnectorDescription: string;
  kpiConnectorPending: string;
  kpiIncentive: string;
  loadingIncentives: string;
  manualIncentive: string;
  manualDiscounts: string;
  manualDiscountsDescription: string;
  modified: string;
  next: string;
  noIncentives: string;
  noIncentivesDescription: string;
  noCalculatedDeductions: string;
  noLineWarnings: string;
  noManualDiscounts: string;
  noMatches: string;
  noWarnings: string;
  noOtherAdjustments: string;
  openPending: string;
  overview: string;
  otherAdjustments: string;
  otherAdjustmentsDescription: string;
  previous: string;
  print: string;
  refresh: string;
  removeAdjustment: string;
  results: string;
  reviewRequired: string;
  search: string;
  searchPlaceholder: string;
  selectCollaborator: string;
  treatmentLabels: {
    accounts_payable: string;
    fiscal_payroll: string;
    no_payroll: string;
    operational_payroll: string;
  };
  warnings: string;
};

const es: PayrollRunWorkspaceText = {
  adjustments: 'Ajustes',
  all: 'Todos',
  actions: 'Acciones',
  addDeduction: 'Agregar descuento',
  addEarning: 'Agregar percepción',
  applyIncentive: 'Agregar a la corrida',
  attendancePeriod: 'Asistencia del período',
  audit: 'Auditoría',
  back: 'Volver',
  breakdown: 'Desglose',
  calculatedDeductions: 'Deducciones calculadas',
  calculatedDeductionsDescription: 'Conceptos generados por las reglas de nómina y la jurisdicción aplicable.',
  calculations: 'Cálculo',
  collaborators: 'Colaboradores',
  concepts: 'Conceptos',
  confirmDiscard: 'Salir sin guardar',
  discard: 'Descartar cambios',
  discardDescription: 'Hay cambios pendientes en la corrida. Puedes volver al workspace o descartarlos y cerrar.',
  dirty: 'Modificado',
  deductionsTotal: 'Total deducciones',
  discounts: 'Descuentos',
  export: 'Exportar',
  exportCsvDescription: 'Libro tabular con todos los colaboradores y conceptos de la corrida.',
  exportDescription: 'Elige el formato para descargar la corrida completa.',
  exportPdfDescription: 'Reporte diseñado para revisión, archivo o impresión.',
  filters: 'Vista',
  earningsTotal: 'Total percepciones',
  incentiveApplied: 'Ya aplicado',
  incentiveApplyError: 'No fue posible agregar el incentivo.',
  incentiveAvailable: 'Disponible',
  incentiveLoadError: 'No fue posible consultar los incentivos.',
  incentivePermissionLocked: 'Puedes consultar los incentivos, pero tu rol no permite modificar esta corrida.',
  incentiveRunLocked: 'Esta corrida conserva su historial sin cambios. Los incentivos se pueden consultar, pero solo se aplican en corridas en borrador.',
  incentives: 'Incentivos de nómina',
  incentiveSourceNotice: 'Esta lista proviene de la pestaña Incentivos y respeta el alcance asignado al colaborador.',
  governmentReportingDescription: 'Abre los registros gubernamentales auditables de esta corrida.',
  governmentReportingTitle: 'PILA / DIAN Colombia',
  kpiConnectorDescription: 'La referencia está preparada para el motor KPI final; no se utilizará el KPI provisional ni un monto manual.',
  kpiConnectorPending: 'Conector KPI pendiente',
  kpiIncentive: 'Basado en KPI',
  loadingIncentives: 'Consultando incentivos aplicables...',
  manualIncentive: 'Incentivo configurado',
  manualDiscounts: 'Descuentos manuales',
  manualDiscountsDescription: 'Agrega descuentos extraordinarios que aplican únicamente a esta corrida.',
  modified: 'Modificados',
  next: 'Siguiente',
  noIncentives: 'No hay incentivos aplicables para este periodo',
  noIncentivesDescription: 'Crea o asigna el incentivo desde la pestaña Incentivos. Cuando su alcance incluya a este colaborador aparecerá aquí.',
  noCalculatedDeductions: 'No hay deducciones calculadas para este colaborador.',
  noLineWarnings: 'La línea no presenta alertas de asistencia o cálculo.',
  noManualDiscounts: 'No hay descuentos manuales en esta línea.',
  noMatches: 'No hay colaboradores que coincidan con esta vista.',
  noWarnings: 'Sin alertas',
  noOtherAdjustments: 'No hay percepciones ni otras excepciones manuales en esta línea.',
  openPending: 'Revisar cambios',
  overview: 'Resumen',
  otherAdjustments: 'Percepciones y otras excepciones',
  otherAdjustmentsDescription: 'Registra percepciones, aportaciones o provisiones extraordinarias de esta corrida.',
  previous: 'Anterior',
  print: 'Imprimir',
  refresh: 'Actualizar',
  removeAdjustment: 'Eliminar ajuste',
  results: 'resultados',
  reviewRequired: 'Requiere revisión',
  search: 'Buscar colaborador',
  searchPlaceholder: 'Nombre, puesto, unidad o negocio',
  selectCollaborator: 'Selecciona un colaborador para revisar su nómina.',
  treatmentLabels: {
    accounts_payable: 'Cuenta por pagar',
    fiscal_payroll: 'Nómina fiscal',
    no_payroll: 'Sin nómina',
    operational_payroll: 'Nómina operativa',
  },
  warnings: 'Alertas',
};

const en: PayrollRunWorkspaceText = {
  adjustments: 'Adjustments',
  all: 'All',
  actions: 'Actions',
  addDeduction: 'Add deduction',
  addEarning: 'Add earning',
  applyIncentive: 'Add to run',
  attendancePeriod: 'Period attendance',
  audit: 'Audit',
  back: 'Back',
  breakdown: 'Breakdown',
  calculatedDeductions: 'Calculated deductions',
  calculatedDeductionsDescription: 'Items generated by payroll rules and the applicable jurisdiction.',
  calculations: 'Calculation',
  collaborators: 'HR users',
  concepts: 'Concepts',
  confirmDiscard: 'Exit without saving',
  discard: 'Discard changes',
  discardDescription: 'There are pending changes in this run. Return to the workspace or discard them and close.',
  dirty: 'Modified',
  deductionsTotal: 'Total deductions',
  discounts: 'Deductions',
  export: 'Export',
  exportCsvDescription: 'Tabular workbook with every HR user and item in the payroll run.',
  exportDescription: 'Choose a format to download the complete payroll run.',
  exportPdfDescription: 'Report designed for review, filing, or printing.',
  filters: 'View',
  earningsTotal: 'Total earnings',
  incentiveApplied: 'Already applied',
  incentiveApplyError: 'The incentive could not be added.',
  incentiveAvailable: 'Available',
  incentiveLoadError: 'The incentives could not be loaded.',
  incentivePermissionLocked: 'You can review incentives, but your role cannot modify this run.',
  incentiveRunLocked: 'This run keeps an immutable history. Incentives remain visible but can only be applied to draft runs.',
  incentives: 'Payroll incentives',
  incentiveSourceNotice: 'This list comes from the Incentives tab and respects the scope assigned to this HR user.',
  governmentReportingDescription: 'Open the auditable government records for this payroll run.',
  governmentReportingTitle: 'PILA / DIAN Colombia',
  kpiConnectorDescription: 'The reference is ready for the final KPI engine; provisional KPI data and manual amounts will not be used.',
  kpiConnectorPending: 'KPI connector pending',
  kpiIncentive: 'KPI based',
  loadingIncentives: 'Loading applicable incentives...',
  manualIncentive: 'Configured incentive',
  manualDiscounts: 'Manual deductions',
  manualDiscountsDescription: 'Add exceptional deductions that apply only to this payroll run.',
  modified: 'Modified',
  next: 'Next',
  noIncentives: 'No applicable incentives for this period',
  noIncentivesDescription: 'Create or assign the incentive from the Incentives tab. It will appear here when its scope includes this HR user.',
  noCalculatedDeductions: 'There are no calculated deductions for this HR user.',
  noLineWarnings: 'This line has no attendance or calculation warnings.',
  noManualDiscounts: 'There are no manual deductions on this line.',
  noMatches: 'No HR users match this view.',
  noWarnings: 'No warnings',
  noOtherAdjustments: 'There are no manual earnings or other exceptions on this line.',
  openPending: 'Review changes',
  overview: 'Overview',
  otherAdjustments: 'Earnings and other exceptions',
  otherAdjustmentsDescription: 'Record exceptional earnings, employer contributions, or provisions for this run.',
  previous: 'Previous',
  print: 'Print',
  refresh: 'Refresh',
  removeAdjustment: 'Remove adjustment',
  results: 'results',
  reviewRequired: 'Review required',
  search: 'Search HR user',
  searchPlaceholder: 'Name, role, unit, or business',
  selectCollaborator: 'Select an HR user to review payroll.',
  treatmentLabels: {
    accounts_payable: 'Accounts payable',
    fiscal_payroll: 'Statutory payroll',
    no_payroll: 'No payroll',
    operational_payroll: 'Operational payroll',
  },
  warnings: 'Warnings',
};

const fr: PayrollRunWorkspaceText = {
  adjustments: 'Ajustements', all: 'Tous', actions: 'Actions', addDeduction: 'Ajouter une déduction', addEarning: 'Ajouter un revenu', applyIncentive: 'Ajouter au cycle',
  attendancePeriod: 'Présences de la période', audit: 'Audit', back: 'Retour', breakdown: 'Ventilation', calculatedDeductions: 'Déductions calculées',
  calculatedDeductionsDescription: 'Éléments produits par les règles de paie et la juridiction applicable.', calculations: 'Calcul', collaborators: 'Collaborateurs', concepts: 'Éléments',
  confirmDiscard: 'Quitter sans enregistrer', discard: 'Ignorer les changements', discardDescription: 'Des changements sont en attente dans ce cycle. Revenez à l’espace de travail ou ignorez-les et fermez.',
  dirty: 'Modifié', deductionsTotal: 'Total des déductions', discounts: 'Déductions', earningsTotal: 'Total des revenus', export: 'Exporter',
  exportCsvDescription: 'Classeur tabulaire avec tous les collaborateurs et les éléments du cycle de paie.', exportDescription: 'Choisissez un format pour télécharger le cycle de paie complet.',
  exportPdfDescription: 'Rapport conçu pour la révision, l’archivage ou l’impression.', filters: 'Vue', governmentReportingDescription: 'Ouvrez les dossiers gouvernementaux vérifiables de ce cycle de paie.',
  governmentReportingTitle: 'PILA / DIAN Colombie', incentiveApplied: 'Déjà appliqué', incentiveApplyError: 'La prime n’a pas pu être ajoutée.', incentiveAvailable: 'Disponible',
  incentiveLoadError: 'Les primes n’ont pas pu être chargées.', incentivePermissionLocked: 'Vous pouvez consulter les primes, mais votre rôle ne permet pas de modifier ce cycle.',
  incentiveRunLocked: 'Ce cycle conserve un historique immuable. Les primes restent visibles, mais ne peuvent être appliquées qu’aux cycles en brouillon.', incentives: 'Primes de paie',
  incentiveSourceNotice: 'Cette liste provient de l’onglet Primes et respecte la portée attribuée au collaborateur.', kpiConnectorDescription: 'La référence est prête pour le moteur KPI final; les données KPI provisoires et les montants manuels ne seront pas utilisés.',
  kpiConnectorPending: 'Connecteur KPI en attente', kpiIncentive: 'Basé sur un KPI', loadingIncentives: 'Chargement des primes applicables...', manualIncentive: 'Prime configurée',
  manualDiscounts: 'Déductions manuelles', manualDiscountsDescription: 'Ajoutez des déductions exceptionnelles qui s’appliquent uniquement à ce cycle de paie.', modified: 'Modifiés', next: 'Suivant',
  noIncentives: 'Aucune prime applicable à cette période', noIncentivesDescription: 'Créez ou attribuez la prime depuis l’onglet Primes. Elle apparaîtra ici lorsque sa portée inclura ce collaborateur.',
  noCalculatedDeductions: 'Aucune déduction calculée pour ce collaborateur.', noLineWarnings: 'Cette ligne ne comporte aucune alerte de présence ou de calcul.', noManualDiscounts: 'Aucune déduction manuelle sur cette ligne.', noMatches: 'Aucun collaborateur ne correspond à cette vue.',
  noOtherAdjustments: 'Aucun revenu manuel ni autre exception sur cette ligne.', noWarnings: 'Aucune alerte', openPending: 'Réviser les changements', otherAdjustments: 'Revenus et autres exceptions',
  otherAdjustmentsDescription: 'Enregistrez les revenus, cotisations patronales ou provisions exceptionnelles de ce cycle.', overview: 'Résumé', previous: 'Précédent', print: 'Imprimer', refresh: 'Actualiser',
  removeAdjustment: 'Supprimer l’ajustement', results: 'résultats', reviewRequired: 'Révision requise', search: 'Rechercher un collaborateur', searchPlaceholder: 'Nom, poste, unité ou établissement',
  selectCollaborator: 'Sélectionnez un collaborateur pour réviser sa paie.', treatmentLabels: { accounts_payable: 'Comptes fournisseurs', fiscal_payroll: 'Paie statutaire', no_payroll: 'Hors paie', operational_payroll: 'Paie opérationnelle' }, warnings: 'Alertes',
};

const pt: PayrollRunWorkspaceText = {
  adjustments: 'Ajustes', all: 'Todos', actions: 'Ações', addDeduction: 'Adicionar desconto', addEarning: 'Adicionar provento', applyIncentive: 'Adicionar à folha',
  attendancePeriod: 'Presença do período', audit: 'Auditoria', back: 'Voltar', breakdown: 'Detalhamento', calculatedDeductions: 'Descontos calculados',
  calculatedDeductionsDescription: 'Itens gerados pelas regras da folha e pela jurisdição aplicável.', calculations: 'Cálculo', collaborators: 'Colaboradores', concepts: 'Itens',
  confirmDiscard: 'Sair sem salvar', discard: 'Descartar alterações', discardDescription: 'Há alterações pendentes nesta folha. Volte ao espaço de trabalho ou descarte-as e feche.',
  dirty: 'Modificado', deductionsTotal: 'Total de descontos', discounts: 'Descontos', earningsTotal: 'Total de proventos', export: 'Exportar',
  exportCsvDescription: 'Planilha tabular com todos os colaboradores e itens da folha.', exportDescription: 'Escolha um formato para baixar a folha completa.',
  exportPdfDescription: 'Relatório preparado para revisão, arquivo ou impressão.', filters: 'Visualização', governmentReportingDescription: 'Abra os registros governamentais auditáveis desta folha.',
  governmentReportingTitle: 'PILA / DIAN Colômbia', incentiveApplied: 'Já aplicado', incentiveApplyError: 'Não foi possível adicionar o incentivo.', incentiveAvailable: 'Disponível',
  incentiveLoadError: 'Não foi possível carregar os incentivos.', incentivePermissionLocked: 'Você pode consultar os incentivos, mas sua função não permite alterar esta folha.',
  incentiveRunLocked: 'Esta folha mantém um histórico imutável. Os incentivos continuam visíveis, mas só podem ser aplicados em folhas em rascunho.', incentives: 'Incentivos da folha',
  incentiveSourceNotice: 'Esta lista vem da aba Incentivos e respeita o escopo atribuído ao colaborador.', kpiConnectorDescription: 'A referência está pronta para o motor KPI final; dados KPI provisórios e valores manuais não serão usados.',
  kpiConnectorPending: 'Conector KPI pendente', kpiIncentive: 'Baseado em KPI', loadingIncentives: 'Carregando incentivos aplicáveis...', manualIncentive: 'Incentivo configurado',
  manualDiscounts: 'Descontos manuais', manualDiscountsDescription: 'Adicione descontos excepcionais que se aplicam apenas a esta folha.', modified: 'Modificados', next: 'Próximo',
  noIncentives: 'Nenhum incentivo aplicável a este período', noIncentivesDescription: 'Crie ou atribua o incentivo na aba Incentivos. Ele aparecerá aqui quando seu escopo incluir este colaborador.',
  noCalculatedDeductions: 'Não há descontos calculados para este colaborador.', noLineWarnings: 'Esta linha não tem alertas de presença ou cálculo.', noManualDiscounts: 'Não há descontos manuais nesta linha.', noMatches: 'Nenhum colaborador corresponde a esta visualização.',
  noOtherAdjustments: 'Não há proventos manuais nem outras exceções nesta linha.', noWarnings: 'Sem alertas', openPending: 'Revisar alterações', otherAdjustments: 'Proventos e outras exceções',
  otherAdjustmentsDescription: 'Registre proventos, contribuições patronais ou provisões excepcionais desta folha.', overview: 'Resumo', previous: 'Anterior', print: 'Imprimir', refresh: 'Atualizar',
  removeAdjustment: 'Excluir ajuste', results: 'resultados', reviewRequired: 'Requer revisão', search: 'Buscar colaborador', searchPlaceholder: 'Nome, cargo, unidade ou negócio',
  selectCollaborator: 'Selecione um colaborador para revisar sua folha.', treatmentLabels: { accounts_payable: 'Contas a pagar', fiscal_payroll: 'Folha legal', no_payroll: 'Fora da folha', operational_payroll: 'Folha operacional' }, warnings: 'Alertas',
};

const ko: PayrollRunWorkspaceText = {
  adjustments: '조정', all: '전체', actions: '작업', addDeduction: '공제 추가', addEarning: '지급 항목 추가', applyIncentive: '급여에 추가', attendancePeriod: '기간 근태', audit: '감사', back: '뒤로',
  breakdown: '상세 내역', calculatedDeductions: '계산된 공제', calculatedDeductionsDescription: '급여 규칙과 해당 관할 기준으로 생성된 항목입니다.', calculations: '계산', collaborators: '직원', concepts: '항목',
  confirmDiscard: '저장하지 않고 나가기', discard: '변경 사항 버리기', discardDescription: '이 급여에 저장되지 않은 변경 사항이 있습니다. 작업 공간으로 돌아가거나 변경 사항을 버리고 닫으세요.', dirty: '수정됨',
  deductionsTotal: '총 공제', discounts: '공제', earningsTotal: '총 지급액', export: '내보내기', exportCsvDescription: '모든 직원과 급여 항목이 포함된 표 형식 파일입니다.',
  exportDescription: '전체 급여를 다운로드할 형식을 선택하세요.', exportPdfDescription: '검토, 보관 또는 인쇄용 보고서입니다.', filters: '보기', governmentReportingDescription: '이 급여의 감사 가능한 정부 신고 기록을 엽니다.',
  governmentReportingTitle: '콜롬비아 PILA / DIAN', incentiveApplied: '적용됨', incentiveApplyError: '인센티브를 추가할 수 없습니다.', incentiveAvailable: '사용 가능', incentiveLoadError: '인센티브를 불러올 수 없습니다.',
  incentivePermissionLocked: '인센티브를 볼 수 있지만 현재 역할로는 이 급여를 수정할 수 없습니다.', incentiveRunLocked: '이 급여는 변경할 수 없는 이력을 유지합니다. 인센티브는 표시되지만 초안 급여에만 적용할 수 있습니다.',
  incentives: '급여 인센티브', incentiveSourceNotice: '이 목록은 인센티브 탭에서 가져오며 직원에게 지정된 범위를 따릅니다.', kpiConnectorDescription: '최종 KPI 엔진용 참조가 준비되었습니다. 임시 KPI 데이터와 수동 금액은 사용하지 않습니다.',
  kpiConnectorPending: 'KPI 연결 대기 중', kpiIncentive: 'KPI 기반', loadingIncentives: '적용 가능한 인센티브 불러오는 중...', manualIncentive: '설정된 인센티브', manualDiscounts: '수동 공제',
  manualDiscountsDescription: '이 급여에만 적용되는 예외 공제를 추가합니다.', modified: '수정됨', next: '다음', noIncentives: '이 기간에 적용 가능한 인센티브가 없습니다',
  noIncentivesDescription: '인센티브 탭에서 인센티브를 생성하거나 지정하세요. 범위에 이 직원이 포함되면 여기에 표시됩니다.', noCalculatedDeductions: '이 직원에게 계산된 공제가 없습니다.', noLineWarnings: '이 라인에는 근태 또는 계산 알림이 없습니다.',
  noManualDiscounts: '이 라인에 수동 공제가 없습니다.', noMatches: '이 보기와 일치하는 직원이 없습니다.', noOtherAdjustments: '이 라인에 수동 지급 항목이나 기타 예외가 없습니다.', noWarnings: '알림 없음',
  openPending: '변경 사항 검토', otherAdjustments: '지급 항목 및 기타 예외', otherAdjustmentsDescription: '이 급여의 예외 지급, 고용주 부담금 또는 충당금을 기록합니다.', overview: '요약', previous: '이전',
  print: '인쇄', refresh: '새로고침', removeAdjustment: '조정 삭제', results: '결과', reviewRequired: '검토 필요', search: '직원 검색', searchPlaceholder: '이름, 직책, 단위 또는 사업',
  selectCollaborator: '급여를 검토할 직원을 선택하세요.', treatmentLabels: { accounts_payable: '미지급금', fiscal_payroll: '법정 급여', no_payroll: '급여 제외', operational_payroll: '운영 급여' }, warnings: '알림',
};

const zh: PayrollRunWorkspaceText = {
  adjustments: '调整', all: '全部', actions: '操作', addDeduction: '添加扣款', addEarning: '添加收入', applyIncentive: '添加到薪资批次', attendancePeriod: '本期考勤', audit: '审计', back: '返回',
  breakdown: '明细', calculatedDeductions: '已计算扣款', calculatedDeductionsDescription: '根据薪资规则和适用司法辖区生成的项目。', calculations: '计算', collaborators: '员工', concepts: '项目',
  confirmDiscard: '不保存并退出', discard: '放弃更改', discardDescription: '此薪资批次有待保存的更改。你可以返回工作区，或放弃更改并关闭。', dirty: '已修改', deductionsTotal: '扣款总额',
  discounts: '扣款', earningsTotal: '收入总额', export: '导出', exportCsvDescription: '包含此薪资批次所有员工和项目的表格工作簿。', exportDescription: '选择格式以下载完整薪资批次。',
  exportPdfDescription: '用于审核、归档或打印的报告。', filters: '视图', governmentReportingDescription: '打开此薪资批次可审计的政府申报记录。', governmentReportingTitle: '哥伦比亚 PILA / DIAN',
  incentiveApplied: '已应用', incentiveApplyError: '无法添加激励。', incentiveAvailable: '可用', incentiveLoadError: '无法加载激励。', incentivePermissionLocked: '你可以查看激励，但当前角色不能修改此薪资批次。',
  incentiveRunLocked: '此薪资批次保留不可变历史。激励仍可查看，但只能应用于草稿批次。', incentives: '薪资激励', incentiveSourceNotice: '此列表来自“激励”标签页，并遵循分配给员工的范围。',
  kpiConnectorDescription: '引用已为最终 KPI 引擎准备就绪；不会使用临时 KPI 数据或手动金额。', kpiConnectorPending: 'KPI 连接待完成', kpiIncentive: '基于 KPI', loadingIncentives: '正在加载适用激励...',
  manualIncentive: '已配置激励', manualDiscounts: '手动扣款', manualDiscountsDescription: '添加仅适用于此薪资批次的特殊扣款。', modified: '已修改', next: '下一步',
  noIncentives: '本期没有适用的激励', noIncentivesDescription: '请在“激励”标签页创建或分配激励。当范围包含此员工时，它会显示在这里。', noCalculatedDeductions: '此员工没有已计算扣款。', noLineWarnings: '此行没有考勤或计算提醒。',
  noManualDiscounts: '此行没有手动扣款。', noMatches: '没有员工符合当前视图。', noOtherAdjustments: '此行没有手动收入或其他例外。', noWarnings: '无提醒', openPending: '审核更改',
  otherAdjustments: '收入及其他例外', otherAdjustmentsDescription: '记录此批次的特殊收入、雇主缴费或计提。', overview: '概览', previous: '上一步', print: '打印', refresh: '刷新',
  removeAdjustment: '删除调整', results: '结果', reviewRequired: '需要审核', search: '搜索员工', searchPlaceholder: '姓名、职位、单元或业务', selectCollaborator: '选择员工以审核其薪资。',
  treatmentLabels: { accounts_payable: '应付账款', fiscal_payroll: '法定薪资', no_payroll: '不计薪资', operational_payroll: '运营薪资' }, warnings: '提醒',
};

export const getPayrollRunWorkspaceText = (locale: string) => (
  locale.toLowerCase().startsWith('es') ? es
    : locale.toLowerCase().startsWith('fr') ? fr
      : locale.toLowerCase().startsWith('pt') ? pt
        : locale.toLowerCase().startsWith('ko') ? ko
          : locale.toLowerCase().startsWith('zh') ? zh
            : en
);
