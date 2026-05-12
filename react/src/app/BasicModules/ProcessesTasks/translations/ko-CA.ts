export const koCA = {
  shell: {
    title: '프로세스 및 작업',
    subtitle: '일정, 프로젝트, KPI, 반복 운영 프로세스',
    back: '돌아가기',
    loading: {
      title: '프로세스 탭 로딩 중',
      description: '선택한 운영 작업 공간을 여는 중입니다.',
      fallbackTitle: '프로세스 탭 로딩 중',
      fallbackDescription: '선택한 작업 공간만 다운로드하는 중입니다.',
    },
    tabs: {
      agenda: '일정',
      tasks: '작업',
      projects: '프로젝트',
      processes: '프로세스',
      kpis: 'KPI',
      orgChart: '조직도',
    },
  },
  headers: {
    agenda: {
      emoji: '📅',
      title: '일정',
      subtitle: '실제 작업, 누적 지연, 완료, 증빙, 감사가 포함된 운영 일정입니다.',
      actions: {
        table: '표',
        kanban: '칸반',
        columns: '열',
        create: '작업 만들기',
      },
    },
    projects: {
      emoji: '🗂️',
      title: '프로젝트',
      subtitle: '일정에서 계산한 진행률, 실제 작업, 증빙, 완료, 감사가 포함된 운영 포트폴리오입니다.',
      actions: {
        columns: '열',
        create: '프로젝트 만들기',
      },
    },
    processes: {
      emoji: '✅',
      title: '프로세스',
      subtitle: '각 담당자의 일정에 실제 작업을 생성하는 반복 프로세스를 만듭니다.',
      actions: {
        columns: '열',
        create: '프로세스 만들기',
      },
    },
    kpis: {
      emoji: '📊',
      title: '운영 KPI',
      subtitle: '생산성, 이행률, 감사, 프로세스, 프로젝트, 담당자별 성과를 보여주는 실시간 대시보드입니다.',
    },
  },
  agenda: {
    periods: {
      today: '오늘 일정',
      week: '이번 주',
      month: '이번 달',
      overdue: '기한 초과',
      custom: '사용자 지정 날짜',
    },
  },
  kpis: {
    periods: {
      day: '오늘 일정',
      week: '이번 주',
      month: '이번 달',
      overdue: '기한 초과',
      custom: '사용자 지정 날짜',
    },
  },
} as const;
