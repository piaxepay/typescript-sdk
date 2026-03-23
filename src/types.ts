export type Amount = number | string;
export type JsonObject = Record<string, unknown>;

export type PaymentMethod =
  | "piaxis"
  | "piaxis_external"
  | "mtn"
  | "airtel"
  | "card"
  | (string & {});

export interface PiaxisAppInfo {
  name: string;
  version?: string;
}

export interface PiaxisClientOptions {
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  appInfo?: PiaxisAppInfo;
}

export interface PiaxisRequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface TermInput {
  type: string;
  data: JsonObject;
  expiryDate?: string | null;
}

export interface OAuthAuthorizeParams {
  merchantId: string;
  externalUserId: string;
  redirectUri: string;
}

export interface TokenExchangeInput {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  grantType?: string;
}

export interface AuthorizeTestResponse {
  redirectUrl: string;
  code: string;
  nextStep: string;
  tokenParameters: TokenExchangeInput;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}

export interface EscrowCreateInput {
  receiverId: string;
  amount: Amount;
  currencyCode: string;
  paymentMethod: PaymentMethod;
  terms: TermInput[];
  externalUserId?: string | null;
  userInfo?: JsonObject | null;
  userLocation?: UserLocation | null;
}

export interface EscrowResponse {
  id: string;
  amount: string;
  currencyCode: string;
  status: string;
  paymentMethod: string;
  senderId?: string | null;
  receiverId?: string | null;
  createdAt: string;
  updatedAt: string;
  terms: JsonObject[];
  products?: JsonObject[] | null;
  location?: Record<string, number> | null;
  requiredActions?: JsonObject[] | null;
  externalUserId?: string | null;
}

export interface ReleaseEscrowInput {
  verificationCode?: string | null;
  verificationMethod?: string;
  userInfo?: JsonObject | null;
  force?: boolean;
  reason?: string | null;
}

export interface EscrowReleaseResponse {
  status: string;
  escrowId: string;
  force: boolean;
  reason?: string | null;
}

export interface FulfillEscrowTermInput {
  termType: string;
  data: JsonObject;
  userInfo?: JsonObject | null;
}

export type FulfillEscrowTermResponse = JsonObject & {
  status?: string;
  message?: string;
  requiresOtherParty?: boolean;
  escrowId?: string;
  termId?: string;
  termType?: string;
};

export interface ReverseEscrowInput {
  reason?: string | null;
  verificationCode?: string | null;
  verificationMethod?: string;
  userInfo?: JsonObject | null;
}

export interface ReverseEscrowResponse {
  status: string;
  escrowId: string;
  reason?: string | null;
}

export interface CreateEscrowDisputeInput {
  reason: string;
  initiatorRole?: string | null;
  userInfo?: JsonObject | null;
}

export interface EscrowDisputeResponse {
  message: string;
  disputeId: string;
  initiatorRole: string;
}

export interface EscrowStatusBuyerInfo {
  type: string;
  email?: string | null;
  phoneNumber?: string | null;
  verified?: boolean;
}

export type EscrowTermStatus = JsonObject & {
  termId: string;
  termType: string;
  isMet: boolean;
  metAt?: string | null;
};

export interface EscrowStatusResponse {
  escrowId: string;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  buyerInfo: EscrowStatusBuyerInfo;
  terms: EscrowTermStatus[];
  allTermsMet: boolean;
}

export interface DisbursementRecipientInput {
  recipientId?: string;
  email?: string;
  phoneNumber?: string;
  amount: Amount;
  reference?: string;
}

export interface DisbursementCreateInput {
  recipients: DisbursementRecipientInput[];
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
}

export interface DisbursementResponse {
  disbursementId: string;
  status: string;
  totalAmount: string;
  currency: string;
  recipientCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
}

export interface DisbursementDetailResponse extends DisbursementResponse {
  paymentMethod: string;
  description?: string | null;
  createdAt: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  items: JsonObject[];
}

export interface DisbursementListParams {
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface DisbursementListResponse {
  total: number;
  offset: number;
  limit: number;
  results: DisbursementResponse[];
}

export interface CancelDisbursementInput {
  reason?: string;
}

export interface EscrowDisbursementRecipientInput {
  recipientId?: string;
  email?: string;
  phoneNumber?: string;
  amount: Amount;
  terms: TermInput[];
  reference?: string;
}

export interface EscrowDisbursementCreateInput {
  recipients: EscrowDisbursementRecipientInput[];
  currency: string;
  paymentMethod: PaymentMethod;
  description?: string;
  userLocation?: UserLocation;
}

export interface EscrowDisbursementItemResponse {
  recipientId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  amount: string;
  escrowId?: string | null;
  status: string;
  termsCount: number;
  reference?: string | null;
}

export interface EscrowDisbursementResponse {
  disbursementId: string;
  status: string;
  totalAmount: string;
  currency: string;
  recipientCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  escrowItems: EscrowDisbursementItemResponse[];
  description?: string | null;
  createdAt: string;
}

export interface EscrowDisbursementSummaryResponse {
  disbursementId: string;
  status: string;
  totalAmount: string;
  currency: string;
  recipientCount: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  description?: string | null;
  createdAt?: string;
}

export interface EscrowDisbursementListParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export interface EscrowDisbursementListResponse {
  total: number;
  offset: number;
  limit: number;
  results: EscrowDisbursementSummaryResponse[];
}

export interface ReleaseEscrowDisbursementInput {
  force?: boolean;
  reason?: string;
  escrowIds?: string[];
}

export interface CancelledEscrowDisbursementResponse
  extends EscrowDisbursementSummaryResponse {
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

export interface EscrowDisbursementReleaseResult {
  disbursementId: string;
  force: boolean;
  reason?: string | null;
  releasedCount: number;
  skippedCount: number;
  failedCount: number;
  released: JsonObject[];
  skipped: JsonObject[];
  failed: JsonObject[];
}

export interface RequestOtpInput {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface OtpResponse {
  verificationMethods: {
    emailSent: boolean;
    phoneSent: boolean;
  };
  expiresIn: number;
  otp?: string | null;
}

export interface PaymentCreateInput {
  amount: Amount;
  currency: string;
  paymentMethod: PaymentMethod;
  recipientId?: string | null;
  userInfo?: JsonObject | null;
  products?: JsonObject[] | null;
  customerPaysFees?: boolean | null;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  amount: string;
  currency: string;
}

export interface PaymentDetailsResponse {
  id: string;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  reference?: string | null;
  receipt?: string | null;
  merchantDetails?: JsonObject | null;
  recipientDetails?: JsonObject | null;
  productDetails?: JsonObject | null;
  chainPaymentDetails?: JsonObject | null;
  transactionDetails?: JsonObject | null;
}

export interface MerchantPaymentsListParams {
  status?: string;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface PayerInfo {
  id: string;
  email: string;
  type: string;
  phone?: string | null;
}

export interface RecipientInfo {
  id: string;
  email: string;
}

export interface PaymentListItem {
  paymentId: string;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  date: string;
  payer?: PayerInfo | null;
  recipient?: RecipientInfo | null;
}

export interface PaymentListResponse {
  total: number;
  offset: number;
  limit: number;
  results: PaymentListItem[];
}
