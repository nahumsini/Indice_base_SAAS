import { setTimeout as delay } from "node:timers/promises";
import type { IndiceMcpConfig } from "./config.js";
import { isRetryableRead } from "./toolPolicy.js";

export interface BackendAttempt {
  event: "mcp_backend_request";
  requestId?: string;
  operation: "capabilities" | "read" | "mutation";
  attempt: number;
  durationMs: number;
  status?: number;
  outcome: "response" | "timeout" | "unavailable" | "cancelled";
}
export interface RequestContext {
  requestId?: string;
  signal?: AbortSignal;
  observe?: (event: BackendAttempt) => void;
}

/** Retry only explicit reads. Never replay a preview, commit, login, or token exchange. */
export async function backendRequest(config: IndiceMcpConfig, fetcher: typeof fetch, path: string,
    init: RequestInit, context: RequestContext): Promise<Response> {
  const retryable = config.authMode === "delegated" && isRetryableRead(path, init.method ?? "GET");
  const attempts = retryable ? (config.readAttempts ?? 2) : 1;
  const operation = path === "/api/v1/ai/access/capabilities" ? "capabilities" : retryable ? "read" : "mutation";
  for (let attempt = 1; ; attempt++) {
    context.signal?.throwIfAborted();
    const started = performance.now();
    const timeout = AbortSignal.timeout(config.timeoutMs);
    const signal = context.signal ? AbortSignal.any([timeout, context.signal]) : timeout;
    let pause = config.retryDelayMs ?? 150;
    try {
      const headers = new Headers(init.headers);
      if (context.requestId) headers.set("X-Request-ID", context.requestId);
      const response = await fetcher(new URL(path, config.backendUrl), { ...init, headers, redirect: "error", signal });
      // Consume successful bodies inside the deadline. Error bodies are never needed or exposed;
      // discard them so a broken 401/403 body cannot turn an auth failure into a network retry.
      const body = response.ok ? await response.arrayBuffer() : null;
      if (!response.ok) void response.body?.cancel().catch(() => {});
      context.observe?.({ event: "mcp_backend_request", requestId: context.requestId, operation, attempt,
        durationMs: Math.round(performance.now() - started), status: response.status, outcome: "response" });
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        pause = Math.max(pause, Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now());
      }
      if (attempt >= attempts || ![429, 502, 503, 504].includes(response.status)
          || !Number.isFinite(pause) || pause > 1000) {
        return new Response([204, 205, 304].includes(response.status) ? null : body,
          { status: response.status, statusText: response.statusText, headers: response.headers });
      }
    } catch (error) {
      const cancelled = context.signal?.aborted;
      context.observe?.({ event: "mcp_backend_request", requestId: context.requestId, operation, attempt,
        durationMs: Math.round(performance.now() - started),
        outcome: cancelled ? "cancelled" : timeout.aborted ? "timeout" : "unavailable" });
      if (cancelled || attempt >= attempts) throw error;
    }
    await delay(Math.max(0, pause), undefined, { signal: context.signal });
  }
}
