import type { DistributorPortalCopy } from './types';

export const zhCA: DistributorPortalCopy = {
  navigation: { portalName: '分销商门户', local: '本地', backToErp: '返回 ERP' },
  tabs: { contractsAccess: '合同与访问权限', consulting: '咨询' },
  header: { eyebrow: '分销运营', title: '合同与访问权限', subtitle: '跟踪关联客户从首次访问到有效合同的全过程。' },
  actions: { refresh: '刷新', refreshing: '正在刷新…', view: '查看客户', manage: '管理', addClient: '添加客户', extendTrial: '延长试用', close: '关闭' },
  metrics: { totalClients: '客户组合', prospects: '潜在客户', demosTrials: '演示与试用', activeContracts: '有效合同', attention: '需要关注' },
  filters: { title: '商业客户组合', subtitle: '按公司、所有者邮箱或账号查找。', matches: '个客户匹配', search: '搜索', searchPlaceholder: '公司、邮箱或账号', stage: '商业阶段', allStages: '所有阶段' },
  table: { title: '潜在客户与客户', subtitle: '这里只显示正式关联到您分销公司的账户。', company: '公司', stage: '阶段', access: '访问与模块', contract: '合同', users: '用户', nextEvent: '下个事件', action: '操作', noResults: '没有客户匹配当前筛选条件。', noClients: '关联的客户组合仍为空。', noPlan: '无合同', noModules: '未启用模块', noDate: '未安排日期', daysRemaining: '天剩余', members: '活跃', seats: '容量', review: '检查付款' },
  detail: { eyebrow: '客户组合账户', subtitle: '只读的商业与访问摘要。', contact: '所有者联系方式', country: '国家', stage: '商业阶段', access: '访问状态', contract: '合同', billing: '账单状态', modules: '已启用模块', capacity: '用户容量', nextEvent: '下个事件', directPortfolio: '此账户已直接关联到您的分销公司。' },
  states: { PROSPECT: '潜在客户', DEMO: '演示', TRIAL: '试用', ACTIVE: '有效', ATTENTION: '需关注', INACTIVE: '无效' },
  errors: { title: '无法加载客户组合', retry: '重试', forbidden: '此公司无权访问分销商门户。' },
};
