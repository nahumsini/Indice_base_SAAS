import type { BusinessProfileSectionKey } from '../../../api/HomePanel/BusinessProfile/businessProfile';
import type {
  BusinessDiagnosisScoreReport,
  DiagnosisPillarScore,
  DiagnosisQuestionScore,
} from './businessDiagnosisScoring';

type NarrativeLanguage = 'en' | 'es';

export type DiagnosisSignal = {
  signal: string;
  risk: string;
  action: string;
};

export type DiagnosisPriority = {
  pillar: DiagnosisPillarScore;
  signal: DiagnosisSignal;
};

export type DiagnosisActionPlanItem = {
  label: string;
  title: string;
  body: string;
};

export type BusinessDiagnosisNarrative = {
  executiveRead: string;
  crossRead: string;
  completenessNote: string;
  pillarSignals: Record<BusinessProfileSectionKey, DiagnosisSignal>;
  priorities: DiagnosisPriority[];
  actionPlan: DiagnosisActionPlanItem[];
  labels: {
    actionPlanTitle: string;
    actionTitle: string;
    crossReadTitle: string;
    priorityTitle: string;
    riskTitle: string;
    signalTitle: string;
  };
};

const getNarrativeLanguage = (locale: string): NarrativeLanguage => (
  locale.toLowerCase().startsWith('es') ? 'es' : 'en'
);

const BUSINESS_SIGNALS: Record<NarrativeLanguage, Record<BusinessProfileSectionKey, DiagnosisSignal[]>> = {
  es: {
    people: [
      {
        signal: 'El rol directivo necesita mayor foco operativo.',
        risk: 'Si el liderazgo mezcla demasiadas funciones, las prioridades cambian por urgencia y no por estrategia.',
        action: 'Define las tres decisiones que solo dirección debe tomar y delega el resto con responsables visibles.',
      },
      {
        signal: 'La capacidad del equipo puede estar cerca del limite.',
        risk: 'Cuando la carga no se mide, el negocio crece con cansancio, rotacion o errores silenciosos.',
        action: 'Registra carga por persona y revisa semanalmente si las responsabilidades estan balanceadas.',
      },
      {
        signal: 'La estructura del equipo no esta suficientemente clara.',
        risk: 'Sin estructura, las tareas se duplican, se pierden o regresan al fundador.',
        action: 'Dibuja una estructura simple con duenos por area, aunque el equipo sea pequeno.',
      },
      {
        signal: 'La asignacion de tareas depende demasiado de acuerdos informales.',
        risk: 'Lo urgente desplaza lo importante y nadie sabe con precision que esta pendiente.',
        action: 'Toda tarea recurrente debe tener dueño, fecha y estado visible.',
      },
      {
        signal: 'El desempeno no se revisa con una cadencia consistente.',
        risk: 'Los problemas de rendimiento se descubren tarde y se vuelven conversaciones dificiles.',
        action: 'Crea una revision quincenal corta con avances, bloqueos y compromisos.',
      },
      {
        signal: 'La delegacion todavia no libera al liderazgo.',
        risk: 'El negocio queda limitado por la disponibilidad de pocas personas clave.',
        action: 'Elige una decision repetitiva y transfierela con criterio, limite y seguimiento semanal.',
      },
      {
        signal: 'La comunicacion interna puede generar ruido operativo.',
        risk: 'Si todo vive en chats, las decisiones se pierden y el seguimiento se vuelve manual.',
        action: 'Separa anuncios, tareas y decisiones en espacios distintos y faciles de consultar.',
      },
      {
        signal: 'Las reuniones pueden no estar convirtiendose en ejecucion.',
        risk: 'Reunirse sin acuerdos claros crea sensacion de avance, pero no control real.',
        action: 'Cierra cada reunion con tres elementos: responsable, fecha y siguiente accion.',
      },
      {
        signal: 'Las responsabilidades necesitan mayor nitidez.',
        risk: 'Cuando todos ayudan, nadie responde; esa ambiguedad frena la operacion diaria.',
        action: 'Documenta quien decide, quien ejecuta y quien valida cada flujo clave.',
      },
      {
        signal: 'La integracion de nuevas personas puede depender de explicaciones manuales.',
        risk: 'Cada incorporacion consume tiempo del equipo y transmite procesos distintos.',
        action: 'Crea una guia de bienvenida con accesos, rutinas, contactos y primeras tareas.',
      },
    ],
    processes: [
      {
        signal: 'Los procesos aun no estan suficientemente documentados.',
        risk: 'El conocimiento vive en personas y el negocio se vuelve fragil cuando alguien falta.',
        action: 'Documenta los tres flujos mas repetidos con pasos, dueño y criterio de cierre.',
      },
      {
        signal: 'La gestion de tareas necesita mas visibilidad.',
        risk: 'Sin tablero operativo, el seguimiento depende de memoria, mensajes y persecucion manual.',
        action: 'Centraliza tareas activas en una vista unica con prioridad, responsable y fecha.',
      },
      {
        signal: 'El avance operativo no se monitorea con suficiente frecuencia.',
        risk: 'Los retrasos se detectan tarde y afectan servicio, ventas o costos.',
        action: 'Define una revision diaria o semanal de pendientes, vencidos y bloqueos.',
      },
      {
        signal: 'La automatizacion todavia no reduce trabajo repetitivo.',
        risk: 'El equipo gasta energia en tareas que no agregan criterio ni valor.',
        action: 'Identifica una tarea repetida semanalmente y conviertela en plantilla, regla o recordatorio.',
      },
      {
        signal: 'La operacion puede no ser replicable.',
        risk: 'Si abrir otra unidad o contratar otra persona requiere improvisar, escalar sera caro.',
        action: 'Convierte el flujo mas importante en checklist reutilizable.',
      },
      {
        signal: 'Hay perdida de tiempo en puntos no controlados.',
        risk: 'La friccion diaria se normaliza y termina ocultando costos reales.',
        action: 'Registra durante una semana donde se detienen las tareas y prioriza el mayor cuello de botella.',
      },
      {
        signal: 'El negocio depende demasiado de personas clave.',
        risk: 'La ausencia de una persona puede detener decisiones o entregas.',
        action: 'Crea respaldo para cada proceso critico: responsable principal, respaldo y documentacion minima.',
      },
      {
        signal: 'La claridad de los procesos necesita refuerzo.',
        risk: 'Cada persona ejecuta distinto y el resultado se vuelve inconsistente.',
        action: 'Define entrada, pasos y salida esperada para cada proceso operativo clave.',
      },
      {
        signal: 'Los errores no parecen gestionarse como aprendizaje operativo.',
        risk: 'Los mismos problemas se repiten y erosionan margen, tiempo y confianza.',
        action: 'Crea una revision simple de errores: causa, correccion y prevencion.',
      },
      {
        signal: 'La escalabilidad operativa todavia no esta asegurada.',
        risk: 'Crecer aumentara complejidad mas rapido que la capacidad de controlarla.',
        action: 'Antes de crecer, estandariza los procesos que mas afectan cliente, equipo y caja.',
      },
    ],
    products: [
      {
        signal: 'La oferta puede no estar suficientemente definida.',
        risk: 'Si el equipo no explica igual que vende, el mercado tampoco entiende por que comprar.',
        action: 'Resume la oferta principal en una frase, con problema, solucion y cliente ideal.',
      },
      {
        signal: 'El cliente objetivo necesita mas precision.',
        risk: 'Vender a todos dispersa marketing, servicio y desarrollo de producto.',
        action: 'Elige el segmento con mayor margen o repeticion y ajusta el mensaje para ese cliente.',
      },
      {
        signal: 'Los ingresos principales pueden no estar bien identificados.',
        risk: 'El negocio puede invertir esfuerzo en lineas que no sostienen la rentabilidad.',
        action: 'Ordena productos o servicios por ingreso, margen y frecuencia de compra.',
      },
      {
        signal: 'La diversificacion comercial puede ser debil.',
        risk: 'Depender de pocos productos o clientes expone al negocio ante cambios de demanda.',
        action: 'Define una segunda fuente de ingreso viable sin descuidar la oferta principal.',
      },
      {
        signal: 'La definicion de precios necesita mas control.',
        risk: 'Vender sin entender margen puede hacer crecer ingresos mientras cae la utilidad.',
        action: 'Revisa precio, costo directo, margen y descuentos permitidos por linea.',
      },
      {
        signal: 'El desempeno comercial no se mide con suficiente claridad.',
        risk: 'Sin datos, las decisiones de producto se basan en percepcion y no en comportamiento real.',
        action: 'Mide ventas, margen, recurrencia y quejas por producto cada semana.',
      },
      {
        signal: 'La propuesta de valor necesita mayor diferenciacion.',
        risk: 'Si la promesa es generica, el precio se vuelve el unico argumento.',
        action: 'Define tres razones concretas por las que un cliente deberia elegirte.',
      },
      {
        signal: 'El feedback del cliente no esta cerrando el ciclo de mejora.',
        risk: 'El producto evoluciona desde intuicion interna y no desde evidencia del cliente.',
        action: 'Pregunta a clientes recientes que valoraron, que falto y que casi impide la compra.',
      },
      {
        signal: 'La evolucion del producto puede estar poco sistematizada.',
        risk: 'Las mejoras se vuelven reactivas y compiten con urgencias diarias.',
        action: 'Crea una lista priorizada de mejoras con impacto esperado y responsable.',
      },
      {
        signal: 'La prioridad comercial necesita mas foco.',
        risk: 'Demasiadas iniciativas comerciales diluyen ejecucion y aprendizaje.',
        action: 'Escoge una prioridad comercial por mes y mide si mueve ventas, margen o retencion.',
      },
    ],
    finance: [
      {
        signal: 'El control financiero necesita una base mas visible.',
        risk: 'Sin control, el negocio decide tarde y confunde ventas con salud financiera.',
        action: 'Consolida ingresos, egresos, caja disponible y cuentas por cobrar en una revision semanal.',
      },
      {
        signal: 'La revision de numeros no tiene suficiente cadencia.',
        risk: 'Los problemas financieros aparecen cuando ya son urgentes.',
        action: 'Agenda una revision fija de 30 minutos para caja, margen y gastos.',
      },
      {
        signal: 'El flujo de efectivo puede no estar proyectado.',
        risk: 'La empresa puede ser rentable en papel y aun asi quedarse sin liquidez.',
        action: 'Proyecta entradas y salidas de las proximas cuatro semanas.',
      },
      {
        signal: 'Los costos no estan suficientemente claros.',
        risk: 'Sin costos visibles, precios y descuentos pueden destruir margen.',
        action: 'Separa costos directos, gastos fijos y gastos variables por linea o unidad.',
      },
      {
        signal: 'El margen necesita seguimiento mas disciplinado.',
        risk: 'El crecimiento puede financiarse con utilidad insuficiente.',
        action: 'Define margen minimo aceptable y revisalo antes de aprobar descuentos.',
      },
      {
        signal: 'Las decisiones financieras pueden depender demasiado de intuicion.',
        risk: 'La intuicion ayuda, pero sin datos aumenta errores repetidos.',
        action: 'Antes de una decision relevante, revisa caja, margen e impacto esperado.',
      },
      {
        signal: 'Los ingresos pueden no ser suficientemente predecibles.',
        risk: 'La planeacion se vuelve defensiva y depende de ventas de ultima hora.',
        action: 'Distingue ingresos recurrentes, probables y extraordinarios.',
      },
      {
        signal: 'La deuda requiere mayor visibilidad operativa.',
        risk: 'Pagos mal calendarizados pueden presionar caja y frenar decisiones.',
        action: 'Lista deuda, pagos, tasas y fechas criticas en una vista mensual.',
      },
      {
        signal: 'La preparacion ante crisis necesita fortalecerse.',
        risk: 'Un mes dificil puede obligar a recortes improvisados o deuda cara.',
        action: 'Define gastos pausables, caja minima y escenario de emergencia.',
      },
      {
        signal: 'El cumplimiento fiscal necesita control preventivo.',
        risk: 'Los pendientes fiscales se vuelven multas, bloqueos o decisiones apresuradas.',
        action: 'Crea calendario fiscal con responsables, fechas y documentos requeridos.',
      },
    ],
  },
  en: {
    people: [
      {
        signal: 'Leadership focus needs stronger operational boundaries.',
        risk: 'When leadership carries too many functions, priorities are driven by urgency instead of strategy.',
        action: 'Define the three decisions only leadership should make and delegate the rest with visible owners.',
      },
      {
        signal: 'Team capacity may be close to its limit.',
        risk: 'When workload is not visible, growth creates fatigue, turnover, or silent mistakes.',
        action: 'Track workload by person and review weekly whether responsibilities are balanced.',
      },
      {
        signal: 'The team structure is not clear enough.',
        risk: 'Without structure, tasks are duplicated, dropped, or returned to the founder.',
        action: 'Draw a simple structure with owners by area, even if the team is small.',
      },
      {
        signal: 'Task assignment relies too much on informal agreements.',
        risk: 'Urgency displaces important work and nobody has a precise view of what is pending.',
        action: 'Every recurring task should have an owner, due date, and visible status.',
      },
      {
        signal: 'Performance is not reviewed with a consistent cadence.',
        risk: 'Performance issues are discovered late and become harder conversations.',
        action: 'Create a short biweekly review with progress, blockers, and commitments.',
      },
      {
        signal: 'Delegation is not yet freeing leadership capacity.',
        risk: 'The business remains limited by the availability of a few key people.',
        action: 'Choose one recurring decision and transfer it with criteria, limits, and weekly follow-up.',
      },
      {
        signal: 'Internal communication may be creating operational noise.',
        risk: 'If everything lives in chat, decisions get lost and follow-up becomes manual.',
        action: 'Separate announcements, tasks, and decisions into distinct places that are easy to review.',
      },
      {
        signal: 'Meetings may not be converting into execution.',
        risk: 'Meetings without clear agreements create a feeling of progress without real control.',
        action: 'Close every meeting with three elements: owner, date, and next action.',
      },
      {
        signal: 'Responsibilities need sharper definition.',
        risk: 'When everyone helps, nobody owns the result; that ambiguity slows daily operations.',
        action: 'Document who decides, who executes, and who validates each key workflow.',
      },
      {
        signal: 'Onboarding may depend on manual explanations.',
        risk: 'Every new hire consumes team time and receives different process knowledge.',
        action: 'Create an onboarding guide with access, routines, contacts, and first tasks.',
      },
    ],
    processes: [
      {
        signal: 'Processes are not documented enough.',
        risk: 'Knowledge lives in people, making the business fragile when someone is absent.',
        action: 'Document the three most repeated workflows with steps, owner, and closure criteria.',
      },
      {
        signal: 'Task management needs more visibility.',
        risk: 'Without an operating board, follow-up depends on memory, messages, and manual chasing.',
        action: 'Centralize active tasks in one view with priority, owner, and due date.',
      },
      {
        signal: 'Operational progress is not monitored frequently enough.',
        risk: 'Delays are detected late and affect service, sales, or costs.',
        action: 'Define a daily or weekly review of pending work, overdue tasks, and blockers.',
      },
      {
        signal: 'Automation is not yet reducing repetitive work.',
        risk: 'The team spends energy on tasks that do not require judgment or add value.',
        action: 'Identify one weekly recurring task and turn it into a template, rule, or reminder.',
      },
      {
        signal: 'The operation may not be replicable.',
        risk: 'If opening another unit or hiring another person requires improvisation, scaling will be expensive.',
        action: 'Turn the most important workflow into a reusable checklist.',
      },
      {
        signal: 'Time is being lost in uncontrolled points.',
        risk: 'Daily friction becomes normal and hides real costs.',
        action: 'Track where tasks stop for one week and prioritize the biggest bottleneck.',
      },
      {
        signal: 'The business depends too much on key people.',
        risk: 'One absence can stop decisions or delivery.',
        action: 'Create backup for every critical process: primary owner, backup, and minimum documentation.',
      },
      {
        signal: 'Process clarity needs reinforcement.',
        risk: 'Each person executes differently and outcomes become inconsistent.',
        action: 'Define the input, steps, and expected output for each key operating process.',
      },
      {
        signal: 'Errors are not being managed as operational learning.',
        risk: 'The same problems repeat and erode margin, time, and trust.',
        action: 'Create a simple error review: cause, correction, and prevention.',
      },
      {
        signal: 'Operational scalability is not yet secured.',
        risk: 'Growth will increase complexity faster than the business can control it.',
        action: 'Before growing, standardize the processes that most affect customers, team, and cash.',
      },
    ],
    products: [
      {
        signal: 'The offer may not be defined clearly enough.',
        risk: 'If the team cannot explain the offer consistently, the market will not know why to buy.',
        action: 'Summarize the main offer in one sentence with problem, solution, and ideal customer.',
      },
      {
        signal: 'The target customer needs more precision.',
        risk: 'Selling to everyone spreads marketing, service, and product development too thin.',
        action: 'Choose the segment with the highest margin or repetition and adjust the message for that customer.',
      },
      {
        signal: 'Main revenue drivers may not be clearly identified.',
        risk: 'The business may invest effort in lines that do not support profitability.',
        action: 'Rank products or services by revenue, margin, and purchase frequency.',
      },
      {
        signal: 'Commercial diversification may be weak.',
        risk: 'Depending on a few products or customers exposes the business to demand shifts.',
        action: 'Define one viable second revenue source without neglecting the main offer.',
      },
      {
        signal: 'Pricing needs stronger control.',
        risk: 'Selling without margin clarity can grow revenue while reducing profit.',
        action: 'Review price, direct cost, margin, and allowed discounts by line.',
      },
      {
        signal: 'Commercial performance is not measured clearly enough.',
        risk: 'Without data, product decisions rely on perception instead of customer behavior.',
        action: 'Measure sales, margin, recurrence, and complaints by product every week.',
      },
      {
        signal: 'The value proposition needs stronger differentiation.',
        risk: 'If the promise is generic, price becomes the only argument.',
        action: 'Define three concrete reasons why a customer should choose you.',
      },
      {
        signal: 'Customer feedback is not closing the improvement loop.',
        risk: 'The product evolves from internal intuition instead of customer evidence.',
        action: 'Ask recent customers what they valued, what was missing, and what almost stopped the purchase.',
      },
      {
        signal: 'Product evolution may be poorly systematized.',
        risk: 'Improvements become reactive and compete with daily urgencies.',
        action: 'Create a prioritized improvement list with expected impact and owner.',
      },
      {
        signal: 'Commercial priority needs more focus.',
        risk: 'Too many commercial initiatives dilute execution and learning.',
        action: 'Choose one commercial priority per month and measure whether it moves sales, margin, or retention.',
      },
    ],
    finance: [
      {
        signal: 'Financial control needs a more visible base.',
        risk: 'Without control, the business decides late and confuses sales with financial health.',
        action: 'Consolidate income, expenses, cash available, and receivables in a weekly review.',
      },
      {
        signal: 'Number review does not have enough cadence.',
        risk: 'Financial issues appear only when they are already urgent.',
        action: 'Schedule a fixed 30-minute review for cash, margin, and expenses.',
      },
      {
        signal: 'Cash flow may not be projected.',
        risk: 'The company can be profitable on paper and still run out of liquidity.',
        action: 'Project inflows and outflows for the next four weeks.',
      },
      {
        signal: 'Costs are not clear enough.',
        risk: 'Without visible costs, prices and discounts can destroy margin.',
        action: 'Separate direct costs, fixed expenses, and variable expenses by line or unit.',
      },
      {
        signal: 'Margin needs more disciplined tracking.',
        risk: 'Growth may be funded with insufficient profit.',
        action: 'Define minimum acceptable margin and review it before approving discounts.',
      },
      {
        signal: 'Financial decisions may rely too much on intuition.',
        risk: 'Intuition helps, but without data it increases repeated mistakes.',
        action: 'Before a relevant decision, review cash, margin, and expected impact.',
      },
      {
        signal: 'Revenue may not be predictable enough.',
        risk: 'Planning becomes defensive and depends on last-minute sales.',
        action: 'Separate recurring, probable, and extraordinary revenue.',
      },
      {
        signal: 'Debt requires greater operational visibility.',
        risk: 'Poorly scheduled payments can pressure cash and block decisions.',
        action: 'List debt, payments, rates, and critical dates in a monthly view.',
      },
      {
        signal: 'Crisis preparation needs strengthening.',
        risk: 'A difficult month can force improvised cuts or expensive debt.',
        action: 'Define pausable expenses, minimum cash, and an emergency scenario.',
      },
      {
        signal: 'Tax compliance needs preventive control.',
        risk: 'Tax pending items become fines, blocks, or rushed decisions.',
        action: 'Create a tax calendar with owners, dates, and required documents.',
      },
    ],
  },
};

const LABELS: Record<NarrativeLanguage, BusinessDiagnosisNarrative['labels']> = {
  es: {
    actionPlanTitle: 'Plan de acción sugerido',
    actionTitle: 'Acción recomendada',
    crossReadTitle: 'Lectura cruzada',
    priorityTitle: 'Prioridad operativa',
    riskTitle: 'Riesgo operativo',
    signalTitle: 'Señal detectada',
  },
  en: {
    actionPlanTitle: 'Suggested action plan',
    actionTitle: 'Recommended action',
    crossReadTitle: 'Cross-pillar read',
    priorityTitle: 'Operating priority',
    riskTitle: 'Operating risk',
    signalTitle: 'Detected signal',
  },
};

const getPillarScore = (report: BusinessDiagnosisScoreReport, key: BusinessProfileSectionKey) => (
  report.pillars.find((pillar) => pillar.key === key)?.averageScore ?? 0
);

const hasAnswers = (report: BusinessDiagnosisScoreReport) => report.overall.answeredCount > 0;

const getLowestAnsweredQuestions = (pillar: DiagnosisPillarScore, limit = 3) => (
  pillar.questions
    .filter((question) => question.selectedOptionValue !== null)
    .sort((left, right) => {
      if (left.points === right.points) {
        return left.index - right.index;
      }

      return left.points - right.points;
    })
    .slice(0, limit)
);

const getFallbackSignal = (
  pillar: DiagnosisPillarScore,
  language: NarrativeLanguage,
): DiagnosisSignal => (
  language === 'es'
    ? {
        signal: `${pillar.title} necesita mas respuestas para una lectura precisa.`,
        risk: 'Con informacion incompleta, el reporte solo puede marcar oportunidades generales.',
        action: 'Completa las preguntas pendientes antes de tomar decisiones de mejora.',
      }
    : {
        signal: `${pillar.title} needs more answers for a precise read.`,
        risk: 'With incomplete information, the report can only mark general opportunities.',
        action: 'Complete the pending questions before making improvement decisions.',
      }
);

const getPrimarySignal = (
  pillar: DiagnosisPillarScore,
  language: NarrativeLanguage,
): DiagnosisSignal => {
  const lowestQuestion = getLowestAnsweredQuestions(pillar, 1)[0];

  if (!lowestQuestion) {
    return getFallbackSignal(pillar, language);
  }

  return BUSINESS_SIGNALS[language][pillar.key][lowestQuestion.index - 1] ?? getFallbackSignal(pillar, language);
};

const getExecutiveRead = (
  report: BusinessDiagnosisScoreReport,
  strongestPillar: DiagnosisPillarScore,
  weakestPillar: DiagnosisPillarScore,
  language: NarrativeLanguage,
) => {
  if (!hasAnswers(report)) {
    return language === 'es'
      ? 'El diagnostico aun no tiene respuestas suficientes. El primer valor del reporte es mostrar que falta informacion antes de concluir.'
      : 'The assessment does not have enough answers yet. The first value of the report is showing that more information is needed before concluding.';
  }

  const completion = Math.round((report.overall.answeredCount / Math.max(report.overall.totalQuestions, 1)) * 100);
  const completionPrefix = completion < 100
    ? language === 'es'
      ? `Con ${completion}% del diagnostico completado, la lectura es preliminar. `
      : `With ${completion}% of the assessment completed, this read is preliminary. `
    : '';

  if (report.overall.averageScore <= 40) {
    return language === 'es'
      ? `${completionPrefix}La empresa necesita construir una base de control: responsables, rutinas visibles y datos minimos para decidir. ${weakestPillar.title} marca el primer frente de accion.`
      : `${completionPrefix}The company needs to build a control base: owners, visible routines, and minimum decision data. ${weakestPillar.title} is the first action front.`;
  }

  if (report.overall.averageScore <= 60) {
    return language === 'es'
      ? `${completionPrefix}Ya existe una forma de operar, pero todavia depende de seguimiento manual y criterio personal. Refuerza ${weakestPillar.title} sin perder lo avanzado en ${strongestPillar.title}.`
      : `${completionPrefix}There is already a way of operating, but it still depends on manual follow-up and personal judgment. Strengthen ${weakestPillar.title} without losing the progress in ${strongestPillar.title}.`;
  }

  if (report.overall.averageScore <= 75) {
    return language === 'es'
      ? `${completionPrefix}La empresa esta ordenandose. El valor ahora esta en medir mejor, cerrar brechas y convertir lo que funciona en sistema repetible.`
      : `${completionPrefix}The company is becoming structured. The value now is measuring better, closing gaps, and turning what works into a repeatable system.`;
  }

  if (report.overall.averageScore <= 90) {
    return language === 'es'
      ? `${completionPrefix}La operacion tiene buena disciplina. La prioridad es proteger consistencia, delegacion y visibilidad mientras aumenta la complejidad.`
      : `${completionPrefix}The operation has good discipline. The priority is protecting consistency, delegation, and visibility as complexity increases.`;
  }

  return language === 'es'
    ? `${completionPrefix}La empresa muestra un sistema maduro. El reto no es corregir caos, sino sostener estandar, aprendizaje y mejora continua.`
    : `${completionPrefix}The company shows a mature system. The challenge is not fixing chaos, but sustaining standards, learning, and continuous improvement.`;
};

const getCrossRead = (
  report: BusinessDiagnosisScoreReport,
  language: NarrativeLanguage,
) => {
  if (!hasAnswers(report)) {
    return language === 'es'
      ? 'Completa al menos una seccion para detectar patrones cruzados entre personas, procesos, productos y finanzas.'
      : 'Complete at least one section to detect cross-patterns between people, processes, products, and finance.';
  }

  const people = getPillarScore(report, 'people');
  const processes = getPillarScore(report, 'processes');
  const products = getPillarScore(report, 'products');
  const finance = getPillarScore(report, 'finance');

  if (people < 60 && processes < 60) {
    return language === 'es'
      ? 'Personas y procesos bajos indican dependencia de individuos clave. La mejora no empieza con mas herramientas, sino con responsabilidades visibles y rutinas de seguimiento.'
      : 'Low people and process scores indicate dependency on key individuals. Improvement does not start with more tools, but with visible responsibilities and follow-up routines.';
  }

  if (products < 60 && finance < 60) {
    return language === 'es'
      ? 'Productos y finanzas bajos sugieren riesgo de vender sin margen claro. Antes de empujar crecimiento, conecta oferta, precio, costo y flujo de efectivo.'
      : 'Low product and finance scores suggest a risk of selling without clear margin. Before pushing growth, connect offer, price, cost, and cash flow.';
  }

  if (processes < 60 && finance < 60) {
    return language === 'es'
      ? 'Procesos y finanzas bajos suelen esconder costos operativos. Lo que no se mide en ejecucion termina apareciendo como gasto, retraso o perdida de margen.'
      : 'Low process and finance scores often hide operating costs. What is not measured in execution later appears as expense, delay, or margin loss.';
  }

  if (people >= 75 && processes < 60) {
    return language === 'es'
      ? 'El equipo puede tener buena disposicion, pero los procesos no sostienen esa energia. Estandariza antes de pedir mas esfuerzo.'
      : 'The team may have strong intent, but processes are not supporting that energy. Standardize before asking for more effort.';
  }

  if (finance >= 75 && products < 60) {
    return language === 'es'
      ? 'Hay control financiero, pero la estrategia comercial necesita foco. Usa los numeros para decidir que vender, a quien y con que margen.'
      : 'There is financial control, but commercial strategy needs focus. Use the numbers to decide what to sell, to whom, and at what margin.';
  }

  return language === 'es'
    ? 'El patron principal es de ajuste fino: prioriza el pilar mas debil y usa el pilar mas fuerte como soporte para ejecutar el cambio.'
    : 'The main pattern is fine-tuning: prioritize the weakest pillar and use the strongest pillar as support to execute the change.';
};

const getCompletenessNote = (
  report: BusinessDiagnosisScoreReport,
  language: NarrativeLanguage,
) => {
  if (report.overall.answeredCount === 0) {
    return language === 'es'
      ? 'Datos insuficientes: el reporte se enriquecera cuando respondas el diagnostico.'
      : 'Insufficient data: the report becomes richer after answering the assessment.';
  }

  if (report.overall.answeredCount < report.overall.totalQuestions) {
    return language === 'es'
      ? `Lectura parcial: ${report.overall.answeredCount} de ${report.overall.totalQuestions} respuestas capturadas.`
      : `Partial read: ${report.overall.answeredCount} of ${report.overall.totalQuestions} answers captured.`;
  }

  return language === 'es'
    ? 'Lectura completa: el plan se basa en las respuestas capturadas en los cuatro pilares.'
    : 'Complete read: the plan is based on the answers captured across all four pillars.';
};

const getActionPlan = (
  priorities: DiagnosisPriority[],
  report: BusinessDiagnosisScoreReport,
  language: NarrativeLanguage,
): DiagnosisActionPlanItem[] => {
  if (!hasAnswers(report)) {
    return [
      {
        label: language === 'es' ? 'Paso 1' : 'Step 1',
        title: language === 'es' ? 'Completar diagnostico' : 'Complete assessment',
        body: language === 'es'
          ? 'Responde las secciones pendientes para que el reporte identifique riesgos reales y prioridades accionables.'
          : 'Answer the pending sections so the report can identify real risks and actionable priorities.',
      },
      {
        label: language === 'es' ? 'Paso 2' : 'Step 2',
        title: language === 'es' ? 'Revisar resultados' : 'Review results',
        body: language === 'es'
          ? 'Vuelve a imprimir el PDF cuando tengas datos suficientes para decidir el primer frente de trabajo.'
          : 'Print the PDF again when enough data is available to decide the first work front.',
      },
      {
        label: language === 'es' ? 'Paso 3' : 'Step 3',
        title: language === 'es' ? 'Asignar responsable' : 'Assign owner',
        body: language === 'es'
          ? 'Convierte la prioridad principal en una tarea con responsable, fecha y seguimiento.'
          : 'Turn the main priority into a task with owner, date, and follow-up.',
      },
    ];
  }

  const first = priorities[0];
  const second = priorities[1] ?? first;
  const third = priorities[2] ?? second;

  return language === 'es'
    ? [
        {
          label: '7 días',
          title: `Control inicial en ${first.pillar.title}`,
          body: first.signal.action,
        },
        {
          label: '30 días',
          title: `Ritmo operativo en ${second.pillar.title}`,
          body: `${second.signal.action} Revisa avance cada semana con evidencia simple.`,
        },
        {
          label: '60 días',
          title: `Sistema repetible en ${third.pillar.title}`,
          body: `${third.signal.action} Conecta este trabajo con el módulo sugerido para que no dependa de memoria o chats.`,
        },
      ]
    : [
        {
          label: '7 days',
          title: `Initial control in ${first.pillar.title}`,
          body: first.signal.action,
        },
        {
          label: '30 days',
          title: `Operating rhythm in ${second.pillar.title}`,
          body: `${second.signal.action} Review progress every week with simple evidence.`,
        },
        {
          label: '60 days',
          title: `Repeatable system in ${third.pillar.title}`,
          body: `${third.signal.action} Connect this work to the suggested module so it does not depend on memory or chats.`,
        },
      ];
};

export const buildBusinessDiagnosisNarrative = (
  report: BusinessDiagnosisScoreReport,
  strongestPillar: DiagnosisPillarScore,
  weakestPillar: DiagnosisPillarScore,
  locale: string,
): BusinessDiagnosisNarrative => {
  const language = getNarrativeLanguage(locale);
  const pillarSignals = report.pillars.reduce<BusinessDiagnosisNarrative['pillarSignals']>((result, pillar) => {
    result[pillar.key] = getPrimarySignal(pillar, language);
    return result;
  }, {} as BusinessDiagnosisNarrative['pillarSignals']);
  const priorities = [...report.pillars]
    .sort((left, right) => {
      if (left.averageScore === right.averageScore) {
        return left.title.localeCompare(right.title);
      }

      return left.averageScore - right.averageScore;
    })
    .slice(0, 3)
    .map((pillar) => ({
      pillar,
      signal: pillarSignals[pillar.key],
    }));

  return {
    executiveRead: getExecutiveRead(report, strongestPillar, weakestPillar, language),
    crossRead: getCrossRead(report, language),
    completenessNote: getCompletenessNote(report, language),
    pillarSignals,
    priorities,
    actionPlan: getActionPlan(priorities, report, language),
    labels: LABELS[language],
  };
};
