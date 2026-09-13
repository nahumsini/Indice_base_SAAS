import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createIndiceMcpServer } from "../mcpServer.js";

test("lists and executes get_sales_today through MCP", async () => {
  const server = createIndiceMcpServer({
    async getSalesToday(preferredCurrency) {
      assert.equal(preferredCurrency, "MXN");
      return summary();
    },
    async getBusinessSnapshot() {
      return businessSnapshot();
    },
    async previewCreateTask() {
      return taskPreview();
    },
    async createTask() {
      return createdTask();
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();
    const names = tools.tools.map(tool => tool.name);
    for (const expected of [
      "get_sales_today", "get_business_snapshot", "get_attention_items",
      "search_employees", "list_tasks", "get_sales_summary", "search_products",
      "get_inventory_summary", "get_expense_summary", "get_funds_status",
      "get_receivables_status", "get_my_business_context", "list_units_and_businesses",
      "list_payment_accounts", "list_funds", "preview_create_task", "create_task",
      "preview_create_expense_draft", "create_expense_draft",
      "preview_register_fund_expense", "register_fund_expense",
      "preview_add_money_to_fund", "add_money_to_fund"
    ]) {
      assert.ok(names.includes(expected), `${expected} should be registered`);
    }
    for (const tool of tools.tools) {
      assert.ok(tool.title, `${tool.name} should have a title`);
      assert.ok(tool.description, `${tool.name} should have a description`);
      assert.ok(tool.outputSchema, `${tool.name} should have an output schema`);
      assert.equal(typeof tool.annotations?.readOnlyHint, "boolean", `${tool.name} should declare readOnlyHint`);
      assert.equal(typeof tool.annotations?.destructiveHint, "boolean", `${tool.name} should declare destructiveHint`);
      assert.equal(typeof tool.annotations?.idempotentHint, "boolean", `${tool.name} should declare idempotentHint`);
      assert.equal(typeof tool.annotations?.openWorldHint, "boolean", `${tool.name} should declare openWorldHint`);
    }

    const toolByName = new Map(tools.tools.map(tool => [tool.name, tool]));
    assert.equal(toolByName.get("create_expense_draft")?.annotations?.destructiveHint, false);
    assert.equal(toolByName.get("register_fund_expense")?.annotations?.destructiveHint, true);
    assert.equal(toolByName.get("add_money_to_fund")?.annotations?.destructiveHint, true);

    const result = await client.callTool({
      name: "get_sales_today",
      arguments: { preferred_currency: "MXN" }
    });

    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, summary());
    assert.match(firstText(result.content), /2 ventas/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("resolves paged payment accounts without accepting tenant authority", async () => {
  let received: unknown;
  const page = {
    generatedAt: "2026-09-12T04:00:00Z",
    scopeType: "BUSINESS_OFFICE",
    items: [{
      id: 77,
      name: "Main bank",
      type: "BANK",
      currencyCode: "MXN",
      currentBalance: 1500,
      pendingBalance: 0,
      totalBalance: 1500,
      unitId: 10,
      businessId: 101,
      status: "ACTIVE",
      systemManaged: false
    }],
    returnedCount: 1,
    totalCount: 2,
    hasMore: true,
    nextCursor: "djE6MQ"
  };
  const server = createIndiceMcpServer({
    async getSalesToday() { return summary(); },
    async getBusinessSnapshot() { return businessSnapshot(); },
    async previewCreateTask() { return taskPreview(); },
    async createTask() { return createdTask(); },
    async listPaymentAccounts(request) {
      received = request;
      return page;
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "list_payment_accounts",
      arguments: { query: "bank", limit: 1, cursor: "djE6MA" }
    });

    assert.equal(result.isError, undefined);
    assert.deepEqual(received, { query: "bank", limit: 1, cursor: "djE6MA" });
    assert.deepEqual(result.structuredContent, page);
    assert.match(firstText(result.content), /1 de 2 cuentas de pago/);
    assert.match(firstText(result.content), /nextCursor/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("lists only tools allowed by the delegated capability manifest", async () => {
  const server = createIndiceMcpServer({
    async getSalesToday() { return summary(); },
    async getBusinessSnapshot() { return businessSnapshot(); },
    async previewCreateTask() { return taskPreview(); },
    async createTask() { return createdTask(); }
  }, new Set(["get_sales_today", "list_tasks"]));
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const tools = await client.listTools();

    assert.deepEqual(tools.tools.map(tool => tool.name), ["get_sales_today", "list_tasks"]);
    const hiddenToolResult = await client.callTool({ name: "create_task", arguments: {} });
    assert.equal(hiddenToolResult.isError, true);
    assert.match(firstText(hiddenToolResult.content), /Tool create_task disabled/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("returns prioritized attention items without exposing healthy noise", async () => {
  const server = createIndiceMcpServer({
    async getSalesToday() {
      return summary();
    },
    async getBusinessSnapshot(query) {
      assert.deepEqual(query, {
        period: "monthly",
        from: undefined,
        to: undefined,
        preferredCurrency: "MXN"
      });
      const snapshot = businessSnapshot();
      return {
        ...snapshot,
        alerts: [
          { status: "watch", title: "Tareas vencidas", description: "Hay compromisos fuera de tiempo." },
          { status: "healthy", title: "Lectura sana", description: "Sin riesgo." },
          { status: "critical", title: "Utilidad negativa", description: "Los gastos superan las ventas." }
        ]
      };
    },
    async previewCreateTask() {
      return taskPreview();
    },
    async createTask() {
      return createdTask();
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "get_attention_items",
      arguments: { period: "monthly", preferred_currency: "MXN" }
    });

    assert.equal(result.isError, undefined);
    const content = result.structuredContent as {
      overview: { criticalCount: number; watchCount: number; healthy: boolean };
      items: Array<{ status: string; title: string }>;
    };
    assert.deepEqual(content.overview, {
      executiveScore: 81,
      criticalCount: 1,
      watchCount: 1,
      healthy: false
    });
    assert.deepEqual(content.items.map(item => item.title), ["Utilidad negativa", "Tareas vencidas"]);
    assert.match(firstText(result.content), /Utilidad negativa/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("executes get_business_snapshot through MCP with safe business filters", async () => {
  const server = createIndiceMcpServer({
    async getSalesToday() {
      return summary();
    },
    async getBusinessSnapshot(query) {
      assert.deepEqual(query, {
        period: "custom",
        from: "2026-08-01",
        to: "2026-08-31",
        preferredCurrency: "CAD"
      });
      return businessSnapshot();
    },
    async previewCreateTask() {
      return taskPreview();
    },
    async createTask() {
      return createdTask();
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "get_business_snapshot",
      arguments: {
        period: "custom",
        from: "2026-08-01",
        to: "2026-08-31",
        preferred_currency: "CAD"
      }
    });

    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, businessSnapshot());
    assert.match(firstText(result.content), /ventas/);
    assert.match(firstText(result.content), /Cartera vencida/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("requires preview and passes only the confirmed token to task creation", async () => {
  let committed: unknown;
  const server = createIndiceMcpServer({
    async getSalesToday() {
      return summary();
    },
    async getBusinessSnapshot() {
      return businessSnapshot();
    },
    async previewCreateTask(request) {
      assert.deepEqual(request, {
        title: "Revisar alertas MCP",
        description: undefined,
        priority: "high",
        dueDate: "2026-09-01"
      });
      return taskPreview();
    },
    async createTask(request) {
      committed = request;
      return createdTask();
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const preview = await client.callTool({
      name: "preview_create_task",
      arguments: {
        title: "Revisar alertas MCP",
        priority: "high",
        due_date: "2026-09-01"
      }
    });
    assert.equal(preview.isError, undefined);
    assert.match(firstText(preview.content), /Confirma explícitamente/);

    const created = await client.callTool({
      name: "create_task",
      arguments: {
        confirmation_token: taskPreview().confirmationToken,
        idempotency_key: "550e8400-e29b-41d4-a716-446655440000"
      }
    });
    assert.equal(created.isError, undefined);
    assert.deepEqual(committed, {
      confirmationToken: taskPreview().confirmationToken,
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
    });
    assert.match(firstText(created.content), /Tarea creada/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("maps product filters to the delegated business query without tenant identifiers", async () => {
  let received: unknown;
  const server = createIndiceMcpServer({
    async getSalesToday() { return summary(); },
    async getBusinessSnapshot() { return businessSnapshot(); },
    async previewCreateTask() { return taskPreview(); },
    async createTask() { return createdTask(); },
    async queryBusiness(tool, args) {
      received = { tool, args };
      return {
        tool,
        generatedAt: "2026-08-31T18:00:00Z",
        scope: "Catálogo e inventario autorizados",
        count: 1,
        summary: { matches: 1 },
        items: [{ id: 7, sku: "SKU-7", name: "Café", price: 95 }]
      };
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: "search_products",
      arguments: { query: "café", limit: 10 }
    });
    assert.equal(result.isError, undefined);
    assert.deepEqual(received, { tool: "search_products", args: { query: "café", limit: 10 } });
    assert.match(firstText(result.content), /1 registros/);
  } finally {
    await client.close();
    await server.close();
  }
});

test("previews and commits an immutable draft expense action", async () => {
  let previewRequest: unknown;
  let commitRequest: unknown;
  const confirmationToken = "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890FINANCE";
  const server = createIndiceMcpServer({
    async getSalesToday() { return summary(); },
    async getBusinessSnapshot() { return businessSnapshot(); },
    async previewCreateTask() { return taskPreview(); },
    async createTask() { return createdTask(); },
    async previewFinanceAction(action, request) {
      previewRequest = { action, request };
      return {
        confirmationToken,
        expiresAt: "2026-08-31T18:05:00Z",
        requiresConfirmation: true,
        action,
        preview: { ...request, mode: "DRAFT_ONLY" }
      };
    },
    async commitFinanceAction(action, request) {
      commitRequest = { action, request };
      return {
        replayed: false,
        correlationId: "550e8400-e29b-41d4-a716-446655440000",
        action,
        result: { id: 88, folio: "EXP-88", status: "DRAFT" }
      };
    }
  });
  const client = new Client({ name: "indice-mcp-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const preview = await client.callTool({
      name: "preview_create_expense_draft",
      arguments: {
        concept: "Internet oficina",
        total_amount: 120,
        currency_code: "MXN",
        expense_date: "2026-08-31"
      }
    });
    assert.equal(preview.isError, undefined);
    assert.deepEqual(previewRequest, {
      action: "create_expense_draft",
      request: {
        concept: "Internet oficina",
        totalAmount: 120,
        currencyCode: "MXN",
        expenseDate: "2026-08-31"
      }
    });
    assert.match(firstText(preview.content), /Confirma explícitamente/);

    const committed = await client.callTool({
      name: "create_expense_draft",
      arguments: {
        confirmation_token: confirmationToken,
        idempotency_key: "550e8400-e29b-41d4-a716-446655440000"
      }
    });
    assert.equal(committed.isError, undefined);
    assert.deepEqual(commitRequest, {
      action: "create_expense_draft",
      request: {
        confirmationToken,
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000"
      }
    });
  } finally {
    await client.close();
    await server.close();
  }
});

function firstText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  const first: unknown = content[0];
  if (typeof first !== "object" || first === null || !("type" in first) || !("text" in first)) {
    return "";
  }
  return first.type === "text" && typeof first.text === "string" ? first.text : "";
}

function summary() {
  return {
    date: "2026-08-31",
    timezone: "America/Toronto",
    saleCount: 2,
    monetaryTotal: {
      preferredCurrency: "MXN",
      preferredTotal: 500,
      nativeTotals: [{ currency: "MXN", amount: 500 }],
      exchangeRate: { mode: "daily", effectiveDate: "2026-08-31", source: "Official" },
      partial: false,
      excludedRecords: 0,
      excludedCurrencies: []
    }
  };
}

function businessSnapshot() {
  return {
    range: { from: "2026-08-01", to: "2026-08-31", period: "custom" as const },
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
      status: "watch" as const,
      title: "Cartera vencida",
      description: "Hay saldo vencido que requiere cobranza activa."
    }]
  };
}

function taskPreview() {
  return {
    confirmationToken: "idx_confirm_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",
    expiresAt: "2026-08-31T18:05:00Z",
    requiresConfirmation: true as const,
    task: {
      title: "Revisar alertas MCP",
      description: null,
      priority: "high" as const,
      dueDate: "2026-09-01",
      assignee: "Usuario conectado" as const
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
