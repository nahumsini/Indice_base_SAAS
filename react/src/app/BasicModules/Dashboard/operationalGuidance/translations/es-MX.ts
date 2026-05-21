export const esMX = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía de configuración empresarial',
  subtitle: 'Usa este espacio para configurar la base operativa que mantiene alineado el resto de Índice.',
  focusLabel: 'Enfoque actual',
  actionsLabel: 'Acciones recomendadas',
  tabsLabel: 'Áreas de configuración',
  previousStepLabel: 'Recomendación anterior',
  nextStepLabel: 'Siguiente recomendación',
  stepIndicatorLabel: 'Mostrar recomendación',
  tabs: {
    profile: {
      label: 'Perfil',
      title: 'Mantén clara la identidad del negocio',
      summary: 'Completa tu perfil personal y operativo para que el espacio de trabajo parta de datos confiables de contacto e identidad.',
      value: 'Un perfil claro reduce confusión cuando el equipo comparte responsabilidades, notificaciones y decisiones operativas.',
      steps: [
        {
          title: 'Confirma tus datos personales',
          description: 'Mantén nombre, teléfono, idioma y foto actualizados para identificar responsables con rapidez.',
        },
        {
          title: 'Revisa tus preferencias de acceso',
          description: 'Un perfil ordenado facilita auditar y soportar cualquier configuración posterior.',
        },
      ],
    },
    'business-structure': {
      label: 'Estructura empresarial',
      title: 'Mapea cómo opera realmente la empresa',
      summary: 'Define unidades, negocios, ubicaciones y la sede principal para que todos los módulos lean el mismo mapa operativo.',
      value: 'Cuando la estructura está clara, asistencia, gastos, usuarios y KPIs se conectan con la parte correcta de la operación.',
      steps: [
        {
          title: 'Confirma Hedwig Edher como sede principal',
          description: 'Usa la ubicación principal como ancla operativa para la estructura de la empresa.',
        },
        {
          title: 'Crea unidades y negocios con intención',
          description: 'Agrega solo áreas que ayuden a reportar, asignar responsabilidad o controlar la operación diaria.',
        },
      ],
    },
    'business-profile': {
      label: 'Madurez empresarial',
      title: 'Diagnostica la madurez operativa',
      summary: 'Usa el perfil empresarial para entender dónde la empresa está fuerte y dónde necesita foco operativo.',
      value: 'La evaluación ayuda a Índice a recomendar mejores prioridades antes de sumar más herramientas, personas o procesos.',
      steps: [
        {
          title: 'Responde con realidad operativa',
          description: 'Las respuestas honestas generan mejores recomendaciones que las respuestas ideales.',
        },
        {
          title: 'Revisa señales de mejora',
          description: 'Usa el diagnóstico para decidir qué debe profesionalizar la empresa después.',
        },
      ],
    },
    'personal-performance': {
      label: 'Desempeño personal',
      title: 'Fortalece hábitos de ejecución',
      summary: 'Revisa hábitos operativos personales que influyen en seguimiento, disciplina y calidad de decisión.',
      value: 'Mejores hábitos de liderazgo ayudan a sostener rutinas, cerrar huecos y mantener visible el trabajo.',
      steps: [
        {
          title: 'Evalúa rutinas de ejecución',
          description: 'Identifica dónde seguimiento, priorización o comunicación pueden volverse más consistentes.',
        },
        {
          title: 'Convierte hallazgos en rutinas',
          description: 'Usa los resultados para construir hábitos pequeños que mejoren el control diario.',
        },
      ],
    },
    users: {
      label: 'Usuarios',
      title: 'Controla accesos antes de escalar',
      summary: 'Invita usuarios, asigna módulos y mantén permisos alineados con la responsabilidad real de cada persona.',
      value: 'Un buen control de accesos protege información y ayuda a que cada colaborador se enfoque en sus herramientas.',
      steps: [
        {
          title: 'Invita a los responsables correctos',
          description: 'Empieza por quienes lideran configuración, RH, finanzas, operación y analítica.',
        },
        {
          title: 'Asigna módulos por responsabilidad',
          description: 'Evita accesos amplios cuando un espacio enfocado genera mayor control.',
        },
      ],
    },
  },
} as const;
