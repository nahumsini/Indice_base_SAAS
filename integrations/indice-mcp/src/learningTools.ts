import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";

export const learningRequestSchema = z.object({ module: z.enum(["human_resources", "processes", "inventory", "crm", "pos"]).optional(), tab: z.string().max(50).optional(), locale: z.enum(["es-MX", "en-CA"]).optional() }).strict();
export const learningGuideSchema = z.object({ version: z.string(), locale: z.string(), systemLogic: z.string(), modules: z.array(z.object({
  module: z.string(), pageId: z.string(), purpose: z.string(), tabs: z.array(z.object({
    tab: z.string(), label: z.string(), title: z.string(), purpose: z.string(), effect: z.string(),
    steps: z.array(z.object({ title: z.string(), description: z.string() })), navigation: z.string(), availableTools: z.array(z.string())
  }))
})) });
export type LearningRequest = z.infer<typeof learningRequestSchema>;
export type LearningGuide = z.infer<typeof learningGuideSchema>;
export interface LearningReader { getSystemGuide?(request: LearningRequest): Promise<LearningGuide> }

export function registerLearningTools(server: McpServer, reader: LearningReader, allowed?: ReadonlySet<string>): void {
  const tool = server.registerTool("get_system_guide", {
    title: "Guía de capacitación de Índice",
    description: "Explica la lógica del ERP y el propósito, pasos y efectos de cada pestaña autorizada de RH, Procesos/Tareas, Inventarios, Ventas (crm) y POS. Usa el contenido revisado de Modo aprendiz y las rutas actuales. Puede filtrar módulo y pestaña y responder en español o inglés canadiense. pageId es una pantalla del ERP, no una URL. availableTools muestra acciones actualmente permitidas; enseñar una función de la interfaz no significa que el agente pueda ejecutarla. No marca progreso ni modifica datos.",
    inputSchema: learningRequestSchema, outputSchema: learningGuideSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, async input => {
    try {
      if (!reader.getSystemGuide) throw new Error("Learning guide unavailable");
      const result = learningGuideSchema.parse(await reader.getSystemGuide(input));
      const content = [result.systemLogic, ...result.modules.flatMap(module => [module.purpose, ...module.tabs.map(tab =>
        `${tab.label}: ${tab.purpose}\n${tab.steps.map((step, i) => `${i + 1}. ${step.title}: ${step.description}`).join("\n")}\n${tab.navigation}`)])].join("\n\n");
      return { content: [{ type: "text" as const, text: content }], structuredContent: result };
    } catch (error) { return toolError(error); }
  });
  configureTool(tool, "get_system_guide", allowed);
}
