import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type KpisLearningTabId = 'kpis' | 'accounting-reports' | 'automated-reports';

const control = createLearningModeControl;

export const kpisLearningLabels: Record<KpisLearningTabId, string> = {
  kpis: 'Matrices · Índice IME',
  'accounting-reports': 'Estados financieros · cierre auditable',
  'automated-reports': 'Informes automatizados',
};

export const kpisLearningControls: Record<KpisLearningTabId, readonly LearningModeControl[]> = {
  kpis: [
    control({
      id: 'executive-refresh', emoji: '🔄', kind: 'Botón de acción', title: 'Actualizar matrices',
      purpose: 'Consulta nuevamente la evidencia que alimenta IME, FODA, BCG y las matrices operativas.',
      behavior: 'Recalcula puntajes, cuadrantes, hallazgos, cobertura y prioridades sin modificar la operación.',
      whenToUse: 'Úsalo después de registrar cambios importantes o antes de una revisión.',
      result: 'Evita interpretar la madurez con una versión anterior de la operación.', focus: 'la vigencia del IME',
      stories: {
        emily: 'Emily actualiza antes de su reunión semanal y revisa lo ocurrido en todas las cafeterías con datos recientes.',
        juanito: 'Juanito confirma cuándo se actualizaron los números; sabe que precisión también significa oportunidad.',
        camila: 'Camila refresca después del cierre y conversa con su equipo sobre resultados ya consolidados.',
      },
    }),
    control({
      id: 'executive-filters', emoji: '📅', kind: 'Filtros ejecutivos', title: 'Periodo, unidad y negocio',
      purpose: 'Define qué parte de la empresa y qué intervalo explican el Índice IME.',
      behavior: 'Recalcula las cuatro dimensiones con un alcance común y comparable.',
      whenToUse: 'Úsalo antes de comparar o atribuir una variación.',
      result: 'Evita mezclar negocios, monedas o periodos que no son equivalentes.', focus: 'el contexto de cada indicador',
      stories: {
        emily: 'Emily compara cafeterías durante el mismo mes y distingue un problema local de una tendencia general.',
        juanito: 'Juanito revisa periodo y unidad antes de interpretar porcentajes; cada número tiene denominador y contexto.',
        camila: 'Camila filtra la refaccionaria y evita que otra actividad esconda el desempeño real del negocio.',
      },
    }),
    control({
      id: 'executive-detail', emoji: '🔍', kind: 'Exploración del IME', title: 'Madurez, FODA y matrices de decisión',
      purpose: 'Pasa del IME empresarial a dimensiones, salud empresarial, portafolio, rentabilidad e inventario.',
      behavior: 'Explica niveles y cuadrantes con evidencia, umbrales, calidad de datos y una acción recomendada.',
      whenToUse: 'Úsalo cuando un KPI cambie o esté fuera de meta.',
      result: 'Evita reaccionar a una cifra sin comprender qué la produjo.', focus: 'la explicación detrás del KPI',
      stories: {
        emily: 'Emily abre la caída de margen y descubre que proviene de una cafetería con desperdicio alto.',
        juanito: 'Juanito recorre del indicador al dato operativo hasta poder explicar el cambio con evidencia.',
        camila: 'Camila descubre que vende más, pero tiene capital detenido en piezas de baja rotación.',
      },
    }),
    control({
      id: 'executive-export', emoji: '📤', kind: 'Botón de acción', title: 'Exportar matriz activa',
      purpose: 'Abre una vista previa de la matriz o análisis que estás revisando.',
      behavior: 'Prepara datos y documento visual con periodo, filtros, identidad y composición original.',
      whenToUse: 'Úsalo después de validar el contexto y comprender las señales.',
      result: 'Comparte una versión consistente sin reconstruir cifras manualmente.', focus: 'el reporte ejecutivo compartido',
      stories: {
        emily: 'Emily comparte el panel validado con sus gerentes y asigna acciones por cafetería.',
        juanito: 'Juanito conserva el reporte para medir si las decisiones cambiaron el siguiente periodo.',
        camila: 'Camila revisa el documento con su familia y todos parten de la misma información.',
      },
    }),
  ],
  'accounting-reports': [
    control({
      id: 'accounting-report-filters', emoji: '📅', kind: 'Filtros de reporte', title: 'Periodo, unidad y negocio',
      purpose: 'Define el alcance común de los cuatro estados, el balance de comprobación y las conciliaciones.',
      behavior: 'Mantiene fechas, moneda funcional y dimensiones organizacionales comparables.',
      whenToUse: 'Úsalo antes de sincronizar, conciliar o comparar periodos.',
      result: 'Evita mezclar operaciones que no comparten el mismo contexto contable.', focus: 'el alcance del cierre',
      stories: {
        emily: 'Emily selecciona la empresa y periodo correctos antes de comparar cafeterías.',
        juanito: 'Juanito confirma moneda y fechas; sabe que dos totales solo se comparan si comparten contexto.',
        camila: 'Camila separa el negocio de refacciones para entender su resultado sin mezclas.',
      },
    }),
    control({
      id: 'accounting-report-search', emoji: '🔄', kind: 'Botón de acción', title: 'Sincronizar operaciones',
      purpose: 'Convierte ventas, gastos, cobros y nómina elegibles en asientos de doble partida.',
      behavior: 'Importa cada evento una sola vez, conserva su origen y bloquea monedas o costos sin evidencia.',
      whenToUse: 'Úsalo antes de revisar el periodo o después de aprobar nuevas operaciones.',
      result: 'Deja una ruta auditable del módulo operativo al mayor contable.', focus: 'la integridad del mayor',
      stories: {
        emily: 'Emily consulta el estado del periodo y lo revisa con el mismo alcance que su contador.',
        juanito: 'Juanito repite la consulta con criterios guardados y obtiene una comparación consistente.',
        camila: 'Camila genera el informe sin pedir que alguien arme una hoja especial.',
      },
    }),
    control({
      id: 'accounting-report-select', emoji: '📑', kind: 'Vistas del cierre', title: 'Estados, balance y calidad',
      purpose: 'Separa presentación financiera, detalle del mayor y controles de conciliación.',
      behavior: 'Cambia la lectura sin perder filtros, comparativo ni periodo de cierre.',
      whenToUse: 'Revisa primero calidad, después el balance y finalmente los cuatro estados.',
      result: 'Evita cerrar un periodo con auxiliares diferentes del mayor o fuentes pendientes.', focus: 'la secuencia de revisión',
      stories: {
        emily: 'Emily usa resultados para desempeño y auxiliares cuando necesita explicar una cuenta específica.',
        juanito: 'Juanito empieza por la pregunta y elige el informe que contiene sus componentes correctos.',
        camila: 'Camila abre el detalle de costos cuando el margen cambia, no solo el total de ventas.',
      },
    }),
    control({
      id: 'accounting-report-export', emoji: '📥', kind: 'Botones de salida', title: 'Exportar, descargar o imprimir',
      purpose: 'Conserva y comparte el informe generado en el formato disponible.',
      behavior: 'Prepara el archivo con filtros y periodo aplicados.',
      whenToUse: 'Úsalo después de revisar que el resultado sea el correcto.',
      result: 'Evita compartir archivos sin contexto o versiones diferentes.', focus: 'la evidencia del informe',
      stories: {
        emily: 'Emily descarga el informe validado para su reunión mensual.',
        juanito: 'Juanito incluye el periodo correcto y archiva una versión que puede reproducir.',
        camila: 'Camila comparte el reporte con su contador sin transcribir números.',
      },
    }),
  ],
  'automated-reports': [
    control({
      id: 'automated-report-create', emoji: '➕', kind: 'Botón de acción', title: 'Nueva automatización',
      purpose: 'Programa un informe con contenido, destinatarios, frecuencia y formato definidos.',
      behavior: 'Abre el formulario y guarda la regla que generará futuras entregas.',
      whenToUse: 'Úsalo para revisiones recurrentes con responsables estables.',
      result: 'Evita depender de recordar y preparar el mismo informe cada periodo.', focus: 'la entrega recurrente de información',
      stories: {
        emily: 'Emily programa un resumen semanal para cada gerente con los indicadores de su cafetería.',
        juanito: 'Juanito define frecuencia y destinatario; el dato llega cuando todavía puede convertirse en acción.',
        camila: 'Camila automatiza el reporte de inventario lento y el equipo lo revisa sin esperar a que ella lo solicite.',
      },
    }),
    control({
      id: 'automated-report-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y filtrar automatizaciones',
      purpose: 'Encuentra reglas por nombre, informe, frecuencia, destinatario o estado.',
      behavior: 'Acota la lista sin cambiar programaciones.',
      whenToUse: 'Úsalo para auditar qué se envía, a quién y con qué frecuencia.',
      result: 'Evita reportes duplicados o entregas a personas equivocadas.', focus: 'la revisión de automatizaciones',
      stories: {
        emily: 'Emily filtra por gerente y confirma que cada persona reciba solo su alcance.',
        juanito: 'Juanito detecta dos reglas duplicadas antes de que generen cifras aparentemente distintas.',
        camila: 'Camila revisa destinatarios cuando cambia un responsable.',
      },
    }),
    control({
      id: 'automated-report-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Editar, ejecutar y activar o pausar',
      purpose: 'Mantiene vigente la programación y permite probarla bajo control.',
      behavior: 'Editar cambia la regla; ejecutar genera una prueba; el estado detiene o reanuda futuras entregas.',
      whenToUse: 'Úsalo cuando cambie la necesidad o antes de confiar en una programación nueva.',
      result: 'Evita automatizar información obsoleta o incorrecta.', focus: 'la vigencia de los reportes automáticos',
      stories: {
        emily: 'Emily ejecuta una prueba antes de enviar el resumen a todos sus gerentes.',
        juanito: 'Juanito pausa una regla mientras corrige el alcance; automatizar un error solo lo repite más rápido.',
        camila: 'Camila actualiza al destinatario y el reporte deja de llegar a un colaborador anterior.',
      },
    }),
    control({
      id: 'automated-report-history', emoji: '🕘', kind: 'Historial y seguimiento', title: 'Revisar ejecuciones y entregas',
      purpose: 'Consulta cuándo se generó un informe y si la entrega fue exitosa.',
      behavior: 'Abre resultados, errores y fechas vinculadas a la programación.',
      whenToUse: 'Úsalo cuando alguien no reciba un reporte o los datos parezcan desactualizados.',
      result: 'Distingue un problema de datos de un problema de entrega.', focus: 'la trazabilidad de la automatización',
      stories: {
        emily: 'Emily revisa el historial y confirma que una cafetería no recibió el archivo por un correo inválido.',
        juanito: 'Juanito compara hora de ejecución y periodo de datos antes de cuestionar el resultado.',
        camila: 'Camila encuentra el error de entrega y lo corrige sin volver a preparar el reporte manualmente.',
      },
    }),
  ],
};
