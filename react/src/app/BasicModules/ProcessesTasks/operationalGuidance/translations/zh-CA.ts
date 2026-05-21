export const zhCA = {
  eyebrow: '学习模式',
  title: '运营执行指南',
  subtitle: '使用流程和任务，把运营优先事项转化为可见工作、可重复例行事项和可衡量执行。',
  controlLabel: '执行控制',
  functionsLabel: '标签页功能',
  guideProgressLabel: '指南进度',
  guideProgressCompleteLabel: '已查看',
  previousStepLabel: '上一条建议',
  nextStepLabel: '下一条建议',
  stepIndicatorLabel: '显示建议',
  tabs: {
    calendar: {
      label: '日程',
      ctaLabel: '查看日程',
      title: '从一个运营看板执行每日工作',
      summary: '使用日程创建、分配、排序、完成、审核和跟进任务，同时保留执行背景。',
      value: '有纪律的日程减少遗忘，让责任可见，并帮助主管用清晰证据结束一天。',
      steps: [
        {
          title: '保持任务可执行',
          description: '用清晰标题、负责人、截止日期、优先级和业务背景创建任务。',
        },
        {
          title: '使用合适视图',
          description: '表格用于控制，kanban 用于流程，图表用于时间理解。',
        },
        {
          title: '用证据关闭',
          description: '使用备注、进度、文件和审核状态，让完成的工作可靠。',
        },
      ],
    },
    projects: {
      label: '项目',
      ctaLabel: '查看项目',
      title: '协调计划而不失去任务控制',
      summary: '使用项目分组相关工作、组织负责人，并把任务执行连接到更大的运营目标。',
      value: '项目可见性帮助团队理解任务为什么重要，以及延迟会影响哪些更大的承诺。',
      steps: [
        {
          title: '定义项目结果',
          description: '让每个项目连接到清晰运营结果，避免任务变成分散活动。',
        },
        {
          title: '跟踪任务组合',
          description: '使用任务列表和图表识别工作量、延迟、负责人和时间风险。',
        },
        {
          title: '持续复查进度',
          description: '使用状态和关联任务，在截止日期变成紧急事项前跟进。',
        },
      ],
    },
    processes: {
      label: '流程',
      ctaLabel: '查看流程',
      title: '把重复工作转化为运营例行事项',
      summary: '使用流程定义可重复的运营生成器，根据清晰规则创建未来任务。',
      value: '重复流程保护一致性：启用时生成未来工作，暂停时停止，删除后永久停止。',
      steps: [
        {
          title: '区分流程和任务',
          description: '把流程视为生成任务的运营例行事项，而不是单个要完成的项目。',
        },
        {
          title: '谨慎控制重复规则',
          description: '保持频率、下次执行、负责人和状态准确，只生成运营需要的工作。',
        },
        {
          title: '删除前先暂停',
          description: '临时停止用暂停；只有当例行事项不再需要生成任务时才删除。',
        },
      ],
    },
    kpis: {
      label: 'KPI',
      ctaLabel: '查看 KPI',
      title: '在工作偏离前衡量执行健康',
      summary: '使用运营 KPI 读取日程合规、项目流动、流程纪律和执行风险。',
      value: 'KPI 把任务活动转化为管理信号，让领导在积压变成运营债务前行动。',
      steps: [
        {
          title: '读取领先指标',
          description: '观察开放、逾期、已审核和已完成工作，了解执行是在改善还是累积风险。',
        },
        {
          title: '把指标连接到行动',
          description: '使用 KPI 变化决定哪个团队、项目、流程或负责人需要跟进。',
        },
        {
          title: '查看趋势',
          description: '单个数字有用，但趋势变化更能说明运营系统是否更健康。',
        },
      ],
    },
  },
} as const;
