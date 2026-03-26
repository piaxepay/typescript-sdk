# Piaxis TypeScript SDK

Official JavaScript and TypeScript SDK for the Piaxis partner/payments API.

- Package: `@piaxis/sdk`
- Repository: `https://github.com/piaxepay/typescript-sdk`
- REST API docs: `https://api.gopiaxis.com/api/docs/`
- Python SDK: `https://github.com/piaxepay/python-sdk`

## What this SDK covers

This SDK wraps the public partner/payments surface exposed at `api.gopiaxis.com`.

It currently covers:

- OAuth authorize URL generation and token exchange for `piaxis_external`
- OTP requests
- Direct payments
- Escrows and escrow actions
- Direct disbursements
- Escrow disbursements
- Shared transport concerns like auth headers, timeouts, abort signals, and structured API errors

It does not attempt to wrap every backend endpoint in `piaxis-api`, such as internal dashboard, admin, or other non-public surfaces. A few advanced raw REST fields are also not yet promoted into the typed top-level SDK inputs. For anything outside the typed SDK surface, use the raw REST documentation at `https://api.gopiaxis.com/api/docs/`.

## Install

```bash
npm install @piaxis/sdk
```

Node `18+` is required.

## Choose your auth mode

Use one of these two authentication modes:

- `apiKey`: merchant-owned operations like OTP, direct payments, escrows, and disbursements
- `accessToken`: end-user-authorized `piaxis_external` payments after the OAuth flow completes

Environment variables supported by `PiaxisClient.fromEnv(process.env)`:

- `PIAXIS_API_KEY`
- `PIAXIS_ACCESS_TOKEN`
- `PIAXIS_API_BASE_URL`

Base URLs:

- Sandbox: `https://sandbox.api.gopiaxis.com/api`
- Production: `https://api.gopiaxis.com/api`

`PiaxisClient.fromEnv(...)` requires either `PIAXIS_API_KEY` or `PIAXIS_ACCESS_TOKEN`.

```bash
export PIAXIS_API_KEY="your_sandbox_api_key"
export PIAXIS_API_BASE_URL="https://sandbox.api.gopiaxis.com/api"
```

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env);
```

## Direct payment flow

Typical mobile-money flow:

1. Request an OTP for the customer.
2. Create the payment with `paymentMethod: "mtn"` or `paymentMethod: "airtel"`.
3. Poll `getPayment(...)` and/or consume your webhook events until the payment settles.

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env, {
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

const otp = await client.requestOtp({
  email: "buyer@example.com",
  phoneNumber: "+256700000000",
});

const payment = await client.createPayment({
  amount: "15000",
  currency: "UGX",
  paymentMethod: "mtn",
  userInfo: {
    email: "buyer@example.com",
    phone_number: "+256700000000",
    otp: process.env.PIAXIS_TEST_OTP ?? "123456",
  },
  customerPaysFees: true,
});

console.log("otp:", otp);
console.log("payment:", payment);
console.log("latest:", await client.getPayment(payment.paymentId));
```

Notes:

- Top-level SDK input fields use TypeScript casing such as `paymentMethod` and `customerPaysFees`.
- Nested payloads like `userInfo`, `products`, and `terms[].data` are passed through and should follow the REST API field shape.
- Many payment methods are asynchronous. Plan for polling and webhooks instead of assuming the create call means “completed”.

## OAuth and `piaxis_external` flow

Use this when the payer must authorize access to an external Piaxis wallet.

```ts
import { PiaxisClient } from "@piaxis/sdk";

const baseUrl =
  process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api";

const authClient = new PiaxisClient({ baseUrl });

const authorizeUrl = authClient.buildAuthorizeUrl({
  merchantId: process.env.PIAXIS_MERCHANT_ID!,
  externalUserId: "customer-123",
  redirectUri: process.env.PIAXIS_REDIRECT_URI!,
});

console.log("redirect the customer to:", authorizeUrl);

const tokens = await authClient.exchangeToken({
  code: process.env.PIAXIS_AUTH_CODE!,
  redirectUri: process.env.PIAXIS_REDIRECT_URI!,
  clientId: process.env.PIAXIS_OAUTH_CLIENT_ID!,
  clientSecret: process.env.PIAXIS_OAUTH_CLIENT_SECRET!,
});

const payerClient = new PiaxisClient({
  accessToken: tokens.accessToken,
  baseUrl,
});

const payment = await payerClient.createPayment({
  amount: "15000",
  currency: "UGX",
  paymentMethod: "piaxis_external",
  recipientId: process.env.PIAXIS_RECIPIENT_ID,
  customerPaysFees: true,
});

console.log(payment);
```

If you want to test the authorize step without a browser redirect, use `authorizeTest(...)`.

## Escrow flow

Escrows are a separate flow from direct payments. The common lifecycle is:

1. `createEscrow(...)`
2. `getEscrow(...)` or `getEscrowStatus(...)`
3. `fulfillEscrowTerm(...)`, `releaseEscrow(...)`, `reverseEscrow(...)`, or `disputeEscrow(...)` depending on your business rules

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env, {
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

const escrow = await client.createEscrow({
  receiverId: process.env.PIAXIS_RECEIVER_ID!,
  amount: "50000",
  currencyCode: "UGX",
  paymentMethod: "mtn",
  userInfo: {
    email: "buyer@example.com",
    phone_number: "+256700000000",
    otp: process.env.PIAXIS_TEST_OTP ?? "123456",
  },
  terms: [{ type: "manual_release", data: {} }],
});

console.log(await client.getEscrowStatus(escrow.id));
console.log(
  await client.releaseEscrow(escrow.id, {
    force: true,
    reason: "Sandbox manual release",
  })
);
```

## Disbursement flows

Use direct disbursements for payouts that do not need escrow, and escrow disbursements when each payout item must satisfy terms before release.

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env, {
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

const direct = await client.disburse({
  currency: "UGX",
  paymentMethod: "airtel",
  description: "Weekly supplier payout",
  recipients: [
    {
      recipientId: "recipient-123",
      amount: "100000",
      reference: "supplier-001",
    },
  ],
});

const escrowBatch = await client.escrowDisburse({
  currency: "UGX",
  paymentMethod: "mtn",
  description: "Courier escrow batch",
  userLocation: { latitude: 0.312, longitude: 32.582 },
  recipients: [
    {
      recipientId: "recipient-123",
      amount: "100000",
      reference: "courier-001",
      terms: [{ type: "manual_release", data: {} }],
    },
  ],
});

console.log(direct);
console.log(escrowBatch);
```

Related methods:

- `getDisbursement(...)`, `listDisbursements(...)`, `cancelDisbursement(...)`
- `getEscrowDisbursement(...)`, `listEscrowDisbursements(...)`, `releaseEscrowDisbursement(...)`, `cancelEscrowDisbursement(...)`

## Error handling

API failures raise `PiaxisApiError`.

```ts
import { PiaxisApiError, PiaxisClient } from "@piaxis/sdk";

try {
  const client = new PiaxisClient({ apiKey: "invalid" });
  await client.listMerchantPayments();
} catch (error) {
  if (error instanceof PiaxisApiError) {
    console.log("message:", error.message);
    console.log("status:", error.status);
    console.log("code:", error.code);
    console.log("requestId:", error.requestId);
    console.log("details:", error.details);
  } else {
    throw error;
  }
}
```

Use `requestId` when talking to Piaxis support.

## Request customization

You can identify your application and override request behavior:

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
  baseUrl: "https://sandbox.api.gopiaxis.com/api",
  timeoutMs: 60_000,
  appInfo: {
    name: "orders-service",
    version: "1.4.0",
  },
});

const payment = await client.getPayment("payment-id", {
  headers: { "x-request-id": "merchant-trace-123" },
  signal: AbortSignal.timeout(10_000),
});
```

This sends:

- `api-key` or `Authorization: Bearer ...`
- `x-piaxis-sdk-client: orders-service/1.4.0` when `appInfo` is set
- any extra headers you pass via `requestOptions`

## Method map

| Capability | TypeScript method | REST endpoint |
| --- | --- | --- |
| Build authorize URL | `buildAuthorizeUrl(...)` | `GET /authorize` |
| Test authorize redirect | `authorizeTest(...)` | `GET /authorize` with `x-test-request: true` |
| Exchange OAuth token | `exchangeToken(...)` | `POST /token` |
| Request OTP | `requestOtp(...)` | `POST /request-otp` |
| Create payment | `createPayment(...)` | `POST /payments/create` |
| Get payment | `getPayment(...)` | `GET /payments/{payment_id}` |
| List merchant payments | `listMerchantPayments(...)` | `GET /merchant-payments` |
| Create escrow | `createEscrow(...)` | `POST /escrows/` |
| Get escrow | `getEscrow(...)` | `GET /escrows/{escrow_id}` |
| Get escrow status | `getEscrowStatus(...)` | `GET /escrows/{escrow_id}/status` |
| Release escrow | `releaseEscrow(...)` | `POST /escrows/{escrow_id}/release` |
| Fulfill escrow term | `fulfillEscrowTerm(...)` | `POST /escrows/{escrow_id}/terms/{term_id}/fulfill` |
| Reverse escrow | `reverseEscrow(...)` | `POST /escrows/{escrow_id}/reverse` |
| Dispute escrow | `disputeEscrow(...)` | `POST /escrows/{escrow_id}/disputes` |
| Create disbursement | `disburse(...)` | `POST /disbursements` |
| Get disbursement | `getDisbursement(...)` | `GET /disbursements/{disbursement_id}` |
| List disbursements | `listDisbursements(...)` | `GET /disbursements` |
| Cancel disbursement | `cancelDisbursement(...)` | `POST /disbursements/{disbursement_id}/cancel` |
| Create escrow disbursement | `escrowDisburse(...)` | `POST /escrow-disbursements` |
| Legacy alias | `escrow_disburse(...)` | same as `POST /escrow-disbursements` |
| Get escrow disbursement | `getEscrowDisbursement(...)` | `GET /escrow-disbursements/{disbursement_id}` |
| List escrow disbursements | `listEscrowDisbursements(...)` | `GET /escrow-disbursements` |
| Release escrow disbursement | `releaseEscrowDisbursement(...)` | `POST /escrow-disbursements/{disbursement_id}/release` |
| Cancel escrow disbursement | `cancelEscrowDisbursement(...)` | `POST /escrow-disbursements/{disbursement_id}/cancel` |

## Examples and references

- Direct payment example: `https://github.com/piaxepay/typescript-sdk/blob/main/examples/direct-payment.mjs`
- OAuth example: `https://github.com/piaxepay/typescript-sdk/blob/main/examples/oauth-flow.mjs`
- Escrow example: `https://github.com/piaxepay/typescript-sdk/blob/main/examples/escrow-flow.mjs`
- Disbursement example: `https://github.com/piaxepay/typescript-sdk/blob/main/examples/disbursement-flow.mjs`
- Sandbox onboarding: `https://github.com/piaxepay/typescript-sdk/blob/main/SANDBOX_ONBOARDING.md`
- Repository architecture: `https://github.com/piaxepay/typescript-sdk/blob/main/ARCHITECTURE.md`
- REST API docs: `https://api.gopiaxis.com/api/docs/`
