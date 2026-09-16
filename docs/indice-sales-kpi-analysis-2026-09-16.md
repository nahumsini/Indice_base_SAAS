# Ventas: análisis, remasterización y cierre de KPIs

Fecha: 2026-09-16. Estado: cerrado en la rama aislada
`codex/sales-kpi-remaster-2026-09-16`; sin despliegue de producción. Contrato:
[sales-kpi-workspace-contract.md](./sales-kpi-workspace-contract.md).

## Lo encontrado antes de mover código

La pestaña anterior sí consumía datos reales, componentes compartidos, el motor
monetario y el reporte estándar. Esas bases se conservaron. Sin embargo, su fuente
principal era el contexto CRM cargado para pantallas operativas y después filtrado en
el navegador, mientras los agregados monetarios aplicaban alcance operativo en el
backend. Esto permitía que conteos, tablas y totales monetarios no describieran
exactamente la misma población autorizada.

El embudo mezclaba poblaciones independientes: oportunidades activas, todas las
cotizaciones, cotizaciones aprobadas/ganadas y todas las ventas. La “conversión” era
cotizaciones ganadas / cotizaciones, no una conversión demostrada entre oportunidad y
venta. La tarjeta “Ingresos por ventas” nombraba como ingreso el total bruto registrado.
El ticket promedio podía dividir un total convertido parcial entre todas las ventas.
Las advertencias parciales no gobernaban todas las tarjetas, rankings o reportes.

El ranking de vendedores se ordenaba con una función monetaria que siempre devolvía
cero y luego mostraba importes distintos; por eso el orden visible podía no corresponder
al valor presentado. Además, agrupaba por nombre y dividía ventas entre cotizaciones de
cohortes no enlazadas. La tabla ordenaba valores monetarios formateados como texto y
mostraba estados internos sin normalización.

Los filtros de oportunidad/contacto deducían unidad y negocio desde ventas o
cotizaciones relacionadas aunque ambos registros ya tienen asignación propia. Una
cotización podía entrar porque una línea coincidía con la unidad y después aportar el
importe total. Unidad y Negocio tampoco tenían dependencia. El riesgo comercial incluía
toda oportunidad en negociación y usaba límites 25/40 sin contrato de negocio.

## Información adicional evaluada

Sí valía la pena incorporar cobros, saldo por cobrar, entregas operativas pendientes,
seguimientos vencidos, estados de cotización y comparación por unidad. Ya existen
fuentes y propietarios claros para estos datos.

No se incorporaron metas/cuotas, CAC, rentabilidad neta, forecast accuracy, razones de
pérdida ni duración del ciclo porque el modelo actual no demuestra esos indicadores.
El margen quedó fuera de las ocho tarjetas hasta tener un agregado completo y
autoritativo. La historia de posiciones de flujo sirve como base futura, pero la
cobertura de registros heredados y la coexistencia de flujos todavía impiden afirmar
una conversión histórica confiable.

## Resultado implementado

Ventas ahora tiene **Resumen / Análisis / Por unidad / Oportunidades** con selector
coral, filtros globales, dependencia Unidad→Negocio y Vendedor bajo “Más filtros”.
Vista, filtros, disclosure, orden y paginación se recuerdan por usuario y empresa. La
raíz usa espaciado simétrico de 24 px. Solo Resumen muestra las ocho tarjetas y los
gráficos se montan únicamente en Análisis.

Se agregó la fuente tipada `GET /api/v1/sales/kpis/workspace`. Empresa y alcance se
resuelven en el servidor; un usuario sin asignación recibe un conjunto vacío. Las
cotizaciones heredan alcance de su oportunidad y solo usan contacto como fallback si
no hay oportunidad. El frontend ya no usa `useSalesCrm` para construir el workspace.
La copia analítica cubre los ocho locales soportados por el módulo.

Las ocho mediciones son ventas registradas, cobros del periodo, saldo actual por cobrar,
ticket promedio, pipeline activo, oportunidades abiertas, seguimientos vencidos y
entrega operativa pendiente. El periodo se aplica a flujos; saldo y handoff se declaran
inventarios actuales. El embudo enlaza pasos por ID de oportunidad. Vendedores se
agrupan por ID estable y las comparaciones de unidad usan conteos, evitando sumar
monedas nativas incompatibles.

Las conversiones parciales aparecen como no disponibles y conservan detalle nativo,
registros excluidos y contexto de tasa. Mientras cambia el alcance, el frontend oculta
la respuesta monetaria anterior hasta que termina la solicitud nueva. Las fuentes con
error nunca se presentan como cero ni como un estado saludable.

El reporte incluye las ocho mediciones, embudo, volumen de ventas, composición de
cotizaciones y las filas completas de vendedores, unidades y oportunidades,
independientemente de la vista o página activa. Conserva estados parciales/no
disponibles, totales nativos y etiquetas explícitas de fecha operativa, periodo, unidad,
negocio, vendedor y moneda consolidada.

## Defectos cerrados durante la auditoría final

- Se eliminó el destello de importes monetarios obsoletos al cambiar filtros, empresa o
  revisión de autorización.
- El estado vacío ahora considera también ventas, handoff y cartera actuales; ya no
  declara vacío un alcance que sí tiene inventarios vigentes.
- Las tarjetas monetarias muestran los totales nativos por ISO y usan un tono neutral
  cuando la fuente no está disponible.
- Las gráficas sin valores muestran un estado vacío en lugar de barras decorativas en
  cero.
- El PDF recuperó la composición de estados de cotización y etiquetas de alcance
  legibles en vez de repetir el texto explicativo del periodo.
- Oportunidades ordena vencidas primero, después acciones futuras y finalmente filas
  sin próxima acción. Etapas y estados visibles se localizan sin exponer tokens
  internos.
- La guía operativa dejó de prometer margen y describe únicamente información que el
  workspace realmente demuestra.

## Compatibilidad deliberadamente preservada

Se conservaron el endpoint KPI anterior, rutas CRUD, formas API operativas,
oportunidades, cotizaciones, ventas, comisiones, cobros, inventario y documentos. No se
añadió migración ni se modificaron permisos. La autorización frontend sigue siendo solo
UX; el nuevo endpoint aplica tenant y alcance organizacional en backend. RH y Finanzas
no fueron modificados por esta rama.

## Verificación de cierre

- `npm run test:sales-ui`: 34/34 pruebas aprobadas.
- `npm run test:kpis-ui`: 4/4 regresiones compartidas aprobadas.
- Backend focalizado y unicidad de migraciones: 7/7 pruebas aprobadas.
- `npm run typecheck`: aprobado.
- Build frontend de producción: aprobado.
- Compilación y empaquetado backend Java 21: aprobado.
- Revisión autenticada con datos mixtos MXN/CAD: Resumen, Análisis, Por unidad y
  Oportunidades en escritorio, más Resumen a 390 px; sin overflow horizontal, errores
  de consola ni respuestas fallidas del módulo.
- Reporte PDF real: 6 páginas, 8 mediciones, 3 gráficas y 3 tablas; inspección visual
  aprobada.
- Los registros usados para la prueba visual pertenecen exclusivamente a
  `indice_test_db`; se eliminaron y sus nueve grupos de marcadores quedaron en cero.

Producción, despliegue y rollback: N/A. Migraciones: N/A. Riesgo residual: no se hizo
una prueba de rendimiento con carteras extraordinariamente grandes; el contrato y la
seguridad funcional quedaron cubiertos.
