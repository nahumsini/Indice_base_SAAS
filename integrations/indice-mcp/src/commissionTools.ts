import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { commissionReadNames, commissionActionNames, commissionQuerySchema, commissionInputs, commissionReadSchema, commissionPreviewSchema, commissionCommittedSchema,
  type CommissionReadName, type CommissionActionName, type CommissionQuery, type CommissionChange, type CommissionReadResult, type CommissionPreview, type CommissionCommitted } from "./commissionContracts.js";

export interface CommissionReader {
  readCommission?(tool: CommissionReadName, request: CommissionQuery): Promise<CommissionReadResult>;
  previewCommission?(action: CommissionActionName, request: CommissionChange): Promise<CommissionPreview>;
  commitCommission?(action: CommissionActionName, request: TaskCommitRequest): Promise<CommissionCommitted>;
}
export function registerCommissionTools(server: McpServer, reader: CommissionReader, allowed?: ReadonlySet<string>): void {
  for (const name of commissionReadNames) {
    const input = name.startsWith("get_") ? z.object({id: z.number().int().positive()}).strict() : commissionQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta cortes y programaciones de comisiones en el alcance corporativo. Recorre todas las páginas antes de enumerar resultados completos.",
      inputSchema: input, outputSchema: commissionReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readCommission) throw new Error("Commission reads unavailable");
        const result = commissionReadSchema.parse(await reader.readCommission(name, commissionQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of commissionActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara cortes y programaciones. Muestra ventas, importes nativos, aplicaciones de nómina y evidencia monetaria. Requiere consentimiento de comisiones y de incentivos de RH; caduca en cinco minutos.",
      inputSchema: commissionInputs[action], outputSchema: commissionPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof commissionInputs)[CommissionActionName]>) => {
      try {
        if (!reader.previewCommission) throw new Error("Commission actions unavailable");
        const result = commissionPreviewSchema.parse(await reader.previewCommission(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify({records:result.after,incentives:result.incentives,monetarySummary:result.monetarySummary})}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: commissionCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitCommission) throw new Error("Commission actions unavailable");
        const result = commissionCommittedSchema.parse(await reader.commitCommission(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
