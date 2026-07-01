import { enCA } from './en-CA';
import type { PermissionsTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '请假与许可',
  subtitle: '管理申请、缺勤、休假和审批状态。',
  actions: { columns: '列', addRequest: '新增申请', close: '关闭', approve: '批准', reject: '拒绝', delete: '删除', view: '查看', submitting: '正在提交...' },
  columns: { folio: '单号', employee: '员工', type: '类型', payrollTreatment: '薪资', startDate: '开始日期', endDate: '结束日期', days: '天数', status: '状态', actions: '操作' },
  pagination: {
    pageSize: '每页行数',
    showing: (start: number, end: number, total: number) => `显示 ${start}-${end} 条，共 ${total} 条申请`,
    page: (current: number, total: number) => `第 ${current} 页，共 ${total} 页`,
    previous: '上一页',
    next: '下一页',
  },
  filters: { title: '筛选', searchLabel: '搜索申请', searchPlaceholder: '员工或单号', status: '状态', allStatuses: '所有状态', type: '类型', allTypes: '所有类型', payrollTreatment: '薪资处理', allPayrollTreatments: '所有处理', employee: '员工', allEmployees: '所有员工' },
  kpis: {
    total: '申请总数',
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    paid: '带薪',
    unpaid: '无薪',
    thisMonth: '本月',
    visibleAfterFilters: '筛选后可见',
    approvalRate: (rate: number) => `批准率 ${rate}%`,
    summary: (approved: number, pending: number, rejected: number, visible: number, total: number) =>
      `许可申请摘要：已批准 ${approved} · 待处理 ${pending} · 已拒绝 ${rejected} · 共 ${total} 条，显示 ${visible} 条。`,
  },
  types: { vacation: '休假', sick_leave: '病假', personal: '个人', maternity: '产假/陪产假', bereavement: '丧假', unpaid: '无薪假', other: '其他' },
  status: { pending: '待处理', approved: '已批准', rejected: '已拒绝' },
  payrollTreatment: { paid: '带薪', unpaid: '无薪' },
  columnsModal: { title: '表格列', subtitle: '选择此视图中显示的许可申请列。', close: '关闭列弹窗', required: '必选', done: '完成' },
  empty: { title: '暂无申请', description: '没有可显示的许可申请。' },
  modal: { ...enCA.modal, title: '提交许可申请', subtitle: '填写表单以提交新的许可申请。', permissionType: '许可类型 *', selectPermissionType: '选择许可类型', payrollTreatment: '薪资处理 *', payrollTreatmentDescription: '定义批准天数是否计入带薪工资或从带薪天数中扣除。', startDate: '开始日期 *', endDate: '结束日期 *', halfDay: '半天', halfDayDescription: '仅申请最后一天半天', totalDays: '总天数：', reason: '原因 *', reasonPlaceholder: '请简要说明申请原因...', attachment: '附件（可选）', acceptedFormats: '支持格式：PDF、DOC、DOCX、JPG、PNG', fileTooLarge: '文件大小必须不超过 10 MB。', uploadFile: '上传文件', cancel: '取消', submit: '提交申请', submitting: '正在提交...' },
  detail: { ...enCA.detail, title: '许可申请', employeeInformation: '员工信息', type: '类型', payrollTreatment: '薪资处理', fallbackAttachment: 'medical-certificate-zh.pdf', startDate: '开始日期', endDate: '结束日期', duration: '时长', day: '天', days: '天', reason: '原因', attachments: '附件', noAttachments: '此申请没有上传附件。', reviewNotes: '审核备注', reviewedBy: '审核人', reviewedAt: '审核时间', created: '创建：', updated: '最后更新：' },
  loading: { title: '正在加载许可申请', description: '正在获取最新申请。', savingTitle: '正在保存申请', savingDescription: '正在提交申请和支持文件。', reviewingTitle: '正在更新申请', reviewingDescription: '正在应用审批状态变更。', deletingTitle: '正在删除申请', deletingDescription: '正在移除待处理申请。', detailsTitle: '正在加载申请详情', detailsDescription: '正在获取最新申请信息。' },
  errors: { load: '无法加载许可申请。', create: '无法提交许可申请。', approve: '无法批准许可申请。', reject: '无法拒绝许可申请。', delete: '无法删除许可申请。', attachment: '无法上传许可附件。', details: '无法加载许可详情。' },
  success: { created: '许可申请已提交。', approved: '许可申请已批准。', rejected: '许可申请已拒绝。', deleted: '许可申请已删除。' },
} as const satisfies PermissionsTranslations;
