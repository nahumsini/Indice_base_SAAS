import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";
import { IndiceClient } from "../indiceClient.js";
import { loadConfig } from "../config.js";
import { financeActionNames, financeReadNames, financeInputs, PreviewSchema, PageSchema } from "../financeContracts.js";
import { filePurposeSchema, fileActionSchema, financeReportRequestSchema } from "../fileContracts.js";
import { isRetryableRead, toolScopes } from "../toolPolicy.js";
const empty = { expenses: [], payments: [], funds: [], statements: [], receipts: [], movements: [], accountingAccounts: [], paymentAccounts: [], providers: [], budgets: [], budgetLines: [], typeChanges: [], responsibles: [], reviews: [] };
const key = "idx_confirm_" + "a".repeat(43);
const effects = [{ currencyCode: "CAD", amount: "100.25", treasuryDelta: "-100.25", fundDelta: "0.00", createsCompanyExpense: false, recordsPayment: true, queuesPayrollDeduction: false, description: "Review the exact settlement and account." }];
test("finance MCP binds the exact review and immutable commit without resending money", async () => {
    const requests: {
        url: string;
        body: unknown;
    }[] = [];
    const backend = new IndiceClient(loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http" }), (async (input, init) => {
        const url = String(input), body = JSON.parse(String(init?.body));
        requests.push({ url, body });
        assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer idx_ai_synthetic");
        return new Response(JSON.stringify(url.endsWith("/preview") ? { action: "settle_expense_payment", confirmationToken: key, expiresAt: "2026-10-07T10:05:00Z", requiresConfirmation: true, before: empty, changes: body, effects } : { action: "settle_expense_payment", replayed: requests.length > 2, correlationId: "synthetic-finance", result: { action: "settle_expense_payment", records: empty, effects, nextActions: [] } }));
    }) as typeof fetch, "idx_ai_synthetic");
    const server = createIndiceMcpServer(backend, new Set(["preview_settle_expense_payment", "settle_expense_payment"]));
    const client = new Client({ name: "finance-contract", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(b);
    await client.connect(a);
    try {
        const tools = (await client.listTools()).tools;
        assert.equal(tools.length, 2);
        assert.ok(tools.every(t => t.annotations?.readOnlyHint === false));
        const data = { id: 2, payment: { paymentAccountId: null, paymentDate: "2026-10-07" }, locale: "en-CA" };
        assert.equal((await client.callTool({ name: "preview_settle_expense_payment", arguments: data })).isError, undefined);
        const identity = { confirmation_token: key, idempotency_key: "finance-settle-001" };
        assert.equal((await client.callTool({ name: "settle_expense_payment", arguments: identity })).isError, undefined);
        const replay = await client.callTool({ name: "settle_expense_payment", arguments: identity });
        assert.equal(replay.isError, undefined);
        assert.equal((replay.structuredContent as {
            replayed: boolean;
        }).replayed, true);
        assert.deepEqual(requests[0], { url: "http://127.0.0.1:8082/api/v1/ai/tools/finance_workflows/settle_expense_payment/preview", body: data });
        assert.deepEqual(requests[1], requests[2]);
        assert.deepEqual(requests[1]?.body, { confirmationToken: key, idempotencyKey: identity.idempotency_key });
        assert.equal((await client.callTool({ name: "settle_expense_payment", arguments: { ...identity, payment: { amount: 100 } } })).isError, true);
        assert.equal(requests.length, 3);
    }
    finally {
        await client.close();
        await server.close();
    }
});
test("finance catalog is closed and mutation retries are never automatic", () => {
    assert.equal(financeReadNames.length, 24);
    assert.equal(financeActionNames.length, 52);
    for (const action of financeActionNames) {
        assert.equal(toolScopes[action], toolScopes[`preview_${action}`]);
        assert.equal(isRetryableRead(`/api/v1/ai/tools/finance_workflows/${action}/preview`, "POST"), false);
        assert.equal(isRetryableRead(`/api/v1/ai/tools/finance_workflows/${action}/commit`, "POST"), false);
    }
    for (const tool of financeReadNames)
        assert.equal(isRetryableRead(`/api/v1/ai/tools/finance_workflows/${tool}`, "POST"), true);
    assert.notEqual(toolScopes.approve_finance_expense, toolScopes.register_expense_payment);
    assert.notEqual(toolScopes.reverse_expense_payment, toolScopes.correct_finance_expense);
    assert.equal(financeInputs.settle_expense_payment.safeParse({ id: 1, payment: { paymentAccountId: null } }).success, true);
    assert.equal(financeInputs.settle_expense_payment.safeParse({ id: 1, payment: { amount: 100, paymentAccountId: 2 } }).success, false);
    assert.equal(financeInputs.register_expense_payment.safeParse({ id: 1, payment: { amount: 100, paymentAccountId: null } }).success, false);
    assert.equal(financeInputs.create_expense_payable.safeParse({ expense: { concept: "Test", totalAmount: "10.25", currencyCode: "CAD", expenseDate: "2026-10-07", companyId: 999 } }).success, false);
    assert.equal(financeInputs.close_petty_cash_statement.safeParse({ fundId: 1, statementId: 2, closing: { action: "RETURN_TO_SOURCE", expectedClosingBalance: 100 } }).success, false);
    assert.equal(financeInputs.capture_petty_cash_receipt.safeParse({ fundId: 1, receipt: { description: "Test", totalAmount: "1.25", currencyCode: "CAD", expenseDate: "2026-10-07", status: "EXPENSE_CREATED" } }).success, false);
});
test("full population totals keep fund classifications separate and malformed confirmation fails closed", () => {
    const page = PageSchema.parse({ records: empty, totalCount: 200, returnedCount: 25, hasMore: true, nextCursor: "opaque", scope: "CORPORATE_OFFICE", asOfDate: "2026-10-07", timeZone: "America/Toronto", totals: [{ name: "CURRENT_RECORDED_CUSTODY", currencyCode: "CAD", fundType: "INTERNAL_COMPANY", amount: "100.25" }, { name: "CURRENT_RECORDED_CUSTODY", currencyCode: "CAD", fundType: "EXTERNAL_MANAGED", amount: "200.25" }] });
    assert.equal(page.totals.length, 2);
    assert.equal(page.totalCount, 200);
    const preview = { action: "settle_expense_payment", confirmationToken: key, expiresAt: "2026-10-07T10:05:00Z", requiresConfirmation: true, before: empty, changes: {}, effects };
    assert.equal(PreviewSchema.safeParse({ ...preview, requiresConfirmation: false }).success, false);
    assert.equal(PreviewSchema.safeParse({ ...preview, action: "arbitrary_sql" }).success, false);
    for (const purpose of ["expense_attachment", "budget_line_attachment", "petty_cash_receipt_attachment"])
        assert.equal(filePurposeSchema.safeParse(purpose).success, true);
    for (const action of ["attach_expense_file", "attach_budget_line_file", "attach_petty_cash_receipt_file"])
        assert.equal(fileActionSchema.safeParse(action).success, true);
    assert.equal(financeReportRequestSchema.safeParse({ report: "expenses", format: "csv", filters: { limit: 25 } }).success, false);
    assert.equal(financeReportRequestSchema.safeParse({ report: "petty_cash_statements", format: "pdf", filters: { fundId: 1 } }).success, true);
});
