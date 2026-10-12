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
  WalletTransaction,
  WalletTransactionListResponse,
  WalletTransactionsListParams,
} from "../types";

export class PaymentsResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async create(
    input: PaymentCreateInput,
    options: { mfaCode?: string; requestOptions?: PiaxisRequestOptions } = {}
  ): Promise<PaymentResponse> {
    const body: Record<string, unknown> = {
      amount: input.amount,
      currency: input.currency,
      payment_method: input.paymentMethod,
      recipient_id: input.recipientId,
      user_info: input.userInfo,
      products: input.products,
      customer_pays_fees: input.customerPaysFees,
      return_url: input.returnUrl,
    };
    if (options.mfaCode !== undefined) {
      body.mfa_code = options.mfaCode;
    }
    const response = await this.http.post<unknown>(
      "/payments/create",
      body,
      options.requestOptions
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

  /** Every movement on the merchant account's wallets, newest first. */
  async listTransactions(
    params: WalletTransactionsListParams = {},
    requestOptions?: PiaxisRequestOptions
  ): Promise<WalletTransactionListResponse> {
    const response = await this.http.get<unknown>(
      "/transactions",
      {
        transaction_type: params.transactionType,
        status: params.status,
        currency: params.currency,
        from_date: params.fromDate,
        to_date: params.toDate,
        limit: params.limit,
        offset: params.offset,
      },
      requestOptions
    );

    return normalizeWalletTransactionListResponse(response);
  }
}

function normalizeWalletTransactionListResponse(
  payload: unknown
): WalletTransactionListResponse {
  const data = asObject(payload);

  return {
    total: Number(data.total ?? 0),
    offset: Number(data.offset ?? 0),
    limit: Number(data.limit ?? 0),
    results: (Array.isArray(data.results) ? data.results : []).map(
      normalizeWalletTransaction
    ),
  };
}

function normalizeWalletTransaction(payload: unknown): WalletTransaction {
  const data = asObject(payload);

  return {
    transactionId: stringValue(data.transaction_id),
    transactionType: stringValue(data.transaction_type),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    netAmount: optionalString(data.net_amount) ?? null,
    feeAmount: optionalString(data.fee_amount) ?? null,
    currency: stringValue(data.currency),
    date: stringValue(data.date),
    description: optionalString(data.description) ?? null,
    paymentMethod: optionalString(data.payment_method) ?? null,
    externalReference: optionalString(data.external_reference) ?? null,
    paymentId: optionalString(data.payment_id) ?? null,
    paymentRequestId: optionalString(data.payment_request_id) ?? null,
    storeId: optionalString(data.store_id) ?? null,
  };
}

function normalizePaymentResponse(payload: unknown): PaymentResponse {
  const data = asObject(payload);

  return {
    paymentId: stringValue(data.payment_id),
    status: stringValue(data.status),
    amount: stringValue(data.amount),
    currency: stringValue(data.currency),
    paymentUrl: optionalString(data.payment_url),
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
