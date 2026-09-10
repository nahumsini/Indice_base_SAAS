# Cuenta por pagar: captura y validación local — 2026-09-10

## Resultado

El modal `Crear cuenta por pagar` usa la fecha local del día al enviar la solicitud. Se elimina
su campo visible de fecha de registro; el vencimiento sigue siendo independiente y editable,
con atajos Hoy, +7, +15 y +30 días. Se conserva el contrato API `expenseDate`/`dueDate`.

Proveedor, concepto, importe/moneda y vencimiento tienen prioridad visual. La referencia es
opcional; evidencia y clasificación/impuestos continúan plegables. El resumen muestra el total
en la moneda de la operación. Los campos requeridos explican por qué no se puede guardar.

Se corrigieron problemas detectados en el flujo:

- Los errores del manejador de creación se propagan al modal sin cerrar ni borrar el borrador.
- La creación fallida de proveedores ya no inserta un proveedor ficticio en el catálogo local;
  conserva el nombre para reintentar. El alta rápida y el guardado tienen protección contra
  envíos simultáneos, incluidos los realizados con teclado.
- El cálculo de impuestos toma el perfil y la moneda actuales sin depender de un efecto pendiente
  del componente de impuestos. Subtotal, impuestos y total se redondean a centavos antes del envío,
  evitando residuos de punto flotante rechazados por la validación exacta del backend.

## Comportamiento conservado

La cuenta por pagar se guarda sin pagos ni movimientos de banco; una fecha de vencimiento pasada
mantiene la clasificación vencida. El modal de gasto pagado, las fechas de gastos existentes,
los permisos, el alcance de empresa y las reglas de liquidación no cambian. La fecha automática
corresponde al calendario local del navegador al enviar, incluso si el formulario cruzó medianoche.
La moneda elegida sobrevive a cambios de la preferencia global con el modal abierto.

## Archivos de esta intervención

- `react/src/app/BasicModules/Expenses/components/modals/PayableAccountDialog.tsx`
- `react/src/app/BasicModules/Expenses/components/modals/QuickProviderField.tsx`
- `react/src/app/BasicModules/Expenses/Expenses/Expenses.tsx` (manejadores de CxP y alta rápida)
- `react/src/app/BasicModules/Expenses/translations/{es-MX,en-CA,types}.ts`
- `react/tests/payable-capture-regression.test.mjs`
- `react/tests/expense-actions-and-modals-regression.test.mjs`
- `react/tests/expenses-frontend-standard-regression.test.mjs`
- `react/package.json`
- `src/test/java/com/indice/erp/finance/expenses/ExpenseCorrectionIntegrationTest.java`
- `docs/indice-frontend-operating-system-v2.md`

## Verificación

- TypeScript: `npm run typecheck`, aprobado.
- Construcción: `npm run build`, aprobada; permanece el aviso existente de paquetes mayores a 600 kB.
- `npm run test:expenses`: 76 pruebas aprobadas.
- `npm run test:expenses-ui`: 24 pruebas aprobadas. Se actualizó la comprobación anterior que exigía
  una fecha de registro capturable; la validación de campos tiene cobertura de comportamiento.
- `ExpenseCorrectionIntegrationTest#payableCaptureKeepsAutomaticRegistrationSeparateFromDueDateAndDoesNotPay`:
  5 casos aprobados en MXN/USD/CAD/COP/BRL. Se verificó persistencia, proveedor, vencimiento anterior
  y futuro, importes exactos y ausencia de pagos/movimientos. Solo base aislada `indice_budget_test_db`
  en el puerto 13319, con registros sintéticos propios y limpieza por empresa.
- Navegador aislado: 10 comprobaciones del componente real, con callbacks de guardado simulados:
  búsqueda de proveedor, atajos, impuesto incluido, doble clic, soporte opcional, error/reintento
  de proveedor, conservación del formulario y tamaños 320/390/768, además de escritorio 1440.
  No se usó una sesión autenticada del navegador del usuario; la persistencia se verificó por
  separado en integración backend.
- Capturas revisadas: `/tmp/indice-payable-qa/payable-desktop.png` y
  `/tmp/indice-payable-qa/payable-mobile.png`.
- Frontend funcional 5174 y backend 8082 responden HTTP 200. No requirió reiniciar el backend.
- `git diff --check`, aprobado.

Migraciones: N/A. Despliegue: N/A, cambios locales. Se preservó el trabajo previo sin confirmar.
La protección contra doble clic evita envíos simultáneos; no se añadió un contrato de idempotencia
nuevo al endpoint de creación. Un resultado de red ambiguo conserva la semántica de creación existente.
