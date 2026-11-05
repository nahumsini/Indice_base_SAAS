import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { z } from "zod";
import type { TaskCommitRequest } from "./contracts.js";
import {
  mailingListSearch, mailingListDirectory, mailingAssignmentInput, mailingAssignmentPreview,
  mailingAssignmentConfirmation, mailingAssignmentResult, mailingListToolNames,
} from "./mailingListContracts.js";
import { toolError } from "./toolErrors.js";
import { configureTool } from "./toolPolicy.js";

export interface MailingListReader {
  listMailingLists?(input: z.infer<typeof mailingListSearch>): Promise<z.infer<typeof mailingListDirectory>>;
  previewMailingAssignment?(input: z.infer<typeof mailingAssignmentInput>): Promise<z.infer<typeof mailingAssignmentPreview>>;
  commitMailingAssignment?(input: TaskCommitRequest): Promise<z.infer<typeof mailingAssignmentResult>>;
}

export function registerMailingListTools(server: McpServer, reader: MailingListReader, allowed?: ReadonlySet<string>) {
  const [listName, previewName, commitName] = mailingListToolNames;
  const list = server.registerTool(listName, {
    title: "Buscar listas de segmentación",
    description: "Busca listas activas por nombre dentro de la empresa autorizada. Devuelve identificadores y opciones reales de colaborador, origen y etiqueta. Si el nombre es ambiguo, pide al usuario que elija.",
    inputSchema: mailingListSearch,
    outputSchema: mailingListDirectory,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async input => {
    try {
      if (!reader.listMailingLists) throw new Error("Mailing lists unavailable");
      const result = mailingListDirectory.parse(await reader.listMailingLists(input));
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(list, listName, allowed);

  const preview = server.registerTool(previewName, {
    title: "Preparar asignación a una lista",
    description: "Prepara el alta individual o masiva en una lista existente. Para una persona, identifica el contacto de Ventas y resuelve cualquier ambigüedad antes de confirmar. Pasa identificadores exactos o filtros de todo el directorio. listId dentro de filters es la lista de origen para filtrar; usa none para contactos sin lista. Muestra el destino, la selección exacta, los ya incluidos y el total previsto. Pide confirmación explícita antes de aplicar. No envía correos. La confirmación vence en cinco minutos.",
    inputSchema: mailingAssignmentInput,
    outputSchema: mailingAssignmentPreview,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async input => {
    try {
      if (!reader.previewMailingAssignment) throw new Error("Mailing assignment unavailable");
      const result = mailingAssignmentPreview.parse(await reader.previewMailingAssignment(input));
      const summary = `${result.list.name}. ${result.additions.length} por añadir, ${result.alreadyInList} ya incluidos, ${result.projectedCount} integrantes previstos.`;
      return { content: [{ type: "text", text: result.confirmationRequired
        ? `${summary} Revisa los integrantes y pide confirmación explícita.`
        : `${summary} No hay altas que confirmar.` }], structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(preview, previewName, allowed);

  const commit = server.registerTool(commitName, {
    title: "Confirmar asignación a una lista",
    description: "Aplica únicamente la vista previa aceptada explícitamente por el usuario. Usa su token exacto y conserva la misma clave de idempotencia en los reintentos. Si cambió la lista, solicita una nueva vista previa y confirmación. Conserva las demás listas de los contactos.",
    inputSchema: mailingAssignmentConfirmation,
    outputSchema: mailingAssignmentResult,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async input => {
    try {
      if (!reader.commitMailingAssignment) throw new Error("Mailing assignment unavailable");
      const result = mailingAssignmentResult.parse(await reader.commitMailingAssignment({
        confirmationToken: input.confirmation_token, idempotencyKey: input.idempotency_key,
      }));
      return { content: [{ type: "text", text: `${result.result.added} añadidos a ${result.result.list.name}.${result.replayed ? " Se recuperó el resultado original." : ""}` }], structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(commit, commitName, allowed);
}
