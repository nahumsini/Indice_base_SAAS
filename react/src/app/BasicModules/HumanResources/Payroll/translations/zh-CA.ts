import { enCA } from './en-CA';
import type { PayrollTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '薪资',
  subtitle: '使用真实用户和考勤数据审核、批准、支付并导出薪资批次。',
  refresh: '刷新',
  loading: '正在加载薪资',
  header: {
    title: '薪资运营',
    subtitle: '按组织结构和辖区规则审核并执行薪资批次。',
    preferences: '偏好设置',
  },
  filterBar: { title: '筛选' },
  labels: {
    ...enCA.labels,
    preferences: '薪资偏好设置',
    employees: '用户',
    employee: '用户',
    payrollType: '薪资类型',
    exportCsv: '导出 CSV',
    exportPdf: '导出 PDF',
    close: '关闭',
    cancel: '取消',
    save: '保存',
    print: '打印',
  },
  runLedger: {
    ...enCA.runLedger,
    title: '运营薪资批次',
    subtitle: '需要审核、批准、支付或导出的开放批次。',
    actions: '操作',
    netPayout: '净支付',
  },
} as const satisfies PayrollTranslations;
