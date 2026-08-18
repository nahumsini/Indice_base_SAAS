import { createLearningModeControl, type LearningModeControl } from '../../../learningMode';

export type PointOfSaleLearningTabId = 'sale' | 'cortes' | 'clientes' | 'kpis' | 'kiosks' | 'cajas';

const control = createLearningModeControl;

export const pointOfSaleLearningLabels: Record<PointOfSaleLearningTabId, string> = {
  sale: 'Terminal de venta',
  cortes: 'Cortes de caja',
  clientes: 'Clientes',
  kpis: 'KPIs de punto de venta',
  kiosks: 'Kioscos de punto de venta',
  cajas: 'Administración de cajas',
};

export const pointOfSaleLearningControls: Record<PointOfSaleLearningTabId, readonly LearningModeControl[]> = {
  cajas: [
    control({
      id: 'pos-register-management', emoji: '🏪', kind: 'Administración operativa', title: 'Administrar cajas por almacén',
      purpose: 'Asegura que cada almacén tenga capacidad de abrir turnos y permite agregar cajas para operación simultánea.',
      behavior: 'Muestra almacenes, cajas, disponibilidad y responsables con turno abierto sin perder la trazabilidad de inventario.',
      whenToUse: 'Úsalo al inaugurar una sucursal, agregar una terminal o corregir la asignación de una caja.',
      result: 'Cada usuario abre una sola caja a la vez y cada caja conserva un único responsable activo.', focus: 'la capacidad operativa por almacén',
      stories: {
        emily: 'Emily prepara una caja adicional cuando una cafetería agrega un segundo mostrador.',
        juanito: 'Juanito ve qué almacén todavía no tiene caja y la deja lista antes de iniciar la jornada.',
        camila: 'Camila corrige la asignación de una caja sin perder la trazabilidad de los turnos históricos.',
      },
    }),
  ],
  kiosks: [
    control({
      id: 'pos-kiosk-management', emoji: '🖥️', kind: 'Administración de extensiones', title: 'Configurar kioscos POS',
      purpose: 'Vincula pantallas de cliente y autoservicio con una caja y alcance operativo concretos.',
      behavior: 'Crea enlaces de una sola exhibición, permite rotarlos y controla activación o revocación con auditoría.',
      whenToUse: 'Úsalo al instalar una pantalla, publicar autoservicio o retirar un dispositivo.',
      result: 'Mantiene cada extensión vinculada a la caja correcta y evita enlaces permanentes fuera de control.',
      focus: 'la operación segura de kioscos',
      stories: {
        emily: 'Emily asigna un kiosco por cafetería y rota el enlace cuando cambia la tableta del mostrador.',
        juanito: 'Juanito publica un pre-ticket sin permitir que el kiosco cobre o descuente inventario por sí solo.',
        camila: 'Camila desactiva una pantalla retirada y conserva la trazabilidad de la caja que atendía.',
      },
    }),
  ],
  sale: [
    control({
      id: 'pos-open-shift', emoji: '🔓', kind: 'Inicio de operación', title: 'Abrir turno y elegir caja',
      purpose: 'Asigna caja, almacén, cajero, moneda y fondo inicial antes de vender.',
      behavior: 'Valida el contexto operativo y habilita la terminal únicamente con un turno abierto.',
      whenToUse: 'Úsalo al iniciar la jornada o entregar la caja a otra persona.',
      result: 'Evita ventas sin responsable y diferencias que no pertenecen a un turno definido.', focus: 'la responsabilidad del turno',
      stories: {
        emily: 'Emily abre un turno por caja y gerente. Cada cafetería puede explicar quién recibió y entregó el efectivo.',
        juanito: 'Juanito registra fondo inicial y moneda antes de vender; el corte tiene un punto de partida verificable.',
        camila: 'Camila asigna la caja de mostrador al responsable del día y deja de compartirla sin registro entre familiares.',
      },
    }),
    control({
      id: 'pos-product-search', emoji: '🔎', kind: 'Función de venta', title: 'Buscar, escanear y agregar productos',
      purpose: 'Encuentra artículos por nombre, código o categoría y los incorpora al ticket.',
      behavior: 'Consulta disponibilidad, precio y configuración antes de sumar el producto al carrito.',
      whenToUse: 'Úsalo durante cada venta y valida la variante correcta antes de cobrar.',
      result: 'Reduce errores de precio, producto y existencia.', focus: 'la captura correcta del ticket',
      stories: {
        emily: 'Emily usa productos rápidos para bebidas frecuentes y búsqueda para variantes especiales. La fila avanza sin sacrificar precisión.',
        juanito: 'Juanito escanea códigos y confirma precio y existencia; el inventario baja por el producto realmente vendido.',
        camila: 'Camila busca por código de pieza y evita entregar una refacción parecida pero incompatible.',
      },
    }),
    control({
      id: 'pos-ticket-actions', emoji: '🧾', kind: 'Funciones del ticket', title: 'Cantidad, descuento, suspender y recuperar',
      purpose: 'Ajusta partidas y conserva una venta cuando el cliente necesita una pausa.',
      behavior: 'Permite cambiar cantidad, aplicar descuentos autorizados, eliminar partidas o guardar y recuperar pre-tickets.',
      whenToUse: 'Úsalo antes del cobro y conserva siempre el motivo de cambios sensibles.',
      result: 'Evita rehacer ventas y aplicar ajustes fuera de las reglas.', focus: 'el control del ticket antes del cobro',
      stories: {
        emily: 'Emily suspende un pedido grande mientras confirma existencias y atiende al siguiente cliente sin perder el ticket.',
        juanito: 'Juanito aplica descuentos desde reglas y puede medir cuánto margen cedió realmente.',
        camila: 'Camila ajusta la cantidad de piezas en el mismo ticket y evita notas separadas en el mostrador.',
      },
    }),
    control({
      id: 'pos-payment', emoji: '💳', kind: 'Botones de cobro', title: 'Cobrar y elegir método de pago',
      purpose: 'Registra efectivo, tarjeta, transferencia, crédito o pago mixto contra el total del ticket.',
      behavior: 'Valida importes, calcula cambio, registra referencias y finaliza la venta con comprobante.',
      whenToUse: 'Úsalo después de confirmar productos, cliente, impuestos y descuentos.',
      result: 'Alinea venta, caja, cartera e inventario en una sola operación.', focus: 'el cierre correcto de la venta',
      stories: {
        emily: 'Emily cobra un pedido con tarjeta y el ticket queda asociado a la cafetería y turno correctos.',
        juanito: 'Juanito usa pago mixto cuando corresponde; ya no fuerza toda la venta a un método que distorsiona el corte.',
        camila: 'Camila cobra una parte y manda el saldo autorizado a crédito sin llevar cuentas aparte.',
      },
    }),
    control({
      id: 'pos-shift-actions', emoji: '🛠️', kind: 'Acciones del turno', title: 'Movimientos, devoluciones, pantalla y cierre',
      purpose: 'Administra efectivo no relacionado con ventas, devoluciones, pantalla de cliente y final del turno.',
      behavior: 'Cada acción abre un flujo específico con validaciones, motivo y evidencia.',
      whenToUse: 'Úsalas solo para el evento que representan; no ajustes el saldo para hacerlo coincidir.',
      result: 'Conserva una historia explicable de todo lo que afectó la caja.', focus: 'los eventos extraordinarios del turno',
      stories: {
        emily: 'Emily registra un retiro de efectivo y después cierra el turno; la diferencia no aparece como venta faltante.',
        juanito: 'Juanito documenta devoluciones y movimientos por separado para que las cifras conserven su significado.',
        camila: 'Camila registra una devolución con la venta original y evita compensarla con una entrega informal.',
      },
    }),
  ],
  cortes: [
    control({
      id: 'closing-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Define qué datos de los cierres aparecen en la tabla.',
      behavior: 'Muestra, oculta y ordena almacén, caja, responsable, esperado, declarado y diferencia.',
      whenToUse: 'Úsalo para preparar una auditoría o revisión de responsables.',
      result: 'Hace visibles los datos que explican cada diferencia.', focus: 'la lectura de cortes',
      stories: {
        emily: 'Emily muestra cafetería, cajero y diferencia para comparar cierres con el mismo criterio.',
        juanito: 'Juanito deja esperado, declarado y diferencia juntos; detecta dónde investigar sin recalcular.',
        camila: 'Camila muestra responsable y caja para hablar con la persona correcta.',
      },
    }),
    control({
      id: 'closing-refresh', emoji: '🔄', kind: 'Botón de acción', title: 'Actualizar',
      purpose: 'Consulta nuevamente los cierres y refleja cambios recientes.',
      behavior: 'Recarga la fuente sin borrar filtros ni modificar registros.',
      whenToUse: 'Úsalo después de cerrar un turno o corregir información relacionada.',
      result: 'Evita revisar una versión anterior del corte.', focus: 'la vigencia de los cierres',
      stories: {
        emily: 'Emily actualiza después del cierre nocturno y revisa cifras recién consolidadas.',
        juanito: 'Juanito confirma la hora de actualización antes de comparar totales.',
        camila: 'Camila refresca la vista después de que el encargado entrega su caja.',
      },
    }),
    control({
      id: 'closing-print', emoji: '🖨️', kind: 'Botón de acción', title: 'Imprimir reporte',
      purpose: 'Genera un reporte con el alcance y los datos visibles del análisis.',
      behavior: 'Prepara la versión imprimible para revisión o archivo.',
      whenToUse: 'Úsalo después de validar filtros y diferencias.',
      result: 'Comparte una sola versión del cierre sin copiar cifras manualmente.', focus: 'la evidencia del corte',
      stories: {
        emily: 'Emily imprime el resumen semanal validado para revisar acuerdos con sus gerentes.',
        juanito: 'Juanito conserva el reporte del periodo y compara acciones contra resultados.',
        camila: 'Camila revisa el documento con su familia usando las mismas cifras.',
      },
    }),
    control({
      id: 'closing-filters-views', emoji: '🔎', kind: 'Filtros y vistas', title: 'Filtrar, ver tabla o agrupar por día',
      purpose: 'Acota cierres y cambia entre detalle tabular y lectura diaria.',
      behavior: 'Aplica periodo, caja, almacén, responsable y estado sin duplicar datos.',
      whenToUse: 'Usa tabla para expediente y vista diaria para tendencia.',
      result: 'Distingue una diferencia aislada de un patrón repetido.', focus: 'la investigación de diferencias',
      stories: {
        emily: 'Emily agrupa por día y descubre que una cafetería falla siempre en el cambio de turno.',
        juanito: 'Juanito filtra una caja y compara sus diferencias sin mezclar otras operaciones.',
        camila: 'Camila abre el detalle del día en que faltó efectivo y revisa al responsable.',
      },
    }),
  ],
  clientes: [
    control({
      id: 'customer-columns', emoji: '🧩', kind: 'Botón de configuración', title: 'Columnas',
      purpose: 'Elige qué datos de clientes aparecen en el directorio.',
      behavior: 'Organiza contacto, datos fiscales, responsable, segmento y relación comercial.',
      whenToUse: 'Úsalo para adaptar la tabla a venta, facturación o seguimiento.',
      result: 'Permite atender sin abrir cada expediente.', focus: 'la lectura del directorio de clientes',
      stories: {
        emily: 'Emily muestra empresa, contacto y cafetería responsable para conservar una atención consistente.',
        juanito: 'Juanito deja visibles teléfono, datos fiscales y saldo para validar completitud.',
        camila: 'Camila coloca cliente, vehículo y teléfono para que el mostrador entienda el contexto.',
      },
    }),
    control({
      id: 'customer-import', emoji: '📥', kind: 'Botón de acción', title: 'Importar contactos',
      purpose: 'Incorpora una base existente con validación de columnas y duplicados.',
      behavior: 'Procesa el archivo y reporta qué filas entraron o requieren corrección.',
      whenToUse: 'Úsalo al migrar clientes autorizados desde otra fuente.',
      result: 'Acelera la carga sin multiplicar errores.', focus: 'la migración controlada de clientes',
      stories: {
        emily: 'Emily importa clientes corporativos y asigna responsables por región.',
        juanito: 'Juanito compara registros aceptados, rechazados y duplicados antes de terminar.',
        camila: 'Camila convierte los contactos del teléfono en un directorio que todo el equipo puede usar.',
      },
    }),
    control({
      id: 'customer-create', emoji: '➕', kind: 'Botón de acción', title: 'Crear contacto',
      purpose: 'Registra a la persona o empresa con los datos necesarios para vender y dar seguimiento.',
      behavior: 'Abre el formulario y crea un expediente compartido.',
      whenToUse: 'Úsalo cuando el cliente sea nuevo o no exista un registro verificable.',
      result: 'Evita ventas anónimas y datos dispersos.', focus: 'el expediente comercial del cliente',
      stories: {
        emily: 'Emily registra al responsable de compras de una oficina y cualquier gerente puede atenderlo.',
        juanito: 'Juanito captura datos fiscales desde el inicio para evitar problemas al facturar.',
        camila: 'Camila guarda teléfono, vehículo y piezas habituales para no preguntar lo mismo en cada visita.',
      },
    }),
    control({
      id: 'customer-actions', emoji: '🛠️', kind: 'Acciones del registro', title: 'Consultar, editar y relacionar',
      purpose: 'Mantiene el expediente y conecta al cliente con oportunidades, cotizaciones y ventas.',
      behavior: 'Las acciones abren detalle, permiten correcciones y crean flujos relacionados según permisos.',
      whenToUse: 'Úsalas cuando cambien datos o comience una nueva interacción.',
      result: 'Conserva una historia continua del cliente.', focus: 'la continuidad de la relación comercial',
      stories: {
        emily: 'Emily revisa el historial antes de atender una cuenta corporativa y evita repetir preguntas.',
        juanito: 'Juanito actualiza datos en una sola ficha y sus reportes dejan de fragmentar al mismo cliente.',
        camila: 'Camila abre la ficha y el vendedor continúa la conversación aunque ella no esté.',
      },
    }),
  ],
  kpis: [
    control({
      id: 'pos-kpi-filters', emoji: '📅', kind: 'Filtros ejecutivos', title: 'Periodo, tienda, caja y responsable',
      purpose: 'Define el alcance de la lectura del punto de venta.',
      behavior: 'Recalcula tarjetas, señales, métodos de pago y cortes con el mismo contexto.',
      whenToUse: 'Úsalo antes de comparar ventas o diferencias.',
      result: 'Evita mezclar turnos, tiendas o periodos distintos.', focus: 'el alcance del análisis comercial',
      stories: {
        emily: 'Emily compara cafeterías durante el mismo periodo y detecta diferencias operativas reales.',
        juanito: 'Juanito confirma tienda, caja y fecha antes de confiar en el total.',
        camila: 'Camila filtra el mostrador principal para separar sus resultados del almacén.',
      },
    }),
    control({
      id: 'pos-kpi-sales', emoji: '📈', kind: 'Lectura ejecutiva', title: 'Ventas, tickets y métodos de pago',
      purpose: 'Resume ingreso, volumen, ticket promedio y mezcla de cobro.',
      behavior: 'Conecta indicadores con el contexto filtrado y señala cambios relevantes.',
      whenToUse: 'Úsalo para revisar desempeño y comportamiento del cliente.',
      result: 'Convierte transacciones en preguntas comerciales accionables.', focus: 'las señales de venta',
      stories: {
        emily: 'Emily detecta una caída del ticket promedio en una cafetería y revisa mezcla de productos.',
        juanito: 'Juanito separa crecimiento de tickets y crecimiento de precio para entender el resultado.',
        camila: 'Camila observa qué método usan los talleres y prepara mejor su operación de cobro.',
      },
    }),
    control({
      id: 'pos-kpi-closings', emoji: '💵', kind: 'Lectura operativa', title: 'Cierres y diferencias de caja',
      purpose: 'Relaciona ventas esperadas, efectivo declarado y variaciones por turno.',
      behavior: 'Muestra cierres del periodo y permite identificar cajas o responsables con diferencias.',
      whenToUse: 'Úsalo diariamente y antes de consolidar resultados.',
      result: 'Detecta problemas de ejecución antes de que se vuelvan costumbre.', focus: 'la disciplina de cierre',
      stories: {
        emily: 'Emily descubre que las diferencias ocurren en un cambio de turno específico y ajusta el proceso.',
        juanito: 'Juanito relaciona cada diferencia con caja y responsable; el total deja de ser anónimo.',
        camila: 'Camila revisa el cierre con su encargado usando registros, no recuerdos.',
      },
    }),
    control({
      id: 'pos-kpi-print', emoji: '🖨️', kind: 'Botón de acción', title: 'Imprimir reporte',
      purpose: 'Genera una versión compartible del análisis visible.',
      behavior: 'Prepara el reporte con el periodo y contexto aplicados.',
      whenToUse: 'Úsalo después de validar filtros y comprender señales.',
      result: 'Conserva evidencia de la revisión sin recapturar cifras.', focus: 'el reporte operativo compartido',
      stories: {
        emily: 'Emily comparte el reporte semanal validado con sus gerentes.',
        juanito: 'Juanito archiva el reporte y puede medir si sus decisiones mejoraron el siguiente periodo.',
        camila: 'Camila revisa el documento con el equipo usando una sola versión de los resultados.',
      },
    }),
  ],
};
