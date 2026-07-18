import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type PettyCashLearningTabId = 'cash' | 'control' | 'statements' | 'kpis';

const control = createLearningModeControl;

export const pettyCashLearningLabels: Record<PettyCashLearningTabId, string> = {
  cash: 'Fondos de caja chica',
  control: 'Comprobación y conciliación',
  statements: 'Estados de cuenta',
  kpis: 'Vista financiera',
};

export const pettyCashLearningControls: Record<PettyCashLearningTabId, readonly LearningModeControl[]> = {
  cash: [
    control({
      id: 'fund-create', emoji: '➕', kind: 'Botón de acción', title: 'Crear fondo',
      purpose: 'Define una caja chica con negocio, responsable, moneda, límites y saldo inicial.',
      behavior: 'Abre el formulario y crea el fondo que recibirá depósitos, gastos y comprobaciones.',
      whenToUse: 'Úsalo cuando una ubicación o responsable necesite dinero operativo separado.',
      result: 'Evita entregar efectivo sin dueño, límite ni propósito definido.', focus: 'la responsabilidad de cada fondo',
      stories: {
        emily: 'Emily crea un fondo por cafetería y asigna a la gerente responsable. El efectivo deja de mezclarse entre sucursales.',
        juanito: 'Juanito define saldo y responsable desde el inicio; así sus números también explican quién cuida el dinero.',
        camila: 'Camila separa la caja de mostrador de las compras urgentes del almacén y deja claro quién responde por cada una.',
      },
    }),
    control({
      id: 'fund-kiosk', emoji: '🔑', kind: 'Botón de acceso', title: 'Administrar kiosco',
      purpose: 'Configura el acceso para capturar gastos e ingresos sin entrar al sistema administrativo.',
      behavior: 'Permite activar, abrir, copiar, regenerar o desactivar el acceso del fondo conservando permisos limitados.',
      whenToUse: 'Úsalo cuando el responsable necesita registrar comprobantes desde su operación diaria.',
      result: 'Reduce capturas tardías y evita compartir usuarios administrativos.', focus: 'el acceso controlado al fondo',
      stories: {
        emily: 'Emily entrega a cada gerente el kiosco de su cafetería; registran el gasto donde ocurre y ella conserva el control central.',
        juanito: 'Juanito revisa qué kioscos están activos y quién los usa. Ya no recibe tickets sin saber a qué fondo pertenecen.',
        camila: 'Camila permite al encargado del almacén subir gastos urgentes sin darle acceso a toda la información financiera.',
      },
    }),
    control({
      id: 'fund-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Ver, fondear, editar y cerrar',
      purpose: 'Administra el ciclo de vida y el saldo de cada fondo.',
      behavior: 'Las acciones permiten consultar recibos, ingresar dinero, cambiar configuración o cerrar según el estado.',
      whenToUse: 'Úsalas cuando cambie el responsable, necesites reponer saldo o termine la operación del fondo.',
      result: 'Conserva trazabilidad sin crear fondos duplicados por cada cambio.', focus: 'el ciclo de vida del fondo',
      stories: {
        emily: 'Emily fondea una cafetería después de revisar comprobantes, no solo porque el saldo está bajo.',
        juanito: 'Juanito compara saldo, gastos pendientes y reposición antes de mover dinero.',
        camila: 'Camila cambia al responsable en el expediente y evita que la entrega quede únicamente en una conversación.',
      },
    }),
    control({
      id: 'fund-filters', emoji: '🔎', kind: 'Filtros y consulta', title: 'Buscar y revisar fondos',
      purpose: 'Encuentra fondos por unidad, negocio, responsable, moneda o estado.',
      behavior: 'Acota la lista y mantiene disponibles las acciones correspondientes a cada fondo.',
      whenToUse: 'Úsalo antes de fondear, auditar o depurar.',
      result: 'Distingue un problema específico de una situación general de caja.', focus: 'la revisión enfocada de fondos',
      stories: {
        emily: 'Emily filtra una cafetería y revisa su saldo sin mezclarlo con las demás.',
        juanito: 'Juanito filtra fondos activos en una moneda y valida que el total sea comparable.',
        camila: 'Camila busca al responsable y encuentra rápidamente qué caja debe comprobar.',
      },
    }),
  ],
  control: [
    control({
      id: 'receipt-upload', emoji: '🧾', kind: 'Botón de acción', title: 'Subir comprobante',
      purpose: 'Registra un gasto con proveedor, fecha, concepto, importe y evidencia.',
      behavior: 'Abre la captura y vincula el comprobante al fondo y periodo correctos.',
      whenToUse: 'Úsalo inmediatamente después del gasto o al recibir el ticket.',
      result: 'Evita que el efectivo salga sin una explicación verificable.', focus: 'la evidencia de cada gasto',
      stories: {
        emily: 'Emily pide subir el ticket al momento. Sus cierres ya no dependen de encontrar papeles al final de la semana.',
        juanito: 'Juanito relaciona cada importe con evidencia; una diferencia deja de ser un número misterioso.',
        camila: 'Camila registra una compra urgente de tornillería y el equipo sabe por qué bajó la caja.',
      },
    }),
    control({
      id: 'deposit-create', emoji: '💵', kind: 'Botón de acción', title: 'Registrar ingreso',
      purpose: 'Documenta reposiciones, devoluciones u otras entradas al fondo.',
      behavior: 'Crea el movimiento con origen, destino, referencia, fecha e importe.',
      whenToUse: 'Úsalo cada vez que entre dinero, aunque sea una devolución pequeña.',
      result: 'Evita saldos mayores al esperado sin origen identificable.', focus: 'el origen de cada ingreso',
      stories: {
        emily: 'Emily registra la reposición de una sucursal y distingue dinero nuevo de tickets aún pendientes.',
        juanito: 'Juanito no ajusta el saldo a mano: registra el ingreso para que el total pueda reconstruirse.',
        camila: 'Camila documenta la devolución de un proveedor y evita tratarla como si fuera una venta.',
      },
    }),
    control({
      id: 'provider-quick-create', emoji: '🏢', kind: 'Botón de apoyo', title: 'Agregar proveedor',
      purpose: 'Crea el proveedor necesario durante la comprobación sin abandonar el flujo.',
      behavior: 'Abre una captura rápida y devuelve el proveedor disponible para el comprobante.',
      whenToUse: 'Úsalo cuando el comprobante pertenece a un proveedor legítimo aún no registrado.',
      result: 'Evita escribir nombres distintos para el mismo proveedor.', focus: 'la consistencia del proveedor',
      stories: {
        emily: 'Emily registra una nueva panadería una sola vez y todas las cafeterías utilizan el mismo nombre.',
        juanito: 'Juanito evita duplicados que repartirían el gasto entre varias etiquetas.',
        camila: 'Camila agrega al proveedor local con sus datos mínimos y luego completa el expediente.',
      },
    }),
    control({
      id: 'reconciliation-actions', emoji: '✅', kind: 'Acciones de conciliación', title: 'Revisar, aprobar, rechazar y devolver',
      purpose: 'Valida si cada comprobante cumple las reglas del fondo.',
      behavior: 'Las acciones cambian el estado con trazabilidad y conservan el motivo cuando requiere corrección.',
      whenToUse: 'Úsalas después de verificar evidencia, importe, fecha y propósito.',
      result: 'Separa gasto capturado de gasto realmente comprobado.', focus: 'la validación de comprobantes',
      stories: {
        emily: 'Emily devuelve un ticket ilegible con instrucción clara; la gerente corrige sin rehacer todo el cierre.',
        juanito: 'Juanito aprueba solo cuando importe y evidencia coinciden. El saldo deja de depender de supuestos.',
        camila: 'Camila rechaza un gasto personal y la regla queda visible para todos, incluso dentro de la familia.',
      },
    }),
  ],
  statements: [
    control({
      id: 'statement-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar estados de cuenta',
      purpose: 'Localiza cierres por fondo, periodo, estado o texto.',
      behavior: 'Acota la tabla sin modificar movimientos ni saldos.',
      whenToUse: 'Úsalo para revisar un periodo o responsable específico.',
      result: 'Permite comparar cierres equivalentes y encontrar diferencias pendientes.', focus: 'la búsqueda de cierres',
      stories: {
        emily: 'Emily filtra el último mes de una cafetería y revisa su historial sin recorrer todos los fondos.',
        juanito: 'Juanito compara periodos cerrados del mismo fondo y detecta si las diferencias se repiten.',
        camila: 'Camila busca el cierre del almacén y confirma quién lo entregó.',
      },
    }),
    control({
      id: 'statement-sort', emoji: '↕️', kind: 'Función de tabla', title: 'Ordenar columnas',
      purpose: 'Organiza estados por fondo, periodo, saldos o estado.',
      behavior: 'Cambia el orden de lectura sin alterar los registros.',
      whenToUse: 'Úsalo para detectar máximos, mínimos, faltantes o cierres recientes.',
      result: 'Hace visibles patrones que se pierden en el orden de captura.', focus: 'el orden útil de la información',
      stories: {
        emily: 'Emily ordena por faltante y atiende primero la cafetería con mayor diferencia.',
        juanito: 'Juanito ordena por periodo y comprueba la evolución del saldo final.',
        camila: 'Camila ordena por estado para separar lo cerrado de lo que aún necesita seguimiento.',
      },
    }),
    control({
      id: 'statement-view', emoji: '👁️', kind: 'Acción del registro', title: 'Ver detalle',
      purpose: 'Abre movimientos, comprobantes y cálculos que forman el estado de cuenta.',
      behavior: 'Muestra el expediente del cierre sin cambiar su estado.',
      whenToUse: 'Úsalo antes de aceptar una diferencia o explicar un saldo.',
      result: 'Conecta el resumen con la evidencia que lo sostiene.', focus: 'el expediente del cierre',
      stories: {
        emily: 'Emily abre el detalle y encuentra un comprobante devuelto que explica el saldo pendiente.',
        juanito: 'Juanito recorre del saldo final a cada movimiento hasta poder reconstruirlo.',
        camila: 'Camila muestra el detalle al responsable y ambos revisan la misma información.',
      },
    }),
    control({
      id: 'statement-pagination', emoji: '📚', kind: 'Navegación de tabla', title: 'Paginación y tamaño de página',
      purpose: 'Controla cuántos cierres aparecen y permite recorrer el historial.',
      behavior: 'Cambia la porción visible sin perder filtros ni orden.',
      whenToUse: 'Úsalo cuando el historial sea mayor que una pantalla.',
      result: 'Mantiene una consulta ágil sin ocultar registros antiguos.', focus: 'la navegación del historial',
      stories: {
        emily: 'Emily aumenta el tamaño para comparar todas sus cafeterías del mismo periodo.',
        juanito: 'Juanito conserva filtros al cambiar de página y no mezcla muestras distintas.',
        camila: 'Camila recorre cierres anteriores sin abrir hojas separadas.',
      },
    }),
  ],
  kpis: [
    control({
      id: 'petty-kpi-filters', emoji: '📅', kind: 'Filtros ejecutivos', title: 'Periodo, fondo, unidad y moneda',
      purpose: 'Define el alcance de indicadores y tablas financieras.',
      behavior: 'Recalcula la vista con los fondos y periodos seleccionados.',
      whenToUse: 'Úsalo antes de comparar salud, comprobación o faltantes.',
      result: 'Evita sumar fondos que no son comparables.', focus: 'el alcance de la vista financiera',
      stories: {
        emily: 'Emily compara cafeterías en el mismo periodo y distingue una excepción local.',
        juanito: 'Juanito confirma moneda y periodo antes de confiar en cualquier total.',
        camila: 'Camila filtra el fondo del almacén para revisar su operación real.',
      },
    }),
    control({
      id: 'petty-kpi-health', emoji: '🩺', kind: 'Indicador', title: 'Salud de caja chica',
      purpose: 'Resume cumplimiento, diferencias, comprobantes y kioscos activos.',
      behavior: 'Combina señales operativas en una lectura que orienta la revisión.',
      whenToUse: 'Úsalo como punto de partida, no como sustituto del detalle.',
      result: 'Prioriza los fondos que requieren atención.', focus: 'la salud operativa del fondo',
      stories: {
        emily: 'Emily identifica una cafetería con baja salud y revisa el flujo antes de cambiar las reglas de todas.',
        juanito: 'Juanito abre los componentes del indicador para saber qué número necesita acción.',
        camila: 'Camila detecta que el problema no es el saldo, sino comprobantes sin aprobar.',
      },
    }),
    control({
      id: 'petty-kpi-tables', emoji: '📊', kind: 'Lectura analítica', title: 'Estados y movimientos relacionados',
      purpose: 'Conecta indicadores con cierres y movimientos que los explican.',
      behavior: 'Permite ordenar y revisar los registros del mismo contexto filtrado.',
      whenToUse: 'Úsalo cuando una señal cambie o aparezca una diferencia.',
      result: 'Pasa del resumen a la causa sin abandonar la vista.', focus: 'la explicación de los indicadores',
      stories: {
        emily: 'Emily abre los movimientos del periodo y encuentra una reposición pendiente de conciliación.',
        juanito: 'Juanito valida que cada variación del indicador tenga registros que la respalden.',
        camila: 'Camila compara ingresos y gastos para explicar el saldo al responsable.',
      },
    }),
    control({
      id: 'petty-kpi-clear', emoji: '🧹', kind: 'Botón de apoyo', title: 'Limpiar filtros',
      purpose: 'Restablece la vista financiera a su alcance general.',
      behavior: 'Quita criterios aplicados sin borrar información.',
      whenToUse: 'Úsalo al terminar una investigación y comenzar otra.',
      result: 'Evita interpretar la siguiente revisión con filtros olvidados.', focus: 'el reinicio consciente del análisis',
      stories: {
        emily: 'Emily limpia los filtros antes de pasar de una cafetería a la comparación general.',
        juanito: 'Juanito confirma que el universo volvió al total antes de reportar una cifra.',
        camila: 'Camila inicia una nueva revisión sin arrastrar el fondo anterior.',
      },
    }),
  ],
};
