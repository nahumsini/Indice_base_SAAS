const en = {
  roster: 'Your team', search: 'Find a collaborator', searchHint: 'Name or time zone',
  clear: 'Clear search', noMatches: 'No collaborators match these filters.',
};
export type TeamWorkspaceCopy = { [K in keyof typeof en]: string };
const es: TeamWorkspaceCopy = {
  roster: 'Tu equipo', search: 'Buscar colaborador', searchHint: 'Nombre o zona horaria',
  clear: 'Limpiar búsqueda', noMatches: 'Ningún colaborador coincide con estos filtros.',
};
const fr: TeamWorkspaceCopy = {
  roster: 'Votre équipe', search: 'Rechercher un collaborateur', searchHint: 'Nom ou fuseau horaire',
  clear: 'Effacer la recherche', noMatches: 'Aucun collaborateur ne correspond à ces filtres.',
};
const pt: TeamWorkspaceCopy = {
  roster: 'Sua equipe', search: 'Buscar colaborador', searchHint: 'Nome ou fuso horário',
  clear: 'Limpar busca', noMatches: 'Nenhum colaborador corresponde a estes filtros.',
};
const ko: TeamWorkspaceCopy = {
  roster: '팀', search: '담당자 검색', searchHint: '이름 또는 시간대',
  clear: '검색 지우기', noMatches: '필터와 일치하는 담당자가 없습니다.',
};
const zh: TeamWorkspaceCopy = {
  roster: '您的团队', search: '查找工作人员', searchHint: '姓名或时区',
  clear: '清除搜索', noMatches: '没有符合筛选条件的工作人员。',
};
const copies: Record<string, TeamWorkspaceCopy> = {
  'en-CA': en, 'en-US': en, 'es-MX': es, 'es-CO': es, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};
export const getTeamWorkspaceCopy = (locale: string) => copies[locale] ?? en;
