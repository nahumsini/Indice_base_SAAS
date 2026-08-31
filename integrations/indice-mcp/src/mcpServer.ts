import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type {
  AttentionItems,
  BusinessSnapshot,
  BusinessSnapshotQuery,
  SalesTodaySummary
} from "./contracts.js";

export interface IndiceBusinessReader {
  getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary>;
  getBusinessSnapshot(query?: BusinessSnapshotQuery): Promise<BusinessSnapshot>;
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

  return server;
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
