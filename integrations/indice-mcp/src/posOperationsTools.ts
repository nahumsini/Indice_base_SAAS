import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { posOperationsReadNames, posOperationsActionNames, posOperationsQuerySchema, posOperationsInputs, posOperationsReadSchema, posOperationsPreviewSchema, posOperationsCommittedSchema,
  type PosOperationsReadName, type PosOperationsActionName, type PosOperationsQuery, type PosOperationsChange, type PosOperationsReadResult, type PosOperationsPreview, type PosOperationsCommitted } from "./posOperationsContracts.js";

export interface PosOperationsReader {
  readPosOperations?(tool: PosOperationsReadName, request: PosOperationsQuery): Promise<PosOperationsReadResult>;
  previewPosOperations?(action: PosOperationsActionName, request: PosOperationsChange): Promise<PosOperationsPreview>;
  commitPosOperations?(action: PosOperationsActionName, request: TaskCommitRequest): Promise<PosOperationsCommitted>;
}
export function registerPosOperationsTools(server: McpServer, reader: PosOperationsReader, allowed?: ReadonlySet<string>): void {
  for (const name of posOperationsReadNames) {
    const input = posOperationsQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta cortes, liquidaciones y pedidos pendientes de cobro de la caja actual. No muestra códigos privados de reclamo ni enlaces públicos de kiosco.",
      inputSchema: input, outputSchema: posOperationsReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readPosOperations) throw new Error("PosOperations reads unavailable");
        const result = posOperationsReadSchema.parse(await reader.readPosOperations(name, posOperationsQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of posOperationsActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara reclamo o liberación del pedido del cajero actual, o la recepción de una liquidación. Revisa moneda, importes, diferencias y destino.",
      inputSchema: posOperationsInputs[action], outputSchema: posOperationsPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof posOperationsInputs)[PosOperationsActionName]>) => {
      try {
        if (!reader.previewPosOperations) throw new Error("PosOperations actions unavailable");
        const result = posOperationsPreviewSchema.parse(await reader.previewPosOperations(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: posOperationsCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitPosOperations) throw new Error("PosOperations actions unavailable");
        const result = posOperationsCommittedSchema.parse(await reader.commitPosOperations(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
