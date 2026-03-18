# SDK and Sandbox Architecture

## SDK structure

Use a separate SDK project instead of placing partner client code inside `piaxis-api`.

Why:

- SDK releases need their own versioning and changelog cadence.
- Multiple language SDKs can live under one `sdks/` umbrella.
- The backend stays focused on API behavior, not package distribution concerns.
- CI for SDK packaging and contract checks can evolve independently.

Recommended layout:

- `sdks/typescript`
- `sdks/python`
- `sdks/php`
- `sdks/contracts`
- shared contract generation later, driven from the public OpenAPI spec

## TypeScript SDK direction

The initial SDK should optimize for the common merchant path:

- `client.disburse(...)`
- `client.escrowDisburse(...)`
- `client.escrow_disburse(...)` as a convenience alias

Then expand into richer modules:

- `client.disbursements.get(...)`
- `client.disbursements.list(...)`
- `client.disbursements.cancel(...)`
- `client.createEscrow(...)`
- `client.getEscrow(...)`
- `client.getEscrowStatus(...)`
- `client.releaseEscrow(...)`
- `client.fulfillEscrowTerm(...)`
- `client.reverseEscrow(...)`
- `client.disputeEscrow(...)`
- `client.requestOtp(...)`
- `client.createPayment(...)`
- `client.getPayment(...)`
- `client.listMerchantPayments(...)`
- `client.escrowDisbursements.get(...)`
- `client.escrowDisbursements.release(...)`
- `client.escrowDisbursements.cancel(...)`

## Sandbox recommendation

Do not use the live API as the main sandbox, even with test keys.

Best approach:

1. Run a separate sandbox deployment with the same `/api` contract.
2. Keep sandbox state isolated: separate DB, Redis, queues, webhook secrets, and callback allowlists.
3. Issue distinct sandbox keys and merchants.
4. Let the SDK switch by `baseUrl`, not by changing method names.

Suggested URLs:

- Live: `https://api.gopiaxis.com/api`
- Sandbox: `https://sandbox.api.gopiaxis.com/api`

## Provider strategy

Treat sandboxing as a rail-by-rail concern behind one Piaxis contract.

- MTN: use the real provider sandbox where it behaves well enough.
- Airtel: use a Piaxis-managed simulator for most partner testing because Airtel sandbox flows are too restrictive.

That simulator should support deterministic scenarios:

- success
- pending then success
- insufficient funds
- invalid recipient
- timeout
- callback signature validation

Partners should test against Piaxis behavior, not against each provider's inconsistent sandbox UX.

## Operational rules

- Never mix live and sandbox webhooks.
- Prefix secrets and keys by environment.
- Store every sandbox callback and allow replay from an admin tool.
- Keep request and webhook payload shapes identical between live and sandbox.
- Add contract tests so the SDK always targets the same shape in both environments.
- Keep shared fixtures in `sdks/contracts` so both language SDKs assert the same contract.
