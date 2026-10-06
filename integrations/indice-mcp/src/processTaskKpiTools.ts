import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";

const date = z.iso.date();
const id = z.number().int().positive();
const count = z.number().int().nonnegative();
export const processTaskKpiRequestSchema = z.object({
  from: date, to: date, includeOverdueBacklog: z.boolean().optional(), overdueOnly: z.boolean().optional(),
  unitId: id.optional(), businessId: id.optional(), collaboratorId: id.optional(), projectId: id.optional(),
  focus: z.enum(["mine", "delegated", "team"]).optional(),
  status: z.enum(["all", "pending", "in_progress", "paused", "completed", "overdue", "audited", "pending_audit"]).optional(),
  search: z.string().max(120).optional(), entity: z.enum(["collaborator", "process", "project", "unit"]).optional(),
  limit: z.number().int().min(1).max(100).optional(), cursor: z.string().max(256).optional()
}).strict();
export const processTaskMetricsSchema = z.object({
  tasks: count, closedInPeriod: count, openTasks: count, lateOpenTasks: count,
  highPriorityOpenTasks: count, highPriorityLateTasks: count, late1To3Days: count, late4To7Days: count, late8PlusDays: count,
  eligibleDeliveries: count, onTimeDeliveries: count, onTimeRate: z.number().nullable(), closuresWithoutDeadline: count,
  pendingAuditTasks: count, medianAuditWaitDays: z.number().nullable(), auditDurationSamples: count,
  medianAuditDurationDays: z.number().nullable(), auditedTasks: count, ratedTasks: count, averageRating: z.number().nullable(),
  ratingDistribution: z.array(count), requiredEvidenceTasks: count, missingRequiredEvidence: count,
  openMissingEvidence: count, closedMissingEvidence: count, elapsedSamples: count, medianElapsedDays: z.number().nullable(),
  upcomingTasks: count, observedRuns: count, runsWithLateTasks: count, fullyObservedCompletedRuns: count
});
export const processTaskKpiResultSchema = z.object({
  definitionVersion: z.number().int().positive(), from: date, to: date, cutoffDate: date, upcomingThrough: date,
  summary: processTaskMetricsSchema,
  activity: z.array(z.object({ date, scheduledTasks: count, closedTasks: count, auditedTasks: count })),
  items: z.array(z.object({ id: id.nullable(), name: z.string(), type: z.enum(["collaborator", "process", "project", "unit"]), measurements: processTaskMetricsSchema })),
  returnedCount: count, totalCount: count, hasMore: z.boolean(), nextCursor: z.string().nullable()
});
export type ProcessTaskKpiRequest = z.infer<typeof processTaskKpiRequestSchema>;
export type ProcessTaskKpiResult = z.infer<typeof processTaskKpiResultSchema>;
export interface ProcessTaskKpiReader { getProcessTaskKpis?(request: ProcessTaskKpiRequest): Promise<ProcessTaskKpiResult> }

export function registerProcessTaskKpiTools(server: McpServer, reader: ProcessTaskKpiReader, allowed?: ReadonlySet<string>): void {
  const name = "get_process_task_kpis";
  const tool = server.registerTool(name, {
    title: "Indicadores de Procesos y Tareas",
    description: "Consulta los indicadores oficiales de la pestaña KPIs con el mismo alcance y filtros de Agenda. Requiere fechas explícitas (máximo 366 días). Incluye resumen completo, muestras, actividad y desglose paginado por colaborador, proceso, proyecto o unidad. null significa N/A, nunca cero. Conserva definitionVersion, denominadores y monedas del propietario; no recalcules ni extrapoles indicadores desde una página. No genera ejecuciones ni modifica tareas.",
    inputSchema: processTaskKpiRequestSchema, outputSchema: processTaskKpiResultSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async request => {
    try {
      if (!reader.getProcessTaskKpis) throw new Error("Process task KPIs unavailable");
      const result = processTaskKpiResultSchema.parse(await reader.getProcessTaskKpis(request));
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(tool, name, allowed);
}
