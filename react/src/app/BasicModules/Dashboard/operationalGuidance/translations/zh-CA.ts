export const zhCA = {
  eyebrow: '学习模式',
  title: '企业配置指南',
  subtitle: '在这里配置运营基础，让 Índice 的其他模块保持一致。',
  controlLabel: '企业控制',
  functionsLabel: '标签页功能',
  guideProgressLabel: '指南进度',
  guideProgressCompleteLabel: '已查看',
  previousStepLabel: '上一条建议',
  nextStepLabel: '下一条建议',
  stepIndicatorLabel: '显示建议',
  tabs: {
    profile: {
      label: '个人资料',
      ctaLabel: '查看资料',
      title: '保持业务身份清晰',
      summary: '完善个人和运营资料，让工作区从可靠的联系方式和身份信息开始。',
      value: '清晰的资料可以减少团队共享责任、通知和运营决策时的混乱。',
      steps: [
        {
          title: '个人信息和偏好',
          description: '管理姓名、电话、语言、照片和偏好，让负责人保持清晰可识别。',
        },
        {
          title: '账户安全',
          description: '更新凭据和访问数据，保持工作区可靠。',
        },
      ],
    },
    'business-structure': {
      label: '企业结构',
      ctaLabel: '配置结构',
      title: '映射公司的真实运营方式',
      summary: '定义单位、业务、地点和主办公室，让所有模块读取同一张运营地图。',
      value: '结构清晰时，考勤、费用、用户和 KPI 都能连接到正确的运营区域。',
      steps: [
        {
          title: '单位、业务和总部',
          description: '组织运营区域，并将 Hedwig Edher 保持为结构的主要参考点。',
        },
        {
          title: '运营地点',
          description: '定义地址和坐标，让考勤、 kiosk 和报表使用正确的位置。',
        },
      ],
    },
    'business-profile': {
      label: '业务成熟度',
      ctaLabel: '查看成熟度',
      title: '诊断运营成熟度',
      summary: '使用业务资料了解公司的强项，以及需要运营关注的区域。',
      value: '该评估帮助 Índice 在增加更多工具、人员或流程之前推荐更好的优先事项。',
      steps: [
        {
          title: '按支柱诊断',
          description: '评估人员、流程、产品和财务，了解公司的真实成熟度。',
        },
        {
          title: '成熟度报告',
          description: '查看信号、风险和建议，确定下一项运营改进优先级。',
        },
      ],
    },
    consulting: {
      label: '咨询',
      ctaLabel: '预约咨询',
      title: '把挑战转化为聚焦的对话',
      summary: '申请与 Indice 团队进行 50 分钟的咨询，并在会前提供背景信息。',
      value: '清晰的申请有助于确认时间，并围绕需要做出的决定准备咨询。',
      steps: [
        { title: '选择时间', description: '提供工作时间内的首选时间和备选时间。' },
        { title: '提供背景', description: '选择主题并说明要解决的挑战或决定。' },
      ],
    },
    'personal-performance': {
      label: '个人绩效',
      ctaLabel: '评估绩效',
      title: '强化执行习惯',
      summary: '检查影响跟进、纪律和决策质量的个人运营习惯。',
      value: '更好的领导习惯有助于维持流程、减少缺口并保持工作可见。',
      steps: [
        {
          title: '习惯评估',
          description: '检查领导力、纪律、沟通和跟进，以理解执行方式。',
        },
        {
          title: '绩效解读',
          description: '将个人结果转化为改善决策、专注和日常控制的信号。',
        },
      ],
    },
    users: {
      label: '用户',
      ctaLabel: '管理用户',
      title: '扩展工作前先控制访问',
      summary: '邀请用户、分配模块，并让权限与每个人的实际责任保持一致。',
      value: '良好的访问控制保护信息，并帮助每位成员专注于需要的工具。',
      steps: [
        {
          title: '邀请和角色',
          description: '添加用户、定义角色，并将每个人连接到其运营责任。',
        },
        {
          title: '模块权限',
          description: '选择每位用户可访问的工具，让工作保持可控和可追踪。',
        },
      ],
    },
  },
} as const;
