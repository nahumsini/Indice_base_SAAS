import type {
  AggregatedHumanTag,
  HumanInsightType,
  HumanOperationalProfile,
  HumanPatternMatch,
  HumanPerformanceEngineLabels,
  HumanPerformanceInsight,
  HumanPerformanceRoadmapItem,
} from './types';
import { getHumanEngineLanguage, type HumanEngineLanguage } from './localization';

const LABELS: Record<HumanEngineLanguage, HumanPerformanceEngineLabels> = {
  es: {
    action: 'Accion',
    burnoutRisk: 'Riesgo burnout',
    confidence: 'Confianza del diagnostico',
    dependency: 'Dependencia detectada',
    evidence: 'Evidencia',
    firstBoundary: 'Primer limite',
    habitRoi: 'Habito de mayor ROI',
    mainRisk: 'Riesgo operativo personal',
    pattern: 'Patron dominante',
    sustainability: 'Riesgo de sostenibilidad',
    wearSource: 'Fuente de desgaste',
    whyItMatters: 'Por que importa',
  },
  en: {
    action: 'Action',
    burnoutRisk: 'Burnout risk',
    confidence: 'Diagnostic confidence',
    dependency: 'Detected dependency',
    evidence: 'Evidence',
    firstBoundary: 'First boundary',
    habitRoi: 'Highest ROI habit',
    mainRisk: 'Personal operating risk',
    pattern: 'Dominant pattern',
    sustainability: 'Sustainability risk',
    wearSource: 'Wear source',
    whyItMatters: 'Why it matters',
  },
  fr: {
    action: 'Action',
    burnoutRisk: 'Risque d’épuisement',
    confidence: 'Confiance du diagnostic',
    dependency: 'Dépendance détectée',
    evidence: 'Évidence',
    firstBoundary: 'Première limite',
    habitRoi: 'Habitude au ROI le plus élevé',
    mainRisk: 'Risque opérationnel personnel',
    pattern: 'Patron dominant',
    sustainability: 'Risque de soutenabilité',
    wearSource: 'Source d’usure',
    whyItMatters: 'Pourquoi cela compte',
  },
  pt: {
    action: 'Ação',
    burnoutRisk: 'Risco de burnout',
    confidence: 'Confiança do diagnóstico',
    dependency: 'Dependência detectada',
    evidence: 'Evidência',
    firstBoundary: 'Primeiro limite',
    habitRoi: 'Hábito de maior ROI',
    mainRisk: 'Risco operacional pessoal',
    pattern: 'Padrão dominante',
    sustainability: 'Risco de sustentabilidade',
    wearSource: 'Fonte de desgaste',
    whyItMatters: 'Por que importa',
  },
  ko: {
    action: '조치',
    burnoutRisk: '번아웃 위험',
    confidence: '진단 신뢰도',
    dependency: '감지된 의존성',
    evidence: '근거',
    firstBoundary: '첫 번째 경계',
    habitRoi: '가장 ROI가 높은 습관',
    mainRisk: '개인 운영 위험',
    pattern: '지배적 패턴',
    sustainability: '지속 가능성 위험',
    wearSource: '소모의 주요 원인',
    whyItMatters: '중요한 이유',
  },
  zh: {
    action: '行动',
    burnoutRisk: '倦怠风险',
    confidence: '诊断信心',
    dependency: '检测到的依赖',
    evidence: '依据',
    firstBoundary: '第一个边界',
    habitRoi: '最高 ROI 习惯',
    mainRisk: '个人运营风险',
    pattern: '主导模式',
    sustainability: '可持续性风险',
    wearSource: '主要消耗来源',
    whyItMatters: '为什么重要',
  },
};

const TYPE_LABELS: Record<HumanEngineLanguage, Record<HumanInsightType, string>> = {
  es: {
    main_personal_operational_risk: 'Riesgo operativo personal principal',
    dominant_pattern: 'Patron dominante',
    wear_source: 'Fuente principal de desgaste',
    detected_dependency: 'Dependencia detectada',
    sustainability_risk: 'Riesgo de sostenibilidad',
    burnout_risk: 'Riesgo burnout',
    highest_roi_habit: 'Habito de mayor ROI',
    first_boundary: 'Limite que debe instalar primero',
    immediate_action: 'Accion inmediata',
  },
  en: {
    main_personal_operational_risk: 'Main personal operating risk',
    dominant_pattern: 'Dominant pattern',
    wear_source: 'Primary wear source',
    detected_dependency: 'Detected dependency',
    sustainability_risk: 'Sustainability risk',
    burnout_risk: 'Burnout risk',
    highest_roi_habit: 'Highest ROI habit',
    first_boundary: 'First boundary to install',
    immediate_action: 'Immediate action',
  },
  fr: {
    main_personal_operational_risk: 'Risque opérationnel personnel principal',
    dominant_pattern: 'Patron dominant',
    wear_source: 'Source principale d’usure',
    detected_dependency: 'Dépendance détectée',
    sustainability_risk: 'Risque de soutenabilité',
    burnout_risk: 'Risque d’épuisement',
    highest_roi_habit: 'Habitude au ROI le plus élevé',
    first_boundary: 'Première limite à installer',
    immediate_action: 'Action immédiate',
  },
  pt: {
    main_personal_operational_risk: 'Principal risco operacional pessoal',
    dominant_pattern: 'Padrão dominante',
    wear_source: 'Principal fonte de desgaste',
    detected_dependency: 'Dependência detectada',
    sustainability_risk: 'Risco de sustentabilidade',
    burnout_risk: 'Risco de burnout',
    highest_roi_habit: 'Hábito de maior ROI',
    first_boundary: 'Primeiro limite a instalar',
    immediate_action: 'Ação imediata',
  },
  ko: {
    main_personal_operational_risk: '주요 개인 운영 위험',
    dominant_pattern: '지배적 패턴',
    wear_source: '주요 소모 원인',
    detected_dependency: '감지된 의존성',
    sustainability_risk: '지속 가능성 위험',
    burnout_risk: '번아웃 위험',
    highest_roi_habit: '가장 ROI가 높은 습관',
    first_boundary: '먼저 설치할 경계',
    immediate_action: '즉시 실행할 조치',
  },
  zh: {
    main_personal_operational_risk: '主要个人运营风险',
    dominant_pattern: '主导模式',
    wear_source: '主要消耗来源',
    detected_dependency: '检测到的依赖',
    sustainability_risk: '可持续性风险',
    burnout_risk: '倦怠风险',
    highest_roi_habit: '最高 ROI 习惯',
    first_boundary: '首先建立的边界',
    immediate_action: '立即行动',
  },
};

const INSIGHT_ORDER: HumanInsightType[] = [
  'main_personal_operational_risk',
  'dominant_pattern',
  'wear_source',
  'detected_dependency',
  'sustainability_risk',
  'burnout_risk',
  'highest_roi_habit',
  'first_boundary',
  'immediate_action',
];

const patternToInsight = (
  pattern: HumanPatternMatch,
  language: HumanEngineLanguage,
): HumanPerformanceInsight => ({
  type: pattern.type,
  title: pattern.title || TYPE_LABELS[language][pattern.type],
  severity: pattern.severity,
  message: pattern.message,
  evidence: pattern.evidence,
  operationalImpact: pattern.risk,
  recommendedAction: pattern.action,
});

const tagToInsight = (
  tag: AggregatedHumanTag,
  type: HumanInsightType,
  language: HumanEngineLanguage,
): HumanPerformanceInsight => ({
  type,
  title: type === 'immediate_action' ? TYPE_LABELS[language][type] : tag.label,
  severity: Math.min(Math.max(tag.maxSeverity, 1), 4) as HumanPerformanceInsight['severity'],
  section: tag.sections[0],
  message: tag.operationalRisk,
  evidence: tag.evidence.slice(0, 3).map((evidence) => `${evidence.question}: ${evidence.answer}`),
  operationalImpact: tag.operationalRisk,
  recommendedAction: tag.recommendedAction,
});

const profileToInsight = (
  profile: HumanOperationalProfile,
  type: HumanInsightType,
  language: HumanEngineLanguage,
): HumanPerformanceInsight => ({
  type,
  title: type === 'dominant_pattern' ? profile.title : TYPE_LABELS[language][type],
  severity: 2,
  message: type === 'dominant_pattern' ? profile.dominantPattern : profile.mainRisk,
  evidence: [],
  operationalImpact: profile.continuationRisk,
  recommendedAction: profile.quickWin,
});

const getPatternByType = (
  patterns: HumanPatternMatch[],
  type: HumanInsightType,
) => patterns.find((pattern) => pattern.type === type);

const getTagByPriority = (
  tags: AggregatedHumanTag[],
  predicate: (tag: AggregatedHumanTag) => boolean,
) => tags.find(predicate);

const buildLowConfidenceInsights = (language: HumanEngineLanguage): HumanPerformanceInsight[] => {
  const lowConfidenceCopy: Record<HumanEngineLanguage, Array<Omit<HumanPerformanceInsight, 'severity' | 'evidence'>>> = {
    es: [
      {
        type: 'main_personal_operational_risk',
        title: 'Lectura incompleta',
        message: 'Aun no hay suficiente evidencia para concluir el riesgo operativo personal principal.',
        operationalImpact: 'Con pocas respuestas, el reporte podria confundir sintomas aislados con un patron real.',
        recommendedAction: 'Completar las cuatro areas antes de usar el reporte como plan de ajuste.',
      },
      {
        type: 'immediate_action',
        title: 'Completar datos criticos',
        message: 'La accion inmediata es terminar la captura para elevar precision.',
        operationalImpact: 'Una lectura completa permite detectar dependencias, desgaste y sostenibilidad con menos ruido.',
        recommendedAction: 'Responder al menos 70% de la evaluacion y volver a generar el PDF.',
      },
    ],
    en: [
      {
        type: 'main_personal_operational_risk',
        title: 'Incomplete read',
        message: 'There is not enough evidence yet to conclude the main personal operating risk.',
        operationalImpact: 'With few answers, the report could confuse isolated symptoms with a real pattern.',
        recommendedAction: 'Complete the four areas before using the report as an adjustment plan.',
      },
      {
        type: 'immediate_action',
        title: 'Complete critical data',
        message: 'The immediate action is finishing capture to raise precision.',
        operationalImpact: 'A complete read detects dependencies, wear, and sustainability with less noise.',
        recommendedAction: 'Answer at least 70% of the assessment and generate the PDF again.',
      },
    ],
    fr: [
      {
        type: 'main_personal_operational_risk',
        title: 'Lecture incomplète',
        message: 'Il n’y a pas encore assez d’évidence pour conclure le risque opérationnel personnel principal.',
        operationalImpact: 'Avec peu de réponses, le rapport peut confondre des symptômes isolés avec un vrai patron.',
        recommendedAction: 'Compléter les quatre zones avant d’utiliser le rapport comme plan d’ajustement.',
      },
      {
        type: 'immediate_action',
        title: 'Compléter les données critiques',
        message: 'L’action immédiate est de terminer la saisie pour augmenter la précision.',
        operationalImpact: 'Une lecture complète détecte dépendances, usure et soutenabilité avec moins de bruit.',
        recommendedAction: 'Répondre à au moins 70% de l’évaluation et générer le PDF à nouveau.',
      },
    ],
    pt: [
      {
        type: 'main_personal_operational_risk',
        title: 'Leitura incompleta',
        message: 'Ainda não há evidência suficiente para concluir o principal risco operacional pessoal.',
        operationalImpact: 'Com poucas respostas, o relatório pode confundir sintomas isolados com um padrão real.',
        recommendedAction: 'Complete as quatro áreas antes de usar o relatório como plano de ajuste.',
      },
      {
        type: 'immediate_action',
        title: 'Completar dados críticos',
        message: 'A ação imediata é terminar a captura para elevar a precisão.',
        operationalImpact: 'Uma leitura completa detecta dependências, desgaste e sustentabilidade com menos ruído.',
        recommendedAction: 'Responda pelo menos 70% da avaliação e gere o PDF novamente.',
      },
    ],
    ko: [
      {
        type: 'main_personal_operational_risk',
        title: '불완전한 진단',
        message: '주요 개인 운영 위험을 판단하기에는 아직 근거가 충분하지 않습니다.',
        operationalImpact: '응답이 적으면 고립된 증상을 실제 패턴으로 오해할 수 있습니다.',
        recommendedAction: '조정 계획으로 사용하기 전에 네 영역을 모두 완료하세요.',
      },
      {
        type: 'immediate_action',
        title: '핵심 데이터 완료',
        message: '즉시 해야 할 일은 정확도를 높이기 위해 입력을 완료하는 것입니다.',
        operationalImpact: '완전한 진단은 의존성, 소모, 지속 가능성을 더 적은 노이즈로 감지합니다.',
        recommendedAction: '평가의 최소 70%를 답변한 뒤 PDF를 다시 생성하세요.',
      },
    ],
    zh: [
      {
        type: 'main_personal_operational_risk',
        title: '读取不完整',
        message: '目前还没有足够依据判断主要个人运营风险。',
        operationalImpact: '回答较少时，报告可能把孤立症状误判为真实模式。',
        recommendedAction: '在将报告作为调整计划前，先完成四个领域。',
      },
      {
        type: 'immediate_action',
        title: '补全关键数据',
        message: '立即行动是完成信息采集以提高精度。',
        operationalImpact: '完整读取能更清楚地识别依赖、消耗和可持续性。',
        recommendedAction: '至少完成 70% 的评估后重新生成 PDF。',
      },
    ],
  };
  const items = lowConfidenceCopy[language];

  return items.map((item) => ({
    ...item,
    severity: 1,
    evidence: [],
  }));
};

export const buildHumanPerformanceInsights = ({
  patterns,
  tags,
  profile,
  confidenceScore,
  locale,
}: {
  patterns: HumanPatternMatch[];
  tags: AggregatedHumanTag[];
  profile: HumanOperationalProfile;
  confidenceScore: number;
  locale: string;
}): { insights: HumanPerformanceInsight[]; labels: HumanPerformanceEngineLabels } => {
  const language = getHumanEngineLanguage(locale);

  if (confidenceScore < 20) {
    return {
      insights: buildLowConfidenceInsights(language),
      labels: LABELS[language],
    };
  }

  const insights = INSIGHT_ORDER.map((type) => {
    const pattern = getPatternByType(patterns, type);
    if (pattern) {
      return patternToInsight(pattern, language);
    }

    if (type === 'main_personal_operational_risk') {
      const tag = getTagByPriority(tags, (candidate) => candidate.category === 'risk');
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'dominant_pattern') {
      return profileToInsight(profile, type, language);
    }

    if (type === 'wear_source') {
      const tag = getTagByPriority(tags, (candidate) => (
        candidate.category === 'symptom' || candidate.dimension === 'cognitive' || candidate.dimension === 'recovery'
      ));
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'detected_dependency') {
      const tag = getTagByPriority(tags, (candidate) => (
        candidate.category === 'dependency' && candidate.maxSeverity >= 3
      ));
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'sustainability_risk') {
      const tag = getTagByPriority(tags, (candidate) => candidate.dimension === 'sustainability');
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'burnout_risk') {
      const tag = getTagByPriority(tags, (candidate) => candidate.id === 'riesgo_burnout' || candidate.id === 'fatiga_acumulada');
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'highest_roi_habit') {
      const tag = getTagByPriority(tags, (candidate) => (
        candidate.id === 'baja_recuperacion'
        || candidate.id === 'energia_inestable'
        || candidate.id === 'sobrecarga_constante'
      ));
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    if (type === 'first_boundary') {
      const tag = getTagByPriority(tags, (candidate) => (
        candidate.id === 'limites_debiles'
        || candidate.id === 'trabajo_nocturno'
        || candidate.id === 'dependencia_presencia'
      ));
      return tag ? tagToInsight(tag, type, language) : profileToInsight(profile, type, language);
    }

    const topTag = tags[0];
    return topTag ? tagToInsight(topTag, type, language) : profileToInsight(profile, type, language);
  });

  return {
    insights,
    labels: LABELS[language],
  };
};

const getInsight = (
  insights: HumanPerformanceInsight[],
  type: HumanInsightType,
) => insights.find((insight) => insight.type === type);

export const buildHumanPerformanceRoadmap = ({
  insights,
  profile,
  locale,
}: {
  insights: HumanPerformanceInsight[];
  profile: HumanOperationalProfile;
  locale: string;
}): HumanPerformanceRoadmapItem[] => {
  const language = getHumanEngineLanguage(locale);
  const immediate = getInsight(insights, 'immediate_action')
    ?? getInsight(insights, 'highest_roi_habit')
    ?? insights[0];
  const boundary = getInsight(insights, 'first_boundary')
    ?? getInsight(insights, 'detected_dependency')
    ?? immediate;
  const sustainability = getInsight(insights, 'sustainability_risk')
    ?? getInsight(insights, 'burnout_risk')
    ?? boundary;

  const roadmapCopy: Record<HumanEngineLanguage, Array<{ fallbackTitle: string; label: string; expectedResult: string }>> = {
    es: [
      { label: '7 dias', fallbackTitle: 'Ajuste inmediato', expectedResult: 'Reducir friccion inmediata y recuperar margen de control personal.' },
      { label: '30 dias', fallbackTitle: 'Instalar limite operativo', expectedResult: 'Convertir el cambio inicial en una regla visible y repetible.' },
      { label: '60 dias', fallbackTitle: 'Sostener capacidad', expectedResult: 'Proteger continuidad sin depender de mas presion o disponibilidad.' },
    ],
    en: [
      { label: '7 days', fallbackTitle: 'Immediate adjustment', expectedResult: 'Reduce immediate friction and recover personal control margin.' },
      { label: '30 days', fallbackTitle: 'Install operating boundary', expectedResult: 'Turn the initial change into a visible and repeatable rule.' },
      { label: '60 days', fallbackTitle: 'Sustain capacity', expectedResult: 'Protect continuity without depending on more pressure or availability.' },
    ],
    fr: [
      { label: '7 jours', fallbackTitle: 'Ajustement immédiat', expectedResult: 'Réduire la friction immédiate et récupérer une marge de contrôle personnel.' },
      { label: '30 jours', fallbackTitle: 'Installer une limite opérationnelle', expectedResult: 'Transformer le changement initial en règle visible et répétable.' },
      { label: '60 jours', fallbackTitle: 'Soutenir la capacité', expectedResult: 'Protéger la continuité sans dépendre de plus de pression ou de disponibilité.' },
    ],
    pt: [
      { label: '7 dias', fallbackTitle: 'Ajuste imediato', expectedResult: 'Reduzir fricção imediata e recuperar margem de controle pessoal.' },
      { label: '30 dias', fallbackTitle: 'Instalar limite operacional', expectedResult: 'Transformar a mudança inicial em regra visível e repetível.' },
      { label: '60 dias', fallbackTitle: 'Sustentar capacidade', expectedResult: 'Proteger continuidade sem depender de mais pressão ou disponibilidade.' },
    ],
    ko: [
      { label: '7일', fallbackTitle: '즉시 조정', expectedResult: '즉각적인 마찰을 줄이고 개인 통제 여지를 회복합니다.' },
      { label: '30일', fallbackTitle: '운영 경계 설치', expectedResult: '초기 변화를 보이고 반복 가능한 규칙으로 전환합니다.' },
      { label: '60일', fallbackTitle: '역량 유지', expectedResult: '더 많은 압박이나 가용성에 의존하지 않고 연속성을 보호합니다.' },
    ],
    zh: [
      { label: '7 天', fallbackTitle: '立即调整', expectedResult: '降低即时摩擦，恢复个人控制空间。' },
      { label: '30 天', fallbackTitle: '建立运营边界', expectedResult: '把初始改变变成可见、可重复的规则。' },
      { label: '60 天', fallbackTitle: '维持能力', expectedResult: '保护连续性，而不依赖更多压力或可用性。' },
    ],
  };
  const steps = roadmapCopy[language];

  return [
    {
      label: steps[0].label,
      title: immediate?.title ?? steps[0].fallbackTitle,
      body: immediate?.recommendedAction ?? profile.quickWin,
      expectedResult: steps[0].expectedResult,
    },
    {
      label: steps[1].label,
      title: boundary?.title ?? steps[1].fallbackTitle,
      body: boundary?.recommendedAction ?? profile.quickWin,
      expectedResult: steps[1].expectedResult,
    },
    {
      label: steps[2].label,
      title: sustainability?.title ?? steps[2].fallbackTitle,
      body: sustainability?.recommendedAction ?? profile.quickWin,
      expectedResult: steps[2].expectedResult,
    },
  ];
};

export const buildHumanExecutiveSummary = ({
  profile,
  insights,
  confidenceScore,
  locale,
}: {
  profile: HumanOperationalProfile;
  insights: HumanPerformanceInsight[];
  confidenceScore: number;
  locale: string;
}) => {
  const language = getHumanEngineLanguage(locale);
  const mainRisk = getInsight(insights, 'main_personal_operational_risk');

  if (confidenceScore < 20) {
    const incompleteCopy: Record<HumanEngineLanguage, string> = {
      es: 'El reporte aun no tiene suficiente evidencia para interpretar la capacidad operativa personal.',
      en: 'The report does not yet have enough evidence to interpret personal operating capacity.',
      fr: 'Le rapport n’a pas encore assez d’évidence pour interpréter la capacité opérationnelle personnelle.',
      pt: 'O relatório ainda não tem evidência suficiente para interpretar a capacidade operacional pessoal.',
      ko: '개인 운영 역량을 해석하기에는 아직 근거가 충분하지 않습니다.',
      zh: '报告尚没有足够依据来解读个人运营能力。',
    };

    return incompleteCopy[language];
  }

  return `${profile.title}: ${mainRisk?.message ?? profile.mainRisk}`;
};

export const buildHumanCrossRead = ({
  profile,
  patterns,
  locale,
}: {
  profile: HumanOperationalProfile;
  patterns: HumanPatternMatch[];
  locale: string;
}) => {
  const primaryPattern = patterns[0];

  if (primaryPattern) {
    return primaryPattern.message;
  }

  return profile.dominantPattern;
};

export const buildHumanCompletenessNote = ({
  answeredCount,
  totalQuestions,
  confidenceScore,
  locale,
}: {
  answeredCount: number;
  totalQuestions: number;
  confidenceScore: number;
  locale: string;
}) => {
  const language = getHumanEngineLanguage(locale);

  const emptyCopy: Record<HumanEngineLanguage, string> = {
    es: 'Datos insuficientes: completa la evaluacion para interpretar capacidad operativa personal. Este reporte no emite diagnostico clinico.',
    en: 'Insufficient data: complete the assessment to interpret personal operating capacity. This report does not provide clinical diagnosis.',
    fr: 'Données insuffisantes: complétez l’évaluation pour interpréter la capacité opérationnelle personnelle. Ce rapport ne fournit pas de diagnostic clinique.',
    pt: 'Dados insuficientes: complete a avaliação para interpretar a capacidade operacional pessoal. Este relatório não fornece diagnóstico clínico.',
    ko: '데이터가 부족합니다. 개인 운영 역량을 해석하려면 평가를 완료하세요. 이 보고서는 임상 진단을 제공하지 않습니다.',
    zh: '数据不足：请完成评估以解读个人运营能力。本报告不提供临床诊断。',
  };
  const templateCopy: Record<HumanEngineLanguage, string> = {
    es: `Lectura operativa basada en ${answeredCount} de ${totalQuestions} respuestas. Confianza ${confidenceScore}%. No sustituye evaluacion clinica.`,
    en: `Operational read based on ${answeredCount} of ${totalQuestions} answers. Confidence ${confidenceScore}%. It does not replace clinical evaluation.`,
    fr: `Lecture opérationnelle basée sur ${answeredCount} réponses sur ${totalQuestions}. Confiance ${confidenceScore}%. Ne remplace pas une évaluation clinique.`,
    pt: `Leitura operacional baseada em ${answeredCount} de ${totalQuestions} respostas. Confiança ${confidenceScore}%. Não substitui avaliação clínica.`,
    ko: `${totalQuestions}개 중 ${answeredCount}개 응답을 기반으로 한 운영 진단입니다. 신뢰도 ${confidenceScore}%. 임상 평가를 대체하지 않습니다.`,
    zh: `基于 ${totalQuestions} 题中的 ${answeredCount} 题回答进行运营解读。信心 ${confidenceScore}%。不替代临床评估。`,
  };

  return answeredCount <= 0 ? emptyCopy[language] : templateCopy[language];
};
