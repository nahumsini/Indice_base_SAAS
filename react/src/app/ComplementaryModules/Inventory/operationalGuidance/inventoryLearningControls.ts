import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type InventoryLearningTabId = 'products' | 'inventory' | 'warehouses' | 'providers' | 'purchase-orders' | 'discounts';

const control = createLearningModeControl;

export const inventoryLearningLabels: Record<InventoryLearningTabId, string> = {
  products: 'Productos',
  inventory: 'Inventario',
  warehouses: 'Almacenes',
  providers: 'Proveedores',
  'purchase-orders': 'Órdenes de compra',
  discounts: 'Descuentos y promociones',
};

export const inventoryLearningControls: Record<InventoryLearningTabId, readonly LearningModeControl[]> = {
  products: [
    control({
      id: 'product-create', emoji: '➕', kind: 'Botón de acción', title: 'Nuevo producto',
      purpose: 'Crea la ficha comercial y operativa con código, precio, costo, impuestos y configuración de inventario.',
      behavior: 'Abre el formulario, valida identificadores y agrega el producto al catálogo compartido.',
      whenToUse: 'Úsalo antes de comprar, recibir o vender un artículo nuevo.',
      result: 'Evita productos duplicados y movimientos sin una ficha confiable.', focus: 'el expediente maestro del producto',
      stories: {
        emily: 'Emily registra cada bebida y presentación con la misma estructura para todas sus cafeterías.',
        juanito: 'Juanito relaciona código, costo y precio desde el inicio; sus márgenes nacen de datos completos.',
        camila: 'Camila registra número de parte, marca y compatibilidad para evitar confundir piezas parecidas.',
      },
    }),
    control({
      id: 'product-categories', emoji: '🗂️', kind: 'Botón de configuración', title: 'Administrar categorías',
      purpose: 'Organiza productos en familias útiles para venta, inventario y análisis.',
      behavior: 'Abre el catálogo de categorías para crear, editar y ordenar sin modificar las existencias.',
      whenToUse: 'Úsalo cuando la clasificación actual no permita encontrar o analizar productos correctamente.',
      result: 'Evita categorías improvisadas que fragmentan el catálogo.', focus: 'la clasificación de productos',
      stories: {
        emily: 'Emily usa categorías iguales en cada cafetería y compara bebidas, alimentos e insumos.',
        juanito: 'Juanito evita escribir la misma familia de varias formas y conserva totales comparables.',
        camila: 'Camila clasifica por sistema y marca para que el mostrador encuentre la pieza correcta.',
      },
    }),
    control({
      id: 'product-columns-catalog', emoji: '🧩', kind: 'Configuración y publicación', title: 'Columnas y catálogo público',
      purpose: 'Adapta la tabla y controla cómo se consultan productos fuera del flujo interno.',
      behavior: 'Columnas cambia los datos visibles; catálogo público abre la configuración de publicación autorizada.',
      whenToUse: 'Úsalo para revisar costos, precios, códigos o disponibilidad, y para compartir solo información aprobada.',
      result: 'Separa la información interna de la experiencia que recibe el cliente.', focus: 'la presentación correcta del catálogo',
      stories: {
        emily: 'Emily muestra costo internamente y publica precio y descripción para sus clientes.',
        juanito: 'Juanito configura columnas para auditar margen sin exponer ese dato en el catálogo público.',
        camila: 'Camila publica número de parte y compatibilidad, pero conserva costo y proveedor para su equipo.',
      },
    }),
    control({
      id: 'product-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Consultar, editar, duplicar y controlar estado',
      purpose: 'Mantiene vigente la ficha durante el ciclo de vida del producto.',
      behavior: 'Las acciones abren detalle, corrigen datos, crean variantes o retiran productos sin borrar historia.',
      whenToUse: 'Úsalas cuando cambie un atributo o un artículo deje de venderse.',
      result: 'Evita fichas paralelas y productos obsoletos disponibles por error.', focus: 'la vigencia del catálogo',
      stories: {
        emily: 'Emily actualiza el precio una vez y las cafeterías dejan de operar versiones distintas.',
        juanito: 'Juanito desactiva un producto sin borrar las ventas que explican su historial.',
        camila: 'Camila duplica una ficha para otra variante y conserva una estructura consistente.',
      },
    }),
  ],
  inventory: [
    control({
      id: 'inventory-receive', emoji: '📥', kind: 'Botón de acción', title: 'Recibir inventario',
      purpose: 'Registra la entrada física de productos a un almacén con cantidad, costo y referencia.',
      behavior: 'Abre la recepción y actualiza existencias al confirmar los datos.',
      whenToUse: 'Úsalo cuando la mercancía haya llegado y pueda verificarse.',
      result: 'Evita aumentar stock por una compra que todavía no se recibió.', focus: 'la recepción comprobada de mercancía',
      stories: {
        emily: 'Emily recibe insumos en la cafetería correcta y evita que una compra central aparezca disponible en todas.',
        juanito: 'Juanito compara pedido contra recibido; sus existencias reflejan unidades reales, no promesas del proveedor.',
        camila: 'Camila cuenta las piezas entregadas y registra faltantes antes de incorporarlas al almacén.',
      },
    }),
    control({
      id: 'inventory-warehouse', emoji: '🏬', kind: 'Botón de configuración', title: 'Administrar almacenes',
      purpose: 'Define las ubicaciones que poseen y mueven existencias.',
      behavior: 'Abre la administración para crear o actualizar almacenes y responsables.',
      whenToUse: 'Úsalo antes de recibir stock en una nueva ubicación.',
      result: 'Evita existencias sin ubicación ni responsable.', focus: 'la estructura física del inventario',
      stories: {
        emily: 'Emily separa almacén central y cafeterías para conocer dónde está cada insumo.',
        juanito: 'Juanito asigna responsable a cada ubicación y sus totales también pueden explicarse físicamente.',
        camila: 'Camila distingue mostrador, bodega y piezas en tránsito para no prometer lo que no está disponible.',
      },
    }),
    control({
      id: 'inventory-transfer-adjust', emoji: '🔁', kind: 'Botones de movimiento', title: 'Transferir y ajustar inventario',
      purpose: 'Mueve existencias entre almacenes o corrige diferencias justificadas.',
      behavior: 'Transferir conserva origen y destino; ajustar solicita motivo y modifica la existencia con trazabilidad.',
      whenToUse: 'Transfiere por movimiento físico y ajusta únicamente después de verificar una diferencia.',
      result: 'Evita corregir el sistema sin explicar qué ocurrió con la mercancía.', focus: 'la trazabilidad de los movimientos',
      stories: {
        emily: 'Emily transfiere vasos del almacén central a una cafetería y ambas ubicaciones se actualizan.',
        juanito: 'Juanito ajusta solo después del conteo y registra el motivo; el total no cambia de forma anónima.',
        camila: 'Camila mueve piezas de bodega a mostrador y el vendedor sabe qué puede entregar.',
      },
    }),
    control({
      id: 'inventory-columns-filters-history', emoji: '🔎', kind: 'Consulta y configuración', title: 'Columnas, filtros e historial',
      purpose: 'Encuentra existencias y explica sus cambios por producto, almacén o movimiento.',
      behavior: 'Configura la tabla, segmenta resultados y abre el historial del registro seleccionado.',
      whenToUse: 'Úsalo al investigar faltantes, sobrestock o diferencias.',
      result: 'Conecta la existencia actual con los movimientos que la produjeron.', focus: 'la explicación del stock',
      stories: {
        emily: 'Emily filtra una cafetería y abre el historial del insumo que se consume más rápido.',
        juanito: 'Juanito recorre del stock actual a entradas, salidas y ajustes hasta reconstruir el número.',
        camila: 'Camila busca una pieza y confirma si está en bodega, mostrador o fue transferida.',
      },
    }),
  ],
  warehouses: [
    control({
      id: 'warehouse-management', emoji: '🏭', kind: 'Espacio operativo', title: 'Administrar almacenes',
      purpose: 'Define las ubicaciones que poseen existencias y sus responsables.',
      behavior: 'Permite buscar, crear y retirar almacenes; si existe stock, exige transferirlo antes de eliminar.',
      whenToUse: 'Úsalo antes de recibir inventario en una ubicación nueva o al cerrar una ubicación existente.',
      result: 'Conserva el stock ubicado y evita eliminar existencias por accidente.', focus: 'la estructura física del inventario',
      stories: {
        emily: 'Emily separa almacén central y cafeterías para conocer dónde está cada insumo.',
        juanito: 'Juanito asigna responsable a cada ubicación y mantiene totales explicables físicamente.',
        camila: 'Camila distingue mostrador y bodega sin perder piezas durante una reorganización.',
      },
    }),
  ],
  providers: [
    control({
      id: 'inventory-provider-create', emoji: '➕', kind: 'Botón de acción', title: 'Agregar proveedor',
      purpose: 'Crea el expediente del proveedor con datos de contacto, compra, pago y surtido.',
      behavior: 'Abre el formulario y agrega una fuente confiable al catálogo compartido.',
      whenToUse: 'Úsalo antes de crear compras recurrentes o dar acceso al portal.',
      result: 'Evita pedidos y pagos vinculados a contactos incompletos.', focus: 'el expediente del proveedor',
      stories: {
        emily: 'Emily registra al tostador y las cafeterías conocen contacto y condiciones.',
        juanito: 'Juanito captura días de entrega y crédito para que la compra también pueda planearse.',
        camila: 'Camila formaliza a proveedores de marca y el equipo deja de depender de su agenda personal.',
      },
    }),
    control({
      id: 'inventory-provider-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Elige los datos visibles del directorio de abastecimiento.',
      behavior: 'Organiza categoría, contacto, condiciones, estado y unidad atendida.',
      whenToUse: 'Úsalo antes de comparar o depurar proveedores.',
      result: 'Hace visibles criterios de compra más allá del nombre.', focus: 'la comparación de proveedores',
      stories: {
        emily: 'Emily muestra producto atendido, sucursal y contacto para resolver faltantes rápido.',
        juanito: 'Juanito coloca crédito, entrega y estado para decidir con información comparable.',
        camila: 'Camila muestra marca y condiciones para elegir quién surte cada refacción.',
      },
    }),
    control({
      id: 'inventory-provider-filters', emoji: '🔎', kind: 'Filtros', title: 'Buscar y segmentar proveedores',
      purpose: 'Encuentra proveedores por nombre, categoría, estado o unidad.',
      behavior: 'Acota el catálogo sin modificar expedientes.',
      whenToUse: 'Úsalo al preparar una compra o revisar alternativas.',
      result: 'Reduce decisiones basadas únicamente en memoria o costumbre.', focus: 'la selección del proveedor adecuado',
      stories: {
        emily: 'Emily filtra proveedores de leche y compara quién puede abastecer una cafetería específica.',
        juanito: 'Juanito encuentra los activos con crédito antes de comprometer efectivo.',
        camila: 'Camila filtra por marca y localiza la opción correcta para la pieza solicitada.',
      },
    }),
    control({
      id: 'inventory-provider-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Editar, portal y estado',
      purpose: 'Actualiza información, administra acceso externo y controla disponibilidad.',
      behavior: 'Las acciones conservan historial y aplican permisos o confirmaciones según el cambio.',
      whenToUse: 'Úsalas cuando cambien condiciones o termine la relación.',
      result: 'Mantiene vigente la red de abastecimiento.', focus: 'la vigencia de proveedores',
      stories: {
        emily: 'Emily actualiza al contacto y sus gerentes dejan de escribir a una persona anterior.',
        juanito: 'Juanito modifica el plazo aprobado y los siguientes pedidos usan la condición vigente.',
        camila: 'Camila habilita el portal al proveedor y la recepción deja de depender de mensajes.',
      },
    }),
  ],
  'purchase-orders': [
    control({
      id: 'purchase-order-create', emoji: '➕', kind: 'Botón de acción', title: 'Nueva orden de compra',
      purpose: 'Solicita productos a un proveedor con cantidades, costos, destino y fechas.',
      behavior: 'Abre el formulario y crea el documento que después se recibe y compara.',
      whenToUse: 'Úsalo cuando la necesidad y el proveedor estén aprobados.',
      result: 'Evita compras por mensaje sin cantidades, precio ni destino confirmados.', focus: 'el compromiso formal de compra',
      stories: {
        emily: 'Emily crea una orden de insumos para el almacén central y define qué cafeterías serán abastecidas.',
        juanito: 'Juanito registra cantidad y costo antes de comprar; puede medir pedido contra recibido y pagado.',
        camila: 'Camila envía una orden con números de parte y evita que el proveedor interprete una lista informal.',
      },
    }),
    control({
      id: 'supplier-portal', emoji: '🔑', kind: 'Botón de acceso', title: 'Portal proveedor',
      purpose: 'Configura un canal limitado para confirmar y entregar información de las órdenes.',
      behavior: 'Administra acceso sin compartir permisos internos de compras o inventario.',
      whenToUse: 'Úsalo con proveedores recurrentes que participan en el seguimiento.',
      result: 'Reduce confirmaciones dispersas y conserva evidencia de respuesta.', focus: 'la colaboración controlada con proveedores',
      stories: {
        emily: 'Emily permite al proveedor confirmar el pedido y sus gerentes ven la misma fecha de entrega.',
        juanito: 'Juanito cuenta órdenes confirmadas y pendientes sin revisar correos individuales.',
        camila: 'Camila conserva la relación cercana, pero el proveedor confirma piezas en un canal visible para el equipo.',
      },
    }),
    control({
      id: 'purchase-order-receive', emoji: '📥', kind: 'Acción del registro', title: 'Recibir mercancía',
      purpose: 'Compara lo entregado contra lo ordenado y actualiza inventario.',
      behavior: 'Registra cantidades recibidas, faltantes, fechas y almacén destino.',
      whenToUse: 'Úsalo al revisar físicamente la entrega.',
      result: 'Evita pagar o almacenar mercancía que no coincide con el pedido.', focus: 'la recepción contra orden',
      stories: {
        emily: 'Emily registra faltantes de insumos y el stock solo aumenta por lo realmente recibido.',
        juanito: 'Juanito compara ordenado, recibido y pendiente; cada diferencia queda cuantificada.',
        camila: 'Camila valida números de parte antes de aceptar y detecta una pieza incorrecta.',
      },
    }),
    control({
      id: 'purchase-order-filters-actions', emoji: '🛠️', kind: 'Consulta y seguimiento', title: 'Filtrar, consultar y administrar órdenes',
      purpose: 'Encuentra compras por proveedor, estado, fecha o almacén y abre su expediente.',
      behavior: 'Los filtros acotan; las acciones muestran detalle, recepción, factura y seguimiento disponible.',
      whenToUse: 'Úsalo para revisar retrasos, faltantes y compras aún no facturadas.',
      result: 'Mantiene conectados pedido, recepción, inventario y pago.', focus: 'el seguimiento de la compra',
      stories: {
        emily: 'Emily filtra órdenes atrasadas y sabe qué cafeterías podrían quedarse sin insumos.',
        juanito: 'Juanito abre una orden y reconcilia pedido, recepción y factura antes de autorizar pago.',
        camila: 'Camila encuentra órdenes con piezas pendientes y da una respuesta concreta al mostrador.',
      },
    }),
  ],
  discounts: [
    control({
      id: 'inventory-discount-create', emoji: '🏷️', kind: 'Política comercial de producto', title: 'Crear descuento o promoción',
      purpose: 'Define desde el catálogo qué productos, categorías o clientes reciben una condición comercial.',
      behavior: 'Configura valor, vigencia, alcance, prioridad y autorización antes de publicar la regla a los canales de venta.',
      whenToUse: 'Úsalo antes de habilitar una promoción para POS, Ventas, catálogo público o kioscos.',
      result: 'Una sola regla gobierna todos los canales sin permitir que cada terminal invente descuentos.',
      focus: 'la política comercial asociada al producto',
      stories: {
        emily: 'Emily crea una promoción para bebidas seleccionadas y decide en qué cafeterías y canales estará disponible.',
        juanito: 'Juanito revisa costo y margen antes de publicar el descuento para POS y Ventas.',
        camila: 'Camila habilita una condición para familias de refacciones sin configurarla caja por caja.',
      },
    }),
    control({
      id: 'inventory-discount-channels', emoji: '📡', kind: 'Publicación por canal', title: 'Habilitar en POS, Ventas y kioscos',
      purpose: 'Controla qué canales pueden consultar y aplicar cada regla aprobada.',
      behavior: 'Publica la misma definición comercial con alcance por empresa, unidad, negocio, almacén y canal.',
      whenToUse: 'Úsalo cuando una promoción no deba operar igual en mostrador, venta asistida o autoservicio.',
      result: 'POS y Ventas consumen reglas vigentes sin administrar copias independientes.',
      focus: 'la distribución controlada de promociones',
      stories: {
        emily: 'Emily publica una promoción en POS y self-checkout, pero no en pedidos corporativos.',
        juanito: 'Juanito activa una regla para tiendas concretas y evita diferencias de precio entre terminales.',
        camila: 'Camila permite el descuento en venta asistida y exige autorización cuando se solicita desde mostrador.',
      },
    }),
    control({
      id: 'inventory-discount-governance', emoji: '🛡️', kind: 'Vigencia y autorización', title: 'Controlar margen, combinación y aprobación',
      purpose: 'Protege el margen al definir límites, reglas combinables y responsables de autorización.',
      behavior: 'Valida la regla contra precio, costo y otras promociones antes de permitir su uso operativo.',
      whenToUse: 'Úsalo para descuentos manuales, promociones acumulables o condiciones especiales de cliente.',
      result: 'Los canales aplican solamente condiciones vigentes y autorizadas.',
      focus: 'la protección del margen y la trazabilidad',
      stories: {
        emily: 'Emily impide combinar dos promociones que dejarían una bebida por debajo del margen permitido.',
        juanito: 'Juanito exige aprobación para excepciones y conserva quién autorizó cada aplicación.',
        camila: 'Camila establece un máximo por familia y deja de autorizar descuentos por mensajes informales.',
      },
    }),
  ],
};
