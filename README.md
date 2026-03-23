# Piaxis TypeScript SDK

Official JavaScript and TypeScript SDK for the Piaxis partner API.

- Package: `@piaxis/sdk`
- Repository: `https://github.com/piaxepay/typescript-sdk`
- API docs: `https://docs.gopiaxis.com/api/payments/`
- Python SDK: `https://github.com/piaxepay/python-sdk`

## Install

```bash
npm install @piaxis/sdk
```

## Quick Start

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
});

const payment = await client.createPayment({
  amount: "15000",
  currency: "UGX",
  paymentMethod: "mtn",
  userInfo: {
    email: "buyer@example.com",
    phone_number: "+256700000000",
    otp: "123456",
  },
});

console.log(payment.paymentId);
```

Environment-based setup:

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env);
```

Supported environment variables:

- `PIAXIS_API_KEY`
- `PIAXIS_ACCESS_TOKEN`
- `PIAXIS_API_BASE_URL`

The default base URL is `https://api.gopiaxis.com/api`.

## Supported Operations

Full public `paymentAPI` coverage:

- Auth: `buildAuthorizeUrl(...)`, `authorizeTest(...)`, `exchangeToken(...)`
- Escrows: `createEscrow(...)`, `getEscrow(...)`, `getEscrowStatus(...)`, `releaseEscrow(...)`, `fulfillEscrowTerm(...)`, `reverseEscrow(...)`, `disputeEscrow(...)`
- OTP: `requestOtp(...)`
- Payments: `createPayment(...)`, `getPayment(...)`, `listMerchantPayments(...)`
- Disbursements: `disburse(...)`, `disbursements.get(...)`, `disbursements.list(...)`, `disbursements.cancel(...)`
- Escrow disbursements: `escrowDisburse(...)`, `escrow_disburse(...)`, `escrowDisbursements.get(...)`, `escrowDisbursements.list(...)`, `escrowDisbursements.release(...)`, `escrowDisbursements.cancel(...)`

## Examples

- `examples/oauth-flow.mjs`
- `examples/direct-payment.mjs`
- `examples/escrow-flow.mjs`
- `examples/disbursement-flow.mjs`

## Local Development

```bash
npm install
npm run typecheck
npm run test:contract
npm run build
npm pack --dry-run
```

## Publishing

Steady-state releases should go through the GitHub Actions trusted publisher in
`.github/workflows/release-typescript.yml`.

```bash
git tag v0.2.0
git push origin v0.2.0
```

Bootstrap note:

- The very first npm publish may still need a locally authenticated maintainer
  session because npm trusted publishing can only be attached after the package
  already exists on the registry.
