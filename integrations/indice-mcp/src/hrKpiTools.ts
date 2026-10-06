import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
const n=z.number().int().nonnegative(),date=z.iso.date(),rate=n.max(100).nullable();
export const hrKpiRequestSchema=z.object({date,from:date,to:date,unitId:z.number().int().positive().optional(),businessId:z.number().int().positive().optional(),department:z.string().max(120).optional(),query:z.string().max(120).optional(),attendanceStatus:z.enum(["on_time","late","absence","pending","rest","leave","not_scheduled"]).optional()}).strict();
const attendance=z.object({scheduled:n,onTime:n,late:n,absence:n,pending:n,rest:n,leave:n,unconfigured:n,present:n,completedSample:n,attendanceRate:rate,punctualityRate:rate});
export const hrKpiResultSchema=z.object({definitionVersion:z.literal(1),date,from:date,to:date,previousDate:date,workforce:z.object({total:n,active:n,inactive:n,terminated:n}).nullable(),attendance:attendance.nullable(),previousAttendance:attendance.nullable(),assets:z.object({total:n,assignedItems:n,assignedPeople:n,available:n,maintenance:n,inactive:n}).nullable(),records:z.object({total:n,open:n,criticalOpen:n,pending:n,reviewed:n,resolved:n}).nullable(),permissions:z.object({total:n,pending:n,approved:n,rejected:n}).nullable(),sources:z.array(z.object({name:z.enum(["people","attendance","assets","records","permissions"]),available:z.boolean(),reason:z.string()}))});
export type HrKpiRequest=z.infer<typeof hrKpiRequestSchema>;
export type HrKpiResult=z.infer<typeof hrKpiResultSchema>;
export interface HrKpiReader { getHrKpis?(request:HrKpiRequest):Promise<HrKpiResult> }
export function registerHrKpiTools(server:McpServer,reader:HrKpiReader,allowed?:ReadonlySet<string>):void {
  const tool=server.registerTool("get_hr_kpis",{title:"Indicadores de Recursos Humanos",description:"Consulta definiciones oficiales v1 con fecha operativa y periodo explícitos (hasta 366 días), unidad, negocio, departamento, búsqueda y estado de asistencia. Incluye todas las fuentes autorizadas y comparación con el día anterior. Ausencias y tasas usan únicamente muestras completadas; pendientes, descansos, permisos y falta de horario no son ausencias. null significa N/A por falta de muestra o fuente autorizada; conserva sources y denominadores. No extrapola páginas, mezcla monedas ni modifica asistencia o nómina.",inputSchema:hrKpiRequestSchema,outputSchema:hrKpiResultSchema,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async request=>{
    try{if(!reader.getHrKpis)throw new Error("HR indicators unavailable");const result=hrKpiResultSchema.parse(await reader.getHrKpis(request));return {content:[{type:"text" as const,text:JSON.stringify(result)}],structuredContent:result};}catch(e){return toolError(e);}
  });configureTool(tool,"get_hr_kpis",allowed);
}
