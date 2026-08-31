export type McpTransport = "stdio" | "http";

export interface IndiceMcpConfig {
  backendUrl: URL;
  companyName: string;
  email: string;
  password: string;
  preferredCurrency: string;
  timeoutMs: number;
  transport: McpTransport;
  host: string;
  port: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): IndiceMcpConfig {
  const backendUrl = localBackendUrl(required(env, "INDICE_BACKEND_URL"));
  const transport = optional(env, "INDICE_MCP_TRANSPORT", "stdio");
  if (transport !== "stdio" && transport !== "http") {
    throw new Error("INDICE_MCP_TRANSPORT must be stdio or http.");
  }
  const host = localMcpHost(optional(env, "INDICE_MCP_HOST", "127.0.0.1"));

  return {
    backendUrl,
    companyName: required(env, "INDICE_COMPANY_NAME"),
    email: required(env, "INDICE_EMAIL"),
    password: required(env, "INDICE_PASSWORD"),
    preferredCurrency: currency(optional(env, "INDICE_PREFERRED_CURRENCY", "MXN")),
    timeoutMs: positiveInteger(optional(env, "INDICE_HTTP_TIMEOUT_MS", "5000"), "INDICE_HTTP_TIMEOUT_MS"),
    transport,
    host,
    port: positiveInteger(optional(env, "INDICE_MCP_PORT", "3010"), "INDICE_MCP_PORT")
  };
}

function localMcpHost(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(normalized)) {
    throw new Error("INDICE_MCP_HOST must bind to the local machine for the local MVP.");
  }
  return normalized;
}

function localBackendUrl(value: string): URL {
  const url = new URL(value);
  const allowedHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error("INDICE_BACKEND_URL must target the local machine for the local MVP.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INDICE_BACKEND_URL must use http or https.");
  }
  url.pathname = url.pathname.replace(/\/$/, "");
  return url;
}

function currency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error("INDICE_PREFERRED_CURRENCY must use a three-letter ISO code.");
  }
  return normalized;
}

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

function optional(env: NodeJS.ProcessEnv, key: string, fallback: string): string {
  return env[key]?.trim() || fallback;
}

function positiveInteger(value: string, key: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }
  return parsed;
}
