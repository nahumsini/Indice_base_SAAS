import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
export const meetingReadNames = ["list_meetings", "get_meeting", "get_meeting_agreements", "get_meeting_agreement_performance"] as const;
export const meetingActionNames = ["save_meeting_minutes", "create_meeting_agreement", "delegate_meeting_agreement_task"] as const;
export type MeetingReadName = typeof meetingReadNames[number];
export type MeetingActionName = typeof meetingActionNames[number];
export const meetingQuerySchema = z.object({ meetingId: z.number().int().positive().optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(), search: z.string().max(180).optional(), page: z.number().int().min(1).max(100000).optional(), pageSize: z.number().int().min(1).max(100).optional() }).strict();
const id = z.number().int().positive(), date = z.string().date();
export const meetingQuerySchemas = {
  list_meetings: meetingQuerySchema.pick({from:true,to:true,search:true,page:true,pageSize:true}).required({from:true,to:true}),
  get_meeting: z.object({meetingId:id}).strict(),
  get_meeting_agreements: meetingQuerySchema.pick({meetingId:true,search:true,page:true,pageSize:true}).required({meetingId:true}),
  get_meeting_agreement_performance: z.object({meetingId:id}).strict()
};
export const meetingChangeSchemas = {
  save_meeting_minutes: z.object({ meetingId: id, expectedVersion: id, minutes: z.string().max(20000), decisions: z.string().max(10000) }).strict(),
  create_meeting_agreement: z.object({ meetingId: id, expectedVersion: id, title: z.string().trim().min(1).max(240), assigneeId: id, dueDate: date, followupEnabled: z.boolean().optional() }).strict(),
  delegate_meeting_agreement_task: z.object({ agreementId: id, expectedVersion: id, assigneeId: id, dueDate: date, reason: z.string().max(2000) }).strict()
};
export const meetingCommitSchema = z.object({ confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/) }).strict();
const member = z.object({ id, name: z.string() });
export const meetingRecordSchema = z.object({ id, title: z.string(), meetingType: z.enum(["BOARD","WORKING","PROJECT"]), status: z.enum(["PLANNED","IN_PROGRESS","COMPLETED","CANCELLED"]), startAt: z.string(), endAt: z.string(), timezone: z.string(), ownerId: id, ownerName: z.string(), participantCount: z.number().int().nonnegative(), hasMinutes: z.boolean(), version: id });
const audit = z.object({ action: z.string(), actorName: z.string(), reason: z.string(), occurredAt: z.string() });
export const meetingDetailSchema = z.object({ meeting: meetingRecordSchema, agenda: z.string(), location: z.string(), minutes: z.string(), decisions: z.string(), participants: z.array(member), history: z.array(audit), planning: z.object({ objective: z.string(), expectedResult: z.string(), minutesOwner: member, reminderMinutes: z.number(), seriesId: id.nullable(), occurrenceNumber: z.number().nullable(), remindersPaused: z.boolean(), seriesVersion: z.number() }).nullable() }).passthrough();
export const agreementRecordSchema = z.object({ id, meetingId: id, meetingTitle: z.string(), title: z.string(), assigneeId: id, assigneeName: z.string(), dueDate: date, status: z.enum(["OPEN","DONE","CANCELLED"]), resolution: z.string(), version: id, meetingOwnerId: id, followupEnabled: z.boolean() });
const agreementDetail = z.object({ agreement: agreementRecordSchema, history: z.array(audit), task: z.object({ id, folio: z.string(), title: z.string(), status: z.string(), dueDate: z.string().nullable() }).nullable(), canLinkTask: z.boolean() });
export const meetingPerformanceSchema = z.object({ total: z.number().int(), eligible: z.number().int(), onTime: z.number().int(), late: z.number().int(), overdue: z.number().int(), upcoming: z.number().int(), cancelled: z.number().int(), historicalUnknown: z.number().int(), onTimePercent: z.number().int().min(0).max(100).nullable(), calculatedAt: z.string(), timezone: z.string() });
const page = <S extends z.ZodType>(schema: S) => z.object({ items: z.array(schema), total: z.number().int().nonnegative(), page: id, pageSize: id });
export const meetingReadSchemas = { list_meetings: page(meetingRecordSchema), get_meeting: meetingDetailSchema, get_meeting_agreements: page(agreementRecordSchema), get_meeting_agreement_performance: meetingPerformanceSchema };
const changeViewSchema = z.object({ meetingTitle: z.string(), minutes: z.string().optional(), decisions: z.string().optional(), agreement: agreementRecordSchema.optional(), proposedAgreement: z.object({ title: z.string(), assignee: member, dueDate: date, followupEnabled: z.boolean() }).optional() });
export const meetingPreviewSchema = z.object({ tool: z.enum(meetingActionNames), confirmationToken: z.string(), expiresAt: z.string(), requiresConfirmation: z.literal(true), prepared: z.object({ action: z.enum(meetingActionNames), change: z.union([meetingChangeSchemas.save_meeting_minutes,meetingChangeSchemas.create_meeting_agreement,meetingChangeSchemas.delegate_meeting_agreement_task]), before: changeViewSchema, after: changeViewSchema }), consequences: z.array(z.string()) });
export const meetingCommittedSchema = z.object({ tool: z.enum(meetingActionNames), replayed: z.boolean(), result: z.object({ kind: z.enum(["meeting","agreement"]), id, meetingId: id }), record: z.union([meetingDetailSchema, agreementDetail]) });
export type MeetingQuery = z.infer<typeof meetingQuerySchema>;
export type MeetingChange = z.infer<typeof meetingChangeSchemas[MeetingActionName]>;
export type MeetingCommit = z.infer<typeof meetingCommitSchema>;
export interface MeetingReader {
  readMeeting?(name: MeetingReadName, request: MeetingQuery): Promise<unknown>;
  previewMeeting?(name: MeetingActionName, request: MeetingChange): Promise<unknown>;
  commitMeeting?(name: MeetingActionName, request: MeetingCommit): Promise<unknown>;
}
const result = (value: object) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value as Record<string, unknown> });
const descriptions: Record<string,string> = {
  list_meetings: "Busca las juntas autorizadas por fecha y nombre. Resuelve la junta exacta antes de escribir; no supone qué junta quiso decir el usuario.",
  get_meeting: "Consulta planeación, participantes, minuta, decisiones y versión actual de una junta autorizada. No registra asistencia ni votos.",
  get_meeting_agreements: "Consulta acuerdos de una junta autorizada, con responsable, fecha compromiso y versión. Incluye todos sus plazos con paginación.",
  get_meeting_agreement_performance: "Consulta cumplimiento confirmado en plazo contra la fecha original. Tareas y acuerdos se validan por separado; históricos sin base verificable no reciben calificación.",
  save_meeting_minutes: "Guarda la minuta y decisiones exactas de la vista previa confirmada. Conserva la versión; si cambió, vuelve a leer y revisar. No infieras hechos, asistencia, votos o cierre.",
  create_meeting_agreement: "Crea el acuerdo confirmado con responsable participante y fecha explícitos. Conserva la junta de origen. Los datos faltantes se consultan al usuario.",
  delegate_meeting_agreement_task: "Crea una única tarea nativa vinculada al acuerdo confirmado. Revisa responsable y plazo; cambios requieren motivo. Requiere consentimiento de acuerdos, tasks.create y tasks.delegate, además del acceso nativo."
};
export function registerMeetingTools(server: McpServer, reader: MeetingReader, allowed?: ReadonlySet<string>) {
  for (const name of meetingReadNames) {
    const tool = server.registerTool(name, { title: name, description: descriptions[name], inputSchema: meetingQuerySchemas[name], outputSchema: meetingReadSchemas[name], annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input: MeetingQuery) => {
      try { if (!reader.readMeeting) throw new Error("Meeting tools unavailable"); return result(meetingReadSchemas[name].parse(await reader.readMeeting(name,input))); } catch(error) { return toolError(error); }
    }); configureTool(tool,name,allowed);
  }
  for (const name of meetingActionNames) {
    const preview = server.registerTool(`preview_${name}`, { title: `Preparar: ${name}`, description: `Prepara una vista previa completa sin guardar cambios. Muéstrala y solicita confirmación antes de ejecutar. ${descriptions[name]}`, inputSchema: meetingChangeSchemas[name], outputSchema: meetingPreviewSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async (input: MeetingChange) => {
      try { if (!reader.previewMeeting) throw new Error("Meeting tools unavailable"); return result(meetingPreviewSchema.parse(await reader.previewMeeting(name,input))); } catch(error) { return toolError(error); }
    }); configureTool(preview,`preview_${name}`,allowed);
    const commit = server.registerTool(name, { title: name, description: `Ejecuta únicamente la vista previa aprobada explícitamente. No acepta campos de reemplazo. ${descriptions[name]}`, inputSchema: meetingCommitSchema, outputSchema: meetingCommittedSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async input => {
      try { if (!reader.commitMeeting) throw new Error("Meeting tools unavailable"); return result(meetingCommittedSchema.parse(await reader.commitMeeting(name,input))); } catch(error) { return toolError(error); }
    }); configureTool(commit,name,allowed);
  }
}
