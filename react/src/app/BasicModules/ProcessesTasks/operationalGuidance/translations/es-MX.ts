export const esMX = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía de ejecución operativa',
  subtitle: 'Usa Procesos y Tareas para convertir prioridades en trabajo visible, rutinas repetibles y ejecución medible.',
  controlLabel: 'Control de ejecución',
  functionsLabel: 'Funciones de la pestaña',
  guideProgressLabel: 'Progreso de guía',
  guideProgressCompleteLabel: 'revisado',
  previousStepLabel: 'Recomendación anterior',
  nextStepLabel: 'Siguiente recomendación',
  stepIndicatorLabel: 'Mostrar recomendación',
  tabs: {
    calendar: {
      label: 'Agenda',
      ctaLabel: 'Revisar agenda',
      title: 'Opera el trabajo diario desde un tablero',
      summary: 'Usa Agenda para crear, asignar, priorizar, completar, auditar y dar seguimiento a tareas sin perder contexto.',
      value: 'Una agenda disciplinada reduce olvidos, hace visible la responsabilidad y ayuda a cerrar el día con evidencia clara.',
      steps: [
        {
          title: 'Mantén tareas accionables',
          description: 'Escribe tareas con título claro, responsable, vencimiento, prioridad y contexto de negocio.',
        },
        {
          title: 'Usa la vista correcta',
          description: 'Usa tabla para control, kanban para flujo y diagrama para tiempos; es el mismo trabajo visto desde distintos ángulos.',
        },
        {
          title: 'Cierra con evidencia',
          description: 'Usa notas, avance, archivos y auditoría para que el trabajo terminado sea confiable, no solo marcado como hecho.',
        },
      ],
    },
    projects: {
      label: 'Proyectos',
      ctaLabel: 'Revisar proyectos',
      title: 'Coordina iniciativas sin perder control',
      summary: 'Usa Proyectos para agrupar trabajo relacionado, organizar responsables y conectar tareas con un objetivo operativo.',
      value: 'La visibilidad de proyectos ayuda a entender por qué importan las tareas y dónde un retraso afecta compromisos mayores.',
      steps: [
        {
          title: 'Define el resultado del proyecto',
          description: 'Mantén cada proyecto conectado a un resultado operativo claro para evitar actividad desconectada.',
        },
        {
          title: 'Controla el portafolio de tareas',
          description: 'Usa listas y diagramas para identificar carga, retrasos, responsables y riesgos de tiempo.',
        },
        {
          title: 'Revisa el avance con ritmo',
          description: 'Usa estado y tareas vinculadas para guiar seguimiento antes de que los vencimientos se vuelvan urgencias.',
        },
      ],
    },
    processes: {
      label: 'Procesos',
      ctaLabel: 'Revisar procesos',
      title: 'Convierte trabajo recurrente en rutinas',
      summary: 'Usa Procesos para definir generadores operativos que crean tareas futuras con reglas de recurrencia claras.',
      value: 'Los procesos recurrentes protegen consistencia: activos generan trabajo futuro, pausados se detienen y eliminados paran definitivamente.',
      steps: [
        {
          title: 'Separa procesos de tareas',
          description: 'Trata los procesos como rutinas que generan trabajo, no como elementos individuales por completar.',
        },
        {
          title: 'Controla la recurrencia',
          description: 'Mantén frecuencia, próxima ejecución, responsable y estado correctos para generar solo el trabajo necesario.',
        },
        {
          title: 'Pausa antes de eliminar',
          description: 'Pausa para detener temporalmente; elimina solo cuando la rutina ya no debe generar tareas.',
        },
      ],
    },
    kpis: {
      label: 'KPIs',
      ctaLabel: 'Revisar KPIs',
      title: 'Mide la salud de ejecución',
      summary: 'Usa KPIs operativos para leer cumplimiento de agenda, flujo de proyectos, disciplina de procesos y riesgo.',
      value: 'Los KPIs convierten actividad en señales gerenciales para actuar antes de que el trabajo pendiente se vuelva deuda operativa.',
      steps: [
        {
          title: 'Lee indicadores adelantados',
          description: 'Observa trabajo abierto, vencido, auditado y completado para saber si la ejecución mejora o acumula riesgo.',
        },
        {
          title: 'Conecta métricas con acción',
          description: 'Usa movimientos de KPIs para decidir qué equipo, proyecto, proceso o responsable necesita seguimiento.',
        },
        {
          title: 'Revisa tendencias',
          description: 'Un número ayuda, pero el cambio de tendencia muestra si el sistema operativo mejora.',
        },
      ],
    },
  },
} as const;
