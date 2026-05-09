import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';

export const koCA = {
  ...enCA,
  title: '인센티브',
  subtitle: '수동 보너스, 자동 규칙 및 급여 적용 시점을 관리합니다.',
  actions: { columns: '열', addIncentive: '인센티브 추가' },
  columns: { incentive: '인센티브', type: '유형', scope: '범위', amount: '금액', application: '적용', status: '상태' },
  filters: { ...enCA.filters, title: '필터', searchLabel: '인센티브 검색', type: '유형', status: '상태', allTypes: '모든 유형', allStatuses: '모든 상태' },
  types: { Automatizado: '자동', Manual: '수동' },
  statuses: { Activo: '활성', Programado: '예약됨', Pausado: '일시 중지' },
  columnsModal: { ...enCA.columnsModal, title: '테이블 열', close: '열 모달 닫기', required: '필수', done: '완료' },
} as const satisfies IncentivesTranslations;
