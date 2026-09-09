import type { AccountCreationCopy } from "./types";

export const zhCACopy: AccountCreationCopy = {
  steps: { company: "公司", owner: "所有者", access: "访问权限" },
  modal: {
    eyebrow: "Root 直接创建", title: "创建 Indice 账户",
    description: "通过三个步骤设置公司、所有者和访问权限。",
    successTitle: "账户已准备好交付",
    successDescription: "请复制凭据并通过安全渠道分享。",
  },
  actions: {
    cancel: "取消", previous: "返回", next: "下一步", validating: "正在验证",
    create: "创建并启用", creating: "正在创建账户…", signInAgain: "重新登录",
    finish: "完成", manageAccount: "管理账户", generate: "生成",
    showPassword: "显示密码", hidePassword: "隐藏密码",
  },
  progress: {
    label: "账户创建进度",
    step: (current, total, modules) => `第 ${new Intl.NumberFormat("zh-CA").format(current)} 步，共 ${new Intl.NumberFormat("zh-CA").format(total)} 步 · 模块：${new Intl.NumberFormat("zh-CA").format(modules)}`,
    ready: (companyId) => `公司 #${companyId} · 访问权限已准备交付`,
  },
  company: {
    title: "公司", description: "新账户的商业身份信息。",
    name: "公司名称", namePlaceholder: "例如：远景集团", country: "国家",
    accountType: "账户类型", superAdmin: "超级管理员 · 客户", distributor: "分销商",
    industry: "行业（可选）", employees: "准确员工人数",
    employeesPlaceholder: "例如：18",
    employeesHint: "包括所有者及所有需要访问 Indice 的人员。",
    unspecified: "未指定",
  },
  owner: {
    title: "所有者和访问", description: "公司所有者的初始凭据。",
    name: "所有者姓名（可选）", namePlaceholder: "姓名",
    email: "电子邮箱", emailPlaceholder: "owner@company.com", phone: "电话（可选）",
    phonePlaceholder: "+1 416 555 0123", password: "临时密码",
  },
  access: {
    title: "方案和模块", description: "仅选择需要的初始访问权限。",
    modules: "可用模块",
    baseGroup: "基础套餐",
    baseGroupDescription: "基础模块总数决定商业套餐。",
    addonGroup: "附加模块",
    addonGroupDescription: "试用结束后将分别计费。",
    moduleFallback: "模块业务访问权限。",
    noModules: "没有已启用的基础模块。请查看目录与模块。", accessType: "访问类型",
    demo: "限时演示", permanent: "永久赠送",
    capacityTitle: "已计算的套餐和容量",
    capacityDescription: "Indice 通过套餐和所需额外名额覆盖所填员工。",
    package: "基础套餐", requiredUsers: "所需员工人数",
    packageName: (moduleCount) => moduleCount <= 0
      ? "无套餐"
      : moduleCount === 1
        ? "1 个模块"
        : moduleCount === 2
          ? "2 个模块"
          : moduleCount === 3
            ? "3 个模块"
            : "4 个或更多模块",
    includedUsers: "包含名额", additionalUsers: "额外用户",
    duration: "演示时长", days: (days) => `${new Intl.NumberFormat("zh-CA").format(days)} 天`,
    noExpiration: "无到期日期",
  },
  context: { company: "公司", owner: "所有者", directAccount: "直接创建" },
  notices: {
    restored: "已恢复进度并生成新的临时密码。",
    audit: "此操作会创建真实公司并记入审计日志，不会创建 Stripe 费用。",
  },
  errors: {
    password: "密码至少需要 10 个字符，且不得超过 72 字节。",
    invalidPhone: "请输入适用于所选国家的有效电话号码。",
    duplicateEmail: "该邮箱属于其他账户。请使用不同邮箱继续。",
    selectModule: "请至少选择一个模块来创建账户。",
    createFailed: "无法创建账户。",
    modulesNotApplied: "账户已创建，但未确认所选模块。请打开管理账户以完成访问设置。",
    sessionExpired: "Root 会话已过期。已保留进度，但未保存密码。",
  },
  success: {
    created: (companyId) => `公司 #${companyId} · 所有者创建成功`,
    initialAccess: "初始访问", oneTimePassword: "密码仅在此显示。",
    copyAll: "复制详情", copiedAll: "详情已复制", copy: "复制", copied: "已复制",
    loginPage: "登录页面", company: "公司", email: "电子邮件", password: "临时密码",
    loadedModules: "已加载模块", loadedModulesDescription: (count) => `账户已确认模块：${new Intl.NumberFormat("zh-CA").format(count)}`,
    accessDataTitle: "Indice 访问信息", securityReminder: "为安全起见，请登录后更改密码。",
    securityShare: "请用户在仪表板 → 个人资料 → 安全中更改密码。Indice 不会通过邮件发送密码，也不会将其存入 Root 审计日志。",
  },
};
