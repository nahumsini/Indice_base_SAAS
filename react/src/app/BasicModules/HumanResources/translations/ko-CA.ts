import type { HumanResourcesTranslations } from './types';

export const koCA = {
  title: '인사 관리',
  subtitle: '직원, 출석, 급여, 팀 운영을 관리합니다.',
  back: '뒤로',
  loading: {
    title: 'HR 탭 로딩 중',
    description: '선택한 인사 관리 작업 공간만 다운로드합니다.',
  },
  access: {
    loadingTitle: 'HR 접근 권한 확인 중',
    loadingDescription: '사용 가능한 작업 공간을 확인하고 있습니다.',
    empty: '이 사용자에게 표시할 인사 관리 탭이 없습니다.',
  },
  tabError: {
    eyebrow: '탭을 사용할 수 없음',
    title: '이 인사 관리 탭을 불러오지 못했습니다',
    description: '앱에서 이 작업 공간을 다운로드하지 못했습니다. 탭을 새로고침하여 모듈을 다시 요청하세요.',
    reload: '탭 새로고침',
  },
  tabs: {
    collaborators: '직원',
    attendance: '출석',
    control: '근태 관리',
    payroll: '급여',
    announcements: '공지',
    assets: '자산',
    records: '기록',
    permissions: '권한',
    incentives: '인센티브',
    kpis: '성과 지표',
  },
} satisfies HumanResourcesTranslations;
