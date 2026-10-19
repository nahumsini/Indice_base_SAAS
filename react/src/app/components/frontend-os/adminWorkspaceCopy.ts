/** Presentation copy only. Administrative workspaces retain their own data and permissions. */
const en = {
  reasonHelp: 'Enter a reason of at least 5 characters to save the change.',
  filters: 'Filters', search: 'Search', status: 'Status', all: 'All', clear: 'Clear filters',
  noResults: 'No results for these filters', adjustFilters: 'Try another search or clear the filters.',
  selection: 'Selection', selected: 'Selected', available: 'Not selected',
  pending: 'Pending', completed: 'Completed', searchActivities: 'Search activities',
  searchProducts: 'Search modules or packages', searchConnections: 'Search connections',
  copyError: 'The link could not be copied. Try again.',
};
type Copy = typeof en;
const es: Copy = {
  reasonHelp: 'Escribe un motivo de al menos 5 caracteres para guardar el cambio.',
  filters: 'Filtros', search: 'Buscar', status: 'Estado', all: 'Todos', clear: 'Limpiar filtros',
  noResults: 'Sin resultados con estos filtros', adjustFilters: 'Prueba otra búsqueda o limpia los filtros.',
  selection: 'Selección', selected: 'Seleccionados', available: 'Sin seleccionar',
  pending: 'Pendientes', completed: 'Completadas', searchActivities: 'Buscar actividades',
  searchProducts: 'Buscar módulos o paquetes', searchConnections: 'Buscar conexiones',
  copyError: 'No se pudo copiar el enlace. Inténtalo de nuevo.',
};
const copies: Record<string, Copy> = {
  'en-US': en, 'en-CA': en, 'es-MX': es, 'es-CO': es,
  'fr-CA': {
    reasonHelp: 'Indiquez un motif d’au moins 5 caractères pour enregistrer la modification.',
    filters: 'Filtres', search: 'Rechercher', status: 'État', all: 'Tous', clear: 'Effacer les filtres',
    noResults: 'Aucun résultat pour ces filtres', adjustFilters: 'Modifiez la recherche ou effacez les filtres.',
    selection: 'Sélection', selected: 'Sélectionnés', available: 'Non sélectionnés',
    pending: 'À terminer', completed: 'Terminées', searchActivities: 'Rechercher des activités',
    searchProducts: 'Rechercher des modules ou forfaits', searchConnections: 'Rechercher des connexions',
    copyError: 'Le lien n’a pas pu être copié. Réessayez.',
  },
  'pt-BR': {
    reasonHelp: 'Informe um motivo com pelo menos 5 caracteres para salvar a alteração.',
    filters: 'Filtros', search: 'Buscar', status: 'Estado', all: 'Todos', clear: 'Limpar filtros',
    noResults: 'Nenhum resultado para estes filtros', adjustFilters: 'Tente outra busca ou limpe os filtros.',
    selection: 'Seleção', selected: 'Selecionados', available: 'Não selecionados',
    pending: 'Pendentes', completed: 'Concluídas', searchActivities: 'Buscar atividades',
    searchProducts: 'Buscar módulos ou pacotes', searchConnections: 'Buscar conexões',
    copyError: 'Não foi possível copiar o link. Tente novamente.',
  },
  'ko-CA': {
    reasonHelp: '변경 사항을 저장하려면 사유를 5자 이상 입력하세요.',
    filters: '필터', search: '검색', status: '상태', all: '전체', clear: '필터 초기화',
    noResults: '필터에 맞는 결과가 없습니다', adjustFilters: '검색어를 변경하거나 필터를 초기화하세요.',
    selection: '선택', selected: '선택됨', available: '선택 안 됨',
    pending: '미완료', completed: '완료', searchActivities: '활동 검색',
    searchProducts: '모듈 또는 패키지 검색', searchConnections: '연결 검색',
    copyError: '링크를 복사하지 못했습니다. 다시 시도하세요.',
  },
  'zh-CA': {
    reasonHelp: '请输入至少5个字符的原因以保存更改。',
    filters: '筛选', search: '搜索', status: '状态', all: '全部', clear: '清除筛选',
    noResults: '没有符合筛选条件的结果', adjustFilters: '请尝试其他搜索词或清除筛选。',
    selection: '选择', selected: '已选', available: '未选',
    pending: '待完成', completed: '已完成', searchActivities: '搜索活动',
    searchProducts: '搜索模块或套餐', searchConnections: '搜索连接',
    copyError: '无法复制链接，请重试。',
  },
};
export function getAdminWorkspaceCopy(locale: string): Copy { return copies[locale] ?? en; }
