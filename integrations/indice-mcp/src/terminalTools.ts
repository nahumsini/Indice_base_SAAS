import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { terminalReadNames, terminalActionNames, terminalQuerySchema, terminalReadInputs, terminalInputs, terminalReadSchema, terminalPreviewSchema, terminalCommittedSchema,
  type TerminalReadName, type TerminalActionName, type TerminalQuery, type TerminalChange, type TerminalReadResult, type TerminalPreview, type TerminalCommitted } from "./terminalContracts.js";

export interface TerminalReader {
  readTerminal?(tool: TerminalReadName, request: TerminalQuery): Promise<TerminalReadResult>;
  previewTerminal?(action: TerminalActionName, request: TerminalChange): Promise<TerminalPreview>;
  commitTerminal?(action: TerminalActionName, request: TaskCommitRequest): Promise<TerminalCommitted>;
}
export function registerTerminalTools(server: McpServer, reader: TerminalReader, allowed?: ReadonlySet<string>): void {
  for (const name of terminalReadNames) {
    const input = terminalReadInputs[name];
    const tool = server.registerTool(name, {title: name,
      description: "Consulta el estado persistido de la terminal, intento o reembolso original. mayHaveMore advierte listas limitadas; usa filtros por caja y turno para reducir resultados.",
      inputSchema: input, outputSchema: terminalReadSchema, annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true}}, async (args: z.infer<typeof input>) => {
      try {
        if (!reader.readTerminal) throw new Error("Terminal reads unavailable");
        const result = terminalReadSchema.parse(await reader.readTerminal(name, terminalQuerySchema.parse(args)));
        return {content: [{type: "text" as const, text: JSON.stringify(result)}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, name, allowed);
  }
  for (const action of terminalActionNames) {
    const tool = server.registerTool(`preview_${action}`, {title: `Preparar ${action}`,
      description: "Prepara cobro o recuperación de terminal y reembolso sobre el pago original. Revisa total, moneda, terminal, existencias y efectos.",
      inputSchema: terminalInputs[action], outputSchema: terminalPreviewSchema, annotations: {readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true}}, async (args: z.infer<(typeof terminalInputs)[TerminalActionName]>) => {
      try {
        if (!reader.previewTerminal) throw new Error("Terminal actions unavailable");
        const result = terminalPreviewSchema.parse(await reader.previewTerminal(action, args));
        return {content: [{type: "text" as const, text: `Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify({checkout:result.checkout,refundAmount:result.refundAmount,currency:result.currency})}\n${result.effects.join("\n")}\nConfirma todos los efectos mostrados.`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(tool, `preview_${action}`, allowed);
    const commit = server.registerTool(action, {title: `Aplicar ${action}`, description: `Aplica únicamente preview_${action} confirmada por el usuario. Reintenta con la misma confirmación y clave; un cambio de stock, referencias o permisos requiere una revisión nueva. Conserva el historial y registra compensaciones al cancelar.`,
      inputSchema: z.object({confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128)}).strict(), outputSchema: terminalCommittedSchema,
      annotations: {readOnlyHint: false, destructiveHint: action.startsWith("inactivate_") || action.startsWith("cancel_") || action.startsWith("issue_"), idempotentHint: true, openWorldHint: true}}, async args => {
      try {
        if (!reader.commitTerminal) throw new Error("Terminal actions unavailable");
        const result = terminalCommittedSchema.parse(await reader.commitTerminal(action, {confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key}));
        return {content: [{type: "text" as const, text: `${action} completada.${result.replayed ? " Resultado original recuperado; la operación no se repitió." : ""}`}], structuredContent: result};
      } catch (error) { return toolError(error); }
    }); configureTool(commit, action, allowed);
  }
}
