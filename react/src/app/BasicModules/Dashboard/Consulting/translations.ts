export type ConsultingTranslations = {
  title: string;
  subtitle: string;
  loading: string;
  errorDescription: string;
  requestError: string;
  retry: string;
  benefitIncluded: string;
  benefitAdditional: string;
  duration: string;
  pendingNotice: string;
  brandPromiseTitle: string;
  brandPromiseDescription: string;
  consultantChangeNote: string;
  scheduleTitle: string;
  scheduleDescription: string;
  stepSession: string;
  stepTime: string;
  stepContext: string;
  includedBadge: string;
  additionalBadge: string;
  preferredDate: string;
  preferredTime: string;
  alternativeTitle: string;
  addAlternative: string;
  removeAlternative: string;
  timezone: string;
  consultationMode: string;
  virtualMode: string;
  virtualDescription: string;
  inPersonMode: string;
  inPersonDescription: string;
  inPersonCost: string;
  inPersonQuoteBadge: string;
  country: string;
  city: string;
  cityPlaceholder: string;
  otherCity: string;
  unsupportedCountry: string;
  useVirtualInstead: string;
  topic: string;
  topics: Record<string, string>;
  notes: string;
  notesPlaceholder: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  submit: string;
  submitting: string;
  confirmationNote: string;
  upcomingTitle: string;
  requested: string;
  confirmed: string;
  paymentRequired: string;
  cancelled: string;
  completed: string;
  preferredLabel: string;
  alternativeLabel: string;
  meetingLink: string;
  meetingPending: string;
  meetingAvailableAt: string;
  consultantLabel: string;
  requestFlow: string;
  flowRequested: string;
  flowConfirmed: string;
  flowSession: string;
  cancelAction: string;
  cancelling: string;
  historyTitle: string;
  historyEmpty: string;
  successTitle: string;
  successDescription: string;
  requiredMessage: string;
  invalidDateMessage: string;
  locationRequiredMessage: string;
  notificationWarning: string;
};

const esMX: ConsultingTranslations = {
  title: 'Consultoría',
  subtitle: 'Agenda y da seguimiento a tus sesiones con el equipo de Índice.',
  loading: 'Preparando la agenda de consultoría…',
  errorDescription: 'Intenta nuevamente para consultar tus sesiones y disponibilidad.',
  requestError: 'No pudimos enviar tu solicitud. Tus datos siguen en pantalla; inténtalo nuevamente.',
  retry: 'Intentar nuevamente',
  benefitIncluded: 'Tu primera sesión virtual está incluida',
  benefitAdditional: 'Sesión adicional',
  duration: '50 minutos',
  pendingNotice: 'Elige el día y el horario que te convengan. Un consultor de Índice te contactará para conocer tus necesidades y confirmar contigo la sesión.',
  brandPromiseTitle: 'Nunca estás solo mientras haces crecer tu empresa',
  brandPromiseDescription: 'Índice te acompaña en cada etapa del crecimiento de tu empresa. Cuando necesites apoyo, analizaremos contigo la situación de tu negocio y te ayudaremos a tomar decisiones e implementar Índice de la manera más eficiente posible.',
  consultantChangeNote: 'Queremos que te sientas acompañado y en confianza. Si lo necesitas, puedes solicitar otro consultor para tu próxima sesión.',
  scheduleTitle: 'Solicita tu sesión',
  scheduleDescription: 'Primero dinos cuándo te conviene; después elegiremos contigo la mejor forma de ayudarte.',
  stepSession: '2 · Modalidad',
  stepTime: '1 · Día y horario',
  stepContext: '3 · Tema y contacto',
  includedBadge: 'Incluida con tu cuenta',
  additionalBadge: 'Requiere pago por separado',
  preferredDate: 'Fecha preferente',
  preferredTime: 'Hora preferente',
  alternativeTitle: 'Segundo horario',
  addAlternative: 'Agregar un horario alternativo',
  removeAlternative: 'Quitar horario alternativo',
  timezone: 'Zona horaria',
  consultationMode: '¿Cómo prefieres la consultoría?',
  virtualMode: 'Virtual',
  virtualDescription: 'Conéctate desde cualquier país. El enlace aparecerá cerca de la hora confirmada.',
  inPersonMode: 'Presencial',
  inPersonDescription: 'Disponible por ahora en ciudades seleccionadas de México y Canadá.',
  inPersonCost: 'La consultoría presencial tiene un costo adicional. Te enviaremos la cotización antes de confirmar.',
  inPersonQuoteBadge: 'Cotización presencial pendiente',
  country: 'País de la sesión presencial',
  city: 'Ciudad',
  cityPlaceholder: 'Selecciona una ciudad',
  otherCity: 'Ninguna de estas ciudades',
  unsupportedCountry: 'Aún no contamos con consultores presenciales disponibles en este país.',
  useVirtualInstead: 'Puedes seleccionar consultoría virtual para recibir acompañamiento desde cualquier lugar.',
  topic: '¿Qué quieres trabajar?',
  topics: {
    ONBOARDING: 'Implementación inicial de Índice',
    BUSINESS_CONSULTING: 'Consultoría de negocios',
    OPERATIONS: 'Procesos y operación',
    PEOPLE: 'Personas y organización',
    SALES: 'Ventas y oferta comercial',
    FINANCE: 'Finanzas e indicadores',
    OTHER: 'Otro reto de tu empresa',
  },
  notes: 'Cuéntanos el contexto',
  notesPlaceholder: 'Describe brevemente el reto, la decisión que necesitas tomar o el resultado que buscas.',
  attendeeName: 'Nombre de quien asistirá',
  attendeeEmail: 'Correo de contacto',
  attendeePhone: 'Teléfono de contacto',
  submit: 'Enviar solicitud',
  submitting: 'Enviando solicitud…',
  confirmationNote: 'La solicitud quedará “Por confirmar”. Un consultor se pondrá en contacto contigo para cuadrar la cita.',
  upcomingTitle: 'Tu próxima consultoría',
  requested: 'Por confirmar',
  confirmed: 'Confirmada',
  paymentRequired: 'Pago o cotización pendiente',
  cancelled: 'Cancelada',
  completed: 'Completada',
  preferredLabel: 'Horario preferente',
  alternativeLabel: 'Alternativa',
  meetingLink: 'Ingresar a la consultoría',
  meetingPending: 'El enlace estará disponible 15 minutos antes de la sesión.',
  meetingAvailableAt: 'Acceso disponible desde',
  consultantLabel: 'Consultor asignado',
  requestFlow: 'Seguimiento de tu solicitud',
  flowRequested: 'Solicitud enviada',
  flowConfirmed: 'Cita confirmada',
  flowSession: 'Consultoría',
  cancelAction: 'Cancelar solicitud',
  cancelling: 'Cancelando…',
  historyTitle: 'Historial de consultoría',
  historyEmpty: 'Todavía no has solicitado una sesión.',
  successTitle: 'Solicitud enviada',
  successDescription: 'Tu solicitud aparece ahora como “Por confirmar”. Un consultor te contactará para acordar la sesión.',
  requiredMessage: 'Completa los datos obligatorios antes de continuar.',
  invalidDateMessage: 'Elige un horario hábil con al menos 24 horas de anticipación.',
  locationRequiredMessage: 'Selecciona una ciudad con servicio presencial o cambia la modalidad a virtual.',
  notificationWarning: 'La solicitud quedó guardada, pero el aviso por correo no pudo enviarse. El equipo podrá verla en Root.',
};

const enCA: ConsultingTranslations = {
  title: 'Consulting',
  subtitle: 'Schedule and track sessions with the Indice team.',
  loading: 'Preparing the consulting schedule…',
  errorDescription: 'Try again to load your sessions and availability.',
  requestError: 'We could not send your request. Your details are still on screen; please try again.',
  retry: 'Try again',
  benefitIncluded: 'Your first virtual session is included',
  benefitAdditional: 'Additional session',
  duration: '50 minutes',
  pendingNotice: 'Choose the day and time that work best for you. An Indice consultant will contact you to understand your needs and confirm the session with you.',
  brandPromiseTitle: 'You are never alone while growing your company',
  brandPromiseDescription: 'Indice accompanies you through every stage of your company’s growth. Whenever you need support, we will review your business situation with you, help you make decisions, and implement Indice as efficiently as possible.',
  consultantChangeNote: 'We want you to feel supported and at ease. If needed, you may request a different consultant for your next session.',
  scheduleTitle: 'Request your session',
  scheduleDescription: 'First tell us when works for you; then we will choose the best way to help together.',
  stepSession: '2 · Format',
  stepTime: '1 · Date and time',
  stepContext: '3 · Topic and contact',
  includedBadge: 'Included with your account',
  additionalBadge: 'Separate payment required',
  preferredDate: 'Preferred date',
  preferredTime: 'Preferred time',
  alternativeTitle: 'Second time',
  addAlternative: 'Add an alternative time',
  removeAlternative: 'Remove alternative time',
  timezone: 'Time zone',
  consultationMode: 'How would you prefer to meet?',
  virtualMode: 'Virtual',
  virtualDescription: 'Join from any country. The link will appear shortly before the confirmed time.',
  inPersonMode: 'In person',
  inPersonDescription: 'Currently available in selected cities in Mexico and Canada.',
  inPersonCost: 'In-person consulting has an additional cost. We will send a quote before confirming.',
  inPersonQuoteBadge: 'In-person quote pending',
  country: 'Country for the in-person session',
  city: 'City',
  cityPlaceholder: 'Select a city',
  otherCity: 'None of these cities',
  unsupportedCountry: 'We do not have in-person consultants available in this country yet.',
  useVirtualInstead: 'You can select virtual consulting to receive support from anywhere.',
  topic: 'What would you like to work on?',
  topics: {
    ONBOARDING: 'Initial Indice implementation',
    BUSINESS_CONSULTING: 'Business consulting',
    OPERATIONS: 'Processes and operations',
    PEOPLE: 'People and organization',
    SALES: 'Sales and commercial offer',
    FINANCE: 'Finance and indicators',
    OTHER: 'Another business challenge',
  },
  notes: 'Share the context',
  notesPlaceholder: 'Briefly describe the challenge, decision you need to make, or result you want.',
  attendeeName: 'Attendee name',
  attendeeEmail: 'Contact email',
  attendeePhone: 'Contact phone',
  submit: 'Send request',
  submitting: 'Sending request…',
  confirmationNote: 'The request will remain pending confirmation. A consultant will contact you to coordinate it.',
  upcomingTitle: 'Your next consulting session',
  requested: 'Pending confirmation',
  confirmed: 'Confirmed',
  paymentRequired: 'Payment or quote pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
  preferredLabel: 'Preferred time',
  alternativeLabel: 'Alternative',
  meetingLink: 'Join consulting session',
  meetingPending: 'The link will be available 15 minutes before the session.',
  meetingAvailableAt: 'Access available from',
  consultantLabel: 'Assigned consultant',
  requestFlow: 'Request progress',
  flowRequested: 'Request sent',
  flowConfirmed: 'Appointment confirmed',
  flowSession: 'Consulting session',
  cancelAction: 'Cancel request',
  cancelling: 'Cancelling…',
  historyTitle: 'Consulting history',
  historyEmpty: 'You have not requested a session yet.',
  successTitle: 'Request sent',
  successDescription: 'Your request is now pending confirmation. A consultant will contact you to coordinate the session.',
  requiredMessage: 'Complete the required fields before continuing.',
  invalidDateMessage: 'Choose a business-hour time with at least 24 hours notice.',
  locationRequiredMessage: 'Select a city with in-person service or change to virtual consulting.',
  notificationWarning: 'The request was saved, but the email notification failed. The team can still see it in Root.',
};

const translations: Record<string, ConsultingTranslations> = {
  'es-MX': esMX,
  'es-CO': esMX,
  'en-CA': enCA,
  'en-US': enCA,
  'fr-CA': { ...enCA, title: 'Conseil', subtitle: "Planifiez et suivez vos séances avec l’équipe Indice." },
  'pt-BR': { ...enCA, title: 'Consultoria', subtitle: 'Agende e acompanhe sessões com a equipe Índice.' },
  'ko-CA': { ...enCA, title: '컨설팅', subtitle: 'Indice 팀과의 상담을 예약하고 확인하세요.' },
  'zh-CA': { ...enCA, title: '咨询', subtitle: '安排并跟进与 Indice 团队的咨询。' },
};

export function getConsultingTranslations(locale: string | null | undefined) {
  const normalized = locale?.trim().toLowerCase() || 'en-ca';
  if (normalized.startsWith('es')) return normalized.startsWith('es-co') ? translations['es-CO'] : translations['es-MX'];
  if (normalized.startsWith('fr')) return translations['fr-CA'];
  if (normalized.startsWith('pt')) return translations['pt-BR'];
  if (normalized.startsWith('ko')) return translations['ko-CA'];
  if (normalized.startsWith('zh')) return translations['zh-CA'];
  return normalized.startsWith('en-us') ? translations['en-US'] : translations['en-CA'];
}
