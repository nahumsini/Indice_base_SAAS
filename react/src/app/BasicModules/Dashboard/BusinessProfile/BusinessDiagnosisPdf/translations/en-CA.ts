export const enCA = {
  locale: 'en-CA',
  fileName: 'Business Maturity Index (BMI).pdf',
  companyFallback: 'Current business',
  questionsLabel: 'questions',
  scoreLabel: 'BMI',
  outOf100: 'out of 100',
  levelNames: {
    level1: 'Initial',
    level2: 'Emerging',
    level3: 'Organized',
    level4: 'Scalable',
    level5: 'Optimized',
  },
  progressLevels: ['Initial', 'Organized', 'Scalable', 'Optimized'],
  moduleLabels: {
    people: 'Human Resources',
    processes: 'Processes and tasks',
    products: 'CRM / Point of Sale',
    finance: 'Expenses and KPIs',
  },
  summaryTemplate:
    'The company scores {score}/100. Its strongest pillar is {strongest}, while the first area to reinforce is {weakest}.',
  overallInterpretations: {
    critical:
      'The business needs a basic control layer before scaling: clear owners, visible routines, and minimum decision data.',
    emerging:
      'There is operating movement, but the business still depends on informal follow-up and personal judgement.',
    organized:
      'The operation already has a working base, but it still needs stronger visibility, ownership, and repeatable rhythm.',
    scalable:
      'The company has a solid platform to grow, as long as it protects discipline in the weakest operating fronts.',
    optimized:
      'The company shows strong operating maturity. The challenge is maintaining standards while complexity increases.',
  },
  pillarInterpretations: {
    critical: '{section} needs immediate structure before it can support growth.',
    emerging: '{section} has useful practices, but they are not yet consistent enough.',
    organized: '{section} is operating with a base that can be strengthened and measured.',
    scalable: '{section} already supports growth with relatively clear routines.',
    optimized: '{section} is a strength that can be used as a model for the rest of the business.',
  },
  completenessNote: {
    empty: 'Insufficient data: answer the assessment to generate an operating interpretation.',
    template: 'Read based on {answered} of {total} answers. Diagnostic confidence: {confidence}%.',
  },
  pillarFallbacks: {
    people: {
      risk: 'The operating rhythm can depend too much on personal coordination and unclear ownership.',
      action: 'Clarify owners, decision rights, and one review routine for the most recurring work.',
    },
    processes: {
      risk: 'Execution can slow down when tasks, blockers, and owners are not visible enough.',
      action: 'Create a visible workflow with owner, due date, status, and closing criteria.',
    },
    products: {
      risk: 'Commercial effort can spread across offers or customers without enough focus on return.',
      action: 'Prioritize the offer, customer segment, and margin signal that should guide growth.',
    },
    finance: {
      risk: 'Decisions can be made without enough visibility into cash, cost, margin, or profitability.',
      action: 'Connect price, direct cost, margin, and weekly cash before approving growth decisions.',
    },
  },
  consulting: {
    nextMove: 'If you only do one thing',
  },
  editorial: {
    action: 'Action',
    answered: 'Answered',
    brand: 'INDICE',
    businessDiagnosis: 'Business Diagnosis',
    confidence: 'Confidence',
    date: 'Date',
    decision: 'Decision',
    evidence: 'Evidence',
    executiveFindings: 'Executive findings',
    executiveFindingsCaption:
      'Three operating conclusions to focus the next leadership conversation.',
    expectedResult: 'Expected result',
    focus: 'Focus',
    footer: 'Generated from Business Profile answers',
    generatedFrom: 'Generated from Business Profile answers',
    insightLabel: 'Executive read',
    maturity: 'Maturity',
    maturityView: 'Maturity view',
    maturityViewCaption: 'Capability comparison by pillar and overall maturity progression.',
    module: 'Suggested module',
    pillar: 'Pillar',
    pillarBreakdown: 'Pillar breakdown',
    pillarBreakdownCaption:
      'Operational read of each front: current capability, risk, and immediate action.',
    preparedFor: 'Prepared for',
    priorityDecisions: 'Priority decisions',
    priorityDecisionsCaption:
      'These are management decisions, not isolated tasks, to raise control and scalability.',
    problem: 'Problem',
    reportTitle: 'Operational Maturity Report',
    risk: 'Risk',
    roadmap: 'Executive roadmap',
    roadmapCaption: 'Suggested sequence to turn the diagnosis into visible execution.',
    scoreSummary: 'Maturity summary',
  },
  insightTypeLabels: {
    critical_dependency: 'Critical dependency',
    growth_risk: 'Growth risk',
    highest_roi_area: 'Highest ROI area',
    main_risk: 'Main risk',
    operational_bottleneck: 'Bottleneck',
    quick_win: 'Quick win',
    single_priority: 'Single priority',
  },
  insightFallbacks: {
    critical_dependency: {
      title: 'Critical dependency to reduce',
      message: 'The operating model depends too much on informal ownership or key people.',
      businessImpact: 'Growth becomes fragile when continuity depends on memory, availability, or individual judgement.',
      recommendedAction: 'Define one accountable owner, one backup, and one visible routine for the most sensitive workflow.',
    },
    growth_risk: {
      title: 'Growth could amplify current friction',
      message: 'The business can add more volume before its control routines are ready.',
      businessImpact: 'More customers, people, or locations may increase variation, rework, and coordination cost.',
      recommendedAction: 'Standardize the operating routine that most affects customer experience, team execution, or cash.',
    },
    highest_roi_area: {
      title: 'Highest operating ROI area',
      message: 'The best return is in improving the operating front with the clearest evidence of friction.',
      businessImpact: 'Focused improvement creates more value than spreading effort across too many initiatives.',
      recommendedAction: 'Choose one measurable improvement and assign ownership, date, and review rhythm.',
    },
    main_risk: {
      title: 'Main operating risk',
      message: 'The company needs more visible control over the operating signals detected in the assessment.',
      businessImpact: 'Without visibility, decisions can arrive late or depend too much on personal judgement.',
      recommendedAction: 'Turn the highest-risk signal into one concrete decision with an owner and weekly follow-up.',
    },
    operational_bottleneck: {
      title: 'Operating bottleneck',
      message: 'The operation shows friction in how work is coordinated, followed up, or measured.',
      businessImpact: 'Execution can slow down as volume increases, even if the team is working hard.',
      recommendedAction: 'Move recurring work into a visible system with owner, date, status, and closing criteria.',
    },
    quick_win: {
      title: 'Immediate quick win',
      message: 'The fastest improvement is to make active work easier to see and follow.',
      businessImpact: 'A small visibility change can reduce follow-up time and improve accountability quickly.',
      recommendedAction: 'Create a single view of active tasks, blocked items, and accountable owners this week.',
    },
    single_priority: {
      title: 'Single priority',
      message: 'The priority is to address the most concrete operating constraint before adding new initiatives.',
      businessImpact: 'Doing more without removing the constraint can create more noise than progress.',
      recommendedAction: 'Pick one constraint, one owner, one metric, and one review date.',
    },
  },
  roadmapSteps: [
    { label: '7 days', title: 'Visible control' },
    { label: '30 days', title: 'Operating priority' },
    { label: '60 days', title: 'Prepare to grow' },
  ],
  roadmapOutcomes: [
    'Owners and first action aligned to reduce ambiguity.',
    'Visible operating rhythm to follow up without depending on memory or chats.',
    'Control base ready to scale with less manual supervision.',
  ],
} as const;
