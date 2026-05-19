import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const koCA = {
  ...enCA,
  title: '휴가/허가',
  subtitle: '요청, 결근, 휴가 및 승인 상태를 관리합니다.',
  actions: { ...enCA.actions, columns: '열', addRequest: '요청 추가', close: '닫기', approve: '승인', reject: '반려', view: '보기' },
  columns: { ...enCA.columns, employee: '직원', type: '유형', startDate: '시작일', endDate: '종료일', days: '일수', status: '상태', actions: '작업' },
  filters: { ...enCA.filters, title: '필터', searchLabel: '요청 검색', status: '상태', allStatuses: '모든 상태', allTypes: '모든 유형', employee: '직원', allEmployees: '전체 직원' },
  types: { vacation: '휴가', sick_leave: '병가', personal: '개인', maternity: '출산/육아', bereavement: '경조', unpaid: '무급 휴가', other: '기타' },
  status: { pending: '대기', approved: '승인됨', rejected: '반려됨' },
  columnsModal: { ...enCA.columnsModal, title: '테이블 열', close: '열 모달 닫기', required: '필수', done: '완료' },
} as const satisfies PermissionsTranslations;
