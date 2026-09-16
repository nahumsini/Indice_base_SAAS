import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';
import type { ReceivablesTabId } from '../constants/receivables.constants';

const control = createLearningModeControl;

export const receivablesLearningLabels: Record<ReceivablesTabId, string> = {
  kpis: 'Indicadores de cartera',
  'credit-sales': 'Ventas a crédito',
  'accounts-receivable': 'Cuentas por cobrar',
  payments: 'Pagos recibidos',
  'credit-customers': 'Clientes de crédito',
};

export const receivablesLearningControls: Record<ReceivablesTabId, readonly LearningModeControl[]> = {
  kpis: [],
  'credit-sales': [
    control({
      id: 'credit-sale-create', emoji: '➕', kind: 'Botón de acción', title: 'Nueva venta a crédito',
      purpose: 'Convierte una venta elegible en un plan de pago con monto, plazo, tasa y vencimientos.',
      behavior: 'Abre el simulador, valida la política del cliente y crea la cuenta por cobrar al confirmar.',
      whenToUse: 'Úsalo después de acordar condiciones y comprobar que el cliente tiene crédito disponible.',
      result: 'Evita promesas de pago que no tienen calendario, límite ni responsable.', focus: 'las condiciones de cada crédito',
      stories: {
        emily: 'Emily financia un servicio corporativo con fechas claras. La cafetería entrega y Finanzas sabe cuándo cobrar.',
        juanito: 'Juanito calcula plazo y pago antes de autorizar; sus ventas no crecen a costa de una cartera que nadie puede recuperar.',
        camila: 'Camila formaliza el crédito de un taller conocido. La confianza sigue, pero ahora ambas partes conocen montos y fechas.',
      },
    }),
    control({
      id: 'credit-sale-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Selecciona los datos visibles de ventas financiadas.',
      behavior: 'Muestra, oculta y ordena cliente, monto, plazo, tasa, responsable y estado.',
      whenToUse: 'Úsalo antes de revisar exposición, vencimientos o responsables.',
      result: 'Hace visibles los factores que explican el riesgo del crédito.', focus: 'la lectura de ventas a crédito',
      stories: {
        emily: 'Emily muestra cliente, sucursal, plazo y saldo para comparar operaciones equivalentes.',
        juanito: 'Juanito coloca financiado, pagado y pendiente juntos; detecta rápidamente qué venta se desvió.',
        camila: 'Camila deja visibles cliente, vendedor y próxima fecha para que el seguimiento no dependa solo de ella.',
      },
    }),
    control({
      id: 'credit-sale-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y segmentar créditos',
      purpose: 'Acota ventas por cliente, periodo, estado, unidad o responsable.',
      behavior: 'Actualiza tabla e indicadores con el segmento seleccionado.',
      whenToUse: 'Úsalo para revisar vencimientos, concentración o desempeño de una parte de la cartera.',
      result: 'Distingue un caso aislado de un patrón de crédito.', focus: 'la revisión enfocada del crédito',
      stories: {
        emily: 'Emily filtra créditos de una cafetería y descubre dónde se están prometiendo plazos demasiado largos.',
        juanito: 'Juanito filtra el periodo y compara ventas otorgadas contra efectivo recuperado.',
        camila: 'Camila busca talleres con saldo abierto antes de autorizar un nuevo pedido.',
      },
    }),
    control({
      id: 'credit-sale-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Consultar expediente y documentos',
      purpose: 'Revisa simulación, calendario, archivos y estado de cada venta a crédito.',
      behavior: 'Abre el detalle sin reconstruir la operación desde mensajes o papeles.',
      whenToUse: 'Úsalo antes de cobrar, renegociar o explicar una condición.',
      result: 'Conserva una versión compartida del acuerdo de crédito.', focus: 'el expediente de la venta financiada',
      stories: {
        emily: 'Emily consulta el calendario antes de hablar con el cliente corporativo y mantiene una experiencia profesional.',
        juanito: 'Juanito verifica la simulación original antes de interpretar una diferencia.',
        camila: 'Camila abre el acuerdo cuando un cliente recuerda otra fecha y resuelve con evidencia, no con discusión.',
      },
    }),
  ],
  'accounts-receivable': [
    control({
      id: 'receivable-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Define los datos visibles de saldos y parcialidades pendientes.',
      behavior: 'Organiza cliente, vencimiento, importe, pagado, saldo, unidad y estado.',
      whenToUse: 'Úsalo para preparar una revisión de cobranza.',
      result: 'Muestra qué cobrar, cuánto y cuándo sin abrir cada expediente.', focus: 'la lectura de saldos pendientes',
      stories: {
        emily: 'Emily deja visibles sucursal, cliente, vencimiento y saldo para asignar seguimientos claros.',
        juanito: 'Juanito ordena importe, pagado y pendiente; cada total conserva su explicación.',
        camila: 'Camila muestra cliente y fecha para que el vendedor responsable pueda continuar la cobranza.',
      },
    }),
    control({
      id: 'receivable-filters', emoji: '🔎', kind: 'Filtros', title: 'Filtrar por vencimiento y estado',
      purpose: 'Encuentra cuentas vigentes, próximas, vencidas o parcialmente pagadas.',
      behavior: 'Acota la tabla por texto, periodo, estado, unidad o negocio.',
      whenToUse: 'Úsalo al construir la prioridad diaria de cobranza.',
      result: 'Evita perseguir todas las cuentas con la misma urgencia.', focus: 'la prioridad de cobranza',
      stories: {
        emily: 'Emily filtra lo que vence esta semana y distribuye contactos entre sus gerentes.',
        juanito: 'Juanito ordena vencidos por saldo y días de atraso para atacar primero el mayor riesgo.',
        camila: 'Camila filtra los clientes del vendedor de mostrador y acuerda un seguimiento concreto.',
      },
    }),
    control({
      id: 'receivable-register-payment', emoji: '💵', kind: 'Acción del registro', title: 'Registrar pago',
      purpose: 'Aplica un ingreso a la cuenta y parcialidades correspondientes.',
      behavior: 'Abre el formulario, valida importe y referencia, adjunta evidencia y recalcula saldos.',
      whenToUse: 'Úsalo cuando el dinero haya sido recibido y pueda identificarse.',
      result: 'Evita cobrar saldos ya pagados o esconder diferencias con ajustes manuales.', focus: 'la aplicación correcta del cobro',
      stories: {
        emily: 'Emily registra la transferencia del cliente corporativo y la sucursal ve el saldo actualizado.',
        juanito: 'Juanito aplica el pago con referencia y comprobante; banco y cartera pueden conciliarse.',
        camila: 'Camila registra un abono del taller y evita depender de una anotación en papel.',
      },
    }),
    control({
      id: 'receivable-detail', emoji: '👁️', kind: 'Acción del registro', title: 'Ver cuenta y parcialidades',
      purpose: 'Consulta calendario, pagos, archivos y evolución del saldo.',
      behavior: 'Abre el expediente de la cuenta sin modificarla.',
      whenToUse: 'Úsalo antes de llamar, renegociar o escalar un atraso.',
      result: 'Permite conversar con el cliente usando la historia completa.', focus: 'la trazabilidad del saldo',
      stories: {
        emily: 'Emily revisa pagos anteriores antes de contactar a un cliente importante.',
        juanito: 'Juanito reconstruye el saldo desde venta, parcialidades y pagos sin hacer cuentas fuera del sistema.',
        camila: 'Camila confirma qué abono falta y evita deteriorar la relación por una cobranza equivocada.',
      },
    }),
  ],
  payments: [
    control({
      id: 'payment-register', emoji: '➕', kind: 'Botón de acción', title: 'Registrar pago',
      purpose: 'Captura un cobro recibido y lo vincula a la cuenta correcta.',
      behavior: 'Valida cliente, cuenta, fecha, método, importe, referencia y comprobante.',
      whenToUse: 'Úsalo únicamente cuando el pago exista y esté identificado.',
      result: 'Mantiene cartera y entradas de dinero alineadas.', focus: 'el registro verificable del cobro',
      stories: {
        emily: 'Emily registra la transferencia con su comprobante y el equipo deja de preguntar si ya pagaron.',
        juanito: 'Juanito exige referencia e importe exactos porque un cobro sin vínculo no reduce correctamente la cartera.',
        camila: 'Camila documenta el abono de un cliente conocido y conserva la relación sin perder control.',
      },
    }),
    control({
      id: 'payment-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Elige la información visible del historial de pagos.',
      behavior: 'Organiza cliente, fecha, método, importe, referencia, responsable y archivos.',
      whenToUse: 'Úsalo para conciliación, auditoría o seguimiento documental.',
      result: 'Hace visibles pagos sin referencia o evidencia.', focus: 'la lectura del historial de cobros',
      stories: {
        emily: 'Emily muestra sucursal, cliente y comprobante para que su equipo valide los cobros.',
        juanito: 'Juanito deja juntos método, referencia e importe para conciliar contra el banco.',
        camila: 'Camila muestra quién registró el pago y puede aclarar cualquier duda rápidamente.',
      },
    }),
    control({
      id: 'payment-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y filtrar pagos',
      purpose: 'Localiza cobros por cliente, periodo, método, referencia o responsable.',
      behavior: 'Reduce el historial al conjunto que necesitas validar.',
      whenToUse: 'Úsalo cuando un cliente reporte un pago o durante la conciliación.',
      result: 'Evita revisar manualmente todo el historial.', focus: 'la localización de cobros',
      stories: {
        emily: 'Emily busca la referencia enviada por el cliente y confirma el registro en segundos.',
        juanito: 'Juanito filtra transferencias del día y compara el total con su banco.',
        camila: 'Camila filtra por cliente y revisa todos sus abonos antes de acordar el saldo.',
      },
    }),
    control({
      id: 'payment-files', emoji: '📎', kind: 'Acción del registro', title: 'Consultar archivos y detalle',
      purpose: 'Abre la evidencia y la cuenta a la que se aplicó el pago.',
      behavior: 'Muestra datos completos sin cambiar el movimiento.',
      whenToUse: 'Úsalo cuando una conciliación o aclaración requiera respaldo.',
      result: 'Resuelve diferencias con evidencia compartida.', focus: 'la evidencia del pago',
      stories: {
        emily: 'Emily muestra el comprobante al área administrativa sin buscarlo en correos.',
        juanito: 'Juanito valida que el archivo corresponda al importe y referencia registrados.',
        camila: 'Camila aclara un abono con el cliente sin depender de recordar la conversación.',
      },
    }),
  ],
  'credit-customers': [
    control({
      id: 'policy-create', emoji: '➕', kind: 'Botón de acción', title: 'Crear política de crédito',
      purpose: 'Define línea, plazo, tasa, límite mensual y reglas para un cliente.',
      behavior: 'Abre el formulario, valida condiciones y habilita crédito disponible.',
      whenToUse: 'Úsalo después de evaluar al cliente y aprobar criterios consistentes.',
      result: 'Evita conceder crédito distinto según quién atienda la venta.', focus: 'las reglas de crédito por cliente',
      stories: {
        emily: 'Emily aprueba una política para una empresa recurrente y todas sus cafeterías respetan las mismas condiciones.',
        juanito: 'Juanito define límite y plazo antes de vender; el crecimiento conserva una exposición calculada.',
        camila: 'Camila formaliza el crédito del taller amigo y protege la relación con reglas conocidas desde el inicio.',
      },
    }),
    control({
      id: 'policy-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Selecciona los datos visibles de clientes y políticas.',
      behavior: 'Organiza línea, disponible, límite mensual, plazo, tasa y estado.',
      whenToUse: 'Úsalo para comparar exposición y condiciones.',
      result: 'Revela políticas demasiado amplias o poco utilizadas.', focus: 'la comparación de políticas',
      stories: {
        emily: 'Emily compara línea disponible entre clientes corporativos antes de autorizar una nueva operación.',
        juanito: 'Juanito coloca línea, usado y disponible juntos para medir exposición real.',
        camila: 'Camila muestra plazo y estado para que el mostrador sepa qué condiciones ofrecer.',
      },
    }),
    control({
      id: 'policy-edit', emoji: '✏️', kind: 'Acción del registro', title: 'Editar política',
      purpose: 'Actualiza condiciones cuando cambia el comportamiento o la evaluación del cliente.',
      behavior: 'Abre la política actual y guarda cambios respetando el saldo ya comprometido.',
      whenToUse: 'Úsalo después de una revisión, no como excepción improvisada durante la venta.',
      result: 'Mantiene condiciones vigentes sin borrar la historia del crédito.', focus: 'la vigencia de la política',
      stories: {
        emily: 'Emily ajusta el límite después de revisar pagos de varios meses, no por presión de una sola venta.',
        juanito: 'Juanito compara comportamiento antes y después; el cambio tiene una razón medible.',
        camila: 'Camila reduce el plazo de un cliente atrasado y comunica la regla con claridad.',
      },
    }),
    control({
      id: 'policy-delete', emoji: '🗑️', kind: 'Acción controlada', title: 'Eliminar política',
      purpose: 'Retira una política que no debe seguir habilitando crédito.',
      behavior: 'Solicita confirmación y respeta restricciones si existen operaciones relacionadas.',
      whenToUse: 'Úsalo cuando la relación terminó o la política fue creada por error.',
      result: 'Evita nuevas ventas a crédito con reglas obsoletas.', focus: 'el control de políticas activas',
      stories: {
        emily: 'Emily retira la política de una empresa cerrada y evita que aparezca como opción.',
        juanito: 'Juanito confirma que no exista saldo comprometido antes de eliminar.',
        camila: 'Camila descontinúa un acuerdo antiguo de forma visible para todo el equipo.',
      },
    }),
  ],
};
