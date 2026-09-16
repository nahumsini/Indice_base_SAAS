# Análisis e implementación de indicadores de Gastos

Fecha de cierre: 2026-09-16. Estado: cerrado en rama aislada y validado en local;
sin despliegue de producción.
Contrato: [Expenses KPI workspace](./expenses-kpi-workspace-contract.md).

## Qué información permite aprovechar el módulo

Se revisaron el listado y adaptador de gastos, historial de pagos, clasificación,
responsables, fechas, documentos, presupuestos y motor monetario del backend.
El motor ya distingue `EXPENSE_TOTAL`, `EXPENSE_ACTUAL`, `EXPENSE_PAID`,
`EXPENSE_PAID_TO_DATE`, saldo, vencido, impuestos y las cuatro magnitudes
presupuestales. No era necesario crear otro motor financiero.

Los datos alcanzan para responder cuánto se capturó, cuánto está reconocido,
cuánto se pagó efectivamente en el periodo, cuánto queda pendiente actualmente,
qué venció, qué vence próximamente, qué presupuesto queda, dónde se concentra
el gasto y cuáles registros necesitan completar su información.

No alcanzan para afirmar rentabilidad, liquidez suficiente, deducibilidad fiscal,
ahorro contra un precio negociado o productividad de una persona. Por eso se
retiró de la presentación el puntaje sintético de salud financiera y la nota de
rendimiento de responsables. La tabla conserva sus medidas observables: registros,
importe, avance de pago, evidencia y saldo vencido.

## Problemas corregidos

- Una sola pantalla apilaba toda la información. Ahora usa las cuatro vistas
  del estándar, selector verde y separación uniforme de 24 px.
- La tendencia solo consultaba los últimos 14 días. Ahora cubre todo el periodo,
  con intervalos de calendario apropiados para su duración.
- Unidades y responsables se recortaban a ocho por número de registros, los
  proveedores candidatos a veinte y las líneas presupuestales a veinticinco.
  Ahora se incluyen todos antes de ordenar y paginar. Los tops visuales siguen
  mostrando cinco y la gráfica de presupuesto siete, expresamente identificados.
- Cancelados y rechazados podían entrar en conteos de gastos aunque el backend
  los excluyera de importes capturados. El conteo usa la misma población válida.
  Los pagos conservan su contrato independiente de historial no revertido.
- Puntualidad sin muestra aparecía como 0%. Ahora se muestra sin muestra comparable.
- Los fallos de conversión podían convertirse en ceros o en porcentajes aparentes.
  Ahora bloquean los resultados consolidados afectados y el reporte.
- El fallback podía tomar ejemplos del contenedor o fabricar líneas presupuestales
  desde gastos. Indicadores ya no usa esos datos como sustituto de fuentes fallidas.
- El presupuesto principal mostraba ejecutado menos planeado sin comprometidos.
  Ahora presenta disponibilidad del propietario: planeado - comprometido - ejecutado.
- Saldos actuales de distintas cohortes se comparaban como si fueran cierres
  históricos. Se retiró esa comparación; se conserva comparación de gasto y pagos.
- La fecha de antigüedad podía depender del navegador. El listado añade fecha
  operativa y zona de la empresa, que también usa para actualizar vencimientos.
- Actualizar ahora renueva también importes cuando permanecen los mismos IDs.
- Excepciones documentales permiten filtrar el detalle y acceder al gasto mediante
  el listado operativo existente, sujeto al permiso de su pestaña.
- Un fallo de la fuente propietaria podía dejar importes o porcentajes aparentando
  un cero válido. Las tarjetas afectadas ahora quedan explícitamente no disponibles.
- El uso presupuestal se recalculaba solo con ejecutado. Ahora deriva del disponible
  del propietario (`planeado - disponible`) e incluye comprometido, y conserva el
  estado de salud calculado por Presupuestos.
- Una mezcla de pagos con un solo estado podía producir una dona vacía. La vista usa
  un segmento determinista y accesible para ese caso.
- Un alcance vacío o una fuente no disponible podía producir un mensaje de salud
  positiva. El estado saludable ahora exige observaciones válidas.

## Organización

| Vista | Contenido |
|---|---|
| Resumen | Ocho tarjetas de decisiones financieras con explicación y muestra |
| Análisis | Tendencia, composición, antigüedad, vencimientos, presupuesto, impuestos y concentración |
| Por unidad | Gráfica de la página visible y tabla completa con orden y paginación |
| Control y detalle | Pendientes de información y gastos; selector de responsables por rol |

Una sola barra de filtros y avisos aplica a todas las vistas. Cambiar de vista no
repite consultas. Las tablas conservan sus instancias. La impresión incluye el
alcance completo, todas las líneas, responsables y gastos, no solamente la página
visible. Los detalles monetarios de cada gasto conservan su divisa ISO original.

## Validación

- 47 pruebas de UI de Gastos, incluidos los cierres de fuente, presupuesto y dona
  de un solo segmento: aprobadas.
- 5 regresiones de flujos financieros existentes: aprobadas.
- 44 pruebas unitarias de servicio/controlador de Gastos y motor monetario, más
  2 pruebas de unicidad de migraciones: 46/46 aprobadas.
- TypeScript y build de producción: aprobados. Advertencia preexistente de chunks grandes.
- Compilación del checkout de backend local: aprobada.
- Revisión visual autenticada de las cuatro vistas en escritorio y del resumen a
  390 px: aprobada, sin desbordamiento horizontal ni errores del módulo.
- PDF completo de cuatro páginas: generado y revisado visualmente; incluye alcance,
  ocho tarjetas, análisis, unidades, responsables y detalle.
- Backend aislado sobre `indice_test_db`, Flyway 276 y frontend por proxy: aprobados.
- La base funcional local `indice_db` permanece en Flyway 265. No se modificó: el
  código actual requiere al menos V273 para las columnas de reversión de pagos.
- Migraciones, escrituras de operaciones financieras y despliegue de producción: N/A.

## Límites que permanecen explícitos

Los saldos son actuales de la cohorte por fecha del gasto. El presupuesto utiliza
líneas completas cuyos periodos se superponen; no prorratea ni sigue filtros de
proveedor, búsqueda, cuenta o estado de pago. Las ventanas próximas excluyen deuda
ya vencida y sin fecha, y son acumulativas. La auditoría pendiente identifica gastos
liquidados sin cierre/auditoría; no calcula duración del trámite sin trazabilidad.
Los importes usan la conversión analítica vigente del motor, no una revaluación
contable histórica. La fecha operativa se renueva al actualizar datos.

Las consultas respetan lotes de hasta cien y el límite existente de diez mil IDs
por consulta. Un alcance mayor necesita agregación del propietario por dimensiones;
no se truncó ni se inventó un total para eludir ese límite. No se realizó un benchmark
con grandes carteras. Los permisos, registros, pagos y asientos conservan su propietario.
