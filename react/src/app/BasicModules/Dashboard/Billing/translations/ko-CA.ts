import type { BillingTranslations } from './types';

export const koCA = {
  billingDayLabel: (day: number) => `매월 ${day}일`,
  recovery: {
    loadError: '구독 정보를 확인할 수 없습니다.',
    portalError: '결제 포털을 열 수 없습니다.',
    loading: '현재 상업 상태를 확인하는 중...',
    title: '상업 상태',
    syncing: '동기화 중',
    enabled: '계정 운영이 활성화되었습니다.',
    actionRequired: '전체 운영을 복구하려면 결제 정보를 정리하세요.',
    manage: 'Stripe에서 관리',
  },
  storage: {
    title: '계정 저장 공간',
    summary: (purchased: number, benefit: number) =>
      `5GB 포함 · ${purchased}개 구매 · ${benefit}개 무료 제공`,
    usageLabel: '저장 공간 사용량',
    note: '저장된 파일과 예약된 업로드를 포함합니다. 상업 가격이 승인되면 저장 공간 블록을 구매할 수 있습니다.',
  },
} as const satisfies BillingTranslations;
