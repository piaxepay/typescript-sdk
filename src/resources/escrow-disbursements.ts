import { PiaxisHttpClient } from "../http-client";
import {
  asObject,
  jsonObjectArray,
  optionalString,
  serializeTerm,
  serializeUserLocation,
  stringValue,
} from "../transforms";
import type {
  CancelledEscrowDisbursementResponse,
  CancelDisbursementInput,
  EscrowDisbursementCreateInput,
  EscrowDisbursementListParams,
  EscrowDisbursementListResponse,
  EscrowDisbursementReleaseResult,
  EscrowDisbursementResponse,
  PiaxisRequestOptions,
  ReleaseEscrowDisbursementInput,
} from "../types";

export class EscrowDisbursementsResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async create(
    input: EscrowDisbursementCreateInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowDisbursementResponse> {
    const response = await this.http.post<unknown>(
      "/escrow-disbursements",
      serializeEscrowDisbursementCreate(input),
      requestOptions
    );

    return normalizeEscrowDisbursementResponse(response);
  }

  async get(
    disbursementId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowDisbursementResponse> {
    const response = await this.http.get<unknown>(
      `/escrow-disbursements/${disbursementId}`,
      undefined,
      requestOptions
    );

    return normalizeEscrowDisbursementResponse(response);
  }

  async list(
    params: EscrowDisbursementListParams = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowDisbursementListResponse> {
    const response = await this.http.get<unknown>(
      "/escrow-disbursements",
      {
        status: params.status,
        limit: params.limit,
        offset: params.offset,
      },
      requestOptions
    );

    return normalizeEscrowDisbursementListResponse(response);
  }

  async release(
    disbursementId: string,
    input: ReleaseEscrowDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowDisbursementReleaseResult> {
    const response = await this.http.post<unknown>(
      `/escrow-disbursements/${disbursementId}/release`,
      {
        force: input.force ?? true,
        reason: input.reason,
        escrow_ids: input.escrowIds,
      },
      requestOptions
    );

    return normalizeEscrowDisbursementReleaseResult(response);
  }

  async cancel(
    disbursementId: string,
    input: CancelDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<CancelledEscrowDisbursementResponse> {
    const response = await this.http.post<unknown>(
      `/escrow-disbursements/${disbursementId}/cancel`,
      { reason: input.reason },
      requestOptions
    );

    return normalizeCancelledEscrowDisbursementResponse(response);
  }
}

function serializeEscrowDisbursementCreate(input: EscrowDisbursementCreateInput) {
  return {
    recipients: input.recipients.map((recipient) => ({
      recipient_id: recipient.recipientId,
      email: recipient.email,
      phone_number: recipient.phoneNumber,
      amount: recipient.amount,
      reference: recipient.reference,
      terms: recipient.terms.map(serializeTerm),
    })),
    currency: input.currency,
    payment_method: input.paymentMethod,
    description: input.description,
    user_location: serializeUserLocation(input.userLocation),
  };
}

function normalizeEscrowDisbursementItemResponse(payload: unknown) {
  const data = asObject(payload);

  return {
    recipientId: optionalString(data.recipient_id),
    email: optionalString(data.email),
    phoneNumber: optionalString(data.phone_number),
    amount: stringValue(data.amount),
    escrowId: optionalString(data.escrow_id),
    status: stringValue(data.status),
    termsCount: Number(data.terms_count ?? 0),
    reference: optionalString(data.reference),
  };
}

function normalizeEscrowDisbursementSummaryResponse(payload: unknown) {
  const data = asObject(payload);

  return {
    disbursementId: stringValue(data.disbursement_id),
    status: stringValue(data.status),
    totalAmount: stringValue(data.total_amount),
    currency: stringValue(data.currency),
    recipientCount: Number(data.recipient_count ?? 0),
    successfulCount: Number(data.successful_count ?? 0),
    failedCount: Number(data.failed_count ?? 0),
    pendingCount: Number(data.pending_count ?? 0),
    description: optionalString(data.description),
    createdAt: optionalString(data.created_at) ?? undefined,
  };
}

function normalizeEscrowDisbursementResponse(
  payload: unknown
): EscrowDisbursementResponse {
  const data = asObject(payload);
  const summary = normalizeEscrowDisbursementSummaryResponse(payload);

  return {
    ...summary,
    createdAt: stringValue(data.created_at),
    escrowItems: (Array.isArray(data.escrow_items) ? data.escrow_items : []).map(
      normalizeEscrowDisbursementItemResponse
    ),
  };
}

function normalizeEscrowDisbursementListResponse(
  payload: unknown
): EscrowDisbursementListResponse {
  const data = asObject(payload);

  return {
    total: Number(data.total ?? 0),
    offset: Number(data.offset ?? 0),
    limit: Number(data.limit ?? 0),
    results: (Array.isArray(data.results) ? data.results : []).map(
      normalizeEscrowDisbursementSummaryResponse
    ),
  };
}

function normalizeEscrowDisbursementReleaseResult(
  payload: unknown
): EscrowDisbursementReleaseResult {
  const data = asObject(payload);

  return {
    disbursementId: stringValue(data.disbursement_id),
    force: Boolean(data.force),
    reason: optionalString(data.reason),
    releasedCount: Number(data.released_count ?? 0),
    skippedCount: Number(data.skipped_count ?? 0),
    failedCount: Number(data.failed_count ?? 0),
    released: jsonObjectArray(data.released),
    skipped: jsonObjectArray(data.skipped),
    failed: jsonObjectArray(data.failed),
  };
}

function normalizeCancelledEscrowDisbursementResponse(
  payload: unknown
): CancelledEscrowDisbursementResponse {
  const data = asObject(payload);
  const summary = normalizeEscrowDisbursementSummaryResponse(payload);

  return {
    ...summary,
    cancelledAt: optionalString(data.cancelled_at),
    cancellationReason: optionalString(data.cancellation_reason),
  };
}
