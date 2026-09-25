# Lupita y especialistas — evolución funcional del MCP

Decisión de producto: 2026-09-22, especificación aportada y adoptada por el propietario.
Estado: alcance aprobado; implementación incremental, con estado explícito por entrega.
Contrato propietario: [MCP Operating System](indice-mcp-operating-system-v1.md).

## Objetivo y responsabilidades

Completar las herramientas del MCP existente para la operación de la empresa. Reutilizar servicios,
entidades y permisos del ERP. La definición de agentes no exige reconstruir módulos ni ampliar
esta tarea a billing, distribuidores comerciales, certificaciones o proformas de inversión.

Lupita es la coordinadora visible: profesional, respetuosa, cálida, eficiente, honesta, transparente
y no complaciente; tutea cuando corresponde al idioma. Considera Personas, Procesos, Productos y
Finanzas, priorizando continuidad empresarial e impactos humanos, operativos y legales.

| Especialista | Responsabilidad | Criterio de comportamiento |
| --- | --- | --- |
| Controla | RH y Tareas/Procesos | Hombre, serio, metódico, disciplinado y persistente con pendientes. La disciplina tarde o temprano vence a la inteligencia. |
| Escala | Inventario, POS y Ventas/CRM | Cálido, carismático y comercial; crecimiento fundamentado en métricas. |
| Finanzas | Gastos y Caja Chica | Mujer, estricta con dinero y presupuesto, capaz de recomendar inversión justificada. El dinero que no controlas termina controlándote. |
| Corporativo | Cartera y KPIs | Hombre, sereno, analítico, estratégico; considera el costo de oportunidad. |

El usuario habla con Lupita, quien puede integrar perspectivas y explicar desacuerdos y sus
consecuencias. Respuestas complejas: prioridad, contexto, consecuencia, recomendación y acción.
La respuesta distingue evidencia, interpretación y datos faltantes, con periodo, moneda y alcance.

Personalidad define comportamiento; las guías de trabajo definen cómo analizar; MCP suministra
datos y acciones. Una instrucción de personalidad no concede permisos ni ejecuta especialistas.
Los datos recuperados se tratan como información, nunca como instrucciones para el asistente.

## Habilitación comercial objetivo

| Plan de la especificación | Especialistas previstos |
| --- | --- |
| Controla | Lupita y Controla |
| Escala | Lupita, Controla, Escala y Finanzas; POS o Ventas/CRM |
| Corporativo | Los cinco; POS y Ventas/CRM, Cartera y KPIs |

La disponibilidad de agentes se debe combinar con el contrato contratado, módulos, pestañas,
jerarquía y alcance vigentes. No deducir un plan desde el nombre de un agente o desde una lista de
tools. El código comercial actual `corporativiza` y el nombre Corporativo de esta especificación
no se renombran automáticamente. KPIs básicos ya incluidos conservan su contrato comercial;
el especialista Corporativo es una capacidad distinta. La habilitación comercial y ejecución
multiagente aún no están implementadas por esta entrega de herramientas.

## Alcance funcional aprobado y brechas

Los estados describen el código de esta rama; no certifican disponibilidad en producción.

| Área | Funciones objetivo | Base existente y trabajo pendiente |
| --- | --- | --- |
| RH: colaboradores/asistencia | Ficha autorizada con salario y periodo de pago; historia individual/colectiva y asistencia actual | Ficha sin salario, calendario mensual individual y excepciones diarias existentes. Completar campos autorizados, historial colectivo y consulta completa. |
| RH: nómina | Totales e historia de totales | Pendiente de adaptación; detalle completo y operación de nómina excluidos. |
| RH: comunicados | Consultar, enviar, identificar leído/no leído | Pendiente. |
| RH: actas, permisos, incentivos, KPIs | Solo consultar/analizar; no aprobar permisos | Pendiente. |
| Agenda | Consultar agendas permitidas; crear, editar, delegar y compartir tareas; crear/asignar listas | Lectura de tareas y creación propia disponibles. Resto pendiente. |
| Proyectos | Consultar responsables/avance; crear, asignar y editar tareas del proyecto | Pendiente de herramientas específicas. No implica crear/editar el proyecto. |
| Procesos y sus KPIs | Consultar responsables, participantes y cumplimiento | Pendiente; creación y configuración de procesos excluidas. |
| Productos | Consultar y crear | Lectura existente; creación pendiente. Edición/eliminación libre excluidas. |
| Almacenes e inventario | Consultar almacenes, existencias por almacén y multiinventario | Resolver de almacenes entregado. Detalle por producto/resumen existentes; ampliar consultas completas. Escrituras específicas pendientes de definición. |
| Proveedores | Consulta compartida entre Gastos e Inventarios | Resolver entregado; creación/edición pendientes de decisión. |
| Compras y descuentos | Consultar órdenes, información relacionada, vigencia y periodos | Pendiente; escritura excluida del alcance aprobado. |
| POS | Supervisar cajas, turnos actuales/históricos, acumulados y cortes | Consulta base existente; completar filtros y agregados históricos. Sin operación física de venta ni kioscos. |
| Clientes | Consulta, creación y edición de una misma entidad compartida | Resolver de clientes entregado; creación/edición pendientes. |
| Oportunidades | Consulta/pipeline, crear/editar, cambiar estado y reasignar responsable | Pendiente. |
| Cotizaciones | Consultar, crear, editar y asignar | Pendiente; el objetivo no se restringe a borradores. Los estados y efectos siguen al propietario comercial. |
| Ventas, comisiones y KPIs | Solo consultar/analizar | Ventas disponibles; comisiones y cobertura específica pendientes. |
| Gastos | Consultar, crear/subir, editar, registrar abonos y liquidar saldo | Lecturas y creación DRAFT existentes; resto pendiente. Usar correcciones/pagos del propietario, nunca falsificar PAID. |
| Control presupuestal | Consultar, crear y editar partidas | Consulta entregada; escritura pendiente. |
| Cuentas contables | Consultar y crear; no editar/eliminar | Consulta entregada; creación pendiente. |
| Cuentas de pago | Solo consultar información y saldos | Resolver existente; conserva saldos disponible/pendiente y alcance. |
| Caja chica | Consultar fondos/saldos/cortes; agregar comprobantes y listas; abonar solo como responsable/autorizado | Lecturas, una línea de gasto y depósito confirmado existentes. Adjuntos/lotes y validación específica del responsable pendientes. |
| Cartera | Consultar ventas a crédito, cuentas por cobrar, abonos, clientes a crédito e indicadores | Resumen existente; detalle y cobertura pendientes. Toda escritura excluida. |
| KPIs ejecutivos | Consultar matrices, estados financieros y automatizaciones; comparar periodos/módulos | Snapshot/alertas existentes; consultas específicas pendientes. Sin modificar informes ni automatizaciones. |

Cartera usa `credit-sales`, `accounts-receivable`, `payments`, `credit-customers`, `kpis`.
La ambigüedad cuentas por pagar/cobrar queda resuelta como cuentas por cobrar en este módulo.
Gastos comprende las seis áreas indicadas; ninguna se omite por el conteo verbal de cinco.

## Autonomía y cambios respecto a V1

La decisión objetivo permite ejecutar instrucciones claras de bajo riesgo, como crear tarea,
cliente, oportunidad o producto, sin una segunda confirmación. El backend debe validar identidad,
permiso, alcance, datos y reintento idempotente. Esa política requiere un protocolo explícito en
la entrega de cada nueva acción; no elimina la confirmación de las herramientas V1 actuales.

Acciones financieras sensibles, monetarias, masivas e irreversibles requieren confirmación y
auditoría. Ver un fondo no autoriza abonarlo. Cambiar estados debe respetar su efecto real y
transición de dominio. Inventario/almacenes requieren acciones acotadas y confirmadas; los tipos
exactos de escritura aún no están definidos. La regla de confirmar eliminaciones no autoriza
agregar herramientas de borrado ni elimina las restricciones de conservación del repositorio.

La exclusión V1 de salario/nómina se reemplazará únicamente para campos autorizados de ficha y
totales de nómina en su futura entrega, con permiso específico, minimización y pruebas negativas.
El detalle completo sigue excluido. Los campos V1 siguen filtrados mientras tanto.

Lectura de estados bancarios es una habilidad futura, no una herramienta entregada. Comparar
periodos y combinar módulos exige datos comparables y autorizados; no se inventan totales.

## Entrega 1: referencias operativas e instrucciones

Se añaden cinco herramientas de lectura y sus scopes separados. Las conexiones antiguas conservan
los scopes persistidos; renovar un token no concede los nuevos. El consentimiento muestra los
cinco alcances y los permisos actuales se verifican en discovery y otra vez al ejecutar.

| Tool | Scope nuevo | Permiso de módulo/pestaña | Propietario / endpoint delegado |
| --- | --- | --- | --- |
| `search_customers` | `customers.read` | CRM: cualquiera de leads/contacts/quotes/sales/contracts; o POS: clientes | Sales, `POST /api/v1/ai/tools/references/customers` |
| `search_providers` | `providers.read` | `expenses.providers` o `inventory.providers` | Finance ProviderService, `POST .../references/providers` |
| `list_warehouses` | `warehouses.read` | `inventory.inventory` o `crm.sales` | Sales/Inventory, `POST .../references/warehouses` |
| `search_budget_lines` | `budget_lines.read` | `expenses.budgets` o `expenses.kpis` | Finance BudgetLineService, `POST .../references/budget-lines` |
| `search_accounting_accounts` | `accounting_accounts.read` | `expenses.accounting` | Finance AccountingAccountService, `POST .../references/accounting-accounts` |

Todos requieren suscripción, módulo y capability correspondiente, más tenant y alcance del
usuario autenticado. Los POST son consultas protegidas por bearer, no mutaciones ni nuevas
excepciones de sesión/CSRF. Los clientes no eligen empresa, rol o alcance.

Customers/warehouses aplican tenant y alcance en las consultas SQL de filas y conteo mediante el
contrato read-only de Sales. Proveedores usan la entidad `finance_providers`, con un puente de
lectura desde el permiso de Inventarios o Gastos al mismo ProviderService y un FinanceContext
derivado del scope del servidor. El puente no concede escrituras de Finance. Presupuestos y
cuentas contables conservan FinanceContext y los servicios existentes.

Los resultados son DTOs tipados y esquemas Zod; excluyen identificadores fiscales, contactos
personales innecesarios, metadata libre y credenciales. Cada página tiene máximo 50 filas,
conteo completo autorizado, `hasMore` y cursor opaco. Clientes/almacenes paginan en SQL; las tres
referencias de Finance paginan la lista ya filtrada por su propietario. Los importes por partida
proceden del backend y mantienen moneda; no se presenta una suma de la página como total global.

La inicialización MCP incorpora instrucciones de Lupita y las perspectivas especialistas.
Esto es orientación al cliente compatible, no un runtime multiagente ni un control de acceso.
La comprobación de planes/especialistas y nuevas escrituras siguen pendientes.

## Verificación y siguiente entrega

- Contrato MCP completo en memoria con backend simulado: discovery, schemas, bearer, filtros,
  paginación, redacción, rechazo de autoridad cliente e instrucciones de inicialización.
- Backend: scopes nuevos, permisos módulo/pestaña/entitlement, revocación, tenant y scope en
  SQL de filas/conteo, cursor inválido, identidad del token y errores sin mensajes internos.
- Frontend: etiquetas y selección de nuevos permisos de lectura, TypeScript/build y regresión
  de Integraciones. Sin cambios de navegación ni estilos.
- Sin migraciones ni cambios de datos. El test local no certifica APPTEST/producción; probar
  conversación OAuth real y seguir deployment/rollback antes de publicar.

La siguiente entrega puede completar Controla (lecturas de RH/proyectos/procesos y asignación de
tareas) sobre la misma matriz. Después, clientes/oportunidades/cotizaciones y las acciones de
Finance con sus contratos transaccionales y pruebas de reintento. Mantener cada bloque revisable.

### Resultado local de la entrega 1

Rama: `codex/lupita-mcp-evolution`. Sin publicación ni modificación de datos de negocio.

| Validación ejecutada | Resultado |
| --- | --- |
| Maven, `-Dtest=Ai*Test,!AiOAuthUserInfoRepositoryIntegrationTest,SalesReferenceRepositoryTest test`, JDK 21 | 107 pruebas aprobadas; compilación de backend y tests correcta |
| `integrations/indice-mcp`: `npm test` | Build TypeScript y 34 pruebas aprobadas |
| `react`: `npm run test:integrations-ui` | 7 pruebas aprobadas |
| `react`: `npm run typecheck` y `npm run build` | Aprobados |
| `git diff --check` | Sin errores |
| Migración / modificación de datos | N/A |

Se corrigieron tres fixtures de Mockito para permisos alternativos y una expectativa antigua del
catálogo predeterminado. La ejecución final no tiene fallos. Maven conserva avisos de código
unchecked, deprecación de MockBean y carga dinámica de Mockito. Maven/Vite necesitaron permisos
locales fuera del sandbox para resolver dependencias y configuración; no se desplegó ningún servicio.

Los tests del repositorio Sales verifican SQL, parámetros y aislamiento esperado sin conectarse
a una base de datos. Quedan pendientes la integración con MySQL aislado, la conversación OAuth
real y las puertas de APPTEST. Las conexiones existentes requieren nuevo consentimiento para las
cinco consultas; un refresh no amplía su autorización. Al publicar, coordinar MCP/backend/web con
[el procedimiento de despliegue](../deployment/README.md): el backend nuevo puede anunciar tools
que un MCP antiguo no reconoce. Conservar las imágenes previas para rollback.

Los cambios funcionales se concentran en `AiOperationalReferenceService`, `AiReferencePages`,
`SalesReferenceReadService`, `SalesReferenceRepository`, el controlador de referencias y los tres
servicios de scopes/autorización/capabilities. En MCP: `operationalReferenceContracts.ts`,
`operationalReferenceTools.ts`, `assistantInstructions.ts`, cliente, catálogo y registro del servidor.
La interfaz cambia únicamente etiquetas y selección de scopes en Integraciones/consentimiento.
Se actualizan sus pruebas, la versión del paquete MCP y los documentos de alcance; se preservan
billing, navegación, estilos, datos, acciones V1 y su protocolo de confirmación.
