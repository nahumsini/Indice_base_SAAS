# Verificación: acciones masivas y memoria de Gastos / Caja chica

Fecha de trabajo: 8 de septiembre de 2026 (pruebas ejecutadas también el 9 de septiembre UTC).
Estado: implementación local, sin subir a main ni desplegar. Conserva el cierre mensual
implementado previamente en `eb3c19be`.

## Cambios comprobados

- Gastos presenta las seis acciones solicitadas al seleccionar filas. Las correcciones de
  clasificación son transacciones del backend y funcionan sobre gastos ordinarios pagados
  que aún no tienen asiento contabilizado. Unidad, negocio, proveedor y cuentas tienen
  validación de pertenencia y auditoría. Eliminar conserva historial y se limita a borradores
  sin pagos; las restricciones se explican en el modal.
- Saldos permite seleccionar comprobantes en móvil y escritorio, modificar proveedor/cuenta
  contable y revertir grupos con motivo. La corrección de un comprobante autorizado también
  actualiza su gasto vinculado. Sus totales filtrados y seleccionados aparecen antes de la
  paginación, separados por moneda.
- El traspaso de una corrección a meses posteriores conserva los cortes cerrados: si una
  reversión los alteraría, se rechaza toda la operación. Los meses abiertos reciben su nuevo
  saldo inicial sin generar otro depósito.
- Los cuatro espacios de Caja chica recuerdan filtros, fondo, corte, vista, orden y página.
  Gastos espera a que carguen los catálogos antes de validar los filtros recordados, y restaura
  la tabla después. La memoria cambia de ámbito con empresa/usuario y no guarda selecciones.

## Comportamiento conservado y límites

Los importes, impuestos, monedas, historial de pagos y cuentas de custodia no se reescriben
con una clasificación. Los asientos contabilizados, registros vinculados y cortes cerrados
conservan sus bloqueos. No se borran físicamente registros financieros. No se aplicó ninguna
migración ni reparación de datos históricos.

Cambiar cuenta de pago en Gastos significa cambiar la prevista para pagos futuros de un
registro con saldo. La cuenta de cada comprobante de Caja chica sigue siendo la del fondo;
la opción informa esta restricción. Reasignar dinero ya pagado o cambiar la custodia requiere
definir y usar su operación financiera, no modificar únicamente una referencia.

## Validación

| Verificación | Resultado |
| --- | --- |
| Backend: `*PettyCash*Test,Expense*Test,FinanceBulkActionsIntegrationTest,FundExpenseCloseoutIntegrationTest,HrPayrollExternalDeductionServiceTest` | 156 pruebas, 16 clases, sin fallos, errores ni omisiones |
| Gastos: `npm run test:expenses` | 33 pruebas aprobadas |
| Interfaz de Gastos: `npm run test:expenses-ui` | 24 pruebas aprobadas |
| Interfaz de Caja chica: `npm run test:petty-cash-ui` | 21 pruebas aprobadas |
| Acciones masivas y memoria: `npm run test:finance-bulk` | 17 pruebas aprobadas |
| TypeScript: `npm run typecheck` | Aprobado |
| Frontend: `npm run build` | Aprobado |
| `git diff --check` | Aprobado |

La base utilizada fue exclusivamente `indice_regression_v3_test_db` en el puerto 3308.
Las nuevas pruebas de integración usan empresas sintéticas y rollback. Cubren las cinco
monedas de lanzamiento, referencias/filas de otra empresa, alcance de unidad, versiones
obsoletas, cambios sobre gastos pagados, preservación de pagos, reversión sin duplicados,
asientos contabilizados, cortes cerrados y propagación entre agosto y septiembre.

Las pruebas de interfaz ejecutan los manejadores de selección, confirmación y transporte
del componente, y el ciclo de efectos de la memoria. Cubren navegación A → B → A, recarga,
URL explícita, carga tardía, cambio de empresa/usuario, almacenamiento local bloqueado,
doble clic, error de guardado, totales por moneda y opciones inaccesibles.

Durante la verificación se corrigieron un selector SQL de la fixture que nombraba columnas
inexistentes y una integración de respuesta colocada inicialmente en el manejador de copia.
Las aserciones estáticas de la barra antigua se actualizaron al contrato nuevo; las pruebas
de comportamiento y la comprobación de tipos volvieron a pasar. No quedan fallos conocidos
en estas verificaciones.

No se realizó prueba manual de navegador ni prueba sobre datos de producción en este cambio.
Despliegue, respaldo de producción y rollback de release: N/A; el usuario pidió esperar.

## Archivos principales

- Backend: `ExpenseBulkActionService`, `PettyCashBulkActionService`, sus DTO y los controladores
  propietarios de Gastos y Caja chica.
- Frontend: `ExpenseTable`, `Expenses`, `ExpensesModule`, los cuatro espacios de Caja chica,
  servicios/adaptadores y componentes compartidos `FinanceBulkActions` / `FinanceSelectionTotals`.
- Memoria: `useWorkspaceNavigationMemory`, `useTablePagination`, `useFinanceReferenceData` y
  el contexto de Caja chica.
- Contrato: `finance-bulk-actions-and-workspace-memory-contract-v1.md`, adoptado por los
  documentos canónicos de frontend y backend.

Evidencia de ejecución disponible en `/tmp/finance-bulk-backend-regression.log`,
`/tmp/finance-bulk-expenses-regression.log`, `/tmp/finance-bulk-expenses-ui.log`,
`/tmp/finance-bulk-petty-ui.log`, `/tmp/finance-bulk-ui-tests-final.log`,
`/tmp/finance-bulk-typecheck-final.log` y `/tmp/finance-bulk-build-final.log`.
