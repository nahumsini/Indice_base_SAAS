import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type KpisLearningTabId = 'kpis' | 'accounting-reports' | 'automated-reports';

const control = createLearningModeControl;

export const kpisLearningLabels: Record<KpisLearningTabId, string> = {
  kpis: 'Panel ejecutivo',
  'accounting-reports': 'Informes contables',
  'automated-reports': 'Informes automatizados',
};

export const kpisLearningControls: Record<KpisLearningTabId, readonly LearningModeControl[]> = {
  kpis: [
    control({
      id: 'executive-refresh', emoji: '🔄', kind: 'Botón de acción', title: 'Actualizar',
      purpose: 'Consulta nuevamente los datos que alimentan el panel ejecutivo.',
      behavior: 'Recarga indicadores y conserva el contexto de filtros disponible.',
      whenToUse: 'Úsalo después de registrar cambios importantes o antes de una revisión.',
      result: 'Evita decidir con una versión anterior de la operación.', focus: 'la vigencia de los indicadores',
      stories: {
        emily: 'Emily actualiza antes de su reunión semanal y revisa lo ocurrido en todas las cafeterías con datos recientes.',
        juanito: 'Juanito confirma cuándo se actualizaron los números; sabe que precisión también significa oportunidad.',
        camila: 'Camila refresca después del cierre y conversa con su equipo sobre resultados ya consolidados.',
      },
    }),
    control({
      id: 'executive-filters', emoji: '📅', kind: 'Filtros ejecutivos', title: 'Periodo, negocio y comparación',
      purpose: 'Define qué parte de la empresa y qué intervalo explican el panel.',
      behavior: 'Recalcula KPIs, metas, tendencias y alertas con un alcance común.',
      whenToUse: 'Úsalo antes de comparar o atribuir una variación.',
      result: 'Evita mezclar negocios, monedas o periodos que no son equivalentes.', focus: 'el contexto de cada indicador',
      stories: {
        emily: 'Emily compara cafeterías durante el mismo mes y distingue un problema local de una tendencia general.',
        juanito: 'Juanito revisa periodo y unidad antes de interpretar porcentajes; cada número tiene denominador y contexto.',
        camila: 'Camila filtra la refaccionaria y evita que otra actividad esconda el desempeño real del negocio.',
      },
    }),
    control({
      id: 'executive-detail', emoji: '🔍', kind: 'Exploración del indicador', title: 'Abrir detalle y señales',
      purpose: 'Pasa del resultado agregado a la composición, tendencia y causa probable.',
      behavior: 'Selecciona una tarjeta, gráfica o señal y abre el contexto ejecutivo relacionado.',
      whenToUse: 'Úsalo cuando un KPI cambie o esté fuera de meta.',
      result: 'Evita reaccionar a una cifra sin comprender qué la produjo.', focus: 'la explicación detrás del KPI',
      stories: {
        emily: 'Emily abre la caída de margen y descubre que proviene de una cafetería con desperdicio alto.',
        juanito: 'Juanito recorre del indicador al dato operativo hasta poder explicar el cambio con evidencia.',
        camila: 'Camila descubre que vende más, pero tiene capital detenido en piezas de baja rotación.',
      },
    }),
    control({
      id: 'executive-export', emoji: '📤', kind: 'Botón de acción', title: 'Exportar panel',
      purpose: 'Genera un reporte del análisis ejecutivo visible.',
      behavior: 'Prepara el documento con periodo, filtros y datos disponibles.',
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
      id: 'accounting-report-filters', emoji: '📅', kind: 'Filtros de reporte', title: 'Periodo, empresa, unidad y moneda',
      purpose: 'Define el alcance contable antes de generar información.',
      behavior: 'Aplica criterios comunes al catálogo de informes y sus resultados.',
      whenToUse: 'Úsalo antes de consultar estados o comparar periodos.',
      result: 'Evita reportes correctos técnicamente, pero equivocados para la pregunta.', focus: 'el alcance del informe contable',
      stories: {
        emily: 'Emily selecciona la empresa y periodo correctos antes de comparar cafeterías.',
        juanito: 'Juanito confirma moneda y fechas; sabe que dos totales solo se comparan si comparten contexto.',
        camila: 'Camila separa el negocio de refacciones para entender su resultado sin mezclas.',
      },
    }),
    control({
      id: 'accounting-report-search', emoji: '🔎', kind: 'Botón de acción', title: 'Consultar informes',
      purpose: 'Aplica los filtros y genera la lista o contenido contable solicitado.',
      behavior: 'Valida criterios y consulta datos sin modificar operaciones.',
      whenToUse: 'Úsalo después de elegir el informe y completar el alcance.',
      result: 'Concentra la consulta en una fuente reproducible.', focus: 'la consulta contable reproducible',
      stories: {
        emily: 'Emily consulta el estado del periodo y lo revisa con el mismo alcance que su contador.',
        juanito: 'Juanito repite la consulta con criterios guardados y obtiene una comparación consistente.',
        camila: 'Camila genera el informe sin pedir que alguien arme una hoja especial.',
      },
    }),
    control({
      id: 'accounting-report-select', emoji: '📑', kind: 'Selector de informe', title: 'Elegir y abrir un informe',
      purpose: 'Selecciona el reporte adecuado para la decisión: posición, resultados, auxiliares u otros disponibles.',
      behavior: 'Cambia la estructura de lectura manteniendo los filtros del contexto.',
      whenToUse: 'Úsalo según la pregunta que deseas responder, no solo por costumbre.',
      result: 'Evita exigir a un mismo reporte respuestas para las que no fue diseñado.', focus: 'la elección del informe correcto',
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
