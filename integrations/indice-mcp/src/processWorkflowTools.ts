import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import { processReadNames,processActionNames,processReadSchemas,processPageRequestSchema,processReadRequestSchema,processInputs,processPreviewSchema,processCommittedSchema,
  type ProcessReadName,type ProcessActionName,type ProcessReadRequest,type ProcessReadResult,type ProcessChangeRequest,type ProcessPreview,type ProcessCommitted } from "./processWorkflowContracts.js";
import type { TaskCommitRequest } from "./contracts.js";
export interface ProcessWorkflowReader {
  readProcessWorkflow?(tool:ProcessReadName,request:ProcessReadRequest):Promise<ProcessReadResult>;
  previewProcessWorkflow?(action:ProcessActionName,request:ProcessChangeRequest):Promise<ProcessPreview>;
  commitProcessWorkflow?(action:ProcessActionName,request:TaskCommitRequest):Promise<ProcessCommitted>;
}
export function registerProcessWorkflowTools(server:McpServer,reader:ProcessWorkflowReader,allowed?:ReadonlySet<string>):void {
  for(const name of processReadNames){
    const input=name==="list_process_runs"?z.object({id:z.number().int().positive(),page:processPageRequestSchema.optional()}).strict():name==="get_process_version"?z.object({id:z.number().int().positive(),version:z.number().int().positive()}).strict():name.startsWith("list_")?processPageRequestSchema:z.object({id:z.number().int().positive()}).strict();
    const tool=server.registerTool(name,{title:name,description:"Consulta proyectos, definiciones compartidas, responsables, versiones publicadas o ejecuciones de la empresa autorizada. No genera tareas ni publica versiones. Las listas indican totalCount y nextCursor; recorre todas las páginas con los mismos filtros. Los estados de ejecución se derivan de sus tareas. No asumas que cerrar un proyecto completa sus tareas.",inputSchema:input,outputSchema:processReadSchemas[name],annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async (args:z.infer<typeof input>)=>{
      try{if(!reader.readProcessWorkflow)throw new Error("Workflow reads unavailable");const request=processReadRequestSchema.parse("id" in args?args:{page:args});const result=processReadSchemas[name].parse(await reader.readProcessWorkflow(name,request));return {content:[{type:"text" as const,text:JSON.stringify(result)}],structuredContent:result};}catch(e){return toolError(e);}
    });configureTool(tool,name,allowed);
  }
  for(const action of processActionNames){
    const preview=server.registerTool(`preview_${action}`,{title:`Preparar ${action}`,description:"Prepara los datos y efectos exactos durante cinco minutos. La configuración de procesos es completa; editarlos publica una versión nueva y conserva ejecuciones anteriores. Revisa todas las tareas y fechas que se generarán y pide confirmación explícita. Pausar o archivar conserva historial y tareas; los proyectos no cambian automáticamente sus tareas. Las referencias duplicadas requieren permiso explícito. No uses una muestra para confirmar un lote.",inputSchema:processInputs[action],outputSchema:processPreviewSchema,annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:false}},async (args:z.infer<(typeof processInputs)[ProcessActionName]>)=>{
      try{if(!reader.previewProcessWorkflow)throw new Error("Workflow actions unavailable");const result=processPreviewSchema.parse(await reader.previewProcessWorkflow(action,args));return {content:[{type:"text" as const,text:`Antes: ${JSON.stringify(result.before)}\nDespués: ${JSON.stringify(result.after)}\n${result.effects.join("\n")}\nConfirma todos los cambios mostrados.`}],structuredContent:result};}catch(e){return toolError(e);}
    });configureTool(preview,`preview_${action}`,allowed);
    const commit=server.registerTool(action,{title:`Aplicar ${action}`,description:`Aplica exclusivamente preview_${action} confirmada por el usuario. Conserva la misma clave al reintentar. Cambios de versión, fechas o destinatarios requieren una vista previa nueva.`,inputSchema:z.object({confirmation_token:z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/),idempotency_key:z.string().min(8).max(128)}).strict(),outputSchema:processCommittedSchema,annotations:{readOnlyHint:false,destructiveHint:action.startsWith("archive_"),idempotentHint:true,openWorldHint:false}},async args=>{
      try{if(!reader.commitProcessWorkflow)throw new Error("Workflow actions unavailable");const result=processCommittedSchema.parse(await reader.commitProcessWorkflow(action,{confirmationToken:args.confirmation_token,idempotencyKey:args.idempotency_key}));return {content:[{type:"text" as const,text:`${action} completada.${result.replayed?" Se devuelve el resultado original; no se duplicó la operación.":""}`}],structuredContent:result};}catch(e){return toolError(e);}
    });configureTool(commit,action,allowed);
  }
}
