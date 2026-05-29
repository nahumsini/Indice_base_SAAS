import { enCA } from './en-CA';

export const koCA = {
  ...enCA,
  common: { ...enCA.common, all: '전체', cancel: '취소', close: '닫기', save: '판매 저장', view: '판매 보기' },
  header: {
    emoji: '💼',
    title: '매출',
    subtitle: '수주된 판매, 결제 증빙, 검증 진행, 재고 준비 상태와 커미션을 추적합니다.',
    columnsAction: '열',
    primaryAction: '새 판매',
  },
  filters: {
    ...enCA.filters,
    title: '필터',
    search: '검색',
    businessUnit: '사업 단위',
    business: '사업',
    period: '기간',
    seller: '판매 담당자',
    customer: '고객',
    periodOptions: {
      today: '오늘',
      thisWeek: '이번 주',
      thisMonth: '이번 달',
      lastMonth: '지난 달',
      custom: '사용자 지정 기간',
    },
  },
  kpis: {
    totalSalesAmount: '총 판매 금액',
    totalCommissions: '총 커미션',
    averageTicket: '평균 거래 금액',
    salesCount: '판매 수',
    pendingFinanceValidation: '재무 검증 대기',
    pendingInventoryMovement: '재고 이동 대기',
    deliveredSales: '배송 완료 판매',
  },
  insight: {
    summary: (totalAmount: string, totalCommissions: string, visible: number, total: number) => (
      `판매 요약: 총 판매 ${totalAmount} · 커미션 ${totalCommissions} · 판매 ${visible}건 · ${total}건 중 ${visible}건 표시.`
    ),
  },
  statuses: {
    ...enCA.statuses,
    paymentEvidence: {
      missing: '없음',
      uploaded: '업로드됨',
      under_review: '검토 중',
      approved: '승인됨',
      rejected: '거절됨',
    },
  },
  guidance: {
    ...enCA.guidance,
    title: '운영 가이드',
  },
} as const;
