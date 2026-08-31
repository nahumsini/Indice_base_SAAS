import type { IndiceMcpConfig } from "./config.js";
import { salesTodaySummarySchema, type SalesTodaySummary } from "./contracts.js";

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
    private readonly fetchImplementation: typeof fetch = fetch
  ) {
  }

  async getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary> {
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
        companyName: this.config.companyName,
        email: this.config.email,
        password: this.config.password
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
