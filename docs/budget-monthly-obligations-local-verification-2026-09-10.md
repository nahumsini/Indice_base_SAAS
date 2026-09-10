# Verificación local: presupuestos y cuentas por pagar

Fecha: 2026-09-10. Alcance: generación de obligaciones mensuales desde Control presupuestal;
se conservan los cambios locales anteriores de Expenses. No es un certificado de despliegue
productivo ni implica que los cambios estén en main.

## Comportamiento y archivos

- `finance/budgetlines/BudgetExpense*`: coordinador, programador, repositorio de ocurrencias,
  materializador transaccional y endpoints protegidos. La partida genera una cuenta real al
  llegar su mes, queda pendiente hasta el vencimiento y utiliza el flujo existente de pagos.
- `BudgetLineService` y `BudgetLineRepository`: serialización con el owner financiero y protección
  de líneas con gastos vinculados. No se sobrescriben cuentas ya generadas al editar presupuestos.
- Migración aditiva `V269__budget_expense_occurrences.sql`: registro único por empresa/partida y
  fecha inicial de activación. Sin reescritura de gastos, abonos, saldos o presupuestos históricos.
- `ExpensesModule`, `BudgetObligationNotice`, servicio/adaptadores de presupuesto y gasto:
  sincronización al entrar, revisión de registros ambiguos, conservación del periodo y estados.
- `budgetUtils`: fechas de fin de mes y años bisiestos, sin saltar febrero ni desplazar fechas
  de calendario al convertir a UTC.
- Configuración de aplicación/Compose y documentación canónica: flag de activación y contrato
  [de generación y despliegue](budget-monthly-obligations-contract-v1.md).

## Pruebas ejecutadas

Backend: 180 pruebas, cero fallas/errores/omitidas, sumando las clases verificadas en esta tarea:

| Suite | Pruebas |
| --- | ---: |
| BudgetExpenseIntegrationTest | 15 |
| BudgetExpenseControllerTest / BudgetExpenseSchedulerTest | 5 |
| BudgetLineServiceTest / BudgetLineBulkActionIntegrationTest / BudgetServiceTest | 29 |
| MigrationVersionUniquenessTest | 2 |
| ExpenseServiceTest / FinanceExpensesControllerTest | 32 |
| ExpenseCorrectionIntegrationTest / ExpenseDeletionIntegrationTest | 46 |
| ExpenseOperationsIntegrationTest / FinanceBulkActionsIntegrationTest | 51 |

MySQL exclusivo de pruebas: puerto 13319, `indice_budget_test_db`. Se ejecutó Flyway con V269.
Casos del puente: cinco monedas, impuesto incluido, pendiente/vencido, pagos parciales y finales,
historial previo, dos procesos concurrentes (12 solicitudes/6 hilos), rollback después del INSERT,
reintento, cambio de mes/año, eliminación sin regeneración, referencias inválidas, alcance de otra
empresa/unidad, periodos históricos y coincidencias manuales. La caída de una línea o empresa no
impide procesar las demás. La bandera desactivada y el entitlement denegado impiden generación.

Frontend: 112 pruebas aprobadas (`test:expenses`: 76, `test:budgets`: 12,
`test:expenses-ui`: 24). Incluye navegación real de hooks desde Presupuestos a Gastos,
POST antes de cargar filas, error de sincronización visible sin esconder gastos, acciones de pago,
selección/totales, arrastres, importación y fechas de enero/febrero/años bisiestos/zonas horarias.

TypeScript, Vite build, compilación/empaquetado Maven, `git diff --check` y
`docker compose ... config --quiet` con plantilla: aprobados. Vite mantiene el aviso de paquetes
grandes; no hubo fallo de build. La primera validación tipográfica detectó dos pesos de letra
fuera del estándar en el aviso nuevo; se corrigieron y la suite completa pasó.

## Arranque local y conservación

Backend local 8082 y frontend 5174. Base funcional local exclusiva en 13320, diferente de la
base de pruebas y de producción. Se guardó respaldo de todas las tablas y definiciones de vistas
fuera del repositorio, con permisos restringidos. Una vista de facturación heredada inválida en
la copia impedía el dump convencional: se preservó su definición por separado, sin modificarla.

Se inició con generación desactivada y se comprobó V269 más la igualdad exacta de los registros
anteriores de `finance_expenses`, `finance_expense_payments` y `finance_payment_account_movements`.
Luego se activó la función local. Una petición de sincronización sin sesión recibe HTTP 401.
Se conserva el JAR anterior para reversión de la aplicación, sin revertir el esquema.

El primer ciclo del programador generó las cuatro cuentas del mes presentes en la copia local;
nueve partidas anteriores quedaron en REVIEW / HISTORICAL_RECONCILIATION. La comparación
posterior confirmó que todos los gastos, abonos y movimientos previos permanecían idénticos.
Las cuatro cuentas nuevas conservaron fecha/moneda/importe y saldo completo, sin abonos ni
movimientos bancarios nuevos; cero ocurrencias inconsistentes.

## Límites de esta entrega

- Los periodos anteriores al despliegue y coincidencias con gastos manuales quedan para conciliar;
  no se crean deudas históricas automáticamente ni se fuerzan coincidencias por nombre.
- El calendario respeta la duración configurada; no crea recurrencias después de su fecha final.
- No se ha ejecutado el preflight con credenciales/configuración productivas ni un despliegue
  APPTEST/producción. La activación allí sigue el contrato y `deployment/README.md`.
- No se borraron ni se publicaron cambios previos del árbol de trabajo. Commit/push: N/A.
