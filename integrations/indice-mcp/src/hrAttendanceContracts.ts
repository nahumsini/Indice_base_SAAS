import { z } from "zod";

const id = z.number().int().positive();
const count = z.number().int().nonnegative();
const time = z.string().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)$/);
const optionalId = id.nullable().optional();
export const attendanceActions = ["create_hr_schedule", "update_hr_schedule", "assign_hr_schedule", "create_hr_location", "update_hr_location", "set_hr_allowed_locations", "assign_hr_work_site", "clear_hr_work_assignments", "correct_hr_attendance", "record_hr_attendance_event", "assign_hr_rest_days"] as const;
export const attendanceReads = ["list_hr_schedules", "get_hr_schedule", "list_hr_locations", "get_hr_location", "get_hr_attendance_calendar", "list_hr_schedule_candidates", "get_my_attendance_calendar", "get_my_attendance_events", "get_hr_attendance_events"] as const;
export const attendanceCandidateSchema = z.object({userCompanyId:id,employeeName:z.string(),position:z.string(),department:z.string(),status:z.string(),unitId:id.nullable(),unitName:z.string(),businessId:id.nullable(),businessName:z.string(),available:z.boolean(),busyReason:z.string()});
export const attendanceDayRuleSchema = z.object({ dayOfWeek: z.number().int().min(1).max(7), startTime: time.nullable().optional(), endTime: time.nullable().optional(), mealMinutes: count.max(1440), restMinutes: count.max(1440), lateAfterMinutes: count.max(1440), restDay: z.boolean() }).strict();
export const attendanceScheduleChangeSchema = z.object({ name: z.string().min(1).max(160), status: z.enum(["active", "inactive"]).nullable().optional(), mode: z.enum(["strict", "open"]).nullable().optional(), enforceLocation: z.boolean(), locationId: optionalId, days: z.array(attendanceDayRuleSchema).min(1).max(7) }).strict();
export const attendanceLocationChangeSchema = z.object({ name: z.string().min(1).max(160), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radiusMeters: z.number().int().min(1).max(25000),
  contractStartDate: z.iso.date(), contractEndDate: z.iso.date(), requiredStartTime: time.nullable().optional(), requiredEndTime: time.nullable().optional(), requiredHoursPerDay: z.number().positive().max(24).nullable().optional(), requiredDaysPerWeek: z.number().int().min(1).max(7), unitId: optionalId, businessId: optionalId, status: z.enum(["active", "inactive"]).nullable().optional() }).strict();
export const attendanceAssignmentChangeSchema = z.object({ templateId: optionalId, locationId: optionalId, userCompanyIds: z.array(id).min(1).max(100), startDate: z.iso.date(), endDate: z.iso.date().nullable().optional() }).strict();
export const attendanceCorrectionChangeSchema = z.object({ userCompanyId: id, dates: z.array(z.iso.date()).min(1).max(62), status: z.enum(["on_time", "late", "absence", "leave", "rest", "pending", "not_scheduled"]).nullable().optional(), notes: z.string().max(2000).nullable().optional() }).strict();
export const attendanceAllowedLocationsChangeSchema = z.object({ userCompanyId: id, locationIds: z.array(id).max(100) }).strict();
export const attendanceManualEventChangeSchema = z.object({ userCompanyId: id, date: z.iso.date(), kind: z.enum(["check_in", "check_out"]), timestamp: z.iso.datetime({ local: true }), notes: z.string().max(2000).nullable().optional() }).strict();
export const attendanceRestPlanSchema=z.object({assignments:z.array(z.object({userCompanyId:id,dates:z.array(z.iso.date()).min(1).max(62)}).strict()).min(1).max(100),notes:z.string().max(2000).nullable().optional()}).strict().superRefine((p,c)=>{if(p.assignments.reduce((n,a)=>n+a.dates.length,0)>250)c.addIssue({code:"custom",message:"Confirm at most 250 collaborator-days."});if(new Set(p.assignments.map(a=>a.userCompanyId)).size!==p.assignments.length||p.assignments.some(a=>new Set(a.dates).size!==a.dates.length))c.addIssue({code:"custom",message:"Collaborators and dates must be unique."});});
export const attendanceEventSchema=z.object({id,type:z.string(),timestamp:z.iso.datetime({local:true}),date:z.iso.date(),resultStatus:z.string(),kind:z.string(),notes:z.string(),supersedesEventId:id.nullable()});
export const attendanceChangeSchema = z.object({ schedule: attendanceScheduleChangeSchema.nullable().optional(), location: attendanceLocationChangeSchema.nullable().optional(), assignment: attendanceAssignmentChangeSchema.nullable().optional(), correction: attendanceCorrectionChangeSchema.nullable().optional(), allowedLocations: attendanceAllowedLocationsChangeSchema.nullable().optional(), manualEvent: attendanceManualEventChangeSchema.nullable().optional(), restPlan:attendanceRestPlanSchema.nullable().optional() }).strict();
export const attendanceScheduleViewSchema = z.object({ id: count, name: z.string(), status: z.string(), mode: z.string(), enforceLocation: z.boolean(), locationId: id.nullable(), locationName: z.string(), assignedCount: count, days: z.array(attendanceDayRuleSchema) });
export const attendanceLocationViewSchema = z.object({ id: count, name: z.string(), unitId: id.nullable(), unitName: z.string(), businessId: id.nullable(), businessName: z.string(), contractStartDate: z.string(), contractEndDate: z.string(), latitude: z.number().nullable(), longitude: z.number().nullable(), radiusMeters: count,
  requiredHoursPerDay: z.number().nullable(), requiredStartTime: z.string(), requiredEndTime: z.string(), requiredDaysPerWeek: count, status: z.string(), assignedCount: count });
const assignmentViewSchema = z.object({ userCompanyId: id, employeeName: z.string(), templateId: id.nullable(), templateName: z.string(), locationId: id.nullable(), locationName: z.string(), startDate: z.string(), endDate: z.string(), status: z.string() });
const dayViewSchema = z.object({ userCompanyId: id, employeeName: z.string(), date: z.iso.date(), systemStatus: z.string(), correctedStatus: z.string(), effectiveStatus: z.string(), editable: z.boolean(), lockReason: z.string(), firstCheckInAt: z.string(), lastCheckOutAt: z.string(), minutesLate: count, notes: z.string(), schedule: attendanceScheduleViewSchema.nullable(), workSite: attendanceLocationViewSchema.nullable() });
export const attendanceCalendarSchema = z.object({ userCompanyId: id, employeeName: z.string(), month: z.string().regex(/^\d{4}-\d{2}$/), items: z.array(dayViewSchema).max(31) });
export const attendanceResultSchema = z.object({ schedules: z.array(attendanceScheduleViewSchema), locations: z.array(attendanceLocationViewSchema), days: z.array(dayViewSchema),
  members: z.array(z.object({ userCompanyId: id, employeeName: z.string(), status: z.string(), allowedLocationIds: z.array(id), assignments: z.array(assignmentViewSchema) })), assignments: z.array(assignmentViewSchema) });
export const attendanceDescriptions = {
  assign_hr_rest_days:"Asigna descansos administrativos en un lote completo de hasta 100 colaboradores y 250 jornadas. Muestra todas las fechas y estados anteriores; conserva historial y reglas de asistencia y nómina.",
  create_hr_schedule: "Crea un horario con las reglas de días y horas completas y la ubicación confirmada.",
  update_hr_schedule: "Reemplaza las reglas completas del horario. Las asignaciones existentes usan sus nuevas reglas; puedes inactivarlo conservando referencias.",
  assign_hr_schedule: "Asigna un horario activo a los colaboradores y fechas mostrados. Cierra o divide asignaciones superpuestas y rechaza actividad registrada incompatible.",
  create_hr_location: "Registra un sitio de trabajo con coordenadas, radio, organización, contrato y jornadas explícitos.",
  update_hr_location: "Edita el sitio y su contrato completo. Permite inactivar conservando datos e historial.",
  set_hr_allowed_locations: "Reemplaza todas las ubicaciones permitidas del colaborador por la selección confirmada; lista vacía retira las anteriores.",
  assign_hr_work_site: "Asigna un sitio de contrato a un solo colaborador dentro de fechas permitidas; valida disponibilidad y horario compatible.",
  clear_hr_work_assignments: "Retira horario y sitio solo para el día mostrado. El propietario divide o conserva los rangos restantes.",
  correct_hr_attendance: "Corrige de 1 a 62 jornadas del colaborador con historial administrativo. status vacío elimina la corrección y restaura el cálculo. Conserva bloqueos de fecha y efectos en nómina.",
  record_hr_attendance_event: "Registra entrada o salida administrativa con fecha y hora explícitas. El propietario recalcula el estado final. Conserva el canal físico de kiosco e identificación."
};
const attendanceInput = <T extends z.ZodRawShape>(shape: T) => z.object({ attendance: z.object(shape).strict() }).strict();
export const attendanceInputs = {
  assign_hr_rest_days:attendanceInput({restPlan:attendanceRestPlanSchema}),
  create_hr_schedule: attendanceInput({ schedule: attendanceScheduleChangeSchema }), update_hr_schedule: attendanceInput({ schedule: attendanceScheduleChangeSchema }).extend({id}),
  create_hr_location: attendanceInput({ location: attendanceLocationChangeSchema }), update_hr_location: attendanceInput({ location: attendanceLocationChangeSchema }).extend({id}),
  assign_hr_schedule: attendanceInput({ assignment: attendanceAssignmentChangeSchema.omit({ locationId: true }).extend({ templateId: id }) }),
  assign_hr_work_site: attendanceInput({ assignment: attendanceAssignmentChangeSchema.extend({ locationId: id, userCompanyIds: z.array(id).length(1) }) }),
  clear_hr_work_assignments: attendanceInput({ assignment: attendanceAssignmentChangeSchema.omit({ templateId: true, locationId: true, endDate: true }).extend({ userCompanyIds: z.array(id).length(1) }) }),
  set_hr_allowed_locations: attendanceInput({ allowedLocations: attendanceAllowedLocationsChangeSchema }),
  correct_hr_attendance: attendanceInput({ correction: attendanceCorrectionChangeSchema }),
  record_hr_attendance_event: attendanceInput({ manualEvent: attendanceManualEventChangeSchema })
};
