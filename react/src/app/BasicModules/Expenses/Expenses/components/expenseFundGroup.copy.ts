import type { ExpensesLocale } from '../translations';

const en = {
  fund: 'Petty cash', details: 'View breakdown', hide: 'Hide breakdown', open: 'Open fund',
  accounts: 'Multiple accounts', various: 'Multiple', locked: 'Classification belongs to the source fund',
  authorized: 'authorized expenses', matching: 'matching expenses', period: 'Selected period',
  loading: 'Loading fund totals…', failed: 'Fund totals could not be loaded.', retry: 'Retry',
  rows: (rows: number, expenses: number) => `${rows} rows · ${expenses} expenses`,
};
type Copy = typeof en;
const es: Copy = {
  fund: 'Caja chica', details: 'Ver desglose', hide: 'Ocultar desglose', open: 'Abrir fondo',
  accounts: 'Varias cuentas', various: 'Varios', locked: 'Clasificación vinculada al fondo de origen',
  authorized: 'gastos autorizados', matching: 'gastos coincidentes', period: 'Periodo seleccionado',
  loading: 'Cargando totales de fondos…', failed: 'No se pudieron cargar los totales de los fondos.', retry: 'Reintentar',
  rows: (rows, expenses) => `${rows} ${rows === 1 ? 'fila' : 'filas'} · ${expenses} ${expenses === 1 ? 'gasto' : 'gastos'}`,
};
const copies: Record<ExpensesLocale, Copy> = {
  'es-MX': es, 'es-CO': es, 'en-US': en, 'en-CA': en,
  'fr-CA': { fund: 'Petite caisse', details: 'Voir le détail', hide: 'Masquer le détail', open: 'Ouvrir le fonds', accounts: 'Plusieurs comptes', various: 'Plusieurs', locked: 'Classification liée au fonds d’origine', authorized: 'dépenses autorisées', matching: 'dépenses correspondantes', period: 'Période sélectionnée', loading: 'Chargement des totaux des fonds…', failed: 'Impossible de charger les totaux des fonds.', retry: 'Réessayer', rows: (r, e) => `${r} lignes · ${e} dépenses` },
  'pt-BR': { fund: 'Caixa pequeno', details: 'Ver detalhes', hide: 'Ocultar detalhes', open: 'Abrir fundo', accounts: 'Várias contas', various: 'Vários', locked: 'Classificação vinculada ao fundo de origem', authorized: 'despesas autorizadas', matching: 'despesas correspondentes', period: 'Período selecionado', loading: 'Carregando totais dos fundos…', failed: 'Não foi possível carregar os totais dos fundos.', retry: 'Tentar novamente', rows: (r, e) => `${r} linhas · ${e} despesas` },
  'ko-CA': { fund: '소액 현금', details: '상세 보기', hide: '상세 숨기기', open: '자금 열기', accounts: '여러 계정', various: '여러 항목', locked: '원본 자금에 연결된 분류', authorized: '승인된 비용', matching: '일치하는 비용', period: '선택 기간', loading: '자금 합계 로딩 중…', failed: '자금 합계를 불러오지 못했습니다.', retry: '다시 시도', rows: (r, e) => `${r}행 · ${e}개 비용` },
  'zh-CA': { fund: '备用金', details: '查看明细', hide: '收起明细', open: '打开资金', accounts: '多个科目', various: '多个', locked: '分类关联原始资金', authorized: '已授权费用', matching: '匹配费用', period: '所选期间', loading: '正在加载资金总额…', failed: '无法加载资金总额。', retry: '重试', rows: (r, e) => `${r}行 · ${e}笔费用` },
};
export const getExpenseFundGroupCopy = (locale: ExpensesLocale): Copy => copies[locale] ?? en;
