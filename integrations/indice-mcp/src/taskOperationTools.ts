import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { taskOperationNameSchema, taskPreviewResponseSchema, taskCommitResponseSchema,
  type TaskOperationName, type TaskOperationRequest, type TaskPreviewResponse,
  type TaskCommitRequest, type TaskCommitResponse } from "./contracts.js";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";

export interface TaskOperator {
  previewTaskOperation?(action: TaskOperationName, request: TaskOperationRequest): Promise<TaskPreviewResponse>;
  commitTaskOperation?(action: TaskOperationName, request: TaskCommitRequest): Promise<TaskCommitResponse>;
}

const taskId = z.number().int().positive().describe("ID de tarea visible obtenido por list_tasks o get_task_detail.");
const note = z.string().max(2000).optional();
const schemas = {
  update_task_dependency:z.object({task_id:taskId,predecessor_task_id:z.number().int().positive().nullable(),lag_days:z.number().int().min(0).max(365).optional()}).strict(),
  schedule_task: z.object({ task_id: taskId, agenda_date: z.iso.date().nullable(), start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), time_zone: z.string().max(80).optional() }).strict(),
  add_task_follow_up: z.object({ task_id: taskId, comment: z.string().min(1).max(2000), follow_up_date: z.iso.date(), entry_type: z.enum(["update", "decision", "blocker", "reminder"]).optional() }).strict(),
  update_task_contribution: z.object({ task_id: taskId, contribution_status: z.enum(["pending", "working", "ready"]), notes: note }).strict(),
  share_task: z.object({ task_id: taskId, collaborator_user_company_ids: z.array(z.number().int().positive()).min(1).max(25) }).strict(),
  complete_task: z.object({ task_id: taskId, completion_percent: z.number().int().min(0).max(100).optional(), notes: note }).strict(),
  audit_task: z.object({ task_id: taskId, weighting: z.number().int().min(0).max(5), notes: note }).strict(),
  cancel_task: z.object({ task_id: taskId }).strict()
};
const descriptions: Record<TaskOperationName, string> = {
  update_task_dependency:"Define una dependencia finish_to_start dentro del mismo proyecto, con espera de 0 a 365 días. predecessor_task_id null retira la dependencia. El propietario rechaza ciclos y tareas fuera de tu alcance.",
  schedule_task: "Programa la fecha y horas de agenda con zona IANA; agenda_date null retira la programación. No cambia el vencimiento.",
  add_task_follow_up: "Registra un seguimiento fechado: actualización, decisión, bloqueo o recordatorio.",
  update_task_contribution: "Actualiza solamente la aportación del colaborador autenticado en una tarea asignada.",
  share_task: "Define el equipo completo, incluyendo al responsable actual. Resuelve integrantes con search_task_assignees; requiere tasks.delegate además de tasks.operate. Muestra altas y bajas antes de confirmar.",
  complete_task: "Finaliza usando las reglas del propietario: evidencia obligatoria y aportaciones requeridas del equipo. Un porcentaje no sustituye evidencia ni auditoría.",
  audit_task: "Audita una tarea finalizada con puntuación de 0 a 5 y notas; requiere consentimiento tasks.audit.",
  cancel_task: "Cancela la tarea visible y conserva su registro e historial. Explica el efecto antes de confirmar."
};
const names: Record<string, string> = { agenda_date: "agendaDate", start_time: "startTime", end_time: "endTime", time_zone: "timeZone", follow_up_date: "followUpDate", entry_type: "entryType", contribution_status: "contributionStatus", completion_percent: "completionPercent", collaborator_user_company_ids: "collaboratorUserCompanyIds" };

export function registerTaskOperationTools(server: McpServer, reader: TaskOperator, allowed?: ReadonlySet<string>): void {
  for (const action of taskOperationNameSchema.options) {
    const preview = server.registerTool(`preview_${action}`, {
      title: `Preparar: ${action}`, description: `${descriptions[action]} Prepara una vista previa de cinco minutos. No ejecuta la operación; solicita aprobación explícita.`,
      inputSchema: schemas[action], outputSchema: taskPreviewResponseSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    }, async (input: z.infer<(typeof schemas)[TaskOperationName]>) => {
      try {
        if (!reader.previewTaskOperation) throw new Error("Task operations unavailable");
        const { task_id, ...fields } = input;
        const operation = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key==="predecessor_task_id"?"predecessorTaskId":key==="lag_days"?"lagDays":names[key] ?? key, value]));
        const result = taskPreviewResponseSchema.parse(await reader.previewTaskOperation(action, { taskId: task_id, operation: { action, ...operation } }));
        return { content: [{ type: "text" as const, text: `Vista previa para «${result.task.title}»: ${descriptions[action]}\nDatos: ${JSON.stringify(result.task.operation)}\nEquipo antes/después y altas/bajas: ${JSON.stringify(result.task.teamReview ?? null)}\nConfirma estos datos para aplicar la operación. Si la tarea cambia, prepara otra vista previa.` }], structuredContent: result };
      } catch (error) { return toolError(error); }
    });
    configureTool(preview, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {
      title: `Aplicar: ${action}`, description: `Aplica únicamente la operación de preview_${action} aprobada explícitamente. No recibe campos nuevos. Reutiliza confirmation_token e idempotency_key al reintentar.`,
      inputSchema: z.object({ confirmation_token: z.string().startsWith("idx_confirm_"), idempotency_key: z.string().min(8).max(128) }).strict(), outputSchema: taskCommitResponseSchema,
      annotations: { readOnlyHint: false, destructiveHint: ["cancel_task", "share_task"].includes(action), idempotentHint: true, openWorldHint: false }
    }, async input => {
      try {
        if (!reader.commitTaskOperation) throw new Error("Task operations unavailable");
        const result = taskCommitResponseSchema.parse(await reader.commitTaskOperation(action, { confirmationToken: input.confirmation_token, idempotencyKey: input.idempotency_key }));
        return { content: [{ type: "text" as const, text: `Operación ${action} aplicada a «${result.task.title}». Estado: ${result.task.status}.${result.replayed ? " Resultado original del mismo intento; no se duplicó la operación." : ""}` }], structuredContent: result };
      } catch (error) { return toolError(error); }
    });
    configureTool(commit, action, allowed);
  }
}
