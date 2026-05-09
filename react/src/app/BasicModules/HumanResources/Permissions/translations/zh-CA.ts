import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '请假与许可',
  subtitle: '管理申请、缺勤、休假和审批状态。',
  actions: { columns: '列', addRequest: '新增申请', close: '关闭', approve: '批准', reject: '拒绝', view: '查看' },
  columns: { ...enCA.columns, employee: '员工', type: '类型', startDate: '开始日期', endDate: '结束日期', days: '天数', status: '状态', actions: '操作' },
  filters: { ...enCA.filters, title: '筛选', searchLabel: '搜索申请', status: '状态', allStatuses: '所有状态', allTypes: '所有类型', employee: '员工', allEmployees: '所有员工' },
  types: { vacation: '休假', sick_leave: '病假', personal: '个人', maternity: '产假/陪产假', bereavement: '丧假', unpaid: '无薪假', other: '其他' },
  status: { pending: '待处理', approved: '已批准', rejected: '已拒绝' },
  columnsModal: { ...enCA.columnsModal, title: '表格列', close: '关闭列弹窗', required: '必选', done: '完成' },
} as const satisfies PermissionsTranslations;
