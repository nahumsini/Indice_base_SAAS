import { enCA } from './en-CA';
import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';
import type { ProcessesTranslations } from './types';

export const koCA: ProcessesTranslations = {
  ...enCA,
  common: {
    ...enCA.common,
    all: '전체',
    allFemale: '전체',
    retry: '다시 시도',
    cancel: '취소',
    close: '닫기',
    saving: '저장 중...',
    noDate: '날짜 없음',
    noUnit: '유닛 없음',
    noBusiness: '비즈니스 없음',
    unassigned: '미지정',
    backup: '백업',
    actions: '작업',
    requiredFields: '* 표시된 필드는 필수입니다.',
  },
  header: {
    emoji: '✅',
    title: '프로세스',
    subtitle: '각 담당자의 일정에 실제 작업을 생성하는 반복 프로세스를 만듭니다.',
    actions: {
      table: '표',
      diagram: '다이어그램',
      columns: '열',
      create: '프로세스 만들기',
    },
  },
  filters: {
    title: '필터',
    search: '프로세스 검색',
    searchPlaceholder: '번호, 제목, 설명, 유닛 또는 담당자',
    unit: '유닛',
    business: '비즈니스',
    collaborator: '담당자',
    frequency: '빈도',
  },
  statuses: {
    active: '활성',
    paused: '일시 중지',
    atRisk: '위험',
  },
  priorities: {
    high: '높음',
    medium: '보통',
    low: '낮음',
  },
  frequencies: {
    daily: '매일',
    weekly: '매주',
    'bi-weekly': '격주',
    monthly: '매월',
    'specific-dates': '특정 날짜',
  },
  weekdays: {
    monday: '월요일',
    tuesday: '화요일',
    wednesday: '수요일',
    thursday: '목요일',
    friday: '금요일',
    saturday: '토요일',
    sunday: '일요일',
  },
  columns: {
    folio: { label: '번호', description: '프로세스 운영 식별자입니다.' },
    unit: { label: '유닛', description: '프로세스와 연결된 유닛입니다.' },
    business: { label: '비즈니스', description: '프로세스와 연결된 비즈니스입니다.' },
    title: { label: '프로세스', description: '편집 가능한 반복 프로세스 이름입니다.' },
    description: { label: '설명', description: '프로세스의 운영 세부 사항과 범위입니다.' },
    template: { label: '템플릿', description: '생성된 각 작업에 복사되는 데이터입니다.' },
    createdAt: { label: '생성일', description: '프로세스가 등록된 날짜입니다.' },
    frequency: { label: '빈도', description: '작업 생성 주기입니다.' },
    nextOccurrence: { label: '다음 생성', description: '엔진이 예약한 다음 발생일입니다.' },
    generatedUntil: { label: '생성 완료 기준', description: '엔진이 미래에 생성한 한계입니다.' },
    progress: { label: '진행률', description: '생성된 작업 기준으로 계산된 진행률입니다.' },
    tasks: { label: '작업', description: '생성, 열림, 닫힘, 기한 초과 작업입니다.' },
    creator: { label: '생성자', description: '프로세스를 만든 사용자입니다.' },
    responsible: { label: '담당자', description: '프로세스를 실행할 책임 사용자입니다.' },
    priority: { label: '우선순위', description: '지정된 우선순위 수준입니다.' },
  },
  fixedColumns: {
    actions: {
      label: '작업',
      description: '프로세스 실행, 일시 중지, 편집, 복사 또는 삭제 버튼입니다.',
    },
  },
  table: {
    loading: '반복 프로세스를 불러오는 중...',
    empty: '현재 필터와 일치하는 반복 프로세스가 없습니다.',
    progress: '진행률',
    graceDays: (days: number) => `유예 ${days}일`,
    evidenceRequired: '증빙 필요',
    start: '시작',
    end: '종료',
    until: '까지',
    window: (days: number) => `윈도우 ${days}일`,
    taskCounts: {
      open: '열림',
      closed: '닫힘',
      overdue: '기한 초과',
      audited: '감사 완료',
    },
  },
  actions: {
    runEngine: '기한 작업 생성',
    pause: '프로세스 일시 중지',
    activate: '프로세스 활성화',
    edit: '프로세스 편집',
    copy: '프로세스 복사',
    delete: '프로세스 삭제',
  },
  messages: {
    loadProcesses: '프로세스를 불러올 수 없습니다.',
    loadCatalogs: '프로세스 카탈로그를 불러올 수 없습니다.',
    saveChanges: '프로세스 변경 사항을 저장할 수 없습니다.',
    deleteProcess: '프로세스를 삭제할 수 없습니다.',
    duplicateProcess: '프로세스를 복사할 수 없습니다.',
    runEngine: '기한 작업을 생성할 수 없습니다.',
    saveProcess: '프로세스를 저장할 수 없습니다.',
    titleRequired: '제목은 필수입니다.',
    descriptionRequired: '설명은 필수입니다.',
    copyPrefix: (title: string) => `${title} 복사본`,
  },
  kpis: {
    labels: {
      visible: '표시',
      active: '활성',
      open: '열림',
      closed: '닫힘',
      overdue: '기한 초과',
      averageProgress: '평균 진행률',
      tasks: '작업',
      health: '건강도',
    },
    segments: {
      active: '활성',
      paused: '일시 중지',
      closedTasks: '닫힌 작업',
      audited: '감사 완료',
      overdue: '기한 초과',
    },
    badges: {
      overdue: (count: number) => `${count}개 기한 초과`,
      paused: (count: number) => `${count}개 일시 중지`,
      health: (score: number) => `${score}% 건강도`,
    },
    insights: {
      empty: '현재 필터에 프로세스가 없습니다. 반복 운영을 평가하려면 프로세스를 만들거나 필터를 조정하세요.',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue}개의 기한 초과 작업이 활성 프로세스에서 발생했습니다. 평균 진행률은 ${average}%이며 ${open}개 작업이 아직 열려 있습니다.`,
      paused: (paused: number, open: number, health: number) =>
        `필터에 ${paused}개의 일시 중지된 프로세스가 있습니다. 활성 프로세스는 ${open}개의 열린 작업을 지원하며 예상 건강도는 ${health}%입니다.`,
      healthy: (active: number, closed: number, health: number) =>
        `프로세스 포트폴리오가 건강합니다. 활성 ${active}개, 닫힌 작업 ${closed}개, 예상 건강도 ${health}%입니다.`,
      default: (health: number, active: number, average: number) =>
        `현재 필터의 예상 건강도는 ${health}%이며 활성 프로세스 ${active}개와 평균 진행률 ${average}%가 있습니다.`,
    },
  },
  form: {
    titles: {
      create: '반복 프로세스 만들기',
      edit: '반복 프로세스 편집',
    },
    descriptions: {
      create: '작업을 생성하고 담당자 일정에 배정하는 반복 프로세스를 만듭니다.',
      edit: '모듈 흐름을 바꾸지 않고 구성, 담당자, 빈도를 업데이트합니다.',
    },
    labels: {
      unit: '유닛',
      business: '비즈니스',
      title: '제목 *',
      description: '설명 *',
      taskTitle: '작업 제목',
      taskDescription: '작업 설명',
      taskNotes: '초기 메모',
      frequency: '빈도',
      responsible: '담당자',
      priority: '우선순위',
      start: '시작',
      end: '종료',
      graceDays: '유예일',
      window: '윈도우',
      referenceDate: '기준일',
    },
    placeholders: {
      unit: '유닛 없음',
      business: '비즈니스 없음',
      responsible: '미지정',
      title: '반복 프로세스 제목',
      description: '반복 작업이 담당자 일정에 어떻게 표시되어야 하는지 설명하세요',
      taskTitle: '비워두면 프로세스 제목을 사용합니다',
      taskDescription: '비워두면 프로세스 설명을 사용합니다',
      taskNotes: '생성된 각 작업의 운영 메모',
    },
    sections: {
      taskTemplate: '작업 템플릿',
      taskTemplateDescription: '이 값은 엔진이 생성하는 각 작업에 복사됩니다.',
      evidenceRequired: '증빙 필요',
      evidenceDescription: '작업을 파일 또는 사진 증빙으로 닫아야 하는 경우 표시하세요.',
      engineControl: '엔진 제어',
      engineDescription: '언제 생성이 시작되고, 언제까지 적용되며, 며칠 앞까지 생성할지 정의합니다.',
      schedule: '프로세스 일정',
      scheduleDescription: (frequency: string) =>
        `선택한 빈도가 ${frequency}일 때 반복 프로세스가 생성되는 방식을 설정하세요.`,
    },
    recurrence: {
      daily: '프로세스는 지정된 담당자에게 매일 작업을 생성합니다.',
      weeklyTitle: '주간 설정',
      weeklyDescription: '프로세스가 담당자 일정에 표시될 요일을 선택하세요.',
      biWeeklyTitle: '격주 설정',
      biWeeklyDescription: '2주마다 반복할 요일과 기준일을 선택하세요.',
      monthlyTitle: '월간 설정',
      monthlyDescription: '프로세스가 생성될 월 중 날짜를 선택하세요.',
      specificDatesTitle: '특정 날짜 설정',
      specificDatesDescription: '프로세스가 담당자 일정에 작업을 생성할 정확한 날짜를 추가하세요.',
      addDate: '날짜 추가',
      emptyDates: '이 일정을 활성화하려면 날짜를 하나 이상 추가하세요.',
      selectedDay: (day: string) => `선택한 요일: ${day}`,
      removeDate: (date: string) => `${date} 제거`,
    },
    submit: {
      create: '프로세스 만들기',
      edit: '변경 사항 저장',
    },
  },
  confirmation: {
    deleteTitle: '프로세스 삭제',
    deleteDescription: '프로세스를 활성 카탈로그에서 소프트 삭제하고 백엔드 데이터 백업은 유지합니다.',
    deleteConfirm: '프로세스 삭제',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = koCA.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return '매일';
      case 'weekly':
        return `매주 ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `2주마다: ${labels}`;
      }
      case 'monthly':
        return `매월 ${recurrence.monthlyDays.join(', ')}일`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '설정된 날짜 1개'
          : `설정된 날짜 ${recurrence.specificDates.length}개`;
      default:
        return koCA.frequencies[frequency];
    }
  },
};
