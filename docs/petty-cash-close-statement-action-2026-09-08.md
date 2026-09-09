# Botón y modal de cierre de corte de caja chica

Fecha: 2026-09-08. Rama: `fix/petty-cash-close-statement-action`.
Base: `f189cb8884f857ae187345550bae18139002f89c`.

## Resultado

En **Caja chica → Saldos**, al seleccionar un fondo y un corte, aparece
**Cerrar corte** junto al estado. Abre el modal de cierre existente con el mes,
folio, fondo, moneda nativa y saldo del corte seleccionado. Los estados finales
no ofrecen otro cierre. Los registros sin identificador del backend tienen la
acción deshabilitada con una explicación.

El modal comprueba los comprobantes del fondo y corte, independientemente de los
filtros de búsqueda de la tabla. Los fondos internos requieren `EXPENSE_CREATED`;
los externos requieren `VALIDATED`. Rechazados y revertidos no bloquean el cierre.
Los pendientes bloquean aunque su importe sea cero.

Un saldo negativo muestra una explicación y bloquea el cierre. El backend ahora
rechaza `CLOSE_CLEAN` con saldo negativo antes de cualquier escritura: anteriormente
aceptaba ese caso y guardaba saldo cero. Se mantienen las acciones existentes para
saldo positivo y cierre sin saldo.

El envío usa el endpoint existente, conserva los datos ante errores, muestra el
error dentro del modal y bloquea envíos simultáneos. La respuesta actualiza el
fondo, el corte cerrado y el siguiente corte sin duplicarlo. Salir con cambios sin
guardar requiere confirmación. Durante el envío se bloquean campos y salida.

## Comportamiento conservado

- Ruta y contrato `POST /api/v1/finance/petty-cash/funds/{fundId}/statements/{statementId}/close`.
- Autenticación, CSRF, ámbito de empresa/fondo y bloqueo transaccional existentes.
- Cálculos de saldo y movimientos financieros del servicio, en moneda nativa.
- Acciones de devolución, traspaso, cobro y condonación existentes.
- Fechas, importes y vínculos de comprobantes históricos.

## Archivos

- `react/src/app/BasicModules/PettyCash/components/PettyCashReconciliationWorkspace.tsx`:
  botón, conexión del modal, validaciones y protección de la captura.
- `react/src/app/BasicModules/PettyCash/translations/{en-CA,es-MX,fr-CA,ko-CA,pt-BR,zh-CA}.ts`:
  mensajes; `en-US` y `es-CO` los heredan.
- `src/main/java/com/indice/erp/finance/pettycash/PettyCashService.java`:
  rechazo de cierre limpio con saldo negativo.
- `src/test/java/com/indice/erp/finance/pettycash/PettyCashServiceTest.java`:
  regresiones de cierre e integridad.
- `react/tests/petty-cash-close-statement-regression.test.mjs` y `react/package.json`:
  regresión de eventos del componente y adaptador API incluida en `test:petty-cash-ui`.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| `./mvnw -q -Dtest=PettyCashServiceTest test` | 37 pruebas aprobadas, 0 errores; compilación backend incluida |
| `cd react && npm run test:petty-cash-ui` | 18 pruebas aprobadas: 9 de flujo y 9 del estándar del módulo |
| `cd react && npm run typecheck` | Aprobado |
| `cd react && npm run build` | Aprobado |
| `git diff --check` | Aprobado |
| Migraciones/Flyway | N/A: sin cambios de esquema |
| Escrituras de prueba en base funcional o producción | Ninguna; pruebas backend con Mockito y frontend con API simulada |
| Fallos pendientes de las comprobaciones ejecutadas | Ninguno |

Las pruebas frontend ejecutan los eventos reales de selección, apertura, envío,
cancelación y reintento, con un arnés de hooks y adaptador API real sobre transporte
simulado. No equivalen a una prueba visual o una sesión autenticada contra el servidor.

## Límites y entrega

- Revisión visual autenticada pendiente: no había navegador conectado en esta sesión.
- Cambio local, todavía no desplegado ni incorporado a `main`.
- Este alcance conecta el cierre existente y protege el saldo negativo. No reasigna
  comprobantes entre meses ni modifica la regla que relaciona fecha de gasto y corte.
- Antes de publicar, verificar en APPTEST apertura/cancelación, cierre de saldo cero,
  saldo positivo, pendientes internos/externos y persistencia después de recargar.
- Despliegue y rollback: N/A en esta tarea; una promoción posterior sigue
  `deployment/README.md`.
