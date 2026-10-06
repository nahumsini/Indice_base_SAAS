import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { inventoryCatalogReadNames, inventoryCatalogActionNames, inventoryCatalogQuerySchema, inventoryCatalogInputs, inventoryCatalogReadSchema, inventoryCatalogPreviewSchema, inventoryCatalogCommittedSchema,
  type InventoryCatalogReadName, type InventoryCatalogActionName, type InventoryCatalogQuery, type InventoryCatalogChange, type InventoryCatalogReadResult, type InventoryCatalogPreview, type InventoryCatalogCommitted } from "./inventoryCatalogContracts.js";

export interface InventoryCatalogReader {
  readInventoryCatalog?(tool: InventoryCatalogReadName, request: InventoryCatalogQuery): Promise<InventoryCatalogReadResult>;
  previewInventoryCatalog?(action: InventoryCatalogActionName, request: InventoryCatalogChange): Promise<InventoryCatalogPreview>;
  commitInventoryCatalog?(action: InventoryCatalogActionName, request: TaskCommitRequest): Promise<InventoryCatalogCommitted>;
}
export function registerInventoryCatalogTools(server: McpServer, reader: InventoryCatalogReader, allowed?: ReadonlySet<string>): void {
  for (const name of inventoryCatalogReadNames) {
    const input = name.startsWith("get_") ? z.object({id: z.number().int().positive()}).strict() : inventoryCatalogQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta proveedores y descuentos de Inventario en el alcance autorizado. Evalúa descuentos con los importes y requisitos calculados por su módulo. Recorre todas las páginas antes de enumerar resultados completos.",
      inputSchema: input, outputSchema: inventoryCatalogReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readInventoryCatalog) throw new Error("InventoryCatalog reads unavailable");
        const result = inventoryCatalogReadSchema.parse(await reader.readInventoryCatalog(name, inventoryCatalogQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of inventoryCatalogActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara cambios de proveedor y descuento. Revisa identidad, alcance, vigencia, canales, moneda y límites. Pide confirmación explícita de los efectos; caduca en cinco minutos.",
      inputSchema: inventoryCatalogInputs[action], outputSchema: inventoryCatalogPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof inventoryCatalogInputs)[InventoryCatalogActionName]>) => {
      try {
        if (!reader.previewInventoryCatalog) throw new Error("InventoryCatalog actions unavailable");
        const result = inventoryCatalogPreviewSchema.parse(await reader.previewInventoryCatalog(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: inventoryCatalogCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitInventoryCatalog) throw new Error("InventoryCatalog actions unavailable");
        const result = inventoryCatalogCommittedSchema.parse(await reader.commitInventoryCatalog(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
