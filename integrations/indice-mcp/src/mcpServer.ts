import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type {
  AttentionItems,
  BusinessSnapshot,
  BusinessSnapshotQuery,
  SalesTodaySummary,
  TaskCommitRequest,
  TaskCommitResponse,
  TaskPreviewRequest,
  TaskPreviewResponse
} from "./contracts.js";

export interface IndiceBusinessReader {
  getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary>;
  getBusinessSnapshot(query?: BusinessSnapshotQuery): Promise<BusinessSnapshot>;
  previewCreateTask(request: TaskPreviewRequest): Promise<TaskPreviewResponse>;
  createTask(request: TaskCommitRequest): Promise<TaskCommitResponse>;
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

  return server;
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
