import type {
  AggregatedHumanTag,
  HumanPatternMatch,
  HumanPatternRule,
  HumanPerformanceSection,
  HumanSectionEngineScore,
} from './types';
import { getHumanEngineLanguage, type HumanEngineLanguage } from './localization';

const RULES: HumanPatternRule[] = [
  {
    id: 'unclosed_recovery_cycles',
    title: 'Ciclos de recuperacion abiertos',
    when: {
      allTags: ['baja_recuperacion'],
      anyTags: ['dificultad_desconexion', 'recuperacion_mental_baja', 'ansiedad_responsabilidades', 'tension_cognitiva'],
      maxSectionScore: { sleep_recovery: 72, stress_clarity: 76 },
    },
    produces: {
      type: 'dominant_pattern',
      severity: 4,
      title: 'La persona no esta cerrando ciclos reales de recuperacion',
      message: 'La carga mental sigue activa fuera del trabajo y la recuperacion fisica no compensa la exigencia.',
      risk: 'El rendimiento puede mantenerse por algunos dias, pero con deterioro gradual de claridad y tolerancia a presion.',
      action: 'Instalar un cierre diario obligatorio: pendientes fuera de la cabeza, primer paso de manana y hora limite de operacion.',
    },
  },
  {
    id: 'pressure_based_performance',
    title: 'Rendimiento por presion',
    when: {
      allTags: ['productividad_por_presion'],
      anyTags: ['dependencia_voluntad', 'culpa_descanso', 'rutina_no_sostenible'],
      maxSectionScore: { balance_sustainability: 72 },
    },
    produces: {
      type: 'main_personal_operational_risk',
      severity: 4,
      title: 'El rendimiento depende mas de presion que de recuperacion sostenible',
      message: 'La persona puede producir, pero el sistema personal exige demasiada disciplina para sostenerse.',
      risk: 'Al aumentar responsabilidades, el mismo nivel de rendimiento requerira mas tension y menos margen de recuperacion.',
      action: 'Convertir una exigencia repetida en regla operativa y reducir una carga secundaria esta semana.',
    },
  },
  {
    id: 'personal_operation_not_scalable',
    title: 'Operacion personal no escalable',
    when: {
      allTags: ['dependencia_presencia'],
      anyTags: ['trabajo_extendido', 'pausas_insuficientes', 'limites_debiles', 'trabajo_nocturno'],
      minTagSeverity: { dependencia_presencia: 3 },
      maxSectionScore: { balance_sustainability: 76 },
    },
    produces: {
      type: 'detected_dependency',
      severity: 4,
      title: 'La operacion personal depende de disponibilidad continua',
      message: 'El sistema funciona porque la persona esta presente, disponible o resolviendo de forma constante.',
      risk: 'La capacidad humana se vuelve el techo operativo: mas volumen se traduce en mas presencia, no en mas sistema.',
      action: 'Documentar una rutina critica y definir que puede avanzar sin intervencion directa.',
    },
  },
  {
    id: 'cognitive_overload_execution',
    title: 'Sobrecarga cognitiva ejecutiva',
    when: {
      allTags: ['sobrecarga_constante', 'claridad_degradada'],
      anyTags: ['tension_cognitiva', 'ansiedad_responsabilidades', 'degradacion_ejecutiva'],
      maxSectionScore: { stress_clarity: 72 },
    },
    produces: {
      type: 'wear_source',
      severity: 4,
      title: 'La principal fuga de capacidad esta en carga cognitiva',
      message: 'La mente esta absorbiendo seguimiento, decisiones abiertas y tension que deberian estar fuera de memoria.',
      risk: 'La calidad ejecutiva cae antes que el volumen de trabajo, por eso el problema puede no verse de inmediato.',
      action: 'Reducir contexto abierto: lista unica de pendientes, criterios de decision y tres temas delegados o cerrados.',
    },
  },
  {
    id: 'burnout_proximity',
    title: 'Proximidad a agotamiento',
    when: {
      allTags: ['riesgo_burnout'],
      anyTags: ['fatiga_acumulada', 'baja_recuperacion', 'limites_debiles', 'rutina_no_sostenible'],
      minTagSeverity: { riesgo_burnout: 3 },
    },
    produces: {
      type: 'burnout_risk',
      severity: 4,
      title: 'Hay riesgo operativo de agotamiento',
      message: 'El sistema personal muestra senales de desgaste que pueden afectar continuidad, criterio y energia.',
      risk: 'Si la rutina sigue igual, el costo de recuperar capacidad puede ser mayor que el costo de prevenir ahora.',
      action: 'Bajar carga secundaria, proteger recuperacion y revisar semanalmente energia, claridad y limites.',
    },
  },
  {
    id: 'fragile_energy_system',
    title: 'Sistema de energia fragil',
    when: {
      allTags: ['energia_inestable'],
      anyTags: ['combustible_fisico_bajo', 'sedentarismo_operativo', 'pausas_insuficientes'],
      maxSectionScore: { nutrition_energy: 72 },
    },
    produces: {
      type: 'highest_roi_habit',
      severity: 3,
      title: 'El habito de mayor ROI esta en estabilizar energia fisica',
      message: 'La ejecucion diaria tiene variacion porque el cuerpo no recibe una base estable de combustible, agua o movimiento.',
      risk: 'La productividad puede depender de urgencia, cafeina o fuerza de voluntad cuando la energia cae.',
      action: 'Fijar un sistema minimo: dos comidas completas, agua visible y dos pausas breves de movimiento.',
    },
  },
  {
    id: 'fragmented_recovery_system',
    title: 'Recuperacion fragmentada',
    when: {
      allTags: ['recuperacion_fragmentada'],
      anyTags: ['pantallas_nocturnas', 'trabajo_nocturno', 'baja_recuperacion'],
    },
    produces: {
      type: 'highest_roi_habit',
      severity: 3,
      title: 'La mejora con mayor retorno esta en reparar el cierre nocturno',
      message: 'El descanso no falla solo por horas; falla porque el cierre mental y fisico llega fragmentado.',
      risk: 'El dia siguiente empieza con menor claridad aunque la agenda no haya cambiado.',
      action: 'Eliminar una fuente nocturna de estimulo y sostener una hora fija de cierre por siete dias.',
    },
  },
  {
    id: 'weak_boundaries_first',
    title: 'Primer limite operativo',
    when: {
      allTags: ['limites_debiles'],
      anyTags: ['trabajo_nocturno', 'trabajo_extendido', 'dificultad_desconexion', 'culpa_descanso'],
    },
    produces: {
      type: 'first_boundary',
      severity: 3,
      title: 'El primer limite debe proteger el cierre del dia',
      message: 'El trabajo esta invadiendo el espacio donde deberia recuperarse capacidad operativa.',
      risk: 'Sin limite de cierre, cualquier mejora de habitos queda expuesta a la siguiente urgencia.',
      action: 'Definir una hora limite, una excepcion real y un ritual de cierre de 10 minutos.',
    },
  },
  {
    id: 'sustainable_operator_strength',
    title: 'Sistema sostenible',
    when: {
      allTags: ['recuperacion_estable', 'claridad_operativa', 'limites_saludables'],
      minOverallScore: 78,
    },
    produces: {
      type: 'sustainability_risk',
      severity: 2,
      title: 'La capacidad actual es buena, pero debe protegerse al crecer la carga',
      message: 'El sistema personal tiene base saludable; el riesgo es aceptar mas responsabilidad sin proteger sus condiciones.',
      risk: 'La fortaleza puede convertirse en deuda si se usa como permiso para operar sin limites.',
      action: 'Documentar que habitos sostienen el rendimiento y tratarlos como condiciones no negociables.',
    },
  },
];

type PatternCopy = Pick<HumanPatternRule, 'title'> & {
  produces: Pick<HumanPatternRule['produces'], 'title' | 'message' | 'risk' | 'action'>;
};

const RULE_TRANSLATIONS: Partial<Record<Exclude<HumanEngineLanguage, 'es'>, Partial<Record<string, PatternCopy>>>> = {
  en: {
    unclosed_recovery_cycles: {
      title: 'Open recovery cycles',
      produces: {
        title: 'The person is not closing real recovery cycles',
        message: 'Mental load remains active outside work and physical recovery does not compensate the demand.',
        risk: 'Performance may hold for a few days, but with gradual deterioration in clarity and pressure tolerance.',
        action: 'Install a mandatory daily shutdown: pending items out of memory, tomorrow’s first step, and an operating cutoff time.',
      },
    },
    pressure_based_performance: {
      title: 'Pressure-based performance',
      produces: {
        title: 'Performance depends more on pressure than sustainable recovery',
        message: 'The person can produce, but the personal system demands too much discipline to remain stable.',
        risk: 'As responsibilities increase, the same performance level will require more tension and less recovery margin.',
        action: 'Turn one repeated demand into an operating rule and reduce one secondary load this week.',
      },
    },
    personal_operation_not_scalable: {
      title: 'Non-scalable personal operation',
      produces: {
        title: 'The personal operation depends on continuous availability',
        message: 'The system works because the person is present, available, or constantly resolving.',
        risk: 'Human capacity becomes the operating ceiling: more volume means more presence, not more system.',
        action: 'Document one critical routine and define what can move without direct intervention.',
      },
    },
    cognitive_overload_execution: {
      title: 'Executive cognitive overload',
      produces: {
        title: 'The main capacity leak is cognitive load',
        message: 'The mind is absorbing tracking, open decisions, and tension that should be outside memory.',
        risk: 'Executive quality drops before work volume drops, which is why the issue may not be visible immediately.',
        action: 'Reduce open context: one pending list, decision criteria, and three topics delegated or closed.',
      },
    },
    burnout_proximity: {
      title: 'Burnout proximity',
      produces: {
        title: 'There is an operating risk of burnout',
        message: 'The personal system shows wear signals that can affect continuity, judgment, and energy.',
        risk: 'If the routine stays the same, recovering capacity may cost more than preventing the decline now.',
        action: 'Lower secondary load, protect recovery, and review energy, clarity, and boundaries weekly.',
      },
    },
    fragile_energy_system: {
      title: 'Fragile energy system',
      produces: {
        title: 'The highest ROI habit is stabilizing physical energy',
        message: 'Daily execution varies because the body lacks a stable base of fuel, water, or movement.',
        risk: 'Productivity can depend on urgency, caffeine, or willpower when energy drops.',
        action: 'Set a minimum system: two complete meals, visible water, and two short movement breaks.',
      },
    },
    fragmented_recovery_system: {
      title: 'Fragmented recovery',
      produces: {
        title: 'The highest-return improvement is repairing the nighttime shutdown',
        message: 'Rest does not fail only because of hours; it fails because mental and physical shutdown arrives fragmented.',
        risk: 'The next day starts with lower clarity even if the schedule did not change.',
        action: 'Remove one nighttime stimulus source and sustain a fixed shutdown hour for seven days.',
      },
    },
    weak_boundaries_first: {
      title: 'First operating boundary',
      produces: {
        title: 'The first boundary should protect the end of the day',
        message: 'Work is invading the space where operating capacity should recover.',
        risk: 'Without a shutdown boundary, any habit improvement remains exposed to the next urgency.',
        action: 'Define a cutoff time, a real exception, and a 10-minute shutdown ritual.',
      },
    },
    sustainable_operator_strength: {
      title: 'Sustainable system',
      produces: {
        title: 'Current capacity is good, but must be protected as load grows',
        message: 'The personal system has a healthy base; the risk is accepting more responsibility without protecting its conditions.',
        risk: 'Strength can turn into debt if it becomes permission to operate without boundaries.',
        action: 'Document which habits sustain performance and treat them as non-negotiable conditions.',
      },
    },
  },
  fr: {
    unclosed_recovery_cycles: {
      title: 'Cycles de récupération ouverts',
      produces: {
        title: 'La personne ne ferme pas de vrais cycles de récupération',
        message: 'La charge mentale reste active hors travail et la récupération physique ne compense pas la demande.',
        risk: 'Le rendement peut tenir quelques jours, mais avec une baisse progressive de clarté et de tolérance à la pression.',
        action: 'Installer une fermeture quotidienne obligatoire: sortir les tâches de la mémoire, définir le premier pas de demain et une heure limite d’opération.',
      },
    },
    pressure_based_performance: {
      title: 'Rendement par pression',
      produces: {
        title: 'Le rendement dépend plus de la pression que d’une récupération durable',
        message: 'La personne peut produire, mais le système personnel exige trop de discipline pour rester stable.',
        risk: 'Avec plus de responsabilités, le même niveau de rendement demandera plus de tension et moins de marge de récupération.',
        action: 'Transformer une exigence répétée en règle opérationnelle et réduire une charge secondaire cette semaine.',
      },
    },
    personal_operation_not_scalable: {
      title: 'Opération personnelle non scalable',
      produces: {
        title: 'L’opération personnelle dépend d’une disponibilité continue',
        message: 'Le système fonctionne parce que la personne est présente, disponible ou en résolution constante.',
        risk: 'La capacité humaine devient le plafond opérationnel: plus de volume signifie plus de présence, pas plus de système.',
        action: 'Documenter une routine critique et définir ce qui peut avancer sans intervention directe.',
      },
    },
  },
  pt: {
    unclosed_recovery_cycles: {
      title: 'Ciclos de recuperação abertos',
      produces: {
        title: 'A pessoa não está fechando ciclos reais de recuperação',
        message: 'A carga mental continua ativa fora do trabalho e a recuperação física não compensa a exigência.',
        risk: 'O rendimento pode se manter por alguns dias, mas com deterioração gradual da clareza e da tolerância à pressão.',
        action: 'Instale um fechamento diário obrigatório: pendências fora da memória, primeiro passo de amanhã e hora limite de operação.',
      },
    },
    pressure_based_performance: {
      title: 'Desempenho por pressão',
      produces: {
        title: 'O desempenho depende mais de pressão do que de recuperação sustentável',
        message: 'A pessoa consegue produzir, mas o sistema pessoal exige disciplina demais para se manter estável.',
        risk: 'Com mais responsabilidades, o mesmo nível de desempenho exigirá mais tensão e menos margem de recuperação.',
        action: 'Transforme uma exigência repetida em regra operacional e reduza uma carga secundária nesta semana.',
      },
    },
    personal_operation_not_scalable: {
      title: 'Operação pessoal não escalável',
      produces: {
        title: 'A operação pessoal depende de disponibilidade contínua',
        message: 'O sistema funciona porque a pessoa está presente, disponível ou resolvendo constantemente.',
        risk: 'A capacidade humana vira o teto operacional: mais volume significa mais presença, não mais sistema.',
        action: 'Documente uma rotina crítica e defina o que pode avançar sem intervenção direta.',
      },
    },
  },
  ko: {
    unclosed_recovery_cycles: {
      title: '닫히지 않은 회복 사이클',
      produces: {
        title: '실제 회복 사이클이 닫히지 않고 있습니다',
        message: '정신적 부하가 업무 밖에서도 계속 활성화되어 있고 신체 회복이 요구 수준을 보상하지 못합니다.',
        risk: '며칠은 성과가 유지될 수 있지만 명료성과 압박 내성이 점진적으로 저하될 수 있습니다.',
        action: '업무 종료 루틴을 의무화하세요: 미해결 항목을 머리 밖으로 꺼내고, 내일 첫 단계를 정하고, 운영 종료 시간을 설정합니다.',
      },
    },
    pressure_based_performance: {
      title: '압박 기반 성과',
      produces: {
        title: '성과가 지속 가능한 회복보다 압박에 더 의존합니다',
        message: '생산은 가능하지만 개인 시스템이 안정적으로 유지되기 위해 너무 많은 discipline을 요구합니다.',
        risk: '책임이 늘어나면 같은 성과를 유지하기 위해 더 많은 긴장과 더 적은 회복 여지가 필요해집니다.',
        action: '반복되는 요구 하나를 운영 규칙으로 바꾸고 이번 주에 보조 부하 하나를 줄이세요.',
      },
    },
    personal_operation_not_scalable: {
      title: '확장되지 않는 개인 운영',
      produces: {
        title: '개인 운영이 지속적인 가용성에 의존합니다',
        message: '시스템은 그 사람이 계속 존재하고, 응답하고, 해결하기 때문에 작동합니다.',
        risk: '인간 역량이 운영 한계가 됩니다. 더 많은 양은 더 많은 시스템이 아니라 더 많은 존재를 요구합니다.',
        action: '핵심 루틴 하나를 문서화하고 직접 개입 없이 진행될 수 있는 부분을 정의하세요.',
      },
    },
  },
  zh: {
    unclosed_recovery_cycles: {
      title: '未闭合的恢复周期',
      produces: {
        title: '这个人没有真正关闭恢复周期',
        message: '心理负荷在工作之外仍然活跃，身体恢复无法补偿当前要求。',
        risk: '表现可能还能维持几天，但清晰度和承压能力会逐步下降。',
        action: '建立强制性的每日收尾：把待办移出大脑、写下明天第一步，并设定运营截止时间。',
      },
    },
    pressure_based_performance: {
      title: '压力驱动的表现',
      produces: {
        title: '表现更多依赖压力，而不是可持续恢复',
        message: '这个人可以产出，但个人系统需要过多纪律才能保持稳定。',
        risk: '责任增加时，同样的表现会需要更多紧张和更少恢复空间。',
        action: '把一个重复要求变成运营规则，并在本周减少一个次要负荷。',
      },
    },
    personal_operation_not_scalable: {
      title: '个人运营不可扩展',
      produces: {
        title: '个人运营依赖持续可用性',
        message: '系统之所以运转，是因为这个人持续在场、可用或不断解决问题。',
        risk: '人的能力会成为运营天花板：更多工作量意味着更多在场，而不是更多系统。',
        action: '记录一个关键例行流程，并定义哪些事项可以在没有直接介入的情况下推进。',
      },
    },
  },
};

const GENERIC_RULE_COPY: Record<Exclude<HumanEngineLanguage, 'es' | 'en'>, PatternCopy> = {
  fr: {
    title: 'Patron opérationnel détecté',
    produces: {
      title: 'Un patron de capacité personnelle doit être ajusté',
      message: 'Le moteur détecte une combinaison de signaux qui peut limiter la performance soutenable.',
      risk: 'Si le patron continue, la personne peut compenser par plus de pression au lieu de gagner en capacité.',
      action: 'Installer un ajustement visible cette semaine et vérifier s’il réduit la charge ou améliore la clarté.',
    },
  },
  pt: {
    title: 'Padrão operacional detectado',
    produces: {
      title: 'Um padrão de capacidade pessoal precisa de ajuste',
      message: 'O motor detecta uma combinação de sinais que pode limitar o desempenho sustentável.',
      risk: 'Se o padrão continuar, a pessoa pode compensar com mais pressão em vez de ganhar capacidade.',
      action: 'Instale um ajuste visível nesta semana e revise se ele reduz carga ou melhora clareza.',
    },
  },
  ko: {
    title: '운영 패턴 감지',
    produces: {
      title: '개인 역량 패턴에 조정이 필요합니다',
      message: '지속 가능한 성과를 제한할 수 있는 신호 조합이 감지되었습니다.',
      risk: '이 패턴이 계속되면 역량이 늘기보다 더 많은 압박으로 보상하게 될 수 있습니다.',
      action: '이번 주에 눈에 보이는 조정을 하나 설치하고 부하가 줄거나 명료성이 개선되는지 확인하세요.',
    },
  },
  zh: {
    title: '检测到运营模式',
    produces: {
      title: '个人能力模式需要调整',
      message: '系统检测到一组可能限制可持续表现的信号。',
      risk: '如果该模式持续，个人可能会用更多压力来补偿，而不是获得真正能力。',
      action: '本周建立一个可见调整，并检查它是否降低负荷或提升清晰度。',
    },
  },
};

const getLocalizedRules = (locale: string): HumanPatternRule[] => {
  const language = getHumanEngineLanguage(locale);
  const translations = language === 'es' ? undefined : RULE_TRANSLATIONS[language];

  if (!translations) {
    return RULES;
  }

  return RULES.map((rule) => {
    const translation = translations[rule.id]
      ?? (language !== 'en' && language !== 'es' ? GENERIC_RULE_COPY[language] : undefined);
    if (!translation) {
      return rule;
    }

    return {
      ...rule,
      title: translation.title,
      produces: {
        ...rule.produces,
        ...translation.produces,
      },
    };
  });
};

const tagExists = (tagMap: Map<string, AggregatedHumanTag>, tagId: string) => tagMap.has(tagId);

const sectionScoresMatch = (
  sections: HumanSectionEngineScore[],
  rule: HumanPatternRule,
) => {
  const sectionMap = new Map<HumanPerformanceSection, number>(
    sections.map((section) => [section.key, section.averageScore]),
  );
  const maxScoreMatches = Object.entries(rule.when.maxSectionScore ?? {}).every(([section, maxScore]) => (
    (sectionMap.get(section as HumanPerformanceSection) ?? 0) <= Number(maxScore)
  ));
  const minScoreMatches = Object.entries(rule.when.minSectionScore ?? {}).every(([section, minScore]) => (
    (sectionMap.get(section as HumanPerformanceSection) ?? 0) >= Number(minScore)
  ));

  return maxScoreMatches && minScoreMatches;
};

const overallScoreMatches = (
  overallScore: number,
  rule: HumanPatternRule,
) => {
  if (rule.when.maxOverallScore !== undefined && overallScore > rule.when.maxOverallScore) {
    return false;
  }

  if (rule.when.minOverallScore !== undefined && overallScore < rule.when.minOverallScore) {
    return false;
  }

  return true;
};

const ruleMatches = (
  rule: HumanPatternRule,
  tagMap: Map<string, AggregatedHumanTag>,
  sections: HumanSectionEngineScore[],
  overallScore: number,
) => {
  const allTagsMatch = (rule.when.allTags ?? []).every((tagId) => tagExists(tagMap, tagId));
  const anyTags = rule.when.anyTags ?? [];
  const anyTagsMatch = anyTags.length === 0 || anyTags.some((tagId) => tagExists(tagMap, tagId));
  const severityMatches = Object.entries(rule.when.minTagSeverity ?? {}).every(([tagId, minSeverity]) => (
    (tagMap.get(tagId)?.maxSeverity ?? 0) >= Number(minSeverity)
  ));

  return allTagsMatch
    && anyTagsMatch
    && severityMatches
    && sectionScoresMatch(sections, rule)
    && overallScoreMatches(overallScore, rule);
};

const getRuleEvidence = (
  rule: HumanPatternRule,
  tagMap: Map<string, AggregatedHumanTag>,
) => {
  const involvedTags = [
    ...(rule.when.allTags ?? []),
    ...(rule.when.anyTags ?? []).filter((tagId) => tagMap.has(tagId)),
  ];

  return involvedTags
    .flatMap((tagId) => tagMap.get(tagId)?.evidence ?? [])
    .slice(0, 4)
    .map((evidence) => `${evidence.question}: ${evidence.answer}`);
};

export const matchHumanPerformancePatterns = ({
  tags,
  sections,
  overallScore,
  locale,
}: {
  tags: AggregatedHumanTag[];
  sections: HumanSectionEngineScore[];
  overallScore: number;
  locale: string;
}): HumanPatternMatch[] => {
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  return getLocalizedRules(locale).filter((rule) => ruleMatches(rule, tagMap, sections, overallScore))
    .map((rule) => ({
      id: rule.id,
      title: rule.produces.title,
      type: rule.produces.type,
      severity: rule.produces.severity,
      message: rule.produces.message,
      risk: rule.produces.risk,
      action: rule.produces.action,
      evidence: getRuleEvidence(rule, tagMap),
    }))
    .sort((left, right) => right.severity - left.severity);
};
