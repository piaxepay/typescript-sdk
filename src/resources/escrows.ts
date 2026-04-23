import { PiaxisHttpClient } from "../http-client";
import {
  asArray,
  asObject,
  booleanValue,
  jsonObjectOrNull,
  jsonObject,
  jsonObjectArray,
  numberValue,
  optionalString,
  serializeTerm,
  serializeUserLocation,
  stringRecordOrNull,
  stringValue,
} from "../transforms";
import type {
  CreateEscrowDisputeInput,
  EscrowAllocationInput,
  EscrowAllocationResponse,
  EscrowAllocationSummaryResponse,
  EscrowCreateInput,
  EscrowDisputeResponse,
  EscrowReleaseResponse,
  EscrowResponse,
  EscrowStatusBuyerInfo,
  EscrowStatusResponse,
  EscrowTermStatus,
  FulfillEscrowTermInput,
  FulfillEscrowTermResponse,
  PiaxisRequestOptions,
  ReleaseEscrowInput,
  ReverseEscrowInput,
  ReverseEscrowResponse,
} from "../types";

export class EscrowsResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async create(
    input: EscrowCreateInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowResponse> {
    const response = await this.http.post<unknown>(
      "/escrows/",
      serializeEscrowCreate(input),
      requestOptions
    );

    return normalizeEscrowResponse(response);
  }

  async get(
    escrowId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowResponse> {
    const response = await this.http.get<unknown>(
      `/escrows/${escrowId}`,
      undefined,
      requestOptions
    );

    return normalizeEscrowResponse(response);
  }

  async status(
    escrowId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowStatusResponse> {
    const response = await this.http.get<unknown>(
      `/escrows/${escrowId}/status`,
      undefined,
      requestOptions
    );

    return normalizeEscrowStatusResponse(response);
  }

  async release(
    escrowId: string,
    input: ReleaseEscrowInput = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowReleaseResponse> {
    const response = await this.http.post<unknown>(
      `/escrows/${escrowId}/release`,
      {
        verification_code: input.verificationCode,
        verification_method: input.verificationMethod ?? "email",
        user_info: input.userInfo,
        amount: input.amount,
        allocation_keys: input.allocationKeys,
        force: input.force ?? false,
        reason: input.reason,
      },
      requestOptions
    );

    return normalizeEscrowReleaseResponse(response);
  }

  async fulfillTerm(
    escrowId: string,
    termId: string,
    input: FulfillEscrowTermInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<FulfillEscrowTermResponse> {
    const response = await this.http.post<unknown>(
      `/escrows/${escrowId}/terms/${termId}/fulfill`,
      {
        term_id: termId,
        term_type: input.termType,
        data: input.data,
        user_info: input.userInfo,
      },
      requestOptions
    );

    return normalizeFulfillEscrowTermResponse(response);
  }

  async reverse(
    escrowId: string,
    input: ReverseEscrowInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<ReverseEscrowResponse> {
    const response = await this.http.post<unknown>(
      `/escrows/${escrowId}/reverse`,
      {
        reason: input.reason,
        verification_code: input.verificationCode,
        verification_method: input.verificationMethod ?? "email",
        user_info: input.userInfo,
        amount: input.amount,
        allocation_keys: input.allocationKeys,
      },
      requestOptions
    );

    return normalizeReverseEscrowResponse(response);
  }

  async dispute(
    escrowId: string,
    input: CreateEscrowDisputeInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<EscrowDisputeResponse> {
    const response = await this.http.post<unknown>(
      `/escrows/${escrowId}/disputes`,
      {
        reason: input.reason,
        initiator_role: input.initiatorRole,
        user_info: input.userInfo,
      },
      requestOptions
    );

    return normalizeEscrowDisputeResponse(response);
  }
}

function serializeEscrowAllocation(allocation: EscrowAllocationInput) {
  return {
    allocation_key: allocation.allocationKey,
    amount: allocation.amount,
    seller_reference: allocation.sellerReference,
    description: allocation.description,
    metadata: allocation.metadata,
  };
}

function serializeEscrowCreate(input: EscrowCreateInput) {
  return {
    receiver_id: input.receiverId,
    amount: input.amount,
    currency_code: input.currencyCode,
    payment_method: input.paymentMethod,
    terms: input.terms.map(serializeTerm),
    external_user_id: input.externalUserId,
    user_info: input.userInfo,
    user_location: serializeUserLocation(input.userLocation),
    external_order_id: input.externalOrderId,
    allocations: input.allocations?.map(serializeEscrowAllocation),
    metadata: input.metadata,
  };
}

function normalizeEscrowAllocationResponse(
  payload: unknown
): EscrowAllocationResponse {
  const data = asObject(payload);

  return {
    allocationKey: stringValue(data.allocation_key),
    amount: optionalString(data.amount),
    sellerReference: optionalString(data.seller_reference),
    description: optionalString(data.description),
    status: stringValue(data.status),
    statusReason: optionalString(data.status_reason),
    statusUpdatedAt: optionalString(data.status_updated_at),
    metadata:
      data.metadata === undefined ? undefined : jsonObjectOrNull(data.metadata),
  };
}

function normalizeEscrowAllocationSummaryResponse(
  payload: unknown
): EscrowAllocationSummaryResponse {
  const data = asObject(payload);

  return {
    totalCount: numberValue(data.total_count),
    pendingCount: numberValue(data.pending_count),
    releasedCount: numberValue(data.released_count),
    reversedCount: numberValue(data.reversed_count),
    pendingAmount: stringValue(data.pending_amount),
    releasedAmount: stringValue(data.released_amount),
    reversedAmount: stringValue(data.reversed_amount),
  };
}

export function normalizeEscrowResponse(payload: unknown): EscrowResponse {
  const data = asObject(payload);

  return {
    id: stringValue(data.id),
    amount: stringValue(data.amount),
    currencyCode: stringValue(data.currency_code),
    status: stringValue(data.status),
    paymentMethod: stringValue(data.payment_method),
    senderId: optionalString(data.sender_id),
    receiverId: optionalString(data.receiver_id),
    createdAt: stringValue(data.created_at),
    updatedAt: stringValue(data.updated_at),
    terms: jsonObjectArray(data.terms),
    products: jsonObjectArray(data.products),
    location: stringRecordOrNull(data.location),
    requiredActions: jsonObjectArray(data.required_actions),
    externalUserId: optionalString(data.external_user_id),
    balanceEscrowIn: optionalString(data.balance_escrow_in),
    balanceEscrowOut: optionalString(data.balance_escrow_out),
    metadata:
      data.metadata === undefined ? undefined : jsonObjectOrNull(data.metadata),
    allocations:
      data.allocations == null
        ? data.allocations === null
          ? null
          : undefined
        : asArray(data.allocations).map(normalizeEscrowAllocationResponse),
    allocationSummary:
      data.allocation_summary == null
        ? data.allocation_summary === null
          ? null
          : undefined
        : normalizeEscrowAllocationSummaryResponse(data.allocation_summary),
  };
}

function normalizeEscrowReleaseResponse(payload: unknown): EscrowReleaseResponse {
  const data = asObject(payload);

  return {
    status: stringValue(data.status),
    escrowId: stringValue(data.escrow_id),
    amount: optionalString(data.amount),
    force: booleanValue(data.force),
    reason: optionalString(data.reason),
    allocationKeys:
      data.allocation_keys == null
        ? data.allocation_keys === null
          ? null
          : undefined
        : asArray(data.allocation_keys).map(stringValue),
    allocationSummary:
      data.allocation_summary == null
        ? data.allocation_summary === null
          ? null
          : undefined
        : normalizeEscrowAllocationSummaryResponse(data.allocation_summary),
  };
}

function normalizeFulfillEscrowTermResponse(
  payload: unknown
): FulfillEscrowTermResponse {
  const data = asObject(payload);

  return {
    ...jsonObject(payload),
    status: optionalString(data.status) ?? undefined,
    message: optionalString(data.message) ?? undefined,
    requiresOtherParty:
      data.requires_other_party === undefined
        ? undefined
        : booleanValue(data.requires_other_party),
    escrowId: optionalString(data.escrow_id) ?? undefined,
    termId: optionalString(data.term_id) ?? undefined,
    termType: optionalString(data.term_type) ?? undefined,
  };
}

function normalizeReverseEscrowResponse(payload: unknown): ReverseEscrowResponse {
  const data = asObject(payload);

  return {
    status: stringValue(data.status),
    escrowId: stringValue(data.escrow_id),
    amount: optionalString(data.amount),
    reason: optionalString(data.reason),
    allocationKeys:
      data.allocation_keys == null
        ? data.allocation_keys === null
          ? null
          : undefined
        : asArray(data.allocation_keys).map(stringValue),
    allocationSummary:
      data.allocation_summary == null
        ? data.allocation_summary === null
          ? null
          : undefined
        : normalizeEscrowAllocationSummaryResponse(data.allocation_summary),
  };
}

function normalizeEscrowDisputeResponse(payload: unknown): EscrowDisputeResponse {
  const data = asObject(payload);

  return {
    message: stringValue(data.message),
    disputeId: stringValue(data.dispute_id),
    initiatorRole: stringValue(data.initiator_role),
  };
}

function normalizeEscrowStatusBuyerInfo(payload: unknown): EscrowStatusBuyerInfo {
  const data = asObject(payload);

  return {
    type: stringValue(data.type),
    email: optionalString(data.email),
    phoneNumber: optionalString(data.phone_number),
    verified:
      data.verified === undefined ? undefined : booleanValue(data.verified),
  };
}

function normalizeEscrowTermStatus(payload: unknown): EscrowTermStatus {
  const data = asObject(payload);

  return {
    ...jsonObject(payload),
    termId: stringValue(data.term_id),
    termType: stringValue(data.term_type),
    isMet: booleanValue(data.is_met),
    metAt: optionalString(data.met_at) ?? undefined,
  };
}

function normalizeEscrowStatusResponse(payload: unknown): EscrowStatusResponse {
  const data = asObject(payload);

  return {
    escrowId: stringValue(data.escrow_id),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    currency: stringValue(data.currency),
    paymentMethod: stringValue(data.payment_method),
    createdAt: stringValue(data.created_at),
    buyerInfo: normalizeEscrowStatusBuyerInfo(data.buyer_info),
    terms: (Array.isArray(data.terms) ? data.terms : []).map(normalizeEscrowTermStatus),
    allTermsMet: booleanValue(data.all_terms_met),
  };
}
