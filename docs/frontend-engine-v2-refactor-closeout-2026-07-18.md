# Frontend Engine v2 — Cierre de refactorización transversal

Fecha de cierre: 18 de julio de 2026

Documento rector aplicado: `docs/indice-frontend-operating-system-v2.md`

Estado: implementación terminada y validada para el alcance descrito en este documento.

## 1. Objetivo ejecutado

Se refactorizó la capa de presentación de los módulos operativos para que compartan el mismo lenguaje estructural de Frontend Engine v2 sin cambiar sus reglas de negocio.

Orden ejecutado:

1. Recursos Humanos.
2. Procesos y Tareas.
3. Gastos.
4. Caja Chica.
5. Cartera.
6. Ventas.
7. Punto de Venta.
8. Inventarios.
9. Auditoría transversal y cierre.

Los componentes, carpetas y pestañas KPI quedaron expresamente fuera de esta intervención. La auditoría final confirmó que no hay archivos KPI modificados.

## 2. Candados respetados

- No se modificaron endpoints, servicios backend, DTO, rutas de API, payloads ni esquemas de datos.
- No se alteraron permisos, validaciones de negocio, cálculos, flujos de aprobación ni persistencia.
- Se conservaron `useRoutedModuleTab`, aliases de rutas y contratos de navegación existentes.
- Se conservaron los cambios del piloto de Kiosk Engine que ya estaban en el árbol de trabajo antes de esta fase.
- No se incorporó una librería de modales nueva.
- No se usan `window.alert` ni `window.confirm` dentro del alcance.
- No se aplicaron cambios a `deployment/compose/docker-compose.local.yml`; sigue siendo un override local separado del refactor funcional.

## 3. Arquitectura transversal resultante

```text
react/src/app/components/
├── frontend-os/
│   ├── IndiceModuleShell.tsx
│   ├── IndiceTitleBar.tsx
│   ├── IndiceFilterBar.tsx
│   ├── IndiceViewState.tsx
│   └── index.ts
├── indice-modal/
│   ├── IndiceModalFrame.tsx
│   ├── IndiceModalFooter.tsx
│   ├── IndiceModalWizardStepper.tsx
│   ├── IndiceModalValidation.tsx
│   └── IndiceModalSummary.tsx
└── table/
    └── DataTablePagination.tsx
```

### `IndiceModuleShell`

Responsabilidad:

- encabezado compacto del módulo;
- barra de favoritos cuando existe navegación;
- acción de regreso;
- pestañas tipo píldora con color por módulo;
- integración del modo aprendizaje;
- área de contenido y overlays de carga.

No decide permisos, disponibilidad de pestañas, aliases, rutas ni qué componente se monta. Todo eso permanece en el módulo propietario.

### `IndiceTitleBar`

Responsabilidad:

- título operativo de cada pestaña;
- ícono, eyebrow opcional, subtítulo y acciones;
- color de módulo;
- integración con `LearningModeTitleBarBridge`;
- distribución responsive de acciones.

Los adaptadores `HrTitleBar`, `SalesTitleBar` y `PointOfSaleTitleBar` se conservaron como contratos de compatibilidad, pero ahora delegan la presentación al primitivo común.

### `IndiceFilterBar`

Responsabilidad:

- contenedor y cuadrícula responsive de filtros;
- búsqueda, select y campo genérico;
- altura de controles de 44 px;
- etiquetas accesibles;
- foco y color por módulo;
- soporte de modo oscuro.

No posee el estado de filtros ni ejecuta consultas. Cada vista sigue controlando sus valores, callbacks y opciones.

### `IndiceViewState`

Responsabilidad:

- estados `loading`, `empty`, `error`, `restricted` y `success`;
- semántica `status`/`alert`;
- iconografía y acción opcional;
- variante compacta y color del módulo.

### `DataTablePagination`

Se mantiene como paginación compartida. Sus textos por defecto ahora responden a los ocho locales soportados y conserva las opciones oficiales:

`10, 25, 50, 100, 200`.

## 4. Matriz por módulo

| Módulo | Color | Shell | Title bars | Filtros/Paginación | Modales/Estados | Resultado |
|---|---|---:|---:|---:|---:|---|
| RH | Aqua `#59C3A5` | Sí | Adaptador común | Colaboradores y Nómina alineados | Nómina y Pago variable migrados | Estructura común con permisos intactos |
| Procesos y Tareas | Amarillo `#F4C84A` | Sí | Agenda, Procesos, Proyectos y Tareas | Cola de tareas y Agenda alineadas | Base Índice existente preservada | Cola operativa coherente y localizada |
| Gastos | Verde `#147514` | Sí | Gastos, Proveedores, Cuentas de pago, Contabilidad y Presupuestos | Filtros compartidos | Base `IndiceModalFrame` preservada | Finanzas usa un solo tono y ritmo |
| Caja Chica | Verde `#147514` | Sí | Adaptador financiero | Shell de filtros y paginación alineados | Empty state común | Workspace financiero consistente |
| Cartera | Verde `#147514` | Sí | Title bar común | Filtros compartidos | Frame común para seis familias | Header duplicado eliminado |
| Ventas | Coral `#FF6B5E` | Sí | Adaptador común | Filtro y estados compartidos | Frame común conserva tipos | Header y tabs duplicados eliminados |
| Punto de Venta | Coral `#FF6B5E` | Sí | Adaptador común | Paginación común | Adapter POS coral para sus flujos | 36 consumidores comparten superficie |
| Inventarios | Coral `#FF6B5E` | Sí | Headers de Inventario/Ventas preservados | Contratos existentes | Modales comerciales existentes | Rutas delegadas sin duplicar módulo |

## 5. Detalle por fase

### 5.1 Recursos Humanos

- `HumanResources.tsx` consume `IndiceModuleShell`.
- La carga de sesión y evaluación de pestañas se extrajo a `useHumanResourcesAccess` sin cambiar `canAccessHumanResourcesTab`.
- El boundary de render se extrajo a `HumanResourcesTabErrorBoundary`.
- `HrTitleBar` pasó a ser un adaptador tipado del title bar común.
- Los filtros de Colaboradores usan los controles compartidos.
- Nómina usa las opciones oficiales de paginación.
- Los modales grandes de Nómina dejaron de crear overlays y superficies manuales; ahora usan `IndiceModalFrame`.
- Pago variable usa la misma cabecera, cierre, body y footer aqua.

### 5.2 Procesos y Tareas

- El módulo raíz consume `IndiceModuleShell` amarillo.
- Agenda, Procesos, Proyectos y Tareas usan `IndiceTitleBar`.
- La cola de Tareas usa filtros y paginación compartidos.
- La copia propia de la cola se aisló en `taskQueueTranslations.ts` para `es-MX`, `es-CO`, `en-US`, `en-CA`, `fr-CA`, `pt-BR`, `ko-CA` y `zh-CA`.
- Fechas, ausencia de fecha, confirmaciones y errores de validación responden al locale actual.
- Los payloads y servicios `tasksApi` no cambiaron.
- Los cambios previos del kiosco de Tareas y Procesos se conservaron y pasaron las pruebas de regresión.

### 5.3 Gastos

- `ExpensesModule.tsx` consume el shell común.
- `ExpensesHeader`, `ProvidersHeaderBanner`, `PaymentAccountsHeaderBanner`, `AccountingAccountsHeaderBanner` y `BudgetTableHeader` consumen el title bar común.
- Se migraron filtros de Gastos, Proveedores, Cuentas de pago y Cuentas contables.
- `BudgetFiltersPanel` reutiliza la clase oficial de control sin perder su composición de negocio.
- El color financiero se fijó en `#147514` para shell, title bars, filtros y modales.

### 5.4 Caja Chica

- `CajaChica.tsx` consume el shell común.
- `PettyCashFilterShell` y `PettyCashField` delegan el patrón visual compartido.
- El estado vacío consume `IndiceViewState`.
- Se agregó `common.clear` a los diccionarios base y regionales necesarios.
- No cambiaron conciliaciones, fondos, estados de cuenta ni persistencia.

### 5.5 Cartera

- El header local duplicado fue eliminado y el módulo usa `IndiceModuleShell`.
- `ReceivablesTitleBar` y `ReceivablesFilters` delegan los primitivos comunes.
- `ReceivablesModalFrame` delega `IndiceModalFrame` con tono verde.
- El estado de Cartera, candidatos de venta y `SalesCrmProvider` permanecen en sus propietarios.

### 5.6 Ventas

- `Ventas.tsx` consume el shell común.
- Los componentes duplicados `SalesHeader` y `SalesTabsNav` del nivel raíz fueron eliminados.
- `SalesTitleBar`, `SalesFilterBar` y `SalesDataStateBoundary` delegan primitivas compartidas.
- `SalesModalFrame` normaliza `large-workspace` a `operational-workspace` y conserva su API de compatibilidad.
- El inventario comercial dejó de inferir etiquetas comparando strings traducidos.

### 5.7 Punto de Venta

- `PuntoDeVenta.tsx` consume el shell coral.
- `PointOfSaleTitleBar` delega el title bar común y ya no inyecta un eyebrow español por defecto.
- `PointOfSaleTablePagination` delega la copia por locale de la paginación compartida.
- `PosModalFrame` mantiene el adapter Radix requerido por sus consumidores, pero usa cabecera, footer y acciones coral de forma uniforme.

### 5.8 Inventarios

- `Multiinventarios.tsx` consume `IndiceModuleShell` coral.
- Productos, Inventario y Proveedores se delegan a los componentes propietarios de Ventas; Órdenes de compra se delega al propietario de POS.
- Se conservaron ids y aliases de pestañas.
- Se eliminó `ComplementaryModules/Inventory/Inventarios.tsx`, que era una segunda entrada sin responsabilidad propia.

## 6. Clasificación de modales

La clasificación se realizó con el checklist del MD rector.

### Recursos Humanos / Nómina

| Flujo | Tipo asignado | Razón |
|---|---|---|
| Preferencias de Nómina | Wizard | Tiene tres etapas dependientes y navegación anterior/siguiente |
| Configuración de tasas | Operational Workspace | Compara perfiles, reglas automáticas y valores ajustables |
| Detalle de corrida | Operational Workspace | Tabla/selección de colaboradores, edición y acciones de corrida en paralelo |
| Configuración Colombia | Operational Workspace | Configuración empresarial, perfil y novedades en una misma superficie densa |
| Reportes PILA/DIAN | Operational Workspace | Compara snapshots, validaciones y payloads |
| Administración de pago variable | Operational Workspace | Compara bonos, comisiones y ajustes por colaborador |
| Agregar bono | Standard Form | Selección coherente de una plantilla |
| Agregar comisión | Standard Form | Selección coherente con resumen de importe |
| Agregar ajuste | Standard Form | Un solo formulario de ajuste |

### Procesos y Tareas

- Crear/editar tarea: Standard Form.
- Completar tarea: Standard Form.
- Auditoría de tarea: Standard Form.
- Confirmar cancelación/eliminación: Confirmation.
- Formularios de proceso y proyecto: Standard Form.
- Workspace de tareas de proyecto: Operational Workspace.

### Cartera

El adapter común cubre:

- venta a crédito: Standard Form;
- política de crédito: Standard Form;
- pago: Standard Form;
- archivos: Operational Workspace cuando se comparan adjuntos;
- detalle de venta: vista operativa de solo lectura;
- cliente de crédito: Standard Form.

### Ventas

`SalesModalFrame` continúa recibiendo la clasificación explícita de sus consumidores. Quedaron bajo la misma superficie:

- wizard de nueva venta;
- builders de cotización y catálogo público;
- formularios de contactos, oportunidades, productos, almacenes e inventario;
- workspaces de detalle, archivos, reglas y comisiones;
- confirmaciones de cancelación de movimiento.

### Punto de Venta

Los 36 consumidores de `PosModalFrame` comparten ahora el tono coral. Incluyen venta y cobro, apertura/cierre, clientes, crédito, descuentos, inventario, arqueos, órdenes de compra, portales y administradores de kiosco/display.

`PosModalFrame` permanece como adapter tipado del módulo porque varios flujos necesitan niveles de overlay y composición propios de la operación POS. Es una sola superficie compartida, no diseños independientes.

## 7. Hooks, estado y propiedad de negocio

- `useHumanResourcesAccess`: sólo encapsula la carga de sesión y devuelve `canAccessTab`/`isAccessLoaded`.
- `useRoutedModuleTab`: sigue siendo la fuente de verdad para pestaña activa, aliases y transición de carga.
- `useTablePagination`: sigue siendo dueño del cálculo de página; los componentes sólo unifican presentación y opciones.
- Hooks de traducción existentes siguen siendo la fuente de copy por módulo.
- Contextos `SalesCrmProvider`, divisas, negocio, permisos y modo aprendizaje no se movieron a componentes compartidos.
- Ningún componente de `frontend-os` importa APIs, adapters de backend ni modelos de negocio.

## 8. Exportabilidad y extensibilidad

Los primitivos nuevos son exportables porque reciben props de presentación y un `IndiceModuleTone`. Para sumar otro módulo:

1. El módulo conserva ids, permisos, rutas y estado.
2. Mapea sus tabs a `{ id, label, icon }`.
3. Selecciona un tono aprobado.
4. Provee title bars, filtros y estados mediante los primitivos.
5. Clasifica cada modal antes de elegir `IndiceModalFrame` o un adapter único del módulo.

Esto permite evolucionar módulos sin copiar headers, tabs, filtros o estados y sin convertir los componentes compartidos en un repositorio de reglas de negocio.

## 9. Elementos eliminados por duplicación

- `Receivables/components/ReceivablesModuleHeader.tsx`.
- `Sales/components/SalesHeader.tsx` del shell raíz.
- `Sales/components/SalesTabsNav.tsx` del shell raíz.
- `ComplementaryModules/Inventory/Inventarios.tsx`.
- `ProcessesTasks/Kiosk/components/PublicTaskKioskControls.tsx`, absorbido por los primitivos del workspace de kiosco del trabajo previo.

No se eliminaron servicios, modelos, adapters ni archivos de traducción de negocio.

## 10. Responsive, oscuro y accesibilidad

- Tabs con scroll horizontal en pantallas pequeñas y wrap en escritorio.
- Acciones del title bar apilables en móvil.
- Filtros de una columna en móvil y cuadrícula configurable en escritorio.
- Inputs y selects con etiquetas asociadas y foco visible.
- Estados con roles `status` o `alert` según su semántica.
- Modales con close accesible, bloqueo durante `busy`, Escape controlado y overlay consistente.
- Cabeceras, bodies, footers, filtros y estados incluyen variantes dark.
- Fechas y paginación usan el locale activo.

## 11. Verificación ejecutada

Desde `react/`:

```powershell
npm.cmd run typecheck -- --pretty false
npm.cmd run test:kiosks
npm.cmd run build
```

Resultados:

- TypeScript: aprobado, cero errores.
- Regresión de kioscos: 3 pruebas aprobadas, 0 fallas.
- Producción Vite: aprobada, 4,473 módulos transformados.
- `git diff --check`: aprobado, sin whitespace errors.
- Auditoría `window.alert`/`window.confirm`: cero resultados dentro del alcance.
- Auditoría de KPI modificados: cero resultados.
- Auditoría de `DialogContent` directo: sólo `PosModalFrame`, el adapter compartido intencional de POS.

## 12. Elementos deliberadamente sin reescritura

- No se rediseñaron KPIs ni sus componentes.
- No se reescribió la copia histórica de negocio que no fue introducida por este refactor; la copia nueva sí quedó localizada.
- `Payroll.tsx` continúa siendo un archivo grande por su concentración histórica de lógica y vistas. Sus superficies modales ya consumen el motor común; separar sus modelos, adapters y formularios internos debe hacerse como una fase de arquitectura de Nómina con pruebas funcionales específicas, no como una extracción mecánica.
- `PosModalFrame` conserva su adapter Radix por compatibilidad de 36 consumidores y capas de overlay; el estilo visible ya está unificado en coral.
- El override local de Docker no forma parte del cambio de producto.

## 13. Criterio de cierre

El refactor transversal queda cerrado porque los ocho módulos consumen el shell común, los adaptadores de título convergen en una sola implementación, los filtros/paginación principales usan primitivas compartidas, las familias de modales modificadas están clasificadas y el build productivo pasa sin modificar contratos de negocio.

La siguiente evolución segura no es crear otro sistema visual: debe extender estos primitivos o abrir una fase funcional separada para una pestaña concreta, con su propio inventario de estados y pruebas.
