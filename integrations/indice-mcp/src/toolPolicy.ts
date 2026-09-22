import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { indiceToolNameSchema, type IndiceToolName } from "./contracts.js";

/** Discovery metadata only. Spring remains the authority for every invocation. */
export const toolScopes: Record<IndiceToolName, string> = {
  get_sales_today: "sales.today:read", get_business_snapshot: "business.snapshot:read",
  get_attention_items: "business.snapshot:read", search_employees: "hr.people:read",
  get_employee_overview: "hr.people:read", get_attendance_exceptions: "hr.attendance:read",
  list_tasks: "tasks.read", get_task_detail: "tasks.read", get_sales_summary: "sales.read",
  list_sales: "sales.read", get_sale_detail: "sales.read", get_cash_status: "pos.read",
  search_products: "inventory.read", get_product_detail: "inventory.read", get_inventory_summary: "inventory.read",
  get_expense_summary: "expenses.read", list_expenses: "expenses.read", get_expense_detail: "expenses.read",
  get_funds_status: "petty_cash.read", get_receivables_status: "receivables.read",
  get_my_business_context: "business.context:read", list_units_and_businesses: "business.context:read",
  list_payment_accounts: "finance.references:read", list_funds: "petty_cash.read",
  search_customers: "customers.read", search_providers: "providers.read", list_warehouses: "warehouses.read",
  search_budget_lines: "budget_lines.read", search_accounting_accounts: "accounting_accounts.read",
  preview_create_task: "tasks.create", create_task: "tasks.create",
  preview_create_expense_draft: "expenses.create", create_expense_draft: "expenses.create",
  preview_register_fund_expense: "petty_cash.expense:create", register_fund_expense: "petty_cash.expense:create",
  preview_add_money_to_fund: "petty_cash.deposit:create", add_money_to_fund: "petty_cash.deposit:create"
};

export const supportedScopes = [...new Set([...Object.values(toolScopes), "openid", "email"])].sort();

export function bearerChallenge(metadataUrl: URL, error?: "invalid_token"): string {
  return `Bearer resource_metadata="${metadataUrl}", scope="${supportedScopes.join(" ")}"`
    + (error ? `, error="${error}", error_description="Reconnect your Indice account to continue"` : "");
}

export function configureTool(tool: RegisteredTool, name: string, allowedTools?: ReadonlySet<string>): void {
  const scope = toolScopes[indiceToolNameSchema.parse(name)];
  tool.update({ _meta: { ...tool._meta, securitySchemes: [{ type: "oauth2", scopes: [scope] }] } });
  if (allowedTools && !allowedTools.has(name)) tool.disable();
}

export function isRetryableRead(path: string, method: string): boolean {
  const pathname = path.split("?", 1)[0];
  if (method === "GET") return ["/api/v1/ai/access/verify", "/api/v1/ai/access/capabilities",
    "/api/v1/ai/tools/sales/today", "/api/v1/ai/tools/business/snapshot", "/api/v1/ai/tools/references/business-context"].includes(pathname!);
  if (method !== "POST") return false;
  if (pathname?.startsWith("/api/v1/ai/tools/query/")) {
    const name = indiceToolNameSchema.safeParse(pathname.slice("/api/v1/ai/tools/query/".length));
    return name.success && /(?:\.read|:read)$/.test(toolScopes[name.data]);
  }
  return ["organization", "payment-accounts", "funds", "customers", "providers", "warehouses", "budget-lines", "accounting-accounts"]
    .some(reference => pathname === `/api/v1/ai/tools/references/${reference}`);
}
