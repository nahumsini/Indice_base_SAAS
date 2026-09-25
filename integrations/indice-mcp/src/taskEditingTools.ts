import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { taskPreviewResponseSchema, taskCommitResponseSchema,
  type TaskUpdateRequest, type TaskPreviewResponse, type TaskCommitRequest, type TaskCommitResponse } from "./contracts.js";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";

interface TaskEditor {
  previewUpdateTask?(request: TaskUpdateRequest): Promise<TaskPreviewResponse>;
  updateTask?(request: TaskCommitRequest): Promise<TaskCommitResponse>;
}

export function registerTaskEditingTools(server: McpServer, reader: TaskEditor, allowedTools?: ReadonlySet<string>): void {
  const preview = server.registerTool("preview_update_task", {
    title: "Preparar cambios de tarea",
    description: "Prepara una edición o reasignación de una tarea existente. Primero identifica la tarea exacta con list_tasks/get_task_detail. Envía únicamente los campos pedidos por el usuario; omitirlos los conserva. Para reasignar, usa search_task_assignees y no elijas entre nombres ambiguos. Muestra antes/después y espera confirmación explícita. No modifica la tarea.",
    inputSchema: z.object({
      task_id: z.number().int().positive(),
      title: z.string().trim().min(1).max(180).optional(),
      description: z.string().trim().min(1).max(2000).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      due_date: z.iso.date().optional(),
      status: z.enum(["pending", "in_progress", "paused", "completed", "cancelled"]).optional(),
      assignee_user_company_id: z.number().int().positive().optional()
        .describe("userCompanyId obtenido de search_task_assignees; requiere tasks.delegate."),
      clear_description: z.boolean().optional().describe("true sólo si se pidió eliminar la descripción."),
      clear_due_date: z.boolean().optional().describe("true sólo si se pidió quitar el vencimiento.")
    }).strict(),
    outputSchema: taskPreviewResponseSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, async input => {
    try {
      if (!reader.previewUpdateTask) throw new Error("Task editing unavailable");
      const result = taskPreviewResponseSchema.parse(await reader.previewUpdateTask({
        taskId: input.task_id, title: input.title, description: input.description, priority: input.priority,
        dueDate: input.due_date, status: input.status, assigneeUserCompanyId: input.assignee_user_company_id,
        clearDescription: input.clear_description, clearDueDate: input.clear_due_date
      }));
      const fields = result.task.changedFields ?? [];
      const labels: Record<string, string> = { title: "Título", description: "Descripción", priority: "Prioridad",
        dueDate: "Vencimiento", status: "Estado", assignedUserCompanyId: "Responsable" };
      const values = (draft: typeof result.task | null | undefined, field: string): unknown => {
        if (!draft) return null;
        if (field === "assignedUserCompanyId") return draft.assignee;
        return (draft as unknown as Record<string, unknown>)[field];
      };
      const lines = fields.map(field => `${labels[field] ?? field}: ${values(result.before, field) ?? "—"} → ${values(result.task, field) ?? "—"}`);
      return { content: [{ type: "text" as const, text: `Vista previa de cambios para «${result.task.title}»:\n${lines.join("\n")}\nConfirma estos cambios para aplicarlos. La confirmación vence en 5 minutos; si la tarea cambia antes, hay que preparar otra vista previa.` }],
        structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(preview, "preview_update_task", allowedTools);

  const commit = server.registerTool("update_task", {
    title: "Aplicar cambios confirmados de tarea",
    description: "Aplica únicamente la edición o reasignación de preview_update_task después de confirmación explícita del usuario. No acepta campos nuevos. Reutiliza la misma clave al reintentar. Si la tarea cambió, prepara otra vista previa y vuelve a confirmar; no sobrescribas cambios ajenos.",
    inputSchema: z.object({
      confirmation_token: z.string().startsWith("idx_confirm_"),
      idempotency_key: z.string().min(8).max(128)
    }).strict(),
    outputSchema: taskCommitResponseSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async input => {
    try {
      if (!reader.updateTask) throw new Error("Task editing unavailable");
      const result = taskCommitResponseSchema.parse(await reader.updateTask({
        confirmationToken: input.confirmation_token, idempotencyKey: input.idempotency_key
      }));
      return { content: [{ type: "text" as const, text: `Tarea actualizada: ${result.task.title}.${result.task.assignee ? ` Responsable: ${result.task.assignee}.` : ""}${result.replayed ? " Se devolvió el resultado original del mismo intento." : ""}` }],
        structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(commit, "update_task", allowedTools);
}
