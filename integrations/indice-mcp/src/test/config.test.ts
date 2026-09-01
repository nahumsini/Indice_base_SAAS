import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../config.js";

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
