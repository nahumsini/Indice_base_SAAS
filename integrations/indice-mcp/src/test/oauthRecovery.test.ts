import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";
import { httpFixture, json, queryResult } from "./httpFixture.js";

test("SDK client refreshes expired access through HTTP OAuth discovery and keeps the same MCP conversation", async () => {
  let resource = "";
  let issuer = "";
  let validAccess = "synthetic-access-1";
  let refreshes = 0;
  let badRefresh = false;
  const oauth = createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/metadata") {
      response.end(JSON.stringify({ resource, authorization_servers: [issuer], scopes_supported: ["tasks.read"] }));
    } else if (request.url === "/.well-known/oauth-authorization-server") {
      response.end(JSON.stringify({ issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`,
        response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"] }));
    } else if (request.url === "/token" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += String(chunk);
      const form = new URLSearchParams(body);
      badRefresh ||= form.get("grant_type") !== "refresh_token" || form.get("resource") !== resource
        || form.get("client_id") !== "synthetic-client";
      refreshes++;
      response.end(JSON.stringify({ access_token: validAccess, token_type: "Bearer", expires_in: 3600,
        refresh_token: `synthetic-refresh-${refreshes}`, scope: "tasks.read" }));
    } else { response.writeHead(404).end("{}"); }
  }).listen(0, "127.0.0.1");
  await once(oauth, "listening");
  const address = oauth.address();
  assert.ok(address && typeof address !== "string");
  issuer = `http://127.0.0.1:${address.port}`;
  const fixture = await httpFixture((async (input, init) => {
    if (new Headers(init?.headers).get("Authorization") !== `Bearer ${validAccess}`) return json({}, 401);
    return String(input).endsWith("/capabilities") ? json({ version: "v1", tools: ["list_tasks"] })
      : json(queryResult("list_tasks"));
  }) as typeof fetch, { oauthIssuer: new URL(issuer), oauthResourceMetadataUrl: new URL(`${issuer}/metadata`) });
  resource = fixture.url.toString();
  fixture.config.resourceUrl = fixture.url;
  let tokens: OAuthTokens = { access_token: "synthetic-expired", token_type: "Bearer", refresh_token: "synthetic-refresh-0" };
  const provider: OAuthClientProvider = {
    redirectUrl: `${issuer}/callback`,
    clientMetadata: { redirect_uris: [`${issuer}/callback`], token_endpoint_auth_method: "none" },
    clientInformation: () => ({ client_id: "synthetic-client" }),
    tokens: () => tokens,
    saveTokens: replacement => { tokens = replacement; },
    redirectToAuthorization: () => { throw new Error("Unexpected interactive authorization"); },
    saveCodeVerifier: () => {}, codeVerifier: () => "synthetic-verifier"
  };
  const client = new Client({ name: "synthetic-oauth-continuity", version: "1" });
  try {
    await client.connect(new StreamableHTTPClientTransport(fixture.url, { authProvider: provider }));
    assert.equal(refreshes, 1);
    assert.equal((await client.listTools()).tools.length, 1);
    assert.equal((await client.callTool({ name: "list_tasks", arguments: {} })).isError, undefined);
    validAccess = "synthetic-access-2";
    assert.equal((await client.listTools()).tools.length, 1);
    assert.equal(refreshes, 2);
    assert.equal((await client.callTool({ name: "list_tasks", arguments: {} })).isError, undefined);
    assert.equal(badRefresh, false);
    assert.doesNotMatch(JSON.stringify(fixture.events), /synthetic-access|synthetic-refresh|synthetic-expired/);
  } finally {
    await client.close();
    await fixture.close();
    oauth.closeAllConnections();
    await new Promise<void>((resolve, reject) => oauth.close(error => error ? reject(error) : resolve()));
  }
});
