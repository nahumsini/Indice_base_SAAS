import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { inventoryReadNames, inventoryActionNames, inventoryQuerySchema, inventoryInputs, inventoryReadSchemas, inventoryPreviewSchema, inventoryCommittedSchema,
  type InventoryReadName, type InventoryActionName, type InventoryQuery, type InventoryChange, type InventoryReadResult, type InventoryPreview, type InventoryCommitted } from "./inventoryContracts.js";

export interface InventoryReader {
  readInventory?(tool: InventoryReadName, request: InventoryQuery): Promise<InventoryReadResult>;
  previewInventory?(action: InventoryActionName, request: InventoryChange): Promise<InventoryPreview>;
  commitInventory?(action: InventoryActionName, request: TaskCommitRequest): Promise<InventoryCommitted>;
}
export function registerInventoryTools(server: McpServer, reader: InventoryReader, allowed?: ReadonlySet<string>): void {
  for (const name of inventoryReadNames) {
    const input = name.startsWith("get_") && name !== "get_inventory_metrics" ? z.object({id: z.number().int().positive()}).strict() : inventoryQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta catálogo, almacenes, saldos o historial dentro del alcance actual de Inventarios. Los productos son compartidos por la empresa; el stock conserva su almacén, unidad y negocio. Recorre todas las páginas antes de enumerar resultados completos. get_inventory_metrics calcula toda la población filtrada y separa valor por moneda; nunca sumes monedas diferentes. No revela enlaces privados, credenciales ni modifica existencias.",
      inputSchema: input, outputSchema: inventoryReadSchemas[name], annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readInventory) throw new Error("Inventory reads unavailable");
        const result = inventoryReadSchemas[name].parse(await reader.readInventory(name, inventoryQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of inventoryActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara un cambio exacto de Inventarios sin alterar stock. Confirma los productos, almacenes, costos nativos, fecha, reservas y saldos resultantes. En count_inventory_stock, quantity es el conteo físico final, no un incremento. Para recibir stock requiere proveedor y costo explícitos. Un movimiento no crea pagos ni devoluciones financieras. Solo cancela movimientos manuales del agente; las ventas, devoluciones y recepciones pagadas conservan sus herramientas del propietario. La revisión caduca en cinco minutos. Pide confirmación explícita de todos sus efectos.",
      inputSchema: inventoryInputs[action], outputSchema: inventoryPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof inventoryInputs)[InventoryActionName]>) => {
      try {
        if (!reader.previewInventory) throw new Error("Inventory actions unavailable");
        const result = inventoryPreviewSchema.parse(await reader.previewInventory(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: inventoryCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitInventory) throw new Error("Inventory actions unavailable");
        const result = inventoryCommittedSchema.parse(await reader.commitInventory(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
