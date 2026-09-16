# Cartera: cierre de Indicadores

Fecha de cierre: 2026-09-16. Alcance: código y entorno local de pruebas; no hubo
despliegue a producción. Contrato:
[receivables-kpi-workspace-contract.md](./receivables-kpi-workspace-contract.md).

## Estado final

La pestaña **Indicadores** de Cartera queda cerrada con cuatro vistas:

- **Resumen:** ocho indicadores con definición, corte, base y moneda original.
- **Análisis:** antigüedad por parcialidad, cobros mensuales y concentración por cliente.
- **Por unidad:** saldo, atraso, cobros y participación comparables en moneda preferida.
- **Cuentas y cobros:** detalle en moneda original y expediente de consulta, sin acciones
  de pago concedidas por el permiso analítico.

El saldo y el atraso son valores actuales. El periodo filtra únicamente los cobros por
fecha de pago; no reconstruye saldos históricos. Los atrasos se calculan con las fechas
de las parcialidades, no con el vencimiento final de la cuenta. Los cobros de cuentas ya
liquidadas siguen perteneciendo al periodo. Clientes y organización se agrupan por IDs
estables, no por etiquetas o nombres coincidentes.

## Auditoría de cierre y correcciones

La reconstrucción inicial ya tenía fuente real tipada, fecha de negocio, alcance de
empresa/unidad/negocio, permiso `receivables.kpis`, motor monetario backend y reporte
completo. La auditoría final encontró y corrigió estos puntos:

- Las franjas operativas podían conservar desglose nativo, tasa, utilización o estados
  parciales de una consulta anterior mientras se actualizaban los importes.
- Una conversión parcial podía presentar un total preferido como si fuera completo o
  producir una utilización sintética de cero. Ahora queda explícitamente no disponible.
- Las tasas configuradas válidas no se reconocían de forma consistente en todas las
  franjas de Cartera.
- Los importes nativos no siempre incluían el código ISO. Ahora muestran, por ejemplo,
  `MXN`, `USD` o `CAD`, tanto en operación como en Indicadores.
- Las tarjetas y el PDF no explicaban la composición nativa de cada métrica. Ahora cada
  importe monetario incluye sus totales originales y las exclusiones aplicables.
- La franja global marcaba el saldo como parcial cuando la parcialidad pertenecía a otra
  consulta. Ahora el estado y las exclusiones corresponden específicamente al saldo.
- **Por unidad** incluía historia inactiva sin saldo ni cobros del periodo. Ahora incluye
  sólo unidades con deuda actual o con cobros en el periodo, incluidas cuentas liquidadas.
- El bloque explicativo del PDF podía solaparse y dejar un encabezado de tabla huérfano.
  El reporte usa párrafos de ancho completo, mantiene juntas las tablas analíticas cortas
  y conserva todas las filas filtradas.

## Comportamiento preservado

Se preservaron las cuatro pantallas operativas, creación y simulación de crédito,
aplicación idempotente de pagos, contabilidad de tesorería, comprobantes, filtros,
permisos de mutación, traducciones y contratos API. El permiso analítico no permite
registrar pagos, subir archivos ni cambiar políticas. No hubo migraciones ni cambios de
esquema, credenciales o concesiones automáticas de permisos.

## Verificación

- Frontend: 19/19 pruebas de Cartera.
- Backend: 23/23 pruebas enfocadas de cobranza, comprobantes, permisos, alcance
  monetario, catálogo de pestañas y unicidad de migraciones.
- TypeScript, build de producción y empaquetado backend: correctos.
- Flyway: 276 migraciones validadas; esquema de prueba al día.
- Revisión autenticada real en las cuatro vistas a 1440 x 1200 y Resumen a 390 x 844:
  sin errores de Cartera, excepciones ni desbordamiento horizontal.
- Evidencia multimoneda: saldo MXN/USD, cobros CAD/MXN/USD, vencido, próximo a vencer,
  comprobante presente/ausente, cuenta liquidada y unidad histórica inactiva.
- La unidad con saldo cero y cobros del periodo permaneció visible; la unidad histórica
  sin saldo ni cobros quedó fuera de la comparación.
- Las barras de ambas gráficas se verificaron en el DOM con geometría, color y valores
  accesibles, además de la inspección de las vistas.
- PDF real generado e inspeccionado: tres páginas, todas las filas, importes nativos,
  tablas y alcance; sin solapamientos ni encabezados huérfanos.
- Los datos temporales `KPI-RCV-20260916` se usaron sólo en `indice_test_db` y se
  eliminaron al terminar la revisión.

## Límites explícitos

No se infieren DSO, puntualidad histórica, promesas cumplidas, conciliación bancaria,
deterioro contable ni saldos históricos sin datos que los demuestren. Un archivo de
comprobante no significa conciliación. Una cuenta sin contacto no se convierte en un
cliente identificado. Calendarios o conversiones incompletos producen un estado no
disponible, nunca un cero inventado ni un total parcial presentado como completo.

Producción/rollback: N/A. Riesgos de migración: N/A. Riesgo residual conocido para este
alcance: N/A.
