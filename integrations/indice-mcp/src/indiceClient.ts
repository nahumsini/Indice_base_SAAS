import type { IndiceMcpConfig } from "./config.js";
import {
  businessSnapshotQuerySchema,
  businessSnapshotSchema,
  salesTodaySummarySchema,
  taskCommitRequestSchema,
  taskCommitResponseSchema,
  taskPreviewRequestSchema,
  taskPreviewResponseSchema,
  type BusinessSnapshot,
  type BusinessSnapshotQuery,
  type SalesTodaySummary,
  type TaskCommitRequest,
  type TaskCommitResponse,
  type TaskPreviewRequest,
  type TaskPreviewResponse
} from "./contracts.js";

export class IndiceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "IndiceApiError";
  }
}

export class IndiceClient {
  private readonly cookies = new Map<string, string>();
  private authenticated = false;
  private authenticationPromise?: Promise<void>;

  constructor(
    private readonly config: IndiceMcpConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly delegatedAccessToken: string | undefined = config.accessToken
  ) {
  }

  async getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary> {
    if (this.config.authMode === "delegated") {
      return this.getDelegatedSalesToday(preferredCurrency);
    }
    await this.ensureAuthenticated();
    const currency = normalizeCurrency(preferredCurrency ?? this.config.preferredCurrency);
    let response = await this.request(
      `/api/v1/sales/kpis/today?preferredCurrency=${encodeURIComponent(currency)}`,
      { method: "GET" }
    );

    if (response.status === 401) {
      this.authenticated = false;
      await this.ensureAuthenticated();
      response = await this.request(
        `/api/v1/sales/kpis/today?preferredCurrency=${encodeURIComponent(currency)}`,
        { method: "GET" }
      );
    }

    if (!response.ok) {
      throw await this.apiError(response, "Unable to load today's sales from Indice.");
    }

    const payload: unknown = await response.json();
    const parsed = salesTodaySummarySchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid sales summary contract.");
    }
    return parsed.data;
  }

  async getBusinessSnapshot(query: BusinessSnapshotQuery = {}): Promise<BusinessSnapshot> {
    const normalized = normalizeBusinessSnapshotQuery(query, this.config.preferredCurrency);
    if (this.config.authMode === "delegated") {
      return this.getDelegatedBusinessSnapshot(normalized);
    }
    await this.ensureAuthenticated();
    let response = await this.request(businessSnapshotPath("/api/v1/kpis/executive-panel", normalized), {
      method: "GET"
    });
    if (response.status === 401) {
      this.authenticated = false;
      await this.ensureAuthenticated();
      response = await this.request(businessSnapshotPath("/api/v1/kpis/executive-panel", normalized), {
        method: "GET"
      });
    }
    return this.parseBusinessSnapshot(response);
  }

  async previewCreateTask(request: TaskPreviewRequest): Promise<TaskPreviewResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = taskPreviewRequestSchema.safeParse(request);
    if (!normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid task details.");
    }
    const response = await this.request("/api/v1/ai/tools/tasks/preview", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(normalized.data)
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow task creation."
        : "Indice could not prepare the task.");
    }
    const payload: unknown = await response.json();
    const parsed = taskPreviewResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid task preview contract.");
    }
    return parsed.data;
  }

  async createTask(request: TaskCommitRequest): Promise<TaskCommitResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = taskCommitRequestSchema.safeParse(request);
    if (!normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid task confirmation.");
    }
    const response = await this.request("/api/v1/ai/tools/tasks/commit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(normalized.data)
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow task creation."
        : response.status === 409
          ? "The task confirmation expired, was already used, or conflicts with another request. Prepare it again."
          : "Indice could not create the confirmed task.");
    }
    const payload: unknown = await response.json();
    const parsed = taskCommitResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid created task contract.");
    }
    return parsed.data;
  }

  async hasValidDelegatedAccess(): Promise<boolean> {
    if (this.config.authMode !== "delegated" || !this.delegatedAccessToken) {
      return false;
    }
    const response = await this.request("/api/v1/ai/access/verify", {
      method: "GET",
      headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
    });
    if (response.status === 401) {
      return false;
    }
    if (!response.ok) {
      throw await this.apiError(response, "Indice could not verify delegated authorization.");
    }
    return true;
  }

  private async getDelegatedSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary> {
    if (!this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required.", 401);
    }
    const currency = normalizeCurrency(preferredCurrency ?? this.config.preferredCurrency);
    const response = await this.request(
      `/api/v1/ai/tools/sales/today?preferredCurrency=${encodeURIComponent(currency)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
      }
    );
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow today's sales tool."
        : "Indice delegated authorization failed.");
    }

    const payload: unknown = await response.json();
    const parsed = salesTodaySummarySchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid sales summary contract.");
    }
    return parsed.data;
  }

  private requireDelegatedToken(): string {
    if (this.config.authMode !== "delegated" || !this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required for actions.", 401);
    }
    return this.delegatedAccessToken;
  }

  private async getDelegatedBusinessSnapshot(query: BusinessSnapshotQuery): Promise<BusinessSnapshot> {
    if (!this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required.", 401);
    }
    const response = await this.request(
      businessSnapshotPath("/api/v1/ai/tools/business/snapshot", query),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
      }
    );
    return this.parseBusinessSnapshot(response);
  }

  private async parseBusinessSnapshot(response: Response): Promise<BusinessSnapshot> {
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow the business snapshot tool."
        : "Indice could not load the business snapshot.");
    }
    const payload: unknown = await response.json();
    const parsed = businessSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid business snapshot contract.");
    }
    return parsed.data;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authenticated) {
      return;
    }

    if (!this.authenticationPromise) {
      this.authenticationPromise = this.authenticate().finally(() => {
        this.authenticationPromise = undefined;
      });
    }
    await this.authenticationPromise;
  }

  private async authenticate(): Promise<void> {
    this.cookies.clear();
    const csrfResponse = await this.request("/api/v1/auth/csrf", { method: "GET" });
    if (!csrfResponse.ok) {
      throw await this.apiError(csrfResponse, "Unable to initialize the Indice session.");
    }
    const csrfPayload = await csrfResponse.json() as { csrfToken?: unknown };
    if (typeof csrfPayload.csrfToken !== "string" || !csrfPayload.csrfToken) {
      throw new IndiceApiError("Indice did not return a CSRF token.");
    }

    const loginResponse = await this.request("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfPayload.csrfToken
      },
      body: JSON.stringify({
        companyName: requiredSessionValue(this.config.companyName, "company name"),
        email: requiredSessionValue(this.config.email, "email"),
        password: requiredSessionValue(this.config.password, "password")
      })
    });
    if (!loginResponse.ok) {
      throw await this.apiError(loginResponse, "Indice authentication failed.");
    }
    this.authenticated = true;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(new URL(path, this.config.backendUrl), {
        ...init,
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });
    } catch (error) {
      const message = error instanceof Error && error.name === "TimeoutError"
        ? "Indice did not respond before the timeout."
        : "Indice is unavailable.";
      throw new IndiceApiError(message);
    }
    this.captureCookies(response.headers);
    return response;
  }

  private captureCookies(headers: Headers): void {
    const values = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie") ? [headers.get("set-cookie") as string] : [];
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const separator = pair?.indexOf("=") ?? -1;
      if (!pair || separator <= 0) {
        continue;
      }
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  private async apiError(response: Response, fallback: string): Promise<IndiceApiError> {
    return new IndiceApiError(fallback, response.status);
  }
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new IndiceApiError("preferred_currency must use a three-letter ISO code.");
  }
  return normalized;
}

function normalizeBusinessSnapshotQuery(
  query: BusinessSnapshotQuery,
  defaultCurrency: string
): BusinessSnapshotQuery {
  const candidate = {
    ...query,
    preferredCurrency: normalizeCurrency(query.preferredCurrency ?? defaultCurrency)
  };
  const parsed = businessSnapshotQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    throw new IndiceApiError(parsed.error.issues[0]?.message ?? "Invalid business snapshot filters.");
  }
  return parsed.data;
}

function businessSnapshotPath(path: string, query: BusinessSnapshotQuery): string {
  const params = new URLSearchParams();
  if (query.period) params.set("period", query.period);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.preferredCurrency) params.set("preferredCurrency", query.preferredCurrency);
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function requiredSessionValue(value: string | undefined, field: string): string {
  if (!value) {
    throw new IndiceApiError(`Indice session ${field} is required.`);
  }
  return value;
}
