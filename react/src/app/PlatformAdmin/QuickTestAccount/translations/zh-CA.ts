import type { QuickTestAccountCopy } from "./types";

export const zhCAQuickTestCopy: QuickTestAccountCopy = {
  modal: {
    eyebrow: "快速设置",
    title: "创建测试账户",
    description: "填写必要信息并在创建前查看访问权限。",
  },
  steps: { scenario: "场景", details: "详情" },
  progress: {
    label: "测试账户进度",
    step: (current) => `第 ${new Intl.NumberFormat("zh-CA").format(current)} 步，共 2 步 · 演示设置`,
  },
  actions: {
    cancel: "取消",
    previous: "上一步",
    next: "继续",
    review: "查看访问权限",
  },
  scenario: {
    title: "您想测试什么？",
    description: "Indice 将准备建议的模块、容量和试用时长。",
    modules: (count) => `模块：${new Intl.NumberFormat("zh-CA").format(count)}`,
    employees: (count) => `员工：${new Intl.NumberFormat("zh-CA").format(count)}`,
    days: (count) => `时长：${new Intl.NumberFormat("zh-CA").format(count)} 天`,
    options: {
      people: {
        label: "人员和流程",
        description: "用于内部运营的人力资源、任务和关键绩效指标。",
      },
      commerce: {
        label: "销售和库存",
        description: "商业流程、库存、费用和应收账款。",
      },
      complete: {
        label: "完整运营",
        description: "使用所有可用基础模块进行完整测试。",
      },
    },
  },
  details: {
    title: "标识测试账户",
    description: "保留或替换已生成的信息。",
    companyName: "公司名称",
    ownerName: "所有者姓名",
    ownerEmail: "登录邮箱",
    country: "国家",
    employees: "使用 Indice 的人数",
    trial: "试用时长",
    summary: "自动设置",
    scenario: "场景",
    access: "初始访问",
    capacity: "容量",
    notice: "下一步可在创建账户前查看模块、用户和试用时长。",
    companyPrefix: "Indice 演示",
    defaultOwnerName: "测试用户",
  },
  errors: {
    duplicateEmail: "该邮箱已属于其他账户，请使用其他邮箱。",
    noModules: "此场景没有可用基础模块。",
  },
};
