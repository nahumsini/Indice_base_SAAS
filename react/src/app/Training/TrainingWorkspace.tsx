import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  GraduationCap,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { IndiceTitleBar, IndiceWorkspaceNavigation } from '../components/frontend-os';
import { apiClient } from '../lib/apiClient';
import { IndiceInduction } from './IndiceInduction';
import { SalesProcess } from './SalesProcess';
import { CertificateCard, TrainingExamPanel, type ExamSummaryResponse } from './TrainingExamPanel';

type TrainingPortal = 'root' | 'distributor';
type TrainingItem = { id: string; title: string; description: string; route?: string };
type TrainingGroup = { title: string; items: TrainingItem[] };
type TrainingAssessment = {
  code: string;
  title: string;
  scenario: string;
  practice: string;
  evidence: string;
  consultantOutcome: string;
  coverage: string[];
  options: Array<{ code: string; label: string }>;
};
type TrainingSession = {
  id: string;
  number: number;
  title: string;
  description: string;
  accent: string;
  icon: typeof LayoutDashboard;
  groups: TrainingGroup[];
  assessment: TrainingAssessment;
};
type TrainingWorkspaceResponse = {
  program_code: string;
  program_version: string;
  completed_item_codes: string[];
  audience_summary?: { active_learners?: number; completed_checks?: number; last_activity_at?: string | null };
};

const item = (id: string, title: string, description: string, route?: string): TrainingItem => ({ id, title, description, route });
const assessment = (
  code: string,
  title: string,
  scenario: string,
  practice: string,
  evidence: string,
  consultantOutcome: string,
  coverage: string[],
  options: Array<[string, string]>,
): TrainingAssessment => ({ code, title, scenario, practice, evidence, consultantOutcome, coverage, options: options.map(([optionCode, label]) => ({ code: optionCode, label })) });

const sessions: TrainingSession[] = [
  {
    id: 'indice', number: 1, title: 'Índice y panel inicial', icon: LayoutDashboard, accent: '#2563EB',
    description: 'Comprende la propuesta de Índice y domina las herramientas generales del espacio de trabajo.',
    assessment: assessment(
      'assessment.indice',
      'Diseñar la base antes de mostrar indicadores',
      'Una empresa nueva pide “un dashboard con todos sus números”, pero todavía no tiene unidades, responsables ni permisos definidos. ¿Qué debe recomendar el consultor?',
      'Configura una empresa de demostración con perfil, estructura, una unidad de negocio y dos usuarios con responsabilidades distintas.',
      'Explicación breve de por qué la estructura y los permisos deben existir antes de interpretar el dashboard.',
      'Puede explicar Índice, preparar la empresa, orientar la navegación y evitar indicadores sin contexto.',
      ['Perfil', 'Estructura empresarial', 'Perfil empresarial', 'Consultoría', 'Usuarios y permisos', 'Dashboard'],
      [
        ['show-dashboard', 'Mostrar inmediatamente todos los indicadores para que el cliente elija cuáles le gustan.'],
        ['configure-foundation', 'Definir primero estructura, responsables y permisos; después configurar indicadores con contexto.'],
        ['import-spreadsheet', 'Importar sus hojas actuales y conservar la misma estructura para acelerar la venta.'],
      ],
    ),
    groups: [
      { title: 'Fundamentos', items: [
        item('indice.propuesta', 'Explicar qué es Índice', 'Comunicar que es una plataforma de gestión acompañada por una red de consultores, no solamente una herramienta.'),
        item('indice.navegacion', 'Navegar por módulos y pestañas', 'Ubicar módulos, pestañas, accesos rápidos y regresar al panel sin perder el contexto.', '/dashboard'),
        item('indice.personalizacion', 'Personalizar la experiencia', 'Usar idioma, tema, perfil y columnas para adaptar la plataforma a cada usuario.'),
      ]},
      { title: 'Dashboard', items: [
        item('indice.dashboard', 'Interpretar el dashboard', 'Reconocer indicadores, alertas, resúmenes y accesos principales.', '/dashboard'),
        item('indice.filtros', 'Usar filtros, periodos y moneda', 'Cambiar el periodo de análisis y comprender cómo afecta a la información mostrada.'),
        item('indice.notificaciones', 'Gestionar notificaciones', 'Consultar avisos, identificar pendientes y dar seguimiento desde el encabezado.'),
      ]},
    ],
  },
  {
    id: 'rh', number: 2, title: 'Recursos Humanos', icon: Users, accent: '#59C3A5',
    description: 'Administra colaboradores, estructura, accesos y las funciones operativas de Recursos Humanos.',
    assessment: assessment(
      'assessment.rh',
      'Diagnosticar falta de control del personal',
      'El dueño afirma que el personal llega tarde, existen empleados fantasma y nadie sabe qué horario corresponde a cada ubicación. ¿Cuál es la implementación correcta?',
      'Da de alta un colaborador completo, asígnale puesto, responsable, centro de trabajo y horario; después revisa cómo aparecería en Control.',
      'Captura o nota donde se distinga expediente laboral, acceso al sistema, horario y evidencia de asistencia.',
      'Puede separar expediente, acceso, horario, asistencia, incidencias y nómina sin prometer controles que no fueron configurados.',
      ['Colaboradores', 'Asistencia', 'Control', 'Nómina', 'Comunicados', 'Activos', 'Expedientes', 'Permisos', 'Incentivos', 'KPIs'],
      [
        ['start-payroll', 'Comenzar por nómina para detectar automáticamente quién no trabaja.'],
        ['configure-people-control', 'Ordenar colaboradores, puestos, ubicaciones y horarios; después activar registros y revisar incidencias.'],
        ['share-admin-user', 'Compartir un usuario administrador para que todos registren sus propios datos.'],
      ],
    ),
    groups: [
      { title: 'Colaboradores', items: [
        item('rh.colaboradores', 'Consultar colaboradores', 'Buscar, filtrar y comprender la información principal de la lista.', '/human-resources/collaborators'),
        item('rh.agregar', 'Agregar un colaborador', 'Registrar correctamente datos personales, laborales, puesto, área y responsable.', '/human-resources/collaborators'),
        item('rh.editar', 'Editar un colaborador', 'Actualizar información y mantener un expediente laboral confiable.', '/human-resources/collaborators'),
        item('rh.columnas', 'Personalizar columnas', 'Usar el botón Columnas para mostrar la información relevante para cada operación.', '/human-resources/collaborators'),
      ]},
      { title: 'Operación y control', items: [
        item('rh.accesos', 'Asignar roles y accesos', 'Distinguir el expediente laboral de los permisos para entrar a la plataforma.'),
        item('rh.asistencia', 'Consultar asistencia y horarios', 'Entender ubicaciones, horarios, incidencias y registros de asistencia.'),
        item('rh.documentos', 'Gestionar documentos', 'Consultar y mantener documentos relacionados con cada colaborador.'),
        item('rh.nomina', 'Reconocer el flujo de nómina', 'Ubicar incidencias y elementos que alimentan el cálculo cuando el módulo está habilitado.'),
      ]},
    ],
  },
  {
    id: 'procesos', number: 3, title: 'Procesos y tareas', icon: Workflow, accent: '#F4C84A',
    description: 'Convierte actividades repetibles en procesos claros y da seguimiento al trabajo del equipo.',
    assessment: assessment(
      'assessment.procesos',
      'Elegir entre tarea, proyecto y proceso',
      'Cada semana se repite la apertura de una sucursal y el dueño debe recordar por mensajes quién limpia, revisa caja y confirma inventario. ¿Qué debe modelarse?',
      'Crea un proceso de apertura con etapas, responsables, fechas, evidencia y una tarea de seguimiento; compáralo con un proyecto de duración limitada.',
      'Mapa del proceso y criterio utilizado para distinguir actividad individual, proyecto y proceso repetible.',
      'Puede convertir trabajo informal en ejecución medible y elegir correctamente agenda, proyecto, proceso, kiosco o KPI.',
      ['Agenda y tareas', 'Proyectos', 'Procesos', 'Evidencias', 'Seguimiento', 'Kiosco de tareas', 'KPIs'],
      [
        ['weekly-project', 'Crear un proyecto nuevo cada semana y dejar que el equipo decida el orden.'],
        ['repeatable-process', 'Crear un proceso repetible con etapas, responsables, criterios y evidencia; generar tareas para cada ejecución.'],
        ['single-reminder', 'Crear un recordatorio personal para el dueño y conservar las instrucciones en mensajes.'],
      ],
    ),
    groups: [
      { title: 'Procesos', items: [
        item('procesos.diferencia', 'Distinguir procesos y tareas', 'Comprender cuándo modelar un flujo y cuándo registrar una actividad individual.'),
        item('procesos.crear', 'Crear un proceso', 'Definir objetivo, etapas, responsables, fechas y criterios de avance.', '/processes-tasks/processes'),
        item('procesos.seguimiento', 'Supervisar la ejecución', 'Revisar estados, retrasos, responsables y evidencia del proceso.', '/processes-tasks/processes'),
      ]},
      { title: 'Tareas', items: [
        item('tareas.crear', 'Crear y asignar una tarea', 'Definir responsable, prioridad, fecha límite e instrucciones.', '/processes-tasks/calendar'),
        item('tareas.evidencia', 'Registrar evidencia y comentarios', 'Documentar avances para que el seguimiento no dependa de conversaciones externas.'),
        item('tareas.vistas', 'Usar las vistas de trabajo', 'Cambiar entre tabla, tablero o calendario según el tipo de seguimiento.'),
      ]},
    ],
  },
  {
    id: 'finanzas', number: 4, title: 'Finanzas', icon: CircleDollarSign, accent: '#FF6B63',
    description: 'Reconoce los flujos financieros disponibles y cómo aportan control a la operación.',
    assessment: assessment(
      'assessment.finanzas',
      'Reconstruir el control del efectivo',
      'El propietario siente que desaparece dinero de caja chica. Hay tickets sueltos, reposiciones sin referencia y varios responsables usando el mismo fondo. ¿Qué recorrido debe implementar?',
      'Crea un fondo con responsable y límites, registra un ingreso y un comprobante, revisa su conciliación y consulta el estado de cuenta.',
      'Evidencia del fondo, movimiento, comprobante y estado; debe poder explicarse cómo se reconstruye el saldo.',
      'Puede diferenciar gasto, cuenta por pagar, presupuesto, cuenta contable, cuenta de pago y caja chica, y recomendar el flujo adecuado.',
      ['Gastos', 'Cuentas por pagar', 'Presupuestos', 'Proveedores', 'Cuentas contables', 'Cuentas de pago', 'Caja Chica', 'Conciliación', 'Estados y KPIs'],
      [
        ['adjust-balance', 'Ajustar el saldo final cada semana para que coincida con el efectivo contado.'],
        ['controlled-fund', 'Separar fondos y responsables, registrar cada entrada y salida con evidencia y conciliar antes de reponer.'],
        ['expense-only', 'Registrar únicamente el total mensual como un gasto para reducir trabajo administrativo.'],
      ],
    ),
    groups: [
      { title: 'Control operativo', items: [
        item('finanzas.caja', 'Operar Caja Chica', 'Registrar fondos, movimientos, comprobantes y responsables con trazabilidad.', '/petty-cash/cash'),
        item('finanzas.gastos', 'Registrar y revisar gastos', 'Clasificar gastos y mantener evidencia para su aprobación.', '/expenses/expenses'),
        item('finanzas.proveedores', 'Gestionar proveedores', 'Mantener datos, condiciones y documentos de proveedores.'),
        item('finanzas.compras', 'Comprender el flujo de compras', 'Relacionar solicitudes, órdenes, recepción y pago.'),
      ]},
      { title: 'Planeación', items: [
        item('finanzas.cuentas', 'Distinguir cuentas por cobrar y pagar', 'Ubicar compromisos, vencimientos y seguimiento de saldos.'),
        item('finanzas.presupuestos', 'Consultar presupuestos', 'Comparar planeación contra ejecución e identificar desviaciones.'),
        item('finanzas.impuestos', 'Reconocer moneda e impuestos', 'Comprender su efecto en registros, reportes y totales.'),
      ]},
    ],
  },
  {
    id: 'ventas', number: 5, title: 'Ventas', icon: ShoppingCart, accent: '#2563EB',
    description: 'Da seguimiento al ciclo comercial desde el contacto hasta la venta y la atención posterior.',
    assessment: assessment(
      'assessment.ventas',
      'Recuperar oportunidades sin seguimiento',
      'La empresa recibe prospectos por redes y recomendaciones, pero no sabe quién los atiende ni por qué se pierden. ¿Cuál es la configuración mínima útil?',
      'Registra contacto y oportunidad con origen, etapa, valor, responsable y siguiente acción; crea una cotización y explica el paso hacia venta y contrato.',
      'Recorrido completo desde contacto hasta siguiente acción, incluyendo el criterio para no confundir cotización con venta.',
      'Puede diseñar un proceso comercial trazable, explicar sus estados y conectar cotización, venta, contrato, pago, comisión y KPI.',
      ['Contactos', 'Prospectos', 'Pipeline', 'Cotizaciones', 'Ventas', 'Contratos', 'Comisiones', 'Cuentas de pago', 'KPIs'],
      [
        ['contact-list', 'Crear una lista de contactos y revisar al final del mes quién respondió.'],
        ['commercial-flow', 'Definir origen, responsable, etapa y próxima acción; conectar la oportunidad con cotización, venta y seguimiento.'],
        ['quote-everyone', 'Enviar la misma cotización a todos y registrar únicamente a quienes compren.'],
      ],
    ),
    groups: [
      { title: 'Ciclo comercial', items: [
        item('ventas.clientes', 'Gestionar clientes y contactos', 'Registrar información útil y mantener una relación ordenada.', '/sales/contacts'),
        item('ventas.oportunidades', 'Gestionar oportunidades', 'Registrar origen, etapa, valor, responsable y siguiente acción.', '/sales/leads'),
        item('ventas.cotizaciones', 'Preparar cotizaciones', 'Crear propuestas claras con partidas, vigencia, condiciones e información del cliente.', '/sales/quotes'),
        item('ventas.cierre', 'Registrar la venta', 'Formalizar el resultado comercial y dar continuidad a la operación.', '/sales'),
      ]},
      { title: 'Seguimiento', items: [
        item('ventas.pipeline', 'Interpretar el pipeline', 'Identificar oportunidades estancadas, próximas acciones y probabilidad de cierre.'),
        item('ventas.inventario', 'Relacionar ventas e inventario', 'Comprender cómo una venta afecta existencias y entrega cuando aplica.'),
        item('ventas.posventa', 'Planear la atención posventa', 'Establecer responsables y próximos contactos después del cierre.'),
      ]},
    ],
  },
  {
    id: 'kpis', number: 6, title: 'KPIs y estados financieros', icon: BarChart3, accent: '#8B5CF6',
    description: 'Interpreta indicadores y reportes para convertir información en decisiones de negocio.',
    assessment: assessment(
      'assessment.kpis',
      'Pasar de una variación a una decisión',
      'El margen cayó cinco puntos respecto al mes anterior. El dueño quiere despedir al responsable de ventas. ¿Qué debe hacer primero el consultor?',
      'Selecciona periodo, empresa, unidad y moneda; abre el detalle de un indicador y formula una acción con responsable y fecha.',
      'Nota de análisis que incluya contexto, comparación, causa probable, evidencia y acción recomendada.',
      'Puede validar el contexto de un indicador, profundizar hasta la causa y convertir el hallazgo en una acción medible.',
      ['Panel ejecutivo', 'Filtros y comparativos', 'Detalle de indicadores', 'Informes contables', 'Estados financieros', 'Informes automatizados'],
      [
        ['act-on-total', 'Tomar la decisión con el porcentaje general porque el dashboard ya resume toda la información.'],
        ['validate-and-drill', 'Validar periodo, unidad y moneda; abrir el detalle, identificar la causa y acordar una acción verificable.'],
        ['export-first', 'Exportar el dashboard y pedir al cliente que encuentre la causa con su contador.'],
      ],
    ),
    groups: [
      { title: 'Análisis', items: [
        item('kpis.operativos', 'Distinguir KPIs operativos y financieros', 'Relacionar cada indicador con una pregunta y una decisión concreta.', '/kpis'),
        item('kpis.filtros', 'Analizar periodos y tendencias', 'Comparar periodos y evitar conclusiones basadas en un dato aislado.', '/kpis'),
        item('kpis.detalle', 'Profundizar desde un indicador', 'Usar el detalle para encontrar la causa detrás de una variación.'),
      ]},
      { title: 'Estados financieros', items: [
        item('estados.resultados', 'Interpretar el estado de resultados', 'Reconocer ingresos, costos, gastos y utilidad.'),
        item('estados.balance', 'Interpretar el balance general', 'Comprender activos, pasivos y patrimonio.'),
        item('estados.flujo', 'Interpretar el flujo de efectivo', 'Distinguir utilidad contable de disponibilidad de efectivo.'),
        item('estados.decision', 'Convertir hallazgos en acciones', 'Definir una acción, responsable y fecha a partir del análisis.'),
      ]},
    ],
  },
  {
    id: 'comercial', number: 7, title: 'Proceso comercial y acompañamiento', icon: BriefcaseBusiness, accent: '#177D66',
    description: 'Vende Índice con escucha, empatía y una relación de valor pensada para durar al menos 60 meses.',
    assessment: assessment(
      'assessment.comercial',
      'Conducir una consultoría orientada a valor',
      'Durante los primeros minutos el prospecto pregunta cuánto cuesta y solicita un descuento. Todavía no ha explicado cómo opera su empresa. ¿Cómo debe responder el consultor?',
      'Prepara y ensaya una consultoría de 60 a 90 minutos: apertura, mapa de personas/procesos/productos/finanzas, dolor prioritario, demostración y siguiente paso.',
      'Guion o minuta con diagnóstico, módulo recomendado, valor esperado, objeción y acuerdo de seguimiento.',
      'Puede prospectar, diagnosticar, demostrar, negociar sin devaluar, implementar por sesiones y acompañar mensualmente con ética.',
      ['Prospección', 'Primer contacto', 'Mapa de empresa', 'Diagnóstico', 'Demo personalizada', 'Cierre', 'Implementación', 'Seguimiento y ética'],
      [
        ['discount-now', 'Dar un descuento inicial para conservar la atención y explicar los módulos después.'],
        ['diagnose-value', 'Reconocer la pregunta, explicar que el alcance depende del diagnóstico y continuar entendiendo la operación antes de cotizar.'],
        ['send-price-list', 'Enviar la lista completa de precios y pedirle que seleccione los módulos que necesita.'],
      ],
    ),
    groups: [
      { title: 'Prospección y primer contacto', items: [
        item('comercial.origen', 'Identificar el origen del prospecto', 'Distinguir prospección propia de un prospecto asignado por corporativo y registrar su procedencia.'),
        item('comercial.investigar', 'Preparar el primer acercamiento', 'Investigar giro, tamaño, contacto y posibles necesidades sin asumir el diagnóstico.'),
        item('comercial.contacto', 'Realizar el primer contacto', 'Llamar, escribir o visitar con el objetivo de crear valor, cercanía y conseguir la consultoría.'),
        item('comercial.mensaje', 'Comunicar el alma de Índice', 'Explicar que ofrecemos tecnología y una red humana de acompañamiento; el cliente no está solo.'),
      ]},
      { title: 'Consultoría de 60 a 90 minutos', items: [
        item('consultoria.preparacion', 'Preparar la sesión', 'Confirmar participantes, investigar la empresa, preparar preguntas abiertas y verificar la demostración.'),
        item('consultoria.presentacion', 'Presentar al equipo y romper el hielo', 'Dedicar alrededor de 10 minutos a generar confianza y explicar el propósito de la conversación.'),
        item('consultoria.escucha', 'Escuchar durante aproximadamente 20 minutos', 'Dejar que el cliente explique su empresa, frustraciones y temores sin convertir la sesión en un interrogatorio.'),
        item('consultoria.dolor', 'Identificar el dolor prioritario', 'Comprender impacto, urgencia y causa; confirmar con el cliente lo que se entendió.'),
        item('consultoria.demo', 'Hacer una demostración personalizada', 'Mostrar brevemente el dashboard y después el módulo que mejor atiende el dolor detectado.'),
      ]},
      { title: 'Alcance, negociación y cierre', items: [
        item('cierre.alcance', 'Determinar el alcance real', 'Definir módulos, usuarios, sucursales, migración, capacitación y costo de implementación.'),
        item('cierre.temperatura', 'Evaluar la temperatura de la venta', 'Cerrar en la sesión cuando existan necesidad, autoridad, presupuesto e intención.'),
        item('cierre.valor', 'Negociar agregando valor', 'Ofrecer usuarios, módulos temporales o acompañamiento antes de reducir el precio.'),
        item('cierre.acuerdos', 'Registrar acuerdos y siguiente paso', 'Dejar responsables, fechas, condiciones y objeciones claramente documentados.'),
      ]},
      { title: 'Relación de largo plazo', items: [
        item('acompanamiento.implementacion', 'Entregar a implementación', 'Iniciar con responsables, plan, fechas, configuración y capacitación claras.'),
        item('acompanamiento.adopcion', 'Dar seguimiento a la adopción', 'Verificar que el cliente use Índice y reciba ayuda cuando aparezcan obstáculos.'),
        item('acompanamiento.60meses', 'Construir una relación de 60 meses', 'Ver al cliente como una relación recurrente, humana y útil, no como la comisión de la primera factura.'),
      ]},
    ],
  },
];

export function TrainingWorkspace({ portal, locale = 'es' }: { portal: TrainingPortal; locale?: string }) {
  const navigate = useNavigate();
  const english = locale.startsWith('en');
  const basePath = portal === 'root' ? '/api/v1/platform-admin/training' : '/api/v1/distributor-portal/training';
  const [workspace, setWorkspace] = useState<TrainingWorkspaceResponse | null>(null);
  const [examSummary, setExamSummary] = useState<ExamSummaryResponse | null>(null);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [savingItem, setSavingItem] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'home' | 'induction' | 'program' | 'sales'>('home');

  const load = async () => {
    setError('');
    try {
      const [nextWorkspace, nextExams] = await Promise.all([
        apiClient<TrainingWorkspaceResponse>(basePath),
        apiClient<ExamSummaryResponse>(`${basePath}/exams`),
      ]);
      setWorkspace(nextWorkspace);
      setExamSummary(nextExams);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cargar la capacitación.'); }
  };
  const loadExamSummary = async () => setExamSummary(await apiClient<ExamSummaryResponse>(`${basePath}/exams`));
  useEffect(() => { void load(); }, [basePath]);

  const completed = useMemo(() => new Set(workspace?.completed_item_codes ?? []), [workspace?.completed_item_codes]);
  const allItems = useMemo(() => sessions.flatMap((session) => session.groups.flatMap((group) => group.items)), []);
  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0];
  const activeItems = activeSession.groups.flatMap((group) => group.items);
  const completedTasks = allItems.filter((trainingItem) => completed.has(trainingItem.id)).length;
  const completedAssessments = examSummary?.modules.filter((exam) => exam.passed).length ?? 0;
  const finalExamPassed = Boolean(examSummary?.final_exam.passed);
  const totalCompleted = completedTasks + completedAssessments + (finalExamPassed ? 1 : 0);
  const totalRequirements = allItems.length + sessions.length + 1;
  const sessionCompleted = activeItems.filter((trainingItem) => completed.has(trainingItem.id)).length;
  const activeExam = examSummary?.modules.find((exam) => exam.code === activeSession.id);
  const assessmentPassed = Boolean(activeExam?.passed);
  const percentage = Math.round((totalCompleted / totalRequirements) * 100);
  const nextItem = allItems.find((trainingItem) => !completed.has(trainingItem.id));
  const nextSession = sessions.find((session) => session.groups.some((group) => group.items.some((trainingItem) => trainingItem.id === nextItem?.id)))
    ?? sessions.find((session) => !examSummary?.modules.find((exam) => exam.code === session.id)?.passed)
    ?? sessions[0];

  const continueProgram = () => {
    setActiveSessionId(nextSession.id);
    setView('program');
  };

  const toggle = async (trainingItem: TrainingItem) => {
    const nextCompleted = !completed.has(trainingItem.id);
    setSavingItem(trainingItem.id);
    setError('');
    setWorkspace((current) => current ? {
      ...current,
      completed_item_codes: nextCompleted
        ? [...current.completed_item_codes, trainingItem.id]
        : current.completed_item_codes.filter((code) => code !== trainingItem.id),
    } : current);
    try {
      setWorkspace(await apiClient<TrainingWorkspaceResponse>(`${basePath}/progress`, {
        method: 'PATCH', body: JSON.stringify({ itemCode: trainingItem.id, completed: nextCompleted }),
      }));
      await loadExamSummary();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el avance.');
      await load();
    } finally { setSavingItem(''); }
  };

  return (
    <div className="space-y-5" data-workspace="training">
      <IndiceTitleBar
        tone="aqua"
        icon={<GraduationCap className="h-5 w-5" />}
        eyebrow={`Academia Índice · versión ${workspace?.program_version ?? '2026.1'}`}
        title={portal === 'root' ? 'Capacitación y contenido' : 'Academia Índice'}
        subtitle={portal === 'root' ? 'Supervisa el programa y consulta el mismo recorrido formativo disponible para distribuidores.' : 'Conoce la plataforma, practica sus procesos y aprende a acompañar a cada cliente.'}
        actions={portal === 'distributor' ? <button type="button" onClick={continueProgram} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553]"><BookOpenCheck className="h-4 w-4" />{totalCompleted ? 'Continuar formación' : 'Comenzar formación'}</button> : undefined}
      />

      <IndiceWorkspaceNavigation<'home' | 'induction' | 'program' | 'sales'>
        ariaLabel="Contenido de capacitación"
        tone="aqua"
        value={view}
        onValueChange={setView}
        items={[
          { id: 'home', label: 'Inicio', icon: <LayoutDashboard /> },
          { id: 'induction', label: 'Conoce Índice', description: 'Inducción a Índice', icon: <Globe2 /> },
          { id: 'program', label: 'Ruta de certificación', icon: <BookOpenCheck /> },
          { id: 'sales', label: 'Proceso de venta', description: 'Método comercial para distribuidores', icon: <BriefcaseBusiness /> },
        ]}
        className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      />

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {view === 'home' ? <AcademyHome
        portal={portal}
        percentage={percentage}
        completed={totalCompleted}
        total={totalRequirements}
        nextSession={nextSession}
        nextItem={nextItem}
        workspace={workspace}
        onContinue={continueProgram}
        onInduction={() => setView('induction')}
      /> : null}

      {view === 'induction' ? <IndiceInduction /> : null}

      {view === 'sales' ? <SalesProcess basePath={basePath} /> : null}

      {view === 'program' ? <>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 xl:sticky xl:top-36">
          <p className="px-3 pb-2 pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">7 etapas de certificación</p>
          <div className="space-y-1.5">{sessions.map((session) => {
            const sessionItems = session.groups.flatMap((group) => group.items);
            const stageValidated = Boolean(examSummary?.modules.find((exam) => exam.code === session.id)?.passed);
            const done = sessionItems.filter((trainingItem) => completed.has(trainingItem.id)).length + (stageValidated ? 1 : 0);
            const active = session.id === activeSession.id;
            const Icon = session.icon;
            return <button key={session.id} type="button" onClick={() => setActiveSessionId(session.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${active ? 'bg-[#177D66] text-white shadow-sm' : 'text-slate-700 hover:bg-[#59C3A5]/5 dark:text-slate-300 dark:hover:bg-slate-800'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: active ? 'rgba(255,255,255,.16)' : `${session.accent}18`, color: active ? 'white' : session.accent }}>{stageValidated ? <ShieldCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{session.number}. {session.title}</span><span className={`mt-0.5 block text-xs ${active ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>{stageValidated ? 'Competencia validada' : `${done} de ${sessionItems.length + 1} requisitos`}</span></span><ChevronRight className="h-4 w-4 shrink-0 opacity-60" /></button>;
          })}</div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-5 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">Etapa {activeSession.number}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{activeSession.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{activeSession.description}</p></div><div className="shrink-0 rounded-xl border border-[#59C3A5]/20 bg-white/80 px-4 py-3 text-right dark:bg-slate-900"><p className="text-xs text-slate-500 dark:text-slate-400">Avance de la etapa</p><p className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{sessionCompleted + (assessmentPassed ? 1 : 0)} / {activeItems.length + 1}</p><p className={`mt-1 text-xs ${assessmentPassed ? 'text-[#177D66] dark:text-[#8FE0CA]' : 'text-slate-500 dark:text-slate-400'}`}>{assessmentPassed ? 'Competencia validada' : 'Validación pendiente'}</p></div></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">Estándar de dominio consultivo</p><h4 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">Lo que debes poder hacer frente a un cliente</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{activeSession.assessment.consultantOutcome}</p></div></div>
            <div className="mt-4 flex flex-wrap gap-2">{activeSession.assessment.coverage.map((capability) => <span key={capability} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{capability}</span>)}</div>
          </div>

          {activeSession.id === 'comercial' ? <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><Sparkles className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>El alma de Índice:</strong> no vendemos únicamente una herramienta. Construimos cercanía, confianza y relaciones de largo plazo con una red de distribuidores y consultores disponible para ayudar al cliente.</p></div> : null}

          {activeSession.groups.map((group) => <div key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h4 className="font-medium text-slate-950 dark:text-white">{group.title}</h4></div><div className="divide-y divide-slate-100 dark:divide-slate-800">{group.items.map((trainingItem) => {
            const checked = completed.has(trainingItem.id);
            const saving = savingItem === trainingItem.id;
            return <div key={trainingItem.id} className={`flex gap-4 p-5 transition ${checked ? 'bg-emerald-50/40 dark:bg-emerald-950/15' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/60'}`}><button type="button" aria-label={`${checked ? 'Marcar pendiente' : 'Marcar aprendido'}: ${trainingItem.title}`} aria-pressed={checked} disabled={saving || !workspace} onClick={() => void toggle(trainingItem)} className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border outline-none transition focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${checked ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent hover:border-[#59C3A5] dark:border-slate-600 dark:bg-slate-800'} disabled:opacity-50`}>{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-current" /> : <Check className="h-4 w-4" />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className={`text-sm font-medium ${checked ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-900 dark:text-white'}`}>{trainingItem.title}</p><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{trainingItem.description}</p></div>{trainingItem.route ? <button type="button" onClick={() => navigate(trainingItem.route!)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"><ExternalLink className="h-3.5 w-3.5" />Abrir en Índice</button> : null}</div></div></div>;
          })}</div></div>)}

          {activeExam ? <TrainingExamPanel basePath={basePath} exam={activeExam} title={`Evaluación: ${activeSession.title}`} onChanged={loadExamSummary} /> : <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Preparando la evaluación de esta etapa…</div>}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-blue-600" /><p className="text-sm text-slate-600 dark:text-slate-300">Las prácticas preparan la etapa; solo la validación final acredita la competencia consultiva.</p></div><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><RefreshCw className="h-4 w-4" />Actualizar avance</button></div>
        </section>
      </div>
      {examSummary ? <div className="mt-5 space-y-4">
        <TrainingExamPanel basePath={basePath} exam={examSummary.final_exam} title="Examen final de certificación consultiva" finalExam onChanged={loadExamSummary} />
        {examSummary.certificate ? <CertificateCard certificate={examSummary.certificate} /> : null}
      </div> : null}
      </> : null}
    </div>
  );
}

function AcademyHome({
  portal,
  percentage,
  completed,
  total,
  nextSession,
  nextItem,
  workspace,
  onContinue,
  onInduction,
}: {
  portal: TrainingPortal;
  percentage: number;
  completed: number;
  total: number;
  nextSession: TrainingSession;
  nextItem?: TrainingItem;
  workspace: TrainingWorkspaceResponse | null;
  onContinue: () => void;
  onInduction: () => void;
}) {
  const NextIcon = nextSession.icon;
  return <div className="space-y-5" data-training-view="home">
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
      <article className="rounded-xl border border-[#59C3A5]/20 bg-[#59C3A5]/5 p-6 dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#59C3A5]/20 bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><NextIcon className="h-6 w-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">Tu siguiente paso</p>
            <h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{nextItem ? nextSession.title : 'Programa completado'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{nextItem?.title ?? 'Ya completaste todas las actividades del programa práctico.'}</p>
            {nextItem ? <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{nextItem.description}</p> : null}
            <button type="button" onClick={onContinue} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553]"><BookOpenCheck className="h-4 w-4" />{completed ? 'Continuar donde me quedé' : 'Comenzar el programa'}</button>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-end justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dominio práctico</p><p className="mt-1 text-4xl font-medium text-slate-950 dark:text-white">{percentage}%</p></div><p className="text-sm font-medium text-slate-600 dark:text-slate-300">{completed} de {total}</p></div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-[#59C3A5] transition-all" style={{ width: `${percentage}%` }} /></div>
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Este porcentaje corresponde a funciones que conoces y puedes ejecutar, no solamente a contenido leído.</p>
      </article>
    </section>

    {portal === 'root' && workspace?.audience_summary ? <section className="grid gap-3 sm:grid-cols-3">
      <Summary label="Participantes activos" value={String(workspace.audience_summary.active_learners ?? 0)} />
      <Summary label="Temas completados" value={String(workspace.audience_summary.completed_checks ?? 0)} />
      <Summary label="Programa publicado" value={`v${workspace.program_version}`} />
    </section> : null}

    <section>
      <div className="max-w-3xl"><p className="text-xs font-medium text-[#257B68] dark:text-[#8FE0CA]">Ruta recomendada</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">Aprender, demostrar y acompañar</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">La formación conecta conocimiento del producto con diagnóstico, práctica y relaciones de largo plazo.</p></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <LearningStage color="#2563EB" number="1" title="Conoce Índice" description="Comprende la propuesta, los cuatro pilares y el valor del acompañamiento." action="Abrir inducción" onClick={onInduction} />
        <LearningStage color="#59C3A5" number="2" title="Domina los módulos" description="Relaciona cada función con un problema empresarial concreto." />
        <LearningStage color="#F4C84A" number="3" title="Practica la consultoría" description="Escucha, diagnostica y demuestra solamente lo que genera valor." />
        <LearningStage color="#FF6B5E" number="4" title="Vende y acompaña" description="Construye confianza y una relación útil durante al menos 60 meses." action="Ir al programa" onClick={onContinue} />
      </div>
    </section>

    <section className="flex flex-col gap-4 rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 sm:flex-row sm:items-center dark:border-[#59C3A5]/30 dark:bg-[#59C3A5]/10">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#257B68] dark:bg-slate-900 dark:text-[#8FE0CA]"><Sparkles className="h-5 w-5" /></span>
      <div><h3 className="font-medium text-slate-950 dark:text-white">El alma de Índice</h3><p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">No vendemos únicamente software. Combinamos una plataforma sencilla con cercanía, consultoría y acompañamiento para que el cliente tenga control real de su empresa.</p></div>
    </section>
  </div>;
}

function LearningStage({ color, number, title, description, action, onClick }: { color: string; number: string; title: string; description: string; action?: string; onClick?: () => void }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-medium" style={{ backgroundColor: `${color}18`, color }}>{number}</span><h4 className="mt-4 font-medium text-slate-950 dark:text-white">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>{action && onClick ? <button type="button" onClick={onClick} className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium" style={{ color }}>{action}<ChevronRight className="h-4 w-4" /></button> : null}</article>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-medium text-slate-950 dark:text-white">{value}</p></div>;
}
