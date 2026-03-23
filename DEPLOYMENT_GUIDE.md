# TypeScript SDK Deployment Guide

This repository publishes the `@piaxis/sdk` package to npm.

## Prerequisites

1. Node.js 22+ installed locally.
2. npm publish access for `@piaxis/sdk`.
3. A clean working tree.

## Release Steps

1. Update the version in `package.json`.
2. Verify the README and examples reflect the current API.
3. Run local verification:

```bash
npm install
npm run typecheck
npm run test:contract
npm run build
npm pack --dry-run
```

4. Publish the first release locally only if the package does not exist yet:

```bash
npm publish --access public --provenance
```

5. Configure npm trusted publishing for future releases:

```bash
npx npm@11.11.1 trust github @piaxis/sdk \
  --repo piaxepay/typescript-sdk \
  --file release-typescript.yml \
  --env npm \
  --yes
```

6. After trusted publishing is configured, release from GitHub Actions by tag:

```bash
git tag v0.2.0
git push origin v0.2.0
```

## GitHub Actions

- `ci.yml` runs validation on pushes and pull requests.
- `release-typescript.yml` publishes on tags or by manual dispatch.
- The release job uses the GitHub environment `npm`.

Recommended tag format:

- `v0.2.0`

## Post-Release Checks

1. Confirm the package version appears on npm.
2. Install it in a fresh sample project.
3. Run one sandbox call against `https://sandbox.api.gopiaxis.com/api`.
