export const esCO = {
  shell: {
    title: 'Procesos y Tareas',
    subtitle: 'Agenda, proyectos, KPIs y procesos operativos recurrentes',
    back: 'Regresar',
    loading: {
      title: 'Cargando pestaña de procesos',
      description: 'Abriendo el espacio operativo seleccionado.',
      fallbackTitle: 'Cargando pestaña de procesos',
      fallbackDescription: 'Descargando solo el espacio de trabajo seleccionado.',
    },
    tabs: {
      agenda: 'Agenda',
      tasks: 'Tareas',
      projects: 'Proyectos',
      processes: 'Procesos',
      kpis: 'KPIs',
      orgChart: 'Organigrama',
    },
  },
  headers: {
    agenda: {
      emoji: '📅',
      title: 'Agenda',
      subtitle: 'Agenda operativa con tareas reales, vencidas acumuladas, cierre, evidencia y auditoria.',
      actions: {
        table: 'Tabla',
        kanban: 'Kanban',
        columns: 'Columnas',
        create: 'Crear tarea',
      },
    },
    projects: {
      emoji: '🗂️',
      title: 'Proyectos',
      subtitle: 'Portafolio operativo con tareas reales, evidencia, cierre, auditoria y avance calculado desde la agenda.',
      actions: {
        columns: 'Columnas',
        create: 'Crear proyecto',
      },
    },
    processes: {
      emoji: '✅',
      title: 'Procesos',
      subtitle: 'Crea procesos recurrentes que generen tareas reales en la agenda de cada responsable.',
      actions: {
        columns: 'Columnas',
        create: 'Crear proceso',
      },
    },
    kpis: {
      emoji: '📊',
      title: 'KPIs operativos',
      subtitle: 'Tablero real de productividad, cumplimiento, auditoria, procesos, proyectos y rendimiento por colaborador.',
    },
  },
  agenda: {
    periods: {
      today: 'Agenda del dia',
      week: 'Esta semana',
      month: 'Este mes',
      overdue: 'Vencidas',
      custom: 'Fecha personalizada',
    },
  },
  kpis: {
    periods: {
      day: 'Agenda del dia',
      week: 'Esta semana',
      month: 'Este mes',
      overdue: 'Vencidas',
      custom: 'Fecha personalizada',
    },
  },
} as const;
