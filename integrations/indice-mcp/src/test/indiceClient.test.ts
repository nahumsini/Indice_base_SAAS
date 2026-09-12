import assert from "node:assert/strict";
import test from "node:test";
import type { IndiceMcpConfig } from "../config.js";
import { IndiceClient } from "../indiceClient.js";

const oauthConfig = {
  oauthIssuer: new URL("http://localhost:8080"),
  oauthResourceMetadataUrl: new URL("http://localhost:8080/.well-known/oauth-protected-resource"),
  resourceUrl: new URL("http://localhost:3010/mcp")
};

test("creates a session and requests the tenant-scoped business endpoint", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    jsonResponse({ csrfToken: "csrf-token" }, 200, "JSESSIONID=first; Path=/; HttpOnly"),
    jsonResponse({ user: { id: 1 } }, 200, "JSESSIONID=second; Path=/; HttpOnly"),
    jsonResponse(summary(), 200)
  ];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected request");
    }
    return response;
  }) as typeof fetch;

  const client = new IndiceClient(config(), fakeFetch);
  const result = await client.getSalesToday("cad");

  assert.equal(result.saleCount, 2);
  assert.equal(requests.length, 3);
  assert.equal(requests[0]?.url, "http://127.0.0.1:8082/api/v1/auth/csrf");
  assert.equal(new Headers(requests[1]?.init?.headers).get("Cookie"), "JSESSIONID=first");
  assert.equal(new Headers(requests[2]?.init?.headers).get("Cookie"), "JSESSIONID=second");
  assert.match(requests[2]?.url ?? "", /preferredCurrency=CAD$/);
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    companyName: "Demo Company",
    email: "demo@example.com",
    password: "local-password"
  });
});

test("rejects an invalid response contract", async () => {
  const responses = [
    jsonResponse({ csrfToken: "csrf-token" }, 200, "JSESSIONID=first; Path=/"),
    jsonResponse({}, 200, "JSESSIONID=second; Path=/"),
    jsonResponse({ saleCount: "wrong" }, 200)
  ];
  const fakeFetch = (async () => responses.shift() as Response) as typeof fetch;
  const client = new IndiceClient(config(), fakeFetch);

  await assert.rejects(() => client.getSalesToday(), /invalid sales summary contract/);
});

test("does not expose backend error bodies", async () => {
  const responses = [
    jsonResponse({ csrfToken: "csrf-token" }, 200, "JSESSIONID=first; Path=/"),
    jsonResponse({ message: "internal database detail" }, 500)
  ];
  const fakeFetch = (async () => responses.shift() as Response) as typeof fetch;
  const client = new IndiceClient(config(), fakeFetch);

  await assert.rejects(
    () => client.getSalesToday(),
    error => error instanceof Error
      && /Indice authentication failed/.test(error.message)
      && !/database detail/.test(error.message)
  );
});

function config(): IndiceMcpConfig {
  return {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "session",
    companyName: "Demo Company",
    email: "demo@example.com",
    password: "local-password",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "stdio",
    host: "127.0.0.1",
    port: 3010
  };
}

test("uses the delegated business endpoint without a password or cookie", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return jsonResponse(summary(), 200);
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };

  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");
  const result = await client.getSalesToday("cad");

  assert.equal(result.saleCount, 2);
  assert.equal(requests.length, 1);
  assert.match(requests[0]?.url ?? "", /\/api\/v1\/ai\/tools\/sales\/today\?preferredCurrency=CAD$/);
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("Authorization"),
    "Bearer idx_ai_delegated-token-value-1234567890"
  );
  assert.equal(new Headers(requests[0]?.init?.headers).get("Cookie"), null);
});

test("verifies delegated access without exposing token details", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };

  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  assert.equal(await client.hasValidDelegatedAccess(), true);
  assert.equal(requests[0]?.url, "http://127.0.0.1:8082/api/v1/ai/access/verify");
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("Authorization"),
    "Bearer idx_ai_delegated-token-value-1234567890"
  );
});

test("loads the current delegated tool capability manifest", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return jsonResponse({ version: "v1", tools: ["get_sales_today", "list_tasks"] }, 200);
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  const capabilities = await client.getDelegatedToolCapabilities();

  assert.deepEqual(capabilities, { version: "v1", tools: ["get_sales_today", "list_tasks"] });
  assert.equal(requests[0]?.url, "http://127.0.0.1:8082/api/v1/ai/access/capabilities");
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("Authorization"),
    "Bearer idx_ai_delegated-token-value-1234567890"
  );
});

test("rejects an unknown tool in the delegated capability manifest", async () => {
  const fakeFetch = (async () => jsonResponse({
    version: "v1",
    tools: ["unknown_database_tool"]
  }, 200)) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  await assert.rejects(
    () => client.getDelegatedToolCapabilities(),
    /invalid tool capability contract/
  );
});

test("treats a rejected delegated capability manifest as invalid authorization", async () => {
  const fakeFetch = (async () => new Response(null, { status: 401 })) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  assert.equal(await client.getDelegatedToolCapabilities(), undefined);
});

test("loads a delegated business snapshot without accepting tenant identifiers", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return jsonResponse(businessSnapshot(), 200);
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  const result = await client.getBusinessSnapshot({ period: "monthly", preferredCurrency: "cad" });

  assert.equal(result.summary.operatingProfit, 850);
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0]?.url,
    "http://127.0.0.1:8082/api/v1/ai/tools/business/snapshot?period=monthly&preferredCurrency=CAD"
  );
  assert.equal(
    new Headers(requests[0]?.init?.headers).get("Authorization"),
    "Bearer idx_ai_delegated-token-value-1234567890"
  );
});

test("rejects custom snapshot filters without both dates before calling Indice", async () => {
  let called = false;
  const fakeFetch = (async () => {
    called = true;
    return jsonResponse(businessSnapshot(), 200);
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  await assert.rejects(
    () => client.getBusinessSnapshot({ period: "custom", from: "2026-08-01" }),
    /requires from and to/
  );
  assert.equal(called, false);
});

test("previews and commits a task through delegated endpoints without mutable commit fields", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [jsonResponse(taskPreview(), 200), jsonResponse(createdTask(), 201)];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return responses.shift() as Response;
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"),
    authMode: "delegated",
    preferredCurrency: "MXN",
    timeoutMs: 5000,
    transport: "http",
    host: "127.0.0.1",
    port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  const preview = await client.previewCreateTask({
    title: "Revisar alertas MCP",
    priority: "high",
    dueDate: "2026-09-01"
  });
  const created = await client.createTask({
    confirmationToken: preview.confirmationToken,
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
  });

  assert.equal(created.task.id, 701);
  assert.equal(requests[0]?.url, "http://127.0.0.1:8082/api/v1/ai/tools/tasks/preview");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    title: "Revisar alertas MCP",
    priority: "high",
    dueDate: "2026-09-01"
  });
  assert.equal(requests[1]?.url, "http://127.0.0.1:8082/api/v1/ai/tools/tasks/commit");
  assert.deepEqual(JSON.parse(String(requests[1]?.init?.body)), {
    confirmationToken: preview.confirmationToken,
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
  });
  assert.equal(new Headers(requests[1]?.init?.headers).get("Authorization"),
    "Bearer idx_ai_delegated-token-value-1234567890");
});

test("uses delegated query and immutable finance action endpoints", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const confirmationToken = "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890FINANCE";
  const responses = [
    jsonResponse({
      tool: "list_expenses", generatedAt: "2026-08-31T18:00:00Z", scope: "Gastos autorizados",
      count: 1, summary: { matches: 1 }, items: [{ id: 9, status: "DRAFT" }]
    }, 200),
    jsonResponse({
      confirmationToken, expiresAt: "2026-08-31T18:05:00Z", requiresConfirmation: true,
      action: "create_expense_draft", preview: { concept: "Internet", totalAmount: 120, mode: "DRAFT_ONLY" }
    }, 200),
    jsonResponse({
      replayed: false, correlationId: "550e8400-e29b-41d4-a716-446655440000",
      action: "create_expense_draft", result: { id: 9, status: "DRAFT" }
    }, 201)
  ];
  const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: input.toString(), ...(init ? { init } : {}) });
    return responses.shift() as Response;
  }) as typeof fetch;
  const delegatedConfig: IndiceMcpConfig = {
    ...oauthConfig,
    backendUrl: new URL("http://127.0.0.1:8082"), authMode: "delegated", preferredCurrency: "MXN",
    timeoutMs: 5000, transport: "http", host: "127.0.0.1", port: 3010
  };
  const client = new IndiceClient(delegatedConfig, fakeFetch, "idx_ai_delegated-token-value-1234567890");

  await client.queryBusiness("list_expenses", { status: "DRAFT" });
  const preview = await client.previewFinanceAction("create_expense_draft", {
    concept: "Internet", totalAmount: 120, currencyCode: "MXN", expenseDate: "2026-08-31"
  });
  await client.commitFinanceAction("create_expense_draft", {
    confirmationToken: preview.confirmationToken,
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
  });

  assert.match(requests[0]?.url ?? "", /\/api\/v1\/ai\/tools\/query\/list_expenses$/);
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), { status: "DRAFT" });
  assert.match(requests[1]?.url ?? "", /\/finance\/actions\/create_expense_draft\/preview$/);
  assert.match(requests[2]?.url ?? "", /\/finance\/actions\/create_expense_draft\/commit$/);
  assert.deepEqual(JSON.parse(String(requests[2]?.init?.body)), {
    confirmationToken,
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
  });
});

function jsonResponse(body: unknown, status: number, setCookie?: string): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (setCookie) {
    headers.append("Set-Cookie", setCookie);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function summary() {
  return {
    date: "2026-08-31",
    timezone: "America/Toronto",
    saleCount: 2,
    monetaryTotal: {
      preferredCurrency: "CAD",
      preferredTotal: 120.5,
      nativeTotals: [{ currency: "CAD", amount: 120.5 }],
      exchangeRate: { mode: "daily", effectiveDate: "2026-08-31", source: "Official" },
      partial: false,
      excludedRecords: 0,
      excludedCurrencies: []
    }
  };
}

function businessSnapshot() {
  return {
    range: { from: "2026-08-01", to: "2026-08-31", period: "monthly" },
    context: {
      currency: "CAD",
      generatedAt: "2026-08-31T18:00:00Z",
      scopeLabel: "Empresa completa"
    },
    summary: {
      salesTotal: 1250,
      collectedTotal: 900,
      expensesTotal: 400,
      payablesTotal: 100,
      receivablesTotal: 350,
      overdueReceivables: 50,
      pettyCashBalance: 80,
      operatingProfit: 850,
      operatingMargin: 68,
      totalTasks: 12,
      overdueTasks: 2,
      absences: 1,
      attendanceRate: 95,
      organizationRows: 2,
      executiveScore: 81
    },
    alerts: [{
      status: "watch",
      title: "Cartera vencida",
      description: "Hay saldo vencido que requiere cobranza activa."
    }]
  };
}

function taskPreview() {
  return {
    confirmationToken: "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
    expiresAt: "2026-08-31T18:05:00Z",
    requiresConfirmation: true,
    task: {
      title: "Revisar alertas MCP",
      description: null,
      priority: "high",
      dueDate: "2026-09-01",
      assignee: "Usuario conectado"
    }
  };
}

function createdTask() {
  return {
    replayed: false,
    correlationId: "550e8400-e29b-41d4-a716-446655440000",
    task: {
      id: 701,
      folio: "T-701",
      title: "Revisar alertas MCP",
      status: "pending",
      dueDate: "2026-09-01"
    }
  };
}
