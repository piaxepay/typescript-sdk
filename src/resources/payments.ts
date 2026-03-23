import { PiaxisHttpClient } from "../http-client";
import {
  asObject,
  jsonObjectOrNull,
  optionalString,
  stringValue,
} from "../transforms";
import type {
  MerchantPaymentsListParams,
  PaymentCreateInput,
  PaymentDetailsResponse,
  PaymentListItem,
  PaymentListResponse,
  PaymentResponse,
  PiaxisRequestOptions,
} from "../types";

export class PaymentsResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async create(
    input: PaymentCreateInput,
    options: { mfaCode?: string; requestOptions?: PiaxisRequestOptions } = {}
  ): Promise<PaymentResponse> {
    const response = await this.http.post<unknown>(
      "/payments/create",
      {
        amount: input.amount,
        currency: input.currency,
        payment_method: input.paymentMethod,
        recipient_id: input.recipientId,
        user_info: input.userInfo,
        products: input.products,
        customer_pays_fees: input.customerPaysFees,
      },
      options.requestOptions,
      {
        mfa_code: options.mfaCode,
      }
    );

    return normalizePaymentResponse(response);
  }

  async get(
    paymentId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<PaymentDetailsResponse> {
    const response = await this.http.get<unknown>(
      `/payments/${paymentId}`,
      undefined,
      requestOptions
    );

    return normalizePaymentDetailsResponse(response);
  }

  async list(
    params: MerchantPaymentsListParams = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<PaymentListResponse> {
    const response = await this.http.get<unknown>(
      "/merchant-payments",
      {
        status: params.status,
        payment_method: params.paymentMethod,
        from_date: params.fromDate,
        to_date: params.toDate,
        limit: params.limit,
        offset: params.offset,
      },
      requestOptions
    );

    return normalizePaymentListResponse(response);
  }
}

function normalizePaymentResponse(payload: unknown): PaymentResponse {
  const data = asObject(payload);

  return {
    paymentId: stringValue(data.payment_id),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    currency: stringValue(data.currency),
  };
}

function normalizePaymentDetailsResponse(
  payload: unknown
): PaymentDetailsResponse {
  const data = asObject(payload);

  return {
    id: stringValue(data.id),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    currency: stringValue(data.currency),
    paymentMethod: stringValue(data.payment_method),
    createdAt: stringValue(data.created_at),
    reference: optionalString(data.reference),
    receipt: optionalString(data.receipt),
    merchantDetails: jsonObjectOrNull(data.merchant_details),
    recipientDetails: jsonObjectOrNull(data.recipient_details),
    productDetails: jsonObjectOrNull(data.product_details),
    chainPaymentDetails: jsonObjectOrNull(data.chain_payment_details),
    transactionDetails: jsonObjectOrNull(data.transaction_details),
  };
}

function normalizePaymentListItem(payload: unknown): PaymentListItem {
  const data = asObject(payload);
  const payer = data.payer ? asObject(data.payer) : null;
  const recipient = data.recipient ? asObject(data.recipient) : null;

  return {
    paymentId: stringValue(data.payment_id),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    currency: stringValue(data.currency),
    paymentMethod: stringValue(data.payment_method),
    date: stringValue(data.date),
    payer: payer
      ? {
          id: stringValue(payer.id),
          email: stringValue(payer.email),
          type: stringValue(payer.type),
          phone: optionalString(payer.phone),
        }
      : null,
    recipient: recipient
      ? {
          id: stringValue(recipient.id),
          email: stringValue(recipient.email),
        }
      : null,
  };
}

function normalizePaymentListResponse(payload: unknown): PaymentListResponse {
  const data = asObject(payload);

  return {
    total: Number(data.total ?? 0),
    offset: Number(data.offset ?? 0),
    limit: Number(data.limit ?? 0),
    results: (Array.isArray(data.results) ? data.results : []).map(
      normalizePaymentListItem
    ),
  };
}
