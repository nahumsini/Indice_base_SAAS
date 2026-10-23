import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sample, sampleIdSchema, sampleMetadataSchema } from "./samples.js";

const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const noAuth = { securitySchemes: [{ type: "noauth" }] };
const resultSchema = z.object({ sample: sampleMetadataSchema,
  status: z.enum(["TRANSPORT_READY", "CLIENT_IMAGE_UNSUPPORTED"]),
  representation: z.enum(["image", "embedded_resource", "metadata"])
}).strict();

/** Test-only server. Never imported by the production server or capability manifest. */
export function createVisualProbeServer(): McpServer {
  const server = new McpServer({ name: "indice-synthetic-visual-probe", version: "0.1.0" }, {
    instructions: "Experimento aislado de imágenes sintéticas; no tiene acceso a empresas ni archivos de Índice. " +
      "Los metadatos no describen el contenido visual. Solo describe lo que realmente puedas ver. " +
      "Recibir bytes no demuestra interpretación ni generación. Si no puedes interpretar la imagen, indícalo. " +
      "Toda generación requiere una herramienta visual externa y debe evaluarse por separado."
  });
  server.registerTool("list_visual_probe_samples", {
    title: "Listar muestras sintéticas", description: "Entrega únicamente metadatos de dos imágenes sintéticas fijas. No devuelve imágenes ni datos empresariales.",
    inputSchema: z.object({}).strict(),
    outputSchema: z.object({ items: z.array(sampleMetadataSchema).length(2) }).strict(), annotations, _meta: noAuth
  }, async () => {
    const result = { items: sampleIdSchema.options.map(id => sample(id).metadata) };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  });
  server.registerTool("get_visual_probe_image", {
    title: "Recibir imagen sintética", description: "Compara ImageContent. Selecciona una muestra de list_visual_probe_samples. " +
      "clientSupportsImages es una preferencia declarada para la prueba, no autodetección. " +
      "Si es false o se omite, entrega solo metadatos con una explicación. Nunca asumas haber visto el contenido por su nombre o hash.",
    inputSchema: z.object({ sampleId: sampleIdSchema, clientSupportsImages: z.boolean().default(false) }).strict(),
    outputSchema: resultSchema, annotations, _meta: noAuth
  }, async input => {
    const { metadata, bytes } = sample(input.sampleId);
    if (!input.clientSupportsImages) {
      const result = resultSchema.parse({ sample: metadata, status: "CLIENT_IMAGE_UNSUPPORTED", representation: "metadata" });
      return { content: [{ type: "text", text: "El cliente no declaró soporte de imágenes. Solo se entregaron metadatos. " +
        "La interpretación visual no está validada. Puedes solicitar get_visual_probe_resource para comparar la descarga original; " +
        "si tampoco es compatible, adjunta manualmente la muestra sintética a un cliente visual." }], structuredContent: result };
    }
    const result = resultSchema.parse({ sample: metadata, status: "TRANSPORT_READY", representation: "image" });
    return { content: [{ type: "image", data: bytes.toString("base64"), mimeType: metadata.mimeType }], structuredContent: result };
  });
  server.registerTool("get_visual_probe_resource", {
    title: "Recibir recurso sintético", description: "Entrega la misma muestra como recurso binario incrustado, " +
      "igual al formato de get_operational_file. No contiene URL pública ni garantiza que el cliente interprete la imagen.",
    inputSchema: z.object({ sampleId: sampleIdSchema }).strict(), outputSchema: resultSchema, annotations, _meta: noAuth
  }, async input => {
    const { metadata, bytes } = sample(input.sampleId);
    const result = resultSchema.parse({ sample: metadata, status: "TRANSPORT_READY", representation: "embedded_resource" });
    return { content: [{ type: "resource", resource: { uri: `indice://visual-probe/${input.sampleId}`,
      mimeType: metadata.mimeType, blob: bytes.toString("base64") } }], structuredContent: result };
  });
  return server;
}
