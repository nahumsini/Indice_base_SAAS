import type { BusinessProfileTranslations } from "./types";

export const zhCA = {
  title: "企业诊断",
  description: "帮助我们更好地了解您的公司和管理阶段以个性化 Indice。",
  centerTitle: "企业诊断中心",
  centerDescription:
    "通过 4 个支柱发现您公司的管理状况：人员、流程、产品和财务。通过您的回答，我们将使用企业成熟度指数（BMI），这将帮助我们个性化 Indice 背后的建议、模块和最佳合作伙伴。",
  questionCount: "每个 10 个问题",
  questionCountLabel: "诊断包含",
  progress: "企业诊断进度",
  progressOf: "已完成",
  onboarding: {
    answeredProgress: "你已回答 {total} 个问题中的 {answered} 个",
    encouragementMid: "进展很不错",
    encouragementNear: "快完成了",
    sections: {
      people: {
        title: "第 1 步 — 你的团队",
        intro: "让我们了解你的团队如何工作",
        done: "完成 — 我们了解了你的团队",
      },
      processes: {
        title: "第 2 步 — 你的运营方式",
        intro: "让我们了解你的日常运营方式",
        done: "完成 — 我们了解了你的运营方式",
      },
      products: {
        title: "第 3 步 — 你销售的内容",
        intro: "让我们了解你的产品或服务如何进入市场",
        done: "完成 — 我们了解了你销售的内容",
      },
      finance: {
        title: "第 4 步 — 你的财务",
        intro: "让我们了解你如何管理财务数字",
        done: "完成 — 我们了解了你的财务",
      },
    },
  },
  printDiagnosis: "下载 PDF",
  start: "开始",
  continue: "继续",
  doAgain: "重新做",
  reviewAnswers: "查看答案",
  close: "关闭",
  question: "问题",
  of: "的",
  completed: "已完成",
  previous: "上一个",
  next: "下一个",
  finish: "完成",
  restart: "重新开始诊断",
  restartDialog: {
    cancel: "取消",
    confirm: "重新开始测试",
    description: "我们会保留之前的结果并开始一个新版本。",
    title: "重新开始诊断？",
  },
  result: {
    title: '企业诊断结果',
    subtitle: '通过实用分析决定优先改善事项。',
    maturity: '成熟度',
    confidence: '可信度',
    priority: '优先事项',
    quickWin: '快速改善',
    mainRisk: '主要风险',
    recommendedPlan: '建议计划',
  },
  actions: {
    save: "保存",
    saving: "保存中...",
    discard: "放弃更改",
  },
  scoreSummary: {
    title: "诊断得分",
    bmi: "BMI",
    level: "等级",
    answered: "已回答",
    score: "得分",
  },
  messages: {
    loading: "正在加载业务诊断...",
    loadError: "无法加载业务诊断。",
    saveSuccess: "业务诊断已保存。",
    saveError: "无法保存业务诊断。",
    unsavedChanges: "业务诊断中有未保存的更改。",
  },
  pillars: {
    people: {
      title: "人员",
      description: "分析人才、团队结构和沟通。",
    },
    processes: {
      title: "流程",
      description: "评估流程、任务、可扩展性和效率。",
    },
    products: {
      title: "产品",
      description: "分析产品、市场、销售和价值主张。",
    },
    finance: {
      title: "财务",
      description: "评估财务控制、管理和决策。",
    },
  },
  questions: {
    people: [
      {
        question: "您的主要角色是什么？",
        options: ["创始人/CEO", "运营", "财务", "销售/其他"],
      },
      {
        question: "有多少人工作？",
        options: ["只有我", "2 到 5", "6 到 20", "21 或更多"],
      },
      {
        question: "您的团队如何组织？",
        options: ["无结构", "基本角色", "定义区域", "正式组织图"],
      },
      {
        question: "如何分配任务？",
        options: ["即兴", "列表", "结构化分配", "管理系统"],
      },
      {
        question: "绩效评估？",
        options: ["从不", "出问题时", "每周", "使用 KPI"],
      },
      {
        question: "委派？",
        options: ["全部自己做", "委派并监督", "有控制地委派", "自主团队"],
      },
      {
        question: "内部沟通？",
        options: ["非正式", "聊天", "会议", "正式工具"],
      },
      { question: "会议频率？", options: ["从不", "零星", "每周", "频繁"] },
      {
        question: "职责明确���？",
        options: ["不清楚", "有点清楚", "相当清楚", "完全清楚"],
      },
      {
        question: "整合的容易程度？",
        options: ["非常困难", "困难", "中等", "容易"],
      },
    ],
    processes: [
      { question: "记录的流程？", options: ["无", "一些", "大多数", "完全"] },
      { question: "任务管理？", options: ["即兴", "列表", "工具", "正式系统"] },
      { question: "进度监控？", options: ["未监控", "偶尔", "报告", "KPI"] },
      {
        question: "自动化？",
        options: ["手动", "孤立工具", "部分自动化", "高度自动化"],
      },
      {
        question: "可复制性？",
        options: ["非常困难", "需要努力", "可能", "容易"],
      },
      {
        question: "时间浪费在哪里？",
        options: ["手工", "协调", "信息", "跟进"],
      },
      { question: "对人的依赖？", options: ["完全", "相当多", "一些", "很少"] },
      {
        question: "流程清晰度？",
        options: ["不清楚", "有点清楚", "相当清楚", "完全清楚"],
      },
      {
        question: "错误管理？",
        options: ["反应", "非正式", "审查", "持续改进"],
      },
      { question: "可扩展性？", options: ["无", "低", "中", "高"] },
    ],
    products: [
      { question: "您卖什么？", options: ["服务", "产品", "数字", "混合"] },
      { question: "客户类型？", options: ["B2C", "B2B", "政府", "混合"] },
      { question: "主要收入？", options: ["直接销售", "服务", "订阅", "合同"] },
      { question: "多样化？", options: ["一个", "一些", "多条线", "广泛"] },
      { question: "价格定义？", options: ["直觉", "竞争", "成本", "策略"] },
      {
        question: "绩效跟踪？",
        options: ["未测量", "仅销售", "销售+盈利", "指标"],
      },
      {
        question: "价值主张？",
        options: ["不清楚", "有点清楚", "相当清楚", "非常清楚"],
      },
      { question: "客户反馈？", options: ["无", "非正式", "调查", "分析"] },
      {
        question: "产品演变？",
        options: ["即兴", "偶尔变化", "计划", "路线图"],
      },
      {
        question: "商业优先级？",
        options: ["客户", "当前销售", "盈利能力", "扩展"],
      },
    ],
    finance: [
      {
        question: "财务控制？",
        options: ["无结构", "Excel", "软件", "集成系统"],
      },
      { question: "数字审查？", options: ["从不", "每月", "每周", "每天"] },
      { question: "现金流？", options: ["未控制", "反应", "审查", "预测"] },
      {
        question: "明确的成本？",
        options: ["不清楚", "大约", "相当清楚", "完全控制"],
      },
      { question: "利润率？", options: ["不知道", "估计", "清楚", "完全测量"] },
      { question: "财务决策？", options: ["直觉", "经验", "数据", "模型"] },
      {
        question: "可预测的收入？",
        options: ["非常可变", "可变", "稳定", "非常稳定"],
      },
      { question: "债务管理？", options: ["无控制", "基本", "策略", "优化"] },
      { question: "危机准备？", options: ["无", "低", "中", "高"] },
      {
        question: "税务合规？",
        options: ["无控制", "延迟", "最新", "税务策略"],
      },
    ],
  },
} as const satisfies BusinessProfileTranslations;
