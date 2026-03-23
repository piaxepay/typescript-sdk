import { PiaxisHttpClient } from "../http-client";
import {
  asObject,
  jsonObjectArray,
  optionalString,
  stringValue,
} from "../transforms";
import type {
  CancelDisbursementInput,
  DisbursementCreateInput,
  DisbursementDetailResponse,
  DisbursementListParams,
  DisbursementListResponse,
  DisbursementResponse,
  PiaxisRequestOptions,
} from "../types";

export class DisbursementsResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async create(
    input: DisbursementCreateInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<DisbursementResponse> {
    const response = await this.http.post<unknown>(
      "/disbursements",
      serializeDisbursementCreate(input),
      requestOptions
    );

    return normalizeDisbursementResponse(response);
  }

  async get(
    disbursementId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<DisbursementDetailResponse> {
    const response = await this.http.get<unknown>(
      `/disbursements/${disbursementId}`,
      undefined,
      requestOptions
    );

    return normalizeDisbursementDetailResponse(response);
  }

  async list(
    params: DisbursementListParams = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<DisbursementListResponse> {
    const response = await this.http.get<unknown>(
      "/disbursements",
      {
        status: params.status,
        from_date: params.fromDate,
        to_date: params.toDate,
        limit: params.limit,
        offset: params.offset,
      },
      requestOptions
    );

    return normalizeDisbursementListResponse(response);
  }

  async cancel(
    disbursementId: string,
    input: CancelDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<DisbursementResponse> {
    const response = await this.http.post<unknown>(
      `/disbursements/${disbursementId}/cancel`,
      { reason: input.reason },
      requestOptions
    );

    return normalizeDisbursementResponse(response);
  }
}

function serializeDisbursementCreate(input: DisbursementCreateInput) {
  return {
    recipients: input.recipients.map((recipient) => ({
      recipient_id: recipient.recipientId,
      email: recipient.email,
      phone_number: recipient.phoneNumber,
      amount: recipient.amount,
      reference: recipient.reference,
    })),
    currency: input.currency,
    payment_method: input.paymentMethod,
    description: input.description,
  };
}

function normalizeDisbursementResponse(payload: unknown): DisbursementResponse {
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
  };
}

function normalizeDisbursementDetailResponse(
  payload: unknown
): DisbursementDetailResponse {
  const data = asObject(payload);

  return {
    ...normalizeDisbursementResponse(payload),
    paymentMethod: stringValue(data.payment_method),
    description: optionalString(data.description),
    createdAt: stringValue(data.created_at),
    completedAt: optionalString(data.completed_at),
    cancelledAt: optionalString(data.cancelled_at),
    cancellationReason: optionalString(data.cancellation_reason),
    items: jsonObjectArray(data.items),
  };
}

function normalizeDisbursementListResponse(
  payload: unknown
): DisbursementListResponse {
  const data = asObject(payload);

  return {
    total: Number(data.total ?? 0),
    offset: Number(data.offset ?? 0),
    limit: Number(data.limit ?? 0),
    results: (Array.isArray(data.results) ? data.results : []).map(
      normalizeDisbursementResponse
    ),
  };
}
