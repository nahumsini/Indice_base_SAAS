const en = {
  title: 'Opportunity board', sort: 'Order by', next_action: 'Next action', newest: 'Newest first', oldest: 'Oldest first', amount: 'Estimate (by currency)',
  all: 'All', overdue: 'Overdue', unscheduled: 'Needs scheduling', today: 'Today', scheduled: 'Scheduled', closed: 'Closed', paused: 'On hold', noTime: 'No time',
  expand: 'Seller mode', restore: 'Exit seller mode', fullscreenError: 'Unable to change full-screen mode. Try again or check your browser settings.', search: 'Search opportunities', filters: 'Show filters', estimate: 'Estimated', owner: 'Owner', unassigned: 'Unassigned',
  actions: 'More actions', move: 'Move to stage', details: 'View details', stage: 'Stage', clear: 'Clear board filter', empty: 'No opportunities in this stage', filteredEmpty: 'No matches for these filters',
  drag: 'Drag to another stage or use “Move to stage”', loading: 'Opening your board…',
  count: (visible: number, total: number) => `${visible} of ${total} opportunities`,
};
export type KanbanCopy = typeof en;
const es: KanbanCopy = {
  title: 'Tablero de oportunidades', sort: 'Ordenar por', next_action: 'Siguiente acción', newest: 'Más recientes', oldest: 'Más antiguas', amount: 'Estimado (por moneda)',
  all: 'Todas', overdue: 'Vencidas', unscheduled: 'Sin programar', today: 'Hoy', scheduled: 'Programada', closed: 'Cerrada', paused: 'En pausa', noTime: 'Sin horario',
  expand: 'Modo vendedor', restore: 'Salir del modo vendedor', fullscreenError: 'No se pudo cambiar el modo de pantalla. Intenta de nuevo o revisa la configuración del navegador.', search: 'Buscar oportunidades', filters: 'Mostrar filtros', estimate: 'Estimado', owner: 'Responsable', unassigned: 'Sin asignar',
  actions: 'Más acciones', move: 'Mover a etapa', details: 'Ver detalle', stage: 'Etapa', clear: 'Quitar filtro del tablero', empty: 'Sin oportunidades en esta etapa', filteredEmpty: 'Sin coincidencias con estos filtros',
  drag: 'Arrastra a otra etapa o utiliza “Mover a etapa”', loading: 'Abriendo tu tablero…',
  count: (visible, total) => `${visible} de ${total} oportunidades`,
};
const fr: KanbanCopy = {
  title: 'Tableau des occasions', sort: 'Trier par', next_action: 'Prochaine action', newest: 'Plus récentes', oldest: 'Plus anciennes', amount: 'Estimation (par devise)',
  all: 'Toutes', overdue: 'En retard', unscheduled: 'À planifier', today: 'Aujourd’hui', scheduled: 'Planifiée', closed: 'Fermée', paused: 'En pause', noTime: 'Sans heure',
  expand: 'Mode vendeur', restore: 'Quitter le mode vendeur', fullscreenError: 'Impossible de changer le mode plein écran. Réessayez ou vérifiez les paramètres du navigateur.', search: 'Rechercher des occasions', filters: 'Afficher les filtres', estimate: 'Estimation', owner: 'Responsable', unassigned: 'Non attribuée',
  actions: 'Autres actions', move: 'Déplacer vers une étape', details: 'Voir les détails', stage: 'Étape', clear: 'Effacer le filtre du tableau', empty: 'Aucune occasion à cette étape', filteredEmpty: 'Aucun résultat pour ces filtres',
  drag: 'Glissez vers une autre étape ou utilisez « Déplacer vers une étape »', loading: 'Ouverture du tableau…', count: (visible, total) => `${visible} sur ${total} occasions`,
};
const pt: KanbanCopy = {
  title: 'Quadro de oportunidades', sort: 'Ordenar por', next_action: 'Próxima ação', newest: 'Mais recentes', oldest: 'Mais antigas', amount: 'Estimativa (por moeda)',
  all: 'Todas', overdue: 'Atrasadas', unscheduled: 'Sem agendamento', today: 'Hoje', scheduled: 'Agendada', closed: 'Encerrada', paused: 'Em pausa', noTime: 'Sem horário',
  expand: 'Modo vendedor', restore: 'Sair do modo vendedor', fullscreenError: 'Não foi possível alterar o modo de tela. Tente novamente ou verifique as configurações do navegador.', search: 'Buscar oportunidades', filters: 'Mostrar filtros', estimate: 'Estimativa', owner: 'Responsável', unassigned: 'Não atribuído',
  actions: 'Mais ações', move: 'Mover para etapa', details: 'Ver detalhes', stage: 'Etapa', clear: 'Limpar filtro do quadro', empty: 'Nenhuma oportunidade nesta etapa', filteredEmpty: 'Nenhum resultado para estes filtros',
  drag: 'Arraste para outra etapa ou use “Mover para etapa”', loading: 'Abrindo seu quadro…', count: (visible, total) => `${visible} de ${total} oportunidades`,
};
const ko: KanbanCopy = {
  title: '영업 기회 보드', sort: '정렬 기준', next_action: '다음 활동', newest: '최신순', oldest: '오래된순', amount: '예상 금액 (통화별)',
  all: '전체', overdue: '기한 초과', unscheduled: '일정 미정', today: '오늘', scheduled: '예약됨', closed: '종료됨', paused: '보류 중', noTime: '시간 미정',
  expand: '판매자 모드', restore: '판매자 모드 종료', fullscreenError: '화면 모드를 변경할 수 없습니다. 다시 시도하거나 브라우저 설정을 확인하세요.', search: '영업 기회 검색', filters: '필터 표시', estimate: '예상 금액', owner: '담당자', unassigned: '미배정',
  actions: '추가 작업', move: '단계 이동', details: '상세 보기', stage: '단계', clear: '보드 필터 지우기', empty: '이 단계에 영업 기회가 없습니다', filteredEmpty: '필터에 맞는 결과가 없습니다',
  drag: '다른 단계로 드래그하거나 단계 이동을 사용하세요', loading: '보드를 여는 중…', count: (visible, total) => `${total}개 중 ${visible}개 기회`,
};
const zh: KanbanCopy = {
  title: '商机看板', sort: '排序方式', next_action: '下一步行动', newest: '最新优先', oldest: '最早优先', amount: '预估金额（按币种）',
  all: '全部', overdue: '已逾期', unscheduled: '待安排', today: '今天', scheduled: '已安排', closed: '已关闭', paused: '已暂停', noTime: '未设时间',
  expand: '销售员模式', restore: '退出销售员模式', fullscreenError: '无法更改屏幕模式。请重试或检查浏览器设置。', search: '搜索商机', filters: '显示筛选', estimate: '预估金额', owner: '负责人', unassigned: '未分配',
  actions: '更多操作', move: '移动至阶段', details: '查看详情', stage: '阶段', clear: '清除看板筛选', empty: '此阶段暂无商机', filteredEmpty: '没有符合筛选的结果',
  drag: '拖动到其他阶段，或使用“移动至阶段”', loading: '正在打开看板…', count: (visible, total) => `${total} 个商机中显示 ${visible} 个`,
};
export function getKanbanCopy(locale: string): KanbanCopy {
  return ({ es, fr, pt, ko, zh } as Record<string, KanbanCopy>)[locale.split('-')[0]] ?? en;
}
