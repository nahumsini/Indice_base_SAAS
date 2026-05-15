import type {
  AggregatedHumanTag,
  HumanOperationalProfile,
  HumanOperationalProfileId,
  HumanPatternMatch,
  HumanSectionEngineScore,
} from './types';
import { getHumanEngineLanguage, type HumanEngineLanguage } from './localization';

const PROFILE_COPY: Record<'es' | 'en', Record<HumanOperationalProfileId, HumanOperationalProfile>> = {
  es: {
    operador_reactivo: {
      id: 'operador_reactivo',
      title: 'Operador reactivo',
      explanation: 'La persona sostiene la operacion resolviendo carga inmediata, con poca reserva fisica o mental.',
      mainRisk: 'La agenda puede dictar el rendimiento y desplazar recuperacion, foco y decisiones importantes.',
      dominantPattern: 'El sistema personal responde a urgencias mas que a un ritmo operativo estable.',
      continuationRisk: 'Si continua igual, mas responsabilidad generara mas reaccion y menos capacidad ejecutiva.',
      quickWin: 'Elegir una prioridad diaria y cerrar tres frentes abiertos antes de aceptar nueva carga.',
    },
    alto_rendimiento_fatigado: {
      id: 'alto_rendimiento_fatigado',
      title: 'Alto rendimiento fatigado',
      explanation: 'El nivel de ejecucion se mantiene, pero aparecen senales de desgaste acumulado.',
      mainRisk: 'El buen desempeno puede ocultar perdida de recuperacion y claridad bajo presion.',
      dominantPattern: 'La persona compensa con exigencia alta mientras la recuperacion queda corta.',
      continuationRisk: 'Si continua igual, el rendimiento seguira alto hasta que el costo de sostenerlo suba demasiado.',
      quickWin: 'Proteger una regla de recuperacion no negociable antes de aumentar compromisos.',
    },
    funcional_vulnerable: {
      id: 'funcional_vulnerable',
      title: 'Funcional pero vulnerable',
      explanation: 'El sistema personal funciona, pero tiene puntos de fragilidad que pueden aparecer en semanas de presion.',
      mainRisk: 'La estabilidad depende de que la carga no suba demasiado.',
      dominantPattern: 'Hay capacidad operativa, pero no suficiente amortiguacion ante picos de trabajo.',
      continuationRisk: 'Una semana exigente puede convertir pequenos desajustes en baja claridad o fatiga.',
      quickWin: 'Fortalecer el area mas debil con un habito de siete dias y mantener lo que ya sostiene energia.',
    },
    saturado_compensatorio: {
      id: 'saturado_compensatorio',
      title: 'Saturado compensatorio',
      explanation: 'La persona sigue funcionando, pero compensa saturacion mental con disciplina o reaccion.',
      mainRisk: 'La carga cognitiva puede degradar decision, foco y tolerancia a friccion.',
      dominantPattern: 'La mente absorbe demasiados pendientes, criterios y preocupaciones abiertas.',
      continuationRisk: 'Si continua igual, el volumen puede mantenerse pero la calidad ejecutiva bajara.',
      quickWin: 'Sacar pendientes de la cabeza y convertirlos en lista unica con responsable o siguiente accion.',
    },
    presion_constante: {
      id: 'presion_constante',
      title: 'Presion constante',
      explanation: 'El rendimiento se sostiene con urgencia, exigencia y poco espacio de recuperacion.',
      mainRisk: 'La presion se vuelve el motor operativo principal.',
      dominantPattern: 'El sistema produce porque aprieta, no porque este disenado para sostener energia.',
      continuationRisk: 'El crecimiento de responsabilidades aumentara tension en lugar de capacidad.',
      quickWin: 'Reducir una fuente de presion secundaria y definir una regla fija de cierre del dia.',
    },
    recuperacion_insuficiente: {
      id: 'recuperacion_insuficiente',
      title: 'Recuperacion insuficiente',
      explanation: 'La capacidad de ejecucion esta limitada por descanso y recuperacion que no compensan la carga.',
      mainRisk: 'La fatiga se normaliza y afecta claridad antes de sentirse como problema grave.',
      dominantPattern: 'El cuerpo y la mente no estan cerrando el ciclo de carga-recuperacion.',
      continuationRisk: 'Si continua igual, cada mejora de productividad sera fragil y dependiente del esfuerzo.',
      quickWin: 'Reparar el cierre nocturno y medir energia al despertar durante siete dias.',
    },
    disciplinado_sostenible: {
      id: 'disciplinado_sostenible',
      title: 'Disciplinado sostenible',
      explanation: 'La persona tiene una base operativa saludable y habitos que protegen continuidad.',
      mainRisk: 'El riesgo principal es usar la fortaleza actual para aceptar carga sin proteger condiciones.',
      dominantPattern: 'El rendimiento se apoya en recuperacion, claridad y limites razonablemente estables.',
      continuationRisk: 'Si crece la carga sin proteger el sistema, la fortaleza puede convertirse en deuda.',
      quickWin: 'Documentar los habitos no negociables que sostienen el rendimiento y defenderlos en semanas criticas.',
    },
    dependencia_voluntad: {
      id: 'dependencia_voluntad',
      title: 'Dependencia de voluntad',
      explanation: 'El sistema personal depende demasiado de fuerza individual para sostener resultados.',
      mainRisk: 'Cuando baja energia o sube presion, no hay suficiente estructura que sostenga ejecucion.',
      dominantPattern: 'La persona resuelve por disciplina lo que deberia estar simplificado por reglas o limites.',
      continuationRisk: 'Si continua igual, cada nueva responsabilidad exigira mas fuerza personal.',
      quickWin: 'Convertir una decision repetida en regla y eliminar una negociacion diaria innecesaria.',
    },
  },
  en: {
    operador_reactivo: {
      id: 'operador_reactivo',
      title: 'Reactive operator',
      explanation: 'The person keeps operations moving by solving immediate load with limited physical or mental reserve.',
      mainRisk: 'The agenda may dictate performance and displace recovery, focus, and important decisions.',
      dominantPattern: 'The personal system responds to urgency more than to a stable operating rhythm.',
      continuationRisk: 'If unchanged, more responsibility will create more reaction and less executive capacity.',
      quickWin: 'Choose one daily priority and close three open loops before accepting new load.',
    },
    alto_rendimiento_fatigado: {
      id: 'alto_rendimiento_fatigado',
      title: 'Fatigued high performer',
      explanation: 'Execution remains strong, but accumulated wear is starting to show.',
      mainRisk: 'Good output can hide declining recovery and clarity under pressure.',
      dominantPattern: 'The person compensates with high standards while recovery falls short.',
      continuationRisk: 'If unchanged, performance may remain high until the cost of sustaining it becomes too high.',
      quickWin: 'Protect one non-negotiable recovery rule before adding commitments.',
    },
    funcional_vulnerable: {
      id: 'funcional_vulnerable',
      title: 'Functional but vulnerable',
      explanation: 'The personal system works, but it has fragility points that can surface during pressure weeks.',
      mainRisk: 'Stability depends on workload not rising too much.',
      dominantPattern: 'There is operating capacity, but not enough buffer for work spikes.',
      continuationRisk: 'A demanding week can turn small gaps into lower clarity or fatigue.',
      quickWin: 'Strengthen the weakest area with one seven-day habit and protect what already supports energy.',
    },
    saturado_compensatorio: {
      id: 'saturado_compensatorio',
      title: 'Compensatory saturation',
      explanation: 'The person keeps functioning, but compensates mental saturation with discipline or reaction.',
      mainRisk: 'Cognitive load can degrade decision quality, focus, and tolerance for friction.',
      dominantPattern: 'The mind is carrying too many pending items, criteria, and open concerns.',
      continuationRisk: 'If unchanged, volume may continue while executive quality drops.',
      quickWin: 'Move pending work out of memory into one list with an owner or next action.',
    },
    presion_constante: {
      id: 'presion_constante',
      title: 'Constant pressure',
      explanation: 'Performance is sustained through urgency, high demand, and limited recovery room.',
      mainRisk: 'Pressure becomes the main operating engine.',
      dominantPattern: 'The system produces because it is pushed, not because it is designed to sustain energy.',
      continuationRisk: 'More responsibility will increase tension instead of capacity.',
      quickWin: 'Reduce one secondary pressure source and define a fixed end-of-day rule.',
    },
    recuperacion_insuficiente: {
      id: 'recuperacion_insuficiente',
      title: 'Insufficient recovery',
      explanation: 'Execution capacity is limited by rest and recovery that do not compensate workload.',
      mainRisk: 'Fatigue becomes normal and affects clarity before it feels like a serious problem.',
      dominantPattern: 'The body and mind are not closing the load-recovery cycle.',
      continuationRisk: 'If unchanged, every productivity improvement will be fragile and effort-dependent.',
      quickWin: 'Repair the nighttime shutdown and measure morning energy for seven days.',
    },
    disciplinado_sostenible: {
      id: 'disciplinado_sostenible',
      title: 'Sustainable disciplined operator',
      explanation: 'The person has a healthy operating base and habits that protect continuity.',
      mainRisk: 'The main risk is using current strength to accept load without protecting conditions.',
      dominantPattern: 'Performance is supported by reasonably stable recovery, clarity, and boundaries.',
      continuationRisk: 'If workload grows without protection, strength can turn into debt.',
      quickWin: 'Document the non-negotiable habits that sustain performance and defend them during critical weeks.',
    },
    dependencia_voluntad: {
      id: 'dependencia_voluntad',
      title: 'Willpower dependency',
      explanation: 'The personal system depends too much on individual force to sustain output.',
      mainRisk: 'When energy drops or pressure rises, there is not enough structure to support execution.',
      dominantPattern: 'The person solves through discipline what should be simplified through rules or boundaries.',
      continuationRisk: 'If unchanged, every new responsibility will require more personal force.',
      quickWin: 'Turn one repeated decision into a rule and remove one unnecessary daily negotiation.',
    },
  },
};

const PROFILE_TITLES: Record<Exclude<HumanEngineLanguage, 'es' | 'en'>, Record<HumanOperationalProfileId, string>> = {
  fr: {
    operador_reactivo: 'Opérateur réactif',
    alto_rendimiento_fatigado: 'Haut rendement fatigué',
    funcional_vulnerable: 'Fonctionnel mais vulnérable',
    saturado_compensatorio: 'Saturation compensatoire',
    presion_constante: 'Pression constante',
    recuperacion_insuficiente: 'Récupération insuffisante',
    disciplinado_sostenible: 'Discipline soutenable',
    dependencia_voluntad: 'Dépendance à la volonté',
  },
  pt: {
    operador_reactivo: 'Operador reativo',
    alto_rendimiento_fatigado: 'Alto desempenho fatigado',
    funcional_vulnerable: 'Funcional, mas vulnerável',
    saturado_compensatorio: 'Saturado compensatório',
    presion_constante: 'Pressão constante',
    recuperacion_insuficiente: 'Recuperação insuficiente',
    disciplinado_sostenible: 'Disciplinado sustentável',
    dependencia_voluntad: 'Dependência de força de vontade',
  },
  ko: {
    operador_reactivo: '반응형 운영자',
    alto_rendimiento_fatigado: '피로한 고성과자',
    funcional_vulnerable: '기능적이지만 취약함',
    saturado_compensatorio: '보상적 포화 상태',
    presion_constante: '상시 압박',
    recuperacion_insuficiente: '회복 부족',
    disciplinado_sostenible: '지속 가능한 규율형',
    dependencia_voluntad: '의지력 의존',
  },
  zh: {
    operador_reactivo: '反应型运营者',
    alto_rendimiento_fatigado: '疲劳型高绩效者',
    funcional_vulnerable: '功能正常但脆弱',
    saturado_compensatorio: '补偿性饱和',
    presion_constante: '持续压力',
    recuperacion_insuficiente: '恢复不足',
    disciplinado_sostenible: '可持续纪律型',
    dependencia_voluntad: '意志力依赖型',
  },
};

const GENERIC_PROFILE_COPY: Record<Exclude<HumanEngineLanguage, 'es' | 'en'>, Omit<HumanOperationalProfile, 'id' | 'title'>> = {
  fr: {
    explanation: 'Le système personnel présente un patron opérationnel qui doit être protégé ou ajusté pour soutenir la charge.',
    mainRisk: 'Le risque principal est que la personne compense avec plus de pression au lieu de gagner en capacité réelle.',
    dominantPattern: 'La capacité dépend d’un équilibre entre récupération, clarté, limites et disponibilité.',
    continuationRisk: 'Si le patron continue, la charge peut dégrader la clarté et réduire la marge de récupération.',
    quickWin: 'Choisir un ajustement concret pour sept jours et mesurer s’il réduit la charge ou améliore la clarté.',
  },
  pt: {
    explanation: 'O sistema pessoal mostra um padrão operacional que precisa ser protegido ou ajustado para sustentar a carga.',
    mainRisk: 'O principal risco é compensar com mais pressão em vez de ganhar capacidade real.',
    dominantPattern: 'A capacidade depende do equilíbrio entre recuperação, clareza, limites e disponibilidade.',
    continuationRisk: 'Se o padrão continuar, a carga pode degradar clareza e reduzir margem de recuperação.',
    quickWin: 'Escolha um ajuste concreto por sete dias e meça se ele reduz carga ou melhora clareza.',
  },
  ko: {
    explanation: '개인 시스템은 업무 부하를 지속하기 위해 보호하거나 조정해야 하는 운영 패턴을 보입니다.',
    mainRisk: '핵심 위험은 실제 역량을 늘리기보다 더 많은 압박으로 보상하는 것입니다.',
    dominantPattern: '역량은 회복, 명료성, 경계, 가용성의 균형에 달려 있습니다.',
    continuationRisk: '이 패턴이 계속되면 업무 부하가 명료성을 낮추고 회복 여지를 줄일 수 있습니다.',
    quickWin: '7일 동안 하나의 구체적 조정을 선택하고 부하 감소 또는 명료성 개선을 확인하세요.',
  },
  zh: {
    explanation: '个人系统呈现出一种需要保护或调整的运营模式，才能持续承载工作负荷。',
    mainRisk: '主要风险是用更多压力来补偿，而不是真正提升能力。',
    dominantPattern: '个人能力取决于恢复、清晰度、边界和可用性之间的平衡。',
    continuationRisk: '如果该模式持续，工作负荷可能会降低清晰度并压缩恢复空间。',
    quickWin: '选择一个具体调整持续 7 天，并观察它是否降低负荷或提升清晰度。',
  },
};

const getProfileCopy = (locale: string): Record<HumanOperationalProfileId, HumanOperationalProfile> => {
  const language = getHumanEngineLanguage(locale);

  if (language === 'es' || language === 'en') {
    return PROFILE_COPY[language];
  }

  return (Object.keys(PROFILE_COPY.en) as HumanOperationalProfileId[]).reduce<Record<HumanOperationalProfileId, HumanOperationalProfile>>((result, profileId) => {
    result[profileId] = {
      id: profileId,
      title: PROFILE_TITLES[language][profileId],
      ...GENERIC_PROFILE_COPY[language],
    };

    return result;
  }, {} as Record<HumanOperationalProfileId, HumanOperationalProfile>);
};

const getSectionScore = (
  sections: HumanSectionEngineScore[],
  key: HumanSectionEngineScore['key'],
) => sections.find((section) => section.key === key)?.averageScore ?? 0;

const hasTag = (tagMap: Map<string, AggregatedHumanTag>, tagId: string, minSeverity = 1) => (
  (tagMap.get(tagId)?.maxSeverity ?? 0) >= minSeverity
);

const hasPattern = (patterns: HumanPatternMatch[], patternId: string) => (
  patterns.some((pattern) => pattern.id === patternId)
);

export const detectHumanOperationalProfile = ({
  tags,
  patterns,
  sections,
  overallScore,
  locale,
}: {
  tags: AggregatedHumanTag[];
  patterns: HumanPatternMatch[];
  sections: HumanSectionEngineScore[];
  overallScore: number;
  locale: string;
}): HumanOperationalProfile => {
  const copy = getProfileCopy(locale);
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));
  const sleepScore = getSectionScore(sections, 'sleep_recovery');
  const stressScore = getSectionScore(sections, 'stress_clarity');
  const balanceScore = getSectionScore(sections, 'balance_sustainability');

  if (
    overallScore >= 78
    && (hasTag(tagMap, 'fatiga_acumulada', 3) || hasTag(tagMap, 'riesgo_burnout', 2))
  ) {
    return copy.alto_rendimiento_fatigado;
  }

  if (sleepScore <= 60 || hasPattern(patterns, 'unclosed_recovery_cycles')) {
    return copy.recuperacion_insuficiente;
  }

  if (hasPattern(patterns, 'cognitive_overload_execution') || stressScore <= 60) {
    return copy.saturado_compensatorio;
  }

  if (hasPattern(patterns, 'pressure_based_performance')) {
    return copy.presion_constante;
  }

  if (hasTag(tagMap, 'dependencia_voluntad', 3)) {
    return copy.dependencia_voluntad;
  }

  if (overallScore >= 82 && balanceScore >= 76 && tags.filter((tag) => tag.maxSeverity >= 3).length <= 2) {
    return copy.disciplinado_sostenible;
  }

  if (overallScore <= 60) {
    return copy.operador_reactivo;
  }

  return copy.funcional_vulnerable;
};
