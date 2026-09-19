# Módulos de la aplicación Índice

Estado: guía de navegación del código activo, subordinada al
[Frontend Operating System](../../../../docs/indice-frontend-operating-system-v2.md).
La raíz de ejecución es `react/src/app`; [App.tsx](../App.tsx) integra rutas y carga de módulos.

Empieza por el [README del producto](../../../../README.md) para entender la metodología y la
oferta. Una carpeta de frontend no equivale a un producto contratado ni certifica que el módulo
esté listo para producción.

## Entradas principales

| Área | Entrada | Responsabilidad |
|---|---|---|
| Dashboard | [PanelInicial.tsx](Dashboard/PanelInicial.tsx) | Inicio, metodología y acceso a la operación. |
| Recursos Humanos | [HumanResources.tsx](HumanResources/HumanResources.tsx) | Personas y sus operaciones laborales. |
| Procesos y Tareas | [ProcessesTasks.tsx](ProcessesTasks/ProcessesTasks.tsx) | Trabajo, procesos, proyectos y seguimiento. |
| Gastos / Finanzas | [ExpensesModule.tsx](Expenses/ExpensesModule.tsx) | Gastos, presupuestos, cuentas, proveedores e indicadores. |
| Caja Chica / Fondos | [CajaChica.tsx](PettyCash/CajaChica.tsx) | Custodia, movimientos, comprobación y estados de cuenta. |
| Ventas | [Ventas.tsx](Sales/Ventas.tsx) | CRM y operación comercial. |
| Punto de Venta | [PuntoDeVenta.tsx](PointOfSale/PuntoDeVenta.tsx) | Venta operativa, cobros y cortes. |
| Cartera | [index.tsx](Receivables/index.tsx) | Créditos, cuentas por cobrar y pagos. |
| Indicadores ejecutivos | [Kpis.tsx](Kpis/Kpis.tsx) | Lecturas y reportes sobre contratos de los módulos propietarios. |

Inventarios se monta desde [ComplementaryModules/Inventory](../ComplementaryModules/Inventory/).
La ubicación de una carpeta no define su disponibilidad comercial. Producción y Almacén de
Materiales conservan sus propios alcances; no se presume su liberación por existir en este árbol.

## Antes de modificar una superficie

1. Lee [AGENTS.md](../../../../AGENTS.md) y el contrato propietario en el
   [mapa documental](../../../../docs/README.md).
2. Identifica la entrada real, pestaña, servicios, permisos y regresiones del flujo.
3. Reutiliza navegación, tablas, filtros, modales y traducciones del Frontend OS.
4. Para aprendizaje e indicadores, aplica [Modo aprendiz](../../../../docs/learning-mode-frontend-engine-v2.md)
   y [KPI Tab Standard](../../../../docs/KPI_TAB_STANDARD.md).
5. Conserva contratos de API y comportamiento salvo cambio autorizado. El backend valida tenant,
   entitlement, permisos y pertenencia del recurso.
6. Ejecuta la regresión pertinente, TypeScript y build conforme a la
   [guía de desarrollo](../../../../docs/local-development.md).

Los colores, roles, pestañas y fórmulas se consultan en sus fuentes propietarias. Este índice evita
duplicar esos catálogos para que una actualización no deje instrucciones distintas en dos lugares.

## Historia

La [guía de modularización de marzo](../../../../docs/indice-basic-modules-structure-history.md)
conserva el inventario y ejemplos originales. Sus conteos, nombres de componentes, colores y
declaración de producción pertenecen a esa fecha y no gobiernan el runtime actual.
