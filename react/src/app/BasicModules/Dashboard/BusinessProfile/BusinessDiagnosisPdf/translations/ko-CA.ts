import { enCA } from './en-CA';

export const koCA = {
  ...enCA,
  locale: 'ko-CA',
  fileName: '운영 성숙도 보고서.pdf',
  companyFallback: '현재 사업체',
  questionsLabel: '문항',
  scoreLabel: 'BMI',
  outOf100: '100점 만점',
  levelNames: {
    level1: '초기',
    level2: '도입',
    level3: '정리됨',
    level4: '확장 가능',
    level5: '최적화',
  },
  progressLevels: ['초기', '정리됨', '확장 가능', '최적화'],
  moduleLabels: {
    people: '인사 관리',
    processes: '프로세스 및 업무',
    products: 'CRM / 판매 관리',
    finance: '비용 및 KPI',
  },
  summaryTemplate:
    '회사의 운영 성숙도는 {score}/100입니다. 가장 강한 영역은 {strongest}이며, 먼저 보강할 영역은 {weakest}입니다.',
  overallInterpretations: {
    critical:
      '성장 전에 책임자, 보이는 운영 루틴, 의사결정에 필요한 최소 데이터를 갖춘 기본 통제 구조가 필요합니다.',
    emerging:
      '운영은 움직이고 있지만, 아직 비공식적인 확인과 개인 판단에 많이 의존하고 있습니다.',
    organized:
      '운영 기반은 마련되어 있으나, 가시성, 책임 구조, 반복 가능한 리듬을 더 강화해야 합니다.',
    scalable:
      '성장할 수 있는 기반은 있으나, 약한 운영 영역의 규율을 유지해야 합니다.',
    optimized:
      '운영 성숙도가 높습니다. 과제는 복잡성이 커질 때도 기준을 유지하는 것입니다.',
  },
  pillarInterpretations: {
    critical: '{section}은 성장 지원 전에 즉시 구조화가 필요합니다.',
    emerging: '{section}에는 유용한 방식이 있으나 아직 충분히 일관적이지 않습니다.',
    organized: '{section}은 강화하고 측정할 수 있는 기반 위에서 운영되고 있습니다.',
    scalable: '{section}은 비교적 명확한 루틴으로 성장을 지원할 수 있습니다.',
    optimized: '{section}은 다른 영역의 기준이 될 수 있는 강점입니다.',
  },
  completenessNote: {
    empty: '데이터가 부족합니다. 운영 해석을 생성하려면 진단에 응답해 주세요.',
    template: '총 {total}개 중 {answered}개 응답을 기준으로 한 해석입니다. 진단 신뢰도: {confidence}%.',
  },
  pillarFallbacks: {
    people: {
      risk: '운영 리듬이 개인 조정과 불명확한 책임 구조에 과도하게 의존할 수 있습니다.',
      action: '가장 반복되는 업무에 대해 책임자, 결정 권한, 검토 루틴을 명확히 하십시오.',
    },
    processes: {
      risk: '업무, 막힘, 책임자가 충분히 보이지 않으면 실행 속도가 느려질 수 있습니다.',
      action: '책임자, 기한, 상태, 완료 기준이 보이는 업무 흐름을 만드십시오.',
    },
    products: {
      risk: '상업적 노력이 수익성 기준 없이 여러 상품이나 고객으로 분산될 수 있습니다.',
      action: '성장을 이끌 핵심 상품, 고객군, 마진 신호를 우선순위로 정하십시오.',
    },
    finance: {
      risk: '현금, 비용, 마진, 수익성에 대한 가시성이 부족한 상태에서 결정이 내려질 수 있습니다.',
      action: '성장 결정을 승인하기 전에 가격, 직접비, 마진, 주간 현금 흐름을 연결하십시오.',
    },
  },
  consulting: {
    nextMove: '한 가지만 한다면',
  },
  editorial: {
    action: '실행',
    answered: '응답',
    brand: 'INDICE',
    businessDiagnosis: '사업 진단',
    confidence: '신뢰도',
    date: '날짜',
    decision: '결정',
    evidence: '근거',
    executiveFindings: '핵심 진단',
    executiveFindingsCaption: '다음 경영 논의를 집중시키기 위한 세 가지 운영 결론입니다.',
    expectedResult: '기대 결과',
    focus: '초점',
    footer: 'Business Profile 응답을 기반으로 생성됨',
    generatedFrom: 'Business Profile 응답을 기반으로 생성됨',
    insightLabel: '경영진 요약',
    maturity: '성숙도',
    maturityView: '성숙도 보기',
    maturityViewCaption: '영역별 역량 비교와 전체 성숙도 진행 상황입니다.',
    module: '추천 모듈',
    pillar: '영역',
    pillarBreakdown: '영역별 분석',
    pillarBreakdownCaption: '각 영역의 현재 역량, 리스크, 즉시 실행할 액션입니다.',
    preparedFor: '대상 기업',
    priorityDecisions: '우선 결정 사항',
    priorityDecisionsCaption: '단순한 업무가 아니라 통제력과 확장성을 높이기 위한 경영 결정입니다.',
    problem: '문제',
    reportTitle: '운영 성숙도 보고서',
    risk: '리스크',
    roadmap: '실행 로드맵',
    roadmapCaption: '진단을 보이는 실행으로 전환하기 위한 권장 순서입니다.',
    scoreSummary: '성숙도 요약',
  },
  insightTypeLabels: {
    critical_dependency: '핵심 의존성',
    growth_risk: '성장 리스크',
    highest_roi_area: '가장 높은 운영 ROI',
    main_risk: '주요 리스크',
    operational_bottleneck: '운영 병목',
    quick_win: '빠른 개선',
    single_priority: '단일 우선순위',
  },
  insightFallbacks: {
    critical_dependency: {
      title: '줄여야 할 핵심 의존성',
      message: '운영 모델이 비공식 책임자나 특정 핵심 인물에 너무 많이 의존하고 있습니다.',
      businessImpact: '지속성이 기억, 개인 일정, 개인 판단에 의존하면 성장할수록 운영이 취약해집니다.',
      recommendedAction: '가장 민감한 업무 흐름에 대해 책임자, 백업 담당자, 보이는 운영 루틴을 정하십시오.',
    },
    growth_risk: {
      title: '성장이 현재 마찰을 키울 수 있음',
      message: '통제 루틴이 준비되기 전에 업무량이 먼저 늘어날 수 있습니다.',
      businessImpact: '고객, 인력, 지점이 늘면 변동, 재작업, 조정 비용이 증가할 수 있습니다.',
      recommendedAction: '고객 경험, 팀 실행, 현금 흐름에 가장 큰 영향을 주는 운영 루틴을 표준화하십시오.',
    },
    highest_roi_area: {
      title: '가장 높은 운영 ROI 영역',
      message: '가장 큰 효과는 마찰 증거가 가장 뚜렷한 운영 영역을 개선하는 데 있습니다.',
      businessImpact: '집중된 개선은 여러 과제에 노력을 분산하는 것보다 더 큰 가치를 만듭니다.',
      recommendedAction: '측정 가능한 개선 하나를 선택하고 책임자, 날짜, 검토 리듬을 지정하십시오.',
    },
    main_risk: {
      title: '주요 운영 리스크',
      message: '진단에서 감지된 운영 신호에 대해 더 보이는 통제가 필요합니다.',
      businessImpact: '가시성이 없으면 결정이 늦어지거나 개인 판단에 지나치게 의존할 수 있습니다.',
      recommendedAction: '가장 위험한 신호를 책임자와 주간 추적이 있는 하나의 구체적 결정으로 바꾸십시오.',
    },
    operational_bottleneck: {
      title: '운영 병목',
      message: '업무 조정, 추적, 측정 방식에서 마찰이 보입니다.',
      businessImpact: '팀이 열심히 일해도 업무량이 늘면 실행 속도가 느려질 수 있습니다.',
      recommendedAction: '반복 업무를 책임자, 날짜, 상태, 완료 기준이 보이는 시스템으로 옮기십시오.',
    },
    quick_win: {
      title: '즉시 가능한 빠른 개선',
      message: '가장 빠른 개선은 진행 중인 업무를 더 잘 보이게 만드는 것입니다.',
      businessImpact: '작은 가시성 변화만으로도 수동 확인 시간을 줄이고 책임성을 높일 수 있습니다.',
      recommendedAction: '이번 주에 진행 중인 업무, 막힌 항목, 책임자를 한눈에 보는 화면을 만드십시오.',
    },
    single_priority: {
      title: '단일 우선순위',
      message: '새로운 과제를 늘리기 전에 가장 구체적인 운영 제약을 먼저 해결해야 합니다.',
      businessImpact: '제약을 제거하지 않고 더 많이 하는 것은 진전보다 혼선을 만들 수 있습니다.',
      recommendedAction: '제약 하나, 책임자 하나, 지표 하나, 검토 날짜 하나를 정하십시오.',
    },
  },
  roadmapSteps: [
    { label: '7일', title: '보이는 통제' },
    { label: '30일', title: '운영 우선순위' },
    { label: '60일', title: '성장 준비' },
  ],
  roadmapOutcomes: [
    '책임자와 첫 실행이 정렬되어 모호성이 줄어듭니다.',
    '메모리나 채팅에 의존하지 않는 보이는 운영 리듬이 생깁니다.',
    '수동 감독을 줄이고 확장할 수 있는 통제 기반이 마련됩니다.',
  ],
} as const;
