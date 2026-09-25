import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { configureTool } from "./toolPolicy.js";
import { toolError } from "./toolErrors.js";
import { referencePageRequestSchema, type ReferencePageRequest } from "./contracts.js";
import {
  taskAssigneeReferencePageSchema, type TaskAssigneeReferencePage,
  customerReferencePageSchema, warehouseReferencePageSchema, providerReferencePageSchema,
  budgetLineReferencePageSchema, accountingAccountReferencePageSchema,
  type CustomerReferencePage, type WarehouseReferencePage, type ProviderReferencePage,
  type BudgetLineReferencePage, type AccountingAccountReferencePage
} from "./operationalReferenceContracts.js";

export interface OperationalReferenceReader {
  searchTaskAssignees?(request?: ReferencePageRequest): Promise<TaskAssigneeReferencePage>;
  searchCustomers?(request?: ReferencePageRequest): Promise<CustomerReferencePage>;
  searchProviders?(request?: ReferencePageRequest): Promise<ProviderReferencePage>;
  listWarehouses?(request?: ReferencePageRequest): Promise<WarehouseReferencePage>;
  searchBudgetLines?(request?: ReferencePageRequest): Promise<BudgetLineReferencePage>;
  searchAccountingAccounts?(request?: ReferencePageRequest): Promise<AccountingAccountReferencePage>;
}

export function registerOperationalReferenceTools(server: McpServer, reader: OperationalReferenceReader,
    allowedTools?: ReadonlySet<string>): void {
  function register<S extends z.ZodObject>(name: string, title: string, description: string, schema: S,
      execute: ((request: ReferencePageRequest) => Promise<z.infer<S>>) | undefined) {
    const tool = server.registerTool(name, {
      title, description,
      inputSchema: referencePageRequestSchema.strict(),
      outputSchema: schema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    }, async input => {
      if (!execute) return { isError: true, content: [{ type: "text" as const, text: "Reference resolver is not configured." }] };
      try {
        const result = schema.parse(await execute(referencePageRequestSchema.parse(input)));
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          structuredContent: result
        };
      } catch (error) {
        return toolError(error);
      }
    });
    configureTool(tool, name, allowedTools);
  }
  register("search_task_assignees", "Buscar responsables de tareas",
    "Busca responsables activos por nombre dentro del alcance de Tareas de Índice. Usa userCompanyId para asignar; no confundas este valor con un employee_id o user_id. Si hay varias coincidencias, pide elegir por nombre y unidad/negocio; nunca adivines el responsable. No envía mensajes ni crea tareas.",
    taskAssigneeReferencePageSchema, reader.searchTaskAssignees?.bind(reader));
  register("search_customers", "Buscar clientes",
    "Busca clientes compartidos por POS y Ventas por nombre o código, dentro del alcance autorizado. Devuelve identificadores y contexto para seleccionar al cliente exacto; no crea ni edita clientes.",
    customerReferencePageSchema, reader.searchCustomers?.bind(reader));
  register("search_providers", "Buscar proveedores",
    "Busca el mismo catálogo de proveedores de Gastos e Inventarios por nombre o razón social, dentro del alcance autorizado. No devuelve datos fiscales sensibles ni accesos de kiosco.",
    providerReferencePageSchema, reader.searchProviders?.bind(reader));
  register("list_warehouses", "Consultar almacenes",
    "Lista almacenes por nombre o código y su unidad/negocio autorizado. Resuelve el almacén exacto; no modifica existencias ni realiza transferencias.",
    warehouseReferencePageSchema, reader.listWarehouses?.bind(reader));
  register("search_budget_lines", "Consultar partidas presupuestales",
    "Busca partidas por nombre o categoría con presupuesto, compromiso, gasto real y disponible calculados por Índice. Cada fila conserva su moneda; los totales no se calculan desde una página parcial.",
    budgetLineReferencePageSchema, reader.searchBudgetLines?.bind(reader));
  register("search_accounting_accounts", "Consultar cuentas contables",
    "Busca cuentas contables por código, nombre o grupo dentro del alcance autorizado. Identifica la clasificación exacta antes de preparar un gasto; no crea ni modifica cuentas.",
    accountingAccountReferencePageSchema, reader.searchAccountingAccounts?.bind(reader));
}
