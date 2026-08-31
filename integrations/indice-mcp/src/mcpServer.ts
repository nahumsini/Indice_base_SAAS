import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SalesTodaySummary } from "./contracts.js";

export interface SalesTodayReader {
  getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary>;
}

export function createIndiceMcpServer(reader: SalesTodayReader): McpServer {
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

  return server;
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
