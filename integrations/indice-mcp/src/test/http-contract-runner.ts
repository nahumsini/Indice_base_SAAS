import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadConfig } from "../config.js";

const expectedTools = [
  "get_sales_today", "get_business_snapshot", "get_attention_items",
  "preview_create_task", "create_task",
  "search_employees", "get_employee_overview", "get_attendance_exceptions",
  "list_tasks", "get_task_detail", "get_sales_summary", "list_sales",
  "get_sale_detail", "get_cash_status", "search_products", "get_product_detail",
  "get_inventory_summary", "get_expense_summary", "list_expenses",
  "get_expense_detail", "get_funds_status", "get_receivables_status",
  "preview_create_expense_draft", "create_expense_draft",
  "preview_register_fund_expense", "register_fund_expense",
  "preview_add_money_to_fund", "add_money_to_fund"
] as const;

const config = loadConfig();
if (!config.accessToken) {
  throw new Error("INDICE_ACCESS_TOKEN is required for the delegated HTTP contract test.");
}
const client = new Client({ name: "indice-local-http-contract-runner", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(
  new URL(`http://${config.host}:${config.port}/mcp`),
  { requestInit: { headers: { Authorization: `Bearer ${config.accessToken}` } } }
);

await client.connect(transport);
try {
  const listed = await client.listTools();
  const registered = new Set(listed.tools.map(tool => tool.name));
  const missing = expectedTools.filter(tool => !registered.has(tool));
  if (missing.length > 0) throw new Error(`Missing MCP tools: ${missing.join(", ")}`);

  const results: Record<string, unknown> = {};
  results.get_sales_today = await call("get_sales_today", { preferred_currency: config.preferredCurrency });
  results.get_business_snapshot = await call("get_business_snapshot", {
    period: "monthly", preferred_currency: config.preferredCurrency
  });
  results.get_attention_items = await call("get_attention_items", {
    period: "monthly", preferred_currency: config.preferredCurrency
  });

  const employees = await call("search_employees", { limit: 3 });
  results.search_employees = compact(employees);
  const employee = firstItem(employees);
  const employeeId = positiveId(employee?.user_company_id) ?? positiveId(employee?.id);
  if (employeeId) {
    results.get_employee_overview = compact(await call("get_employee_overview", {
      employee_id: employeeId, limit: 3
    }));
  }
  results.get_attendance_exceptions = compact(await call("get_attendance_exceptions", { limit: 3 }));

  const tasks = await call("list_tasks", { limit: 3 });
  results.list_tasks = compact(tasks);
  const taskId = positiveId(firstItem(tasks)?.id);
  if (taskId) results.get_task_detail = compact(await call("get_task_detail", { task_id: taskId }));

  results.get_sales_summary = compact(await call("get_sales_summary", {}));
  const sales = await call("list_sales", { limit: 3 });
  results.list_sales = compact(sales);
  const sale = firstItem(sales);
  const saleId = positiveId(sale?.id);
  if (saleId && (sale?.source === "commercial" || sale?.source === "pos")) {
    results.get_sale_detail = compact(await call("get_sale_detail", {
      sale_id: saleId, source: sale.source
    }));
  }
  results.get_cash_status = compact(await call("get_cash_status", {}));

  const products = await call("search_products", { limit: 3 });
  results.search_products = compact(products);
  const productId = positiveId(firstItem(products)?.id);
  if (productId) results.get_product_detail = compact(await call("get_product_detail", { product_id: productId }));
  results.get_inventory_summary = compact(await call("get_inventory_summary", { limit: 3 }));

  results.get_expense_summary = compact(await call("get_expense_summary", {}));
  const expenses = await call("list_expenses", { limit: 3 });
  results.list_expenses = compact(expenses);
  const expenseId = positiveId(firstItem(expenses)?.id);
  if (expenseId) results.get_expense_detail = compact(await call("get_expense_detail", { expense_id: expenseId }));

  const funds = await call("get_funds_status", { limit: 3 });
  results.get_funds_status = compact(funds);
  results.get_receivables_status = compact(await call("get_receivables_status", { limit: 3 }));

  if (process.env.INDICE_E2E_COMMIT_ACTIONS === "true") results.actions = await runConfirmedActions(funds);

  process.stdout.write(`${JSON.stringify({
    registeredToolCount: registered.size,
    validatedToolCount: Object.keys(results).length,
    committedActions: process.env.INDICE_E2E_COMMIT_ACTIONS === "true",
    results
  }, null, 2)}\n`);
} finally {
  await client.close();
}

async function runConfirmedActions(funds: JsonRecord): Promise<JsonRecord> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const actionResults: JsonRecord = {};
  const expensePreview = await call("preview_create_expense_draft", {
    concept: `MCP E2E ${randomUUID().slice(0, 8)}`,
    description: "Validación local automática; gasto demo en borrador.",
    total_amount: 0.01,
    currency_code: config.preferredCurrency,
    expense_date: today
  });
  const expenseCommitArgs = confirmation(expensePreview);
  const expenseCommit = await call("create_expense_draft", expenseCommitArgs);
  const expenseReplay = await call("create_expense_draft", expenseCommitArgs);
  if (asRecord(expenseReplay).replayed !== true) throw new Error("Expense idempotency replay was not recognized.");
  actionResults.create_expense_draft = { commit: compact(expenseCommit), replay: compact(expenseReplay) };

  const fund = firstItem(funds);
  const fundId = positiveId(fund?.id);
  const sourceAccountId = positiveId(fund?.fundingSourcePaymentAccountId);
  const currency = typeof fund?.currency === "string" ? fund.currency : config.preferredCurrency;
  if (!fundId) {
    actionResults.fundActions = "skipped: no authorized demo fund";
    return actionResults;
  }

  const fundExpensePreview = await call("preview_register_fund_expense", {
    fund_id: fundId,
    description: `MCP E2E fondo ${randomUUID().slice(0, 8)}`,
    total_amount: 0.01,
    currency_code: currency,
    expense_date: today
  });
  actionResults.register_fund_expense = compact(await call(
    "register_fund_expense", confirmation(fundExpensePreview)
  ));

  if (!sourceAccountId) {
    actionResults.add_money_to_fund = "skipped: fund has no authorized source account";
    return actionResults;
  }
  const depositPreview = await call("preview_add_money_to_fund", {
    fund_id: fundId,
    source_payment_account_id: sourceAccountId,
    amount: 0.01,
    currency_code: currency,
    movement_date: today,
    reference: `MCP E2E ${randomUUID().slice(0, 8)}`
  });
  actionResults.add_money_to_fund = compact(await call(
    "add_money_to_fund", confirmation(depositPreview)
  ));
  return actionResults;
}

function confirmation(preview: JsonRecord): JsonRecord {
  const token = preview.confirmationToken;
  if (typeof token !== "string" || !token.startsWith("idx_confirm_")) {
    throw new Error("Action preview did not return a valid confirmation token.");
  }
  return { confirmation_token: token, idempotency_key: `e2e-${randomUUID()}` };
}

async function call(name: string, args: JsonRecord): Promise<JsonRecord> {
  const result = await client.callTool({ name, arguments: args });
  if (result.isError) throw new Error(`${name}: ${firstText(result.content) || "tool call failed"}`);
  return asRecord(result.structuredContent);
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("MCP tool returned an invalid structured result.");
  }
  return value as JsonRecord;
}

function firstItem(result: JsonRecord): JsonRecord | undefined {
  const items = result.items;
  if (!Array.isArray(items) || items.length === 0) return undefined;
  const value: unknown = items[0];
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined;
}

function positiveId(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function compact(result: JsonRecord): JsonRecord {
  return {
    ...(typeof result.tool === "string" ? { tool: result.tool } : {}),
    ...(typeof result.action === "string" ? { action: result.action } : {}),
    ...(typeof result.count === "number" ? { count: result.count } : {}),
    ...(typeof result.replayed === "boolean" ? { replayed: result.replayed } : {}),
    ...(result.summary && typeof result.summary === "object" ? { summary: result.summary } : {}),
    ...(result.result && typeof result.result === "object" ? { result: result.result } : {})
  };
}

function firstText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const first: unknown = content[0];
  if (typeof first !== "object" || first === null || !("type" in first) || !("text" in first)) return "";
  return first.type === "text" && typeof first.text === "string" ? first.text : "";
}
