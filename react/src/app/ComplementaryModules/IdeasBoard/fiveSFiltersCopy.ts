const messages = {
  filters:['Filtros','Filters','Filtres','Filtros','필터','筛选'],
  search:['Buscar','Search','Rechercher','Buscar','검색','搜索'],
  searchHint:['Acción o responsable','Action or owner','Action ou responsable','Ação ou responsável','작업 또는 담당자','行动或负责人'],
  clearSearch:['Borrar búsqueda','Clear search','Effacer la recherche','Limpar busca','검색 지우기','清除搜索'],
  clear:['Limpiar filtros','Clear filters','Effacer les filtres','Limpar filtros','필터 초기화','清除筛选'],
  allOwners:['Todos los responsables','All owners','Tous les responsables','Todos os responsáveis','모든 담당자','全部负责人'],
  allStatuses:['Todos los estados','All statuses','Tous les états','Todos os estados','모든 상태','全部状态'],
  date:['Fecha','Date','Date','Data','날짜','日期'],
  allDates:['Todas las fechas','All dates','Toutes les dates','Todas as datas','모든 날짜','全部日期'],
  today:['Objetivo: hoy','Due today','Échéance : aujourd’hui','Prazo: hoje','오늘 마감','今天到期'],
  nextSeven:['Objetivo: próximos 7 días','Due in the next 7 days','Échéance : 7 prochains jours','Prazo: próximos 7 dias','향후 7일 마감','未来7天到期'],
  overdue:['Vencidas sin verificar','Overdue, not verified','En retard, non vérifiées','Atrasadas, não verificadas','기한 초과·미확인','已逾期且未验证'],
  custom:['Objetivo: elegir periodo','Due: choose a period','Échéance : choisir une période','Prazo: escolher período','마감 기간 선택','选择到期时间段'],
  from:['Objetivo desde','Due from','Échéance à partir du','Prazo a partir de','마감 시작일','到期起始日'],
  to:['Objetivo hasta','Due until','Échéance jusqu’au','Prazo até','마감 종료일','到期结束日'],
  rangeError:['La fecha final debe ser igual o posterior a la inicial.','The end date must be on or after the start date.','La date de fin doit suivre ou correspondre à la date de début.','A data final deve ser igual ou posterior à inicial.','종료일은 시작일과 같거나 이후여야 합니다.','结束日期不能早于开始日期。'],
  reviewHelp:['Incluye revisiones de los próximos 7 días y las que quedaron pendientes.','Includes reviews due in the next 7 days and earlier reviews.','Inclut les révisions des 7 prochains jours et celles en retard.','Inclui revisões dos próximos 7 dias e as anteriores.','향후 7일 및 이전 점검일을 포함합니다.','包括未来7天及之前的检查。'],
  results:['{visible} de {total} acciones','{visible} of {total} actions','{visible} actions sur {total}','{visible} de {total} ações','작업 {total}개 중 {visible}개','显示{visible}/{total}项行动'],
  progress:['Avance del área','Area progress','Avancement de la zone','Progresso da área','구역 진행 상황','区域进展'],
  selectionProgress:['Avance de la selección','Selection progress','Avancement de la sélection','Progresso da seleção','선택 범위 진행 상황','所选范围进展'],
  verified:['{done} de {total} acciones verificadas','{done} of {total} actions verified','{done} actions vérifiées sur {total}','{done} de {total} ações verificadas','작업 {total}개 중 {done}개 확인','已验证{done}/{total}项行动'],
  pendingLabel:['Pendientes','Pending','En attente','Pendentes','대기 중','待处理'],
  verifiedLabel:['Verificadas','Verified','Vérifiées','Verificadas','확인 완료','已验证'],
  undated:['Sin fecha objetivo','No target date','Sans échéance','Sem prazo','마감일 없음','无到期日期'],
  pendingHelp:['Por comenzar','Not started yet','À commencer','Para começar','시작 전','尚未开始'],
  inProgressHelp:['Se están trabajando','Work underway','En cours de réalisation','Em andamento','작업 중','正在进行'],
  verifiedHelp:['Con resultado registrado','Result recorded','Résultat enregistré','Com resultado registrado','결과 기록됨','已记录结果'],
  empty:['No hay acciones con estos filtros','No actions match these filters','Aucune action ne correspond à ces filtres','Nenhuma ação corresponde a estes filtros','필터와 일치하는 작업이 없습니다','没有符合这些条件的行动'],
  emptyHelp:['Prueba otro responsable, estado o periodo.','Try a different owner, status or period.','Essayez un autre responsable, état ou période.','Tente outro responsável, estado ou período.','다른 담당자, 상태 또는 기간을 선택하세요.','请尝试其他负责人、状态或时间段。'],
  filteredUpdate:['Avance actualizado. Si la acción ya no aparece, limpia los filtros para verla.','Progress updated. Clear filters if the action is no longer visible.','Avancement mis à jour. Effacez les filtres si l’action n’apparaît plus.','Progresso atualizado. Limpe os filtros se a ação não aparecer.','진행 상황이 업데이트되었습니다. 작업이 보이지 않으면 필터를 초기화하세요.','进展已更新。如未显示该行动，请清除筛选。'],
} as const;
export function fiveSFiltersCopy(locale:string) {
  const index=({es:0,en:1,fr:2,pt:3,ko:4,zh:5} as Record<string,number>)[locale.split('-')[0]]??1;
  return Object.fromEntries(Object.entries(messages).map(([key,values])=>[key,values[index]])) as {[K in keyof typeof messages]:string};
}
export function fiveSFilterText(text:string,values:Record<string,number>) {
  return text.replace(/\{(\w+)\}/g,(_,key:string)=>String(values[key]??''));
}
