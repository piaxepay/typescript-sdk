import { PiaxisApiError } from "./errors";
import type { PiaxisClientOptions, PiaxisRequestOptions } from "./types";

interface RequestConfig extends PiaxisRequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
}

interface HttpClientOptions extends PiaxisClientOptions {
  baseUrl: string;
}

const MONEY_MOVING_POST_PATHS = new Set([
  "/payments/create",
  "/escrows/",
  "/disbursements",
  "/escrow-disbursements",
]);

export class PiaxisHttpClient {
  private readonly baseUrl: string;
  private readonly options: HttpClientOptions;
  private readonly errorReportingEndpoint: string;

  constructor(options: HttpClientOptions) {
    if (!options.fetch && typeof globalThis.fetch !== "function") {
      throw new Error("No fetch implementation available.");
    }

    this.baseUrl = validateBaseUrl(options.baseUrl);
    this.options = options;
    this.errorReportingEndpoint =
      options.errorReporting?.endpoint ?? defaultErrorReportingEndpoint(this.baseUrl);
  }

  get<T>(
    path: string,
    query?: Record<string, unknown>,
    requestOptions?: PiaxisRequestOptions
  ): Promise<T> {
    return this.request<T>("GET", path, { query, ...requestOptions });
  }

  post<T>(
    path: string,
    body?: unknown,
    requestOptions?: PiaxisRequestOptions,
    query?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("POST", path, { query, body, ...requestOptions });
  }

  postForm<T>(
    path: string,
    form: Record<string, unknown>,
    requestOptions?: PiaxisRequestOptions,
    query?: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>("POST", path, {
      query,
      body: form,
      headers: {
        ...requestOptions?.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: requestOptions?.signal,
    });
  }

  async request<T>(
    method: string,
    path: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const fetchImpl = this.options.fetch ?? globalThis.fetch;
    const headers = new Headers({
      Accept: "application/json",
      ...config.headers,
    });

    if (this.options.apiKey) {
      headers.set("api-key", this.options.apiKey);
    }

    if (this.options.accessToken) {
      const token = this.options.accessToken.startsWith("Bearer ")
        ? this.options.accessToken
        : `Bearer ${this.options.accessToken}`;
      headers.set("Authorization", token);
    }

    if (this.options.piaxisClientId) {
      headers.set("X-piaxis-Client-ID", this.options.piaxisClientId);
    }

    const appInfo = this.options.appInfo;
    if (appInfo?.name) {
      const versionSuffix = appInfo.version ? `/${appInfo.version}` : "";
      headers.set("x-piaxis-sdk-client", `${appInfo.name}${versionSuffix}`);
    }

    if (requiresIdempotencyKey(method, path) && !headers.has("X-Idempotency-Key")) {
      headers.set("X-Idempotency-Key", generateIdempotencyKey());
    }

    let body: string | undefined;
    if (config.body !== undefined) {
      if (headers.get("Content-Type") === "application/x-www-form-urlencoded") {
        const formBody = new URLSearchParams();
        for (const [key, value] of Object.entries((config.body ?? {}) as Record<string, unknown>)) {
          if (value === undefined || value === null) continue;
          formBody.set(key, String(value));
        }
        body = formBody.toString();
      } else {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(config.body);
      }
    }

    const requestUrl = this.buildUrl(path, config.query);
    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const abortFromCaller = () => controller.abort(config.signal?.reason);
    if (config.signal?.aborted) abortFromCaller();
    else config.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(requestUrl, {
        method,
        headers,
        body,
        signal: controller.signal,
        // Fetch preserves custom API-key headers across redirects.
        redirect: "error",
      });

      const raw = await response.text();
      const payload = raw ? this.parseBody(raw) : undefined;

      if (!response.ok) {
        throw PiaxisApiError.fromResponse(
          response.status,
          payload,
          response.headers.get("x-request-id")
        );
      }

      return payload as T;
    } catch (error) {
      if ((error as Error).name === "AbortError" && !config.signal?.aborted) {
        const timeoutError = new Error(`Piaxis request timed out after ${timeoutMs}ms`);
        this.reportSdkError(timeoutError, { method, path });
        throw timeoutError;
      }
      this.reportSdkError(error, { method, path });
      throw error;
    } finally {
      clearTimeout(timeoutId);
      config.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  buildUrl(path: string, query?: Record<string, unknown>): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (!query) {
      return url.toString();
    }

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    return url.toString();
  }

  private parseBody(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private reportSdkError(
    error: unknown,
    context: { method: string; path: string }
  ): void {
    const reporting = this.options.errorReporting;
    if (!reporting?.enabled) {
      return;
    }

    const fetchImpl = this.options.fetch ?? globalThis.fetch;
    const parsed = normalizeError(error);
    const status = error instanceof PiaxisApiError ? error.status : undefined;
    const severity = status && status < 500 ? "warning" : "error";
    const appInfo = this.options.appInfo;
    const clientName = appInfo?.name
      ? `${appInfo.name}${appInfo.version ? `/${appInfo.version}` : ""}`
      : "piaxis-typescript-sdk";

    void fetchImpl(this.errorReportingEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "typescript_sdk",
        severity,
        name: truncate(parsed.name, 255),
        message: truncate(parsed.message, 4000),
        stack: reporting.includeStack ? truncate(parsed.stack, 20000) : undefined,
        path: truncate(context.path, 512),
        platform: "typescript",
        user_agent: clientName,
        metadata: {
          ...(reporting.metadata ?? {}),
          method: context.method,
          status,
          code: error instanceof PiaxisApiError ? error.code : undefined,
          request_id: error instanceof PiaxisApiError ? error.requestId : undefined,
        },
      }),
    }).catch(() => undefined);
  }
}

function requiresIdempotencyKey(method: string, path: string): boolean {
  if (method.toUpperCase() !== "POST") return false;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (MONEY_MOVING_POST_PATHS.has(normalizedPath)) return true;

  const parts = normalizedPath.split("/").filter(Boolean);
  if (parts.length === 3 && parts[0] === "disbursements" && parts[2] === "cancel") {
    return true;
  }
  if (parts.length === 3 && parts[0] === "escrows" && ["release", "reverse"].includes(parts[2])) {
    return true;
  }
  if (
    parts.length === 5 &&
    parts[0] === "escrows" &&
    parts[2] === "terms" &&
    parts[4] === "fulfill"
  ) {
    return true;
  }
  if (
    parts.length === 3 &&
    parts[0] === "escrow-disbursements" &&
    ["release", "cancel"].includes(parts[2])
  ) {
    return true;
  }
  return false;
}

function generateIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

function normalizeError(error: unknown): {
  name?: string;
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || String(error),
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) || "Unknown SDK error" };
  } catch {
    return { message: String(error) || "Unknown SDK error" };
  }
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function defaultErrorReportingEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.pathname.endsWith("/api")) {
    url.pathname = `${url.pathname.slice(0, -4)}/monitoring/client-errors`;
  } else {
    url.pathname = "/monitoring/client-errors";
  }
  url.search = "";
  url.hash = "";
  return url.toString();
}

function validateBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol === "https:") {
    return normalized;
  }

  const localhostHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  if (url.protocol === "http:" && localhostHosts.has(url.hostname)) {
    return normalized;
  }

  throw new Error("PiaxisClient baseUrl must use HTTPS unless targeting localhost.");
}
