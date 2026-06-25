import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const zhCA: SalesKpisTranslations = {
  ...enCA,
  header: {
    title: '销售 KPI',
    subtitle: '销售实时看板：机会、报价、成交、佣金、产品和商业库存。',
  },
  filters: {
    title: '筛选',
    allUnits: '全部单位',
    allBusinesses: '全部业务',
    allSellers: '全部销售',
    searchPlaceholder: '搜索机会、客户或销售',
  },
};
