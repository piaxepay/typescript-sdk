import { PiaxisApiError } from "./errors";
import type { PiaxisClientOptions, PiaxisRequestOptions } from "./types";

interface RequestConfig extends PiaxisRequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
}

interface HttpClientOptions extends PiaxisClientOptions {
  baseUrl: string;
}

export class PiaxisHttpClient {
  private readonly baseUrl: string;
  private readonly options: HttpClientOptions;

  constructor(options: HttpClientOptions) {
    if (!options.fetch && typeof globalThis.fetch !== "function") {
      throw new Error("No fetch implementation available.");
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.options = options;
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

    const appInfo = this.options.appInfo;
    if (appInfo?.name) {
      const versionSuffix = appInfo.version ? `/${appInfo.version}` : "";
      headers.set("x-piaxis-sdk-client", `${appInfo.name}${versionSuffix}`);
    }

    let body: string | undefined;
    if (config.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(config.body);
    }

    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? 30_000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(this.buildUrl(path, config.query), {
        method,
        headers,
        body,
        signal: config.signal ?? controller.signal,
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
      if ((error as Error).name === "AbortError") {
        throw new Error(`Piaxis request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
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
}
