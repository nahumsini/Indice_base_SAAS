export const zhCA = {
  eyebrow: '学习模式',
  title: '企业配置指南',
  subtitle: '在这里配置运营基础，让 Índice 的其他模块保持一致。',
  focusLabel: '当前重点',
  actionsLabel: '建议操作',
  tabsLabel: '配置区域',
  tabs: {
    profile: {
      label: '个人资料',
      title: '保持业务身份清晰',
      summary: '完善个人和运营资料，让工作区从可靠的联系方式和身份信息开始。',
      value: '清晰的资料可以减少团队共享责任、通知和运营决策时的混乱。',
      steps: [
        {
          title: '确认个人信息',
          description: '保持姓名、电话、语言和照片为最新状态，以便快速识别负责人。',
        },
        {
          title: '检查访问偏好',
          description: '有序的个人资料让后续配置更容易审计和支持。',
        },
      ],
    },
    'business-structure': {
      label: '企业结构',
      title: '映射公司的真实运营方式',
      summary: '定义单位、业务、地点和主办公室，让所有模块读取同一张运营地图。',
      value: '结构清晰时，考勤、费用、用户和 KPI 都能连接到正确的运营区域。',
      steps: [
        {
          title: '确认 Hedwig Edher 为主办公室',
          description: '将主要地点作为企业结构的运营锚点。',
        },
        {
          title: '有目的地创建单位和业务',
          description: '只添加有助于报表、责任分配或日常控制的运营区域。',
        },
      ],
    },
    'business-profile': {
      label: '业务成熟度',
      title: '诊断运营成熟度',
      summary: '使用业务资料了解公司的强项，以及需要运营关注的区域。',
      value: '该评估帮助 Índice 在增加更多工具、人员或流程之前推荐更好的优先事项。',
      steps: [
        {
          title: '按照运营现实回答',
          description: '真实答案比理想化答案能产生更好的建议。',
        },
        {
          title: '查看改进信号',
          description: '使用诊断结果决定公司下一步应专业化的内容。',
        },
      ],
    },
    'personal-performance': {
      label: '个人绩效',
      title: '强化执行习惯',
      summary: '检查影响跟进、纪律和决策质量的个人运营习惯。',
      value: '更好的领导习惯有助于维持流程、减少缺口并保持工作可见。',
      steps: [
        {
          title: '评估执行节奏',
          description: '找出跟进、优先级或沟通可以更稳定的地方。',
        },
        {
          title: '把洞察变成习惯',
          description: '使用结果建立改善日常运营控制的小习惯。',
        },
      ],
    },
    users: {
      label: '用户',
      title: '扩展工作前先控制访问',
      summary: '邀请用户、分配模块，并让权限与每个人的实际责任保持一致。',
      value: '良好的访问控制保护信息，并帮助每位成员专注于需要的工具。',
      steps: [
        {
          title: '邀请正确的负责人',
          description: '从负责公司配置、人力资源、财务、运营和分析的人开始。',
        },
        {
          title: '按责任分配模块',
          description: '当聚焦的工作区能带来更好控制时，避免过宽的访问权限。',
        },
      ],
    },
  },
} as const;
