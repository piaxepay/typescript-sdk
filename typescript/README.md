# Piaxis JavaScript and TypeScript SDK

Initial JavaScript and TypeScript SDK scaffold for the public partner API at `https://api.gopiaxis.com/api`.

## Install

This package is scaffolded locally in the workspace. It is authored in TypeScript and builds JavaScript artifacts for JavaScript consumers.

## Quick start

```ts
import { PiaxisClient } from "@piaxis/sdk";

const piaxis = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
});

const payout = await piaxis.disburse({
  currency: "UGX",
  paymentMethod: "airtel",
  recipients: [
    {
      phoneNumber: "+256700000000",
      amount: "15000",
      reference: "vendor-payout-001",
    },
  ],
  description: "Weekly vendor settlement",
});
```

```ts
import { PiaxisClient } from "@piaxis/sdk";

const piaxis = PiaxisClient.fromEnv(process.env);

const batch = await piaxis.escrow_disburse({
  currency: "UGX",
  paymentMethod: "mtn",
  recipients: [
    {
      recipientId: "80c989ec-9ce1-4d54-a88c-5b8fb7b65014",
      amount: "25000",
      reference: "courier-escrow-001",
      terms: [
        {
          type: "manual_release",
          data: {},
        },
      ],
    },
  ],
  description: "Courier escrow batch",
});
```

## Examples

- `examples/oauth-flow.mjs`
- `examples/direct-payment.mjs`
- `examples/escrow-flow.mjs`
- `examples/disbursement-flow.mjs`

## Supported operations

Full public `paymentAPI` coverage:

- Auth: `buildAuthorizeUrl(...)`, `authorizeTest(...)`, `exchangeToken(...)`
- Escrows: `createEscrow(...)`, `getEscrow(...)`, `getEscrowStatus(...)`, `releaseEscrow(...)`, `fulfillEscrowTerm(...)`, `reverseEscrow(...)`, `disputeEscrow(...)`
- OTP: `requestOtp(...)`
- Payments: `createPayment(...)`, `getPayment(...)`, `listMerchantPayments(...)`
- Disbursements: `disburse(...)`, `disbursements.get(...)`, `disbursements.list(...)`, `disbursements.cancel(...)`
- Escrow disbursements: `escrowDisburse(...)`, `escrow_disburse(...)`, `escrowDisbursements.get(...)`, `escrowDisbursements.list(...)`, `escrowDisbursements.release(...)`, `escrowDisbursements.cancel(...)`

## Configuration

```ts
const piaxis = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
  baseUrl: process.env.PIAXIS_API_BASE_URL,
  timeoutMs: 30_000,
});
```

`baseUrl` defaults to `https://api.gopiaxis.com/api`.

When the sandbox deployment is ready, point `baseUrl` to the sandbox host without changing integration code.

## Contract tests

```bash
npm install
npm run test:contract
```
