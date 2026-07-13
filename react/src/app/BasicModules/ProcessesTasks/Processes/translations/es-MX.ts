import type { ProcessFrequency, ProcessRecurrenceConfig, Weekday } from '../types';
import type { ProcessesTranslations } from './types';

export const esMX: ProcessesTranslations = {
  common: {
    all: 'Todos',
    allFemale: 'Todas',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    saving: 'Guardando...',
    noDate: 'Sin fecha',
    noUnit: 'Sin unidad',
    noBusiness: 'Sin negocio',
    unassigned: 'Sin asignar',
    backup: 'respaldo',
    actions: 'Acciones',
    requiredFields: 'Los campos marcados con * son obligatorios.',
  },
  header: {
    emoji: '🔄',
    title: 'Procesos',
    subtitle: 'Crea procesos recurrentes que generen tareas reales en la agenda de cada responsable.',
    actions: {
      table: 'Tabla',
      diagram: 'Diagrama',
      columns: 'Columnas',
      create: 'Crear proceso',
    },
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar proceso',
    searchPlaceholder: 'Folio, titulo, descripcion, unidad o responsable',
    unit: 'Unidad',
    business: 'Negocio',
    collaborator: 'Colaborador',
    frequency: 'Frecuencia',
    clear: 'Limpiar filtros',
  },
  diagram: { previousMonth: 'Mes anterior', nextMonth: 'Mes siguiente' },
  statuses: {
    active: 'Activo',
    paused: 'Pausado',
    atRisk: 'En riesgo',
  },
  priorities: {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  },
  frequencies: {
    daily: 'Diaria',
    weekly: 'Semanal',
    'bi-weekly': 'Quincenal',
    monthly: 'Mensual',
    'specific-dates': 'Fechas especificas',
  },
  weekdays: {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miercoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sabado',
    sunday: 'Domingo',
  },
  columns: {
    folio: { label: 'Folio', description: 'Identificador operativo del proceso.' },
    unit: { label: 'Unidad', description: 'Unidad relacionada con el proceso.' },
    business: { label: 'Negocio', description: 'Negocio relacionado con el proceso.' },
    title: { label: 'Proceso', description: 'Nombre editable del proceso recurrente.' },
    description: { label: 'Descripcion', description: 'Detalle operativo y alcance del proceso.' },
    template: { label: 'Plantilla', description: 'Datos que se copian a cada tarea generada.' },
    createdAt: { label: 'Fecha de creacion', description: 'Fecha en que se registro el proceso.' },
    frequency: { label: 'Frecuencia', description: 'Periodicidad de generacion de tareas.' },
    nextOccurrence: { label: 'Proxima generacion', description: 'Siguiente ocurrencia programada por el motor.' },
    generatedUntil: { label: 'Generado hasta', description: 'Limite futuro materializado por el motor.' },
    progress: { label: 'Avance', description: 'Avance calculado con las tareas generadas.' },
    tasks: { label: 'Tareas', description: 'Tareas generadas, abiertas, cerradas y vencidas.' },
    creator: { label: 'Creador', description: 'Usuario que creo el proceso.' },
    responsible: { label: 'Responsable', description: 'Usuario responsable de ejecutar el proceso.' },
    priority: { label: 'Prioridad', description: 'Nivel de prioridad asignado.' },
  },
  fixedColumns: {
    actions: {
      label: 'Acciones',
      description: 'Botones para actualizar tareas, pausar, editar, copiar o eliminar el proceso.',
    },
  },
  columnsDialog: {
    title: 'Gestionar columnas',
    description: 'Elige que columnas de la tabla permanecen visibles en el espacio de Procesos.',
    visibleCount: (visible: number, total: number) => `${visible} de ${total} columnas visibles`,
    selectAll: 'Seleccionar todas',
    minimumSet: 'Vista minima',
    requiredColumn: 'Columna requerida para el espacio de trabajo.',
    optionalColumn: 'Columna opcional que puede ocultarse de la tabla.',
  },
  table: {
    loading: 'Cargando procesos recurrentes...',
    empty: 'No hay procesos recurrentes que coincidan con los filtros actuales.',
    progress: 'Avance',
    status: 'Estado',
    graceDays: (days: number) => `Gracia ${days} dias`,
    evidenceRequired: 'Evidencia requerida',
    start: 'Inicio',
    end: 'Fin',
    until: 'Hasta',
    window: (days: number) => `Ventana ${days} dias`,
    taskCounts: {
      open: 'Abiertas',
      closed: 'Cerradas',
      overdue: 'Vencidas',
      audited: 'Auditadas',
    },
  },
  actions: {
    runEngine: 'Actualizar tareas del proceso',
    pause: 'Pausar proceso',
    activate: 'Activar proceso',
    edit: 'Editar proceso',
    copy: 'Copiar proceso',
    delete: 'Eliminar proceso',
  },
  bulk: {
    selected: (count: number) => `${count} seleccionados`,
    title: 'Acciones masivas',
    applied: (count: number) => `Accion masiva aplicada a ${count} proceso${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}.`,
    assignDescription: (count: number) =>
      `Aplicar responsable a ${count} proceso${count === 1 ? '' : 's'} seleccionado${count === 1 ? '' : 's'}.`,
    itemName: (count: number) => `${count} proceso${count === 1 ? '' : 's'}`,
    selectVisible: 'Seleccionar procesos visibles',
    selectRow: (folio: string) => `Seleccionar ${folio}`,
  },
  messages: {
    loadProcesses: 'No se pudieron cargar los procesos.',
    loadCatalogs: 'No se pudieron cargar los catalogos del proceso.',
    saveChanges: 'No se pudieron guardar los cambios del proceso.',
    deleteProcess: 'No se pudo eliminar el proceso.',
    duplicateProcess: 'No se pudo copiar el proceso.',
    runEngine: 'No se pudieron actualizar las tareas del proceso.',
    saveProcess: 'No se pudo guardar el proceso.',
    titleRequired: 'El titulo es obligatorio.',
    descriptionRequired: 'La descripcion es obligatoria.',
    copyPrefix: (title: string) => `Copia de ${title}`,
  },
  kpis: {
    labels: {
      visible: 'visibles',
      active: 'activos',
      open: 'abiertas',
      closed: 'cerradas',
      overdue: 'vencidas',
      averageProgress: 'avance prom.',
      tasks: 'tareas',
      health: 'salud',
    },
    segments: {
      active: 'Activos',
      paused: 'Pausados',
      closedTasks: 'Tareas cerradas',
      audited: 'Auditadas',
      overdue: 'Vencidas',
    },
    badges: {
      overdue: (count: number) => `${count} vencidas`,
      paused: (count: number) => `${count} pausados`,
      health: (score: number) => `${score}% salud`,
    },
    insights: {
      empty: 'No hay procesos en el filtro actual. Crea o ajusta filtros para evaluar la operacion recurrente.',
      overdue: (overdue: number, average: number, open: number) =>
        `${overdue} tareas vencidas vienen de procesos activos; el avance promedio es ${average}% y quedan ${open} tareas abiertas.`,
      paused: (paused: number, open: number, health: number) =>
        `Hay ${paused} procesos pausados en el filtro. Los activos sostienen ${open} tareas abiertas con salud estimada de ${health}%.`,
      healthy: (active: number, closed: number, health: number) =>
        `La cartera de procesos se ve sana: ${active} activos, ${closed} tareas cerradas y salud estimada de ${health}%.`,
      default: (health: number, active: number, average: number) =>
        `La salud estimada del filtro es ${health}% con ${active} procesos activos y ${average}% de avance promedio.`,
    },
  },
  form: {
    titles: {
      create: 'Crear proceso recurrente',
      edit: 'Editar proceso recurrente',
    },
    descriptions: {
      create: 'Crea un proceso recurrente para generar tareas y asignarlas en la agenda del responsable.',
      edit: 'Actualiza la configuracion, responsable y frecuencia del proceso sin cambiar el flujo del modulo.',
    },
    labels: {
      unit: 'Unidad',
      business: 'Negocio',
      title: 'Titulo *',
      description: 'Descripcion *',
      taskTitle: 'Titulo de tarea',
      taskDescription: 'Descripcion de tarea',
      taskNotes: 'Notas iniciales',
      frequency: 'Frecuencia',
      responsible: 'Responsable',
      priority: 'Prioridad',
      start: 'Inicio',
      end: 'Fin',
      graceDays: 'Dias de gracia',
      window: 'Ventana',
      referenceDate: 'Fecha de referencia',
    },
    placeholders: {
      unit: 'Sin unidad',
      business: 'Sin negocio',
      responsible: 'Sin asignar',
      title: 'Titulo del proceso recurrente',
      description: 'Describe como debe aparecer el trabajo recurrente en la agenda del responsable',
      taskTitle: 'Si se deja vacio, usa el titulo del proceso',
      taskDescription: 'Si se deja vacia, usa la descripcion del proceso',
      taskNotes: 'Notas operativas para cada tarea generada',
    },
    sections: {
      taskTemplate: 'Plantilla de tarea',
      taskTemplateDescription: 'Estos datos se copiaran a cada tarea que el motor genere en Agenda.',
      evidenceRequired: 'Evidencia requerida',
      evidenceDescription: 'Marca el proceso si sus tareas deben cerrarse con archivos o fotos de evidencia.',
      engineControl: 'Control del motor',
      engineDescription: 'Define desde cuando se genera, hasta cuando aplica y cuantos dias hacia adelante materializa.',
      schedule: 'Programacion del proceso',
      scheduleDescription: (frequency: string) =>
        `Configura como se generara el proceso recurrente cuando la frecuencia seleccionada sea ${frequency}.`,
    },
    recurrence: {
      daily: 'El proceso creara tareas todos los dias para el responsable asignado.',
      weeklyTitle: 'Configuracion semanal',
      weeklyDescription: 'Elige el dia de la semana en que el proceso debe aparecer en la agenda del responsable.',
      biWeeklyTitle: 'Configuracion quincenal',
      biWeeklyDescription: 'Elige los dias y la fecha de referencia para repetir el proceso cada dos semanas.',
      monthlyTitle: 'Configuracion mensual',
      monthlyDescription: 'Elige el dia o los dias del mes en que el proceso debe generarse.',
      specificDatesTitle: 'Configuracion por fechas',
      specificDatesDescription: 'Agrega las fechas exactas en que el proceso debe crear tareas en la agenda del responsable.',
      addDate: 'Agregar fecha',
      emptyDates: 'Agrega al menos una fecha para activar esta programacion.',
      selectedDay: (day: string) => `Dia seleccionado: ${day}`,
      removeDate: (date: string) => `Quitar ${date}`,
    },
    submit: {
      create: 'Crear proceso',
      edit: 'Guardar cambios',
    },
  },
  confirmation: {
    deleteTitle: 'Eliminar proceso',
    deleteDescription: 'Esto elimina el proceso del catalogo activo y cancela las tareas abiertas que genero. Las tareas completadas o ya canceladas permanecen como historial.',
    deleteConfirm: 'Eliminar proceso',
  },
  describeFrequency: (frequency: ProcessFrequency, recurrence: ProcessRecurrenceConfig) => {
    const weekdays = esMX.weekdays as Record<Weekday, string>;

    switch (frequency) {
      case 'daily':
        return 'Todos los dias';
      case 'weekly':
        return `Cada ${weekdays[recurrence.weeklyDay]}`;
      case 'bi-weekly': {
        const labels = recurrence.biWeeklyDays.map((day) => weekdays[day]).join(', ');
        return `Cada 2 semanas: ${labels}`;
      }
      case 'monthly':
        return `Dias ${recurrence.monthlyDays.join(', ')}`;
      case 'specific-dates':
        return recurrence.specificDates.length === 1
          ? '1 fecha configurada'
          : `${recurrence.specificDates.length} fechas configuradas`;
      default:
        return esMX.frequencies[frequency];
    }
  },
};
