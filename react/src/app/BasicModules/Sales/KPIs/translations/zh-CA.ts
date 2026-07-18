import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const zhCA: SalesKpisTranslations = {
  ...enCA,
  header: {
    title: '销售 KPI',
    subtitle: '销售实时看板：机会、报价、成交、客户、佣金和商业风险。',
  },
  filters: {
    title: '筛选',
    search: '搜索',
    unit: '单位',
    business: '业务',
    seller: '销售',
    allUnits: '全部单位',
    allBusinesses: '全部业务',
    allSellers: '全部销售',
    searchPlaceholder: '搜索机会、客户或销售',
  },
};
