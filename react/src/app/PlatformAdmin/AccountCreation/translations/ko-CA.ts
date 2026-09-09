import type { AccountCreationCopy } from "./types";

export const koCACopy: AccountCreationCopy = {
  steps: { company: "회사", owner: "소유자", access: "접근 권한" },
  modal: {
    eyebrow: "Root 직접 설정", title: "Indice 계정 만들기",
    description: "3단계로 회사, 소유자 및 접근 권한을 설정하세요.",
    successTitle: "전달할 준비가 된 계정",
    successDescription: "인증 정보를 복사하여 안전한 채널로 공유하세요.",
  },
  actions: {
    cancel: "취소", previous: "뒤로", next: "다음", validating: "확인 중",
    create: "만들고 활성화", creating: "계정 만드는 중…", signInAgain: "다시 로그인",
    finish: "완료", manageAccount: "계정 관리", generate: "생성",
    showPassword: "비밀번호 표시", hidePassword: "비밀번호 숨기기",
  },
  progress: {
    label: "계정 생성 진행 상황",
    step: (current, total, modules) => `${new Intl.NumberFormat("ko-CA").format(current)}/${new Intl.NumberFormat("ko-CA").format(total)}단계 · 모듈: ${new Intl.NumberFormat("ko-CA").format(modules)}`,
    ready: (companyId) => `회사 #${companyId} · 접근 정보 전달 준비 완료`,
  },
  company: {
    title: "회사", description: "새 계정의 회사 정보입니다.",
    name: "회사명", namePlaceholder: "예: 한빛 그룹", country: "국가",
    accountType: "계정 유형", superAdmin: "최고 관리자 · 고객", distributor: "유통업체",
    industry: "업종(선택 사항)", employees: "정확한 직원 수",
    employeesPlaceholder: "예: 18",
    employeesHint: "소유자와 Indice 접근이 필요한 모든 사람을 포함하세요.",
    unspecified: "지정되지 않음",
  },
  owner: {
    title: "소유자 및 접근", description: "회사 소유자의 초기 인증 정보입니다.",
    name: "소유자 이름(선택 사항)", namePlaceholder: "성명",
    email: "이메일 주소", emailPlaceholder: "owner@company.com", phone: "전화번호(선택 사항)",
    phonePlaceholder: "+1 416 555 0123", password: "임시 비밀번호",
  },
  access: {
    title: "플랜 및 모듈", description: "필요한 초기 접근 권한만 선택하세요.",
    modules: "사용 가능한 모듈",
    baseGroup: "기본 패키지",
    baseGroupDescription: "기본 모듈의 총수가 상업 패키지를 결정합니다.",
    addonGroup: "추가 모듈",
    addonGroupDescription: "체험 종료 시 개별적으로 청구됩니다.",
    moduleFallback: "모듈 업무 접근 권한입니다.",
    noModules: "활성 기본 모듈이 없습니다. 카탈로그 및 모듈을 확인하세요.", accessType: "접근 유형",
    demo: "기간 제한 데모", permanent: "영구 무료 제공",
    capacityTitle: "계산된 패키지 및 정원",
    capacityDescription: "Indice는 패키지와 필요한 추가 자리로 입력한 직원을 수용합니다.",
    package: "기본 패키지", requiredUsers: "필요한 직원 수",
    packageName: (moduleCount) => moduleCount <= 0
      ? "패키지 없음"
      : moduleCount === 1
        ? "모듈 1개"
        : moduleCount === 2
          ? "모듈 2개"
          : moduleCount === 3
            ? "모듈 3개"
            : "모듈 4개 이상",
    includedUsers: "포함된 자리", additionalUsers: "추가 사용자",
    duration: "데모 기간", days: (days) => `${new Intl.NumberFormat("ko-CA").format(days)}일`,
    noExpiration: "만료일 없음",
  },
  context: { company: "회사", owner: "소유자", directAccount: "직접 설정" },
  notices: {
    restored: "진행 상황을 복원하고 새 임시 비밀번호를 생성했습니다.",
    audit: "실제 회사가 생성되고 감사 로그에 기록됩니다. Stripe 청구는 생성되지 않습니다.",
  },
  errors: {
    password: "비밀번호는 10자 이상, 72바이트 이하여야 합니다.",
    invalidPhone: "선택한 국가의 유효한 전화번호를 입력하세요.",
    duplicateEmail: "이 이메일은 다른 계정에 속합니다. 계속하려면 다른 이메일을 사용하세요.",
    selectModule: "계정을 만들려면 하나 이상의 모듈을 선택하세요.",
    createFailed: "계정을 만들 수 없습니다.",
    modulesNotApplied: "계정은 생성되었지만 선택한 모듈이 확인되지 않았습니다. 계정 관리를 열어 접근 설정을 완료하세요.",
    sessionExpired: "Root 세션이 만료되었습니다. 비밀번호를 저장하지 않고 진행 상황을 유지했습니다.",
  },
  success: {
    created: (companyId) => `회사 #${companyId} · 소유자 생성 완료`,
    initialAccess: "초기 접근", oneTimePassword: "비밀번호는 여기에서만 표시됩니다.",
    copyAll: "정보 복사", copiedAll: "정보 복사됨", copy: "복사", copied: "복사됨",
    loginPage: "로그인 페이지", company: "회사", email: "이메일", password: "임시 비밀번호",
    loadedModules: "불러온 모듈", loadedModulesDescription: (count) => `계정에 확인된 모듈: ${new Intl.NumberFormat("ko-CA").format(count)}`,
    accessDataTitle: "Indice 접근 정보", securityReminder: "보안을 위해 로그인 후 비밀번호를 변경하세요.",
    securityShare: "사용자에게 대시보드 → 프로필 → 보안에서 비밀번호를 변경하도록 요청하세요. Indice는 이를 이메일로 보내거나 Root 감사 로그에 저장하지 않습니다.",
  },
};
