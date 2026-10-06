import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { salesWorkflowReadNames, salesWorkflowActionNames, salesWorkflowQuerySchema, salesWorkflowInputs, salesWorkflowReadSchema, salesWorkflowPreviewSchema, salesWorkflowCommittedSchema,
  type SalesWorkflowReadName, type SalesWorkflowActionName, type SalesWorkflowQuery, type SalesWorkflowChange, type SalesWorkflowReadResult, type SalesWorkflowPreview, type SalesWorkflowCommitted } from "./salesWorkflowContracts.js";

export interface SalesWorkflowReader {
  readSalesWorkflow?(tool: SalesWorkflowReadName, request: SalesWorkflowQuery): Promise<SalesWorkflowReadResult>;
  previewSalesWorkflow?(action: SalesWorkflowActionName, request: SalesWorkflowChange): Promise<SalesWorkflowPreview>;
  commitSalesWorkflow?(action: SalesWorkflowActionName, request: TaskCommitRequest): Promise<SalesWorkflowCommitted>;
}
export function registerSalesWorkflowTools(server: McpServer, reader: SalesWorkflowReader, allowed?: ReadonlySet<string>): void {
  for (const name of salesWorkflowReadNames) {
    const input = name.startsWith("get_") ? z.object({id: z.number().int().positive()}).strict() : salesWorkflowQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta ventas, contratos, seguimiento y comisiones dentro del alcance actual. Recorre todas las paginas antes de enumerar resultados completos. Los tickets POS son de lectura y conservan sus devoluciones en POS.",
      inputSchema: input, outputSchema: salesWorkflowReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readSalesWorkflow) throw new Error("SalesWorkflow reads unavailable");
        const result = salesWorkflowReadSchema.parse(await reader.readSalesWorkflow(name, salesWorkflowQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of salesWorkflowActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara la operacion comercial exacta. Revisa cliente, partidas, moneda, impuestos, descuentos, stock libre y destino de cobro. Crear una venta intenta mover existencias; si falta stock se conserva pendiente sin consumo parcial. La conversion usa partidas y moneda de la cotizacion guardada. La cobranza y cancelacion tienen consentimiento propio. Los contratos no firman ni envian comunicaciones externas. Pide confirmacion explicita de todos los efectos. Caduca en cinco minutos.",
      inputSchema: salesWorkflowInputs[action], outputSchema: salesWorkflowPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof salesWorkflowInputs)[SalesWorkflowActionName]>) => {
      try {
        if (!reader.previewSalesWorkflow) throw new Error("SalesWorkflow actions unavailable");
        const result = salesWorkflowPreviewSchema.parse(await reader.previewSalesWorkflow(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${JSON.stringify(result.stock)}\n${JSON.stringify(result.collection)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: salesWorkflowCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitSalesWorkflow) throw new Error("SalesWorkflow actions unavailable");
        const result = salesWorkflowCommittedSchema.parse(await reader.commitSalesWorkflow(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
