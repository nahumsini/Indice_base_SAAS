import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const koCA = {
  ...enCA,
  title: '휴가/허가',
  subtitle: '요청, 결근, 휴가 및 승인 상태를 관리합니다.',
  actions: { columns: '열', addRequest: '요청 추가', close: '닫기', approve: '승인', reject: '반려', delete: '삭제', view: '보기', submitting: '제출 중...' },
  columns: { folio: '접수번호', employee: '직원', type: '유형', startDate: '시작일', endDate: '종료일', days: '일수', status: '상태', actions: '작업' },
  pagination: {
    pageSize: '페이지당 행',
    showing: (start: number, end: number, total: number) => `요청 ${total}건 중 ${start}-${end}건 표시`,
    page: (current: number, total: number) => `${current} / ${total} 페이지`,
    previous: '이전',
    next: '다음',
  },
  filters: { title: '필터', searchLabel: '요청 검색', searchPlaceholder: '직원 또는 접수번호', status: '상태', allStatuses: '모든 상태', type: '유형', allTypes: '모든 유형', employee: '직원', allEmployees: '전체 직원' },
  kpis: {
    total: '총 요청',
    pending: '대기',
    approved: '승인',
    rejected: '반려',
    thisMonth: '이번 달',
    visibleAfterFilters: '필터 적용 후 표시',
    approvalRate: (rate: number) => `승인율 ${rate}%`,
    summary: (approved: number, pending: number, rejected: number, visible: number, total: number) =>
      `요청 요약: 승인 ${approved}건 · 대기 ${pending}건 · 반려 ${rejected}건 · ${total}건 중 ${visible}건 표시.`,
  },
  types: { vacation: '휴가', sick_leave: '병가', personal: '개인', maternity: '출산/육아', bereavement: '경조', unpaid: '무급 휴가', other: '기타' },
  status: { pending: '대기', approved: '승인됨', rejected: '반려됨' },
  columnsModal: { title: '테이블 열', subtitle: '이 화면에 표시할 권한 요청 열을 선택하세요.', close: '열 모달 닫기', required: '필수', done: '완료' },
  empty: { title: '아직 요청이 없습니다', description: '표시할 권한 요청이 없습니다.' },
  modal: { ...enCA.modal, title: '권한 요청', subtitle: '새 요청을 제출하려면 양식을 작성하세요.', permissionType: '요청 유형 *', selectPermissionType: '요청 유형 선택', startDate: '시작일 *', endDate: '종료일 *', halfDay: '반일', halfDayDescription: '마지막 날의 반일만 요청', totalDays: '총 일수:', reason: '사유 *', reasonPlaceholder: '요청 사유를 간단히 입력하세요...', attachment: '첨부 파일 (선택)', acceptedFormats: '허용 형식: PDF, DOC, DOCX, JPG, PNG', uploadFile: '파일 업로드', cancel: '취소', submit: '요청 제출', submitting: '제출 중...' },
  detail: { ...enCA.detail, title: '권한 요청', employeeInformation: '직원 정보', type: '유형', fallbackAttachment: 'medical-certificate-ko.pdf', startDate: '시작일', endDate: '종료일', duration: '기간', day: '일', days: '일', reason: '사유', attachments: '첨부 파일', noAttachments: '이 요청에 업로드된 첨부 파일이 없습니다.', reviewNotes: '검토 메모', reviewedBy: '검토자', reviewedAt: '검토일', created: '생성:', updated: '마지막 업데이트:' },
  loading: { title: '권한 요청 로딩 중', description: '최신 요청을 가져오고 있습니다.', savingTitle: '요청 저장 중', savingDescription: '요청과 첨부 파일을 제출하고 있습니다.', reviewingTitle: '요청 업데이트 중', reviewingDescription: '승인 상태 변경을 적용하고 있습니다.', deletingTitle: '요청 삭제 중', deletingDescription: '대기 중인 요청을 제거하고 있습니다.', detailsTitle: '요청 상세 로딩 중', detailsDescription: '최신 요청 정보를 가져오고 있습니다.' },
  errors: { load: '권한 요청을 불러올 수 없습니다.', create: '요청을 제출할 수 없습니다.', approve: '요청을 승인할 수 없습니다.', reject: '요청을 반려할 수 없습니다.', delete: '요청을 삭제할 수 없습니다.', attachment: '첨부 파일을 업로드할 수 없습니다.', details: '요청 상세를 불러올 수 없습니다.' },
  success: { created: '요청이 제출되었습니다.', approved: '요청이 승인되었습니다.', rejected: '요청이 반려되었습니다.', deleted: '요청이 삭제되었습니다.' },
} as const satisfies PermissionsTranslations;
