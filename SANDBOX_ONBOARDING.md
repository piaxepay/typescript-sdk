# TypeScript SDK Sandbox Onboarding

Use this guide to validate a JavaScript or TypeScript integration against the Piaxis sandbox.

## Install

```bash
npm install @piaxis/sdk
```

## Environment Variables

```bash
export PIAXIS_API_KEY="your_sandbox_api_key"
export PIAXIS_API_BASE_URL="https://sandbox.api.gopiaxis.com/api"
```

## Smoke Test

```ts
import { PiaxisClient } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env);
const authorizeUrl = client.buildAuthorizeUrl({
  merchantId: "merchant-123",
  externalUserId: "external-user-789",
  redirectUri: "https://merchant.example.com/oauth/callback",
});

console.log(authorizeUrl);
```

## Example Flows

- `examples/oauth-flow.mjs`
- `examples/direct-payment.mjs`
- `examples/escrow-flow.mjs`
- `examples/disbursement-flow.mjs`

## Related Resources

- API docs: `https://api.gopiaxis.com/api/docs/`
- Python SDK: `https://github.com/piaxepay/python-sdk`
