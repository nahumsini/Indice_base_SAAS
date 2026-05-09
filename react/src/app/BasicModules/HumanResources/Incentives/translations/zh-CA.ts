import { enCA } from './en-CA';
import type { IncentivesTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '激励',
  subtitle: '管理手动奖金、自动规则和薪资应用时间。',
  actions: { columns: '列', addIncentive: '新增激励' },
  columns: { incentive: '激励', type: '类型', scope: '范围', amount: '金额', application: '应用', status: '状态' },
  filters: { ...enCA.filters, title: '筛选', searchLabel: '搜索激励', type: '类型', status: '状态', allTypes: '所有类型', allStatuses: '所有状态' },
  types: { Automatizado: '自动', Manual: '手动' },
  statuses: { Activo: '启用', Programado: '已排程', Pausado: '暂停' },
  columnsModal: { ...enCA.columnsModal, title: '表格列', close: '关闭列弹窗', required: '必选', done: '完成' },
} as const satisfies IncentivesTranslations;
