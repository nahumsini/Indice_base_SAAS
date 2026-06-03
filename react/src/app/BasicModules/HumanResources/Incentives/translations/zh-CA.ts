import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '激励',
  subtitle: '管理手动奖金、自动规则和薪资应用时间。',
  actions: { columns: '列', addIncentive: '新增激励' },
  columns: { incentive: '激励', type: '类型', scope: '范围', amount: '金额', application: '应用', status: '状态' },
  filters: { title: '筛选', searchLabel: '搜索激励', searchPlaceholder: '名称、范围、金额或应用时间', type: '类型', status: '状态', allTypes: '所有类型', allStatuses: '所有状态' },
  types: { Automatizado: '自动', Manual: '手动' },
  statuses: { Activo: '启用', Programado: '已排程', Pausado: '暂停' },
  kpis: {
    total: '激励总数',
    active: '启用',
    automated: '自动',
    manual: '手动',
    visibleAfterFilters: '筛选后可见',
    eligibleEmployees: '符合条件的员工',
    summary: (activeCount: number, scheduledCount: number, pausedCount: number, selectedCount: number, visibleCount: number, totalCount: number) =>
      `激励摘要：启用 ${activeCount} · 排程 ${scheduledCount} · 暂停 ${pausedCount} · 已选 ${selectedCount} · 共 ${totalCount} 条，显示 ${visibleCount} 条。`,
  },
  columnsModal: { title: '表格列', subtitle: '选择此视图中显示的激励列。', close: '关闭列弹窗', required: '必选', done: '完成' },
  table: { empty: '没有符合当前筛选条件的激励。', showing: (count: number) => `正在显示 ${count} 个激励`, page: '第 1 页，共 1 页', previous: '上一页', next: '下一页' },
  pagination: {
    pageSize: '每页行数',
    showing: (start: number, end: number, total: number) => `显示 ${start}-${end} 条，共 ${total} 条激励`,
    page: (current: number, total: number) => `第 ${current} 页，共 ${total} 页`,
    previous: '上一页',
    next: '下一页',
  },
  newIncentive: { selectedCollaborators: (count: number) => `${count} 名员工`, automatedRule: '自动规则', fixed: '固定', pending: '待处理', nextPayroll: '下一次薪资' },
} as const satisfies IncentivesTranslations;
