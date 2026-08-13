import type { DistributorPortalCopy } from './types';

export const koCA: DistributorPortalCopy = {
  navigation: { portalName: '유통사 포털', local: '로컬', backToErp: 'ERP로 돌아가기' },
  tabs: { contractsAccess: '계약 및 액세스', consulting: '컨설팅' },
  header: { eyebrow: '유통 운영', title: '계약 및 액세스', subtitle: '첫 액세스부터 활성 계약까지 연결된 잠재 고객을 추적하세요.' },
  actions: { refresh: '새로고침', refreshing: '새로고침 중…', view: '고객 보기', manage: '관리', addClient: '고객 추가', extendTrial: '체험 연장', close: '닫기' },
  metrics: { totalClients: '포트폴리오 고객', prospects: '잠재 고객', demosTrials: '데모 및 체험', activeContracts: '활성 계약', attention: '확인 필요' },
  filters: { title: '영업 포트폴리오', subtitle: '회사명, 소유자 이메일 또는 계정 번호로 찾으세요.', matches: '개 고객 일치', search: '검색', searchPlaceholder: '회사, 이메일 또는 계정 번호', stage: '영업 단계', allStages: '모든 단계' },
  table: { title: '잠재 고객 및 고객', subtitle: '유통사에 공식 연결된 계정만 표시됩니다.', company: '회사', stage: '단계', access: '액세스 및 모듈', contract: '계약', users: '사용자', nextEvent: '다음 일정', action: '작업', noResults: '필터와 일치하는 고객이 없습니다.', noClients: '연결된 포트폴리오가 아직 비어 있습니다.', noPlan: '계약 없음', noModules: '활성 모듈 없음', noDate: '예정된 날짜 없음', daysRemaining: '일 남음', members: '활성', seats: '정원', review: '결제 검토' },
  detail: { eyebrow: '포트폴리오 고객', subtitle: '읽기 전용 영업 및 액세스 요약입니다.', contact: '소유자 연락처', country: '국가', stage: '영업 단계', access: '액세스 상태', contract: '계약', billing: '결제 상태', modules: '활성 모듈', capacity: '사용자 정원', nextEvent: '다음 일정', directPortfolio: '이 계정은 귀사의 유통사에 직접 연결되어 있습니다.' },
  states: { PROSPECT: '잠재 고객', DEMO: '데모', TRIAL: '체험', ACTIVE: '활성', ATTENTION: '확인 필요', INACTIVE: '비활성' },
  errors: { title: '포트폴리오를 불러올 수 없습니다', retry: '다시 시도', forbidden: '이 회사는 유통사 포털에 액세스할 수 없습니다.' },
};
