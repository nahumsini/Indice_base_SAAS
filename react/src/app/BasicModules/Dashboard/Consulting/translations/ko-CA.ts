import type { ConsultingTranslations } from './types';

export const koCA: ConsultingTranslations = {
  title: '컨설팅', subtitle: 'Indice 팀과의 상담을 예약하고 진행 상황을 확인하세요.',
  loading: '컨설팅 일정을 준비하는 중…', errorDescription: '상담 일정과 가능한 시간을 불러오려면 다시 시도하세요.', requestError: '요청을 보내지 못했습니다. 입력한 내용은 화면에 그대로 있으니 다시 시도하세요.', retry: '다시 시도',
  benefitIncluded: '매월 온라인 상담 1회가 포함되며 이월되지 않습니다', benefitAdditional: '추가 상담', duration: '60분', pendingNotice: '편한 날짜와 시간을 선택하세요. Indice 컨설턴트가 필요한 지원을 확인하고 상담을 확정하기 위해 연락드립니다.',
  brandPromiseTitle: '회사가 성장하는 동안 언제나 함께합니다', brandPromiseDescription: 'Indice는 회사 성장의 모든 단계에서 함께합니다. 도움이 필요할 때 사업 상황을 같이 분석하고, 의사결정을 지원하며, Indice를 가장 효율적으로 도입하도록 돕겠습니다.', consultantChangeNote: '편안하고 신뢰할 수 있는 상담을 원합니다. 필요하면 다음 상담을 위해 다른 컨설턴트를 요청할 수 있습니다.',
  scheduleTitle: '상담 요청', scheduleDescription: '먼저 가능한 시간을 알려 주세요. 그다음 가장 적합한 지원 방법을 함께 정합니다.', stepSession: '3 · 방식', stepTime: '1 · 날짜 및 시간', stepConsultant: '2 · 컨설턴트', stepContext: '4 · 주제 및 연락처', includedBadge: '계정에 포함됨', additionalBadge: '별도 결제 필요',
  preferredDate: '희망 날짜', preferredTime: '희망 시간', alternativeTitle: '두 번째 시간', addAlternative: '대체 시간 추가', removeAlternative: '대체 시간 삭제', timezone: '시간대',
  consultantPreference: '누구와 상담하시겠어요?', consultantPreferenceDescription: '선호 사항을 바탕으로 배정하며 Indice 팀이 가능 여부를 확인합니다. 필요하면 변경을 요청할 수 있습니다.', distributorPreferenceTitle: '내 유통 파트너', distributorPreferenceDescription: '담당 유통 파트너 또는 해당 팀의 컨설턴트를 요청합니다.', indiceTeamPreferenceTitle: '다른 Indice 컨설턴트', indiceTeamPreferenceDescription: '주제와 일정에 따라 Indice가 다른 컨설턴트를 선택합니다.', requestedWith: '요청한 선호 사항',
  consultationMode: '어떤 방식으로 상담하시겠어요?', virtualMode: '온라인', virtualDescription: '어느 국가에서든 접속할 수 있습니다. 확정 시간 직전에 링크가 표시됩니다.', inPersonMode: '대면', inPersonDescription: '현재 멕시코와 캐나다의 일부 도시에서 이용할 수 있습니다.', inPersonCost: '대면 상담에는 추가 비용이 발생합니다. 확정 전에 견적을 보내 드립니다.', inPersonQuoteBadge: '대면 상담 견적 대기 중',
  country: '대면 상담 국가', city: '도시', cityPlaceholder: '도시 선택', otherCity: '해당 도시 없음', unsupportedCountry: '이 국가에는 아직 대면 컨설턴트가 없습니다.', useVirtualInstead: '온라인 컨설팅을 선택하면 어디서든 지원받을 수 있습니다.',
  topic: '어떤 내용을 상담하고 싶으세요?', topics: { ONBOARDING: 'Indice 초기 도입', BUSINESS_CONSULTING: '비즈니스 컨설팅', OPERATIONS: '프로세스 및 운영', PEOPLE: '인사 및 조직', SALES: '영업 및 상품 제안', FINANCE: '재무 및 지표', OTHER: '기타 비즈니스 과제' },
  notes: '상황 설명', notesPlaceholder: '현재 과제, 결정해야 할 사항 또는 원하는 결과를 간단히 설명하세요.', attendeeName: '참석자 이름', attendeeEmail: '연락 이메일', attendeePhone: '연락처', submit: '요청 보내기', submitting: '요청 전송 중…', confirmationNote: '요청은 확인 대기 상태로 저장됩니다. 컨설턴트가 상담 조율을 위해 연락드립니다.',
  upcomingTitle: '다음 컨설팅', requested: '확인 대기', confirmed: '확정됨', paymentRequired: '결제 또는 견적 대기', cancelled: '취소됨', completed: '완료됨', preferredLabel: '희망 시간', alternativeLabel: '대체 시간', meetingLink: '컨설팅 입장', meetingPending: '상담 15분 전부터 링크를 사용할 수 있습니다.', meetingAvailableAt: '접속 가능 시간', consultantLabel: '담당 컨설턴트',
  requestFlow: '요청 진행 상황', flowRequested: '요청 전송됨', flowConfirmed: '상담 확정됨', flowSession: '컨설팅', cancelAction: '요청 취소', cancelling: '취소 중…', historyTitle: '컨설팅 기록', historyEmpty: '아직 상담을 요청하지 않았습니다.', successTitle: '요청 전송됨', successDescription: '요청이 확인 대기 상태입니다. 컨설턴트가 상담 조율을 위해 연락드립니다.',
  requiredMessage: '계속하기 전에 필수 항목을 입력하세요.', preferenceRequiredMessage: '유통 파트너 또는 다른 Indice 컨설턴트를 선택하세요.', invalidDateMessage: '최소 24시간 이후의 업무 시간대를 선택하세요.', locationRequiredMessage: '대면 서비스가 제공되는 도시를 선택하거나 온라인 상담으로 변경하세요.', notificationWarning: '요청은 저장되었지만 이메일 알림을 보내지 못했습니다. Root에서 팀이 요청을 확인할 수 있습니다.',
  countries: { MX: '🇲🇽 멕시코', CA: '🇨🇦 캐나다', US: '🇺🇸 미국', BR: '🇧🇷 브라질', CO: '🇨🇴 콜롬비아' },
};
