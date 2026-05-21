export const zhCA = {
  eyebrow: '学习模式',
  title: '人力运营指南',
  subtitle: '使用人力资源模块，让员工、考勤、薪资和职责保持一致。',
  controlLabel: '人员控制',
  functionsLabel: '标签页功能',
  guideProgressLabel: '指南进度',
  guideProgressCompleteLabel: '已查看',
  previousStepLabel: '上一条建议',
  nextStepLabel: '下一条建议',
  stepIndicatorLabel: '显示建议',
  tabs: {
    collaborators: {
      label: '员工',
      ctaLabel: '查看员工',
      title: '集中管理员工基础资料',
      summary: '把员工档案、角色、单位和雇佣信息整理在一个可靠的运营来源中。',
      value: '可靠的人员基础资料可以提升责任清晰度、薪资控制、考勤跟进和团队可见性。',
      steps: [
        {
          title: '完善每位员工档案',
          description: '统一维护个人、联系、岗位和文件资料，减少人工追踪。',
        },
        {
          title: '按单位和部门区分',
          description: '将员工连接到真实运营区域，让筛选、报表和职责更有意义。',
        },
        {
          title: '保持状态干净',
          description: '定期检查在职和离职员工，减少薪资、权限和报表噪音。',
        },
      ],
    },
    attendance: {
      label: '考勤',
      ctaLabel: '查看考勤',
      title: '让每日出勤可见',
      summary: '跟踪签到、签退、班次和证据，让日常运营不依赖记忆。',
      value: '考勤可见性帮助更早发现缺勤、迟到、覆盖缺口和运营风险。',
      steps: [
        {
          title: '查看每日信号',
          description: '确认谁在岗、谁缺席，以及哪里需要跟进。',
        },
        {
          title: '连接考勤和地点',
          description: '使用地点和 kiosk 减少人工验证，并让考勤贴近真实工作地点。',
        },
        {
          title: '快速处理异常',
          description: '在影响薪资或绩效沟通前处理缺失打卡和异常记录。',
        },
      ],
    },
    control: {
      label: '控制',
      ctaLabel: '打开控制中心',
      title: '有纪律地管理排班和访问',
      summary: '管理排班、kiosk、考勤设置和团队运营例行事项。',
      value: '清晰的控制层减少临时处理，帮助主管保持每日执行一致。',
      steps: [
        {
          title: '清晰定义排班',
          description: '保持班次和运营时间最新，以正确理解考勤和异常。',
        },
        {
          title: '在工作现场使用 kiosk',
          description: '把访问点设置在实际运营附近，降低员工登记考勤的摩擦。',
        },
        {
          title: '检查员工访问',
          description: '让 PIN、人脸和访问设置与每位员工当前角色保持一致。',
        },
      ],
    },
    payroll: {
      label: '薪资',
      ctaLabel: '查看薪资',
      title: '用更干净的输入准备薪资',
      summary: '在支付决策前整理工资、浮动薪酬、扣款和运行背景。',
      value: '干净的薪资输入减少返工，提高信任，并帮助理解人工成本。',
      steps: [
        {
          title: '验证薪资设置',
          description: '计算前确认工资、地区、银行和雇佣数据。',
        },
        {
          title: '控制浮动薪酬',
          description: '记录奖金、佣金和调整，并保留清晰背景。',
        },
        {
          title: '关闭前复核',
          description: '使用摘要在支付或会计问题出现前发现不一致。',
        },
      ],
    },
    announcements: {
      label: '公告',
      ctaLabel: '查看公告',
      title: '传达运营决策',
      summary: '让团队了解政策、提醒、变更和相关公司信息。',
      value: '结构化沟通减少不确定性，帮助团队基于同一信息行动。',
      steps: [
        {
          title: '发布可执行消息',
          description: '说明发生了什么变化、影响谁、需要采取什么行动。',
        },
        {
          title: '细分受众',
          description: '把信息发送给正确群体，减少运营噪音。',
        },
      ],
    },
    assets: {
      label: '资产',
      ctaLabel: '查看资产',
      title: '控制已分配工作资产',
      summary: '跟踪设备、工具和资源，让公司资产连接到负责人。',
      value: '资产可见性减少损失，提升责任感，并清楚显示每位员工持有什么。',
      steps: [
        {
          title: '带责任分配资产',
          description: '将每项重要资产连接到员工、状态和运营背景。',
        },
        {
          title: '检查状态和归还',
          description: '使用资产状态规划替换、回收和交接。',
        },
      ],
    },
    records: {
      label: '记录',
      ctaLabel: '查看记录',
      title: '记录重要人员事件',
      summary: '整理协议、事件、确认和正式 HR 事项。',
      value: '良好记录保护公司，支持公平决策，并保留上下文。',
      steps: [
        {
          title: '记录事件背景',
          description: '记录发生了什么、谁参与、需要什么后续行动。',
        },
        {
          title: '保持证据可追踪',
          description: '附加支持文件，并为未来复核保留清晰历史。',
        },
      ],
    },
    permissions: {
      label: '权限',
      ctaLabel: '查看权限',
      title: '有控制地管理缺勤',
      summary: '整理请假、缺勤、审批和背景，同时保持运营可见性。',
      value: '受控流程帮助管理者规划覆盖，并减少日常人员安排意外。',
      steps: [
        {
          title: '评估运营影响',
          description: '根据覆盖、紧急程度和团队能力评估每个请求。',
        },
        {
          title: '保持审批可追踪',
          description: '使用清晰状态和评论，让决策之后仍然容易理解。',
        },
      ],
    },
    incentives: {
      label: '激励',
      ctaLabel: '查看激励',
      title: '把奖励连接到运营行为',
      summary: '强化能改善团队执行的习惯、结果和责任。',
      value: '清晰激励把动机连接到业务优先级，而不是孤立奖励。',
      steps: [
        {
          title: '定义被奖励的行为',
          description: '把每项激励连接到清晰运营目标，而不只是金额。',
        },
        {
          title: '检查公平和一致性',
          description: '保持标准易懂，让团队信任激励计划。',
        },
      ],
    },
    kpis: {
      label: 'KPI',
      ctaLabel: '查看 HR KPI',
      title: '实时衡量人员运营',
      summary: '读取人数、活动、考勤、薪资和人员运营信号。',
      value: '人员指标帮助领导更早发现问题，并决定哪里需要管理关注。',
      steps: [
        {
          title: '读取人员信号',
          description: '观察在职员工、考勤质量、权限和薪资影响。',
        },
        {
          title: '把指标转化为行动',
          description: '使用 KPI 变化优先安排主管、财务或团队领导跟进。',
        },
      ],
    },
  },
} as const;
