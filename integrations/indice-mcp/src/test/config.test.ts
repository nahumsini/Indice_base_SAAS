import assert from "node:assert/strict";
import test from "node:test";
import { allowedMcpHosts, loadConfig } from "../config.js";

const baseEnvironment: NodeJS.ProcessEnv = {
  INDICE_BACKEND_URL: "http://127.0.0.1:8082",
  INDICE_COMPANY_NAME: "Demo Company",
  INDICE_EMAIL: "demo@example.com",
  INDICE_PASSWORD: "local-password"
};

test("loads a loopback-only local configuration", () => {
  const config = loadConfig(baseEnvironment);

  assert.equal(config.backendUrl.toString(), "http://127.0.0.1:8082/");
  assert.equal(config.preferredCurrency, "MXN");
  assert.equal(config.authMode, "session");
  assert.equal(config.transport, "stdio");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.oauthIssuer.toString(), "http://localhost:8080/");
  assert.equal(config.resourceUrl.toString(), "http://localhost:3010/mcp");
});

test("defaults HTTP transport to delegated authorization without local credentials", () => {
  const config = loadConfig({
    INDICE_BACKEND_URL: "http://127.0.0.1:8082",
    INDICE_MCP_TRANSPORT: "http"
  });

  assert.equal(config.authMode, "delegated");
  assert.equal(config.companyName, undefined);
  assert.equal(config.password, undefined);
});

test("loads the production OAuth resource identity independently from the private listener", () => {
  const config = loadConfig({
    INDICE_BACKEND_URL: "http://127.0.0.1:8083",
    INDICE_MCP_TRANSPORT: "http",
    INDICE_OAUTH_ISSUER: "https://app.indiceapp.com",
    INDICE_OAUTH_RESOURCE_METADATA_URL: "https://app.indiceapp.com/.well-known/oauth-protected-resource",
    INDICE_MCP_RESOURCE: "https://app.indiceapp.com/api/v1/ai/mcp"
  });

  assert.equal(config.oauthIssuer.toString(), "https://app.indiceapp.com/");
  assert.equal(config.oauthResourceMetadataUrl.toString(), "https://app.indiceapp.com/.well-known/oauth-protected-resource");
  assert.equal(config.resourceUrl.toString(), "https://app.indiceapp.com/api/v1/ai/mcp");
  assert.deepEqual(
    allowedMcpHosts(config.host, config.resourceUrl),
    ["127.0.0.1", "app.indiceapp.com"]
  );
});

test("rejects shared password sessions over HTTP", () => {
  assert.throws(
    () => loadConfig({
      ...baseEnvironment,
      INDICE_MCP_TRANSPORT: "http",
      INDICE_MCP_AUTH_MODE: "session"
    }),
    /requires delegated authorization/
  );
});

test("rejects a remote backend in the local MVP", () => {
  assert.throws(
    () => loadConfig({ ...baseEnvironment, INDICE_BACKEND_URL: "https://indice.example.com" }),
    /local machine/
  );
});

test("rejects binding the local MCP server to all interfaces", () => {
  assert.throws(
    () => loadConfig({ ...baseEnvironment, INDICE_MCP_HOST: "0.0.0.0" }),
    /local machine/
  );
});

test("bounds recovery configuration and allows disabling retries", () => {
  const defaults = loadConfig(baseEnvironment);
  assert.equal(defaults.readAttempts, 2);
  assert.equal(defaults.retryDelayMs, 150);
  assert.equal(defaults.timeoutMs, 5000);
  assert.equal(loadConfig({ ...baseEnvironment, INDICE_READ_ATTEMPTS: "1" }).readAttempts, 1);
  for (const [key, values] of Object.entries({
    INDICE_READ_ATTEMPTS: ["0", "4", "1.5", "invalid"],
    INDICE_RETRY_DELAY_MS: ["-1", "1001", "Infinity"],
    INDICE_HTTP_TIMEOUT_MS: ["0", "30001", "1.5"]
  })) for (const value of values) {
    assert.throws(() => loadConfig({ ...baseEnvironment, [key]: value }), new RegExp(key));
  }
});
