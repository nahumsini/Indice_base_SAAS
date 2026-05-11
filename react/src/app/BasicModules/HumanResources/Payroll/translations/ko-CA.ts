import { enCA } from './en-CA';
import type { PayrollTranslations } from './types';

export const koCA = {
  ...enCA,
  title: '급여',
  subtitle: '사용자 및 근태 데이터를 기반으로 급여 실행을 검토, 승인, 지급, 내보냅니다.',
  refresh: '새로고침',
  loading: '급여 로딩 중',
  header: {
    title: '급여 운영',
    subtitle: '조직 구조와 관할 규칙에 따라 급여 실행을 검토하고 처리합니다.',
    preferences: '설정',
  },
  filterBar: { title: '필터' },
  labels: {
    ...enCA.labels,
    preferences: '급여 설정',
    employees: '사용자',
    employee: '사용자',
    payrollType: '급여 유형',
    exportCsv: 'CSV 내보내기',
    exportPdf: 'PDF 내보내기',
    close: '닫기',
    cancel: '취소',
    save: '저장',
    print: '인쇄',
  },
  runLedger: {
    ...enCA.runLedger,
    title: '운영 급여 실행',
    subtitle: '검토, 승인, 지급 또는 내보내기가 필요한 실행입니다.',
    actions: '작업',
    netPayout: '순지급액',
  },
} as const satisfies PayrollTranslations;
