import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import type { TaskCommitRequest } from "./contracts.js";
import { financeReadNames, financeActionNames, financeQuerySchema, financeInputs, PageSchema, PreviewSchema, CommittedSchema, type FinanceReadName, type FinanceWorkflowActionName, type FinanceQuery, type FinanceChange, type FinancePage, type FinancePreview, type FinanceCommitted } from "./financeContracts.js";
export interface FinanceReader {
    readFinance?(tool: FinanceReadName, request: FinanceQuery): Promise<FinancePage>;
    previewFinance?(action: FinanceWorkflowActionName, request: FinanceChange): Promise<FinancePreview>;
    commitFinance?(action: FinanceWorkflowActionName, request: TaskCommitRequest): Promise<FinanceCommitted>;
}
export function registerFinanceTools(server: McpServer, reader: FinanceReader, allowed?: ReadonlySet<string>): void {
    for (const name of financeReadNames) {
        const input = name.startsWith("get_") ? z.object({ id: z.number().int().positive() }).strict() : name === "list_expense_payments" ? financeQuerySchema.extend({ id: z.number().int().positive() }) : name === "list_petty_cash_type_changes" ? financeQuerySchema.extend({ fundId: z.number().int().positive() }) : financeQuerySchema;
        const tool = server.registerTool(name, { title: name, description: "Consulta el propietario financiero dentro de los permisos actuales de empresa, unidad, negocio y pestaña. Recorre nextCursor hasta hasMore=false antes de presentar una lista completa. Los totales cubren toda la población filtrada y mantienen cada moneda y clasificación de fondo separadas. Distingue captura, gasto reconocido, pagos acumulados y custodia. Un comprobante capturado conserva su salida aunque se rechace; autorización interna genera gasto de empresa, autorización externa valida el estado del tercero. Las consultas no entregan credenciales ni enlaces privados.", inputSchema: input, outputSchema: PageSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (args: FinanceQuery) => {
            try {
                if (!reader.readFinance)
                    throw Error("Finance reads unavailable");
                const result = PageSchema.parse(await reader.readFinance(name, financeQuerySchema.parse(args)));
                return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
            }
            catch (e) {
                return toolError(e);
            }
        });
        configureTool(tool, name, allowed);
    }
    for (const action of financeActionNames) {
        const preview = server.registerTool(`preview_${action}`, { title: `Revisar ${action}`, description: "Prepara la operación financiera exacta y valida referencias, estados, fechas, saldos y permisos sin aplicar sus efectos. Revisa before, changes y effects con el usuario y solicita su confirmación explícita. Caduca en cinco minutos. El backend calcula liquidaciones y saldo firmado del corte; no el agente. settle_expense_payment permite cuenta explícitamente sin asignar; register_expense_payment y pagos por lote requieren una cuenta. Las obligaciones presupuestales crean fechas finitas y su propietario genera cuentas por pagar en su mes. Una carga no paga salvo paid=true explícito. Revertir restaura el movimiento real y conserva historia. CHARGE_EMPLOYEE envía una deducción a RH pendiente de aplicación, no modifica una nómina finalizada. RETURN_TO_SOURCE devuelve todo el saldo al destino revisado. No combine monedas ni clasificaciones.", inputSchema: financeInputs[action], outputSchema: PreviewSchema, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } }, async (args: FinanceChange) => {
            try {
                if (!reader.previewFinance)
                    throw Error("Finance preview unavailable");
                const result = PreviewSchema.parse(await reader.previewFinance(action, args));
                return { content: [{ type: "text" as const, text: JSON.stringify(result) + "\nConfirma el destino y todos los efectos mostrados." }], structuredContent: result };
            }
            catch (e) {
                return toolError(e);
            }
        });
        configureTool(preview, `preview_${action}`, allowed);
        const commit = server.registerTool(action, { title: `Aplicar ${action}`, description: `Aplica únicamente la revisión preview_${action} confirmada explícitamente. No recibe cambios ni importes nuevos. Reutiliza confirmación y clave para recuperar el resultado original; si cambiaron saldos, referencias o permisos prepara una revisión nueva. Conserva los propietarios de Tesorería, presupuesto, contabilidad y RH, y registra la auditoría en la misma transacción.`, inputSchema: z.object({ confirmation_token: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotency_key: z.string().min(8).max(128) }).strict(), outputSchema: CommittedSchema, annotations: { readOnlyHint: false, destructiveHint: /^(remove|reverse|cancel|inactivate|close|revoke)_/.test(action), idempotentHint: true, openWorldHint: false } }, async (args) => {
            try {
                if (!reader.commitFinance)
                    throw Error("Finance commit unavailable");
                const result = CommittedSchema.parse(await reader.commitFinance(action, { confirmationToken: args.confirmation_token, idempotencyKey: args.idempotency_key }));
                return { content: [{ type: "text" as const, text: result.replayed ? "Resultado original recuperado; no se repitió la operación financiera." : "Operación completada y auditada." }], structuredContent: result };
            }
            catch (e) {
                return toolError(e);
            }
        });
        configureTool(commit, action, allowed);
    }
}
