import type {
  AggregatedDiagnosisTag,
  BusinessDiagnosisEngineReport,
  DiagnosisContext,
  DiagnosisPatternMatch,
  DiagnosisPatternRule,
  DiagnosisPillarEngineScore,
} from './types';

const RULES: DiagnosisPatternRule[] = [
  {
    id: 'informal_coordination_dependency',
    title: 'Coordinacion informal',
    when: {
      allTags: ['seguimiento_manual', 'comunicacion_por_chat', 'responsabilidades_poco_claras'],
    },
    produces: {
      type: 'operational_bottleneck',
      severity: 4,
      title: 'La operacion depende de coordinacion informal',
      message: 'El trabajo avanza por chats, listas y acuerdos poco visibles.',
      risk: 'Al crecer, las tareas se perderan entre conversaciones, responsables difusos y seguimiento manual.',
      action: 'Centralizar tareas recurrentes con responsable, fecha, estado y criterio de cierre.',
      suggestedModule: 'Procesos y tareas',
    },
  },
  {
    id: 'founder_operating_ceiling',
    title: 'Techo operativo por fundador',
    when: {
      allTags: ['dependencia_fundador', 'baja_delegacion'],
      anyTags: ['roles_poco_claros', 'dependencia_personas_clave'],
    },
    produces: {
      type: 'critical_dependency',
      severity: 4,
      title: 'El negocio tiene un techo operativo en la direccion',
      message: 'La empresa todavia depende demasiado de pocas personas para decidir y desbloquear ejecucion.',
      risk: 'El crecimiento se convertira en carga personal, retrasos y decisiones reactivas.',
      action: 'Delegar una decision repetitiva con criterio, limite y responsable visible antes de sumar mas volumen.',
      suggestedModule: 'Recursos Humanos',
    },
  },
  {
    id: 'low_financial_precision',
    title: 'Baja precision financiera',
    when: {
      allTags: ['decisiones_por_intuicion', 'costos_aproximados', 'margen_estimado'],
    },
    produces: {
      type: 'main_risk',
      severity: 4,
      title: 'El negocio decide sin visibilidad real de rentabilidad',
      message: 'Precio, costo, margen y decisiones financieras no estan conectados con suficiente precision.',
      risk: 'Puede crecer en ventas mientras pierde margen o liquidez.',
      action: 'Separar precio, costo directo, margen y caja semanal antes de aprobar descuentos, compras o expansion.',
      suggestedModule: 'Gastos y KPIs',
    },
  },
  {
    id: 'commercial_growth_without_margin',
    title: 'Crecimiento comercial sin control de margen',
    when: {
      allTags: ['precios_por_intuicion', 'baja_medicion_comercial'],
      anyTags: ['margen_estimado', 'costos_aproximados'],
    },
    produces: {
      type: 'growth_risk',
      severity: 4,
      title: 'Vender mas podria no significar ganar mas',
      message: 'La estrategia comercial no tiene suficiente lectura de margen, costos y desempeno por oferta.',
      risk: 'El negocio puede aumentar ingresos y al mismo tiempo presionar caja o utilidad.',
      action: 'Ordenar productos o servicios por ventas, margen y complejidad antes de empujar crecimiento.',
      suggestedModule: 'CRM / Punto de venta',
    },
  },
  {
    id: 'scale_before_standardization',
    title: 'Escalamiento antes de estandarizar',
    when: {
      allTags: ['operacion_no_replicable', 'baja_escalabilidad'],
      anyTags: ['baja_documentacion', 'dependencia_personas_clave'],
    },
    produces: {
      type: 'growth_risk',
      severity: 4,
      title: 'La operacion no esta lista para crecer sin friccion',
      message: 'La empresa puede vender o abrir mas frentes, pero la ejecucion todavia no es replicable.',
      risk: 'Mas clientes, unidades o personas aumentaran errores, variacion y dependencia interna.',
      action: 'Estandarizar los tres flujos que mas afectan cliente, equipo y caja antes de expandir.',
      suggestedModule: 'Procesos y tareas',
    },
  },
  {
    id: 'blind_operation',
    title: 'Operacion con baja visibilidad',
    when: {
      allTags: ['baja_visibilidad_operativa', 'procesos_informales'],
      maxPillarScore: { processes: 65 },
    },
    produces: {
      type: 'operational_bottleneck',
      severity: 3,
      title: 'El avance operativo se detecta tarde',
      message: 'La operacion tiene poca visibilidad de pendientes, bloqueos y responsables.',
      risk: 'Los retrasos aparecen cuando ya afectaron servicio, ventas o costos.',
      action: 'Instalar una revision semanal de pendientes, vencidos y bloqueos con evidencia visible.',
      suggestedModule: 'Procesos y tareas',
    },
  },
  {
    id: 'product_offer_needs_focus',
    title: 'Oferta y cliente necesitan foco',
    when: {
      anyTags: ['oferta_poco_clara', 'cliente_objetivo_difuso', 'propuesta_valor_debil'],
      maxPillarScore: { products: 70 },
    },
    produces: {
      type: 'highest_roi_area',
      severity: 3,
      title: 'El mayor retorno esta en clarificar oferta y cliente',
      message: 'La oportunidad comercial no empieza con mas actividad, sino con foco en que vender, a quien y por que.',
      risk: 'Marketing, ventas y servicio pueden dispersarse en clientes u ofertas de bajo retorno.',
      action: 'Definir oferta principal, cliente ideal y promesa de valor medible antes de invertir en mas canales.',
      suggestedModule: 'CRM / Punto de venta',
    },
  },
  {
    id: 'cash_resilience_gap',
    title: 'Riesgo de resiliencia de caja',
    when: {
      allTags: ['flujo_no_proyectado', 'sin_colchon_crisis'],
      anyTags: ['ventas_no_predecibles', 'revision_financiera_esporadica'],
    },
    produces: {
      type: 'main_risk',
      severity: 4,
      title: 'La caja puede reaccionar tarde ante un mes dificil',
      message: 'El negocio no tiene suficiente proyeccion de flujo ni escenario de emergencia.',
      risk: 'Un periodo bajo puede forzar deuda cara, recortes improvisados o decisiones apresuradas.',
      action: 'Crear una proyeccion de caja de cuatro semanas y definir caja minima operativa.',
      suggestedModule: 'Gastos y KPIs',
    },
  },
  {
    id: 'quick_win_task_visibility',
    title: 'Quick win de visibilidad',
    when: {
      anyTags: ['seguimiento_manual', 'perdida_tiempo_seguimiento', 'baja_visibilidad_operativa'],
    },
    produces: {
      type: 'quick_win',
      severity: 2,
      title: 'Hacer visible el trabajo activo esta semana',
      message: 'Hay friccion que puede bajar rapido si los pendientes dejan de vivir en memoria o chats.',
      risk: 'Sin visibilidad, el equipo seguira usando tiempo en preguntar y perseguir avances.',
      action: 'Crear una vista unica de tareas con responsable, fecha, estado y bloqueo.',
      suggestedModule: 'Procesos y tareas',
    },
  },
];

const tagExists = (tagMap: Map<string, AggregatedDiagnosisTag>, tagId: string) => tagMap.has(tagId);

const contextMatches = (actualContext: DiagnosisContext, expectedContext: DiagnosisContext | undefined) => {
  if (!expectedContext) {
    return true;
  }

  return Object.entries(expectedContext).every(([key, expectedValue]) => (
    actualContext[key as keyof DiagnosisContext] === expectedValue
  ));
};

const pillarScoresMatch = (
  pillars: DiagnosisPillarEngineScore[],
  rule: DiagnosisPatternRule,
) => {
  const pillarMap = new Map(pillars.map((pillar) => [pillar.key, pillar.averageScore]));
  const maxScoreMatches = Object.entries(rule.when.maxPillarScore ?? {}).every(([pillar, maxScore]) => (
    (pillarMap.get(pillar as DiagnosisPillarEngineScore['key']) ?? 0) <= Number(maxScore)
  ));
  const minScoreMatches = Object.entries(rule.when.minPillarScore ?? {}).every(([pillar, minScore]) => (
    (pillarMap.get(pillar as DiagnosisPillarEngineScore['key']) ?? 0) >= Number(minScore)
  ));

  return maxScoreMatches && minScoreMatches;
};

const ruleMatches = (
  rule: DiagnosisPatternRule,
  tagMap: Map<string, AggregatedDiagnosisTag>,
  pillars: DiagnosisPillarEngineScore[],
  context: DiagnosisContext,
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
    && pillarScoresMatch(pillars, rule)
    && contextMatches(context, rule.when.context);
};

const getRuleEvidence = (
  rule: DiagnosisPatternRule,
  tagMap: Map<string, AggregatedDiagnosisTag>,
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

export const matchDiagnosisPatterns = ({
  tags,
  pillars,
  context,
}: Pick<BusinessDiagnosisEngineReport, 'tags' | 'pillars' | 'context'>): DiagnosisPatternMatch[] => {
  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  return RULES.filter((rule) => ruleMatches(rule, tagMap, pillars, context))
    .map((rule) => ({
      id: rule.id,
      title: rule.produces.title,
      type: rule.produces.type,
      severity: rule.produces.severity,
      message: rule.produces.message,
      risk: rule.produces.risk,
      action: rule.produces.action,
      suggestedModule: rule.produces.suggestedModule,
      evidence: getRuleEvidence(rule, tagMap),
    }))
    .sort((left, right) => right.severity - left.severity);
};
