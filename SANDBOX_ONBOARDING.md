# Piaxis Sandbox Onboarding

This guide is for partners integrating only with `piaxis-api/paymentAPI`.

## What Piaxis provides

Before a partner can test, Piaxis should provision a sandbox merchant and send:

- `PIAXIS_API_BASE_URL`
- `PIAXIS_API_KEY`
- `PIAXIS_MERCHANT_ID`
- `PIAXIS_OAUTH_CLIENT_ID`
- `PIAXIS_OAUTH_CLIENT_SECRET`
- allowed OAuth redirect URIs
- webhook target registration details if webhooks are enabled for that merchant

Recommended sandbox base URL:

- `https://sandbox.api.gopiaxis.com/api`

## Step 1: Install an SDK

JavaScript:

```bash
npm install @piaxis/sdk
```

Python:

```bash
pip install piaxis-sdk
```

## Step 2: Set sandbox environment variables

Minimum merchant setup:

```bash
export PIAXIS_API_BASE_URL="https://sandbox.api.gopiaxis.com/api"
export PIAXIS_API_KEY="sandbox_api_key"
export PIAXIS_MERCHANT_ID="sandbox_merchant_id"
```

For `piaxis_external` OAuth flows:

```bash
export PIAXIS_OAUTH_CLIENT_ID="sandbox_oauth_client_id"
export PIAXIS_OAUTH_CLIENT_SECRET="sandbox_oauth_client_secret"
export PIAXIS_REDIRECT_URI="https://merchant.example.com/oauth/callback"
```

## Step 3: Verify OTP flow for external rails

For `mtn`, `airtel`, or `card` payment methods, request an OTP first, then pass the OTP back inside `user_info`.

Important detail:

- top-level SDK fields are language-friendly
- nested `user_info` values still need the API field names the backend expects, such as `phone_number` and `otp`

Reference examples:

- [direct-payment.mjs](/Users/jc/dev/projects/piaxis/sdks/typescript/examples/direct-payment.mjs)
- [direct_payment.py](/Users/jc/dev/projects/piaxis/sdks/python/examples/direct_payment.py)

## Step 4: Verify OAuth for `piaxis_external`

1. Build the authorize URL with the SDK.
2. Redirect the user to that URL in the browser.
3. Receive the authorization `code` on the merchant redirect URI.
4. Exchange the code for tokens with `/token`.
5. Use the returned access token when creating `piaxis_external` payments or escrows.

Reference examples:

- [oauth-flow.mjs](/Users/jc/dev/projects/piaxis/sdks/typescript/examples/oauth-flow.mjs)
- [oauth_flow.py](/Users/jc/dev/projects/piaxis/sdks/python/examples/oauth_flow.py)

## Step 5: Run the three core sandbox checks

Partners should complete all three before asking for production access.

1. Direct payment
   Create a payment with `mtn`, `airtel`, or `piaxis_external`.
2. Escrow flow
   Create an escrow, fetch status, then fulfill, release, or reverse it.
3. Disbursement flow
   Run both a direct disbursement and an escrow disbursement batch.

Reference examples:

- [escrow-flow.mjs](/Users/jc/dev/projects/piaxis/sdks/typescript/examples/escrow-flow.mjs)
- [escrow_flow.py](/Users/jc/dev/projects/piaxis/sdks/python/examples/escrow_flow.py)
- [disbursement-flow.mjs](/Users/jc/dev/projects/piaxis/sdks/typescript/examples/disbursement-flow.mjs)
- [disbursement_flow.py](/Users/jc/dev/projects/piaxis/sdks/python/examples/disbursement_flow.py)

## Step 6: Webhook verification

If Piaxis enables webhooks for the merchant, treat sandbox webhooks as a required check before production.

Current backend signature behavior:

- Piaxis sends JSON with `data` and `timestamp`
- signature header: `X-piaxis-Signature`
- signature algorithm: HMAC-SHA256
- signed content: the raw JSON payload body

Operational rule:

- never reuse live webhook secrets in sandbox

## Step 7: Rail behavior in sandbox

Sandboxing is rail-specific behind one Piaxis contract:

- MTN should use the real provider sandbox where possible
- Airtel should usually be simulated by Piaxis because provider-side testing is too restrictive

Partners should test expected scenarios, not only happy-path success:

- success
- pending then success
- invalid recipient
- insufficient funds
- timeout or delayed callback

## Step 8: Production readiness handoff

Before live keys are issued, confirm:

1. direct payment flow works
2. escrow flow works
3. disbursement flow works
4. webhook verification works if enabled
5. partner is using the SDK against the sandbox base URL, not hardcoding live URLs

## Related files

- [README.md](/Users/jc/dev/projects/piaxis/sdks/README.md)
- [ARCHITECTURE.md](/Users/jc/dev/projects/piaxis/sdks/ARCHITECTURE.md)
- [DEPLOYMENT_GUIDE.md](/Users/jc/dev/projects/piaxis/sdks/DEPLOYMENT_GUIDE.md)
