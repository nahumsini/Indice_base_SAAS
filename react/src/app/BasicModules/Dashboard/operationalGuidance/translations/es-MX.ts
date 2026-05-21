export const esMX = {
  eyebrow: 'Modo Aprendiz',
  title: 'Guía de configuración empresarial',
  subtitle: 'Usa este espacio para configurar la base operativa que mantiene alineado el resto de Índice.',
  controlLabel: 'Control de la empresa',
  functionsLabel: 'Funciones de la pestaña',
  guideProgressLabel: 'Progreso de guía',
  guideProgressCompleteLabel: 'revisado',
  previousStepLabel: 'Recomendación anterior',
  nextStepLabel: 'Siguiente recomendación',
  stepIndicatorLabel: 'Mostrar recomendación',
  tabs: {
    profile: {
      label: 'Perfil',
      ctaLabel: 'Revisar perfil',
      title: 'Mantén clara la identidad del negocio',
      summary: 'Completa tu perfil personal y operativo para que el espacio de trabajo parta de datos confiables de contacto e identidad.',
      value: 'Un perfil claro reduce confusión cuando el equipo comparte responsabilidades, notificaciones y decisiones operativas.',
      steps: [
        {
          title: 'Datos personales y preferencias',
          description: 'Administra nombre, teléfono, idioma, foto y preferencias para que tu perfil mantenga identificable al responsable.',
        },
        {
          title: 'Seguridad de cuenta',
          description: 'Actualiza credenciales y datos de acceso para conservar un entorno de trabajo confiable.',
        },
      ],
    },
    'business-structure': {
      label: 'Estructura empresarial',
      ctaLabel: 'Configurar estructura',
      title: 'Mapea cómo opera realmente la empresa',
      summary: 'Define unidades, negocios, ubicaciones y la sede principal para que todos los módulos lean el mismo mapa operativo.',
      value: 'Cuando la estructura está clara, asistencia, gastos, usuarios y KPIs se conectan con la parte correcta de la operación.',
      steps: [
        {
          title: 'Unidades, negocios y sede',
          description: 'Organiza las áreas de operación y conserva Hedwig Edher como referencia principal de la estructura.',
        },
        {
          title: 'Ubicación operativa',
          description: 'Define direcciones y coordenadas para que asistencia, kioskos y reportes trabajen desde ubicaciones correctas.',
        },
      ],
    },
    'business-profile': {
      label: 'Madurez empresarial',
      ctaLabel: 'Revisar madurez',
      title: 'Diagnostica la madurez operativa',
      summary: 'Usa el perfil empresarial para entender dónde la empresa está fuerte y dónde necesita foco operativo.',
      value: 'La evaluación ayuda a Índice a recomendar mejores prioridades antes de sumar más herramientas, personas o procesos.',
      steps: [
        {
          title: 'Diagnóstico por pilares',
          description: 'Evalúa personas, procesos, productos y finanzas para entender la madurez real de la empresa.',
        },
        {
          title: 'Reporte de madurez',
          description: 'Consulta señales, riesgos y recomendaciones para priorizar la siguiente mejora operativa.',
        },
      ],
    },
    'personal-performance': {
      label: 'Desempeño personal',
      ctaLabel: 'Evaluar desempeño',
      title: 'Fortalece hábitos de ejecución',
      summary: 'Revisa hábitos operativos personales que influyen en seguimiento, disciplina y calidad de decisión.',
      value: 'Mejores hábitos de liderazgo ayudan a sostener rutinas, cerrar huecos y mantener visible el trabajo.',
      steps: [
        {
          title: 'Evaluación de hábitos',
          description: 'Revisa liderazgo, disciplina, comunicación y seguimiento para entender tu estilo de ejecución.',
        },
        {
          title: 'Lectura de desempeño',
          description: 'Convierte resultados personales en señales para mejorar decisiones, enfoque y control diario.',
        },
      ],
    },
    users: {
      label: 'Usuarios',
      ctaLabel: 'Gestionar usuarios',
      title: 'Controla accesos antes de escalar',
      summary: 'Invita usuarios, asigna módulos y mantén permisos alineados con la responsabilidad real de cada persona.',
      value: 'Un buen control de accesos protege información y ayuda a que cada colaborador se enfoque en sus herramientas.',
      steps: [
        {
          title: 'Invitaciones y roles',
          description: 'Agrega usuarios, define roles y vincula cada persona con su responsabilidad operativa.',
        },
        {
          title: 'Permisos por módulo',
          description: 'Selecciona qué herramientas puede usar cada usuario para mantener acceso controlado y trazable.',
        },
      ],
    },
  },
} as const;
