import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';
import { koCAIncentiveForm } from './formLocales';

export const koCA = {
  ...enCA,
  form: koCAIncentiveForm,
  title: '인센티브',
  subtitle: '수동 보너스, 자동 규칙 및 급여 적용 시점을 관리합니다.',
  actions: { columns: '열', addIncentive: '인센티브 추가' },
  columns: { incentive: '인센티브', type: '유형', scope: '범위', amount: '금액', application: '적용', status: '상태' },
  filters: { title: '필터', searchLabel: '인센티브 검색', searchPlaceholder: '이름, 범위, 금액 또는 적용 시점', type: '유형', status: '상태', allTypes: '모든 유형', allStatuses: '모든 상태' },
  types: { Automatizado: '자동', Manual: '수동' },
  statuses: { Activo: '활성', Programado: '예약됨', Pausado: '일시 중지' },
  kpis: {
    total: '총 인센티브',
    active: '활성',
    automated: '자동화',
    manual: '수동',
    visibleAfterFilters: '필터 적용 후 표시',
    eligibleEmployees: '대상 직원',
    summary: (activeCount: number, scheduledCount: number, pausedCount: number, selectedCount: number, visibleCount: number, totalCount: number) =>
      `인센티브 요약: 활성 ${activeCount}건 · 예약 ${scheduledCount}건 · 일시 중지 ${pausedCount}건 · 선택 ${selectedCount}건 · ${totalCount}건 중 ${visibleCount}건 표시.`,
  },
  columnsModal: { title: '테이블 열', subtitle: '이 화면에 표시할 인센티브 열을 선택하세요.', close: '열 모달 닫기', required: '필수', done: '완료' },
  table: { empty: '현재 필터와 일치하는 인센티브가 없습니다.', showing: (count: number) => `${count}개 인센티브 표시`, page: '1 / 1 페이지', previous: '이전', next: '다음' },
  pagination: {
    pageSize: '페이지당 행',
    showing: (start: number, end: number, total: number) => `인센티브 ${total}건 중 ${start}-${end}건 표시`,
    page: (current: number, total: number) => `${current} / ${total} 페이지`,
    previous: '이전',
    next: '다음',
  },
  newIncentive: { selectedCollaborators: (count: number) => `${count}명 직원`, automatedRule: '자동 규칙', fixed: '고정', pending: '대기', nextPayroll: '다음 급여' },
} as const satisfies IncentivesTranslations;
