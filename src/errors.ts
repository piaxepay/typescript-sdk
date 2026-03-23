export class PiaxisApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string | null;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      requestId?: string | null;
    }
  ) {
    super(message);
    this.name = "PiaxisApiError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
  }

  static fromResponse(
    status: number,
    payload: unknown,
    requestId?: string | null
  ): PiaxisApiError {
    const detail =
      payload &&
      typeof payload === "object" &&
      "detail" in payload &&
      (payload as { detail?: unknown }).detail !== undefined
        ? (payload as { detail?: unknown }).detail
        : payload;

    if (typeof detail === "string") {
      return new PiaxisApiError(detail, { status, details: payload, requestId });
    }

    if (detail && typeof detail === "object") {
      const structured = detail as {
        code?: unknown;
        message?: unknown;
      };

      return new PiaxisApiError(
        typeof structured.message === "string"
          ? structured.message
          : `Request failed with status ${status}`,
        {
          status,
          code: typeof structured.code === "string" ? structured.code : undefined,
          details: payload,
          requestId,
        }
      );
    }

    return new PiaxisApiError(`Request failed with status ${status}`, {
      status,
      details: payload,
      requestId,
    });
  }
}
