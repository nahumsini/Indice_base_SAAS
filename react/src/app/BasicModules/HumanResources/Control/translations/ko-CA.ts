import { enCA } from './en-CA';
import type { ControlTranslations } from './types';

export const koCA = {
  ...enCA,
  title: '관리',
  subtitle: '출석을 실시간으로 모니터링하고 운영 규칙을 관리합니다.',
  refresh: '새로고침',
  loading: '관리 데이터 로딩 중',
  retry: '다시 시도',
  genericError: '출석 관리를 불러올 수 없습니다.',
  saveError: '요청한 관리 변경 사항을 저장할 수 없습니다.',
  bulkAssignSuccess: '일정 배정이 업데이트되었습니다.',
  locationSaved: '계약 근무지가 저장되었습니다.',
  templateSaved: '일정 템플릿이 저장되었습니다.',
  searchPlaceholder: '직원, 코드, 직무 또는 일정 검색',
  filters: {
    all: '전체',
    assigned: '배정됨',
    unassigned: '일정 없음',
    late: '오늘 지각',
    corrected: '수정됨',
  },
  statuses: {
    ...enCA.statuses,
    on_time: '정시',
    late: '지각',
    leave: '휴가',
    rest: '휴무',
    absence: '기록 없음',
    pending: '대기',
    not_scheduled: '일정 없음',
    active: '활성',
    inactive: '비활성',
  },
  labels: {
    ...enCA.labels,
    timeTable: '시간표',
    removeTimeTableDay: '근무 제거',
    removeTimeTableDayTitle: '시간표에서 근무를 제거할까요?',
    removeTimeTableDayDescription: '선택한 날짜의 배정된 근무 또는 계약 근무지만 제거합니다. 체크인 및 체크아웃 기록은 유지됩니다.',
    removeTimeTableDayConfirm: '근무 제거',
    removeTimeTableDaySuccess: '시간표에서 근무가 제거되었습니다. 이후 날짜 배정은 유지됩니다.',
    removingTimeTableDay: '근무 제거 중',
    removingTimeTableDayDescription: '시간표를 업데이트하고 창은 열린 상태로 유지합니다.',
    clearDaySchedule: '해당 날짜 일정 지우기',
    clearDayScheduleTitle: '해당 날짜 일정을 지울까요?',
    clearDayScheduleDescription: '선택한 날짜의 일정 또는 계약 근무지를 지우고 직원을 새 업무에 배정할 수 있게 합니다. 체크인 및 체크아웃 기록은 유지됩니다.',
    clearDayScheduleConfirm: '해당 날짜 일정 지우기',
    clearDayScheduleSuccess: '해당 날짜 일정이 지워졌습니다. 이 날짜에 새 업무를 배정할 수 있습니다.',
    clearingDaySchedule: '해당 날짜 일정 지우는 중',
    clearingDayScheduleDescription: '날짜 배정을 지우고 가능 여부를 새로고침합니다.',
    noScheduleToClear: '이 날짜에 배정된 일정 또는 계약 근무지가 없습니다.',
    cancel: '취소',
  },
  kpi: {
    absences: '결근',
    activeShifts: '활성 근무',
    checkIns: '출근 기록',
    checkOuts: '퇴근 기록',
    late: '지각',
    noRecords: '기록 없음',
    operationRate: '출근 완료',
    reviewBadge: (count: number) => `${count}건 검토 필요`,
    statusLabels: {
      absence: '결근',
      late: '지각',
      noRecord: '기록 없음',
      onTrack: '정시',
      other: '기타',
    },
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return '오늘 운영: 해당 날짜에 직원이 없습니다.';
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount}건 후속 조치가 필요합니다.`
        : '대기 중인 이슈가 없습니다.';

      return `오늘 운영: ${totalCount}명 중 ${checkInsCount}명이 출근했고, ${activeShiftCount}명이 근무 중이며, ${reviewText}`;
    },
  },
} satisfies ControlTranslations;
