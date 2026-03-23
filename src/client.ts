import { AuthResource } from "./resources/auth";
import { DisbursementsResource } from "./resources/disbursements";
import { EscrowsResource } from "./resources/escrows";
import { EscrowDisbursementsResource } from "./resources/escrow-disbursements";
import { PiaxisHttpClient } from "./http-client";
import { OtpResource } from "./resources/otp";
import { PaymentsResource } from "./resources/payments";
import type {
  CancelDisbursementInput,
  CreateEscrowDisputeInput,
  DisbursementCreateInput,
  DisbursementListParams,
  EscrowCreateInput,
  EscrowDisbursementCreateInput,
  EscrowDisbursementListParams,
  FulfillEscrowTermInput,
  MerchantPaymentsListParams,
  OAuthAuthorizeParams,
  PaymentCreateInput,
  PiaxisClientOptions,
  PiaxisRequestOptions,
  ReleaseEscrowInput,
  ReleaseEscrowDisbursementInput,
  RequestOtpInput,
  ReverseEscrowInput,
  TokenExchangeInput,
} from "./types";

const DEFAULT_BASE_URL = "https://api.gopiaxis.com/api";

export class PiaxisClient {
  readonly auth: AuthResource;
  readonly escrows: EscrowsResource;
  readonly disbursements: DisbursementsResource;
  readonly otp: OtpResource;
  readonly payments: PaymentsResource;
  readonly escrowDisbursements: EscrowDisbursementsResource;

  private readonly http: PiaxisHttpClient;

  constructor(options: PiaxisClientOptions) {
    this.http = new PiaxisHttpClient({
      ...options,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    });

    this.auth = new AuthResource(this.http);
    this.escrows = new EscrowsResource(this.http);
    this.disbursements = new DisbursementsResource(this.http);
    this.otp = new OtpResource(this.http);
    this.payments = new PaymentsResource(this.http);
    this.escrowDisbursements = new EscrowDisbursementsResource(this.http);
  }

  static fromEnv(
    env: Record<string, string | undefined>,
    overrides: Omit<PiaxisClientOptions, "apiKey" | "accessToken" | "baseUrl"> & {
      baseUrl?: string;
    } = {}
  ): PiaxisClient {
    const apiKey = env.PIAXIS_API_KEY;
    const accessToken = env.PIAXIS_ACCESS_TOKEN;

    if (!apiKey && !accessToken) {
      throw new Error(
        "Set PIAXIS_API_KEY or PIAXIS_ACCESS_TOKEN before calling PiaxisClient.fromEnv()."
      );
    }

    return new PiaxisClient({
      ...overrides,
      apiKey,
      accessToken,
      baseUrl: overrides.baseUrl ?? env.PIAXIS_API_BASE_URL,
    });
  }

  disburse(
    input: DisbursementCreateInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.disbursements.create(input, requestOptions);
  }

  escrowDisburse(
    input: EscrowDisbursementCreateInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisbursements.create(input, requestOptions);
  }

  escrow_disburse(
    input: EscrowDisbursementCreateInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisburse(input, requestOptions);
  }

  buildAuthorizeUrl(params: OAuthAuthorizeParams) {
    return this.auth.buildAuthorizeUrl(params);
  }

  authorizeTest(
    params: OAuthAuthorizeParams,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.auth.authorizeTest(params, requestOptions);
  }

  exchangeToken(
    input: TokenExchangeInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.auth.exchangeToken(input, requestOptions);
  }

  createEscrow(
    input: EscrowCreateInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.create(input, requestOptions);
  }

  getEscrow(
    escrowId: string,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.get(escrowId, requestOptions);
  }

  getEscrowStatus(
    escrowId: string,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.status(escrowId, requestOptions);
  }

  releaseEscrow(
    escrowId: string,
    input: ReleaseEscrowInput = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.release(escrowId, input, requestOptions);
  }

  fulfillEscrowTerm(
    escrowId: string,
    termId: string,
    input: FulfillEscrowTermInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.fulfillTerm(escrowId, termId, input, requestOptions);
  }

  reverseEscrow(
    escrowId: string,
    input: ReverseEscrowInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.reverse(escrowId, input, requestOptions);
  }

  disputeEscrow(
    escrowId: string,
    input: CreateEscrowDisputeInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrows.dispute(escrowId, input, requestOptions);
  }

  requestOtp(
    input: RequestOtpInput,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.otp.request(input, requestOptions);
  }

  createPayment(
    input: PaymentCreateInput,
    options: { mfaCode?: string; requestOptions?: PiaxisRequestOptions } = {}
  ) {
    return this.payments.create(input, options);
  }

  getPayment(
    paymentId: string,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.payments.get(paymentId, requestOptions);
  }

  listMerchantPayments(
    params: MerchantPaymentsListParams = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.payments.list(params, requestOptions);
  }

  getDisbursement(
    disbursementId: string,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.disbursements.get(disbursementId, requestOptions);
  }

  listDisbursements(
    params: DisbursementListParams = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.disbursements.list(params, requestOptions);
  }

  cancelDisbursement(
    disbursementId: string,
    input: CancelDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.disbursements.cancel(disbursementId, input, requestOptions);
  }

  getEscrowDisbursement(
    disbursementId: string,
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisbursements.get(disbursementId, requestOptions);
  }

  listEscrowDisbursements(
    params: EscrowDisbursementListParams = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisbursements.list(params, requestOptions);
  }

  releaseEscrowDisbursement(
    disbursementId: string,
    input: ReleaseEscrowDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisbursements.release(
      disbursementId,
      input,
      requestOptions
    );
  }

  cancelEscrowDisbursement(
    disbursementId: string,
    input: CancelDisbursementInput = {},
    requestOptions?: PiaxisRequestOptions
  ) {
    return this.escrowDisbursements.cancel(
      disbursementId,
      input,
      requestOptions
    );
  }
}
