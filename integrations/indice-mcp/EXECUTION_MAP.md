# Mapa de ejecución MCP de Índice

## Objetivo comercial

Entregar primero un asistente de consulta confiable para dueños de PYMEs. Las acciones se habilitan después de demostrar permisos, confirmación, idempotencia y auditoría.

## Fase 1: paquete vendible de lectura

| Prioridad | Herramienta | Preguntas que resuelve | Fuente existente | Estado |
| --- | --- | --- | --- | --- |
| P0 | `get_sales_today` | ¿Cuánto vendí hoy? ¿Cuántas ventas hice? | `SalesKpiTodayService` | Funcional |
| P0 | `get_business_snapshot` | ¿Cómo va el negocio? ¿Cuánto gasté? ¿Cuánto me deben? ¿Qué está vencido? | `ExecutiveKpiService` | Implementada |
| P0 | `get_attention_items` | ¿Qué requiere mi atención? ¿Qué debo resolver primero? | `ExecutiveKpiService` | Implementada |
| P1 | `get_sales_breakdown` | ¿Qué producto, canal o vendedor vendió más? | Ventas, tickets y KPI ejecutivo | Siguiente |
| P1 | `get_cash_status` | ¿Cuánto hay en caja? ¿Hay diferencias o cierres pendientes? | POS, caja y arqueos | Pendiente |
| P1 | `get_inventory_alerts` | ¿Qué productos tienen poco inventario o riesgo de agotarse? | Inventario y productos | Pendiente |
| P1 | `get_receivables_due` | ¿Quién me debe y qué cobros están vencidos? | Finanzas y cuentas por cobrar | Pendiente |
| P2 | `get_tasks_attention` | ¿Qué tareas están vencidas y quién es responsable? | Procesos y tareas | Pendiente |
| P2 | `get_attendance_exceptions` | ¿Quién faltó o llegó tarde? | Recursos Humanos y asistencia | Pendiente |

Regla: cada herramienta expone una pregunta de negocio, no tablas ni CRUD genérico. `companyId`, usuario y alcance siempre salen del token de Índice.

## Fase 2: primera acción segura

La primera acción será `create_task`, no registrar pagos ni modificar inventario.

Debe incluir antes de activarse:

- alcance `tasks.create` separado;
- permiso vigente `processes.calendar` o el permiso exacto que corresponda al flujo;
- vista previa y confirmación explícita del usuario;
- clave de idempotencia para impedir duplicados;
- auditoría con usuario, empresa, herramienta, argumentos, resultado y fecha;
- respuesta con el identificador y enlace interno de la tarea creada.

## Acciones posteriores por riesgo

| Riesgo | Acciones | Decisión |
| --- | --- | --- |
| Bajo | Crear tarea, agregar seguimiento, crear borrador de cliente u oportunidad | Después de `create_task` |
| Medio | Registrar gasto en borrador, completar tarea, crear cotización en borrador | Requiere permisos específicos y confirmación reforzada |
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
