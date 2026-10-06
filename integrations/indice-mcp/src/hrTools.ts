import { payrollInputs,payrollDescriptions } from "./hrPayrollContracts.js";
import { attendanceInputs, attendanceDescriptions, attendanceReads } from "./hrAttendanceContracts.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import { hrActionNameSchema, hrReadNameSchema, hrReadSchemas, hrPageRequestSchema, employeeChangeSchema, assetChangeSchema, announcementChangeSchema,
  hrPreviewSchema, hrCommitSchema, hrReadRequestSchema, terminationChangeSchema,assetUpdateSchema,assetAssignmentSchema,recordChangeSchema,permissionChangeSchema,incentiveChangeSchema, type HrActionName, type HrChange, type HrReadName, type HrReadRequest, type HrReadResult, type HrPreview, type HrCommitted } from "./hrContracts.js";
import type { TaskCommitRequest } from "./contracts.js";

export interface HrReader {
  readHr?(tool: HrReadName, request: HrReadRequest): Promise<HrReadResult>;
  previewHr?(action: HrActionName, request: HrChange): Promise<HrPreview>;
  commitHr?(action: HrActionName, request: TaskCommitRequest): Promise<HrCommitted>;
}
const descriptions: Record<HrActionName, string> = { ...payrollDescriptions,...attendanceDescriptions,
  create_hr_incentive:"Registra un incentivo con moneda y audiencia explícitas. El propietario calcula cada aplicación en moneda de nómina; revisa todos los destinatarios e importes. No transfiere dinero.",
  cancel_hr_incentive:"Pausa el incentivo autorizado y cancela aplicaciones aún aprobadas. Conserva aplicaciones ya procesadas en nómina; no revierte pagos.",
  create_my_hr_permission:"Solicita un permiso exclusivamente para tu propia membresía con fechas, motivo y tratamiento de nómina. Se registra pendiente; no se autoriza automáticamente.",
  withdraw_my_hr_permission:"Retira exclusivamente tu solicitud pendiente usando el ciclo de eliminación existente. Elimina solicitud y adjuntos; conserva el registro de la acción delegada. No permite retirar permisos aprobados.",
  approve_hr_permission:"Aprueba una solicitud pendiente dentro del alcance administrativo de RH y sincroniza las jornadas autorizadas con asistencia y nómina. Requiere consentimiento de revisión separado.",
  reject_hr_permission:"Rechaza una solicitud pendiente autorizada con notas de revisión y conserva la solicitud.",
  terminate_employee:"Registra una baja laboral con fecha y motivo explícitos. Inactiva acceso y conserva expediente. No calcula ni paga finiquito. Requiere consentimiento separado hr.people.terminate.",
  update_hr_asset:"Edita los datos del activo autorizado y conserva la asignación. Para responsable o estado usa la acción específica de ciclo de vida.",
  reassign_hr_asset:"Asigna o reasigna un activo a un colaborador autorizado, en estado assigned o custody. Conserva el historial de responsables y cierra la asignación anterior.",
  change_hr_asset_status:"Cambia el estado del activo autorizado. Los estados sin responsable cierran la asignación anterior; assigned/custody requieren responsable. Muestra fecha efectiva y motivo.",
  update_announcement:"Edita el comunicado con contenido, estado y audiencia completos. Reemplaza destinos y sincroniza las entregas según el estado mostrado.",
  mark_announcement_read:"Marca como leído el comunicado exclusivamente para la propia membresía autenticada.",
  mark_announcement_unread:"Marca como pendiente de lectura exclusivamente para la propia membresía autenticada.",
  create_hr_record:"Crea un acta autorizada con acuerdos, severidad, estado y testigos validados por RH. No obtiene archivos privados.",
  update_hr_record:"Actualiza el acta con todos los datos y testigos mostrados; conserva historial y adjuntos. Requiere el consentimiento administrativo de actas.",
  create_employee: "Crea expediente y acceso estándar de colaborador; requiere identidad, puesto, departamento, unidad, negocio, país laboral registrationCountry y compensación válida. La moneda procede del propietario de nómina; no se infiere por idioma. Ocupa un lugar del plan; no permite roles ni contraseñas.",
  update_employee: "Edita el expediente autorizado, incluyendo organización y condiciones laborales. Conserva campos omitidos y el rol de acceso. Resuelve la membresía con search_employees y revisa get_employee_file.",
  import_employees: "Importa de 1 a 100 colaboradores en un lote atómico confirmado. Valida campos, correos duplicados, destinos y capacidad del plan. Muestra todas las filas; no confirmes una muestra como si fuera el lote completo.",
  inactivate_employee: "Inactiva el acceso del colaborador a esta empresa y conserva expediente e historial. No registra terminación laboral. No permite inactivar el propio acceso del operador.",
  create_hr_asset: "Registra un activo y su responsable autorizado. Usa membresías de RH, estado válido y moneda explícita cuando hay valor. Conserva la separación entre disponible, asignado, custodia, mantenimiento e inactivo.",
  create_announcement: "Crea un comunicado dirigido a personal, unidades, departamentos o colaboradores autorizados. Por defecto guarda borrador; published entrega a la audiencia y scheduled usa la fecha local del módulo. Muestra audiencia y estado antes de confirmar."
};
const inputs = { ...payrollInputs,...attendanceInputs,
  create_hr_incentive:z.object({incentive:incentiveChangeSchema}).strict(),
  cancel_hr_incentive:z.object({id:z.number().int().positive()}).strict(),
  create_my_hr_permission:z.object({permission:permissionChangeSchema.omit({reviewNotes:true}).extend({type:permissionChangeSchema.shape.type.unwrap(),startDate:z.iso.date(),endDate:z.iso.date(),reason:z.string().min(1).max(2000)})}).strict(),
  withdraw_my_hr_permission:z.object({id:z.number().int().positive()}).strict(),
  approve_hr_permission:z.object({id:z.number().int().positive(),permission:z.object({reviewNotes:z.string().max(2000).optional()}).strict()}).strict(),
  reject_hr_permission:z.object({id:z.number().int().positive(),permission:z.object({reviewNotes:z.string().max(2000).optional()}).strict()}).strict(),
  terminate_employee:z.object({id:z.number().int().positive(),termination:terminationChangeSchema}).strict(),
  update_hr_asset:z.object({id:z.number().int().positive(),asset:assetUpdateSchema}).strict(),
  reassign_hr_asset:z.object({id:z.number().int().positive(),assignment:assetAssignmentSchema.extend({responsibleUserCompanyId:z.number().int().positive(),status:z.enum(["assigned","custody"])})}).strict(),
  change_hr_asset_status:z.object({id:z.number().int().positive(),assignment:assetAssignmentSchema}).strict(),
  update_announcement:z.object({id:z.number().int().positive(),announcement:announcementChangeSchema}).strict(),
  mark_announcement_read:z.object({id:z.number().int().positive()}).strict(),
  mark_announcement_unread:z.object({id:z.number().int().positive()}).strict(),
  create_hr_record:z.object({record:recordChangeSchema}).strict(),
  update_hr_record:z.object({id:z.number().int().positive(),record:recordChangeSchema}).strict(),
  create_employee: z.object({ employee: employeeChangeSchema }).strict(),
  update_employee: z.object({ id: z.number().int().positive(), employee: employeeChangeSchema }).strict(),
  import_employees: z.object({ employees: z.array(employeeChangeSchema).min(1).max(100) }).strict(),
  inactivate_employee: z.object({ id: z.number().int().positive() }).strict(),
  create_hr_asset: z.object({ asset: assetChangeSchema }).strict(),
  create_announcement: z.object({ announcement: announcementChangeSchema }).strict()
};
export function registerHrTools(server: McpServer, reader: HrReader, allowed?: ReadonlySet<string>): void {
  for(const name of hrReadNameSchema.options) {
    const listing = name.startsWith("list_");
    const scopedPage = name === "get_hr_asset_history" || name === "get_announcement_receipts";
    const input = name === "get_my_attendance_calendar" ? z.object({month:z.string().regex(/^\d{4}-\d{2}$/)}).strict() : name === "get_my_attendance_events" ? z.object({startDate:z.iso.date(),page:hrPageRequestSchema.optional()}).strict() : name === "get_hr_attendance_events" ? z.object({id:z.number().int().positive(),startDate:z.iso.date(),page:hrPageRequestSchema.optional()}).strict() : name === "list_hr_schedule_candidates" ? z.object({startDate:z.iso.date(),endDate:z.iso.date().optional(),availableOnly:z.boolean().optional(),page:hrPageRequestSchema.optional()}).strict() : name === "get_hr_attendance_calendar" ? z.object({id:z.number().int().positive(),month:z.string().regex(/^\d{4}-\d{2}$/)}).strict() : scopedPage ? z.object({id:z.number().int().positive(),page:hrPageRequestSchema.optional()}).strict() : listing ? hrPageRequestSchema : z.object({ id: z.number().int().positive() }).strict();
    const tool = server.registerTool(name, { title: name,
      description: name.includes("payroll") ? "Consulta nóminas y líneas completas, importes nativos, conceptos, cumplimiento y advertencias del propietario. Respeta alcance vigente y paginación; no suma monedas diferentes ni cambia estados, preferencias o conciliaciones. Excluye datos bancarios, legales y fiscales privados." : attendanceReads.includes(name as (typeof attendanceReads)[number]) ? "Consulta horarios, sitios y calendarios completos mediante el propietario de asistencia, con alcance administrativo vigente. El calendario requiere mes explícito YYYY-MM y devuelve reglas y estados calculados/corregidos. Excluye fotografías, biometría y claves privadas. Las listas tienen totalCount y nextCursor." : name === "list_hr_organization" ? "Resuelve unidades y negocios activos para altas e importaciones de colaboradores dentro del alcance actual de RH. Requiere hr.people.manage; no exige permisos de configuración. Selecciona por nombre y unidad y pregunta ante ambigüedad."
        : name === "list_announcement_audience" ? "Resuelve destinatarios de comunicados: unidades, departamentos y colaboradores con nombres y contexto del alcance vigente. Requiere hr.announcements.manage y permiso administrativo de comunicados. No exige acceso a Configuración ni al expediente laboral. Usa query y continúa con nextCursor conservando filtros y limit."
        : name.includes("incentive") ? "Consulta incentivos y sus aplicaciones de nómina dentro del alcance autorizado, con importes, monedas, estados y tipo de cambio del propietario. Las listas devuelven totalCount y nextCursor."
        : name.includes("permission") ? "Consulta solicitudes de permiso dentro del alcance autorizado. Las herramientas _my_ muestran exclusivamente tus solicitudes; las administrativas requieren hr.permissions.read. Devuelve fechas, tratamiento de nómina y revisión, sin archivos privados. Continúa listas con nextCursor."
        : name.includes("record") ? "Consulta actas y registros de RH autorizados con tipo, severidad, estado, acuerdos, historial y metadatos de adjuntos. Requiere hr.records.read y permiso administrativo exacto de actas. No obtiene archivos privados ni cambia acuerdos o estados. Las listas indican totalCount y nextCursor; recorre el filtro completo."
        : name === "get_employee_file" ? "Consulta el expediente laboral autorizado con compensación, condiciones y metadatos de documentos. Excluye credenciales, documentos privados, identificaciones legales, salud y datos bancarios. Usa userCompanyId de search_employees."
        : `${listing ? "Lista" : "Consulta"} ${name.includes("asset") ? "activos de RH" : "comunicados"} dentro del alcance vigente. Las listas indican totalCount y nextCursor; continúa con los mismos filtros. No obtiene fotografías ni archivos privados.`,
      inputSchema: input, outputSchema: hrReadSchemas[name], annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, async (args: z.infer<typeof input>) => {
      try {
        if(!reader.readHr) throw new Error("HR reads unavailable");
        const request = hrReadRequestSchema.parse("id" in args || "startDate" in args || "month" in args ? args : { page: args });
        const result = hrReadSchemas[name].parse(await reader.readHr(name, request));
        return { content: [{ type: "text" as const, text: "totalCount" in result ? `${result.returnedCount} de ${result.totalCount} registros autorizados.${result.hasMore ? " Hay más páginas; continúa con nextCursor y los mismos filtros." : " Consulta completa."}` : JSON.stringify(result) }], structuredContent: result };
      } catch(error) { return toolError(error); }
    });
    configureTool(tool,name,allowed);
  }
  for(const action of hrActionNameSchema.options) {
    const preview = server.registerTool(`preview_${action}`, { title: `Preparar: ${action}`, description: `${descriptions[action]} Solo prepara la vista previa de cinco minutos. Solicita confirmación explícita de los datos y efectos completos.`, inputSchema: inputs[action], outputSchema: hrPreviewSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    }, async (request: z.infer<(typeof inputs)[HrActionName]>) => {
      try {
        if(!reader.previewHr) throw new Error("HR actions unavailable");
        const result=hrPreviewSchema.parse(await reader.previewHr(action,request));
        return { content: [{ type: "text" as const, text: `Vista previa de ${action}:\nAntes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\nDatos y destinatarios exactos: ${JSON.stringify(result.changes)}\n${result.effects.join("\n")}\nConfirma estos datos para aplicarlos.` }], structuredContent: result };
      } catch(error) { return toolError(error); }
    });
    configureTool(preview,`preview_${action}`,allowed);
    const commit=server.registerTool(action,{ title:`Aplicar: ${action}`,description:`Aplica solo preview_${action} aprobada explícitamente. No recibe campos nuevos. Reutiliza la misma clave al reintentar para evitar duplicados.`,inputSchema:z.object({ confirmation_token:z.string().startsWith("idx_confirm_"),idempotency_key:z.string().min(8).max(128) }).strict(),outputSchema:hrCommitSchema,
      annotations:{ readOnlyHint:false,destructiveHint:action==="inactivate_employee",idempotentHint:true,openWorldHint:false }
    },async input=>{
      try {
        if(!reader.commitHr) throw new Error("HR actions unavailable");
        const result=hrCommitSchema.parse(await reader.commitHr(action,{ confirmationToken:input.confirmation_token,idempotencyKey:input.idempotency_key }));
        return { content:[{ type:"text" as const,text:`Acción ${action} completada.${result.replayed?" Resultado original del mismo intento; no se duplicó la operación.":""}` }],structuredContent:result };
      } catch(error){ return toolError(error); }
    });
    configureTool(commit,action,allowed);
  }
}
