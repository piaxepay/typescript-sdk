# TypeScript SDK Architecture

This repository is the standalone JavaScript and TypeScript distribution for the Piaxis partner API.

## Repository Layout

- `src/`: runtime client, resources, transforms, and types
- `tests/`: contract-focused tests using the checked-in fixture file
- `contracts/payment-api-fixtures.json`: API fixture snapshot used by the contract tests
- `examples/`: runnable integration examples
- `scripts/run-contract-tests.cjs`: builds a CommonJS contract-test bundle and runs Node tests
- `.github/workflows/`: CI and release automation

## Design Rules

- Preserve a predictable one-to-one mapping between API resources and SDK methods.
- Keep request/response normalization inside the SDK rather than in consumer examples.
- Emit both ESM and CommonJS bundles so the package works in modern and legacy Node projects.
- Keep the fixture file aligned with the public API contract before release.

## Testing Strategy

- `npm run typecheck` validates TypeScript surfaces.
- `npm run test:contract` compiles a CommonJS test build and asserts behavior against fixture data.
- `npm run build` produces the publishable package output in `dist/`.

## Release Discipline

- Bump versions with semantic versioning.
- Update README and examples when new endpoints are added.
- Publish only after typecheck, contract tests, build, and pack validation succeed.
