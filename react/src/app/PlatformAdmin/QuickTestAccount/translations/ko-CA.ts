import type { QuickTestAccountCopy } from "./types";

export const koCAQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "빠른 설정",
    title: "테스트 계정 만들기",
    description: "필수 정보를 입력하고 생성 전에 접근 권한을 확인하세요.",
  },
  steps: { scenario: "시나리오", details: "세부 정보" },
  progress: {
    label: "테스트 계정 진행 상황",
    step: (current) => `${new Intl.NumberFormat("ko-CA").format(current)}/2단계 · 데모 설정`,
  },
  actions: {
    cancel: "취소",
    previous: "이전",
    next: "계속",
    review: "접근 권한 확인",
  },
  scenario: {
    title: "무엇을 테스트하시겠습니까?",
    description: "Indice가 권장 모듈, 정원 및 체험 기간을 준비합니다.",
    modules: (count) => `모듈: ${new Intl.NumberFormat("ko-CA").format(count)}`,
    employees: (count) => `직원: ${new Intl.NumberFormat("ko-CA").format(count)}`,
    days: (count) => `기간: ${new Intl.NumberFormat("ko-CA").format(count)}일`,
    options: {
      people: {
        label: "인력 및 프로세스",
        description: "내부 업무를 위한 인사, 작업 및 KPI입니다.",
      },
      commerce: {
        label: "영업 및 재고",
        description: "거래 흐름, 재고, 비용 및 미수금입니다.",
      },
      complete: {
        label: "전체 업무",
        description: "전체 테스트를 위한 모든 기본 모듈입니다.",
      },
    },
  },
  details: {
    title: "테스트 계정 식별",
    description: "생성된 정보를 유지하거나 바꾸세요.",
    companyName: "회사명",
    ownerName: "소유자 이름",
    ownerEmail: "로그인 이메일",
    country: "국가",
    employees: "Indice 사용자 수",
    trial: "체험 기간",
    summary: "자동 설정",
    scenario: "시나리오",
    access: "초기 접근",
    capacity: "정원",
    notice: "다음 단계에서 계정을 만들기 전에 모듈, 사용자 및 체험 기간을 확인할 수 있습니다.",
    companyPrefix: "Indice 데모",
    defaultOwnerName: "테스트 사용자",
  },
  errors: {
    duplicateEmail: "이 이메일은 이미 다른 계정에 속합니다. 다른 이메일을 사용하세요.",
    noModules: "이 시나리오에서 사용할 수 있는 기본 모듈이 없습니다.",
  },
};
