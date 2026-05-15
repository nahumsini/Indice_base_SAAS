import { DIAGNOSTIC_TAG_CATALOG } from './tagCatalog';
import type {
  AggregatedDiagnosisTag,
  DiagnosisEngineLabels,
  DiagnosisInsight,
  DiagnosisInsightType,
  DiagnosisPatternMatch,
  DiagnosisPillarEngineScore,
  DiagnosisRoadmapItem,
} from './types';

type InsightLanguage = 'es' | 'en';

const getLanguage = (locale: string): InsightLanguage => (
  locale.toLowerCase().startsWith('es') ? 'es' : 'en'
);

const LABELS: Record<InsightLanguage, DiagnosisEngineLabels> = {
  es: {
    confidence: 'Confianza del diagnostico',
    contextual: 'Contextual',
    evaluative: 'Evaluativa',
    evidence: 'Evidencia',
    mainRisk: 'Riesgo principal',
    priority: 'Prioridad unica',
    quickWin: 'Quick win',
    whyItMatters: 'Por que importa',
  },
  en: {
    confidence: 'Diagnostic confidence',
    contextual: 'Contextual',
    evaluative: 'Evaluative',
    evidence: 'Evidence',
    mainRisk: 'Main risk',
    priority: 'Single priority',
    quickWin: 'Quick win',
    whyItMatters: 'Why it matters',
  },
};

const INSIGHT_ORDER: DiagnosisInsightType[] = [
  'main_risk',
  'operational_bottleneck',
  'critical_dependency',
  'quick_win',
  'growth_risk',
  'single_priority',
  'highest_roi_area',
];

const TYPE_TITLES: Record<InsightLanguage, Record<DiagnosisInsightType, string>> = {
  es: {
    main_risk: 'Riesgo principal',
    operational_bottleneck: 'Cuello de botella operativo',
    critical_dependency: 'Dependencia critica',
    quick_win: 'Quick win inmediato',
    growth_risk: 'Riesgo al crecer',
    single_priority: 'Prioridad unica',
    highest_roi_area: 'Mayor ROI operativo',
  },
  en: {
    main_risk: 'Main risk',
    operational_bottleneck: 'Operational bottleneck',
    critical_dependency: 'Critical dependency',
    quick_win: 'Immediate quick win',
    growth_risk: 'Growth risk',
    single_priority: 'Single priority',
    highest_roi_area: 'Highest operating ROI',
  },
};

const patternToInsight = (
  pattern: DiagnosisPatternMatch,
  language: InsightLanguage,
): DiagnosisInsight => ({
  type: pattern.type,
  title: pattern.title || TYPE_TITLES[language][pattern.type],
  severity: pattern.severity,
  message: pattern.message,
  evidence: pattern.evidence,
  businessImpact: pattern.risk,
  recommendedAction: pattern.action,
  suggestedModule: pattern.suggestedModule,
});

const tagToInsight = (
  tag: AggregatedDiagnosisTag,
  type: DiagnosisInsightType,
  language: InsightLanguage,
): DiagnosisInsight => {
  const catalog = DIAGNOSTIC_TAG_CATALOG[tag.id];
  const firstEvidence = tag.evidence.slice(0, 3).map((evidence) => `${evidence.question}: ${evidence.answer}`);

  return {
    type,
    title: type === 'quick_win' ? TYPE_TITLES[language][type] : catalog.label,
    severity: Math.min(Math.max(tag.maxSeverity, 1), 4) as DiagnosisInsight['severity'],
    pillar: catalog.pillar,
    message: type === 'quick_win'
      ? catalog.quickWin
      : catalog.businessImpact,
    evidence: firstEvidence,
    businessImpact: catalog.businessImpact,
    recommendedAction: type === 'quick_win' ? catalog.quickWin : catalog.recommendedAction,
    suggestedModule: catalog.suggestedModule,
  };
};

const getLowestPillar = (pillars: DiagnosisPillarEngineScore[]) => (
  [...pillars].sort((left, right) => {
    if (left.averageScore === right.averageScore) {
      return left.title.localeCompare(right.title);
    }

    return left.averageScore - right.averageScore;
  })[0]
);

const buildDefaultInsight = (
  type: DiagnosisInsightType,
  pillars: DiagnosisPillarEngineScore[],
  language: InsightLanguage,
): DiagnosisInsight => {
  const lowestPillar = getLowestPillar(pillars);

  return {
    type,
    title: TYPE_TITLES[language][type],
    severity: 2,
    pillar: lowestPillar?.key,
    message: language === 'es'
      ? `La primera lectura apunta a fortalecer ${lowestPillar?.title ?? 'el pilar prioritario'}.`
      : `The first read points to strengthening ${lowestPillar?.title ?? 'the priority pillar'}.`,
    evidence: [],
    businessImpact: language === 'es'
      ? 'Con mas respuestas, el motor podra precisar la causa y el impacto operativo.'
      : 'With more answers, the engine can better identify the cause and operating impact.',
    recommendedAction: language === 'es'
      ? 'Completar el diagnostico y elegir una accion visible para los proximos 7 dias.'
      : 'Complete the assessment and choose one visible action for the next 7 days.',
  };
};

const buildLowConfidenceInsights = (
  language: InsightLanguage,
): DiagnosisInsight[] => {
  const items = language === 'es'
    ? [
        {
          type: 'main_risk' as const,
          title: 'Diagnostico incompleto',
          message: 'Aun no hay suficiente evidencia para concluir el riesgo principal del negocio.',
          businessImpact: 'Con pocas respuestas, cualquier recomendacion fuerte podria sobredimensionar un problema.',
          recommendedAction: 'Completar primero las preguntas evaluativas de Personas, Procesos y Finanzas.',
        },
        {
          type: 'operational_bottleneck' as const,
          title: 'Cuello de botella pendiente de confirmar',
          message: 'El motor necesita mas respuestas para distinguir entre problema de equipo, proceso, producto o finanzas.',
          businessImpact: 'Sin esa distincion, el plan puede atacar sintomas y no causa raiz.',
          recommendedAction: 'Responder al menos 70% del diagnostico antes de usar el PDF como plan de accion.',
        },
        {
          type: 'critical_dependency' as const,
          title: 'Dependencia critica no validada',
          message: 'La evidencia capturada todavia no alcanza para afirmar una dependencia operativa dominante.',
          businessImpact: 'Conviene evitar decisiones estructurales hasta completar el mapa operativo.',
          recommendedAction: 'Completar las preguntas sobre delegacion, responsables y dependencia de personas clave.',
        },
        {
          type: 'quick_win' as const,
          title: 'Completar datos criticos',
          message: 'El quick win no es cambiar la operacion todavia; es completar el diagnostico.',
          businessImpact: 'Mejores datos producen recomendaciones mas concretas y menos genericas.',
          recommendedAction: 'Terminar las secciones incompletas y volver a imprimir el reporte.',
        },
        {
          type: 'growth_risk' as const,
          title: 'Riesgo de crecimiento no medido',
          message: 'Todavia no hay base suficiente para saber que se rompe primero al crecer.',
          businessImpact: 'Crecer sin diagnostico completo puede reforzar el cuello de botella equivocado.',
          recommendedAction: 'Completar Procesos y Finanzas antes de decidir expansion, contratacion o nuevos canales.',
        },
        {
          type: 'single_priority' as const,
          title: 'Prioridad unica',
          message: 'La prioridad actual es elevar la confianza diagnostica.',
          businessImpact: 'Sin confianza, el reporte debe usarse como captura inicial, no como consultoria final.',
          recommendedAction: 'Completar el diagnostico hasta superar 70% de confianza.',
        },
        {
          type: 'highest_roi_area' as const,
          title: 'Mayor ROI operativo',
          message: 'El mayor retorno inmediato esta en terminar la captura de informacion.',
          businessImpact: 'Una lectura completa reduce ruido y mejora la precision del roadmap.',
          recommendedAction: 'Completar todas las preguntas evaluativas antes de priorizar modulos.',
        },
      ]
    : [
        {
          type: 'main_risk' as const,
          title: 'Incomplete diagnostic',
          message: 'There is not enough evidence yet to conclude the main business risk.',
          businessImpact: 'With few answers, strong recommendations could overstate the wrong problem.',
          recommendedAction: 'Complete the evaluative questions in People, Processes, and Finance first.',
        },
        {
          type: 'operational_bottleneck' as const,
          title: 'Bottleneck pending confirmation',
          message: 'The engine needs more answers to distinguish between team, process, product, or finance issues.',
          businessImpact: 'Without that distinction, the plan may attack symptoms instead of root cause.',
          recommendedAction: 'Answer at least 70% of the assessment before using the PDF as an action plan.',
        },
        {
          type: 'critical_dependency' as const,
          title: 'Critical dependency not validated',
          message: 'The captured evidence is not enough to confirm a dominant operating dependency.',
          businessImpact: 'Avoid structural decisions until the operating map is complete.',
          recommendedAction: 'Complete the delegation, ownership, and key-person dependency questions.',
        },
        {
          type: 'quick_win' as const,
          title: 'Complete critical data',
          message: 'The quick win is not changing operations yet; it is completing the assessment.',
          businessImpact: 'Better data produces more concrete and less generic recommendations.',
          recommendedAction: 'Finish the incomplete sections and print the report again.',
        },
        {
          type: 'growth_risk' as const,
          title: 'Unmeasured growth risk',
          message: 'There is not enough basis yet to know what breaks first when the business grows.',
          businessImpact: 'Growing without a complete diagnosis can reinforce the wrong bottleneck.',
          recommendedAction: 'Complete Processes and Finance before deciding expansion, hiring, or new channels.',
        },
        {
          type: 'single_priority' as const,
          title: 'Single priority',
          message: 'The current priority is raising diagnostic confidence.',
          businessImpact: 'Without confidence, the report should be used as initial capture, not final consulting.',
          recommendedAction: 'Complete the assessment until it exceeds 70% confidence.',
        },
        {
          type: 'highest_roi_area' as const,
          title: 'Highest operating ROI',
          message: 'The highest immediate return is finishing information capture.',
          businessImpact: 'A complete read reduces noise and improves roadmap precision.',
          recommendedAction: 'Complete every evaluative question before prioritizing modules.',
        },
      ];

  return items.map((item) => ({
    ...item,
    severity: 1,
    evidence: [],
  }));
};

const buildMatureInsights = (
  pillars: DiagnosisPillarEngineScore[],
  language: InsightLanguage,
): DiagnosisInsight[] => {
  const lowestPillar = getLowestPillar(pillars);
  const items = language === 'es'
    ? [
        {
          type: 'main_risk' as const,
          title: 'Riesgo principal controlado',
          message: 'No se detectan riesgos criticos con la evidencia actual.',
          businessImpact: 'El reto no es apagar incendios, sino sostener disciplina mientras aumenta la complejidad.',
          recommendedAction: 'Mantener revision mensual de indicadores, responsables y margen por linea.',
        },
        {
          type: 'operational_bottleneck' as const,
          title: 'Cuello de botella preventivo',
          message: `El punto a vigilar es ${lowestPillar?.title ?? 'el pilar con menor score relativo'}, aunque sigue en buen nivel.`,
          businessImpact: 'En negocios maduros, pequenas variaciones pueden anticipar friccion futura.',
          recommendedAction: 'Revisar el pilar mas bajo cada 30 dias y documentar cambios relevantes.',
        },
        {
          type: 'critical_dependency' as const,
          title: 'Dependencia critica bajo control',
          message: 'No aparece una dependencia dominante en las respuestas capturadas.',
          businessImpact: 'La empresa puede proteger continuidad si mantiene respaldos y documentacion actualizada.',
          recommendedAction: 'Validar responsables alternos para procesos y decisiones criticas.',
        },
        {
          type: 'quick_win' as const,
          title: 'Elevar estandar',
          message: 'El quick win es convertir buenas practicas en estandar revisable.',
          businessImpact: 'Esto evita que el desempeno dependa de memoria o habitos informales.',
          recommendedAction: 'Actualizar una checklist critica y asignar revision mensual.',
        },
        {
          type: 'growth_risk' as const,
          title: 'Cuidar consistencia al crecer',
          message: 'El crecimiento puede diluir estandares si no se auditan rutinas y datos.',
          businessImpact: 'La madurez actual debe protegerse con cadencias, responsables y evidencia.',
          recommendedAction: 'Antes de expandir, definir que indicadores no pueden deteriorarse.',
        },
        {
          type: 'single_priority' as const,
          title: 'Prioridad unica',
          message: 'La prioridad es sostener el sistema, no redisenarlo.',
          businessImpact: 'Cambiar demasiado puede crear complejidad innecesaria.',
          recommendedAction: 'Elegir una metrica de control por pilar y revisarla mensualmente.',
        },
        {
          type: 'highest_roi_area' as const,
          title: 'Mayor ROI operativo',
          message: `El mayor retorno esta en optimizar ${lowestPillar?.title ?? 'el pilar con menor score relativo'}.`,
          businessImpact: 'Mejorar el pilar mas bajo suele elevar consistencia general sin rehacer todo.',
          recommendedAction: 'Auditar el pilar mas bajo y elegir una mejora puntual de bajo esfuerzo.',
        },
      ]
    : [
        {
          type: 'main_risk' as const,
          title: 'Main risk under control',
          message: 'No critical risks are detected with the current evidence.',
          businessImpact: 'The challenge is not firefighting, but sustaining discipline as complexity grows.',
          recommendedAction: 'Keep a monthly review of indicators, owners, and margin by line.',
        },
        {
          type: 'operational_bottleneck' as const,
          title: 'Preventive bottleneck',
          message: `Watch ${lowestPillar?.title ?? 'the relatively lowest pillar'}, even though it is still strong.`,
          businessImpact: 'In mature businesses, small variations can anticipate future friction.',
          recommendedAction: 'Review the lowest pillar every 30 days and document relevant changes.',
        },
        {
          type: 'critical_dependency' as const,
          title: 'Critical dependency under control',
          message: 'No dominant dependency appears in the captured answers.',
          businessImpact: 'The company protects continuity by keeping backups and documentation current.',
          recommendedAction: 'Validate backup owners for critical processes and decisions.',
        },
        {
          type: 'quick_win' as const,
          title: 'Raise the standard',
          message: 'The quick win is turning good practices into a reviewable standard.',
          businessImpact: 'This prevents performance from depending on memory or informal habits.',
          recommendedAction: 'Update one critical checklist and assign a monthly review.',
        },
        {
          type: 'growth_risk' as const,
          title: 'Protect consistency while growing',
          message: 'Growth can dilute standards if routines and data are not audited.',
          businessImpact: 'Current maturity should be protected with cadences, owners, and evidence.',
          recommendedAction: 'Before expanding, define which indicators cannot deteriorate.',
        },
        {
          type: 'single_priority' as const,
          title: 'Single priority',
          message: 'The priority is sustaining the system, not redesigning it.',
          businessImpact: 'Changing too much can create unnecessary complexity.',
          recommendedAction: 'Choose one control metric per pillar and review it monthly.',
        },
        {
          type: 'highest_roi_area' as const,
          title: 'Highest operating ROI',
          message: `The highest return is optimizing ${lowestPillar?.title ?? 'the relatively lowest pillar'}.`,
          businessImpact: 'Improving the lowest pillar usually raises consistency without rebuilding everything.',
          recommendedAction: 'Audit the lowest pillar and choose one low-effort improvement.',
        },
      ];

  return items.map((item) => ({
    ...item,
    severity: 1,
    pillar: lowestPillar?.key,
    evidence: [],
  }));
};

const pickPatternByType = (
  patterns: DiagnosisPatternMatch[],
  type: DiagnosisInsightType,
) => patterns.find((pattern) => pattern.type === type);

export const buildDiagnosisInsights = ({
  patterns,
  tags,
  pillars,
  locale,
  confidenceScore,
}: {
  patterns: DiagnosisPatternMatch[];
  tags: AggregatedDiagnosisTag[];
  pillars: DiagnosisPillarEngineScore[];
  locale: string;
  confidenceScore: number;
}): { insights: DiagnosisInsight[]; labels: DiagnosisEngineLabels } => {
  const language = getLanguage(locale);
  const isMature = pillars.length > 0
    && pillars.every((pillar) => pillar.averageScore >= 90)
    && patterns.length === 0;

  if (confidenceScore < 35) {
    return {
      insights: buildLowConfidenceInsights(language),
      labels: LABELS[language],
    };
  }

  if (isMature) {
    return {
      insights: buildMatureInsights(pillars, language),
      labels: LABELS[language],
    };
  }

  const topTags = tags.slice(0, 5);
  const usedTagIds = new Set<string>();

  const insights = INSIGHT_ORDER.map((type) => {
    const matchedPattern = pickPatternByType(patterns, type);
    if (matchedPattern) {
      return patternToInsight(matchedPattern, language);
    }

    if (type === 'quick_win') {
      const quickWinTag = topTags.find((tag) => tag.maxSeverity <= 3 && !usedTagIds.has(tag.id)) ?? topTags[0];
      if (quickWinTag) {
        usedTagIds.add(quickWinTag.id);
        return tagToInsight(quickWinTag, type, language);
      }
    }

    const matchingTag = topTags.find((tag) => !usedTagIds.has(tag.id));
    if (matchingTag) {
      usedTagIds.add(matchingTag.id);
      return tagToInsight(matchingTag, type, language);
    }

    return buildDefaultInsight(type, pillars, language);
  });

  return {
    insights,
    labels: LABELS[language],
  };
};

export const buildExecutiveSummary = ({
  score,
  confidenceScore,
  insights,
  locale,
}: {
  score: number;
  confidenceScore: number;
  insights: DiagnosisInsight[];
  locale: string;
}) => {
  const language = getLanguage(locale);
  const mainRisk = insights.find((insight) => insight.type === 'main_risk') ?? insights[0];
  const priority = insights.find((insight) => insight.type === 'single_priority') ?? mainRisk;

  if (language === 'es') {
    return `La empresa marca ${score}/100 de madurez operativa con ${confidenceScore}% de confianza diagnostica. ${mainRisk.message} La prioridad no es hacer mas cosas, sino ejecutar primero: ${priority.recommendedAction}`;
  }

  return `The company scores ${score}/100 in operating maturity with ${confidenceScore}% diagnostic confidence. ${mainRisk.message} The priority is not doing more things, but executing first: ${priority.recommendedAction}`;
};

export const buildCrossRead = ({
  pillars,
  tags,
  patterns,
  locale,
}: {
  pillars: DiagnosisPillarEngineScore[];
  tags: AggregatedDiagnosisTag[];
  patterns: DiagnosisPatternMatch[];
  locale: string;
}) => {
  const language = getLanguage(locale);
  const topPattern = patterns[0];
  if (topPattern) {
    return language === 'es'
      ? `${topPattern.message} Esto aparece por la combinacion de ${topPattern.evidence.slice(0, 2).join(' + ') || 'senales operativas repetidas'}.`
      : `${topPattern.message} This appears through the combination of ${topPattern.evidence.slice(0, 2).join(' + ') || 'repeated operating signals'}.`;
  }

  const lowestPillar = getLowestPillar(pillars);
  const topTag = tags[0];

  return language === 'es'
    ? `El patron principal esta en ${lowestPillar?.title ?? 'el pilar prioritario'}${topTag ? `, especialmente por ${topTag.label.toLowerCase()}` : ''}.`
    : `The main pattern is in ${lowestPillar?.title ?? 'the priority pillar'}${topTag ? `, especially due to ${topTag.label.toLowerCase()}` : ''}.`;
};

export const buildCompletenessNote = ({
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
  const language = getLanguage(locale);
  if (answeredCount === 0) {
    return language === 'es'
      ? 'Datos insuficientes: responde el diagnostico para generar interpretacion operativa.'
      : 'Insufficient data: answer the assessment to generate operating interpretation.';
  }

  return language === 'es'
    ? `Lectura basada en ${answeredCount} de ${totalQuestions} respuestas. Confianza del diagnostico: ${confidenceScore}%.`
    : `Read based on ${answeredCount} of ${totalQuestions} answers. Diagnostic confidence: ${confidenceScore}%.`;
};

export const buildDiagnosisRoadmap = ({
  insights,
  locale,
}: {
  insights: DiagnosisInsight[];
  locale: string;
}): DiagnosisRoadmapItem[] => {
  const language = getLanguage(locale);
  const priority = insights.find((insight) => insight.type === 'single_priority') ?? insights[0];
  const quickWin = insights.find((insight) => insight.type === 'quick_win') ?? priority;
  const growthRisk = insights.find((insight) => insight.type === 'growth_risk') ?? priority;

  if (language === 'es') {
    return [
      {
        label: '7 dias',
        title: 'Control visible',
        body: quickWin.recommendedAction,
        suggestedModule: quickWin.suggestedModule,
      },
      {
        label: '30 dias',
        title: 'Prioridad operativa',
        body: priority.recommendedAction,
        suggestedModule: priority.suggestedModule,
      },
      {
        label: '60 dias',
        title: 'Preparacion para crecer',
        body: growthRisk.recommendedAction,
        suggestedModule: growthRisk.suggestedModule,
      },
    ];
  }

  return [
    {
      label: '7 days',
      title: 'Visible control',
      body: quickWin.recommendedAction,
      suggestedModule: quickWin.suggestedModule,
    },
    {
      label: '30 days',
      title: 'Operating priority',
      body: priority.recommendedAction,
      suggestedModule: priority.suggestedModule,
    },
    {
      label: '60 days',
      title: 'Prepare to grow',
      body: growthRisk.recommendedAction,
      suggestedModule: growthRisk.suggestedModule,
    },
  ];
};
