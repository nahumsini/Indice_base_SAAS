import { useLanguage } from '../../../shared/context';

const en = {
  sort: 'Sort by', ascending: 'A–Z', descending: 'Z–A', newest: 'Newest first', oldest: 'Oldest first',
  close: 'Close', closePreview: 'Back to templates', clearSearch: 'Clear search',
  choose: 'Select a template to review its message and attachments.', active: 'Active', archived: 'Archived',
};
const es: typeof en = {
  sort: 'Ordenar por', ascending: 'A–Z', descending: 'Z–A', newest: 'Más recientes', oldest: 'Más antiguas',
  close: 'Cerrar', closePreview: 'Volver a plantillas', clearSearch: 'Limpiar búsqueda',
  choose: 'Elige una plantilla para revisar su mensaje y sus adjuntos.', active: 'Activa', archived: 'Archivada',
};
const fr: typeof en = {
  sort: 'Trier par', ascending: 'A–Z', descending: 'Z–A', newest: 'Plus récents', oldest: 'Plus anciens',
  close: 'Fermer', closePreview: 'Retour aux modèles', clearSearch: 'Effacer la recherche',
  choose: 'Sélectionnez un modèle pour vérifier son message et ses pièces jointes.', active: 'Actif', archived: 'Archivé',
};
const pt: typeof en = {
  sort: 'Ordenar por', ascending: 'A–Z', descending: 'Z–A', newest: 'Mais recentes', oldest: 'Mais antigos',
  close: 'Fechar', closePreview: 'Voltar aos modelos', clearSearch: 'Limpar busca',
  choose: 'Escolha um modelo para revisar a mensagem e os anexos.', active: 'Ativo', archived: 'Arquivado',
};
const ko: typeof en = {
  sort: '정렬 기준', ascending: '오름차순', descending: '내림차순', newest: '최신순', oldest: '오래된 순',
  close: '닫기', closePreview: '템플릿으로 돌아가기', clearSearch: '검색 지우기',
  choose: '메시지와 첨부파일을 확인할 템플릿을 선택하세요.', active: '활성', archived: '보관됨',
};
const zh: typeof en = {
  sort: '排序方式', ascending: '升序', descending: '降序', newest: '最新优先', oldest: '最早优先',
  close: '关闭', closePreview: '返回模板', clearSearch: '清除搜索',
  choose: '选择模板以查看邮件正文和附件。', active: '启用', archived: '已归档',
};
export function useTemplateWorkspaceCopy() {
  const { currentLanguage } = useLanguage();
  return ({ en, es, fr, pt, ko, zh } as Record<string, typeof en>)[currentLanguage.code.split('-')[0]] ?? en;
}
