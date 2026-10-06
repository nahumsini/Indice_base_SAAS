import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { createIndiceHttpApp } from "../httpApp.js";
import { loadConfig } from "../config.js";

const require = createRequire(import.meta.url);
const proxyAddress = require("proxy-addr");

test("patched proxy trust cannot admit an internet peer through a short mapped IPv6 prefix", () => {
  assert.equal(require("proxy-addr/package.json").version, "2.0.8");
  const trust = proxyAddress.compile("::ffff:10.0.0.0/8");
  const request = { socket: { remoteAddress: "203.0.113.9" }, headers: { "x-forwarded-for": "10.1.2.3" } };
  assert.equal(proxyAddress(request, trust), "203.0.113.9");
  const plainIpv4 = proxyAddress.compile("10.0.0.0/8");
  assert.equal(plainIpv4("10.1.2.3", 0), true);
  assert.equal(plainIpv4("203.0.113.9", 0), false);
});

test("Indice MCP does not enable Express forwarded-IP trust", () => {
  const config = loadConfig({ INDICE_BACKEND_URL: "http://127.0.0.1:8082", INDICE_MCP_TRANSPORT: "http",
    INDICE_OAUTH_ISSUER: "https://app.indiceapp.com", INDICE_MCP_RESOURCE: "https://app.indiceapp.com/api/v1/ai/mcp",
    INDICE_OAUTH_RESOURCE_METADATA_URL: "https://app.indiceapp.com/.well-known/oauth-protected-resource" });
  const app = createIndiceHttpApp(config, { log: () => {} });
  assert.equal(app.get("trust proxy"), false);
});
