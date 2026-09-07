# Cierre de KPIs y flujos financieros — validación local

Fecha: 2026-09-06. Alcance: diez módulos básicos. Contrato vigente:
[kpi-financial-closeout-contract-v1.md](kpi-financial-closeout-contract-v1.md).
No se publicó ni desplegó esta revisión en un servicio externo.

## Resultado implementado

Se conserva la estructura de navegación, pestañas y matrices. Las operaciones
siguen perteneciendo a su módulo y conservan sus monedas nativas. El módulo de
KPIs consolida mediante contratos de lectura y evidencia contable; la moneda
preferida sólo modifica la presentación analítica. Los informes identifican
información incompleta y no sustituyen una tasa inexistente por una conversión 1:1.

| Módulo / consumidor | Conexión y corrección verificada |
|---|---|
| Dashboard | Conserva sus consumidores; las lecturas ejecutivas y delegadas incluyen alcance, conversión parcial y disponibilidad financiera. |
| RH | Nómina aprobada y gasto asociado generan una sola obligación y un solo pago. Activos operativos y nómina tienen métricas monetarias por propietario; un valor de catálogo no se capitaliza automáticamente. |
| Procesos y tareas | El cumplimiento alimenta indicadores y matrices operativas. Completar una tarea no genera ingreso o gasto ficticio. |
| Ventas | Totales derivados por backend, costo de inventario comprobable, cobro y devolución por Tesorería, repetición segura. Tarjetas locales leen cobros reales y saldo de Cartera por venta. |
| POS | Pagos capturados, crédito, cierres, liquidación y recepciones pagadas conservan hechos separados. El cobro mixto no pierde la parte pagada ni duplica la parte a crédito. |
| Inventario | Costo nativo por almacén, consumo acumulado de partidas repetidas, devolución al costo original y costo contable histórico con evidencia de adquisición. |
| Gastos | Reconocimiento por estado y fecha del gasto; pagos por fecha del pago. Presupuesto disponible = autorizado − comprometido − ejercido. |
| Fondos / Caja chica | Fondear es traslado de custodia. Comprobar un fondo interno crea un gasto pagado con una evidencia; no vuelve a retirar dinero. Fondos externos se excluyen de las finanzas propias. |
| Cartera | Crédito y límites por moneda, capital liberado proporcionalmente, cobro parcial con destino nativo, idempotencia y comprobante durable con descarga autorizada. |
| KPIs | Ejecutivo, matrices y portafolio usan ventas/costos atribuibles y calidad explícita. Estados, conciliación, aperturas/ajustes controlados e informes automatizados tienen persistencia real. |

Producción, Almacén de materiales y complementarios permanecen fuera del alcance.

## Estados financieros y moneda

Se conservan resultados, situación financiera, flujo de efectivo y cambios en el
patrimonio, con comparativos, moneda funcional, versión del marco y notas. La
presentación genérica usa NIIF para PYMES; el formato no certifica cumplimiento
integral ni sustituye obligaciones fiscales locales.

Las etiquetas fiscales proceden del país de la empresa: México, Canadá, Estados
Unidos, Colombia o Brasil. País, idioma, moneda funcional y preferencia de pantalla
son atributos independientes. No se asignó una tasa fiscal universal por país.
Impuestos pendientes de clasificar o recuperar se declaran como tales. Las notas
identifican revisión de impuesto sobre la renta, devengamiento de intereses y
revaluación de partidas monetarias al cierre.

Un asiento publicado conserva importes nativos y evidencia de conversión fechada.
Las devoluciones compensan el original y distinguen diferencia cambiaria realizada.
Las aperturas/ajustes exigen partidas equilibradas por moneda y organización,
referencia, motivo, vista previa coincidente e idempotencia. No modifican saldos
operativos. Un mes abierto, diferencias de auxiliares, stock sin costo acreditado,
cortes POS pendientes o cobros electrónicos pendientes impiden certificar el cierre.

Los informes automatizados guardan reglas y resultados inmutables; ejecución
programada vuelve a comprobar empresa, usuario, permisos y alcance. La entrega
queda dentro de la aplicación. No se habilitaron envíos a destinatarios externos.

## Flujos ejecutados contra la API local aislada

La base de escenarios estuvo separada de la base usada por las pruebas automáticas.
Todos los nombres, importes y comprobantes de estos escenarios son sintéticos.

| Escenario | Evidencia observada |
|---|---|
| Fondo externo 1,000; comprobación 300 | Saldo externo 700, sin gasto propio ni efecto en presupuesto o liquidez propia. |
| Fondo interno 1,200; comprobación 100; presupuesto 1,000 | Un gasto de 100 pagado, una evidencia de pago, fondo 1,100 y disponible presupuestal 900. |
| Recepción pagada de 10 piezas a 50 | Salida bancaria 500 e inventario 500; repetir solicitud devuelve la misma recepción. |
| POS: 2 piezas a 100, efectivo | Venta 200, costo 100 y existencia 8. Cerrar/liquidar no vuelve a contar el ingreso. |
| POS mixto: efectivo 40 + crédito 60 | Cartera recibe 60; pagar esos 60 y repetir la solicitud conserva un solo pago. Comprobante PDF recuperable después de recargar. |
| Recepción adicional y reversión | Se restauró la valuación original de inventario; original y compensación permanecen trazables. |
| Venta comercial con totales/costo manipulados por cliente | Backend calculó 148.50, neto 135 y costo 50. Aprobación, cancelación y sincronización repetidas no duplicaron caja ni stock. |
| Venta CAD y preferencia MXN/CAD | Sin cotización comprobable, conversión parcial y bloqueo contable explícitos. Una cotización sintética etiquetada permitió probar ambas conversiones sin cambiar la venta; se restauró la caché original al terminar. |
| Tarea completada y activo RH | Cumplimiento 100% y valor operativo 750 MXN visibles; sin asientos automáticos ficticios. |
| Aperturas documentadas | Caja 10,000 e inventario inicial 6,815, equilibrados contra patrimonio y publicados una sola vez. |
| Informe automatizado | Regla guardada, ejecución repetida devuelve el mismo resultado, descarga conserva período y moneda funcional original. |

Conciliación del escenario consolidado, después de devoluciones: ingresos 300,
costo de ventas 150, gastos operativos 100, utilidad 50 MXN. Activos y patrimonio
16,865. Puente de efectivo: apertura 10,000, variación −300, cierre 9,700.
La evidencia original de cada movimiento permanece disponible.

## Migraciones y conservación

Se respetó el trabajo que ya estaba modificado antes de la ejecución, incluido el
contrato de recepciones POS y las migraciones V253–V256. Las adiciones de este cierre:

| Versión | Finalidad |
|---|---|
| V257 | Recuperación condicional de la estructura contable faltante, sin editar V243. |
| V258 | Evidencia única del gasto pagado desde fondos y recálculo de disponibilidad presupuestal. |
| V259 | Capacidad del estado de sincronización contable. |
| V260 | Destino de Tesorería e idempotencia del pago de Cartera. |
| V261 | Evidencia histórica de tipo de cambio por asiento. |
| V262 | Política de crédito por cliente/moneda y vínculo de política. |
| V263 | Metadatos persistentes del comprobante de pago. |
| V264 | Reglas y ejecuciones persistentes de informes. |

El respaldo funcional se restauró en una instancia MySQL aislada. El primer ensayo
comparó 286 tablas/vistas y 19,268 filas; el segundo, 292 tablas/vistas y 19,823 filas.
Los hashes de los campos originales comparados coincidieron. El comparador excluye
el recálculo autorizado de campos derivados de presupuesto y permite nuevas filas
de catálogo, evidencias y nuevas versiones Flyway. No excluye importes nativos de
operaciones ni modifica el historial previo.

El historial local anterior registraba V243 con el nombre de script V238 aunque
faltaban las tablas contables. V257 recupera la estructura faltante de forma aditiva.
La validación normal final del clon pasó con las 264 migraciones, sin `repair`, sin
editar versiones aplicadas y sin modificar el historial. Los avisos iniciales de
validación eran versiones nuevas aún pendientes. El ensayo aplicó sólo versiones
pendientes previamente enumeradas; la configuración normal mantiene validación.

## Pruebas y límites de la entrega

- Backend: **1,791 pruebas, 374 suites, cero fallos, errores o pruebas omitidas**,
  en `indice_regression_v3_test_db` aislada. Empaquetado final correcto.
- Frontend: TypeScript y build de producción correctos; 167 pruebas de los módulos
  afectados correctas, incluidas pruebas ejecutables de cálculos multimoneda.
- Seguridad: pruebas de tenant, unidad/negocio, permisos de módulo/pestaña,
  comprobantes ajenos, reintentos, CSRF y ausencia de autoridad confiada al cliente.
- Migración: arranque desde base nueva, unicidad de versiones, ensayo sobre copia
  restaurada, comparación de datos y validación normal final del historial.
- Revisión visual interactiva: pendiente; la herramienta de navegador no tenía
  ningún navegador o pestaña disponible. No se declara realizada.
- Regresión adicional de Dashboard/impresión: 23 de 24 correctas. La prueba de
  tipografía detecta clases preexistentes en `AiSetupGuide.tsx` y
  `ChatGptSetupVisuals.tsx`, fuera de los cambios financieros. No se ocultó el fallo.
- Algunas monedas no tenían cotizaciones oficiales verificables en el entorno.
  El sistema muestra la limitación; la prueba positiva usó evidencia sintética
  explícita sólo en la base aislada. No valida una cotización comercial real.
- Cortes históricos de caja/inventario, clasificación fiscal, saldos iniciales y
  ajustes de cierre requieren evidencia/documentos del negocio. No se inventan
  datos para mostrar un estado "listo".
- Publicación, despliegue externo y validación fiscal de cada empresa: N/A.

## Archivos y revisión del cambio

Los cambios principales están en `finance/reporting`, `finance/receivables`,
`finance/paymentaccounts`, `finance/expenses`, `finance/treasury`, `kpis`, `sales`,
`pos/checkout` y `pos/receipt`. En frontend: pestañas existentes de KPIs/Gastos,
Ventas, Cartera y componentes del flujo POS/Fondos previamente abierto. Los
contratos de dominio y el Backend Operating System identifican la autoridad.
Las pruebas nuevas documentan casos y resultados, además de la evidencia API.

Los archivos privados de respaldo, sesiones, resultados API y logs permanecen fuera
del repositorio, en el directorio local de cierre. No contienen entregables públicos
ni deben adjuntarse indiscriminadamente a un PR. El diff incluye trabajo previo del
usuario; no debe atribuirse toda su extensión a esta sesión ni separarse por borrado.

## Arranque local y conservación final

El local habitual está en **http://127.0.0.1:5174** y su API en el puerto 8082.
El escenario sintético conciliado está en **http://127.0.0.1:5175**, con API 8083
sobre una base diferente. Ambos frontends respondieron HTTP 200. Se verificaron
inicio de sesión y consultas de capacidades, cuatro estados contables, ejecutivo,
reglas de informes y Ventas sobre la base local habitual, todos HTTP 200.

Antes de actualizar la base habitual se detuvo su backend, se creó un nuevo dump
consistente y se verificó su descompresión. SHA-256 del respaldo comprimido:
`fed0f069e4cbc3057b1d97144e9a563250e178e079185e8793002bba3c98bc45`.
Se aplicaron únicamente V257–V264 con **validación normal de Flyway**. La
comparación de 286 tablas/vistas y 19,273 filas previas conservó sus campos
originales, con las exclusiones de campos derivados descritas arriba. El nuevo
backend validó 264 migraciones y arrancó sin pendientes.

El artefacto servido por ambas APIs corresponde al código probado. SHA-256:
`05b99d317e80eea1ef21f6e645096bbe4dd110755f946e61dc6df18354e913db`.
Las evidencias de prueba y conservación están en
`/tmp/indice-kpi-closeout-20260906/`, incluyendo:

- `backend-closure-summary.json` y `full-backend-closure.log`.
- `closure-frontend-regression.log` y `closure-frontend-build.log`.
- `api-closure-final.log` y `functional-final-smoke.json`.
- `functional-migration-preservation.json` y `functional-migration-final.log`.
- `indice_db-before-final-upgrade.sql.gz` y el respaldo anterior al trabajo.

La prueba final de API confirmó cobros consolidados de 300, cobro mixto de 100,
saldo de Cartera cero, márgenes nativos 100/50/85 para los documentos comprobados,
utilidad financiera 50 y conciliación lista. Cambiar moneda o eliminar una cuenta
o producto con historial devolvió 400/409 y conservó el registro sin cambios.
Cerrar septiembre antes de terminar el mes devolvió 400.

Los datos históricos de la empresa demo habitual muestran informes **preliminares**:
seis eventos pendientes y ocho hallazgos, incluidos costo antiguo sin evidencia,
saldos iniciales y conciliación de auxiliares. La consulta no publicó asientos ni
inventó costos/aperturas. Los hallazgos deben atenderse con los documentos de esa
empresa; una migración técnica no equivale a validar su contabilidad histórica.

Para una publicación posterior se mantiene el procedimiento de `deployment/README.md`:
respaldo verificable, preflight, revisión de compatibilidad, migración incremental y
smoke. Un rollback de aplicación no revierte migraciones ni permite sobrescribir
operaciones posteriores con un respaldo antiguo. Esta sesión no ejecutó despliegue,
push ni cierre de períodos reales. Revisión visual interactiva y fallo tipográfico
preexistente del Dashboard siguen explícitamente pendientes antes del cierre comercial.
