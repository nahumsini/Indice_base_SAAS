import assert from "node:assert/strict";
import test from "node:test";
import type { IndiceMcpConfig } from "../config.js";
import { IndiceClient } from "../indiceClient.js";

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
