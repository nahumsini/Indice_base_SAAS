export const koCA = {
  eyebrow: '학습 모드',
  title: '인사 운영 가이드',
  subtitle: '인사 모듈에서 직원, 출근, 급여, 책임을 같은 운영 기준으로 정리하세요.',
  controlLabel: '인력 통제',
  functionsLabel: '탭 기능',
  guideProgressLabel: '가이드 진행률',
  guideProgressCompleteLabel: '확인됨',
  previousStepLabel: '이전 추천',
  nextStepLabel: '다음 추천',
  stepIndicatorLabel: '추천 보기',
  tabs: {
    collaborators: {
      label: '직원',
      ctaLabel: '직원 검토',
      title: '인력 기준 데이터를 중앙화하세요',
      summary: '직원 기록, 역할, 단위, 고용 맥락을 하나의 운영 기준으로 정리하세요.',
      value: '신뢰할 수 있는 인력 데이터는 책임, 급여, 출근 관리, 팀 가시성을 개선합니다.',
      steps: [
        {
          title: '직원 프로필 완성',
          description: '개인 정보, 연락처, 직무, 문서를 일관되게 관리해 수동 확인을 줄이세요.',
        },
        {
          title: '단위와 부서로 구분',
          description: '직원을 실제 운영 영역에 연결해 필터, 보고서, 책임이 의미 있게 유지되도록 하세요.',
        },
        {
          title: '상태 정리',
          description: '활성 및 비활성 직원을 정기적으로 확인해 급여, 접근, 보고의 혼선을 줄이세요.',
        },
      ],
    },
    attendance: {
      label: '출근',
      ctaLabel: '출근 검토',
      title: '일일 근무 현황을 보이게 하세요',
      summary: '출근, 퇴근, 교대, 증빙을 추적해 일상 운영이 기억에 의존하지 않도록 하세요.',
      value: '출근 가시성은 결근, 지각, 공백, 운영 위험을 더 빨리 발견하게 해줍니다.',
      steps: [
        {
          title: '일일 신호 확인',
          description: '누가 근무 중인지, 누가 빠졌는지, 어디에 후속 조치가 필요한지 확인하세요.',
        },
        {
          title: '위치와 출근 연결',
          description: '위치와 키오스크를 사용해 수동 검증을 줄이고 실제 근무지와 출근을 맞추세요.',
        },
        {
          title: '예외 빠르게 처리',
          description: '누락된 기록이 급여나 성과 대화에 영향을 주기 전에 정리하세요.',
        },
      ],
    },
    control: {
      label: '통제',
      ctaLabel: '통제 센터 열기',
      title: '일정과 접근을 체계적으로 운영하세요',
      summary: '일정, 키오스크, 출근 설정, 운영 루틴을 관리하세요.',
      value: '명확한 통제 계층은 즉흥적인 운영을 줄이고 감독자가 일일 실행을 유지하도록 돕습니다.',
      steps: [
        {
          title: '일정 명확화',
          description: '교대와 운영 시간을 최신 상태로 유지해 출근과 예외를 올바르게 해석하세요.',
        },
        {
          title: '현장 키오스크 사용',
          description: '실제 운영 위치 가까이에 접근 지점을 두어 출근 등록 마찰을 줄이세요.',
        },
        {
          title: '직원 접근 검토',
          description: 'PIN, 얼굴 등록, 접근 설정을 각 직원의 현재 역할과 맞추세요.',
        },
      ],
    },
    payroll: {
      label: '급여',
      ctaLabel: '급여 검토',
      title: '더 깨끗한 입력으로 급여를 준비하세요',
      summary: '급여 결정 전에 급여, 변동 지급, 공제, 운영 맥락을 정리하세요.',
      value: '깨끗한 급여 입력은 재작업을 줄이고 신뢰와 인건비 이해도를 높입니다.',
      steps: [
        {
          title: '설정 검증',
          description: '계산 전에 급여, 관할 지역, 은행, 고용 데이터를 확인하세요.',
        },
        {
          title: '변동 지급 통제',
          description: '보너스, 수수료, 조정을 맥락과 함께 기록해 변경 사항을 추적 가능하게 유지하세요.',
        },
        {
          title: '마감 전 검토',
          description: '요약을 사용해 지급이나 회계 문제가 되기 전에 불일치를 찾으세요.',
        },
      ],
    },
    announcements: {
      label: '공지',
      ctaLabel: '공지 검토',
      title: '운영 결정을 명확히 전달하세요',
      summary: '정책, 알림, 변경 사항, 중요한 회사 소식을 팀에 전달하세요.',
      value: '구조화된 커뮤니케이션은 불확실성을 줄이고 같은 정보로 움직이게 합니다.',
      steps: [
        {
          title: '실행 가능한 메시지 작성',
          description: '무엇이 바뀌었는지, 누구에게 영향을 주는지, 어떤 행동이 필요한지 설명하세요.',
        },
        {
          title: '대상 구분',
          description: '관련 그룹에만 정보를 보내 운영 소음을 줄이세요.',
        },
      ],
    },
    assets: {
      label: '자산',
      ctaLabel: '자산 검토',
      title: '배정된 업무 자산을 통제하세요',
      summary: '장비, 도구, 리소스를 책임자와 연결해 회사 자산을 추적하세요.',
      value: '자산 가시성은 손실을 줄이고 책임을 높이며 각 직원의 보유 자산을 명확히 합니다.',
      steps: [
        {
          title: '책임 있게 배정',
          description: '각 자산을 직원, 상태, 운영 맥락에 연결하세요.',
        },
        {
          title: '상태와 반납 검토',
          description: '상태를 사용해 교체, 회수, 인수인계를 계획하세요.',
        },
      ],
    },
    records: {
      label: '기록',
      ctaLabel: '기록 검토',
      title: '중요한 인사 이벤트를 문서화하세요',
      summary: '합의, 사건, 확인서, 공식 인사 이벤트를 정리하세요.',
      value: '좋은 기록은 회사를 보호하고 공정한 결정을 지원하며 맥락을 보존합니다.',
      steps: [
        {
          title: '상황 기록',
          description: '무엇이 있었는지, 누가 참여했는지, 어떤 후속 조치가 필요한지 문서화하세요.',
        },
        {
          title: '증빙 추적 유지',
          description: '지원 파일을 첨부하고 이후 검토를 위해 깨끗한 이력을 유지하세요.',
        },
      ],
    },
    permissions: {
      label: '허가',
      ctaLabel: '허가 검토',
      title: '휴무와 부재를 통제하세요',
      summary: '휴가, 결근, 승인, 맥락을 운영 가시성을 잃지 않고 정리하세요.',
      value: '통제된 흐름은 관리자가 인력 커버를 계획하고 일일 운영의 변수를 줄이게 합니다.',
      steps: [
        {
          title: '운영 영향 검토',
          description: '각 요청을 커버리지, 긴급도, 팀 역량 기준으로 검토하세요.',
        },
        {
          title: '승인 추적 유지',
          description: '명확한 상태와 코멘트로 이후에도 결정을 이해할 수 있게 하세요.',
        },
      ],
    },
    incentives: {
      label: '인센티브',
      ctaLabel: '인센티브 검토',
      title: '보상을 운영 행동과 연결하세요',
      summary: '팀 실행을 개선하는 습관, 결과, 책임을 강화하세요.',
      value: '명확한 인센티브는 동기를 사업 우선순위와 연결합니다.',
      steps: [
        {
          title: '보상 행동 정의',
          description: '각 인센티브를 금액이 아닌 명확한 운영 목표와 연결하세요.',
        },
        {
          title: '공정성과 일관성 검토',
          description: '팀이 프로그램을 신뢰하도록 기준을 이해하기 쉽게 유지하세요.',
        },
      ],
    },
    kpis: {
      label: 'KPI',
      ctaLabel: 'HR KPI 검토',
      title: '인사 운영을 실시간으로 측정하세요',
      summary: '인원, 활동, 출근, 급여, 인력 운영 신호를 읽으세요.',
      value: '인력 지표는 문제를 조기에 발견하고 어디에 관리 집중이 필요한지 알려줍니다.',
      steps: [
        {
          title: '인력 신호 읽기',
          description: '활성 직원, 출근 품질, 허가, 급여 영향을 관찰하세요.',
        },
        {
          title: '지표를 행동으로 전환',
          description: 'KPI 변화를 사용해 감독자, 재무, 리더와의 후속 조치를 우선순위화하세요.',
        },
      ],
    },
  },
} as const;
