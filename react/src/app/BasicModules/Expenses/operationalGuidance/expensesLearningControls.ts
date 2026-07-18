import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type ExpensesLearningTabId =
  | 'expenses'
  | 'budgets'
  | 'providers'
  | 'accounting'
  | 'payment_accounts'
  | 'kpis';

const control = createLearningModeControl;

export const expensesLearningLabels: Record<ExpensesLearningTabId, string> = {
  expenses: 'Gastos',
  budgets: 'Presupuestos',
  providers: 'Proveedores',
  accounting: 'Cuentas contables',
  payment_accounts: 'Cuentas de pago',
  kpis: 'KPIs financieros',
};

export const expensesLearningControls: Record<ExpensesLearningTabId, readonly LearningModeControl[]> = {
  expenses: [
    control({
      id: 'expense-create', emoji: '➕', kind: 'Botón de acción', title: 'Registrar gasto',
      purpose: 'Captura un compromiso o salida de dinero con concepto, proveedor, fecha, impuestos y cuenta de pago.',
      behavior: 'Abre el formulario, valida los datos obligatorios y agrega el gasto a la operación financiera.',
      whenToUse: 'Úsalo en cuanto exista una compra, servicio o compromiso, antes de que el comprobante se pierda.',
      result: 'Evita pagos sin contexto y permite explicar en qué se utilizó el dinero.', focus: 'el registro oportuno de cada gasto',
      stories: {
        emily: 'Emily registra insumos y servicios por cafetería. Así compara costos sin mezclar lo que pertenece a cada sucursal.',
        juanito: 'Juanito es muy bueno con los números, pero aprendió que un total sin concepto no explica nada. Registra cada compra para saber quién la pidió, cuándo vence y desde qué cuenta se paga.',
        camila: 'Camila registra piezas, fletes y servicios aunque el proveedor sea conocido. La confianza continúa, pero ahora cada salida tiene respaldo.',
      },
    }),
    control({
      id: 'expense-payable', emoji: '🏦', kind: 'Botón de acción', title: 'Crear cuenta por pagar',
      purpose: 'Registra una obligación pendiente sin confundirla con un pago ya realizado.',
      behavior: 'Crea el compromiso con vencimiento, proveedor y saldo para darle seguimiento hasta liquidarlo.',
      whenToUse: 'Úsalo cuando recibas mercancía o servicio a crédito, o cuando la factura se pagará después.',
      result: 'Evita que los compromisos futuros desaparezcan de la planeación de efectivo.', focus: 'las obligaciones pendientes',
      stories: {
        emily: 'Emily registra el mantenimiento de una máquina de espresso como cuenta por pagar. La sucursal recibe el servicio y Finanzas conserva la fecha de pago.',
        juanito: 'Juanito separa lo comprado de lo pagado. Así su utilidad no se ve bien solo porque una factura todavía no salió del banco.',
        camila: 'Camila deja visible el crédito del proveedor de refacciones y evita enterarse del vencimiento cuando ya le suspendieron el surtido.',
      },
    }),
    control({
      id: 'expense-kiosk', emoji: '🏪', kind: 'Botón de acceso', title: 'Kiosco de cuentas por pagar',
      purpose: 'Permite que proveedores o responsables entreguen comprobantes y solicitudes por un canal controlado.',
      behavior: 'Abre la administración del acceso al kiosco sin compartir permisos internos del módulo.',
      whenToUse: 'Úsalo cuando varias personas envían facturas y necesitas una entrada común y rastreable.',
      result: 'Reduce documentos dispersos en mensajes, correos y conversaciones.', focus: 'la recepción ordenada de comprobantes',
      stories: {
        emily: 'Emily pide a proveedores recurrentes que entreguen sus facturas por el kiosco. Sus gerentes dejan de reenviar archivos por distintos chats.',
        juanito: 'Juanito concentra las facturas en un mismo canal y puede contar recibidas, pendientes y rechazadas sin revisar conversaciones.',
        camila: 'Camila conserva la cercanía con sus proveedores, pero cada comprobante llega al lugar donde su equipo puede procesarlo.',
      },
    }),
    control({
      id: 'expense-columns-filters', emoji: '🧩', kind: 'Configuración y consulta', title: 'Columnas, filtros y acciones del gasto',
      purpose: 'Adapta la tabla, encuentra movimientos y administra el expediente de cada gasto.',
      behavior: 'Columnas cambia la información visible; los filtros acotan resultados y las acciones permiten consultar, editar, pagar, adjuntar o eliminar según el estado.',
      whenToUse: 'Úsalos antes de revisar vencimientos, responsables, categorías o comprobantes faltantes.',
      result: 'Convierte una lista extensa en una revisión enfocada y deja cada corrección en el registro correcto.', focus: 'la revisión del detalle financiero',
      stories: {
        emily: 'Emily filtra una sucursal y muestra categoría, proveedor y estado. Detecta gastos sin comprobante antes del cierre mensual.',
        juanito: 'Juanito configura columnas para comparar importe, impuestos, vencimiento y pago; después abre solo los registros que no cuadran.',
        camila: 'Camila busca al proveedor, adjunta la factura faltante y corrige el concepto sin crear versiones separadas del mismo gasto.',
      },
    }),
  ],
  budgets: [
    control({
      id: 'budget-create', emoji: '➕', kind: 'Botón de acción', title: 'Crear presupuesto',
      purpose: 'Define cuánto planeas gastar, en qué concepto, durante qué periodo y con qué recurrencia.',
      behavior: 'Abre el formulario y genera las líneas proyectadas que después se comparan con los gastos reales.',
      whenToUse: 'Úsalo antes de iniciar un periodo, proyecto, campaña o gasto recurrente.',
      result: 'Permite detectar desviaciones antes de que la falta de efectivo se convierta en urgencia.', focus: 'la planeación del gasto',
      stories: {
        emily: 'Emily presupuesta café, leche y mantenimiento por sucursal. Si una ubicación se desvía, puede preguntar antes de fin de mes.',
        juanito: 'Juanito convierte sus metas de margen en límites de compra. Los números planeados y reales viven en la misma revisión.',
        camila: 'Camila fija un presupuesto de surtido y transporte. Evita comprar de más solo porque un proveedor ofrece una promoción.',
      },
    }),
    control({
      id: 'budget-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Elige qué datos del presupuesto aparecen y en qué orden.',
      behavior: 'Abre el configurador sin modificar los presupuestos ni sus importes.',
      whenToUse: 'Úsalo para revisar responsables, periodos, conceptos, impuestos o variaciones.',
      result: 'Reduce ruido y muestra la información necesaria para la decisión actual.', focus: 'la lectura del presupuesto',
      stories: {
        emily: 'Emily muestra sucursal, concepto, periodo y variación para comparar cafeterías con el mismo criterio.',
        juanito: 'Juanito coloca primero planeado, real y diferencia; entiende de inmediato dónde investigar.',
        camila: 'Camila deja visibles proveedor, concepto y responsable para que las compras no dependan solo de ella.',
      },
    }),
    control({
      id: 'budget-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y segmentar presupuestos',
      purpose: 'Acota la revisión por unidad, negocio, periodo, concepto, estado o proveedor.',
      behavior: 'Actualiza la tabla con el segmento seleccionado sin borrar información.',
      whenToUse: 'Úsalo cuando quieras responder una pregunta concreta sobre una parte del gasto planeado.',
      result: 'Distingue una desviación local de un problema general de la empresa.', focus: 'la comparación enfocada',
      stories: {
        emily: 'Emily filtra una cafetería y descubre que el desvío viene del mantenimiento, no de los insumos.',
        juanito: 'Juanito compara el mismo concepto entre periodos y separa una excepción de una tendencia.',
        camila: 'Camila filtra compras de inventario para saber qué familia de piezas está absorbiendo más capital.',
      },
    }),
    control({
      id: 'budget-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Consultar, editar y administrar',
      purpose: 'Mantiene vigente cada presupuesto conforme cambian fechas, responsables o condiciones.',
      behavior: 'Las acciones abren el detalle, permiten ajustes controlados y eliminan únicamente con confirmación.',
      whenToUse: 'Úsalas cuando cambie un supuesto o necesites revisar cómo se calculó una proyección.',
      result: 'Evita hojas paralelas y presupuestos desactualizados que ya nadie utiliza.', focus: 'la vigencia del presupuesto',
      stories: {
        emily: 'Emily actualiza el presupuesto de una apertura y conserva una sola fuente para su equipo.',
        juanito: 'Juanito revisa el detalle antes de ajustar; sabe qué supuesto cambió y por qué cambió el número.',
        camila: 'Camila corrige la recurrencia de una compra sin duplicar la partida ni perder su contexto.',
      },
    }),
  ],
  providers: [
    control({
      id: 'provider-add', emoji: '➕', kind: 'Botón de acción', title: 'Agregar proveedor',
      purpose: 'Crea un expediente con datos comerciales, fiscales, de contacto y condiciones de pago.',
      behavior: 'Abre el formulario y agrega el proveedor al catálogo compartido.',
      whenToUse: 'Úsalo antes de registrar operaciones recurrentes o conceder acceso al kiosco.',
      result: 'Evita pagos a contactos incompletos y reduce la recaptura de datos.', focus: 'el expediente del proveedor',
      stories: {
        emily: 'Emily registra al tostador con contacto, condiciones y sucursales atendidas. Cualquier gerente sabe cómo escalar un problema.',
        juanito: 'Juanito completa datos fiscales y días de crédito; sus pagos se relacionan con información confiable.',
        camila: 'Camila formaliza a proveedores conocidos sin perder la relación personal. El equipo ya no depende de su libreta.',
      },
    }),
    control({
      id: 'provider-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Selecciona los datos que aparecen en el directorio de proveedores.',
      behavior: 'Muestra, oculta y ordena columnas sin alterar los expedientes.',
      whenToUse: 'Úsalo para revisar contacto, crédito, situación fiscal, unidad o estado.',
      result: 'Hace visibles los datos necesarios para comprar y pagar con seguridad.', focus: 'la lectura del directorio',
      stories: {
        emily: 'Emily muestra categoría, contacto y sucursal para que cada gerente encuentre al proveedor correcto.',
        juanito: 'Juanito deja visibles días de crédito, moneda y estado para anticipar el flujo de pagos.',
        camila: 'Camila organiza marca, contacto y condiciones para comparar opciones sin buscar mensajes antiguos.',
      },
    }),
    control({
      id: 'provider-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y filtrar proveedores',
      purpose: 'Encuentra proveedores por nombre, categoría, estado, unidad o condición.',
      behavior: 'Reduce el directorio al segmento que quieres revisar.',
      whenToUse: 'Úsalo antes de una compra, una depuración o una negociación.',
      result: 'Evita elegir por memoria cuando ya existe información comparable.', focus: 'la selección de proveedores',
      stories: {
        emily: 'Emily filtra proveedores activos de mantenimiento y compara quién atiende cada cafetería.',
        juanito: 'Juanito encuentra proveedores con crédito y calcula qué compras no necesitan efectivo inmediato.',
        camila: 'Camila filtra por marca de refacción y asigna el pedido al proveedor adecuado.',
      },
    }),
    control({
      id: 'provider-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Editar, kiosco y estado',
      purpose: 'Actualiza datos, administra acceso externo y mantiene limpio el catálogo.',
      behavior: 'Las acciones permiten abrir el expediente, editar, configurar el kiosco y activar o desactivar con confirmación.',
      whenToUse: 'Úsalas cuando cambien datos o cuando un proveedor deje de operar contigo.',
      result: 'Conserva historial sin seguir ofreciendo opciones obsoletas al equipo.', focus: 'la vigencia de proveedores',
      stories: {
        emily: 'Emily desactiva un proveedor anterior y el equipo deja de enviarle solicitudes por error.',
        juanito: 'Juanito actualiza plazo y cuenta bancaria; el siguiente pago usa los datos vigentes.',
        camila: 'Camila habilita el kiosco al proveedor recurrente y sus facturas dejan de depender de quién atendió la compra.',
      },
    }),
  ],
  accounting: [
    control({
      id: 'accounting-add', emoji: '➕', kind: 'Botón de acción', title: 'Agregar cuenta contable',
      purpose: 'Crea una cuenta dentro de la estructura que clasifica la información financiera.',
      behavior: 'Abre el formulario y valida código, nombre, naturaleza y nivel antes de guardar.',
      whenToUse: 'Úsalo cuando una operación legítima no tenga una clasificación adecuada.',
      result: 'Evita categorías improvisadas que impiden comparar periodos.', focus: 'la clasificación contable',
      stories: {
        emily: 'Emily crea cuentas consistentes para mantenimiento e insumos de sus cafeterías y compara cada rubro sin mezclas.',
        juanito: 'Juanito cuida códigos y naturaleza porque sabe que una suma correcta en la cuenta equivocada produce una decisión incorrecta.',
        camila: 'Camila separa fletes, compras y devoluciones para entender qué costo realmente afecta a cada venta.',
      },
    }),
    control({
      id: 'accounting-import', emoji: '📥', kind: 'Botón de acción', title: 'Importar catálogo',
      purpose: 'Incorpora una estructura contable existente sin capturar cuenta por cuenta.',
      behavior: 'Abre el asistente, valida el archivo y reporta filas aceptadas o rechazadas antes de confirmar.',
      whenToUse: 'Úsalo al migrar desde otro sistema o adoptar un catálogo aprobado.',
      result: 'Acelera la configuración sin convertir errores del archivo en estructura definitiva.', focus: 'la migración controlada del catálogo',
      stories: {
        emily: 'Emily importa el catálogo validado por su contador y aplica la misma estructura a todas las sucursales.',
        juanito: 'Juanito compara cuántas filas entraron y cuáles fallaron antes de aceptar la migración.',
        camila: 'Camila deja atrás categorías informales y arranca con una estructura que su contador también comprende.',
      },
    }),
    control({
      id: 'accounting-columns-filters', emoji: '🧩', kind: 'Configuración y filtros', title: 'Columnas, búsqueda y jerarquía',
      purpose: 'Ajusta la vista y encuentra cuentas por código, nombre, tipo, nivel o estado.',
      behavior: 'Cambia la presentación y filtra el catálogo sin alterar su estructura.',
      whenToUse: 'Úsalo para auditar duplicados, cuentas inactivas o niveles mal asignados.',
      result: 'Hace visible la lógica del catálogo antes de registrar movimientos.', focus: 'la revisión del catálogo',
      stories: {
        emily: 'Emily filtra cuentas de costos y verifica que todas las cafeterías utilicen las mismas categorías.',
        juanito: 'Juanito ordena por código y nivel para encontrar saltos o duplicados que afectarían sus reportes.',
        camila: 'Camila busca por nombre y confirma dónde registrar una compra antes de inventar una categoría nueva.',
      },
    }),
    control({
      id: 'accounting-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Editar y controlar estado',
      purpose: 'Corrige datos permitidos y retira cuentas que ya no deben utilizarse.',
      behavior: 'Abre el detalle, permite editar según reglas y activa o desactiva sin borrar historial relacionado.',
      whenToUse: 'Úsalo cuando cambie una descripción o una cuenta deje de recibir movimientos.',
      result: 'Mantiene un catálogo limpio sin romper la trazabilidad financiera.', focus: 'la vigencia de las cuentas',
      stories: {
        emily: 'Emily desactiva una cuenta antigua después de confirmar que ninguna sucursal la sigue usando.',
        juanito: 'Juanito corrige la descripción sin cambiar el significado histórico del código.',
        camila: 'Camila retira una categoría duplicada y orienta al equipo hacia la cuenta correcta.',
      },
    }),
  ],
  payment_accounts: [
    control({
      id: 'payment-account-add', emoji: '➕', kind: 'Botón de acción', title: 'Agregar cuenta de pago',
      purpose: 'Registra bancos, tarjetas, cajas u otros medios desde los que sale el dinero.',
      behavior: 'Abre el formulario y guarda moneda, tipo, responsable y datos de identificación.',
      whenToUse: 'Úsalo antes de asignar pagos a una fuente nueva.',
      result: 'Permite saber de dónde salió cada pago y qué saldo operativo afecta.', focus: 'las fuentes de pago',
      stories: {
        emily: 'Emily separa la cuenta corporativa de las cajas de cada cafetería para no mezclar responsabilidades.',
        juanito: 'Juanito relaciona cada salida con banco, moneda y responsable; el total siempre puede reconstruirse.',
        camila: 'Camila registra la tarjeta de compras y la caja del mostrador para dejar de compensarlas de palabra.',
      },
    }),
    control({
      id: 'payment-account-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Define qué información de las cuentas aparece en la tabla.',
      behavior: 'Muestra, oculta y ordena datos sin modificar saldos ni registros.',
      whenToUse: 'Úsalo para comparar moneda, tipo, responsable, unidad o estado.',
      result: 'Facilita seleccionar la cuenta correcta al registrar un pago.', focus: 'la lectura de cuentas de pago',
      stories: {
        emily: 'Emily muestra unidad y responsable para que cada gerente use la caja que le corresponde.',
        juanito: 'Juanito coloca moneda, tipo y estado antes del nombre para validar la fuente rápidamente.',
        camila: 'Camila deja visible quién controla cada cuenta y evita que dos personas asuman la misma responsabilidad.',
      },
    }),
    control({
      id: 'payment-account-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y filtrar cuentas',
      purpose: 'Localiza una fuente por nombre, tipo, moneda, unidad o estado.',
      behavior: 'Acota el catálogo y conserva los datos originales.',
      whenToUse: 'Úsalo antes de asignar pagos o revisar cuentas inactivas.',
      result: 'Reduce errores de selección entre cuentas parecidas.', focus: 'la selección de la fuente correcta',
      stories: {
        emily: 'Emily filtra las cajas de una sucursal antes de revisar sus pagos del día.',
        juanito: 'Juanito filtra por moneda y evita comparar saldos que no son equivalentes.',
        camila: 'Camila busca la cuenta del almacén y confirma al responsable antes de registrar una salida.',
      },
    }),
    control({
      id: 'payment-account-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Editar y administrar estado',
      purpose: 'Mantiene actualizados los datos y controla qué fuentes siguen disponibles.',
      behavior: 'Permite consultar, editar, activar o desactivar respetando los movimientos históricos.',
      whenToUse: 'Úsalo cuando cambie una cuenta o deje de utilizarse.',
      result: 'Evita nuevos pagos en fuentes obsoletas sin borrar su historia.', focus: 'la vigencia de las fuentes de pago',
      stories: {
        emily: 'Emily desactiva una caja cerrada y sus reportes anteriores permanecen explicables.',
        juanito: 'Juanito actualiza el identificador bancario y conserva la continuidad de sus cifras.',
        camila: 'Camila retira una tarjeta anterior para que nadie la seleccione por costumbre.',
      },
    }),
  ],
  kpis: [
    control({
      id: 'expense-kpi-period', emoji: '📅', kind: 'Filtro ejecutivo', title: 'Periodo y filtros financieros',
      purpose: 'Define el intervalo, unidad, negocio y moneda de la lectura financiera.',
      behavior: 'Recalcula indicadores, tendencias y concentraciones con el mismo alcance seleccionado.',
      whenToUse: 'Úsalo antes de comparar resultados o explicar una variación.',
      result: 'Evita conclusiones que mezclan periodos, negocios o monedas diferentes.', focus: 'el alcance de la lectura financiera',
      stories: {
        emily: 'Emily compara el mismo mes entre cafeterías y separa un problema local de una tendencia general.',
        juanito: 'Juanito confirma periodo y moneda antes de interpretar cualquier porcentaje o total.',
        camila: 'Camila filtra el negocio de refacciones y evita que otro flujo distorsione su análisis.',
      },
    }),
    control({
      id: 'expense-kpi-signals', emoji: '📊', kind: 'Lectura ejecutiva', title: 'Indicadores, alertas y concentraciones',
      purpose: 'Resume gasto real, proyectado, vencimientos y principales causas de variación.',
      behavior: 'Conecta tarjetas, alertas y rankings con el detalle que origina cada cifra.',
      whenToUse: 'Úsalo en revisiones semanales y cierres para decidir dónde investigar.',
      result: 'Convierte muchos movimientos en pocas preguntas accionables.', focus: 'las señales financieras',
      stories: {
        emily: 'Emily detecta que una cafetería concentra gastos urgentes y abre el detalle antes de recortar en todas.',
        juanito: 'Juanito usa la señal como inicio, no como conclusión: valida los movimientos que explican el cambio.',
        camila: 'Camila descubre que el flete, y no el precio de las piezas, está reduciendo su margen.',
      },
    }),
    control({
      id: 'expense-kpi-detail', emoji: '🔍', kind: 'Exploración', title: 'Abrir el detalle de una señal',
      purpose: 'Pasa del indicador agregado a los proveedores, categorías o gastos que lo componen.',
      behavior: 'Selecciona una barra, ranking o alerta y actualiza el contexto de análisis.',
      whenToUse: 'Úsalo cuando una cifra requiera explicación antes de tomar acción.',
      result: 'Evita decisiones basadas únicamente en promedios o porcentajes.', focus: 'la explicación detrás del indicador',
      stories: {
        emily: 'Emily abre el gasto de mantenimiento y encuentra una reparación extraordinaria; no castiga el presupuesto habitual.',
        juanito: 'Juanito recorre del total al registro hasta que la variación puede explicarse con evidencia.',
        camila: 'Camila abre el proveedor con mayor gasto y separa compras de inventario de servicios operativos.',
      },
    }),
    control({
      id: 'expense-kpi-export', emoji: '🖨️', kind: 'Botón de acción', title: 'Descargar panorama financiero',
      purpose: 'Genera un documento del análisis visible con periodo y filtros aplicados.',
      behavior: 'Prepara el reporte para compartir o conservar como evidencia de revisión.',
      whenToUse: 'Úsalo después de validar el alcance y comprender las señales principales.',
      result: 'Comparte una lectura consistente sin reconstruir cifras manualmente.', focus: 'el reporte financiero compartido',
      stories: {
        emily: 'Emily descarga el panorama validado para revisar acuerdos con sus gerentes de sucursal.',
        juanito: 'Juanito guarda el reporte con el periodo correcto y puede comparar decisiones contra resultados posteriores.',
        camila: 'Camila comparte el análisis con su familia y todos conversan sobre la misma versión de los datos.',
      },
    }),
  ],
};
