import { enCA } from './en-CA';
import type { SalesKpisTranslations } from './types';

export const koCA: SalesKpisTranslations = {
  ...enCA,
  header: {
    title: '영업 KPI',
    subtitle: '기회, 견적, 수주, 커미션, 상품, 영업 재고를 보는 실시간 영업 보드입니다.',
  },
  filters: {
    title: '필터',
    allUnits: '전체 유닛',
    allBusinesses: '전체 비즈니스',
    allSellers: '전체 담당자',
    searchPlaceholder: '기회, 고객 또는 담당자 검색',
  },
};
