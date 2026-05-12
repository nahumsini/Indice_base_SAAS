export const zhCA = {
  shell: {
    title: '流程与任务',
    subtitle: '日程、项目、KPI 和周期性运营流程',
    back: '返回',
    loading: {
      title: '正在加载流程页签',
      description: '正在打开选定的运营工作区。',
      fallbackTitle: '正在加载流程页签',
      fallbackDescription: '仅下载选定的工作区。',
    },
    tabs: {
      agenda: '日程',
      tasks: '任务',
      projects: '项目',
      processes: '流程',
      kpis: 'KPI',
      orgChart: '组织架构',
    },
  },
  headers: {
    agenda: {
      emoji: '📅',
      title: '日程',
      subtitle: '包含真实任务、累积逾期、关闭、证据和审核的运营日程。',
      actions: {
        table: '表格',
        kanban: '看板',
        columns: '列',
        create: '创建任务',
      },
    },
    projects: {
      emoji: '🗂️',
      title: '项目',
      subtitle: '包含真实任务、证据、关闭、审核，并从日程计算进度的运营项目组合。',
      actions: {
        columns: '列',
        create: '创建项目',
      },
    },
    processes: {
      emoji: '✅',
      title: '流程',
      subtitle: '创建周期性流程，为每位负责人生成真实日程任务。',
      actions: {
        columns: '列',
        create: '创建流程',
      },
    },
    kpis: {
      emoji: '📊',
      title: '运营 KPI',
      subtitle: '展示生产力、完成率、审核、流程、项目和协作者绩效的实时仪表板。',
    },
  },
  agenda: {
    periods: {
      today: '今日日程',
      week: '本周',
      month: '本月',
      overdue: '逾期',
      custom: '自定义日期',
    },
  },
  kpis: {
    periods: {
      day: '今日日程',
      week: '本周',
      month: '本月',
      overdue: '逾期',
      custom: '自定义日期',
    },
  },
} as const;
