import { enCA } from './en-CA';

export const zhCA = {
  ...enCA,
  locale: 'zh-CA',
  fileName: '运营成熟度报告.pdf',
  companyFallback: '当前企业',
  questionsLabel: '题',
  scoreLabel: 'BMI',
  outOf100: '满分 100',
  levelNames: {
    level1: '初始',
    level2: '起步',
    level3: '有序',
    level4: '可扩展',
    level5: '优化',
  },
  progressLevels: ['初始', '有序', '可扩展', '优化'],
  moduleLabels: {
    people: '人力资源',
    processes: '流程与任务',
    products: 'CRM / 销售点',
    finance: '费用与 KPI',
  },
  summaryTemplate:
    '企业运营成熟度为 {score}/100。最强支柱是 {strongest}，优先需要加强的是 {weakest}。',
  overallInterpretations: {
    critical:
      '企业在扩张前需要建立基础管控：明确负责人、可见的运营节奏，以及支持决策的最低数据。',
    emerging:
      '业务已经在运转，但仍较依赖非正式跟进和个人判断。',
    organized:
      '运营已有基础，但还需要提升可见性、责任归属和可重复的管理节奏。',
    scalable:
      '企业具备增长基础，但需要保护较弱运营环节的纪律性。',
    optimized:
      '企业显示出较高的运营成熟度。挑战是在复杂度提升时继续保持标准。',
  },
  pillarInterpretations: {
    critical: '{section} 在支撑增长前需要立即结构化。',
    emerging: '{section} 已有有用做法，但一致性仍不足。',
    organized: '{section} 已有可加强和衡量的运营基础。',
    scalable: '{section} 已能通过较清晰的节奏支持增长。',
    optimized: '{section} 是优势领域，可作为其他领域的参考。',
  },
  completenessNote: {
    empty: '数据不足：请完成诊断，以生成运营解读。',
    template: '基于 {total} 题中的 {answered} 题作出解读。诊断置信度：{confidence}%。',
  },
  pillarFallbacks: {
    people: {
      risk: '运营节奏可能过度依赖个人协调和不够清晰的责任归属。',
      action: '为最常重复的工作明确负责人、决策权限和复盘节奏。',
    },
    processes: {
      risk: '当任务、阻塞项和负责人不够可见时，执行速度可能变慢。',
      action: '建立可见的工作流，包含负责人、截止日期、状态和完成标准。',
    },
    products: {
      risk: '商业投入可能分散在多个产品或客户上，而缺乏足够的回报焦点。',
      action: '优先明确应引导增长的核心产品、客户群和利润信号。',
    },
    finance: {
      risk: '在现金、成本、利润率或盈利能力不够清晰时，决策可能失准。',
      action: '在批准增长决策前，先连接价格、直接成本、利润率和每周现金流。',
    },
  },
  consulting: {
    nextMove: '如果只做一件事',
  },
  editorial: {
    action: '行动',
    answered: '已回答',
    brand: 'INDICE',
    businessDiagnosis: '企业诊断',
    confidence: '置信度',
    date: '日期',
    decision: '决策',
    evidence: '依据',
    executiveFindings: '执行洞察',
    executiveFindingsCaption: '用于聚焦下一次管理讨论的三个运营结论。',
    expectedResult: '预期结果',
    focus: '重点',
    footer: '基于 Business Profile 回答生成',
    generatedFrom: '基于 Business Profile 回答生成',
    insightLabel: '管理层解读',
    maturity: '成熟度',
    maturityView: '成熟度视图',
    maturityViewCaption: '按支柱比较能力，并展示整体成熟度进展。',
    module: '建议模块',
    pillar: '支柱',
    pillarBreakdown: '支柱分析',
    pillarBreakdownCaption: '每个运营面的当前能力、风险和即时行动。',
    preparedFor: '提交给',
    priorityDecisions: '优先决策',
    priorityDecisionsCaption: '这些不是孤立任务，而是提升管控和扩展能力的管理决策。',
    problem: '问题',
    reportTitle: '运营成熟度报告',
    risk: '风险',
    roadmap: '执行路线图',
    roadmapCaption: '把诊断转化为可见执行的建议顺序。',
    scoreSummary: '成熟度摘要',
  },
  insightTypeLabels: {
    critical_dependency: '关键依赖',
    growth_risk: '增长风险',
    highest_roi_area: '最高运营回报领域',
    main_risk: '主要风险',
    operational_bottleneck: '运营瓶颈',
    quick_win: '快速改进',
    single_priority: '唯一优先项',
  },
  insightFallbacks: {
    critical_dependency: {
      title: '需要降低的关键依赖',
      message: '运营模式过度依赖非正式负责人或关键个人。',
      businessImpact: '如果连续性依赖记忆、个人时间或个人判断，增长时会变得脆弱。',
      recommendedAction: '为最敏感的工作流明确一个负责人、一个备份人和一个可见的运营节奏。',
    },
    growth_risk: {
      title: '增长可能放大当前摩擦',
      message: '企业可能在管控节奏准备好之前先增加业务量。',
      businessImpact: '更多客户、人员或地点可能增加差异、返工和协调成本。',
      recommendedAction: '先标准化最影响客户体验、团队执行或现金流的运营节奏。',
    },
    highest_roi_area: {
      title: '最高运营回报领域',
      message: '最高回报来自改善摩擦证据最清晰的运营面。',
      businessImpact: '聚焦改善比把精力分散到太多事项更能创造价值。',
      recommendedAction: '选择一个可衡量的改善项，并指定负责人、日期和复盘节奏。',
    },
    main_risk: {
      title: '主要运营风险',
      message: '企业需要对诊断中发现的运营信号建立更可见的控制。',
      businessImpact: '缺乏可见性时，决策可能变慢，或过度依赖个人判断。',
      recommendedAction: '把最高风险信号转化为一个具体决策，并配负责人和每周跟进。',
    },
    operational_bottleneck: {
      title: '运营瓶颈',
      message: '工作协调、跟进或衡量方式中存在摩擦。',
      businessImpact: '即使团队很努力，业务量增加时执行也可能变慢。',
      recommendedAction: '把重复工作放进可见系统，包含负责人、日期、状态和完成标准。',
    },
    quick_win: {
      title: '立即可做的快速改进',
      message: '最快的改善是让进行中的工作更容易被看见和跟进。',
      businessImpact: '一个小的可见性变化就能减少人工跟进时间，并提升责任感。',
      recommendedAction: '本周建立一个统一视图，展示进行中任务、阻塞项和负责人。',
    },
    single_priority: {
      title: '唯一优先项',
      message: '在增加新事项前，先处理最具体的运营约束。',
      businessImpact: '不移除约束就做更多事，可能制造噪音而不是进展。',
      recommendedAction: '确定一个约束、一个负责人、一个指标和一个复盘日期。',
    },
  },
  roadmapSteps: [
    { label: '7 天', title: '可见管控' },
    { label: '30 天', title: '运营优先项' },
    { label: '60 天', title: '为增长做准备' },
  ],
  roadmapOutcomes: [
    '负责人和第一步行动对齐，减少模糊性。',
    '形成可见的运营节奏，不再依赖记忆或聊天记录跟进。',
    '建立可扩展的管控基础，减少人工监督。',
  ],
} as const;
