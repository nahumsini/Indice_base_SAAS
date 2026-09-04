import { enCA } from './en-CA';
import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';
import type { ProcessesTranslations } from './types';

export const zhCA: ProcessesTranslations = {
  ...enCA,
  common: {
    ...enCA.common,
    previous: '上一步',
    continue: '继续',
    all: '全部',
    allFemale: '全部',
    retry: '重试',
    cancel: '取消',
    close: '关闭',
    saving: '保存中...',
    noDate: '无日期',
    noUnit: '无单位',
    noBusiness: '无业务',
    unassigned: '未分配',
    backup: '备份',
    actions: '操作',
    requiredFields: '标有 * 的字段为必填项。',
  },
  header: {
    emoji: '🔄',
    title: '流程',
    subtitle: '设计定期或临时流程，为个人或团队生成真实日程任务。',
    actions: {
      table: '表格',
      diagram: '图表',
      columns: '列',
      create: '创建流程',
    },
  },
  filters: {
    title: '筛选',
    search: '搜索流程',
    searchPlaceholder: '编号、标题、描述、单位或负责人',
    unit: '单位',
    business: '业务',
    collaborator: '协作者',
    frequency: '频率',
    clear: '清除筛选',
  },
  diagram: { previousMonth: '上个月', nextMonth: '下个月' },
  statuses: {
    active: '活跃',
    paused: '已暂停',
    atRisk: '有风险',
  },
  priorities: {
    high: '高',
    medium: '中',
    low: '低',
  },
  frequencies: {
    daily: '每日',
    weekly: '每周',
    'bi-weekly': '每两周',
    monthly: '每月',
    'specific-dates': '指定日期',
  },
  weekdays: {
    monday: '星期一',
    tuesday: '星期二',
    wednesday: '星期三',
    thursday: '星期四',
    friday: '星期五',
    saturday: '星期六',
    sunday: '星期日',
  },
  columns: {
    folio: { label: '编号', description: '流程的运营标识。' },
    unit: { label: '单位', description: '与流程关联的单位。' },
    business: { label: '业务', description: '与流程关联的业务。' },
    title: { label: '流程', description: '可编辑的周期性流程名称。' },
    description: { label: '描述', description: '流程的运营细节和范围。' },
    template: { label: '模板', description: '复制到每个生成任务的数据。' },
    createdAt: { label: '创建日期', description: '流程登记日期。' },
    frequency: { label: '频率', description: '任务生成周期。' },
    nextOccurrence: { label: '下次生成', description: '引擎计划的下一次发生时间。' },
    generatedUntil: { label: '已生成至', description: '引擎已生成的未来边界。' },
    progress: { label: '进度', description: '根据已生成任务计算的进度。' },
    tasks: { label: '任务', description: '已生成、打开、关闭和逾期任务。' },
    creator: { label: '创建者', description: '创建该流程的用户。' },
    responsible: { label: '负责人', description: '负责执行该流程的用户。' },
    priority: { label: '优先级', description: '分配的优先级。' },
  },
  fixedColumns: {
    actions: {
      label: '操作',
      description: '用于更新任务、暂停、编辑、复制或删除流程的按钮。',
    },
  },
  columnsDialog: {
    title: '管理列',
    description: '选择流程工作区表格中保持可见的列。',
    visibleCount: (visible: number, total: number) => `显示 ${visible}/${total} 列`,
    selectAll: '全选',
    minimumSet: '最小视图',
    requiredColumn: '工作区必需列。',
    optionalColumn: '可从表格中隐藏的可选列。',
  },
  table: {
    loading: '正在加载流程...',
    empty: '没有符合当前筛选条件的流程。',
    progress: '进度',
    status: '状态',
    graceDays: (days: number) => `宽限 ${days} 天`,
    evidenceRequired: '需要证据',
    start: '开始',
    end: '结束',
    until: '直到',
    window: (days: number) => `窗口 ${days} 天`,
    taskCounts: {
      open: '打开',
      closed: '关闭',
      overdue: '逾期',
      audited: '已审核',
    },
  },
  actions: {
    runEngine: '更新流程任务',
    pause: '暂停流程',
    activate: '激活流程',
    edit: '编辑流程',
    copy: '复制流程',
    delete: '删除流程',
  },
  bulk: {
    selected: (count: number) => `已选择 ${count} 个`,
    title: '批量操作',
    applied: (count: number) => `已对 ${count} 个选中流程执行批量操作。`,
    assignDescription: (count: number) => `将负责人应用到 ${count} 个选中流程。`,
    itemName: (count: number) => `${count} 个流程`,
    selectVisible: '选择可见流程',
    selectRow: (folio: string) => `选择 ${folio}`,
  },
  messages: {
    loadProcesses: '无法加载流程。',
    loadCatalogs: '无法加载流程目录。',
    saveChanges: '无法保存流程更改。',
    deleteProcess: '无法删除流程。',
    duplicateProcess: '无法复制流程。',
    runEngine: '无法更新流程任务。',
    saveProcess: '无法保存流程。',
    titleRequired: '标题为必填项。',
    descriptionRequired: '描述为必填项。',
    copyPrefix: (title: string) => `${title} 的副本`,
  },
  kpis: {
    labels: {
      visible: '可见',
      active: '活跃',
      open: '打开',
      closed: '关闭',
      overdue: '逾期',
      averageProgress: '平均进度',
      tasks: '任务',
      health: '健康度',
    },
    segments: {
      active: '活跃',
      paused: '已暂停',
      closedTasks: '已关闭任务',
      audited: '已审核',
      overdue: '逾期',
    },
    badges: {
      overdue: (count: number) => `${count} 个逾期`,
      paused: (count: number) => `${count} 个已暂停`,
      health: (score: number) => `${score}% 健康度`,
    },
    insights: {
      empty: '当前筛选中没有流程。创建流程或调整筛选条件以评估周期性运营。',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue} 个逾期任务来自活跃流程；平均进度为 ${average}%，还有 ${open} 个任务未关闭。`,
      paused: (paused: number, open: number, health: number) =>
        `当前筛选中有 ${paused} 个已暂停流程。活跃流程支撑 ${open} 个打开任务，预估健康度为 ${health}%。`,
      healthy: (active: number, closed: number, health: number) =>
        `流程组合状态良好：${active} 个活跃流程，${closed} 个已关闭任务，预估健康度 ${health}%。`,
      default: (health: number, active: number, average: number) =>
        `当前筛选的预估健康度为 ${health}%，包含 ${active} 个活跃流程，平均进度 ${average}%。`,
    },
  },
  form: {
    titles: {
      create: '创建流程',
      edit: '编辑流程',
    },
    descriptions: {
      create: '设计个人或共享流程，并选择定时或按需启动。',
      edit: '更新配置、负责人和频率，不改变模块流程。',
    },
    labels: {
      unit: '单位',
      business: '业务',
      title: '标题 *',
      description: '描述 *',
      taskTitle: '任务标题',
      taskDescription: '任务描述',
      taskNotes: '初始备注',
      frequency: '频率',
      responsible: '负责人',
      priority: '优先级',
      start: '开始',
      end: '结束',
      graceDays: '宽限天数',
      window: '窗口',
      referenceDate: '参考日期',
    },
    placeholders: {
      unit: '无单位',
      business: '无业务',
      responsible: '未分配',
      title: '周期性流程标题',
      description: '描述周期性工作应如何显示在负责人日程中',
      taskTitle: '留空则使用流程标题',
      taskDescription: '留空则使用流程描述',
      taskNotes: '每个生成任务的运营备注',
    },
    sections: {
      taskTemplate: '任务模板',
      taskTemplateDescription: '这些值会复制到引擎生成的每个任务中。',
      evidenceRequired: '需要证据',
      evidenceDescription: '如果该流程的任务必须通过文件或照片证据关闭，请启用此项。',
      engineControl: '流程有效期',
      engineDescription: '定义重复流程从何时开始生成以及持续有效到何时。',
      schedule: '流程计划',
      scheduleDescription: (frequency: string) =>
        `当选择的频率为 ${frequency} 时，配置周期性流程的生成方式。`,
    },
    recurrence: {
      daily: '该流程会每天为指定负责人创建任务。',
      weeklyTitle: '每周配置',
      weeklyDescription: '选择流程应在负责人日程中出现的星期几。',
      biWeeklyTitle: '每两周配置',
      biWeeklyDescription: '选择日期和参考日期，以每两周重复该流程。',
      monthlyTitle: '每月配置',
      monthlyDescription: '选择流程应生成任务的每月日期。',
      specificDatesTitle: '指定日期配置',
      specificDatesDescription: '添加流程应在负责人日程中创建任务的确切日期。',
      addDate: '添加日期',
      emptyDates: '至少添加一个日期以启用该计划。',
      selectedDay: (day: string) => `已选择日期：${day}`,
      removeDate: (date: string) => `移除 ${date}`,
    },
    submit: {
      create: '创建流程',
      edit: '保存更改',
    },
  },
  confirmation: {
    deleteTitle: '删除流程',
    deleteDescription: '这会将流程从活动目录中移除。已创建的执行和任务将作为历史保持不变。',
    deleteConfirm: '删除流程',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = zhCA.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return '每天';
      case 'weekly':
        return `每 ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `每 2 周：${labels}`;
      }
      case 'monthly':
        return `每月第 ${recurrence.monthlyDays.join(', ')} 天`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '已配置 1 个日期'
          : `已配置 ${recurrence.specificDates.length} 个日期`;
      default:
        return zhCA.frequencies[frequency];
    }
  },
};
