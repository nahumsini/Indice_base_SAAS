package com.indice.erp.training;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class TrainingExamQuestionBank {

    private static final Map<String, List<Question>> BANKS = buildBanks();

    private TrainingExamQuestionBank() {}

    static List<Question> bank(String examCode) {
        var bank = BANKS.get(examCode);
        if (bank == null) throw new IllegalArgumentException("La evaluación solicitada no existe.");
        return bank;
    }

    static Question find(String questionCode) {
        return BANKS.values().stream().flatMap(List::stream)
            .filter(question -> question.code().equals(questionCode))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("La pregunta de evaluación no existe."));
    }

    static List<String> moduleExamCodes() {
        return List.copyOf(BANKS.keySet());
    }

    private static Map<String, List<Question>> buildBanks() {
        var banks = new LinkedHashMap<String, List<Question>>();
        banks.put("indice", indice());
        banks.put("rh", humanResources());
        banks.put("procesos", processes());
        banks.put("finanzas", finance());
        banks.put("ventas", sales());
        banks.put("kpis", kpis());
        banks.put("comercial", consulting());
        return Map.copyOf(banks);
    }

    private static List<Question> indice() {
        return List.of(
            q("indice.q01", "Una empresa nueva solicita indicadores sin haber definido estructura. ¿Qué debe hacerse primero?", "Configurar empresa, unidades, responsables y permisos", "Elegir colores para el dashboard", "Importar cualquier hoja disponible"),
            q("indice.q02", "¿Cuál expresa mejor la propuesta central de Índice?", "Conectar personas, procesos, productos y finanzas para operar con claridad", "Reemplazar toda decisión humana con automatizaciones", "Concentrar únicamente la contabilidad"),
            q("indice.q03", "¿Qué diferencia a Índice de una herramienta administrativa pasiva?", "Conecta captura, control y decisión con acompañamiento", "Tiene más pantallas y tablas", "Obliga a usar todos los módulos"),
            q("indice.q04", "¿Para qué sirve el perfil empresarial durante una consultoría?", "Aporta contexto para adaptar estructura, módulos y recomendaciones", "Define automáticamente todos los precios", "Sustituye la entrevista con el dueño"),
            q("indice.q05", "¿Qué debe representar una unidad de negocio?", "Una parte operativa que necesita responsables y lectura propia", "Cualquier etiqueta usada para decorar reportes", "Cada usuario que entra al sistema"),
            q("indice.q06", "¿Por qué deben configurarse permisos antes de operar?", "Para que cada persona vea y ejecute solo lo correspondiente", "Para aumentar el número de usuarios cobrados", "Para impedir que los empleados usen el sistema"),
            q("indice.q07", "Un cliente quiere compartir una cuenta administrativa entre todo el equipo. ¿Qué recomiendas?", "Crear usuarios individuales con permisos acordes a su responsabilidad", "Compartirla y cambiar la contraseña mensualmente", "Usar la cuenta únicamente desde una computadora"),
            q("indice.q08", "¿Qué debe hacer un consultor antes de interpretar un KPI del panel?", "Confirmar periodo, unidad, moneda y fuente de información", "Compararlo con cualquier cifra histórica", "Exportarlo para revisarlo fuera del sistema"),
            q("indice.q09", "¿Cuál es el propósito del diagnóstico de madurez empresarial?", "Identificar prioridades y brechas antes de recomendar una implementación", "Asignar una calificación pública al cliente", "Determinar cuántos empleados deben despedirse"),
            q("indice.q10", "¿Qué relación correcta existe entre módulos y pilares?", "Los módulos ejecutan y conectan necesidades de los cuatro pilares", "Cada módulo pertenece a una empresa distinta", "Los pilares reemplazan la configuración modular"),
            q("indice.q11", "Si una empresa tiene información dispersa, ¿cuál es el primer valor que debe demostrar Índice?", "Una versión común y trazable de la operación", "Un catálogo con todas las funciones disponibles", "Un reporte financiero sin configurar"),
            q("indice.q12", "¿Qué significa visibilidad dentro del modelo Índice?", "Entender qué ocurre y con qué evidencia", "Permitir acceso total a todos", "Mostrar la mayor cantidad posible de gráficas"),
            q("indice.q13", "¿Qué significa control dentro del modelo Índice?", "Definir reglas, responsables y validaciones para ejecutar", "Revisar personalmente cada actividad", "Bloquear cualquier modificación de datos"),
            q("indice.q14", "¿Qué significa decisión dentro del modelo Índice?", "Convertir datos y señales en acciones con contexto", "Aceptar automáticamente toda recomendación", "Generar reportes sin responsables"),
            q("indice.q15", "¿Cuál es una mala práctica durante la demostración inicial?", "Enumerar todos los módulos sin relacionarlos con un problema", "Confirmar el dolor principal", "Mostrar un recorrido breve y relevante"),
            q("indice.q16", "¿Qué debe explicar el consultor sobre las notificaciones?", "Que convierten eventos y pendientes en seguimiento visible", "Que reemplazan toda comunicación del equipo", "Que únicamente informan cambios de contraseña"),
            q("indice.q17", "¿Por qué la personalización de columnas es operativamente útil?", "Permite mostrar la información necesaria para la decisión actual", "Oculta definitivamente los datos no seleccionados", "Cambia los permisos del usuario"),
            q("indice.q18", "Un dueño pide comenzar cargando años de datos. ¿Cuál es la respuesta adecuada?", "Definir primero el objetivo y migrar solo lo necesario para operar", "Aceptar todo sin revisar calidad", "Negarse siempre a cualquier migración"),
            q("indice.q19", "¿Qué debe conservarse al configurar una empresa multiunidad?", "Responsabilidad y contexto separado sin perder una lectura consolidada", "Una cuenta compartida por unidad", "Inventarios mezclados para simplificar"),
            q("indice.q20", "¿Cuándo debe recomendarse un nuevo módulo?", "Cuando existe un problema y un recorrido de valor claramente identificados", "Cuando el cliente no usa el módulo anterior", "Cada vez que aparece una función nueva"),
            q("indice.q21", "¿Qué demuestra que un usuario domina la navegación?", "Puede ubicar un flujo, ejecutarlo y regresar sin perder contexto", "Memoriza el orden visual de todas las pestañas", "Conoce todos los iconos de memoria"),
            q("indice.q22", "¿Qué debe evitar el consultor al hablar del dashboard?", "Presentarlo como solución sin datos y procesos confiables", "Explicar de dónde provienen los indicadores", "Relacionarlo con decisiones"),
            q("indice.q23", "¿Cuál es la secuencia correcta del sistema?", "Capturar, controlar y decidir", "Decidir, borrar y capturar", "Reportar, vender y archivar"),
            q("indice.q24", "¿Qué hace sostenible una implementación de Índice?", "Configuración clara, adopción del equipo y acompañamiento continuo", "Una sesión extensa al inicio", "Activar todas las funciones desde el primer día"),
            q("indice.q25", "¿Cómo debe cerrar una explicación general de Índice?", "Confirmando qué problema desea ordenar primero el cliente", "Entregando inmediatamente una lista de precios", "Solicitando que el cliente elija un módulo"));
    }

    private static List<Question> humanResources() {
        return List.of(
            q("rh.q01", "¿Qué debe existir antes de controlar asistencia?", "Colaboradores, puestos, ubicaciones y horarios correctamente configurados", "La nómina del siguiente año", "Un comunicado general"),
            q("rh.q02", "¿Qué diferencia hay entre expediente laboral y acceso al sistema?", "El expediente describe la relación laboral; el acceso define permisos digitales", "Son exactamente el mismo registro", "El acceso sustituye documentos laborales"),
            q("rh.q03", "Un colaborador cambia de puesto. ¿Qué debe revisarse además del nombre del puesto?", "Responsable, área, permisos, horario y efectos operativos", "Solo su fotografía", "Únicamente su correo personal"),
            q("rh.q04", "¿Para qué sirve asignar un centro de trabajo?", "Relaciona reglas, ubicación y contexto operativo del colaborador", "Crea automáticamente una sucursal fiscal", "Elimina la necesidad de horarios"),
            q("rh.q05", "¿Qué debe comprobarse antes de afirmar que alguien llegó tarde?", "Horario vigente, zona horaria, ubicación y registro de asistencia", "El comentario de otro empleado", "La hora del reporte impreso"),
            q("rh.q06", "¿Cuál es el propósito de Control en Recursos Humanos?", "Revisar asistencia, horarios, incidencias y acciones operativas", "Calcular únicamente impuestos", "Publicar productos para empleados"),
            q("rh.q07", "¿Por qué no debe compartirse un PIN o identidad de asistencia?", "Rompe la trazabilidad de quién realizó el registro", "Consume más almacenamiento", "Cambia el horario automáticamente"),
            q("rh.q08", "¿Qué debe hacer un consultor ante registros de asistencia faltantes?", "Revisar configuración y evidencia antes de concluir que hubo ausencia", "Crear registros manuales sin explicación", "Desactivar al colaborador"),
            q("rh.q09", "¿Para qué sirven los expedientes y actas?", "Documentan eventos laborales con contexto, fechas y seguimiento", "Reemplazan contratos y leyes aplicables", "Guardan únicamente fotografías"),
            q("rh.q10", "¿Qué valor aportan los permisos laborales?", "Ordenan solicitudes, evidencia, revisión y resolución", "Conceden permisos de administrador", "Cambian el salario automáticamente"),
            q("rh.q11", "¿Cómo deben utilizarse los comunicados?", "Con audiencia, vigencia y mensaje verificable", "Como sustituto de toda capacitación", "Para compartir contraseñas"),
            q("rh.q12", "¿Qué permite controlar el módulo de activos?", "Asignación, responsable, estado y devolución de bienes", "La depreciación fiscal completa sin configuración", "La asistencia por geolocalización"),
            q("rh.q13", "¿Qué riesgo resuelve vincular activos con colaboradores?", "Evita bienes sin custodio ni historial", "Evita crear proveedores", "Elimina el inventario comercial"),
            q("rh.q14", "¿Cuándo debe registrarse una incidencia de nómina?", "Cuando existe un hecho verificable que afecta el periodo", "Después de cerrar y pagar siempre", "Solo cuando lo solicita el banco"),
            q("rh.q15", "¿Qué debe aclarar el consultor sobre nómina?", "Depende de configuración laboral, país, periodos e incidencias confiables", "Siempre produce el mismo cálculo en cualquier país", "Puede operar sin colaboradores"),
            q("rh.q16", "¿Qué función cumplen los incentivos?", "Documentan reglas, resultados y reconocimientos trazables", "Sustituyen el salario base", "Conceden acceso al módulo financiero"),
            q("rh.q17", "Un cliente reporta empleados fantasma. ¿Cuál es el primer recorrido?", "Auditar colaboradores activos, relación laboral, accesos y pagos", "Eliminar a todos los que no marcaron hoy", "Recrear la empresa"),
            q("rh.q18", "¿Qué debe mostrar una demostración de alta de colaborador?", "Datos mínimos, estructura, responsable, horario, documentos y acceso separado", "Todos los campos disponibles aunque no apliquen", "Solo nombre y teléfono"),
            q("rh.q19", "¿Por qué deben respetarse los permisos por pestaña?", "Protegen información sensible y separan responsabilidades", "Aumentan la velocidad del sistema", "Evitan usar filtros"),
            q("rh.q20", "¿Qué debe hacer un KPI de Recursos Humanos?", "Responder una pregunta operativa y conducir a una acción", "Mostrar la mayor cantidad de empleados", "Reemplazar la revisión de casos"),
            q("rh.q21", "¿Cómo se interpreta correctamente el ausentismo?", "Con periodo, población, horarios e incidencias justificadas", "Solo contando registros vacíos", "Comparando personas de empresas distintas"),
            q("rh.q22", "¿Cuándo conviene utilizar un kiosco de asistencia?", "Cuando se necesita captura controlada sin acceso administrativo completo", "Para que todos gestionen nómina", "Para sustituir usuarios individuales"),
            q("rh.q23", "¿Qué debe hacerse cuando cambia un responsable de equipo?", "Actualizar estructura y verificar permisos y flujos dependientes", "Editar únicamente un organigrama externo", "Borrar el historial del equipo"),
            q("rh.q24", "¿Cuál es una recomendación consultiva incorrecta?", "Prometer control de asistencia sin configurar horarios ni ubicaciones", "Probar el flujo con un grupo pequeño", "Definir responsables de incidencias"),
            q("rh.q25", "¿Qué resultado debe poder explicar el consultor de RH?", "Quién integra el equipo, qué debe hacer y qué requiere atención", "Cuántas pantallas tiene el módulo", "Qué color usa cada pestaña"));
    }

    private static List<Question> processes() {
        return List.of(
            q("procesos.q01", "¿Cuándo corresponde crear una tarea?", "Cuando existe una actividad concreta con responsable y fecha", "Cuando se necesita modelar toda la empresa", "Cuando no existe un resultado esperado"),
            q("procesos.q02", "¿Cuándo corresponde crear un proyecto?", "Cuando existe un objetivo temporal con varias actividades relacionadas", "Para cualquier actividad repetitiva diaria", "Para almacenar documentos sin responsables"),
            q("procesos.q03", "¿Cuándo corresponde crear un proceso?", "Cuando un recorrido debe repetirse con etapas y reglas consistentes", "Cuando solo se necesita un recordatorio personal", "Cuando el trabajo no tiene orden conocido"),
            q("procesos.q04", "¿Qué elementos mínimos necesita una tarea útil?", "Responsable, resultado, prioridad y fecha", "Color, emoji y comentario", "Únicamente un título"),
            q("procesos.q05", "¿Para qué sirve la evidencia en una tarea?", "Demuestra qué se hizo y permite revisar el resultado", "Sustituye al responsable", "Cierra automáticamente cualquier proceso"),
            q("procesos.q06", "¿Qué debe evitarse al crear tareas?", "Instrucciones ambiguas sin resultado verificable", "Asignar una fecha", "Definir prioridad"),
            q("procesos.q07", "¿Qué diferencia una etapa de proceso de una lista informal?", "Tiene criterio de avance, responsable y relación con el siguiente paso", "Usa más texto", "Solo puede verse en calendario"),
            q("procesos.q08", "Un proceso se retrasa siempre en la misma etapa. ¿Qué debe revisar el consultor?", "Carga, responsable, entrada requerida y criterio de salida", "El color de la tarjeta", "La contraseña del creador"),
            q("procesos.q09", "¿Para qué sirve la vista de calendario?", "Ubica trabajo y vencimientos en el tiempo", "Define permisos financieros", "Sustituye proyectos y procesos"),
            q("procesos.q10", "¿Para qué sirve una vista de tablero?", "Visualiza estados y movimiento del trabajo", "Calcula nómina", "Administra cuentas contables"),
            q("procesos.q11", "¿Para qué sirve una tabla operativa?", "Compara, filtra y administra varios registros con precisión", "Evita abrir detalles", "Reemplaza toda evidencia"),
            q("procesos.q12", "¿Cuándo debe escalarse una tarea?", "Cuando el bloqueo, impacto o vencimiento exige intervención definida", "Cada vez que recibe un comentario", "Solo después de eliminarla"),
            q("procesos.q13", "¿Qué debe contener el seguimiento de una tarea?", "Avance, evidencia, bloqueo y siguiente acción", "Conversaciones sin fecha", "Solo porcentaje estimado"),
            q("procesos.q14", "¿Qué valor aporta asignar equipo a una tarea?", "Aclara participantes sin perder un responsable principal", "Hace que nadie sea responsable", "Concede permisos de administrador"),
            q("procesos.q15", "¿Qué problema resuelve un kiosco de tareas?", "Permite ejecutar o registrar trabajo sin acceso completo al sistema", "Elimina la necesidad de identidad", "Publica procesos en redes sociales"),
            q("procesos.q16", "¿Qué debe proteger un kiosco?", "Identidad, alcance, permisos y evidencia de la operación", "Solo el diseño visual", "El nombre del módulo"),
            q("procesos.q17", "¿Qué debe medir un KPI de procesos?", "Tiempo, cumplimiento, carga, bloqueos o calidad para decidir", "Número total de colores", "Cantidad de comentarios sin contexto"),
            q("procesos.q18", "Una empresa administra todo por mensajes. ¿Cuál es el primer paso?", "Elegir un flujo crítico y convertirlo en responsables, etapas y evidencia", "Importar todas las conversaciones", "Prohibir inmediatamente la mensajería"),
            q("procesos.q19", "¿Cómo debe comenzar el diseño de un proceso?", "Definiendo objetivo, entrada, resultado y responsables", "Eligiendo una plantilla por su apariencia", "Creando alertas antes de etapas"),
            q("procesos.q20", "¿Qué indica que un proceso está sobrediseñado?", "Tiene etapas o campos que no cambian control ni decisión", "Incluye responsables", "Conserva evidencia"),
            q("procesos.q21", "¿Qué debe hacer el consultor si nadie actualiza las tareas?", "Revisar claridad, carga, hábito, permisos y utilidad del seguimiento", "Agregar más campos obligatorios", "Cerrar todas las tareas"),
            q("procesos.q22", "¿Por qué una fecha límite sin responsable es insuficiente?", "No existe una persona claramente obligada a actuar", "No puede mostrarse en calendario", "No permite usar colores"),
            q("procesos.q23", "¿Qué diferencia avance de finalización?", "Avance muestra progreso; finalización confirma que se cumplió el criterio", "Son siempre el mismo estado", "Finalización solo significa que venció"),
            q("procesos.q24", "¿Qué debe mostrar una demostración consultiva de procesos?", "Un problema real convertido en ejecución, evidencia y señal de control", "Todas las configuraciones posibles", "Únicamente el formulario de creación"),
            q("procesos.q25", "¿Cuál es el resultado esperado del módulo?", "Trabajo repetible, visible y menos dependiente de memoria o mensajes", "Más reuniones para revisar pendientes", "Eliminar toda excepción operativa"));
    }

    private static List<Question> finance() {
        return List.of(
            q("finanzas.q01", "¿Qué diferencia un gasto de una cuenta por pagar?", "El gasto describe la operación; la cuenta por pagar conserva una obligación pendiente", "No existe ninguna diferencia", "La cuenta por pagar siempre está liquidada"),
            q("finanzas.q02", "¿Qué datos hacen trazable un gasto?", "Concepto, proveedor, fecha, importe, responsable, cuenta y evidencia", "Solo el importe total", "Únicamente la categoría"),
            q("finanzas.q03", "¿Cuándo debe registrarse una cuenta por pagar?", "Cuando existe una obligación que se liquidará posteriormente", "Después de pagarla por completo", "Solo cuando no existe proveedor"),
            q("finanzas.q04", "¿Para qué sirve el catálogo de proveedores?", "Mantiene identidad, condiciones y contexto reutilizable de compra y pago", "Sustituye las cuentas contables", "Autoriza cualquier gasto automáticamente"),
            q("finanzas.q05", "¿Qué riesgo reduce un kiosco de cuentas por pagar?", "Facturas dispersas y recepción sin trazabilidad", "Variaciones de tipo de cambio", "Duplicidad de usuarios internos"),
            q("finanzas.q06", "¿Qué relación existe entre presupuesto y gasto real?", "El presupuesto establece expectativa y el gasto permite medir ejecución y desviación", "El presupuesto reemplaza todos los gastos", "El gasto modifica siempre el presupuesto original"),
            q("finanzas.q07", "¿Qué debe revisar el consultor ante una desviación presupuestal?", "Periodo, alcance, concepto, responsable, causa y recurrencia", "Solo el porcentaje general", "Únicamente el proveedor más grande"),
            q("finanzas.q08", "¿Para qué sirven las cuentas contables?", "Clasifican movimientos de forma consistente para análisis e informes", "Guardan contraseñas bancarias", "Definen horarios de pago"),
            q("finanzas.q09", "¿Para qué sirven las cuentas de pago?", "Identifican desde dónde se liquida o recibe dinero", "Sustituyen a proveedores", "Crean automáticamente presupuestos"),
            q("finanzas.q10", "¿Qué debe evitarse al crear categorías financieras?", "Duplicados ambiguos que fragmentan el análisis", "Nombres claros", "Una estructura consistente"),
            q("finanzas.q11", "¿Qué necesita un fondo de caja chica?", "Responsable, moneda, límites, propósito y saldo inicial", "Solo un nombre", "Una cuenta compartida por todos"),
            q("finanzas.q12", "¿Por qué cada entrada de caja chica debe registrarse?", "Para reconstruir el origen del saldo", "Para convertirla en venta", "Para evitar usar comprobantes"),
            q("finanzas.q13", "¿Por qué cada salida de caja chica necesita evidencia?", "Para explicar importe, propósito y responsable", "Para aumentar el saldo", "Para cambiar la moneda"),
            q("finanzas.q14", "¿Qué significa conciliar un fondo?", "Comparar movimientos, evidencia y saldo para explicar diferencias", "Ajustar el número hasta que coincida", "Eliminar gastos rechazados"),
            q("finanzas.q15", "¿Cuándo debe reponerse un fondo?", "Después de revisar movimientos y comprobaciones según la política", "Cada vez que baja el saldo", "Antes de registrar gastos"),
            q("finanzas.q16", "¿Qué debe conservar un estado de caja chica?", "Periodo, saldos, movimientos, diferencias y estado de revisión", "Solo saldo final", "Únicamente tickets aprobados"),
            q("finanzas.q17", "El efectivo contado no coincide. ¿Cuál es el primer paso?", "Reconstruir entradas, salidas, pendientes y evidencias", "Editar directamente el saldo", "Crear un fondo nuevo"),
            q("finanzas.q18", "¿Qué diferencia una compra de un pago?", "La compra crea la operación; el pago liquida total o parcialmente la obligación", "Siempre ocurren al mismo tiempo", "El pago crea inventario sin compra"),
            q("finanzas.q19", "¿Por qué impuestos y moneda deben configurarse con contexto?", "Afectan importes, comparabilidad y reportes", "Solo cambian el diseño", "No influyen en ningún cálculo"),
            q("finanzas.q20", "¿Qué debe hacer un KPI financiero?", "Conectar un resultado con su causa y una decisión", "Mostrar todos los movimientos sin filtros", "Ocultar las variaciones pequeñas"),
            q("finanzas.q21", "¿Qué error comete quien suma fondos de monedas diferentes?", "Genera un total no comparable sin conversión y contexto", "Duplica proveedores", "Elimina los impuestos"),
            q("finanzas.q22", "¿Cómo debe tratarse un comprobante rechazado?", "Con estado, motivo y seguimiento visible", "Eliminándolo sin historial", "Aprobándolo para cerrar el periodo"),
            q("finanzas.q23", "¿Qué debe mostrar una demostración de control financiero?", "El recorrido desde registro y evidencia hasta revisión y decisión", "Solo el total del dashboard", "Únicamente la creación de proveedores"),
            q("finanzas.q24", "¿Cuándo debe escalar un consultor un tema financiero?", "Cuando requiere criterio contable, fiscal o legal fuera del uso del sistema", "Nunca, porque Índice reemplaza al contador", "Cada vez que se registra un gasto"),
            q("finanzas.q25", "¿Cuál es el resultado esperado de Finanzas en Índice?", "Movimientos explicables, obligaciones visibles y decisiones con contexto", "Eliminar toda variación", "Automatizar cualquier autorización"));
    }

    private static List<Question> sales() {
        return List.of(
            q("ventas.q01", "¿Qué diferencia un contacto de una oportunidad?", "El contacto identifica a la persona; la oportunidad representa una posibilidad comercial", "Son el mismo registro", "La oportunidad solo existe después del pago"),
            q("ventas.q02", "¿Qué debe registrar el origen de una oportunidad?", "El canal o esfuerzo que produjo el prospecto", "El color de la etapa", "La cuenta bancaria del cliente"),
            q("ventas.q03", "¿Qué hace operativa una oportunidad?", "Responsable, etapa, valor, próxima acción y fecha", "Solo nombre del cliente", "Una cotización sin seguimiento"),
            q("ventas.q04", "¿Qué indica una oportunidad sin siguiente acción?", "Riesgo de estancamiento y falta de seguimiento", "Cierre automático", "Que ya fue cobrada"),
            q("ventas.q05", "¿Para qué sirve el pipeline?", "Visualiza avance, estancamiento y carga comercial", "Sustituye contratos", "Calcula nómina"),
            q("ventas.q06", "¿Cuándo debe cambiarse la etapa de una oportunidad?", "Cuando existe evidencia de que cumplió el criterio de avance", "Al terminar cada semana", "Cuando el vendedor quiere mejorar el reporte"),
            q("ventas.q07", "¿Qué debe contener una cotización útil?", "Cliente, partidas, precios, impuestos, vigencia y condiciones", "Solo el total", "Únicamente el logotipo"),
            q("ventas.q08", "¿Qué diferencia una cotización de una venta?", "La cotización propone condiciones; la venta formaliza el acuerdo comercial", "No existe diferencia", "La venta no necesita cliente"),
            q("ventas.q09", "¿Qué debe verificarse antes de convertir una cotización?", "Aceptación, alcance, vigencia, precios y condiciones", "Solo que tenga un PDF", "Que el vendedor tenga comisión"),
            q("ventas.q10", "¿Qué debe registrar una venta?", "Cliente, productos o servicios, importes, impuestos, pago y responsable", "Solo el ingreso esperado", "Únicamente el número de contrato"),
            q("ventas.q11", "¿Cómo se relacionan venta e inventario?", "La venta puede reservar o descontar existencias según el flujo configurado", "Toda venta crea un almacén", "Nunca deben relacionarse"),
            q("ventas.q12", "¿Cuándo nace una cuenta por cobrar?", "Cuando una venta queda total o parcialmente a crédito", "Cuando se recibe pago completo", "Al crear un contacto"),
            q("ventas.q13", "¿Qué función cumple un contrato?", "Formaliza alcance, obligaciones, vigencia y condiciones acordadas", "Sustituye toda cotización", "Crea productos automáticamente"),
            q("ventas.q14", "¿Por qué las cuentas de pago importan en ventas?", "Aclaran dónde se recibe y concilia el dinero", "Definen la etapa del prospecto", "Reemplazan contactos"),
            q("ventas.q15", "¿Qué debe definir una regla de comisión?", "Base, porcentaje, condición, beneficiario y momento de pago", "Solo el nombre del vendedor", "Un monto sin relación con ventas"),
            q("ventas.q16", "¿Qué riesgo reduce un corte de comisiones?", "Pagos duplicados o sin periodo y ventas identificables", "Pérdida de inventario", "Falta de horarios"),
            q("ventas.q17", "¿Qué debe medir un KPI comercial?", "Conversión, valor, velocidad, actividad o resultado con contexto", "Número de contactos sin periodo", "Cantidad de columnas visibles"),
            q("ventas.q18", "Una empresa pierde prospectos de redes. ¿Qué implementas primero?", "Origen, responsable, etapas y siguiente acción", "Un descuento general", "Un contrato para cada contacto"),
            q("ventas.q19", "¿Qué debe hacer el consultor ante oportunidades estancadas?", "Revisar criterio de etapa, última actividad, objeción y próxima acción", "Moverlas todas a cierre", "Eliminarlas sin revisión"),
            q("ventas.q20", "¿Qué relación debe existir entre productos y cotizaciones?", "Catálogo y condiciones consistentes para evitar captura y precios improvisados", "Ninguna, todo debe escribirse manualmente", "Solo una fotografía compartida"),
            q("ventas.q21", "¿Cuándo debe registrarse la posventa?", "Desde el cierre, con compromisos, responsable y seguimiento", "Solo cuando existe una queja", "Después de vencer el contrato"),
            q("ventas.q22", "¿Qué debe mostrar una demostración de Ventas?", "El recorrido desde prospecto hasta cierre y siguiente relación", "Todas las tablas disponibles", "Solo la creación de productos"),
            q("ventas.q23", "¿Por qué no debe prometerse una conversión específica?", "Depende del proceso, oferta, ejecución y mercado del cliente", "Porque el módulo no registra ventas", "Porque no existen KPIs"),
            q("ventas.q24", "¿Qué dato permite evaluar la efectividad de una fuente?", "Oportunidades y resultados atribuibles al origen en un periodo", "Cantidad total de usuarios", "Número de contratos vencidos"),
            q("ventas.q25", "¿Cuál es el resultado esperado del módulo?", "Un proceso comercial repetible, trazable y conectado con la operación", "Enviar más mensajes sin control", "Cerrar toda oportunidad el mismo día"));
    }

    private static List<Question> kpis() {
        return List.of(
            q("kpis.q01", "¿Qué debe responder un KPI?", "Una pregunta de negocio vinculada con una decisión", "Cuántos colores usa el dashboard", "Todo lo ocurrido sin prioridad"),
            q("kpis.q02", "¿Qué debe confirmarse antes de comparar periodos?", "Mismo alcance, moneda, unidad y definición", "Que las gráficas tengan igual tamaño", "Que existan más datos en el periodo nuevo"),
            q("kpis.q03", "¿Por qué un valor aislado puede ser engañoso?", "No muestra tendencia, meta, composición ni contexto", "Siempre está redondeado", "No puede exportarse"),
            q("kpis.q04", "¿Qué diferencia un KPI de una métrica?", "El KPI representa desempeño prioritario; una métrica puede ser solo un dato", "No existe diferencia", "La métrica siempre es financiera"),
            q("kpis.q05", "¿Qué debe hacerse cuando un indicador cambia?", "Validar el dato y profundizar hasta su causa antes de actuar", "Asignar culpable inmediatamente", "Cambiar la meta"),
            q("kpis.q06", "¿Para qué sirve abrir el detalle de un KPI?", "Explica componentes, tendencia y causa probable", "Cambia el resultado", "Elimina filtros"),
            q("kpis.q07", "¿Qué hace útil una meta?", "Define resultado esperado, periodo, responsable y criterio", "Siempre debe ser más alta", "No necesita fecha"),
            q("kpis.q08", "¿Qué debe contener una acción derivada de un KPI?", "Responsable, fecha, resultado esperado y seguimiento", "Solo un comentario", "Una nueva gráfica"),
            q("kpis.q09", "¿Qué riesgo existe al mezclar monedas?", "Se genera un total no comparable sin conversión definida", "Se duplican usuarios", "Se pierden permisos"),
            q("kpis.q10", "¿Qué muestra un estado de resultados?", "Ingresos, costos, gastos y resultado de un periodo", "Activos y pasivos a una fecha", "Solo movimientos bancarios"),
            q("kpis.q11", "¿Qué muestra un balance general?", "Activos, pasivos y patrimonio a una fecha", "Ventas por vendedor", "Tareas vencidas"),
            q("kpis.q12", "¿Qué muestra el flujo de efectivo?", "Entradas, salidas y disponibilidad de efectivo", "Solo utilidad contable", "Únicamente cuentas por pagar"),
            q("kpis.q13", "¿Por qué utilidad y efectivo pueden diferir?", "Existen créditos, pagos pendientes, inversiones y movimientos no simultáneos", "Porque uno siempre está equivocado", "Por el color del reporte"),
            q("kpis.q14", "¿Cuándo debe usarse un auxiliar contable?", "Cuando se necesita explicar movimientos de una cuenta específica", "Para controlar asistencia", "Para crear oportunidades"),
            q("kpis.q15", "¿Qué debe revisarse antes de exportar un informe?", "Filtros, periodo, alcance, moneda y consistencia", "Solo el nombre del archivo", "La cantidad de páginas"),
            q("kpis.q16", "¿Para qué sirve un informe automatizado?", "Entrega información recurrente con contenido, frecuencia y destinatario definidos", "Corrige datos automáticamente", "Autoriza gastos"),
            q("kpis.q17", "¿Qué debe hacerse antes de activar una automatización?", "Ejecutar una prueba y validar contenido y destinatarios", "Enviar a toda la empresa", "Eliminar informes anteriores"),
            q("kpis.q18", "¿Qué riesgo tiene automatizar un reporte incorrecto?", "Repite y distribuye el error con mayor velocidad", "Reduce el almacenamiento", "Cambia la moneda"),
            q("kpis.q19", "El margen cae. ¿Qué análisis corresponde?", "Validar alcance y profundizar en ventas, costos, productos y unidades", "Despedir al vendedor con menos ventas", "Aumentar todos los precios sin revisar"),
            q("kpis.q20", "Las ventas suben y el efectivo baja. ¿Qué debe revisarse?", "Crédito, cobranza, inventario, pagos y capital de trabajo", "Solo cantidad de clientes", "Únicamente asistencia"),
            q("kpis.q21", "¿Qué debe hacer el consultor si la fuente de un indicador está incompleta?", "Declarar la limitación y corregir captura antes de concluir", "Presentarlo como estimación exacta", "Ocultar el indicador"),
            q("kpis.q22", "¿Qué caracteriza una alerta útil?", "Tiene condición, impacto, responsable y acción esperada", "Aparece todos los días", "Usa color rojo"),
            q("kpis.q23", "¿Qué debe evitar un dashboard ejecutivo?", "Saturación de indicadores sin prioridad ni acción", "Filtros de contexto", "Acceso al detalle"),
            q("kpis.q24", "¿Qué demuestra dominio consultivo de KPIs?", "Explicar qué cambió, por qué importa, cuál es la causa y qué hacer", "Memorizar todas las fórmulas", "Exportar todas las gráficas"),
            q("kpis.q25", "¿Cuál es el resultado esperado de KPIs?", "Decisiones reproducibles basadas en información contextualizada", "Más reportes sin responsables", "Eliminar toda incertidumbre"));
    }

    private static List<Question> consulting() {
        return List.of(
            q("comercial.q01", "¿Cuál es el objetivo principal del primer contacto?", "Crear confianza y conseguir una sesión de consultoría", "Cerrar la venta en menos de cinco minutos", "Enviar el catálogo completo"),
            q("comercial.q02", "¿Qué debe investigarse antes del acercamiento?", "Giro, tamaño, contacto y señales públicas sin asumir diagnóstico", "Datos personales no relacionados", "Solo la capacidad de pago"),
            q("comercial.q03", "¿Cómo deben tratarse leads de redes y prospección?", "Registrar origen y conducirlos al mismo proceso con contexto", "Mezclarlos sin identificar fuente", "Atender únicamente los de redes"),
            q("comercial.q04", "¿Qué debe comunicar el primer mensaje?", "Valor, cercanía y una razón clara para conversar", "Todos los precios y módulos", "Una promesa de ahorro garantizado"),
            q("comercial.q05", "¿Cuánto debe durar la consultoría recomendada?", "Entre 60 y 90 minutos según el contexto", "Máximo diez minutos", "Siempre más de tres horas"),
            q("comercial.q06", "¿Para qué sirven los primeros minutos de la sesión?", "Romper el hielo, generar confianza y confirmar contexto", "Configurar usuarios", "Negociar el precio final"),
            q("comercial.q07", "¿Qué cuatro áreas forman el mapa empresarial?", "Personas, procesos, productos y finanzas", "Ventas, marketing, diseño y publicidad", "Hardware, software, redes y soporte"),
            q("comercial.q08", "¿Cómo debe realizarse la entrevista inicial?", "Con preguntas abiertas que permitan comprender la empresa", "Como interrogatorio con respuestas sí o no", "Mostrando módulos entre cada pregunta"),
            q("comercial.q09", "¿Qué debe confirmar el consultor al identificar un dolor?", "Impacto, urgencia, causa y entendimiento compartido", "Solo el módulo que quiere vender", "La opinión de un tercero"),
            q("comercial.q10", "¿Cómo debe elegirse qué mostrar en la demo?", "Según el dolor prioritario y el resultado esperado", "Por orden alfabético de módulos", "Mostrando siempre todo"),
            q("comercial.q11", "¿Qué debe evitar una demostración?", "Funciones sin relación con el diagnóstico", "Un recorrido breve", "Confirmar valor con el cliente"),
            q("comercial.q12", "El cliente pregunta precio antes del diagnóstico. ¿Qué haces?", "Reconocer la pregunta y explicar que el alcance depende de entender su operación", "Aplicar descuento inmediato", "Finalizar la reunión"),
            q("comercial.q13", "¿Qué debe incluir el alcance comercial?", "Módulos, usuarios, unidades, migración, capacitación e implementación", "Solo mensualidad", "Únicamente fecha de pago"),
            q("comercial.q14", "¿Cuándo existe temperatura suficiente para cerrar?", "Hay necesidad, autoridad, presupuesto e intención", "El cliente vio el dashboard", "La sesión llegó a 90 minutos"),
            q("comercial.q15", "¿Cuál es la primera estrategia ante una objeción de precio?", "Reforzar o agregar valor antes de reducir precio", "Reducir siempre 50%", "Eliminar el acompañamiento"),
            q("comercial.q16", "¿Qué debe registrarse al terminar una sesión?", "Diagnóstico, acuerdos, responsables, fechas, objeciones y siguiente paso", "Solo si hubo venta", "Únicamente duración"),
            q("comercial.q17", "¿Qué sigue después del cierre?", "Implementación con responsables, sesiones, configuración y adopción", "Esperar la primera queja", "Entregar credenciales sin contexto"),
            q("comercial.q18", "¿Cómo se determina el número de sesiones iniciales?", "Según las sesiones incluidas en el paquete contratado", "Siempre una", "Según la comisión del consultor"),
            q("comercial.q19", "¿Qué acompañamiento mínimo debe existir al inicio?", "Las sesiones del programa de implementación y seguimiento activo", "Un correo de bienvenida", "Solo soporte técnico reactivo"),
            q("comercial.q20", "¿Qué debe hacer el consultor después de la implementación?", "Dar seguimiento mensual a adopción, problemas y oportunidades", "Contactar solo para renovar", "Transferir toda responsabilidad a corporativo"),
            q("comercial.q21", "¿Cuándo debe escalarse un caso a corporativo?", "Cuando no puede resolverse o requiere conocimiento, autoridad u opiniones adicionales", "Nunca", "Cada vez que el cliente hace una pregunta"),
            q("comercial.q22", "¿Qué significa acompañar durante una relación de largo plazo?", "Ayudar al cliente a adoptar, mejorar y obtener valor continuo", "Contactarlo únicamente para vender módulos", "Resolver su operación por él"),
            q("comercial.q23", "¿Qué conducta exige reasignación inmediata?", "Acoso, insultos, amenazas o faltas graves de respeto", "Solicitar una segunda opinión", "Pedir una sesión adicional"),
            q("comercial.q24", "¿Qué debe hacer un consultor si no conoce una respuesta?", "Reconocer el límite, investigar y escalar sin inventar", "Improvisar para conservar autoridad", "Cambiar de tema"),
            q("comercial.q25", "¿Qué define el éxito de una consultoría Índice?", "El cliente comprende su problema, el valor propuesto y el siguiente paso", "Se mostraron todos los módulos", "La sesión terminó rápido"));
    }

    private static Question q(String code, String prompt, String correct, String wrongOne, String wrongTwo) {
        return new Question(code, prompt, List.of(
            new Option("a", correct),
            new Option("b", wrongOne),
            new Option("c", wrongTwo)
        ), "a");
    }

    record Question(String code, String prompt, List<Option> options, String correctOptionCode) {}
    record Option(String code, String label) {}
}
