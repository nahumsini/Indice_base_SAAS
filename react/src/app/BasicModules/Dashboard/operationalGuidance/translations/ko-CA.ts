export const koCA = {
  eyebrow: '학습 모드',
  title: '회사 설정 가이드',
  subtitle: 'Índice의 다른 영역이 같은 운영 기준을 따르도록 기본 운영 구조를 설정하세요.',
  controlLabel: '회사 통제',
  functionsLabel: '탭 기능',
  guideProgressLabel: '가이드 진행률',
  guideProgressCompleteLabel: '확인됨',
  previousStepLabel: '이전 추천',
  nextStepLabel: '다음 추천',
  stepIndicatorLabel: '추천 보기',
  tabs: {
    profile: {
      label: '프로필',
      ctaLabel: '프로필 검토',
      title: '비즈니스 정체성을 명확하게 유지하세요',
      summary: '개인 및 운영 프로필을 완성해 신뢰할 수 있는 연락처와 식별 정보에서 업무 공간을 시작하세요.',
      value: '명확한 프로필은 책임, 알림, 운영 의사결정을 공유할 때 혼선을 줄여 줍니다.',
      steps: [
        {
          title: '개인 정보와 기본 설정',
          description: '이름, 전화번호, 언어, 사진, 기본 설정을 관리해 담당자를 쉽게 식별하세요.',
        },
        {
          title: '계정 보안',
          description: '자격 증명과 접근 정보를 업데이트해 신뢰할 수 있는 업무 공간을 유지하세요.',
        },
      ],
    },
    'business-structure': {
      label: '회사 구조',
      ctaLabel: '구조 설정',
      title: '실제 운영 방식을 지도화하세요',
      summary: '모든 모듈이 같은 운영 지도를 읽도록 단위, 사업, 위치, 본사를 정의하세요.',
      value: '구조가 명확하면 출퇴근, 비용, 사용자, KPI가 올바른 운영 영역에 연결됩니다.',
      steps: [
        {
          title: '단위, 사업, 본사',
          description: '운영 영역을 정리하고 Hedwig Edher를 구조의 주요 기준으로 유지하세요.',
        },
        {
          title: '운영 위치',
          description: '출퇴근, 키오스크, 보고서가 올바른 위치를 사용하도록 주소와 좌표를 정의하세요.',
        },
      ],
    },
    'business-profile': {
      label: '비즈니스 성숙도',
      ctaLabel: '성숙도 검토',
      title: '운영 성숙도를 진단하세요',
      summary: '비즈니스 프로필로 회사의 강점과 운영 집중이 필요한 영역을 파악하세요.',
      value: '평가는 더 많은 도구, 인력, 프로세스를 추가하기 전에 더 나은 우선순위를 제안하는 데 도움을 줍니다.',
      steps: [
        {
          title: '영역별 진단',
          description: '사람, 프로세스, 제품, 재무를 평가해 회사의 실제 성숙도를 이해하세요.',
        },
        {
          title: '성숙도 보고서',
          description: '신호, 위험, 추천을 검토해 다음 운영 개선 우선순위를 정하세요.',
        },
      ],
    },
    consulting: {
      label: '컨설팅',
      ctaLabel: '상담 예약',
      title: '과제를 집중된 대화로 전환하세요',
      summary: 'Indice 팀과 50분 상담을 요청하고 미팅 전에 상황을 공유하세요.',
      value: '명확한 요청은 시간을 확정하고 필요한 결정을 중심으로 상담을 준비하는 데 도움이 됩니다.',
      steps: [
        { title: '시간 선택', description: '업무 시간 내 선호 시간과 대체 시간을 제안하세요.' },
        { title: '상황 공유', description: '주제를 선택하고 해결할 과제나 결정을 설명하세요.' },
      ],
    },
    'personal-performance': {
      label: '개인 성과',
      ctaLabel: '성과 평가',
      title: '실행 습관을 강화하세요',
      summary: '후속 조치, 규율, 의사결정 품질에 영향을 주는 개인 운영 습관을 검토하세요.',
      value: '더 나은 리더십 습관은 루틴을 유지하고 공백을 줄이며 업무를 가시화합니다.',
      steps: [
        {
          title: '습관 평가',
          description: '리더십, 규율, 커뮤니케이션, 후속 조치를 검토해 실행 스타일을 이해하세요.',
        },
        {
          title: '성과 해석',
          description: '개인 결과를 의사결정, 집중, 일상 통제를 개선하는 신호로 전환하세요.',
        },
      ],
    },
    users: {
      label: '사용자',
      ctaLabel: '사용자 관리',
      title: '확장하기 전에 접근을 통제하세요',
      summary: '사용자를 초대하고 모듈을 할당하며 각 사람의 책임에 맞게 권한을 유지하세요.',
      value: '좋은 접근 제어는 정보를 보호하고 각 협업자가 필요한 도구에 집중하도록 돕습니다.',
      steps: [
        {
          title: '초대와 역할',
          description: '사용자를 추가하고 역할을 정의하며 각 사람을 운영 책임에 연결하세요.',
        },
        {
          title: '모듈 권한',
          description: '각 사용자가 접근할 도구를 선택해 작업을 통제 가능하고 추적 가능하게 유지하세요.',
        },
      ],
    },
  },
} as const;
