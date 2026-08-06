# Expenses / Finanzas

Módulo financiero para gastos, presupuestos, proveedores, cuentas de pago, cuentas contables e indicadores. La interfaz sigue el Frontend Operating System V2 y usa verde `#147514` como identidad del pilar; los estados conservan colores semánticos independientes.

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
4. Cada fila prioriza Ver expediente y Registrar abono. Editar, imprimir, duplicar, marcar pagado, auditar y eliminar viven en el menú contextual.
5. En móvil se muestran folio, concepto, proveedor, estado, total y saldo. El expediente concentra fechas, clasificación, abonos, comprobantes, archivos y trazabilidad.

## Reglas funcionales importantes

- Un gasto operativo (`type: real`) puede eliminarse aunque esté pagado; el backend sigue protegiendo registros fuera del alcance permitido.
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

Las reglas completas viven en `docs/indice-frontend-operating-system-v2.md` y `docs/expenses-petty-cash-receivables-frontend-visual-standardization-2026-08-01.md`.

## Validación

Desde `react/`:

```bash
npm run typecheck
npm run test:expenses
npm run test:expenses-ui
npm run build
```

Las regresiones cubren el flujo pagado, evidencia de abonos, expediente financiero, jerarquía de acciones, legibilidad tipográfica y preservación del shell/kiosco compartido.
