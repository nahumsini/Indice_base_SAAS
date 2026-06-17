import { useMemo } from 'react';
import { useLanguage } from '../../../../shared/context';
import type {
  OpportunityNextAction,
  OpportunitySource,
  OpportunityStage,
  OpportunityStatus,
  OpportunityTemperature,
} from '../../salesCrmContext';
import type { AgendaViewMode, OpportunityColumnId, OpportunityView } from '../types/prospectosTypes';
import type { OpportunityQuoteSignalState } from '../utils/prospectosQuoteSignals';

export const enCA = {
  header: {
    title: 'Commercial opportunities',
    subtitle: 'Control active sales work linked to contacts: stage, value, probability, next action, and files.',
    columns: 'Columns',
    createSale: 'New sale',
    createQuote: 'Create quote',
    createOpportunity: 'Create opportunity',
    preferredCurrency: 'Preferred currency',
  },
  filters: {
    title: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Opportunity, company, or contact',
    focus: 'Focus',
    focusOptions: {
      all: 'All opportunities',
      myPortfolio: 'My portfolio',
      toContact: 'To contact',
      withoutQuote: 'Without quote',
      inProposal: 'In proposal',
      closedPeriod: 'Period closes',
      won: 'Won',
      lost: 'Lost',
    },
    period: 'Period',
    periodOptions: {
      all: 'All time',
      today: 'Today',
      this_week: 'This week',
      this_month: 'This month',
      last_month: 'Last month',
      custom: 'Custom',
    },
    stage: 'Stage',
    owner: 'Owner',
    temperature: 'Temperature',
    source: 'Source',
    status: 'Status',
    all: 'All',
  },
  views: {
    table: 'Table',
    kanban: 'Kanban',
    agenda: 'Agenda',
  } satisfies Record<OpportunityView, string>,
  kpis: {
    opportunities: 'opportunities',
    active: 'active',
    averageProbability: 'avg. probability',
    inProposal: 'in proposal',
    pipeline: 'quoted pipeline',
    finalPipeline: 'final pipeline',
    exchangeRateDate: 'FX date',
    pipelineQuotes: (count: number) => `${count} ${count === 1 ? 'quote' : 'quotes'}`,
  },
  kpiEngine: {
    labels: {
      visible: 'visible',
      open: 'open',
      pipeline: 'open pipeline',
      probability: 'avg. probability',
      scheduled: 'scheduled',
      unscheduled: 'unscheduled',
      wonPeriod: 'won in period',
      lostPeriod: 'lost in period',
      closedPeriod: 'closed in period',
      conversion: 'period conversion',
    },
    alerts: {
      overdue: (count: number) => `${count} overdue`,
      unscheduled: (count: number) => `${count} to schedule`,
      hot: (count: number) => `${count} hot`,
      proposal: (count: number) => `${count} in proposal`,
      wonPeriod: (count: number, value: string) => `${count} won · ${value}`,
      lostPeriod: (count: number, value: string) => `${count} lost · ${value}`,
      finalPipeline: (value: string) => `final pipeline: ${value}`,
      exchangeRateDate: (date: string) => `FX date: ${date}`,
    },
    segments: {
      New: 'New',
      Contacted: 'Contacted',
      Qualified: 'Qualified',
      Proposal: 'Proposal',
      Negotiation: 'Negotiation',
      Won: 'Won',
      Lost: 'Lost',
    } satisfies Record<OpportunityStage, string>,
    insight: ({
      periodLabel,
      openCount,
      periodClosedCount,
      periodConversionRate,
      periodLostValueLabel,
      periodWonValueLabel,
      formattedPipelineValue,
      hotCount,
      overdueCount,
      proposalCount,
      unscheduledCount,
      visibleCount,
      weightedProbability,
    }: {
      periodLabel: string;
      openCount: number;
      periodClosedCount: number;
      periodConversionRate: number;
      periodLostValueLabel: string;
      periodWonValueLabel: string;
      formattedPipelineValue: string;
      hotCount: number;
      overdueCount: number;
      proposalCount: number;
      unscheduledCount: number;
      visibleCount: number;
      weightedProbability: number;
    }) => {
      if (visibleCount === 0) {
        return 'No visible opportunities match the current filters; adjust the view before acting.';
      }

      if (periodClosedCount > 0) {
        return `${periodLabel}: ${periodWonValueLabel} won and ${periodLostValueLabel} lost with ${periodConversionRate}% conversion; ${openCount} opportunities remain open with ${formattedPipelineValue} in active pipeline.`;
      }

      if (overdueCount > 0) {
        return `${overdueCount} opportunities have overdue follow-up and should be contacted first.`;
      }

      if (unscheduledCount > 0) {
        return `${unscheduledCount} open opportunities need a next-action date to protect pipeline rhythm.`;
      }

      if (hotCount > 0) {
        return `${hotCount} hot opportunities require priority follow-up; visible pipeline is ${formattedPipelineValue}.`;
      }

      if (proposalCount > 0) {
        return `${proposalCount} opportunities are in proposal; review quotes and move the next best deals forward.`;
      }

      return `${periodLabel}: no closed opportunities yet; active pipeline is ${formattedPipelineValue} across ${openCount} open opportunities with ${weightedProbability}% average probability.`;
    },
  },
  insight: {
    summary: (hotCount: number, pipeline: string, probability: number) => (
      `${hotCount} hot opportunities need follow-up; visible pipeline is ${pipeline} and average probability is ${probability}%.`
    ),
  },
  columns: {
    opportunity: {
      label: 'Opportunity / company',
      description: 'Commercial opportunity name, company, and folio.',
    },
    contact: {
      label: 'Contact',
      description: 'Primary person connected to the sale.',
    },
    phone: {
      label: 'Phone',
      description: 'Primary number for calls or WhatsApp.',
    },
    email: {
      label: 'Email',
      description: 'Primary contact email.',
    },
    source: {
      label: 'Source',
      description: 'Commercial source that generated the opportunity.',
    },
    stage: {
      label: 'Stage',
      description: 'Progress inside the commercial pipeline.',
    },
    temperature: {
      label: 'Temperature',
      description: 'Commercial priority of the opportunity.',
    },
    owner: {
      label: 'Owner',
      description: 'Seller or executive responsible for follow-up.',
    },
    estimatedValue: {
      label: 'Commercial value',
      description: 'Smart value: estimated, quoted, or closed depending on the commercial stage.',
    },
    probability: {
      label: 'Probability',
      description: 'Estimated closing probability.',
    },
    quoteSignal: {
      label: 'Quote',
      description: 'Status of quotes linked to the opportunity.',
    },
    pipeline: {
      label: 'Quoted pipeline',
      description: 'Quoted amount linked to the opportunity by currency.',
    },
    expectedCloseDate: {
      label: 'Expected close',
      description: 'Target closing date.',
    },
    nextAction: {
      label: 'Next action',
      description: 'Next commercial step.',
    },
    nextActionDate: {
      label: 'Action date',
      description: 'Date and time scheduled for the next contact.',
    },
    lastContact: {
      label: 'Last contact',
      description: 'Most recent commercial contact record.',
    },
    files: {
      label: 'Files',
      description: 'Documents related to the opportunity.',
    },
    status: {
      label: 'Status',
      description: 'Operational opportunity status.',
    },
  } satisfies Record<OpportunityColumnId, { label: string; description: string }>,
  table: {
    actions: 'Actions',
    empty: 'No opportunities match this search.',
    unlinkedOwner: 'unlinked',
    noLastContact: 'No record',
    zeroPlaceholder: '0',
    commercialValue: {
      estimated: 'Estimated',
      editableEstimate: 'Editable estimate',
      quoted: 'Quoted',
      won: 'Closed won',
      lost: 'Closed lost',
      quoteCount: (count: number) => `${count} ${count === 1 ? 'quote' : 'quotes'}`,
      converted: (value: string) => `Converted: ${value}`,
    },
  },
  quickActions: {
    call: (name: string) => `Call ${name}`,
    whatsapp: (name: string) => `WhatsApp ${name}`,
    email: (name: string) => `Email ${name}`,
    files: (name: string) => `Files for ${name}`,
    history: (name: string) => `History for ${name}`,
    edit: (name: string) => `Edit ${name}`,
    delete: (name: string) => `Delete ${name}`,
    noPhone: 'No phone available',
    noEmail: 'No email available',
  },
  columnsModal: {
    actionsDescription: 'Call, WhatsApp, email, files, history, and editing.',
  },
  modal: {
    createTitle: 'Create opportunity',
    editTitle: 'Edit opportunity',
    createDescription: 'Link a directory contact to active sales work inside the commercial pipeline.',
    editDescription: 'Update the active sale, owner, stage, schedule, files, and commercial notes.',
    fields: {
      opportunityName: 'Opportunity name',
      contact: 'Contact',
      source: 'Source',
      stage: 'Stage',
      temperature: 'Temperature',
      owner: 'Owner',
      estimatedValue: 'Estimated value',
      probability: 'Probability',
      expectedCloseDate: 'Expected close',
      nextAction: 'Next action',
      nextActionDate: 'Next action date',
      lastContact: 'Last contact',
      status: 'Status',
      files: 'Files',
      notes: 'Notes',
    },
    placeholders: {
      opportunityName: 'Example: Annual corporate renewal',
      contact: 'Select contact',
      source: 'Source',
      stage: 'Stage',
      temperature: 'Temperature',
      owner: 'Owner',
      probability: 'Probability',
      estimatedValue: '0',
      nextAction: 'Next action',
      nextActionDate: '2026-06-01 10:00',
      status: 'Status',
      files: 'Proposal.pdf, contract.docx',
      notes: 'Commercial notes, negotiation context, or pending agreements.',
    },
    sections: {
      quickCapture: 'Quick capture',
      relationship: 'Commercial relationship',
      pipeline: 'Pipeline',
      followUp: 'Follow-up',
      notes: 'Notes and files',
      summary: 'Live summary',
    },
    summary: {
      contact: 'Contact',
      noContact: 'Select a contact',
      value: 'Pipeline value',
      nextStep: 'Next step',
      schedule: 'Schedule',
      noDate: 'No date',
      owner: 'Owner',
    },
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    createOpportunity: 'Create opportunity',
  },
  detailModal: {
    title: 'Opportunity history',
    description: 'Operational record of sales events, follow-up, files, and relevant changes.',
    close: 'Close',
  },
  filesModal: {
    title: 'Opportunity files',
    description: 'Commercial documents locally linked to the selected opportunity.',
    local: 'Local',
    localFilesTitle: 'Local files',
    quotesTitle: 'Linked quotes',
    viewQuote: 'View quote',
    empty: 'This opportunity does not have files yet.',
    close: 'Close',
  },
  kanban: {
    dragHint: 'Drag to change stage',
    emptyColumn: 'Drag opportunities here',
  },
  agenda: {
    titleByView: {
      day: 'Today’s commercial agenda',
      week: 'Commercial week',
      list: 'Weekly list',
    } satisfies Record<AgendaViewMode, string>,
    descriptionByView: {
      day: 'Organize calls, WhatsApp, emails, and follow-ups by contact order and time.',
      week: 'See the weekly commercial load, move follow-ups between days, and keep contact work clear.',
      list: 'Review the weekly follow-up list and keep every commercial next step visible.',
    } satisfies Record<AgendaViewMode, string>,
    views: {
      day: 'Day',
      week: 'Week',
      list: 'List',
    } satisfies Record<AgendaViewMode, string>,
    today: 'Today',
    dayCount: (count: number) => `${count} today`,
    weekCount: (count: number) => `${count} this week`,
    scheduled: (count: number) => `${count} scheduled`,
    hour: 'Time',
    contactPlan: 'Contact plan',
    followUps: (count: number) => `${count} follow-ups`,
    dropHere: 'Drop here',
    noTime: 'No time',
    noFollowUps: 'No follow-ups scheduled',
    dragOpportunityHere: 'Drag an opportunity here',
    nextAction: 'Next action',
    unscheduledTitle: 'To schedule',
    unscheduledDescription: 'Assign a day and time to keep commercial work ordered.',
    allScheduled: 'All visible opportunities have a scheduled follow-up.',
  },
  deleteConfirm: {
    title: 'Delete opportunity',
    simple: (name: string) => `Delete opportunity ${name}?`,
    withQuotes: (name: string, count: number) => `Delete opportunity ${name}? It has ${count} linked quote(s).`,
    confirm: 'Delete opportunity',
    cancel: 'Cancel',
  },
  quoteSignal: {
    labels: {
      approved: 'Quote approved',
      active: 'Active quote',
      draft: 'Draft quote',
      expired: 'Expired quote',
      rejected: 'Rejected quote',
      none: 'No quote',
    } satisfies Record<OpportunityQuoteSignalState, string>,
    noDocument: 'No commercial document',
    countDetail: (count: number, total: string) => `${count} ${count === 1 ? 'quote' : 'quotes'} · ${total}`,
  },
  options: {
    stages: {
      New: 'New',
      Contacted: 'Contacted',
      Qualified: 'Qualified',
      Proposal: 'Proposal',
      Negotiation: 'Negotiation',
      Won: 'Won',
      Lost: 'Lost',
    } satisfies Record<OpportunityStage, string>,
    temperatures: {
      Hot: 'Hot',
      Warm: 'Warm',
      Cold: 'Cold',
    } satisfies Record<OpportunityTemperature, string>,
    sources: {
      Manual: 'Manual',
      Website: 'Website',
      Referral: 'Referral',
      Campaign: 'Campaign',
      'Social media': 'Social media',
      WhatsApp: 'WhatsApp',
      'Existing customer': 'Existing customer',
      'Post Sale Opportunity': 'Post Sale Opportunity',
      Other: 'Other',
    } satisfies Record<OpportunitySource, string>,
    statuses: {
      Active: 'Active',
      'Pending follow-up': 'Pending follow-up',
      Overdue: 'Overdue',
      'On hold': 'On hold',
      Closed: 'Closed',
    } satisfies Record<OpportunityStatus, string>,
    nextActions: {
      Call: 'Call',
      WhatsApp: 'WhatsApp',
      Email: 'Email',
      Meeting: 'Meeting',
      'Send proposal': 'Send proposal',
      'Follow up': 'Follow up',
      'Review documents': 'Review documents',
      'Close deal': 'Close deal',
    } satisfies Record<OpportunityNextAction, string>,
  },
} as const;

type WidenLiterals<T> =
  T extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : T extends string
      ? string
      : T extends number
        ? number
        : T extends boolean
          ? boolean
          : T extends readonly (infer Item)[]
            ? ReadonlyArray<WidenLiterals<Item>>
            : T extends object
              ? { readonly [Key in keyof T]: WidenLiterals<T[Key]> }
              : T;

export type ProspectosCopy = WidenLiterals<typeof enCA>;

export const esMX: ProspectosCopy = {
  ...enCA,
  header: {
    title: 'Oportunidades comerciales',
    subtitle: 'Controla ventas activas ligadas a contactos: etapa, valor, probabilidad, siguiente acción y archivos.',
    columns: 'Columnas',
    createSale: 'Nueva venta',
    createQuote: 'Crear cotización',
    createOpportunity: 'Crear oportunidad',
    preferredCurrency: 'Divisa preferida',
  },
  filters: {
    title: 'Filtros',
    search: 'Buscar',
    searchPlaceholder: 'Oportunidad, empresa o contacto',
    focus: 'Enfoque',
    focusOptions: {
      all: 'Todas',
      myPortfolio: 'Mi cartera',
      toContact: 'Por contactar',
      withoutQuote: 'Sin cotizar',
      inProposal: 'En propuesta',
      closedPeriod: 'Cierres del periodo',
      won: 'Ganadas',
      lost: 'Perdidas',
    },
    period: 'Periodo',
    periodOptions: {
      all: 'Todo el historial',
      today: 'Hoy',
      this_week: 'Esta semana',
      this_month: 'Este mes',
      last_month: 'Mes anterior',
      custom: 'Personalizado',
    },
    stage: 'Etapa',
    owner: 'Responsable',
    temperature: 'Temperatura',
    source: 'Origen',
    status: 'Estado',
    all: 'Todos',
  },
  views: {
    table: 'Tabla',
    kanban: 'Kanban',
    agenda: 'Agenda',
  },
  kpis: {
    opportunities: 'oportunidades',
    active: 'activas',
    averageProbability: 'probabilidad prom.',
    inProposal: 'en propuesta',
    pipeline: 'pipeline cotizado',
    finalPipeline: 'pipeline final',
    exchangeRateDate: 'tipo de cambio',
    pipelineQuotes: (count) => `${count} ${count === 1 ? 'cotización' : 'cotizaciones'}`,
  },
  kpiEngine: {
    labels: {
      visible: 'visibles',
      open: 'abiertas',
      pipeline: 'pipeline abierto',
      probability: 'probabilidad prom.',
      scheduled: 'programadas',
      unscheduled: 'sin fecha',
      wonPeriod: 'ganado periodo',
      lostPeriod: 'perdido periodo',
      closedPeriod: 'cerradas periodo',
      conversion: 'conversión periodo',
    },
    alerts: {
      overdue: (count) => `${count} vencidas`,
      unscheduled: (count) => `${count} por programar`,
      hot: (count) => `${count} alta`,
      proposal: (count) => `${count} en propuesta`,
      wonPeriod: (count, value) => `${count} ganadas · ${value}`,
      lostPeriod: (count, value) => `${count} perdidas · ${value}`,
      finalPipeline: (value) => `pipeline final: ${value}`,
      exchangeRateDate: (date) => `tipo de cambio: ${date}`,
    },
    segments: {
      New: 'Nueva',
      Contacted: 'Contactada',
      Qualified: 'Calificada',
      Proposal: 'Propuesta',
      Negotiation: 'Negociación',
      Won: 'Ganada',
      Lost: 'Perdida',
    },
    insight: ({
      periodLabel,
      openCount,
      periodClosedCount,
      periodConversionRate,
      periodLostValueLabel,
      periodWonValueLabel,
      formattedPipelineValue,
      hotCount,
      overdueCount,
      proposalCount,
      unscheduledCount,
      visibleCount,
      weightedProbability,
    }) => {
      if (visibleCount === 0) {
        return 'No hay oportunidades visibles con los filtros actuales; ajusta la vista antes de actuar.';
      }

      if (periodClosedCount > 0) {
        return `${periodLabel}: ${periodWonValueLabel} ganados y ${periodLostValueLabel} perdidos con ${periodConversionRate}% de conversión; quedan ${openCount} oportunidades abiertas con ${formattedPipelineValue} en pipeline activo.`;
      }

      if (overdueCount > 0) {
        return `${overdueCount} oportunidades tienen seguimiento vencido y deberían contactarse primero.`;
      }

      if (unscheduledCount > 0) {
        return `${unscheduledCount} oportunidades abiertas necesitan fecha de siguiente acción para proteger el ritmo del pipeline.`;
      }

      if (hotCount > 0) {
        return `${hotCount} oportunidades de temperatura alta requieren seguimiento prioritario; el pipeline visible es ${formattedPipelineValue}.`;
      }

      if (proposalCount > 0) {
        return `${proposalCount} oportunidades están en propuesta; revisa cotizaciones y empuja los mejores cierres.`;
      }

      return `${periodLabel}: todavía no hay oportunidades cerradas; el pipeline activo es ${formattedPipelineValue} en ${openCount} oportunidades abiertas con ${weightedProbability}% de probabilidad promedio.`;
    },
  },
  insight: {
    summary: (hotCount, pipeline, probability) => (
      `${hotCount} oportunidades hot requieren seguimiento; el pipeline visible es de ${pipeline} y la probabilidad promedio es ${probability}%.`
    ),
  },
  columns: {
    opportunity: { label: 'Oportunidad / empresa', description: 'Nombre comercial de la oportunidad, empresa y folio.' },
    contact: { label: 'Contacto', description: 'Persona principal relacionada con la venta.' },
    phone: { label: 'Teléfono', description: 'Teléfono principal para llamadas o WhatsApp.' },
    email: { label: 'Email', description: 'Correo principal del contacto.' },
    source: { label: 'Origen', description: 'Fuente comercial que generó la oportunidad.' },
    stage: { label: 'Etapa', description: 'Avance dentro del pipeline comercial.' },
    temperature: { label: 'Temperatura', description: 'Prioridad comercial de la oportunidad.' },
    owner: { label: 'Responsable', description: 'Vendedor o ejecutivo responsable.' },
    estimatedValue: { label: 'Valor comercial', description: 'Valor inteligente: estimado, cotizado o cerrado según avance comercial.' },
    probability: { label: 'Probabilidad', description: 'Probabilidad estimada de cierre.' },
    quoteSignal: { label: 'Cotización', description: 'Estado de cotizaciones ligadas a la oportunidad.' },
    pipeline: { label: 'Pipeline cotizado', description: 'Monto cotizado ligado a la oportunidad por divisa.' },
    expectedCloseDate: { label: 'Cierre esperado', description: 'Fecha objetivo de cierre.' },
    nextAction: { label: 'Siguiente acción', description: 'Próximo paso comercial.' },
    nextActionDate: { label: 'Fecha de acción', description: 'Fecha y hora programada para el siguiente contacto.' },
    lastContact: { label: 'Último contacto', description: 'Último registro de contacto comercial.' },
    files: { label: 'Archivos', description: 'Documentos relacionados con la oportunidad.' },
    status: { label: 'Estado', description: 'Estado operativo de la oportunidad.' },
  },
  table: {
    actions: 'Acciones',
    empty: 'No hay oportunidades que coincidan con la búsqueda.',
    unlinkedOwner: 'sin vincular',
    noLastContact: 'Sin registro',
    zeroPlaceholder: '0',
    commercialValue: {
      estimated: 'Estimado',
      editableEstimate: 'Estimado editable',
      quoted: 'Cotizado',
      won: 'Cierre ganado',
      lost: 'Cierre perdido',
      quoteCount: (count) => `${count} ${count === 1 ? 'cotización' : 'cotizaciones'}`,
      converted: (value) => `Convertido: ${value}`,
    },
  },
  quickActions: {
    call: (name) => `Llamar a ${name}`,
    whatsapp: (name) => `WhatsApp a ${name}`,
    email: (name) => `Email a ${name}`,
    files: (name) => `Archivos de ${name}`,
    history: (name) => `Historial de ${name}`,
    edit: (name) => `Editar ${name}`,
    delete: (name) => `Eliminar ${name}`,
    noPhone: 'Sin teléfono disponible',
    noEmail: 'Sin email disponible',
  },
  columnsModal: {
    actionsDescription: 'Llamar, WhatsApp, email, archivos, historial y edición.',
  },
  modal: {
    createTitle: 'Crear oportunidad',
    editTitle: 'Editar oportunidad',
    createDescription: 'Liga un contacto del directorio a una venta activa dentro del pipeline comercial.',
    editDescription: 'Actualiza la venta activa, su responsable, etapa, agenda, archivos y notas comerciales.',
    fields: {
      opportunityName: 'Nombre de oportunidad',
      contact: 'Contacto',
      source: 'Origen',
      stage: 'Etapa',
      temperature: 'Temperatura',
      owner: 'Responsable',
      estimatedValue: 'Valor estimado',
      probability: 'Probabilidad',
      expectedCloseDate: 'Cierre esperado',
      nextAction: 'Siguiente acción',
      nextActionDate: 'Fecha de siguiente acción',
      lastContact: 'Último contacto',
      status: 'Estado',
      files: 'Archivos',
      notes: 'Notas',
    },
    placeholders: {
      opportunityName: 'Ej. Renovación anual corporativa',
      contact: 'Seleccionar contacto',
      source: 'Origen',
      stage: 'Etapa',
      temperature: 'Temperatura',
      owner: 'Responsable',
      probability: 'Probabilidad',
      estimatedValue: '0',
      nextAction: 'Siguiente acción',
      nextActionDate: '2026-06-01 10:00',
      status: 'Estado',
      files: 'Propuesta.pdf, contrato.docx',
      notes: 'Notas comerciales, contexto de negociación o acuerdos pendientes.',
    },
    sections: {
      quickCapture: 'Captura rápida',
      relationship: 'Relación comercial',
      pipeline: 'Pipeline',
      followUp: 'Seguimiento',
      notes: 'Notas y archivos',
      summary: 'Resumen vivo',
    },
    summary: {
      contact: 'Contacto',
      noContact: 'Selecciona un contacto',
      value: 'Valor en pipeline',
      nextStep: 'Próximo paso',
      schedule: 'Agenda',
      noDate: 'Sin fecha',
      owner: 'Responsable',
    },
    cancel: 'Cancelar',
    saveChanges: 'Guardar cambios',
    createOpportunity: 'Crear oportunidad',
  },
  detailModal: {
    title: 'Historial de oportunidad',
    description: 'Registro operativo de eventos comerciales, seguimiento, archivos y cambios relevantes.',
    close: 'Cerrar',
  },
  filesModal: {
    title: 'Archivos de oportunidad',
    description: 'Documentos comerciales ligados localmente a la oportunidad seleccionada.',
    local: 'Local',
    localFilesTitle: 'Archivos locales',
    quotesTitle: 'Cotizaciones ligadas',
    viewQuote: 'Ver cotización',
    empty: 'Esta oportunidad todavía no tiene archivos.',
    close: 'Cerrar',
  },
  kanban: {
    dragHint: 'Arrastra para cambiar etapa',
    emptyColumn: 'Arrastra oportunidades aquí',
  },
  agenda: {
    titleByView: {
      day: 'Agenda comercial del día',
      week: 'Semana comercial',
      list: 'Lista semanal',
    },
    descriptionByView: {
      day: 'Organiza llamadas, WhatsApp, correos y seguimientos por orden y horario de contacto.',
      week: 'Visualiza la carga comercial semanal, mueve seguimientos entre días y mantén el orden de contacto claro.',
      list: 'Revisa la lista semanal de seguimientos y mantén visible cada próximo paso comercial.',
    },
    views: {
      day: 'Día',
      week: 'Semana',
      list: 'Lista',
    },
    today: 'Hoy',
    dayCount: (count) => `${count} del día`,
    weekCount: (count) => `${count} de la semana`,
    scheduled: (count) => `${count} programadas`,
    hour: 'Hora',
    contactPlan: 'Plan de contacto',
    followUps: (count) => `${count} seguimientos`,
    dropHere: 'Soltar aquí',
    noTime: 'Sin hora',
    noFollowUps: 'Sin seguimientos programados',
    dragOpportunityHere: 'Arrastra una oportunidad aquí',
    nextAction: 'Siguiente acción',
    unscheduledTitle: 'Por programar',
    unscheduledDescription: 'Asigna día y hora para ordenar el trabajo comercial.',
    allScheduled: 'Todas las oportunidades visibles tienen seguimiento programado.',
  },
  deleteConfirm: {
    title: 'Eliminar oportunidad',
    simple: (name) => `¿Eliminar la oportunidad ${name}?`,
    withQuotes: (name, count) => `¿Eliminar la oportunidad ${name}? Tiene ${count} cotización(es) ligada(s).`,
    confirm: 'Eliminar oportunidad',
    cancel: 'Cancelar',
  },
  quoteSignal: {
    labels: {
      approved: 'Cotización aprobada',
      active: 'Cotización activa',
      draft: 'Cotización en borrador',
      expired: 'Cotización vencida',
      rejected: 'Cotización rechazada',
      none: 'Sin cotización',
    },
    noDocument: 'Sin documento comercial',
    countDetail: (count, total) => `${count} ${count === 1 ? 'cotización' : 'cotizaciones'} · ${total}`,
  },
  options: {
    stages: {
      New: 'Nueva',
      Contacted: 'Contactada',
      Qualified: 'Calificada',
      Proposal: 'Propuesta',
      Negotiation: 'Negociación',
      Won: 'Ganada',
      Lost: 'Perdida',
    },
    temperatures: {
      Hot: 'Alta',
      Warm: 'Media',
      Cold: 'Baja',
    },
    sources: {
      Manual: 'Manual',
      Website: 'Sitio web',
      Referral: 'Referido',
      Campaign: 'Campaña',
      'Social media': 'Redes sociales',
      WhatsApp: 'WhatsApp',
      'Existing customer': 'Cliente existente',
      'Post Sale Opportunity': 'Oportunidad postventa',
      Other: 'Otro',
    },
    statuses: {
      Active: 'Activa',
      'Pending follow-up': 'Seguimiento pendiente',
      Overdue: 'Vencida',
      'On hold': 'En pausa',
      Closed: 'Cerrada',
    },
    nextActions: {
      Call: 'Llamada',
      WhatsApp: 'WhatsApp',
      Email: 'Email',
      Meeting: 'Reunión',
      'Send proposal': 'Enviar propuesta',
      'Follow up': 'Dar seguimiento',
      'Review documents': 'Revisar documentos',
      'Close deal': 'Cerrar trato',
    },
  },
};

export const prospectosTranslations = {
  'en-CA': enCA,
  'en-US': {
    ...enCA,
    header: {
      ...enCA.header,
      subtitle: 'Control active sales work linked to contacts: stage, value, probability, next step, and files.',
    },
  },
  'es-MX': esMX,
  'es-CO': {
    ...esMX,
    modal: {
      ...esMX.modal,
      placeholders: {
        ...esMX.modal.placeholders,
        opportunityName: 'Ej. Renovación anual empresarial',
      },
    },
  },
  'fr-CA': {
    ...enCA,
    header: {
      title: 'Occasions commerciales',
      subtitle: 'Contrôlez les ventes actives liées aux contacts : étape, valeur, probabilité, prochaine action et fichiers.',
      columns: 'Colonnes',
      createSale: 'Nouvelle vente',
      createQuote: 'Créer un devis',
      createOpportunity: 'Créer une occasion',
      preferredCurrency: 'Devise préférée',
    },
    filters: {
      ...enCA.filters,
      title: 'Filtres',
      search: 'Rechercher',
      searchPlaceholder: 'Occasion, entreprise ou contact',
      stage: 'Étape',
      owner: 'Responsable',
      source: 'Source',
      status: 'Statut',
      all: 'Tous',
    },
    views: { table: 'Tableau', kanban: 'Kanban', agenda: 'Agenda' },
    kpis: {
      opportunities: 'occasions',
      active: 'actives',
      averageProbability: 'probabilité moy.',
      inProposal: 'en proposition',
      pipeline: 'pipeline devisé',
      finalPipeline: 'pipeline final',
      exchangeRateDate: 'date FX',
      pipelineQuotes: (count) => `${count} ${count === 1 ? 'devis' : 'devis'}`,
    },
    insight: {
      summary: (hotCount, pipeline, probability) => (
        `${hotCount} occasions prioritaires demandent un suivi; le pipeline visible est de ${pipeline} et la probabilité moyenne est ${probability}%.`
      ),
    },
    table: { ...enCA.table, actions: 'Actions', empty: 'Aucune occasion ne correspond à cette recherche.', noLastContact: 'Aucun dossier' },
    quickActions: {
      call: (name) => `Appeler ${name}`,
      whatsapp: (name) => `WhatsApp à ${name}`,
      email: (name) => `Envoyer un courriel à ${name}`,
      files: (name) => `Fichiers de ${name}`,
      history: (name) => `Historique de ${name}`,
      edit: (name) => `Modifier ${name}`,
      delete: (name) => `Supprimer ${name}`,
      noPhone: 'Aucun téléphone disponible',
      noEmail: 'Aucun courriel disponible',
    },
    modal: {
      ...enCA.modal,
      createTitle: 'Créer une occasion',
      editTitle: 'Modifier l’occasion',
      createDescription: 'Reliez un contact du répertoire au travail commercial actif.',
      editDescription: 'Mettez à jour l’occasion, son responsable, son étape, son agenda, ses fichiers et ses notes.',
      cancel: 'Annuler',
      saveChanges: 'Enregistrer',
      createOpportunity: 'Créer une occasion',
    },
    detailModal: { title: 'Historique de l’occasion', description: 'Registre opérationnel des événements commerciaux, suivis, fichiers et changements.', close: 'Fermer' },
    filesModal: { title: 'Fichiers de l’occasion', description: 'Documents commerciaux liés localement à l’occasion sélectionnée.', local: 'Local', localFilesTitle: 'Fichiers locaux', quotesTitle: 'Devis liés', viewQuote: 'Voir le devis', empty: 'Cette occasion n’a pas encore de fichiers.', close: 'Fermer' },
    kanban: { dragHint: 'Glisser pour changer l’étape', emptyColumn: 'Glissez des occasions ici' },
    agenda: {
      ...enCA.agenda,
      titleByView: { day: 'Agenda commercial du jour', week: 'Semaine commerciale', list: 'Liste hebdomadaire' },
      views: { day: 'Jour', week: 'Semaine', list: 'Liste' },
      today: 'Aujourd’hui',
      hour: 'Heure',
      contactPlan: 'Plan de contact',
      dropHere: 'Déposer ici',
      noTime: 'Sans heure',
      noFollowUps: 'Aucun suivi programmé',
      dragOpportunityHere: 'Glissez une occasion ici',
      nextAction: 'Prochaine action',
      unscheduledTitle: 'À planifier',
      allScheduled: 'Toutes les occasions visibles ont un suivi programmé.',
    },
    deleteConfirm: {
      title: 'Supprimer l’occasion',
      simple: (name) => `Supprimer l’occasion ${name}?`,
      withQuotes: (name, count) => `Supprimer l’occasion ${name}? Elle a ${count} devis lié(s).`,
      confirm: 'Supprimer',
      cancel: 'Annuler',
    },
    quoteSignal: {
      ...enCA.quoteSignal,
      labels: {
        approved: 'Devis approuvé',
        active: 'Devis actif',
        draft: 'Devis brouillon',
        expired: 'Devis expiré',
        rejected: 'Devis refusé',
        none: 'Aucun devis',
      },
      noDocument: 'Aucun document commercial',
      countDetail: (count, total) => `${count} ${count === 1 ? 'devis' : 'devis'} · ${total}`,
    },
  },
  'pt-BR': {
    ...esMX,
    header: {
      title: 'Oportunidades comerciais',
      subtitle: 'Controle vendas ativas ligadas a contatos: etapa, valor, probabilidade, próxima ação e arquivos.',
      columns: 'Colunas',
      createSale: 'Nova venda',
      createQuote: 'Criar cotação',
      createOpportunity: 'Criar oportunidade',
      preferredCurrency: 'Moeda preferida',
    },
    filters: {
      ...esMX.filters,
      search: 'Buscar',
      searchPlaceholder: 'Oportunidade, empresa ou contato',
      owner: 'Responsável',
      all: 'Todos',
    },
    kpis: {
      opportunities: 'oportunidades',
      active: 'ativas',
      averageProbability: 'probabilidade méd.',
      inProposal: 'em proposta',
      pipeline: 'pipeline cotado',
      finalPipeline: 'pipeline final',
      exchangeRateDate: 'câmbio',
      pipelineQuotes: (count) => `${count} ${count === 1 ? 'cotação' : 'cotações'}`,
    },
    insight: {
      summary: (hotCount, pipeline, probability) => (
        `${hotCount} oportunidades quentes precisam de follow-up; o pipeline visível é ${pipeline} e a probabilidade média é ${probability}%.`
      ),
    },
    quickActions: {
      call: (name) => `Ligar para ${name}`,
      whatsapp: (name) => `WhatsApp para ${name}`,
      email: (name) => `Email para ${name}`,
      files: (name) => `Arquivos de ${name}`,
      history: (name) => `Histórico de ${name}`,
      edit: (name) => `Editar ${name}`,
      delete: (name) => `Excluir ${name}`,
      noPhone: 'Sem telefone disponível',
      noEmail: 'Sem email disponível',
    },
    modal: {
      ...esMX.modal,
      createTitle: 'Criar oportunidade',
      editTitle: 'Editar oportunidade',
      cancel: 'Cancelar',
      saveChanges: 'Salvar alterações',
      createOpportunity: 'Criar oportunidade',
    },
    detailModal: { title: 'Histórico da oportunidade', description: 'Registro operacional de eventos comerciais, follow-up, arquivos e mudanças relevantes.', close: 'Fechar' },
    filesModal: { title: 'Arquivos da oportunidade', description: 'Documentos comerciais ligados localmente à oportunidade selecionada.', local: 'Local', localFilesTitle: 'Arquivos locais', quotesTitle: 'Cotações ligadas', viewQuote: 'Ver cotação', empty: 'Esta oportunidade ainda não tem arquivos.', close: 'Fechar' },
    kanban: { dragHint: 'Arraste para mudar etapa', emptyColumn: 'Arraste oportunidades aqui' },
    agenda: {
      ...esMX.agenda,
      today: 'Hoje',
      dayCount: (count) => `${count} do dia`,
      weekCount: (count) => `${count} da semana`,
      scheduled: (count) => `${count} programadas`,
      noTime: 'Sem hora',
      noFollowUps: 'Sem follow-ups programados',
      allScheduled: 'Todas as oportunidades visíveis têm follow-up programado.',
    },
    deleteConfirm: {
      title: 'Excluir oportunidade',
      simple: (name) => `Excluir a oportunidade ${name}?`,
      withQuotes: (name, count) => `Excluir a oportunidade ${name}? Ela tem ${count} cotação(ões) ligada(s).`,
      confirm: 'Excluir oportunidade',
      cancel: 'Cancelar',
    },
  },
  'ko-CA': {
    ...enCA,
    header: {
      title: '영업 기회',
      subtitle: '연락처와 연결된 활성 영업 업무를 단계, 금액, 확률, 다음 행동, 파일로 관리합니다.',
      columns: '열',
      createSale: '새 판매',
      createQuote: '견적 만들기',
      createOpportunity: '기회 만들기',
      preferredCurrency: '기본 통화',
    },
    filters: { ...enCA.filters, title: '필터', search: '검색', searchPlaceholder: '기회, 회사 또는 연락처', owner: '담당자', all: '전체' },
    table: { ...enCA.table, actions: '작업', empty: '검색과 일치하는 기회가 없습니다.', noLastContact: '기록 없음' },
    modal: { ...enCA.modal, createTitle: '기회 만들기', editTitle: '기회 편집', cancel: '취소', saveChanges: '변경 저장', createOpportunity: '기회 만들기' },
    detailModal: { title: '기회 이력', description: '영업 이벤트, 후속 조치, 파일, 주요 변경의 운영 기록입니다.', close: '닫기' },
    filesModal: { title: '기회 파일', description: '선택한 기회에 로컬로 연결된 영업 문서입니다.', local: '로컬', localFilesTitle: '로컬 파일', quotesTitle: '연결된 견적', viewQuote: '견적 보기', empty: '아직 파일이 없습니다.', close: '닫기' },
  },
  'zh-CA': {
    ...enCA,
    header: {
      title: '销售机会',
      subtitle: '按阶段、金额、概率、下一步和文件管理与联系人关联的活跃销售工作。',
      columns: '列',
      createSale: '新销售',
      createQuote: '创建报价',
      createOpportunity: '创建机会',
      preferredCurrency: '首选货币',
    },
    filters: { ...enCA.filters, title: '筛选', search: '搜索', searchPlaceholder: '机会、公司或联系人', owner: '负责人', all: '全部' },
    table: { ...enCA.table, actions: '操作', empty: '没有符合搜索条件的机会。', noLastContact: '无记录' },
    modal: { ...enCA.modal, createTitle: '创建机会', editTitle: '编辑机会', cancel: '取消', saveChanges: '保存更改', createOpportunity: '创建机会' },
    detailModal: { title: '机会历史', description: '销售事件、跟进、文件和关键变更的运营记录。', close: '关闭' },
    filesModal: { title: '机会文件', description: '本地链接到所选机会的销售文档。', local: '本地', localFilesTitle: '本地文件', quotesTitle: '关联报价', viewQuote: '查看报价', empty: '此机会还没有文件。', close: '关闭' },
  },
} satisfies Record<string, ProspectosCopy>;

export function resolveProspectosLocale(locale: string | null | undefined) {
  if (!locale) {
    return 'en-CA';
  }

  if (locale in prospectosTranslations) {
    return locale as keyof typeof prospectosTranslations;
  }

  const loweredLocale = locale.toLowerCase();

  if (loweredLocale.startsWith('es-co')) return 'es-CO';
  if (loweredLocale.startsWith('es-')) return 'es-MX';
  if (loweredLocale.startsWith('fr')) return 'fr-CA';
  if (loweredLocale.startsWith('pt')) return 'pt-BR';
  if (loweredLocale.startsWith('ko')) return 'ko-CA';
  if (loweredLocale.startsWith('zh')) return 'zh-CA';
  if (loweredLocale.startsWith('en-us')) return 'en-US';

  return 'en-CA';
}

export function useProspectosTranslations() {
  const { currentLanguage } = useLanguage();

  return useMemo(
    () => prospectosTranslations[resolveProspectosLocale(currentLanguage.code)],
    [currentLanguage.code],
  );
}
