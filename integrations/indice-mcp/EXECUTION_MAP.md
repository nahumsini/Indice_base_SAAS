# Mapa de ejecución MCP de Índice

## Objetivo comercial

Entregar un asistente confiable para dueños de PYMEs: consulta el negocio y ejecuta acciones pequeñas solo con permisos, confirmación, idempotencia y auditoría.

La evolución aprobada de Lupita y los cuatro especialistas se rige por
[`indice-lupita-mcp-evolution-contract.md`](../../docs/indice-lupita-mcp-evolution-contract.md).
La primera entrega añade los cinco resolutores de clientes, proveedores, almacenes, partidas y
cuentas contables, con permisos explícitos y guía de respuesta en la inicialización MCP.
Las acciones y la orquestación pendientes no se consideran disponibles por figurar en ese objetivo.

## V1: paquete vendible de lectura

| Prioridad | Herramienta | Preguntas que resuelve | Fuente existente | Estado |
| --- | --- | --- | --- | --- |
| P0 | `get_my_business_context`, `list_units_and_businesses` | Identifica la empresa, unidad, negocio y alcance actual. | Organizacion y alcance vigente | Implementada |
| P0 | `list_payment_accounts` | Identifica la cuenta autorizada para origen o destino. | Cuentas de pago y Tesoreria | Implementada |
| P0 | `list_funds` | Identifica el fondo exacto que puede seleccionarse. | Caja chica, sin credenciales de kiosco | Implementada |
| P0 | `get_sales_today` | ¿Cuánto vendí hoy? ¿Cuántas ventas hice? | `SalesKpiTodayService` | Funcional |
| P0 | `get_business_snapshot` | ¿Cómo va el negocio? ¿Cuánto gasté? ¿Cuánto me deben? ¿Qué está vencido? | `ExecutiveKpiService` | Implementada |
| P0 | `get_attention_items` | ¿Qué requiere mi atención? ¿Qué debo resolver primero? | `ExecutiveKpiService` | Implementada |
| P0 | `search_employees`, `get_employee_overview`, `get_attendance_exceptions` | ¿Cómo está este empleado? ¿Qué tareas tiene? ¿Quién faltó? | RH, asistencia y tareas | Implementada |
| P0 | `list_tasks`, `get_task_detail` | ¿Qué está vencido? ¿Qué delegué? ¿Qué tiene el equipo? | Procesos y tareas | Implementada |
| P0 | `get_sales_summary`, `list_sales`, `get_sale_detail` | ¿Cuánto vendí? ¿Qué contiene esta venta? | Ventas y tickets POS deduplicados | Implementada |
| P0 | `get_cash_status` | ¿Cuánto hay en caja? ¿Hay diferencias o cierres pendientes? | POS, cajas y turnos | Implementada |
| P0 | `search_products`, `get_product_detail`, `get_inventory_summary` | ¿Cuál es el precio, costo, existencia y valor de inventario? | Productos y saldos por almacén | Implementada |
| P0 | `get_expense_summary`, `list_expenses`, `get_expense_detail` | ¿Cuánto gasté? ¿Qué está pagado, por pagar o vencido? | Gastos y pagos | Implementada |
| P0 | `get_funds_status` | ¿Cuánto queda y cuánto se ha usado por fondo? | Caja chica | Implementada |
| P0 | `get_receivables_status` | ¿Quién me debe y qué cobros están vencidos? | Cuentas por cobrar | Implementada |

Regla: cada herramienta expone una pregunta de negocio, no tablas ni CRUD genérico. `companyId`, usuario y alcance siempre salen del token de Índice.

## V1: cuatro acciones seguras

Acciones habilitadas:

1. Crear tarea.
2. Crear gasto general en `DRAFT`.
3. Registrar una salida en fondo/caja chica.
4. Ingresar dinero a un fondo como `ADDITIONAL_DEPOSIT` desde una cuenta fuente exacta.

Implementado:

- alcances de lectura y escritura separados por dominio;
- suscripción, entitlement y acceso vigente al módulo correspondiente (`processes`, `expenses` o `petty_cash`);
- vista previa sin ejecutar y confirmación con vigencia de 5 minutos;
- commit sin campos mutables: solo confirmación e idempotencia;
- asignación limitada al usuario conectado;
- clave de idempotencia para impedir duplicados;
- auditoría con usuario, empresa, conexión, argumentos normalizados, resultado, fecha y correlación;
- confirmación ligada al nombre exacto de la herramienta para impedir uso cruzado;
- gasto general forzado a borrador, sin pago ni aprobación;
- salida de fondo separada de la autorización como gasto global;
- depósito de fondo con impacto en la cuenta fuente validado por el servicio financiero real.

## Acciones posteriores por riesgo

| Riesgo | Acciones | Decisión |
| --- | --- | --- |
| Bajo | Crear tarea | Habilitada con confirmación |
| Medio | Gasto en borrador, salida o depósito de fondo | Habilitadas con permiso específico y confirmación |
| Alto | Registrar pago, aprobar gasto, ajustar inventario, cancelar venta | Bloqueadas hasta OAuth, auditoría completa y pruebas de recuperación |
| Crítico | Nómina, permisos de usuarios, eliminaciones, movimientos irreversibles | Fuera del MVP |

## Puerta de salida a pruebas

No se publica en Internet hasta cumplir todo:

1. Contratos y pruebas automáticas aprobados.
2. Prueba real ChatGPT → túnel → MCP → Spring Boot → MySQL.
3. Revocación del token bloquea el acceso inmediatamente.
4. Usuario sin permiso recibe `403` y no obtiene datos parciales.
5. Dos empresas de prueba no pueden cruzar información.
6. HTTPS y OAuth 2.1 con PKCE antes de producción.
