# Análisis de indicadores de Recursos Humanos

Fecha: 2026-09-15. Estado: diagnóstico con propuestas históricas y registro de la
reorganización visual implementada en cuatro vistas. No aprueba cambios de fórmulas.
El formato vigente para módulos básicos está en [KPI Tab Standard](KPI_TAB_STANDARD.md);
la implementación de RH se detalla en «Implementación aprobada» más abajo.

Audiencia confirmada: dueño/gerencia y responsable de Recursos Humanos.

Se revisó la captura de `/human-resources/kpis` y el código de la versión desplegada `e26442a51faccdafb0dc7002275f90f896630c3f`, disponible en el checkout de integración `/private/tmp/indice-production-5ec906284af6`. Las referencias de líneas corresponden a esa versión. No se consultaron expedientes privados ni se modificaron datos del cliente. Los ejemplos numéricos de comprobación son sintéticos.

Documentos rectores: [Frontend Operating System](indice-frontend-operating-system-v2.md), [Backend Operating System](indice-backend-operating-system-v1.md) y [KPI Tab Standard](KPI_TAB_STANDARD.md). El contrato ejecutivo general aporta criterios de disponibilidad y bases temporales, pero no contiene un contrato de RH que pueda adoptarse como sustituto de las fórmulas de esta pestaña.

## Dictamen

La pestaña tiene fuentes operativas útiles, filtros compartidos, desglose por unidad, seguimiento de colaboradores e impresión. Necesita corregir la confiabilidad de varios resultados y reorganizar su lectura. Una consulta fallida puede parecer un cero medido; algunos porcentajes usan poblaciones inadecuadas; las fechas y los puntajes mezclan conceptos distintos.

La recomendación es un solo tablero con un resumen breve, categorías de medición y acceso al detalle operativo. Gerencia necesita saber cómo cambia la plantilla, la cobertura y el costo; RH necesita identificar casos, fechas y acciones. Ambos deben compartir definiciones y cifras.

## Hallazgos verificables

En las referencias siguientes, `KPIs.tsx` significa `react/src/app/BasicModules/HumanResources/KPIs/KPIs.tsx`.

| Prioridad | Hallazgo y evidencia | Consecuencia y corrección propuesta |
|---|---|---|
| P0 | La carga de activos pide `size=500` (`KPIs.tsx:616`). `HrAssetService.java:53,1564` limita el tamaño a 100. El cliente transmite el parámetro sin ajustarlo. | Explica el mensaje exacto de la captura. Usar la paginación aceptada y mostrar error de fuente cuando corresponda. No elevar el límite del servidor para ocultar el desacuerdo. |
| P0 | Cuando fallan activos, permisos o actas se asignan arreglos vacíos y resúmenes cero (`KPIs.tsx:662–686`). Las tarjetas no tienen estado de indisponibilidad y `score ?? 0` dibuja una barra cero (`:491–510`). | Un fallo puede producir “saludable” en pendientes o “crítico” en cobertura. Distinguir cero válido, sin población, no disponible, sin permiso y no aplicable; propagarlo a puntajes y reportes. No afirmar que los ceros de permisos/actas de la captura sean necesariamente errores. |
| P0 | Actas: el valor principal suma pendientes y gravedad alta (`:906–914,1053–1060`). La comparación anterior, las unidades y los colaboradores usan otra condición: no resuelta **o** grave. El gráfico combina estados y gravedad en una misma distribución (`:1252`). | Una acta pendiente y grave cuenta dos veces; una grave resuelta sigue elevando el riesgo. Definir casos abiertos únicos, separar gravedad de estado y conservar los resueltos como historia. Un mismo contrato debe alimentar tarjeta, gráfico, unidades y detalle. |
| P1 | Asistencia y puntualidad dividen entre `max(asignaciones, empleados activos)` (`:856–889`), incluyendo descansos, permisos y personas sin programación en la base. | Se necesita una población elegible por turno y fecha. Puntualidad entre entradas comparables; ausentismo entre jornadas/horas exigibles. La cobertura del turno es otro concepto. Reutilizar las reglas del dueño de Asistencia. |
| P1 | `not_scheduled` se suma a “sin registro” (`:862–864`). Personas sin asignación aparecen en el ranking, pero no en ese contador (`:1190,1267`). | Diferenciar falta confirmada, entrada pendiente, descanso, permiso y configuración incompleta. No calificar como falta una jornada que todavía no debía comenzar. |
| P1 | Los permisos usan `fetchAllPages` con 200, pero `HrPermissionListRepository.listRequests` devuelve la lista completa e ignora `page/size`. El helper hace otra llamada antes de comprobar si ya tiene todos los registros (`:365–390`). | Con 201 permisos puede devolver 402 entradas. Adaptar cada contrato real; no fingir que un endpoint es paginado. Además, el tope de 50 páginas puede recortar listas grandes sin declarar incompletitud. |
| P1 | Si falla el listado de permisos administrativos, cualquier error activa el listado personal (`:600–609`). | El alcance puede pasar de empresa/unidad a “mis permisos” sin avisar. Resolver la autorización explícitamente y representar el alcance real; un fallo transitorio no debe cambiar la población medida. |
| P1 | La asistencia compara con siete días antes, independientemente del periodo (`:594–595`). Actas y permisos comparan ventanas de fechas usando sus estados actuales. “Anualizado” representa enero–diciembre. | Etiquetar “mismo día de la semana anterior”, definir ventanas comparables y distinguir estados actuales de históricos. Llamar “Año” al año calendario. No presentar rezagos históricos sin eventos o cortes que permitan reconstruirlos. |
| P1 | El filtro de activos acepta coincidencia por responsable **o** unidad; cuando unidad es “todas”, pueden permanecer activos fuera del negocio seleccionado (`:819–835`). En actas, `|| matchesEmployee` vuelve redundantes las condiciones de unidad/negocio después del primer filtro (`:809–811`). | Los filtros no significan lo mismo para todos los objetos. Definir si se mide adscripción del empleado o ubicación del objeto y aplicar el contrato de forma consistente. No es evidencia de una fuga entre empresas; es un problema del alcance analítico dentro de las fuentes autorizadas. |
| P1 | “Salud operativa” combina plantilla 15%, asistencia 20%, puntualidad 15%, permisos 15%, actas 20% y activos 15% (`:967–978`). Omite pesos nulos y renormaliza; las unidades y las personas usan fórmulas distintas. | El puntaje cambia por fuentes ausentes, antigüedad de la base y equipamiento, sin explicar suficientemente la causa. Retirarlo de las decisiones principales hasta definir propósito, pesos, comparabilidad, aplicabilidad y disponibilidad. No representa desempeño individual ni clima laboral. |
| P2 | Cobertura de activos cuenta equipos, no personas equipadas (`:963`). No existe aquí una población de puestos que requieren equipo. | Varios activos de una persona pueden aparentar cobertura de todos; una operación que no requiere equipo individual puede parecer crítica. Medir responsables únicos o requisitos reales, con denominador explícito. |
| P2 | La proporción de empleados activos sobre todos los registros determina el semáforo de plantilla (`:953–955,985–993`). | Conservar bajas históricas puede empeorar el color sin que exista un problema actual. Mostrar plantilla como dimensión; comparar contra dotación objetivo solo cuando exista una meta válida. |
| P2 | “Retardos y sin registro” también suma faltas; el subtítulo no desglosa retardos. Su barra es el complemento de las incidencias (`:1015–1030`). | El usuario ve un conteo y un porcentaje que contestan preguntas distintas. Mostrar desglose con etiquetas claras; eliminar barras que no expresen una meta comprensible. |
| P2 | Las tarjetas principales son informativas sin acción; algunos rankings solo modifican el filtro. La señal ejecutiva está debajo de las ocho tarjetas y usa color verde fijo (`:491,1570–1595`). | Acercar alertas y contexto al inicio; ofrecer “Ver casos” con fecha y alcance conservados; llevar la acción al módulo responsable. Evitar repetir rankings, tablas y señales con la misma información. |
| P2 | La impresión recibe valores y estados, pero no recibe disponibilidad ni advertencias por fuente (`utils/kpisPrintReport.ts:35–49`). | El reporte puede perder el aviso de que sus datos son parciales. Imprimir el mismo corte, calidad, alcance y definiciones del tablero. |

También hay una carrera potencial de actualización: las cargas iniciadas por cambios rápidos de fecha no cancelan ni identifican solicitudes anteriores (`KPIs.tsx:597–700`). Debe verificarse con respuestas fuera de orden antes de liberar una modificación del flujo.

## Lectura de los ocho indicadores actuales

| Indicador | Qué calcula hoy | Decisión propuesta |
|---|---|---|
| Colaboradores activos | Empleados actualmente activos filtrados; proporción respecto a todos los registros del alcance. | Conservar el conteo. Quitar el juicio de salud basado en empleados históricos. Separar plantilla actual de plantilla reconstruida al corte. |
| Asistencia | Puntuales más retardos, dividido entre la mayor cantidad entre asignaciones y empleados activos. | Conservar, redefiniendo programación, corte y población exigible. Mostrar numerador/denominador. |
| Puntualidad | Puntuales dividido entre la misma base de asistencia. | Conservar como entradas a tiempo entre entradas válidas comparables; informar tolerancia y fecha. |
| Retardos y sin registro | Retardos más faltas más pendientes/no programados. | Convertir en desglose de incidencias para RH; no mezclar configuración incompleta con ausencias. |
| Permisos pendientes | Solicitudes actualmente pendientes que se superponen al periodo, de empleados actualmente activos del alcance. | Conservar pendientes como inventario al corte; distinguir solicitudes del periodo y antigüedad del pendiente. |
| Cobertura de activos | Equipos asignados/en custodia dividido entre empleados activos; se limita a 100%. | Mover a Equipamiento; medir cobertura real o reportar equipos/personas sin atribuir una cobertura inexistente. |
| Riesgo en actas | Suma de pendientes y graves, con superposición. | Sustituir por actas abiertas únicas, con subconjunto crítico y antigüedad. |
| Salud operativa | Promedio ponderado calculado en el navegador, con pesos disponibles renormalizados. | Despriorizar. Sustituir primero por información financiera y de movimientos de personal cuando sus contratos estén listos. |

## Organización propuesta para gerencia y RH

Un resumen inicial corto debe indicar periodo, fecha de corte, alcance y calidad de fuentes. Debajo, navegación por categorías dentro de la misma pestaña. Cada categoría debe reunir sus indicadores, una explicación breve, una visualización útil y el detalle correspondiente; evitar repetir la misma información en tres bloques diferentes.

| Categoría | Pregunta del usuario | Mediciones y detalle |
|---|---|---|
| **Plantilla y movimientos** | ¿Cuántas personas tenemos y cómo cambia el equipo? | Plantilla activa, altas, bajas, variación neta y rotación. Distribución por unidad/área; separar personas de cuentas de acceso. |
| **Asistencia y jornada** | ¿Se está cubriendo el trabajo esperado? | Asistencia programada, puntualidad, ausentismo, retardos y minutos, jornadas incompletas. Tendencia por fecha y desglose de descansos/permisos/sin programación. |
| **Nómina y costos** | ¿Cuánto cuesta el personal y cómo cambia ese costo? | Nómina confirmada, aportaciones patronales cuando estén disponibles, horas extra y su costo. Separar borrador, aprobado y pagado; diferencias comparables por periodo/unidad. |
| **Solicitudes y seguimiento** | ¿Qué requiere una decisión y para cuándo? | Permisos pendientes y antigüedad, contratos por vencer, actas abiertas y críticas. Lista priorizada con responsable, fecha y acceso al expediente autorizado. |
| **Equipamiento** | ¿Qué recursos faltan o requieren atención? | Personas con equipo requerido, devoluciones pendientes si existe vínculo de baja, mantenimiento y valor por moneda. Aplicabilidad según la operación del cliente. |

El estándar propone ocho indicadores principales cuando existen ocho decisiones útiles. No obliga a llenar tarjetas con métricas débiles ni a repetirlas en cada categoría. La selección objetivo propuesta es: plantilla, rotación, asistencia programada, puntualidad, ausentismo del periodo, nómina confirmada, permisos pendientes y actas críticas abiertas. Debe validarse que asistencia y ausentismo respondan a cortes distintos y explícitos; si resultan complementos exactos para una vista, una se convierte en desglose y su lugar puede ocuparlo contratos por vencer.

Las categorías pueden contener otras mediciones de detalle sin aumentar las tarjetas del resumen. La selección objetivo es una recomendación pendiente de implementación y de validación de datos; no implica que hoy puedan calcularse todas con calidad suficiente.

### Primera propuesta de resumen, anterior a la separación ampliada

Para empezar con información respaldada por fuentes existentes, el resumen propuesto se concreta en: plantilla activa, asistencia programada, puntualidad, costo de nómina aprobado, horas extra aprobadas, permisos pendientes, actas críticas abiertas y contratos por vencer en 30 días. Nómina debe mostrar el bruto más las aportaciones patronales incluidas, con moneda y desglose; las horas extra proceden de corridas aprobadas/pagadas sin duplicarlas por sus cambios de estado. Su agregación requiere implementación en backend y autorización del dominio.

Altas, bajas y variación neta se muestran en Plantilla, con la cobertura de fechas laborales declarada. Ausentismo del periodo se incorpora al detalle de Asistencia después de consolidar jornadas comparables. Rotación permanece condicionada a comprobar plantilla histórica y reingresos; no ocupa una tarjeta de la primera versión. Esta selección concreta la entrega inicial y deja la selección objetivo anterior como evolución posible.

La navegación propuesta es `Resumen / Plantilla / Asistencia / Nómina / Seguimiento / Equipamiento`. El resumen abre por defecto; seleccionar una tarjeta lleva a su categoría. Todas las vistas conservan periodo y alcance. El día operativo debe estar dentro del periodo elegido y se muestra expresamente en indicadores diarios. Los pendientes se etiquetan al corte y los vencimientos como horizonte futuro.

La propuesta visual en conversación usa exclusivamente cifras ilustrativas. No es un reporte del cliente ni una pantalla conectada a producción.

Identidad visual confirmada por el usuario: el color preponderante dentro de la pestaña debe ser el del módulo de Recursos Humanos. Se adopta el tono `aqua` existente, con base `#59C3A5`, texto/acento `#177D66` y adaptación oscura ya utilizada por `HrTitleBar`. Encabezado del módulo, navegación seleccionada, acciones y series propias usan esa familia. Las cifras mantienen contraste neutro; rojo y ámbar conservan su significado de incidencia. El azul pertenece al encabezado global de la aplicación y no se extiende a la interfaz interna de indicadores.

### Propuesta histórica: siete pestañas internas y catálogo ampliado

Esta propuesta quedó sustituida para la entrega actual por la reorganización de
cuatro vistas descrita en «Implementación aprobada». Se conserva como antecedente;
no es el parámetro de estandarización de los módulos básicos.

El usuario pide repartir la información en pestañas internas, permitiendo más mediciones en el conjunto del módulo y menos contenido simultáneo. Esta propuesta sustituye el resumen de ocho tarjetas descrito arriba. Continúa siendo un diseño para revisión; no se ha implementado en el runtime de React.

Se proponen **siete vistas internas**, con cuatro indicadores destacados en cada una. Los indicadores del resumen reutilizan las mismas definiciones de las vistas especializadas. El catálogo puede crecer mediante desgloses y tendencias sin convertir cada medición en otra tarjeta inicial.

| Vista interna | Mediciones destacadas de la primera entrega | Contenido de apoyo y decisión |
|---|---|---|
| Resumen | Plantilla activa, asistencia programada del día, costo de nómina aprobado, contratos por vencer. | Hasta tres tipos de pendiente con enlace al caso y un desglose de asistencia. Permite elegir dónde profundizar. |
| Plantilla | Activos, altas del periodo, bajas del periodo, contratos por vencer. | Variación neta como dato auxiliar; distribución por unidad/área; lista de vencimientos. Altas y bajas deben incluir eventos efectivos de personas que ya no estén activas. |
| Asistencia | Asistencia programada, puntualidad, faltas confirmadas, retardos. | Desglose de descansos/permisos; incidencias por unidad; tendencia y ausentismo de periodo al consolidar jornadas comparables. Jornadas incompletas y minutos de retardo como detalle si el contrato de Asistencia los valida. |
| Nómina | Costo aprobado, horas extra aprobadas, corridas por aprobar, corridas aprobadas por pagar. | Desglose bruto/aportaciones/neto y estado de cada corrida; comparación por unidad y periodo. El contador de corridas pendientes no sustituye un saldo por pagar; los importes pendientes necesitan conciliación del dueño de Nómina. |
| Permisos | Pendientes al corte, antigüedad del pendiente más antiguo, solicitudes del periodo actualmente aprobadas, solicitudes del periodo actualmente rechazadas. | Cola ordenada por antigüedad y distribución por tipo. No etiquetar estados actuales como decisiones históricas ocurridas en el periodo. |
| Actas | Abiertas al corte, críticas abiertas, registradas durante el periodo, actas del periodo actualmente resueltas. | Casos únicos por estado y gravedad en desgloses separados; seguimiento por unidad. “Actualmente resueltas” no equivale a “resueltas durante el periodo”. |
| Equipamiento | Asignados, disponibles, en mantenimiento, valor registrado. | Responsables distintos, disponibilidad por unidad y lista de mantenimiento. Los valores monetarios siguen el motor de conversión existente. No confundir cantidad de equipos con cobertura de puestos. |

La propuesta visual incluye datos ficticios para recorrer todas estas vistas. Los datos laborales ilustrativos no constituyen una implementación del conteo de altas/bajas; el cálculo real deberá cubrir bajas posteriores, reingresos, fechas faltantes y vigencias históricas.

**Reglas de lectura:** una sola fila de cuatro tarjetas en escritorio; un bloque de análisis o tabla contextual después; fórmulas y registros completos mediante “Ver detalle”. En móvil, una tarjeta por fila y un selector de sección que sustituye las siete pestañas visibles. Se evita otro nivel de pestañas dentro de cada vista.

**Contexto compartido:** periodo, empresa autenticada, unidad y negocio persisten al cambiar de sección. El día operativo pertenece a Asistencia y se presenta como tal; los inventarios actuales de pendientes/equipamiento conservan la etiqueta “al corte actual”. Consultar un periodo histórico no transforma una consulta del estado actual en una reconstrucción histórica. Los filtros locales de estado/tipo no deben alterar silenciosamente las otras vistas. Debe poderse abrir y compartir una sección mediante la memoria/navegación existente y regresar sin perder filtros.

**Contenido actual que se redistribuye:** mezcla de asistencia y riesgo por departamento pasan a Asistencia; gráfico de permisos y antigüedad a Permisos; estados y severidad de actas a Actas; recursos y valor registrado a Equipamiento. El ranking de colaboradores basado en puntajes arbitrarios no se reutiliza como evaluación de desempeño. Las comparaciones entre unidades viven en la vista que define el indicador, evitando un segundo tablero general con otro puntaje de “preparación”.

**Viabilidad:** los conteos por estado actual y vencimientos usan campos existentes; nómina y las mediciones por periodo necesitan agregación autorizada, población comparable y pruebas de sus contratos. Rotación/retención, tiempos históricos de resolución y productividad se mantienen fuera de los valores certificados hasta contar con historia suficiente. Una fuente fallida muestra indisponibilidad y su causa, nunca un cero de respaldo.

**Implementación posterior:** reutilizar navegación, filtros, tablas y detalles existentes; cargar los datos de la sección cuando se necesitan y compartir los agregados del resumen. La impresión debe permitir sección actual o informe completo con los mismos permisos, cortes y advertencias de disponibilidad. Corregir los defectos de fuentes/cálculo identificados antes de presentar como confiables las cifras reorganizadas.

El estándar general `KPI_TAB_STANDARD.md` contempla ocho tarjetas primarias. El cambio a un resumen de cuatro con catálogo distribuido es una excepción específica propuesta para RH, motivada por esta instrucción del usuario. Debe incorporarse al contrato/estándar correspondiente en la misma implementación; no se modifica ahora el estándar de los demás módulos.

Interacción recomendada:

1. Un periodo principal coherente y una fecha operativa incluida en ese periodo cuando se consulta asistencia diaria. Cada indicador debe decir “al corte”, “durante el periodo” o “del día”.
2. Unidad y negocio delimitan la población. Área, búsqueda y otros filtros aparecen progresivamente. Un filtro por estado debe explicar cuándo describe solamente a ese subconjunto y no a toda la empresa.
3. Una cifra principal, una comparación entendible y una línea de contexto. En tasas, mostrar cambios en puntos porcentuales; en conteos, diferencias absolutas cuando la base anterior es cero.
4. Reservar colores críticos para una desviación sustentada en reglas. Plantilla y movimientos no tienen automáticamente un estado malo por aumentar o disminuir. Los umbrales deben responder al tamaño y operación del cliente, no a un 70/85 genérico para todo.
5. Cada indicador accionable ofrece un detalle del mismo conjunto y una salida a Asistencia, Nómina, Permisos, Actas o Colaboradores. La lectura no necesita una cadena de modales. Si se usa un modal de detalle, debe emplear el motor existente.
6. Separar alertas operativas de problemas de calidad. “No pudimos cargar Equipamiento” debe permitir reintentar y declarar qué cifras quedan afectadas.

## Indicadores que faltan y viabilidad

No hay una lista universal de “los mejores KPI” para todos los clientes. La prioridad propuesta combina decisiones de servicio, fuentes existentes y posibilidad de verificar el resultado. La separación entre una existencia al corte y movimientos durante un periodo también aparece en la metodología de [BLS/JOLTS](https://www.bls.gov/jlt/jltfaq.htm); se toma como referencia conceptual, no como un benchmark estadounidense para clientes de Índice.

| Medición | Definición propuesta y utilidad | Evidencia de datos y trabajo necesario |
|---|---|---|
| Altas, bajas y variación neta | Eventos laborales efectivos del periodo; variación = altas menos bajas. | `BackendHrUser` expone `hire_date`, `termination_date`, `last_working_day` y motivos; `HrUserService` los lee/presenta. Verificar cobertura, reingresos, movimientos y diferencia entre empleado y usuario antes de certificar historia. |
| Rotación | Bajas efectivas del periodo / plantilla promedio comparable × 100; separar voluntarias e involuntarias cuando el motivo permita hacerlo. | Hay campos base, pero falta un contrato agregado e historia suficiente para plantilla promedio y reingresos. Es una definición propuesta, no una fórmula actualmente implementada en esta pestaña. |
| Ausentismo | Horas no justificadas perdidas / horas programadas exigibles × 100; como alternativa inicial, jornadas comparables con unidad explícita. | Hay control de asistencia, programación y permisos. Falta consolidar rangos, jornada parcial, turnos nocturnos, descansos, tolerancias y correcciones con el dueño de Asistencia. |
| Nómina confirmada | Percepciones brutas de corridas aprobadas/pagadas, sin duplicar la corrida al cambiar de estado; aportaciones patronales separadas o claramente incluidas. | `HrPayrollService` tiene corridas, importes, monedas y estados. El resumen actual de nómina incluye estados no cancelados y no sirve directamente como costo confirmado del periodo. Definir periodo laboral vs fecha de pago; no sumar sueldos del perfil como gasto real. |
| Horas extra y costo | Horas reconocidas y montos correspondientes; distinguir registradas, autorizadas y pagadas. | Nómina persiste `overtime_hours`, importes y moneda en sus líneas. Falta el agregado con estados elegibles, alcance y reglas de país. No duplicar el cálculo de nómina en React. |
| Contratos por vencer | Contratos vigentes con vencimiento en los siguientes 30 días a partir del corte, por ejemplo; horizonte visible. | `contract_end_date` existe. Definir contratos sin vencimiento, renovaciones, terminados y calidad del campo. Es una adición de valor relativamente directa. |
| Antigüedad de pendientes | Cantidad pendiente por rangos de días, más tiempo mediano de resolución cuando haya eventos suficientes. | Permisos incluyen creación/actualización. `updated_at` por sí solo no prueba la fecha de decisión; verificar historial antes de prometer tiempos de resolución históricos. |
| Jornadas incompletas / salidas faltantes | Jornadas ya exigibles/cerradas con marcas incompletas. | Existen registros diarios y motor de asistencia. Diferenciar una jornada en curso de un incumplimiento; atender el corte y zona horaria del negocio. |

Rotación y retención son líneas de análisis reconocidas por [CIPD](https://www.cipd.org/uk/knowledge/factsheets/turnover-retention-factsheet/). Esa referencia respalda su relevancia, pero no fija un umbral sano para todos los clientes ni valida la calidad de nuestras fechas laborales.

Retención por cohorte, clima laboral, productividad, desempeño, reclutamiento y capacitación requieren fuentes y contratos adicionales. La pestaña revisada no consume encuestas, evaluaciones ni una relación verificable entre resultados del negocio y trabajo. No inferir esos indicadores a partir de asistencia, actas o cuentas activas. Vacaciones puede incorporarse cuando el dueño de Permisos/Nómina exponga un saldo validado; contar solicitudes no equivale a saldo disponible.

## Contratos y arquitectura para ejecutar después

La reparación inicial debe ser acotada: respetar APIs de listado, evitar duplicados, conservar alcance, explicitar errores y cubrir las fórmulas afectadas. La consolidación posterior necesita un contrato de KPIs de RH con agregación autorizada en backend, siguiendo Spring Boot y JdbcTemplate existentes. La norma de backend asigna al servidor los conteos, totales e índices autoritativos.

Cada métrica necesita: identificador, fórmula, inclusiones/exclusiones, unidad, población, fecha/periodo, fuente, calidad, valor opcional, comparación con la misma definición, regla de semáforo y destino de detalle. El backend debe validar empresa, unidad, negocio, módulos y permisos; acceso a la pestaña de indicadores no concede automáticamente acceso a importes de nómina o expedientes sensibles.

La moneda debe seguir el contrato central existente, con `BigDecimal`, totales nativos y conversión válida. Los periodos deben usar la zona horaria operativa aprobada. Un cambio en la fórmula exige actualizar el contrato del dominio y las pruebas; el diagnóstico presente no sustituye esa decisión.

Secuencia recomendada:

1. **Confiabilidad:** resolver activos 500/100, duplicación de permisos/actas, disponibilidad, fallback de alcance, filtros y comparaciones. Llevar las advertencias al reporte.
2. **Lectura:** categorías, contexto antes de indicadores, tarjetas compactas, etiquetas precisas, acciones hacia registros y eliminación de repeticiones.
3. **Cobertura:** contratos por vencer y movimientos laborales tras validar datos; agregar costo confirmado, horas extra y ausentismo de periodo con los contratos de sus módulos.
4. **Evolución:** cohortes y otras mediciones solo al contar con fuentes suficientes. No reintroducir un puntaje compuesto hasta que su utilidad y cálculo sean explicables y comparables.

## Comprobaciones realizadas y aceptación pendiente

Se ejecutaron seis reproducciones con datos sintéticos extrayendo funciones y expresiones del `KPIs.tsx` real mediante el parser de TypeScript. No se sustituyeron las fórmulas por otras inventadas para la prueba:

- Endpoint de permisos no paginado con 201 registros: el helper produce 402 entradas.
- 13 puntuales, siete faltas y dos descansos: asistencia y puntualidad dan 59%; se verifica que los descansos permanecen en la base.
- Una acta pendiente y grave: la suma de riesgo da dos.
- Activo cuyo responsable queda fuera del conjunto seleccionado: permanece cuando el filtro es solo por negocio y unidad está en “todas”.
- Sin datos de asistencia anterior y con 22 empleados actuales: el cálculo devuelve 0%, sin distinguir una carga fallida.
- Con 71% de plantilla, 59% de asistencia, 59% de puntualidad, activos a cero y permisos/actas sin población, la fórmula produce 48/100. Esto reproduce matemáticamente el puntaje de la captura; no demuestra cuáles eran los registros reales del cliente.

La suite existente `node --test react/tests/human-resources-frontend-standard-regression.test.mjs` pasó **14/14**. Verifica estructura, tipografía y flujos de RH; no certifica las fórmulas analíticas. Las reproducciones de defectos no son pruebas de que esos defectos estén corregidos.

Antes de liberar una futura implementación se requieren regresiones de cálculo con cero válido/fuente fallida, más de 200 permisos, acta grave pendiente/resuelta, filtro por negocio, empleado con varios equipos, descanso/permiso/turno futuro, baja/reingreso, periodo anterior y respuesta fuera de orden. También: consistencia tarjeta–detalle–impresión, denegación de nómina por permisos, separación de empresas y prueba visual móvil/escritorio. Los tests de base deben usar la base aislada.

Entrega de este trabajo: este documento de análisis. Comportamiento de la aplicación y datos: sin cambios. Compilación/build/migraciones/despliegue: N/A por tratarse de documentación. Límite del diagnóstico: inspección de código, captura y reproducciones sintéticas; no auditoría de completitud de los expedientes ni prueba autenticada de cada flujo en producción.

## Implementación aprobada: reorganización de la información existente

La instrucción posterior del usuario reemplaza la propuesta de siete categorías
para esta entrega: conservar la información actual y distribuirla en cuatro
vistas internas, inspiradas en el selector Tabla / Kanban / Agenda.

Implementado en la aplicación React, no en el prototipo HTML:

- **Resumen:** ocho tarjetas actuales, señal ejecutiva y totales.
- **Gráficas:** distribuciones de asistencia, permisos y actas.
- **Por unidad:** gráfica de rendimiento, rankings por unidad y departamento,
  y tabla de resumen por unidad.
- **Colaboradores:** seguimiento individual y lista desplegable de atención.
  La lista reúne el ranking breve y el detalle anterior, conserva los motivos
  y la acción Enfocar, y permite pasar de cinco casos a los ocho que ya entrega
  el cálculo existente. No amplía ese límite de negocio.

El selector usa `IndiceWorkspaceNavigation` con la variante `views` y tono aqua.
Comparte filtros y memoria; `view` en la URL identifica la vista seleccionada.
Valores desconocidos vuelven a Resumen. La tabla de colaboradores se mantiene
montada pero oculta fuera de su vista para conservar su paginación. Las gráficas
se montan solo en la vista correspondiente para evitar medir contenedores ocultos.
Actualizar e Imprimir siguen siendo acciones globales; imprimir conserva el
reporte completo con los filtros actuales.

### Archivos y verificación de esta entrega

- `react/src/app/BasicModules/HumanResources/KPIs/KPIs.tsx`: distribución del
  contenido, selección de vista y consolidación de casos de atención.
- `react/src/app/BasicModules/HumanResources/KPIs/translations/workspaceCopy.ts`:
  etiquetas localizadas para los ocho idiomas/regiones existentes y validación
  del identificador de vista.
- `react/src/app/components/frontend-os/IndiceWorkspaceNavigation.tsx`: variante
  agrupada; las variantes existentes conservan su comportamiento.
- `react/tests/hr-kpi-views-regression.test.mjs`: seis pruebas de selección,
  conservación de filtros, restauración, impresión completa, casos de atención,
  avisos y semántica del selector. Usa dependencias aisladas, no una base de datos.
- `react/package.json`: incorpora las pruebas al comando de RH.
- `docs/KPI_TAB_STANDARD.md` y el sistema operativo frontend: contrato aprobado.

Validación: 20 pruebas aprobadas (14 existentes de RH y 6 nuevas), TypeScript y
compilación Vite aprobados. La compilación conserva el aviso de paquetes grandes.
Se compararon las declaraciones anteriores y actuales: carga de datos, cálculos
y construcción del reporte permanecen iguales; solo se amplió el estado de
navegación. La ruta local, los módulos actualizados y la conexión a la API
respondieron HTTP 200. La herramienta Browser no tenía un navegador conectado;
no se realizó una inspección visual de una sesión autenticada.

Los archivos de ejecución modificados se reflejaron en el checkout que ya servía
el puerto 5174 (`/private/tmp/indice-production-5ec906284af6`); la copia fuente y
las pruebas permanecen en el repositorio principal. No se desplegó a producción.
Backend, migraciones y datos: N/A. Los problemas de carga y cálculo identificados
en el análisis anterior no se corrigen dentro de este cambio de presentación.

### Ajuste de espaciado entre barras

El contenedor de KPIs usa una cuadrícula de una columna con `gap-6` (24 px)
para que título, selector de vistas y filtros mantengan la misma separación.
El margen `mb-0` del título ya no anula la separación entre los dos primeros
bloques. Cambio localizado en `KPIs.tsx`, reflejado en el frontend de 5174.
