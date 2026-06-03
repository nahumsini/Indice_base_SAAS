export const esMX = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía de operación del equipo',
  subtitle: 'Usa Recursos Humanos para mantener colaboradores, asistencia, nómina y responsabilidades alineadas.',
  controlLabel: 'Control del personal',
  functionsLabel: 'Funciones de la pestaña',
  guideProgressLabel: 'Progreso de guía',
  guideProgressCompleteLabel: 'revisado',
  previousStepLabel: 'Recomendación anterior',
  nextStepLabel: 'Siguiente recomendación',
  stepIndicatorLabel: 'Mostrar recomendación',
  tabs: {
    collaborators: {
      label: 'Colaboradores',
      ctaLabel: 'Revisar colaboradores',
      title: 'Centraliza la base del personal',
      summary: 'Mantén expedientes, roles, unidades y contexto laboral organizados desde una sola fuente operativa.',
      value: 'Una base confiable mejora responsabilidad, nómina, asistencia y visibilidad del equipo.',
      steps: [
        {
          title: 'Completa cada expediente',
          description: 'Usa datos personales, de contacto, puesto y documentos consistentes para reducir seguimiento manual.',
        },
        {
          title: 'Segmenta por unidad y departamento',
          description: 'Conecta colaboradores con sus áreas reales para que filtros, reportes y responsabilidades tengan sentido.',
        },
        {
          title: 'Mantén limpio el estado',
          description: 'Revisa activos e inactivos para evitar ruido en nómina, accesos y reportes.',
        },
      ],
    },
    attendance: {
      label: 'Asistencia',
      ctaLabel: 'Revisar asistencia',
      title: 'Haz visible la presencia diaria',
      summary: 'Controla entradas, salidas, jornadas y evidencia para que la operación diaria no dependa de memoria.',
      value: 'La visibilidad de asistencia ayuda a detectar ausencias, retardos, huecos de cobertura y riesgo operativo.',
      steps: [
        {
          title: 'Revisa señales diarias',
          description: 'Identifica quién está presente, quién falta y dónde se requiere seguimiento.',
        },
        {
          title: 'Conecta asistencia con ubicaciones',
          description: 'Usa ubicaciones y kioskos para reducir validación manual y alinear asistencia con el lugar real de trabajo.',
        },
        {
          title: 'Resuelve excepciones rápido',
          description: 'Corrige registros faltantes antes de que afecten nómina o conversaciones de desempeño.',
        },
      ],
    },
    control: {
      label: 'Centro de control',
      ctaLabel: 'Abrir centro de control',
      title: 'Opera horarios y accesos con disciplina',
      summary: 'Gestiona horarios, kioskos, configuraciones de asistencia y rutinas operativas del equipo.',
      value: 'Una capa clara de control reduce improvisación y ayuda a supervisores a sostener la ejecución diaria.',
      steps: [
        {
          title: 'Define horarios con claridad',
          description: 'Mantén turnos y horas operativas actualizadas para interpretar correctamente asistencia y excepciones.',
        },
        {
          title: 'Usa kioskos donde opera el equipo',
          description: 'Configura puntos de acceso cerca de la operación real para registrar asistencia con menos fricción.',
        },
        {
          title: 'Revisa accesos del colaborador',
          description: 'Mantén PIN, rostro y accesos alineados con el rol actual de cada colaborador.',
        },
      ],
    },
    payroll: {
      label: 'Nómina',
      ctaLabel: 'Revisar nómina',
      title: 'Prepara nómina con mejores insumos',
      summary: 'Organiza salario, percepciones variables, deducciones y contexto antes de tomar decisiones de pago.',
      value: 'Insumos limpios reducen retrabajo, aumentan confianza y ayudan a entender mejor el costo laboral.',
      steps: [
        {
          title: 'Valida la configuración',
          description: 'Confirma salario, jurisdicción, banco y datos laborales antes de correr cálculos.',
        },
        {
          title: 'Controla pagos variables',
          description: 'Registra bonos, comisiones y ajustes con contexto para que los cambios sean trazables.',
        },
        {
          title: 'Revisa antes de cerrar',
          description: 'Usa resúmenes para detectar inconsistencias antes de que lleguen a pago o contabilidad.',
        },
      ],
    },
    announcements: {
      label: 'Comunicados',
      ctaLabel: 'Revisar comunicados',
      title: 'Comunica decisiones operativas',
      summary: 'Mantén al equipo informado sobre políticas, recordatorios, cambios y avisos relevantes.',
      value: 'La comunicación estructurada reduce incertidumbre y ayuda a que todos operen con la misma información.',
      steps: [
        {
          title: 'Publica mensajes accionables',
          description: 'Explica qué cambió, a quién afecta y qué acción se espera.',
        },
        {
          title: 'Segmenta la audiencia',
          description: 'Envía información al grupo correcto para evitar ruido operativo.',
        },
      ],
    },
    assets: {
      label: 'Activos',
      ctaLabel: 'Revisar activos',
      title: 'Controla activos asignados',
      summary: 'Rastrea equipo, herramientas y recursos para conectar propiedad de la empresa con responsables.',
      value: 'La visibilidad de activos reduce pérdidas, mejora responsabilidad y aclara qué tiene cada colaborador.',
      steps: [
        {
          title: 'Asigna con responsabilidad',
          description: 'Conecta cada activo relevante con colaborador, estado y contexto operativo.',
        },
        {
          title: 'Revisa condición y devoluciones',
          description: 'Usa estados para planear reemplazos, recuperaciones y entregas sin confusión.',
        },
      ],
    },
    records: {
      label: 'Actas',
      ctaLabel: 'Revisar actas',
      title: 'Documenta eventos importantes',
      summary: 'Organiza acuerdos, incidentes, constancias y eventos formales de Recursos Humanos.',
      value: 'Buenas actas protegen a la empresa, sostienen decisiones justas y conservan contexto.',
      steps: [
        {
          title: 'Captura el contexto',
          description: 'Documenta qué pasó, quién participó y qué seguimiento requiere.',
        },
        {
          title: 'Mantén evidencia trazable',
          description: 'Adjunta soporte y conserva un historial limpio para revisiones futuras.',
        },
      ],
    },
    permissions: {
      label: 'Permisos',
      ctaLabel: 'Revisar permisos',
      title: 'Gestiona ausencias con control',
      summary: 'Organiza permisos, ausencias, aprobaciones y contexto sin perder visibilidad operativa.',
      value: 'Un flujo controlado ayuda a planear cobertura y reduce sorpresas en la operación diaria.',
      steps: [
        {
          title: 'Evalúa impacto operativo',
          description: 'Revisa cada solicitud contra cobertura, urgencia y capacidad del equipo.',
        },
        {
          title: 'Mantén aprobaciones trazables',
          description: 'Usa estados y comentarios claros para que las decisiones se entiendan después.',
        },
      ],
    },
    incentives: {
      label: 'Incentivos',
      ctaLabel: 'Revisar incentivos',
      title: 'Conecta incentivos con ejecución',
      summary: 'Refuerza hábitos, resultados y responsabilidades que mejoran la operación del equipo.',
      value: 'Incentivos claros alinean motivación con prioridades del negocio y no con premios aislados.',
      steps: [
        {
          title: 'Define qué conducta se premia',
          description: 'Conecta cada incentivo con un objetivo operativo claro, no solo con un monto.',
        },
        {
          title: 'Revisa justicia y consistencia',
          description: 'Mantén criterios entendibles para que el equipo confíe en el programa.',
        },
      ],
    },
    kpis: {
      label: 'Indicadores RH',
      ctaLabel: 'Revisar KPIs de RH',
      title: 'Mide la operación del personal',
      summary: 'Lee señales de headcount, actividad, asistencia, nómina y comportamiento operativo del equipo.',
      value: 'Los indicadores de personal ayudan a detectar problemas temprano y decidir dónde poner atención directiva.',
      steps: [
        {
          title: 'Lee señales del equipo',
          description: 'Observa cambios en colaboradores activos, calidad de asistencia, permisos e impacto de nómina.',
        },
        {
          title: 'Convierte métricas en acción',
          description: 'Usa movimientos de KPIs para priorizar seguimiento con supervisores, finanzas o líderes.',
        },
      ],
    },
  },
} as const;
