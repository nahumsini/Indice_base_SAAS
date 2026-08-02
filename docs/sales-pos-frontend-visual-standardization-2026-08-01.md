# Ventas y Punto de Venta — estandarización visual del frontend

Fecha: 1 de agosto de 2026

Rama: `nahum-lap-19-julio-postfrontendenginev2`
Base revisada: `cb007bd75678b21441416b22d48765691903d00a`

## Objetivo

Extender a Ventas y Punto de Venta el estándar tipográfico y de contraste de Frontend Engine V2, después de cerrar Inventarios. La intervención conserva flujos, datos, servicios, permisos y reglas de negocio.

## Ventas

Se revisó `react/src/app/BasicModules/Sales/` completo, incluyendo:

- Prospectos y agenda.
- Contactos.
- Cotizaciones y constructor de cotizaciones.
- Contratos.
- Postventa.
- Tablero comercial, comisiones y KPIs.
- Identidad y marcos de modal compartidos de Ventas.
- Productos, inventario y proveedores ya normalizados en la fase anterior.

La línea base contenía 539 líneas con pesos o tratamientos tipográficos fuera del estándar. La auditoría posterior reporta cero.

## Punto de Venta

Se revisó `react/src/app/BasicModules/PointOfSale/` completo, incluyendo:

- Venta y cobro táctil.
- Clientes, crédito, precios y descuentos.
- Turnos, cortes y arqueos.
- Facturación, historial e inventario POS.
- Productos compuestos.
- Pantalla del cliente.
- Kiosco de autoservicio, kiosco asesor y administradores de kioscos.
- Portal de proveedores y órdenes de compra.
- KPIs y marcos de modal compartidos de POS.

La línea base contenía 922 líneas con pesos o tratamientos tipográficos fuera del estándar. La auditoría posterior reporta cero.

## Decisiones visuales

- Peso 400 para lectura y 500 para títulos, acciones, cifras o estados.
- Sin pesos 600, 700, 800 o 900 dentro de las superficies gobernadas.
- Sin mayúsculas o tracking usados como jerarquía rutinaria.
- Texto grafito en botones y encabezados coral, aqua o amarillo claros.
- Texto blanco reservado para grafito, colores oscuros y acciones destructivas.
- Jerarquía visual basada en tamaño, color, espacio, bordes y superficies.
- Los códigos operativos mantienen familia monoespaciada, pero sin peso ni espaciado artificial.

## Candados de regresión

- `npm.cmd run test:sales-ui`
- `npm.cmd run test:pos-ui`
- `npm.cmd run test:inventory-ui`

El normalizador reproducible está en `react/scripts/frontend-typography-standardize.mjs`. Solo sustituye tokens visuales gobernados y no modifica lógica.

## Retorno parcial

Se conservaron dos referencias estables:

1. Después de Inventarios y antes de Ventas/POS: `ff70586979a9de28ae9c363665b1639e2c766cd3` (`codex-post-inventory-pre-sales-pos-2026-08-01`).
2. Después de Ventas y antes de POS: `1dbb614089efe72bbc0f6f042d1f82a5c9db1dbf` (`codex-post-sales-pre-pos-2026-08-01`).

Para regresar únicamente POS, usar la segunda referencia como fuente y limitar la restauración a `react/src/app/BasicModules/PointOfSale/`. Para regresar Ventas y POS conservando Inventarios, usar la primera referencia y limitar la restauración a `Sales/`, `PointOfSale/`, las pruebas nuevas, el normalizador y `react/package.json`.

Antes de cualquier restauración se debe conservar o versionar el trabajo posterior. Los respaldos anteriores incluyen archivos rastreados; los archivos sin seguimiento deben protegerse por separado.

## Límites funcionales

- Frontend únicamente.
- Sin cambios de endpoints, DTO o persistencia.
- Sin migraciones de base de datos.
- Sin cambios de autenticación, autorización o multitenancy.
- Sin cambios intencionales en cálculo de ventas, impuestos, crédito, inventario, caja o kioscos.

## Verificación ejecutada

- `npm.cmd run typecheck`: correcto.
- `npm.cmd run build`: correcto, 4,525 módulos transformados.
- Inventarios, Ventas y POS: 3/3 candados visuales correctos.
- Kioscos: 8/8 pruebas correctas.
- Expenses: 4/4 pruebas correctas.
- Autenticación: 2/2 pruebas correctas.
- Validación telefónica: 24 aserciones correctas.
- `git diff --check`: limpio.
- Auditoría conjunta de Inventarios, Ventas y POS: cero tratamientos tipográficos prohibidos.
