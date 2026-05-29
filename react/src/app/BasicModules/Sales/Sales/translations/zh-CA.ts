import { enCA } from './en-CA';

export const zhCA = {
  ...enCA,
  common: { ...enCA.common, all: '全部', cancel: '取消', close: '关闭', save: '保存销售', view: '查看销售' },
  header: {
    emoji: '💼',
    title: '销售记录',
    subtitle: '跟踪已成交销售、付款凭证、验证进度、库存准备和佣金。',
    columnsAction: '列',
    primaryAction: '新销售',
  },
  filters: {
    ...enCA.filters,
    title: '筛选',
    search: '搜索',
    businessUnit: '业务单元',
    business: '业务',
    period: '期间',
    seller: '销售负责人',
    customer: '客户',
    periodOptions: {
      today: '今天',
      thisWeek: '本周',
      thisMonth: '本月',
      lastMonth: '上月',
      custom: '自定义范围',
    },
  },
  kpis: {
    totalSalesAmount: '销售总额',
    totalCommissions: '佣金总额',
    averageTicket: '平均客单价',
    salesCount: '销售数量',
    pendingFinanceValidation: '待财务验证',
    pendingInventoryMovement: '待库存移动',
    deliveredSales: '已交付销售',
  },
  insight: {
    summary: (totalAmount: string, totalCommissions: string, visible: number, total: number) => (
      `销售摘要：${totalAmount} 销售额 · ${totalCommissions} 佣金 · ${visible} 笔销售 · 显示 ${visible}/${total}。`
    ),
  },
  statuses: {
    ...enCA.statuses,
    paymentEvidence: {
      missing: '缺失',
      uploaded: '已上传',
      under_review: '审核中',
      approved: '已批准',
      rejected: '已拒绝',
    },
  },
  guidance: {
    ...enCA.guidance,
    title: '运营指南',
  },
} as const;
