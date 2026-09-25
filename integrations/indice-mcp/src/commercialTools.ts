import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";

const id = z.number().int().positive();
const text = (max: number) => z.string().trim().min(1).max(max);
const money = z.number().nonnegative().max(9999999999999.99).multipleOf(0.01);
const line = z.object({ productId: id.optional(), productName: text(220).optional(), quantity: money.positive(),
  unitPrice: money, discountPercent: money.max(100).optional(), taxPercent: money.max(100)
    .describe("Explicit tax rate approved by the user; do not infer a jurisdiction or invent tax rates.") }).strict();
const lineResult = z.object({ productId: id.nullable(), productName: z.string(), quantity: z.number(),
  unitPrice: z.number(), discountPercent: z.number(), taxPercent: z.number(), total: z.number() });
export const commercialRecordSchema = z.object({
  kind: z.enum(["customer", "opportunity", "quote"]), id: id.nullable(), code: z.string().nullable(), name: z.string(),
  customerId: id.nullable(), opportunityId: id.nullable(), contactPerson: z.string().nullable(), phone: z.string().nullable(),
  email: z.string().nullable(), source: z.string().nullable(), status: z.string().nullable(), lifecycleStatus: z.string().nullable(),
  ownerUserCompanyId: id.nullable(), ownerName: z.string().nullable(), notes: z.string().nullable(), currency: z.string().nullable(),
  amount: z.number().nullable(), stage: z.string().nullable(), flowId: id.nullable(), flowName: z.string().nullable(), probabilityPercent: z.number().int().nullable(), expectedCloseDate: z.iso.date().nullable(), nextAction: z.string().nullable(),
  expirationDate: z.iso.date().nullable(), terms: z.string().nullable(), items: z.array(lineResult)
});
export const commercialPreviewSchema = z.object({ action: z.string(), confirmationToken: z.string().startsWith("idx_confirm_"),
  expiresAt: z.iso.datetime(), requiresConfirmation: z.literal(true), before: commercialRecordSchema.nullable(),
  after: commercialRecordSchema, effects: z.array(z.string()) });
export const commercialCommitSchema = z.object({ action: z.string(), replayed: z.boolean(), correlationId: z.string(), record: commercialRecordSchema });
const page = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item), totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(), nextCursor: z.string().nullable(), scope: z.string() });
const query = { query: text(120).optional(), limit: z.number().int().min(1).max(50).optional(), cursor: text(160).optional() };
const list = { ...query, status: text(80).optional(), customerId: id.optional(), ownerUserCompanyId: id.optional() };
const common = { name: text(220).optional(), ownerUserCompanyId: id.optional()
  .describe("Membership userCompanyId from search_commercial_assignees; never an employee/user id. Omission preserves the existing assignee; creation defaults to you."),
  notes: text(4000).optional() };
const fields = {
  customer: z.object({ ...common, status: z.enum(["active", "inactive"]).optional(), contactPerson: text(180).optional(),
    phone: text(80).optional(), email: z.email().max(220).optional(), source: text(80).optional(),
    clearFields: z.array(z.enum(["contactPerson", "phone", "email", "source", "notes"])).optional() }).strict(),
  opportunity: z.object({ ...common, customerId: id.optional(), source: text(80).optional(), status: z.enum(["active", "inactive"]).optional(),
    currency: z.string().regex(/^[A-Z]{3}$/).optional(), estimatedValue: money.optional(), flowId: id.optional(), stage: text(80).optional(),
    expectedCloseDate: z.iso.date().optional(), nextAction: text(120).optional(),
    clearFields: z.array(z.enum(["source", "notes", "expectedCloseDate", "nextAction"])).optional() }).strict(),
  quote: z.object({ ...common, customerId: id.optional(), opportunityId: id.optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    status: z.enum(["draft", "sent", "viewed", "negotiation", "approved", "rejected", "expired"]).optional(),
    expirationDate: z.iso.date().optional(), terms: text(4000).optional(), items: z.array(line).min(1).max(100).optional()
      .describe("Full ordered line list when replacing items. Omit to preserve all current lines. Amounts are calculated by Indice."),
    clearFields: z.array(z.enum(["notes", "expirationDate", "terms", "opportunityId"])).optional() }).strict()
};
const commitInput = z.object({ confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotencyKey: text(128).min(8) }).strict();
const pipeline = z.object({ selectedFlowId: id.nullable(), flows: z.array(z.object({ id: id.nullable(), name: z.string(), defaultFlow: z.boolean(), stages: z.array(z.object({
  key: z.string(), label: z.string(), type: z.string(), probabilityPercent: z.number() })) })),
  totals: z.array(z.object({ stage: z.string(), lifecycleStatus: z.string(), currency: z.string(), count: z.number().int(), amount: z.number().nullable() })), scope: z.string() });

type Definition = { input: z.ZodObject; output: z.ZodObject; description: string; scope: string; mode: "read" | "preview" | "create" | "update" };
export const commercialTools: Record<string, Definition> = {
  get_customer_detail: { input: z.object({ id }).strict(), output: commercialRecordSchema, scope: "customers.read", mode: "read",
    description: "Consulta el cliente exacto identificado con search_customers, incluyendo los datos comerciales de contacto autorizados." },
  list_opportunities: { input: z.object({ ...list, stage: text(80).optional() }).strict(), output: page(commercialRecordSchema), scope: "opportunities.read", mode: "read",
    description: "Consulta oportunidades autorizadas por nombre, cliente, estado, etapa o responsable. Pagina; no presenta la suma de una página como total global." },
  get_opportunity_detail: { input: z.object({ id }).strict(), output: commercialRecordSchema, scope: "opportunities.read", mode: "read", description: "Consulta una oportunidad exacta antes de proponer cambios." },
  get_opportunity_pipeline: { input: z.object({ flowId: id.optional() }).strict(), output: pipeline, scope: "opportunities.read", mode: "read",
    description: "Consulta flujos y etapas configurados y totales autorizados por etapa y moneda. Usa las claves reales para crear o mover oportunidades. No suma monedas distintas. Los totales usan las posiciones del flujo seleccionado; omitir flowId usa el predeterminado." },
  list_quotes: { input: z.object(list).strict(), output: page(commercialRecordSchema), scope: "quotes.read", mode: "read", description: "Consulta cotizaciones por cliente, estado, nombre o responsable; incluye partidas y totales del servidor, con paginación." },
  get_quote_detail: { input: z.object({ id }).strict(), output: commercialRecordSchema, scope: "quotes.read", mode: "read", description: "Consulta una cotización exacta con sus partidas antes de editar o reasignar." },
  search_commercial_assignees: { input: z.object(query).strict(), output: page(z.object({ userCompanyId: id, name: z.string(), unitId: id.nullable(), businessId: id.nullable() })),
    scope: "commercial.references:read", mode: "read", description: "Busca responsables comerciales activos dentro de tu alcance. Conserva todos los resultados ambiguos y pregunta cuál es el correcto. No uses ids de empleados o de cuentas." }
};
for (const kind of ["customer", "opportunity", "quote"] as const) {
  for (const operation of ["create", "update"] as const) {
    const action = `${operation}_${kind}`;
    const plural = kind === "opportunity" ? "opportunities" : `${kind}s`;
    const input = operation === "update" ? fields[kind].extend({ id })
      : kind === "customer" ? fields.customer.required({ name: true }).omit({ clearFields: true })
      : kind === "opportunity" ? fields.opportunity.required({ name: true, customerId: true, currency: true }).omit({ clearFields: true })
      : fields.quote.required({ customerId: true, currency: true, items: true }).omit({ clearFields: true, name: true });
    commercialTools[`preview_${action}`] = { input, output: commercialPreviewSchema, scope: `${plural}.${operation}`, mode: "preview",
      description: `Prepara ${operation === "create" ? "la creación" : "la edición parcial o reasignación"} de ${kind}. Identifica primero cliente, oportunidad, productos y responsable con las consultas autorizadas. No inventes datos, ids, precios ni impuestos. Omitir un campo lo conserva; clearFields sólo para borrados expresamente pedidos. Consulta las etapas reales para oportunidades. Muestra antes/después, partidas, moneda y total, y espera confirmación explícita. La vista previa vence en 5 minutos y no cambia datos comerciales. Cotizaciones admite estados comerciales; convertir a venta usa el módulo de Ventas.` };
    commercialTools[action] = { input: commitInput, output: commercialCommitSchema, scope: `${plural}.${operation}`, mode: operation,
      description: `Aplica únicamente preview_${action} tras confirmación explícita del usuario. Envía el token exacto y reutiliza la misma idempotencyKey en reintentos; no agregues campos nuevos. Si cambió el registro o una referencia, prepara otra vista previa y vuelve a confirmar. No envía correos ni crea ventas, cobros o movimientos de inventario.` };
  }
}
export interface CommercialReader { commercial?(tool: string, input: Record<string, unknown>): Promise<unknown> }
export function registerCommercialTools(server: McpServer, reader: CommercialReader, allowedTools?: ReadonlySet<string>): void {
  for (const [name, definition] of Object.entries(commercialTools)) {
    const readTitles: Record<string, string> = { get_customer_detail: "Ver cliente", list_opportunities: "Consultar oportunidades",
      get_opportunity_detail: "Ver oportunidad", get_opportunity_pipeline: "Ver flujo de oportunidades", list_quotes: "Consultar cotizaciones",
      get_quote_detail: "Ver cotización", search_commercial_assignees: "Buscar responsables comerciales" };
    const entity = name.endsWith("customer") ? "cliente" : name.endsWith("opportunity") ? "oportunidad" : "cotización";
    const title = readTitles[name] ?? (definition.mode === "preview"
      ? `Preparar ${name.includes("create_") ? "creación" : "cambios"} de ${entity}`
      : `Confirmar ${definition.mode === "create" ? "creación" : "cambios"} de ${entity}`);
    const tool = server.registerTool(name, { title, description: definition.description, inputSchema: definition.input,
      outputSchema: definition.output, annotations: { readOnlyHint: definition.mode === "read", destructiveHint: definition.mode === "update",
        idempotentHint: definition.mode !== "preview", openWorldHint: false } }, async input => {
      try {
        if (!reader.commercial) throw new Error("Commercial tools unavailable");
        const result = definition.output.parse(await reader.commercial(name, input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: result };
      } catch (error) { return toolError(error); }
    });
    configureTool(tool, name, allowedTools);
  }
}
