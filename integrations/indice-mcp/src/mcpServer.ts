import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type {
  AttentionItems,
  BusinessQueryResult,
  BusinessSnapshot,
  BusinessSnapshotQuery,
  FinanceActionCommitRequest,
  FinanceActionCommitResponse,
  FinanceActionName,
  FinanceActionPreviewResponse,
  SalesTodaySummary,
  TaskCommitRequest,
  TaskCommitResponse,
  TaskPreviewRequest,
  TaskPreviewResponse
} from "./contracts.js";

export interface IndiceBusinessReader {
  getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary>;
  getBusinessSnapshot(query?: BusinessSnapshotQuery): Promise<BusinessSnapshot>;
  queryBusiness?(tool: string, args?: Record<string, unknown>): Promise<BusinessQueryResult>;
  previewCreateTask(request: TaskPreviewRequest): Promise<TaskPreviewResponse>;
  createTask(request: TaskCommitRequest): Promise<TaskCommitResponse>;
  previewFinanceAction?(action: FinanceActionName, request: Record<string, unknown>): Promise<FinanceActionPreviewResponse>;
  commitFinanceAction?(action: FinanceActionName, request: FinanceActionCommitRequest): Promise<FinanceActionCommitResponse>;
}

export function createIndiceMcpServer(reader: IndiceBusinessReader): McpServer {
  const server = new McpServer({
    name: "indice-business-tools",
    version: "0.1.0"
  });

  server.registerTool("get_sales_today", {
    title: "Get today's sales",
    description: "Obtiene el número y el total monetario de las ventas de hoy para la empresa autorizada en Índice. Úsala cuando el usuario pregunte cuánto vendió hoy.",
    inputSchema: {
      preferred_currency: z.string().regex(/^[A-Z]{3}$/).optional()
        .describe("Moneda ISO de tres letras para el total preferido, por ejemplo MXN, CAD o USD.")
    },
    outputSchema: {
      date: z.iso.date(),
      timezone: z.string(),
      saleCount: z.number().int().nonnegative(),
      monetaryTotal: z.object({
        preferredCurrency: z.string().regex(/^[A-Z]{3}$/),
        preferredTotal: z.number(),
        nativeTotals: z.array(z.object({
          currency: z.string().regex(/^[A-Z]{3}$/),
          amount: z.number()
        })),
        exchangeRate: z.object({
          mode: z.string(),
          effectiveDate: z.iso.date(),
          source: z.string()
        }),
        partial: z.boolean(),
        excludedRecords: z.number().int().nonnegative(),
        excludedCurrencies: z.array(z.string())
      })
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ preferred_currency }) => {
    try {
      const result = await reader.getSalesToday(preferred_currency);
      return {
        content: [{ type: "text", text: humanSummary(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return {
        isError: true,
        content: [{ type: "text", text: message }]
      };
    }
  });

  server.registerTool("get_business_snapshot", {
    title: "Get business snapshot",
    description: "Resume la salud del negocio autorizado en Índice para un periodo: ventas, cobros, gastos, utilidad, cuentas por cobrar y pagar, caja chica, tareas, asistencia y alertas. Úsala para preguntas ejecutivas como cómo va el negocio, cuánto se gastó, cuánto se debe cobrar o qué requiere atención.",
    inputSchema: {
      period: z.enum(["monthly", "bimonthly", "quarterly", "semester", "annual", "custom"])
        .optional()
        .describe("Periodo de análisis. El valor predeterminado es monthly."),
      from: z.iso.date().optional()
        .describe("Fecha inicial YYYY-MM-DD. Solo se usa con period=custom."),
      to: z.iso.date().optional()
        .describe("Fecha final YYYY-MM-DD. Solo se usa con period=custom."),
      preferred_currency: z.string().regex(/^[A-Z]{3}$/).optional()
        .describe("Moneda ISO de tres letras para los importes, por ejemplo MXN, CAD o USD.")
    },
    outputSchema: {
      range: z.object({
        from: z.iso.date(),
        to: z.iso.date(),
        period: z.enum(["monthly", "bimonthly", "quarterly", "semester", "annual", "custom"])
      }),
      context: z.object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        generatedAt: z.iso.datetime(),
        scopeLabel: z.string()
      }),
      summary: z.object({
        salesTotal: z.number(),
        collectedTotal: z.number(),
        expensesTotal: z.number(),
        payablesTotal: z.number(),
        receivablesTotal: z.number(),
        overdueReceivables: z.number(),
        pettyCashBalance: z.number(),
        operatingProfit: z.number(),
        operatingMargin: z.number(),
        totalTasks: z.number().int().nonnegative(),
        overdueTasks: z.number().int().nonnegative(),
        absences: z.number().int().nonnegative(),
        attendanceRate: z.number(),
        organizationRows: z.number().int().nonnegative(),
        executiveScore: z.number().int()
      }),
      alerts: z.array(z.object({
        status: z.enum(["healthy", "watch", "critical"]),
        title: z.string(),
        description: z.string()
      }))
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ period, from, to, preferred_currency }) => {
    try {
      const result = await reader.getBusinessSnapshot({
        period,
        from,
        to,
        preferredCurrency: preferred_currency
      });
      return {
        content: [{ type: "text", text: humanBusinessSnapshot(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return {
        isError: true,
        content: [{ type: "text", text: message }]
      };
    }
  });

  server.registerTool("get_attention_items", {
    title: "Get attention items",
    description: "Obtiene únicamente las excepciones críticas y de seguimiento que requieren atención en la empresa autorizada en Índice. Úsala para preguntas como qué requiere mi atención, qué está mal o qué debo resolver primero. Para consultar solo hoy usa period=custom con la misma fecha en from y to.",
    inputSchema: {
      period: z.enum(["monthly", "bimonthly", "quarterly", "semester", "annual", "custom"])
        .optional()
        .describe("Periodo de análisis. El valor predeterminado es monthly."),
      from: z.iso.date().optional()
        .describe("Fecha inicial YYYY-MM-DD. Solo se usa con period=custom."),
      to: z.iso.date().optional()
        .describe("Fecha final YYYY-MM-DD. Solo se usa con period=custom."),
      preferred_currency: z.string().regex(/^[A-Z]{3}$/).optional()
        .describe("Moneda ISO de tres letras, por ejemplo MXN, CAD o USD.")
    },
    outputSchema: {
      range: z.object({
        from: z.iso.date(),
        to: z.iso.date(),
        period: z.enum(["monthly", "bimonthly", "quarterly", "semester", "annual", "custom"])
      }),
      context: z.object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        generatedAt: z.iso.datetime(),
        scopeLabel: z.string(),
        source: z.literal("executive_kpis")
      }),
      overview: z.object({
        executiveScore: z.number().int(),
        criticalCount: z.number().int().nonnegative(),
        watchCount: z.number().int().nonnegative(),
        healthy: z.boolean()
      }),
      items: z.array(z.object({
        status: z.enum(["critical", "watch"]),
        title: z.string(),
        description: z.string()
      }))
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ period, from, to, preferred_currency }) => {
    try {
      const snapshot = await reader.getBusinessSnapshot({
        period,
        from,
        to,
        preferredCurrency: preferred_currency
      });
      const result = attentionItems(snapshot);
      return {
        content: [{ type: "text", text: humanAttentionItems(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return {
        isError: true,
        content: [{ type: "text", text: message }]
      };
    }
  });

  server.registerTool("preview_create_task", {
    title: "Prepare task creation",
    description: "Prepara una vista previa exacta para crear una tarea en Índice asignada al usuario conectado. No crea la tarea. Muestra la vista previa al usuario y espera su confirmación explícita antes de usar create_task.",
    inputSchema: {
      title: z.string().trim().min(1).max(180)
        .describe("Título claro de la tarea."),
      description: z.string().trim().min(1).max(2000).optional()
        .describe("Descripción opcional de la tarea."),
      priority: z.enum(["low", "medium", "high"]).optional()
        .describe("Prioridad. El valor predeterminado es medium."),
      due_date: z.iso.date().optional()
        .describe("Fecha de vencimiento exacta en formato YYYY-MM-DD.")
    },
    outputSchema: {
      confirmationToken: z.string().startsWith("idx_confirm_"),
      expiresAt: z.iso.datetime(),
      requiresConfirmation: z.literal(true),
      task: z.object({
        title: z.string(),
        description: z.string().nullable(),
        priority: z.enum(["low", "medium", "high"]),
        dueDate: z.iso.date().nullable(),
        assignee: z.literal("Usuario conectado")
      })
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  }, async ({ title, description, priority, due_date }) => {
    try {
      const result = await reader.previewCreateTask({
        title,
        description,
        priority,
        dueDate: due_date
      });
      return {
        content: [{ type: "text", text: humanTaskPreview(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });

  server.registerTool("create_task", {
    title: "Create confirmed task",
    description: "Crea en Índice únicamente la tarea contenida en una vista previa vigente. Úsala solo después de que el usuario confirme explícitamente los datos exactos mostrados por preview_create_task. No acepta título, descripción, prioridad ni fecha para impedir cambios posteriores a la confirmación.",
    inputSchema: {
      confirmation_token: z.string().startsWith("idx_confirm_")
        .describe("Token interno devuelto por preview_create_task."),
      idempotency_key: z.string().min(8).max(128)
        .describe("Clave única generada para este intento, preferentemente un UUID. Reutiliza la misma al reintentar.")
    },
    outputSchema: {
      replayed: z.boolean(),
      correlationId: z.uuid(),
      task: z.object({
        id: z.number().int().positive(),
        folio: z.string().nullable(),
        title: z.string(),
        status: z.string(),
        dueDate: z.iso.date().nullable()
      })
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async ({ confirmation_token, idempotency_key }) => {
    try {
      const result = await reader.createTask({
        confirmationToken: confirmation_token,
        idempotencyKey: idempotency_key
      });
      return {
        content: [{ type: "text", text: humanCreatedTask(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });

  registerBusinessReadTools(server, reader);
  registerFinanceActionTools(server, reader);

  return server;
}

const queryOutputSchema = {
  tool: z.string(),
  generatedAt: z.iso.datetime(),
  scope: z.string(),
  count: z.number().int().nonnegative(),
  summary: z.record(z.string(), z.unknown()),
  items: z.array(z.record(z.string(), z.unknown())),
  detail: z.unknown().optional()
};

type InputShape = Record<string, z.ZodType>;

function registerBusinessReadTool(
  server: McpServer,
  reader: IndiceBusinessReader,
  name: string,
  title: string,
  description: string,
  inputSchema: InputShape,
  toArgs: (input: Record<string, unknown>) => Record<string, unknown>
): void {
  server.registerTool(name, {
    title,
    description,
    inputSchema,
    outputSchema: queryOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  }, async (input) => {
    try {
      if (!reader.queryBusiness) throw new Error("Business queries are not configured.");
      const result = await reader.queryBusiness(name, toArgs(input));
      return {
        content: [{ type: "text", text: humanBusinessQuery(result) }],
        structuredContent: result
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });
}

function registerBusinessReadTools(server: McpServer, reader: IndiceBusinessReader): void {
  const limit = z.number().int().min(1).max(100).optional().describe("Máximo de registros; predeterminado 25.");
  const from = z.iso.date().optional().describe("Fecha inicial inclusiva YYYY-MM-DD.");
  const to = z.iso.date().optional().describe("Fecha final inclusiva YYYY-MM-DD.");

  registerBusinessReadTool(server, reader, "search_employees", "Buscar empleados",
    "Busca colaboradores visibles para el usuario conectado sin revelar nómina, documentos ni identificadores sensibles.", {
      query: z.string().trim().min(1).max(120).optional(),
      status: z.string().trim().max(40).optional(),
      department: z.string().trim().max(120).optional(), limit
    }, input => input);

  registerBusinessReadTool(server, reader, "get_employee_overview", "Consultar empleado",
    "Obtiene el perfil operativo, tareas visibles y asistencia mensual de un colaborador autorizado. No devuelve salario, documentos ni datos personales sensibles.", {
      employee_id: z.number().int().positive(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(), limit
    }, input => camelArgs(input, { employee_id: "employeeId" }));

  registerBusinessReadTool(server, reader, "get_attendance_exceptions", "Consultar incidencias de asistencia",
    "Lista ausencias, retardos y otras excepciones de asistencia visibles para una fecha; omite fotos, coordenadas y datos biométricos.", {
      date: z.iso.date().optional(), limit
    }, input => input);

  registerBusinessReadTool(server, reader, "list_tasks", "Listar tareas",
    "Lista tareas visibles con filtros operativos. Úsala para tareas propias, delegadas, de equipo o de un empleado dentro del alcance autorizado.", {
      query: z.string().trim().max(160).optional(),
      status: z.string().trim().max(40).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      employee_id: z.number().int().positive().optional(),
      overdue_only: z.boolean().optional(), limit
    }, input => camelArgs(input, { employee_id: "employeeId", overdue_only: "overdueOnly" }));

  registerBusinessReadTool(server, reader, "get_task_detail", "Consultar detalle de tarea",
    "Obtiene una tarea visible con seguimiento y dependencias, respetando el mismo alcance de Índice.", {
      task_id: z.number().int().positive()
    }, input => camelArgs(input, { task_id: "taskId" }));

  const salesFilters = {
    from, to,
    source: z.enum(["all", "commercial", "pos"]).optional(),
    customer: z.string().trim().max(160).optional()
  };
  registerBusinessReadTool(server, reader, "get_sales_summary", "Resumir ventas",
    "Resume ventas por periodo y moneda, unificando ventas comerciales y tickets POS sin duplicar ventas vinculadas.", salesFilters,
    input => input);
  registerBusinessReadTool(server, reader, "list_sales", "Listar ventas",
    "Lista ventas por fecha, cliente y origen con importes, estado, caja o vendedor cuando estén disponibles.", {
      ...salesFilters, limit
    }, input => input);
  registerBusinessReadTool(server, reader, "get_sale_detail", "Consultar detalle de venta",
    "Obtiene el detalle autorizado de una venta comercial o ticket POS, incluyendo partidas y pagos disponibles.", {
      sale_id: z.number().int().positive(),
      source: z.enum(["commercial", "pos"]).optional()
    }, input => camelArgs(input, { sale_id: "saleId" }));

  registerBusinessReadTool(server, reader, "get_cash_status", "Consultar estado de cajas",
    "Consulta cajas, turnos y, si se indica, el resumen de cierre de un turno POS autorizado.", {
      shift_id: z.number().int().positive().optional()
    }, input => camelArgs(input, { shift_id: "shiftId" }));

  registerBusinessReadTool(server, reader, "search_products", "Buscar productos",
    "Busca productos por nombre, código o SKU y devuelve precio, costo e indicadores de disponibilidad solo dentro del inventario autorizado.", {
      query: z.string().trim().max(160).optional(),
      sku: z.string().trim().max(120).optional(),
      category: z.string().trim().max(120).optional(),
      status: z.string().trim().max(40).optional(), limit
    }, input => input);
  registerBusinessReadTool(server, reader, "get_product_detail", "Consultar producto",
    "Obtiene detalle, precio, costo y saldos por almacén de un producto autorizado.", {
      product_id: z.number().int().positive()
    }, input => camelArgs(input, { product_id: "productId" }));
  registerBusinessReadTool(server, reader, "get_inventory_summary", "Resumir inventario",
    "Resume valor del inventario por moneda y productos con existencia baja o agotada dentro del alcance autorizado.", { limit },
    input => input);

  const expenseFilters = {
    from, to,
    status: z.string().trim().max(40).optional(),
    payment_status: z.string().trim().max(40).optional(),
    overdue_only: z.boolean().optional(),
    query: z.string().trim().max(160).optional()
  };
  registerBusinessReadTool(server, reader, "get_expense_summary", "Resumir gastos",
    "Resume gastos, pagado, por pagar y vencidos por moneda usando los mismos estados de Finanzas.", expenseFilters,
    input => camelArgs(input, { payment_status: "paymentStatus", overdue_only: "overdueOnly" }));
  registerBusinessReadTool(server, reader, "list_expenses", "Listar gastos",
    "Lista gastos autorizados con filtros de fecha, estado, vencimiento y búsqueda.", { ...expenseFilters, limit },
    input => camelArgs(input, { payment_status: "paymentStatus", overdue_only: "overdueOnly" }));
  registerBusinessReadTool(server, reader, "get_expense_detail", "Consultar gasto",
    "Obtiene el detalle y pagos registrados de un gasto autorizado.", {
      expense_id: z.number().int().positive()
    }, input => camelArgs(input, { expense_id: "expenseId" }));

  registerBusinessReadTool(server, reader, "get_funds_status", "Consultar fondos",
    "Consulta saldos, estados de cuenta, movimientos y gastos recientes de caja chica sin revelar accesos de kiosco.", {
      fund_id: z.number().int().positive().optional(), limit
    }, input => camelArgs(input, { fund_id: "fundId" }));

  registerBusinessReadTool(server, reader, "get_receivables_status", "Consultar cuentas por cobrar",
    "Resume cuentas por cobrar, saldos, vencimientos y clientes dentro del alcance autorizado.", {
      customer: z.string().trim().max(160).optional(),
      status: z.string().trim().max(40).optional(),
      overdue_only: z.boolean().optional(), limit
    }, input => camelArgs(input, { overdue_only: "overdueOnly" }));
}

function registerFinanceActionTools(server: McpServer, reader: IndiceBusinessReader): void {
  registerFinancePreview(server, reader, "preview_create_expense_draft", "Preparar gasto en borrador",
    "Prepara un gasto general en estado DRAFT. No paga ni aprueba el gasto. Muestra la vista previa y espera confirmación explícita antes de usar create_expense_draft.",
    "create_expense_draft", {
      concept: z.string().trim().min(1).max(220),
      description: z.string().trim().max(2000).optional(),
      expense_type: z.enum(["FIXED", "VARIABLE"]).optional(),
      subtotal_amount: z.number().nonnegative().optional(),
      tax_amount: z.number().nonnegative().optional(),
      total_amount: z.number().nonnegative(),
      currency_code: z.string().regex(/^[A-Z]{3}$/),
      expense_date: z.iso.date(), due_date: z.iso.date().optional(),
      unit_id: z.number().int().positive().optional(), business_id: z.number().int().positive().optional(),
      provider_id: z.number().int().positive().optional(), budget_line_id: z.number().int().positive().optional(),
      accounting_account_id: z.number().int().positive().optional(), payment_account_id: z.number().int().positive().optional()
    }, input => camelArgs(input, {
      expense_type: "expenseType", subtotal_amount: "subtotalAmount", tax_amount: "taxAmount",
      total_amount: "totalAmount", currency_code: "currencyCode", expense_date: "expenseDate",
      due_date: "dueDate", unit_id: "unitId", business_id: "businessId", provider_id: "providerId",
      budget_line_id: "budgetLineId", accounting_account_id: "accountingAccountId", payment_account_id: "paymentAccountId"
    }));
  registerFinanceCommit(server, reader, "create_expense_draft", "Crear gasto confirmado en borrador", "create_expense_draft",
    "Crea únicamente el gasto DRAFT de una vista previa vigente; nunca lo paga ni lo aprueba.", false);

  registerFinancePreview(server, reader, "preview_register_fund_expense", "Preparar gasto de fondo",
    "Prepara una salida de caja chica como línea del fondo. Reduce el saldo al confirmar, pero no crea ni autoriza un gasto global.",
    "register_fund_expense", {
      fund_id: z.number().int().positive(), statement_id: z.number().int().positive().optional(),
      description: z.string().trim().min(1).max(220), receipt_reference: z.string().trim().max(160).optional(),
      subtotal_amount: z.number().nonnegative().optional(), tax_amount: z.number().nonnegative().optional(),
      total_amount: z.number().positive(), currency_code: z.string().regex(/^[A-Z]{3}$/),
      expense_date: z.iso.date(), provider_id: z.number().int().positive().optional(),
      accounting_account_id: z.number().int().positive().optional()
    }, input => camelArgs(input, {
      fund_id: "fundId", statement_id: "statementId", receipt_reference: "receiptReference",
      subtotal_amount: "subtotalAmount", tax_amount: "taxAmount", total_amount: "totalAmount",
      currency_code: "currencyCode", expense_date: "expenseDate", provider_id: "providerId",
      accounting_account_id: "accountingAccountId"
    }));
  registerFinanceCommit(server, reader, "register_fund_expense", "Registrar gasto confirmado en fondo", "register_fund_expense",
    "Registra únicamente la salida exacta confirmada en el fondo seleccionado.", true);

  registerFinancePreview(server, reader, "preview_add_money_to_fund", "Preparar ingreso a fondo",
    "Prepara un depósito adicional a caja chica desde una cuenta fuente exacta. Muestra origen, fondo, monto y fecha antes de confirmar.",
    "add_money_to_fund", {
      fund_id: z.number().int().positive(), statement_id: z.number().int().positive().optional(),
      source_payment_account_id: z.number().int().positive(), amount: z.number().positive(),
      currency_code: z.string().regex(/^[A-Z]{3}$/), movement_date: z.iso.date(),
      reference: z.string().trim().max(220).optional()
    }, input => camelArgs(input, {
      fund_id: "fundId", statement_id: "statementId", source_payment_account_id: "sourcePaymentAccountId",
      currency_code: "currencyCode", movement_date: "movementDate"
    }));
  registerFinanceCommit(server, reader, "add_money_to_fund", "Ingresar dinero confirmado al fondo", "add_money_to_fund",
    "Registra únicamente el depósito adicional exacto confirmado y afecta la cuenta fuente indicada.", true);
}

function registerFinancePreview(
  server: McpServer,
  reader: IndiceBusinessReader,
  toolName: string,
  title: string,
  description: string,
  action: FinanceActionName,
  inputSchema: InputShape,
  toArgs: (input: Record<string, unknown>) => Record<string, unknown>
): void {
  server.registerTool(toolName, {
    title, description, inputSchema,
    outputSchema: {
      confirmationToken: z.string().startsWith("idx_confirm_"),
      expiresAt: z.iso.datetime(), requiresConfirmation: z.literal(true),
      action: z.enum(["create_expense_draft", "register_fund_expense", "add_money_to_fund"]),
      preview: z.record(z.string(), z.unknown())
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, async (input) => {
    try {
      if (!reader.previewFinanceAction) throw new Error("Finance actions are not configured.");
      const result = await reader.previewFinanceAction(action, toArgs(input));
      return { content: [{ type: "text", text: humanFinancePreview(result) }], structuredContent: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });
}

function registerFinanceCommit(
  server: McpServer,
  reader: IndiceBusinessReader,
  toolName: string,
  title: string,
  action: FinanceActionName,
  description: string,
  destructiveHint: boolean
): void {
  server.registerTool(toolName, {
    title,
    description: `${description} Úsala solo después de confirmación explícita de la vista previa.`,
    inputSchema: {
      confirmation_token: z.string().startsWith("idx_confirm_"),
      idempotency_key: z.string().min(8).max(128)
    },
    outputSchema: {
      replayed: z.boolean(), correlationId: z.uuid(),
      action: z.enum(["create_expense_draft", "register_fund_expense", "add_money_to_fund"]),
      result: z.record(z.string(), z.unknown())
    },
    annotations: { readOnlyHint: false, destructiveHint, idempotentHint: true, openWorldHint: false }
  }, async ({ confirmation_token, idempotency_key }) => {
    try {
      if (!reader.commitFinanceAction) throw new Error("Finance actions are not configured.");
      const result = await reader.commitFinanceAction(action, {
        confirmationToken: confirmation_token,
        idempotencyKey: idempotency_key
      });
      return { content: [{ type: "text", text: humanFinanceCommit(result) }], structuredContent: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Indice is unavailable.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });
}

function camelArgs(
  input: Record<string, unknown>,
  names: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) result[names[key] ?? key] = value;
  }
  return result;
}

function humanBusinessQuery(result: BusinessQueryResult): string {
  const summary = Object.entries(result.summary)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join("; ");
  return `${result.scope}. ${result.count} registros${summary ? `. ${summary}` : ""}.`;
}

function humanFinancePreview(result: FinanceActionPreviewResponse): string {
  return `Vista previa de ${result.action}: ${JSON.stringify(result.preview)}. Confirma explícitamente estos datos para ejecutar; la autorización vence en 5 minutos.`;
}

function humanFinanceCommit(result: FinanceActionCommitResponse): string {
  const replay = result.replayed ? " No se creó un duplicado; se devolvió el resultado del mismo intento." : "";
  return `Acción ${result.action} completada en Índice: ${JSON.stringify(result.result)}.${replay}`;
}

function humanTaskPreview(result: TaskPreviewResponse): string {
  const due = result.task.dueDate ? ` Vence: ${result.task.dueDate}.` : " Sin fecha de vencimiento.";
  const description = result.task.description ? ` Descripción: ${result.task.description}.` : "";
  return `Vista previa: ${result.task.title}. Prioridad: ${result.task.priority}.${due}${description} Asignada al usuario conectado. Confirma explícitamente estos datos para crearla; la autorización vence en 5 minutos.`;
}

function humanCreatedTask(result: TaskCommitResponse): string {
  const folio = result.task.folio ? ` (${result.task.folio})` : "";
  const replay = result.replayed ? " La respuesta corresponde al mismo intento ya procesado; no se creó un duplicado." : "";
  return `Tarea creada en Índice${folio}: ${result.task.title}.${replay}`;
}

function attentionItems(snapshot: BusinessSnapshot): AttentionItems {
  const items = snapshot.alerts
    .filter((alert): alert is typeof alert & { status: "critical" | "watch" } => alert.status !== "healthy")
    .sort((left, right) => riskOrder(left.status) - riskOrder(right.status));
  const criticalCount = items.filter(item => item.status === "critical").length;
  const watchCount = items.filter(item => item.status === "watch").length;
  return {
    range: snapshot.range,
    context: {
      ...snapshot.context,
      source: "executive_kpis"
    },
    overview: {
      executiveScore: snapshot.summary.executiveScore,
      criticalCount,
      watchCount,
      healthy: items.length === 0
    },
    items
  };
}

function riskOrder(status: "critical" | "watch"): number {
  return status === "critical" ? 0 : 1;
}

function humanAttentionItems(result: AttentionItems): string {
  if (result.overview.healthy) {
    return `No hay alertas críticas ni de seguimiento para el periodo. Score ejecutivo: ${result.overview.executiveScore}/100.`;
  }
  const items = result.items.map(item => `${item.status === "critical" ? "Crítico" : "Seguimiento"}: ${item.title}`).join("; ");
  return `Score ejecutivo ${result.overview.executiveScore}/100. Requieren atención: ${items}.`;
}

function humanBusinessSnapshot(snapshot: BusinessSnapshot): string {
  const currency = snapshot.context.currency;
  const money = (value: number) => new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency
  }).format(value);
  const alerts = snapshot.alerts
    .filter(alert => alert.status !== "healthy")
    .map(alert => alert.title)
    .join(", ");
  const attention = alerts ? ` Atención: ${alerts}.` : " No hay alertas críticas.";
  return `Del ${snapshot.range.from} al ${snapshot.range.to}: ventas ${money(snapshot.summary.salesTotal)}, gastos ${money(snapshot.summary.expensesTotal)}, utilidad operativa ${money(snapshot.summary.operatingProfit)} y cobrado ${money(snapshot.summary.collectedTotal)}.${attention}`;
}

function humanSummary(summary: SalesTodaySummary): string {
  const total = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: summary.monetaryTotal.preferredCurrency
  }).format(summary.monetaryTotal.preferredTotal);
  const partial = summary.monetaryTotal.partial
    ? " El total es parcial porque algunos registros no pudieron convertirse."
    : "";
  return `Hoy (${summary.date}, ${summary.timezone}) se registraron ${summary.saleCount} ventas por ${total}.${partial}`;
}
