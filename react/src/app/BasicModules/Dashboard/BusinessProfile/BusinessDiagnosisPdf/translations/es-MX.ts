export const esMX = {
  locale: 'es-MX',
  fileName: 'Indice de Madurez Empresarial (IME).pdf',
  companyFallback: 'Negocio actual',
  questionsLabel: 'preguntas',
  scoreLabel: 'IME',
  outOf100: 'de 100',
  levelNames: {
    level1: 'Inicial',
    level2: 'Emergente',
    level3: 'Organizado',
    level4: 'Escalable',
    level5: 'Optimizado',
  },
  progressLevels: ['Inicial', 'Organizado', 'Escalable', 'Optimizado'],
  moduleLabels: {
    people: 'Recursos Humanos',
    processes: 'Procesos y tareas',
    products: 'CRM / Punto de venta',
    finance: 'Gastos y KPIs',
  },
  summaryTemplate:
    'La empresa marca {score}/100. Su pilar mas fuerte es {strongest}, mientras que el primer frente a reforzar es {weakest}.',
  overallInterpretations: {
    critical:
      'El negocio necesita construir una base de control antes de crecer: responsables claros, rutinas visibles y datos minimos para decidir.',
    emerging:
      'Hay movimiento operativo, pero la empresa todavia depende de seguimiento informal y criterio personal.',
    organized:
      'La operacion ya tiene una base funcional, pero necesita mayor visibilidad, responsables y ritmo repetible.',
    scalable:
      'La empresa tiene una plataforma solida para crecer si protege la disciplina en los frentes mas debiles.',
    optimized:
      'La empresa muestra alta madurez operativa. El reto es sostener estandares mientras aumenta la complejidad.',
  },
  pillarInterpretations: {
    critical: '{section} necesita estructura inmediata antes de sostener crecimiento.',
    emerging: '{section} tiene practicas utiles, pero todavia no son suficientemente consistentes.',
    organized: '{section} opera con una base que puede reforzarse y medirse mejor.',
    scalable: '{section} ya soporta crecimiento con rutinas relativamente claras.',
    optimized: '{section} es una fortaleza que puede usarse como modelo para el resto del negocio.',
  },
  completenessNote: {
    empty: 'Datos insuficientes: responde el diagnostico para generar interpretacion operativa.',
    template: 'Lectura basada en {answered} de {total} respuestas. Confianza del diagnostico: {confidence}%.',
  },
  pillarFallbacks: {
    people: {
      risk: 'El ritmo operativo puede depender demasiado de coordinacion personal y responsables poco claros.',
      action: 'Aclara responsables, decisiones y una rutina de revision para el trabajo mas recurrente.',
    },
    processes: {
      risk: 'La ejecucion puede hacerse lenta cuando tareas, bloqueos y responsables no son suficientemente visibles.',
      action: 'Crea un flujo visible con responsable, fecha, estado y criterio de cierre.',
    },
    products: {
      risk: 'El esfuerzo comercial puede dispersarse entre ofertas o clientes sin suficiente foco en retorno.',
      action: 'Prioriza la oferta, segmento y senal de margen que deben guiar el crecimiento.',
    },
    finance: {
      risk: 'Las decisiones pueden tomarse sin suficiente visibilidad de caja, costo, margen o rentabilidad.',
      action: 'Conecta precio, costo directo, margen y caja semanal antes de aprobar decisiones de crecimiento.',
    },
  },
  consulting: {
    nextMove: 'Si solo haces una cosa',
  },
  editorial: {
    action: 'Accion',
    answered: 'Respondidas',
    brand: 'INDICE',
    businessDiagnosis: 'Diagnostico empresarial',
    confidence: 'Confianza',
    date: 'Fecha',
    decision: 'Decision',
    evidence: 'Evidencia',
    executiveFindings: 'Hallazgos ejecutivos',
    executiveFindingsCaption:
      'Tres conclusiones operativas para enfocar la siguiente conversacion de direccion.',
    expectedResult: 'Resultado esperado',
    focus: 'Foco',
    footer: 'Generado a partir de respuestas del Perfil Empresarial',
    generatedFrom: 'Generado a partir de respuestas del Perfil Empresarial',
    insightLabel: 'Lectura ejecutiva',
    maturity: 'Madurez',
    maturityView: 'Vista de madurez',
    maturityViewCaption: 'Comparacion de capacidades por pilar y avance general de madurez.',
    module: 'Modulo sugerido',
    pillar: 'Pilar',
    pillarBreakdown: 'Desglose por pilar',
    pillarBreakdownCaption:
      'Lectura operativa de cada frente: capacidad actual, riesgo y accion inmediata.',
    preparedFor: 'Preparado para',
    priorityDecisions: 'Decisiones prioritarias',
    priorityDecisionsCaption:
      'No son tareas aisladas; son decisiones de gestion para elevar control y escalabilidad.',
    problem: 'Problema',
    reportTitle: 'Reporte de Madurez Operativa',
    risk: 'Riesgo',
    roadmap: 'Roadmap ejecutivo',
    roadmapCaption: 'Secuencia sugerida para convertir el diagnostico en ejecucion visible.',
    scoreSummary: 'Resumen de madurez',
  },
  insightTypeLabels: {
    critical_dependency: 'Dependencia critica',
    growth_risk: 'Riesgo al crecer',
    highest_roi_area: 'Mayor ROI operativo',
    main_risk: 'Riesgo principal',
    operational_bottleneck: 'Cuello de botella',
    quick_win: 'Quick win',
    single_priority: 'Prioridad unica',
  },
  insightFallbacks: {
    critical_dependency: {
      title: 'Dependencia critica por reducir',
      message: 'El modelo operativo depende demasiado de responsables informales o personas clave.',
      businessImpact: 'El crecimiento se vuelve fragil cuando la continuidad depende de memoria, disponibilidad o criterio individual.',
      recommendedAction: 'Define un responsable, un respaldo y una rutina visible para el flujo mas sensible.',
    },
    growth_risk: {
      title: 'Crecer podria amplificar la friccion actual',
      message: 'El negocio puede sumar volumen antes de que sus rutinas de control esten listas.',
      businessImpact: 'Mas clientes, personas o ubicaciones pueden aumentar variacion, retrabajo y costo de coordinacion.',
      recommendedAction: 'Estandariza la rutina operativa que mas afecta experiencia del cliente, ejecucion del equipo o caja.',
    },
    highest_roi_area: {
      title: 'Mayor ROI operativo',
      message: 'El mejor retorno esta en mejorar el frente operativo con evidencia mas clara de friccion.',
      businessImpact: 'Una mejora enfocada genera mas valor que repartir esfuerzo en demasiadas iniciativas.',
      recommendedAction: 'Elige una mejora medible y asigna responsable, fecha y ritmo de revision.',
    },
    main_risk: {
      title: 'Riesgo operativo principal',
      message: 'La empresa necesita mayor control visible sobre las senales operativas detectadas.',
      businessImpact: 'Sin visibilidad, las decisiones pueden llegar tarde o depender demasiado de criterio personal.',
      recommendedAction: 'Convierte la senal de mayor riesgo en una decision concreta con responsable y seguimiento semanal.',
    },
    operational_bottleneck: {
      title: 'Cuello de botella operativo',
      message: 'La operacion muestra friccion en la forma de coordinar, dar seguimiento o medir el trabajo.',
      businessImpact: 'La ejecucion puede hacerse mas lenta al crecer el volumen, aunque el equipo este trabajando mucho.',
      recommendedAction: 'Mueve el trabajo recurrente a un sistema visible con responsable, fecha, estado y criterio de cierre.',
    },
    quick_win: {
      title: 'Quick win inmediato',
      message: 'La mejora mas rapida es hacer mas visible el trabajo activo.',
      businessImpact: 'Un pequeno cambio de visibilidad puede reducir seguimiento manual y mejorar responsabilidad rapidamente.',
      recommendedAction: 'Crea esta semana una vista unica de tareas activas, bloqueos y responsables.',
    },
    single_priority: {
      title: 'Prioridad unica',
      message: 'La prioridad es resolver la restriccion operativa mas concreta antes de sumar nuevas iniciativas.',
      businessImpact: 'Hacer mas sin remover la restriccion puede crear mas ruido que avance.',
      recommendedAction: 'Elige una restriccion, un responsable, una metrica y una fecha de revision.',
    },
  },
  roadmapSteps: [
    { label: '7 dias', title: 'Control visible' },
    { label: '30 dias', title: 'Prioridad operativa' },
    { label: '60 dias', title: 'Preparacion para crecer' },
  ],
  roadmapOutcomes: [
    'Responsables y primera accion alineados para reducir ambiguedad.',
    'Ritmo operativo visible para dar seguimiento sin depender de memoria o chats.',
    'Base de control lista para escalar con menos supervision manual.',
  ],
} as const;
