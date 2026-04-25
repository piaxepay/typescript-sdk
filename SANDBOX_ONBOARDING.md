# TypeScript SDK Sandbox Onboarding

Use this guide to validate a JavaScript or TypeScript integration against the Piaxis sandbox.

## Install

```bash
npm install @piaxis/sdk
```

## Environment Variables

```bash
export PIAXIS_API_KEY="your_sandbox_api_key"
export PIAXIS_OAUTH_CLIENT_ID="your_oauth_client_id"
export PIAXIS_API_BASE_URL="https://sandbox.api.gopiaxis.com/api"
```

The SDK enforces HTTPS base URLs except for explicit localhost testing.

## Smoke Test

```ts
import { PiaxisClient, generatePkcePair } from "@piaxis/sdk";

const client = PiaxisClient.fromEnv(process.env);
const pkce = generatePkcePair();
const authorizeUrl = client.buildAuthorizeUrl({
  merchantId: "merchant-123",
  externalUserId: "external-user-789",
  redirectUri: "https://merchant.example.com/oauth/callback",
  state: "sandbox-state-123",
  codeChallenge: pkce.codeChallenge,
  codeChallengeMethod: pkce.codeChallengeMethod,
});

console.log(authorizeUrl);
```

`redirectUri` values used in sandbox OAuth tests must already be registered for the merchant and should use HTTPS unless you are targeting localhost during development. If you use the SDK's browserless `authorizeTest(...)` helper, treat it as a merchant-admin-only test tool rather than a public client flow.

## Example Flows

- `examples/oauth-flow.mjs`
- `examples/direct-payment.mjs`
- `examples/escrow-flow.mjs`
- `examples/disbursement-flow.mjs`

## Related Resources

- API docs: `https://api.gopiaxis.com/api/docs/`
- Python SDK: `https://github.com/piaxepay/python-sdk`
