import type { BusinessProfileTranslations } from "./types";

export const koCA = {
  title: "비즈니스 진단",
  description:
    "귀사와 관리 단계를 더 잘 이해하여 Indice를 개인화할 수 있도록 도와주세요.",
  centerTitle: "비즈니스 진단 센터",
  centerDescription:
    "사람, 프로세스, 제품 및 재무의 4가지 기둥을 통해 귀사의 관리 상태를 발견하십시오. 귀하의 답변을 통해 비즈니스 성숙도 지수(BMI)를 사용하여 Indice 뒤에 있는 권장 사항, 모듈 및 최고의 파트너를 개인화하는 데 도움이 됩니다.",
  questionCount: "각 10개 질문",
  questionCountLabel: "진단에는",
  progress: "비즈니스 진단 진행",
  progressOf: "완료",
  onboarding: {
    answeredProgress: "{total}개 질문 중 {answered}개에 답했습니다",
    encouragementMid: "아주 잘 진행하고 있습니다",
    encouragementNear: "거의 완료되었습니다",
    sections: {
      people: {
        title: "1단계 — 팀",
        intro: "팀이 어떻게 일하는지 이해해 보겠습니다",
        done: "완료 — 팀을 이해했습니다",
      },
      processes: {
        title: "2단계 — 운영 방식",
        intro: "일상 운영이 어떻게 이루어지는지 이해해 보겠습니다",
        done: "완료 — 운영 방식을 이해했습니다",
      },
      products: {
        title: "3단계 — 판매하는 것",
        intro: "제공하는 상품과 시장 전달 방식을 이해해 보겠습니다",
        done: "완료 — 판매하는 것을 이해했습니다",
      },
      finance: {
        title: "4단계 — 재무",
        intro: "숫자를 어떻게 관리하는지 이해해 보겠습니다",
        done: "완료 — 재무를 이해했습니다",
      },
    },
  },
  printDiagnosis: "PDF 다운로드",
  start: "시작",
  continue: "계속",
  doAgain: "다시 하기",
  reviewAnswers: "답변 검토",
  close: "닫기",
  question: "질문",
  of: "의",
  completed: "완료됨",
  previous: "이전",
  next: "다음",
  finish: "완료",
  restart: "진단 재시작",
  restartDialog: {
    cancel: "취소",
    confirm: "테스트 다시 시작",
    description: "이전 결과를 보존하고 새 버전을 시작합니다.",
    title: "진단을 다시 시작할까요?",
  },
  result: {
    title: '회사 진단 결과',
    subtitle: '무엇을 먼저 개선할지 결정하기 위한 실용적인 분석입니다.',
    maturity: '성숙도',
    confidence: '신뢰도',
    priority: '우선순위',
    quickWin: '빠른 개선',
    mainRisk: '주요 위험',
    recommendedPlan: '권장 계획',
  },
  actions: {
    save: "저장",
    saving: "저장 중...",
    discard: "취소",
  },
  scoreSummary: {
    title: "진단 점수",
    bmi: "BMI",
    level: "레벨",
    answered: "응답 수",
    score: "점수",
  },
  messages: {
    loading: "비즈니스 진단을 불러오는 중입니다...",
    loadError: "비즈니스 진단을 불러오지 못했습니다.",
    saveSuccess: "비즈니스 진단이 저장되었습니다.",
    saveError: "비즈니스 진단을 저장하지 못했습니다.",
    unsavedChanges: "비즈니스 진단에 저장되지 않은 변경 사항이 있습니다.",
  },
  pillars: {
    people: {
      title: "사람",
      description: "인재, 팀 구조 및 커뮤니케이션을 분석합니다.",
    },
    processes: {
      title: "프로세스",
      description: "흐름, 작업, 확장성 및 효율성을 평가합니다.",
    },
    products: {
      title: "제품",
      description: "제공, 시장, 판매 및 가치 제안을 분석합니다.",
    },
    finance: {
      title: "재무",
      description: "재무 통제, 관리 및 의사 결정을 평가합니다.",
    },
  },
  questions: {
    people: [
      {
        question: "주요 역할은 무엇입니까?",
        options: ["창립자/CEO", "운영", "재무", "영업/기타"],
      },
      {
        question: "몇 명이 일하나요?",
        options: ["나만", "2~5명", "6~20명", "21명 이상"],
      },
      {
        question: "팀은 어떻게 구성되어 있습니까?",
        options: ["구조 없음", "기본 역할", "정의된 영역", "공식 조직도"],
      },
      {
        question: "작업을 어떻게 할당합니까?",
        options: ["즉흥적", "목록", "구조화된 할당", "관리 시스템"],
      },
      {
        question: "성과 검토?",
        options: ["없음", "문제 발생 시", "주간", "KPI 사용"],
      },
      {
        question: "위임?",
        options: ["모두 직접", "위임하고 감독", "통제하며 위임", "자율 팀"],
      },
      {
        question: "내부 커뮤니케이션?",
        options: ["비공식", "채팅", "회의", "공식 도구"],
      },
      { question: "회의 빈도?", options: ["없음", "산발적", "주간", "빈번"] },
      {
        question: "책임의 명확성?",
        options: ["불명확", "다소 명확", "상당히 명확", "완전히 명확"],
      },
      {
        question: "통합의 용이성?",
        options: ["매우 어려움", "어려움", "보통", "쉬움"],
      },
    ],
    processes: [
      {
        question: "문서화된 프로세스?",
        options: ["없음", "일부", "대부분", "완전히"],
      },
      {
        question: "작업 관리?",
        options: ["즉흥적", "목록", "도구", "공식 시스템"],
      },
      {
        question: "진행 모니터링?",
        options: ["모니터링 안 됨", "가끔", "보고서", "KPI"],
      },
      {
        question: "자동화?",
        options: ["수동", "고립된 도구", "부분 자동화", "높은 자동화"],
      },
      {
        question: "복제 가능성?",
        options: ["매우 어려움", "노력 필요", "가능", "쉬움"],
      },
      {
        question: "시간이 낭비되는 곳?",
        options: ["수작업", "조정", "정보", "후속 조치"],
      },
      {
        question: "사람에 대한 의존도?",
        options: ["전적으로", "상당히", "다소", "적게"],
      },
      {
        question: "프로세스 명확성?",
        options: ["불명확", "다소 명확", "상당히 명확", "완전히 명확"],
      },
      {
        question: "오류 관리?",
        options: ["반응", "비공식", "검토", "지속적 개선"],
      },
      { question: "확장성?", options: ["없음", "낮음", "중간", "높음"] },
    ],
    products: [
      {
        question: "무엇을 판매합니까?",
        options: ["서비스", "제품", "디지털", "혼합"],
      },
      { question: "고객 유형?", options: ["B2C", "B2B", "정부", "혼합"] },
      {
        question: "주요 수익?",
        options: ["직접 판매", "서비스", "구독", "계약"],
      },
      { question: "다각화?", options: ["하나", "일부", "여러 라인", "광범위"] },
      { question: "가격 정의?", options: ["직관", "경쟁", "비용", "전략"] },
      {
        question: "성과 추적?",
        options: ["측정 안 됨", "판매만", "판매+수익성", "지표"],
      },
      {
        question: "가치 제안?",
        options: ["불명확", "다소 명확", "상당히 명확", "매우 명확"],
      },
      {
        question: "고객 피드백?",
        options: ["없음", "비공식", "설문조사", "분석"],
      },
      {
        question: "제품 진화?",
        options: ["즉석", "가끔 변경", "계획", "로드맵"],
      },
      {
        question: "상업적 우선순위?",
        options: ["고객", "현재 판매", "수익성", "확장"],
      },
    ],
    finance: [
      {
        question: "재무 통제?",
        options: ["비구조화", "Excel", "소프트웨어", "통합 시스템"],
      },
      { question: "숫자 검토?", options: ["없음", "월간", "주간", "매일"] },
      {
        question: "현금 흐름?",
        options: ["통제 안 됨", "반응", "검토", "예측"],
      },
      {
        question: "명확한 비용?",
        options: ["불명확", "대략", "상당히 명확", "완전한 통제"],
      },
      { question: "마진?", options: ["모름", "추정", "명확", "완전히 측정"] },
      { question: "재무 결정?", options: ["직관", "경험", "데이터", "모델"] },
      {
        question: "예측 가능한 수입?",
        options: ["매우 가변적", "가변적", "안정적", "매우 안정적"],
      },
      {
        question: "부채 관리?",
        options: ["통제 없음", "기본", "전략", "최적화"],
      },
      { question: "위기 대비?", options: ["없음", "낮음", "중간", "높음"] },
      {
        question: "세금 준수?",
        options: ["통제 없음", "지연", "최신", "세금 전략"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
