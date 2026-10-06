import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { procurementReadNames, procurementActionNames, procurementQuerySchema, procurementInputs, procurementReadSchema, procurementPreviewSchema, procurementCommittedSchema,
  type ProcurementReadName, type ProcurementActionName, type ProcurementQuery, type ProcurementChange, type ProcurementReadResult, type ProcurementPreview, type ProcurementCommitted } from "./procurementContracts.js";

export interface ProcurementReader {
  readProcurement?(tool: ProcurementReadName, request: ProcurementQuery): Promise<ProcurementReadResult>;
  previewProcurement?(action: ProcurementActionName, request: ProcurementChange): Promise<ProcurementPreview>;
  commitProcurement?(action: ProcurementActionName, request: TaskCommitRequest): Promise<ProcurementCommitted>;
}
export function registerProcurementTools(server: McpServer, reader: ProcurementReader, allowed?: ReadonlySet<string>): void {
  for (const name of procurementReadNames) {
    const input = name.startsWith("get_") ? z.object({id: z.number().int().positive()}).strict() : procurementQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta órdenes, cotizaciones de proveedor, facturas y relaciones de catálogo en el alcance actual. Recorre todas las páginas antes de enumerar resultados completos.",
      inputSchema: input, outputSchema: procurementReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readProcurement) throw new Error("Procurement reads unavailable");
        const result = procurementReadSchema.parse(await reader.readProcurement(name, procurementQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of procurementActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara compras y recepciones con proveedor, almacén, cantidades, moneda nativa e impuestos. Muestra entradas de stock y gastos pendientes por factura; el pago conserva su revisión financiera. Marcar enviada es un estado interno. Convertir una cotización actualiza el costo del catálogo. Pide confirmación explícita de todos los efectos; caduca en cinco minutos.",
      inputSchema: procurementInputs[action], outputSchema: procurementPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof procurementInputs)[ProcurementActionName]>) => {
      try {
        if (!reader.previewProcurement) throw new Error("Procurement actions unavailable");
        const result = procurementPreviewSchema.parse(await reader.previewProcurement(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${JSON.stringify(result.stock)}\n${JSON.stringify(result.finance)}\n${JSON.stringify(result.catalog)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: procurementCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitProcurement) throw new Error("Procurement actions unavailable");
        const result = procurementCommittedSchema.parse(await reader.commitProcurement(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
