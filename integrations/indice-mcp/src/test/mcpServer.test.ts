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
    assert.deepEqual(tools.tools.map(tool => tool.name), [
      "get_sales_today",
      "get_business_snapshot",
      "get_attention_items",
      "preview_create_task",
      "create_task"
    ]);
    assert.equal(tools.tools[0]?.annotations?.readOnlyHint, true);

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
