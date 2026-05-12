import { enCA } from './en-CA';
import type { KpisTranslations } from './types';

export const zhCA: KpisTranslations = {
  ...enCA,
  locale: 'zh-CA',
  common: {
    ...enCA.common,
    all: '全部',
    allFemale: '全部',
    retry: '重试',
    noDate: '无日期',
    noUnit: '无单位',
    noBusiness: '无业务',
    noFolio: '无编号',
    notApplicable: '不适用',
    unassigned: '未分配',
    pending: '待处理',
    overdue: '逾期',
    collaborators: (count: number) => `${count} 位协作者`,
  },
  header: {
    emoji: '📊',
    title: '运营 KPI',
    subtitle: '生产力、合规、审核、流程、项目和协作者绩效的实时看板。',
  },
  filters: {
    ...enCA.filters,
    title: '筛选',
    period: '期间',
    unit: '单位',
    business: '业务',
    collaborator: '协作者',
    search: '搜索绩效',
    searchPlaceholder: '协作者、单位或业务',
    from: '从',
    to: '到',
  },
  periods: {
    day: '当天日程',
    week: '本周',
    month: '本月',
    overdue: '逾期',
    custom: '自定义日期',
  },
  statuses: {
    healthy: '健康',
    watch: '观察',
    critical: '关键',
    active: '活跃',
    paused: '已暂停',
  },
  summary: {
    labels: {
      visible: '可见',
      open: '打开',
      closed: '已关闭',
      overdue: '逾期',
      pendingAudit: '待审核',
      withEvidence: '有证据',
      productivity: (score: number) => `${score}% 生产力`,
      weighting: (value: string) => `权重 ${value}`,
    },
    segments: {
      inProgress: '进行中',
      closed: '已关闭',
      audited: '已审核',
      overdue: '逾期',
      cancelled: '已取消',
    },
    insights: {
      empty: '当前筛选中没有任务。调整期间、单位、业务或协作者以评估生产力。',
      overdue: (overdue: number, average: number, pendingAudit: number) =>
        `${overdue} 个逾期任务正在影响生产力；平均进度为 ${average}%，还有 ${pendingAudit} 个关闭待审核。`,
      pendingAudit: (pendingAudit: number) =>
        `当前筛选中没有逾期任务，但还需要完成 ${pendingAudit} 个审核才能闭环。`,
      healthy: (score: number) =>
        `当前筛选状态健康：预估生产力为 ${score}%，审核和质量受控。`,
      default: (score: number) =>
        `预估生产力为 ${score}%。建议检查进度、关闭和证据以提升表现。`,
    },
  },
  cards: {
    productivity: {
      title: '运营生产力',
      target: '目标 85%',
      description: '综合进度、关闭、准时、审核、质量和证据的评分。',
    },
    compliance: {
      title: '日程合规',
      target: (closed: number) => `${closed} 已关闭`,
      description: '可执行任务与已关闭任务之间的关系。',
    },
    timeliness: {
      title: '准时性',
      target: (overdue: number) => `${overdue} 逾期`,
      description: '根据到期日衡量交付纪律。',
    },
    audit: {
      title: '完整审核',
      target: (pendingAudit: number) => `${pendingAudit} 待审核`,
      description: '由经理或负责审核人复核的关闭任务。',
    },
    quality: {
      title: '审核质量',
      target: '最高权重 5',
      description: '已审核任务的平均权重。',
    },
    collaborators: {
      title: '已衡量协作者',
      target: (projects: number, processes: number) => `${projects} 个项目 / ${processes} 个流程`,
      description: '所选筛选范围内拥有任务的人员。',
    },
  },
  chart: {
    title: '按日期的活动',
    subtitle: '筛选范围内的计划、已关闭、逾期和已审核任务。',
    empty: '当前筛选中没有可绘制的活动。',
    series: {
      scheduled: '已计划',
      closed: '已关闭',
      overdue: '逾期',
      audited: '已审核',
    },
  },
  snapshots: {
    collaborators: '协作者',
    processTasks: '流程任务',
    projectTasks: '项目任务',
    quality: '质量',
  },
  collaboratorsTable: {
    title: '协作者绩效',
    subtitle: '按分配任务、关闭、准时、审核、权重和证据生成的真实排名。',
    empty: '当前筛选中没有拥有任务的协作者。',
    headers: {
      rank: '排名',
      collaborator: '协作者',
      context: '单位 / 业务',
      score: '得分',
      tasks: '任务',
      closure: '关闭率',
      timeliness: '准时率',
      audit: '审核',
      quality: '质量',
      evidence: '证据',
      status: '状态',
    },
    details: {
      openOverdue: (open: number, overdue: number) => `${open} 打开 · ${overdue} 逾期`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} 待审核`,
    },
  },
  processesTable: {
    title: '周期性流程',
    subtitle: '流程引擎生成任务的真实合规情况。',
    empty: '当前筛选中没有包含任务的流程。',
    headers: {
      process: '流程',
      score: '得分',
      tasks: '任务',
      audit: '审核',
      next: '下次',
      engine: '引擎',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} 逾期`,
      audit: (rate: number, weighting: string) => `${rate}% · ${weighting}`,
    },
  },
  projectsTable: {
    title: '项目',
    subtitle: '根据打开、已关闭、逾期和已审核任务衡量项目组合健康度。',
    empty: '当前筛选中没有包含任务的项目。',
    headers: {
      project: '项目',
      health: '健康度',
      progress: '进度',
      tasks: '任务',
      audit: '审核',
      dueDate: '到期',
    },
    details: {
      tasks: (closed: number, total: number, overdue: number) => `${closed}/${total} · ${overdue} 逾期`,
      audit: (rate: number, pending: number) => `${rate}% · ${pending} 待审核`,
    },
  },
  messages: {
    loadCatalogs: '无法加载目录。',
    loadKpis: '无法加载 KPI。',
    empty: '没有可显示的 KPI 信息。',
    noInsight: '当前筛选没有可用的运营解读。',
  },
};
