import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { posReadNames, posActionNames, posQuerySchema, posInputs, posReadSchema, posPreviewSchema, posCommittedSchema,
  type PosReadName, type PosActionName, type PosQuery, type PosChange, type PosReadResult, type PosPreview, type PosCommitted } from "./posContracts.js";

export interface PosReader {
  readPos?(tool: PosReadName, request: PosQuery): Promise<PosReadResult>;
  previewPos?(action: PosActionName, request: PosChange): Promise<PosPreview>;
  commitPos?(action: PosActionName, request: TaskCommitRequest): Promise<PosCommitted>;
}
export function registerPosTools(server: McpServer, reader: PosReader, allowed?: ReadonlySet<string>): void {
  for (const name of posReadNames) {
    const input = name.startsWith("get_") ? z.object({id: z.number().int().positive()}).strict() : posQuerySchema;
    const tool = server.registerTool(name, {title: name,
      description: "Consulta cajas, turnos, tickets, movimientos, recepciones y devoluciones en el alcance actual. Recupera el ticket original ante una respuesta perdida. Nunca deduzcas un pago aprobado de una pantalla o del silencio de la terminal.",
      inputSchema: input, outputSchema: posReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readPos) throw new Error("Pos reads unavailable");
        const result = posReadSchema.parse(await reader.readPos(name, posQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of posActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara la operacion POS exacta sin cobrar ni mover stock. Revisa caja, turno original, moneda, impuestos, descuentos, cuenta destino, efectivo y mercancia. La recepcion pagada registra stock y pago juntos; su reverso compensa ambos. Confirma solo efectivo y productos realmente entregados. Tarjetas usan herramientas del proveedor; no sustituyas un reembolso por efectivo. Pide confirmacion explicita de todos los efectos. Caduca en cinco minutos.",
      inputSchema: posInputs[action], outputSchema: posPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false}}, async (args: z.infer<(typeof posInputs)[PosActionName]>) => {
      try {
        if (!reader.previewPos) throw new Error("Pos actions unavailable");
        const result = posPreviewSchema.parse(await reader.previewPos(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${JSON.stringify(result.checkout)}\n${JSON.stringify(result.receipt)}\n${JSON.stringify(result.returnPlan)}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: posCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: false}}, async args => {
      try {
        if (!reader.commitPos) throw new Error("Pos actions unavailable");
        const result = posCommittedSchema.parse(await reader.commitPos(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
