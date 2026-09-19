# Expenses / Finanzas

Módulo financiero para gastos, presupuestos, proveedores, cuentas de pago, cuentas contables e indicadores. La interfaz sigue el Frontend Operating System V2 y usa verde `#147514` como identidad del pilar; los estados conservan colores semánticos independientes.

Reglas propietarias: [mapa de dominio](domain/DOMAIN_MAP.md),
[reglas financieras](domain/FINANCE_BUSINESS_RULES.md), [fondos](domain/PETTY_CASH_DOMAIN_CONTRACT.md),
[acciones masivas y correcciones](../../../../../docs/finance-bulk-actions-and-workspace-memory-contract-v1.md)
e [indicadores](../../../../../docs/expenses-kpi-workspace-contract.md).
Este README orienta la lectura; los contratos definen transiciones y restricciones.

## Estructura vigente

- `ExpensesModule.tsx`: shell, navegación por pestañas y estado compartido.
- `Expenses/Expenses.tsx`: orquestador de la lista de gastos y sus operaciones.
- `Expenses/components/ExpenseDetailModal.tsx`: expediente financiero de un gasto.
- `Expenses/components/ExpenseTable.tsx`: tabla de escritorio, selección, orden y paginación.
- `Expenses/components/ExpenseMobileCards.tsx`: índice móvil compacto.
- `components/modals/`: altas, edición, cuentas por pagar, abonos y kioscos.
- `services/`: integración con las APIs de Finance y almacenamiento documental.
- `translations/`: contratos y textos por región.
- `types/`, `adapters/`, `hooks/`, `utils/` y `constants/`: dominio y soporte compartido.

## Jerarquía UX de Gastos

La lista es un índice operativo, no el expediente completo.

1. El encabezado expone únicamente alta de gasto, cuenta por pagar y un menú de acciones secundarias.
2. El resumen muestra total visible, saldo abierto, vencido y cumplimiento; el detalle por estado ocupa una franja separada.
3. La tabla inicia con folio, proveedor, concepto, total, saldo, vencimiento, estado y acciones. El resto se habilita desde Columnas.
4. Cada fila ofrece el expediente y las acciones Abonar/Pagar aplicables. Editar, auditar y retirar
   respetan estado, origen y permisos. Duplicar e imprimir no son acciones de fila; la impresión
   vive en el expediente y en el flujo autorizado de selección. Cambiar una etiqueta no registra un pago.
5. En móvil se muestran folio, concepto, proveedor, estado, total y saldo. El expediente concentra fechas, clasificación, abonos, comprobantes, archivos y trazabilidad.

## Reglas funcionales importantes

- La retirada explícita de gastos ordinarios puede incluir gastos pagados, con motivo y auditoría.
  Conserva las restricciones de gastos auditados/cerrados, órdenes recibidas, fondos y asientos
  contabilizados del contrato propietario; no equivale al borrado genérico ni elimina su historia.
- Registrar un abono admite uno o varios comprobantes.
- Cada comprobante de abono conserva monto, fecha y cuenta de pago para reconstruir el historial en el expediente y en Archivos.
- Los archivos generales del gasto y los comprobantes de abono se distinguen visualmente.
- La carga documental usa URLs firmadas y el proxy `/storage/` en despliegues HTTPS.
- Las cuentas de pago se filtran por estado, moneda y compatibilidad con el backend.

## Estándar visual

- Texto operativo mínimo: `text-xs` (12 px).
- Peso máximo rutinario: `font-medium`.
- Una acción primaria por contexto; las acciones secundarias se agrupan.
- `rounded-xl` es el radio normal de superficies. Las cápsulas se reservan para estados y filtros.
- Verde identifica Finanzas; éxito, advertencia, error e información usan sus tonos semánticos.
- Evitar tarjetas dentro de tarjetas cuando una separación, franja o divisor resuelva la jerarquía.

Las reglas completas viven en [Frontend OS](../../../../../docs/indice-frontend-operating-system-v2.md).
El [reporte de estandarización de agosto](../../../../../docs/expenses-petty-cash-receivables-frontend-visual-standardization-2026-08-01.md)
conserva el alcance de esa intervención; no sustituye decisiones posteriores.

## Validación

Desde `react/`:

```bash
npm run typecheck
npm run test:expenses
npm run test:expenses-ui
npm run build
```

Las regresiones cubren el flujo pagado, evidencia de abonos, expediente financiero, jerarquía de acciones, legibilidad tipográfica y preservación del shell/kiosco compartido.
