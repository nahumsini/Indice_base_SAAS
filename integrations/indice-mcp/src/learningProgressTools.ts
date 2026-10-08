import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { configureTool } from './toolPolicy.js';
import { toolError } from './toolErrors.js';
export const learningProgressRequestSchema = z.object({ locale: z.enum(['es-MX', 'en-CA']).optional() }).strict();
export const learningChangeSchema = z.object({ chapterId: z.string().min(3).max(100), version: z.number().int().positive(), operation: z.enum(['start', 'understood']), locale: z.enum(['es-MX', 'en-CA']).optional() }).strict();
export const learningCommitSchema = z.object({ confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotencyKey: z.string().min(8).max(128) }).strict();
const chapter = z.object({ chapterId: z.string(), version: z.number().int().positive(), stage: z.number().int().min(0).max(5), module: z.string(), tab: z.string(), pageId: z.string(), label: z.string(),
    status: z.enum(['pending', 'understood', 'applied']), understoodAt: z.string().nullable(), appliedAt: z.string().nullable(), journey: z.boolean(), companion: z.boolean(),
    steps: z.array(z.object({ id: z.string(), title: z.string(), description: z.string() })) });
export const learningProgressSchema = z.object({ catalogVersion: z.string(), currentChapterId: z.string().nullable(), stages: z.array(z.object({ stage: z.number().int(), total: z.number().int().nonnegative(), understood: z.number().int().nonnegative(), applied: z.number().int().nonnegative() })), chapters: z.array(chapter), nextMission: chapter.nullable() });
export const learningPreviewSchema = z.object({ tool: z.literal('update_learning_progress'), confirmationToken: z.string(), expiresAt: z.string(), requiresConfirmation: z.literal(true), previousChapterId: z.string().nullable(), change: learningChangeSchema, consequences: z.array(z.string()) });
export const learningCommittedSchema = z.object({ tool: z.literal('update_learning_progress'), replayed: z.boolean(), progress: learningProgressSchema });
export type LearningProgressRequest = z.infer<typeof learningProgressRequestSchema>;
export type LearningChange = z.infer<typeof learningChangeSchema>;
export type LearningCommit = z.infer<typeof learningCommitSchema>;
export type LearningProgress = z.infer<typeof learningProgressSchema>;
export type LearningPreview = z.infer<typeof learningPreviewSchema>;
export type LearningCommitted = z.infer<typeof learningCommittedSchema>;
export interface LearningProgressReader {
    getLearningProgress?(request: LearningProgressRequest): Promise<LearningProgress>;
    previewLearningProgress?(request: LearningChange): Promise<LearningPreview>;
    commitLearningProgress?(request: LearningCommit): Promise<LearningCommitted>;
}
const result = (value: Record<string, unknown>) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], structuredContent: value });
export function registerLearningProgressTools(server: McpServer, reader: LearningProgressReader, allowed?: ReadonlySet<string>) {
    for (const name of ['get_learning_progress', 'get_next_learning_mission'] as const) {
        const tool = server.registerTool(name, { title: name === 'get_learning_progress' ? 'Mi avance de aprendizaje' : 'Mi siguiente misión',
            description: name === 'get_learning_progress' ? 'Consulta únicamente tu avance privado por usuario y empresa, con las seis etapas autorizadas. Entendido es una declaración; Aplicado deriva de evidencia del backend. Revalida permisos y contenido vigente; no certifica cumplimiento.'
                : 'Retoma el aprendizaje y consulta la próxima misión pendiente de tus módulos autorizados, sus requisitos, pasos y comprobación. Conserva la terminal POS fuera del recorrido inicial. No marca progreso ni ejecuta acciones empresariales.',
            inputSchema: learningProgressRequestSchema, outputSchema: name === 'get_learning_progress' ? learningProgressSchema : z.object({ catalogVersion: z.string(), mission: chapter.nullable() }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input) => {
            try {
                if (!reader.getLearningProgress)
                    throw new Error('Learning progress unavailable');
                const progress = learningProgressSchema.parse(await reader.getLearningProgress(input));
                return result(name === 'get_learning_progress' ? progress : { catalogVersion: progress.catalogVersion, mission: progress.nextMission });
            }
            catch (e) {
                return toolError(e);
            }
        });
        configureTool(tool, name, allowed);
    }
    const preview = server.registerTool('preview_update_learning_progress', { title: 'Preparar avance de aprendizaje', description: 'Prepara iniciar o retomar un capítulo, o guardar que lo entendiste. Requiere learning.manage, capítulo vigente y confirmación explícita. No permite declarar Aplicado, modificar operaciones empresariales ni consultar el avance de otras personas.', inputSchema: learningChangeSchema, outputSchema: learningPreviewSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async (input) => {
        try {
            if (!reader.previewLearningProgress)
                throw new Error('Learning changes unavailable');
            return result(learningPreviewSchema.parse(await reader.previewLearningProgress(input)));
        }
        catch (e) {
            return toolError(e);
        }
    });
    configureTool(preview, 'preview_update_learning_progress', allowed);
    const commit = server.registerTool('update_learning_progress', { title: 'Guardar mi avance de aprendizaje', description: 'Guarda exclusivamente el cambio privado revisado y confirmado en la vista previa vigente. Envía el mismo token y clave de idempotencia al reintentar. Entendido no significa Aplicado ni una certificación. No concede permisos ni cambia datos operativos.', inputSchema: learningCommitSchema, outputSchema: learningCommittedSchema,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input) => {
        try {
            if (!reader.commitLearningProgress)
                throw new Error('Learning changes unavailable');
            return result(learningCommittedSchema.parse(await reader.commitLearningProgress(input)));
        }
        catch (e) {
            return toolError(e);
        }
    });
    configureTool(commit, 'update_learning_progress', allowed);
}
