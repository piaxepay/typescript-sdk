# SDK Deployment Guide

This document shows how to publish the Piaxis SDKs for JavaScript/TypeScript and Python.

The release and CI workflows already exist in:

- `sdks/.github/workflows/ci.yml`
- `sdks/.github/workflows/release-typescript.yml`
- `sdks/.github/workflows/release-python.yml`

## Release model

Use one release flow per SDK:

- JavaScript/TypeScript SDK from `sdks/typescript`
- Python SDK from `sdks/python`

Recommended versioning:

- keep both SDKs aligned to the same API milestone where possible
- use semantic versioning
- bump major for breaking API or SDK behavior changes
- bump minor for new endpoints and backward-compatible features
- bump patch for fixes and docs-only improvements that do not change runtime behavior

## Before every release

1. Confirm the public `/api` contract you are releasing against.
2. Update the package version.
3. Update changelog or release notes.
4. Run local verification.
5. Publish to the registry.
6. Tag the release in git.

## JavaScript/TypeScript SDK

Source of truth:

- `sdks/typescript`

### Prerequisites

1. Node.js 22+ installed.
2. npm publish access to the target package name.
3. Preferred: npm trusted publishing configured for the SDK repo.
4. Fallback: `NPM_TOKEN` stored in GitHub Actions secrets.

### Local release steps

1. Move into the package directory:

```bash
cd sdks/typescript
```

2. Install dependencies:

```bash
npm install
```

3. Update the package version:

```bash
npm version patch
```

Use `minor` or `major` when appropriate.

4. Run checks:

```bash
npm run typecheck
npm run test:contract
npm run build
```

5. Inspect the packed output:

```bash
npm pack --dry-run
```

6. Publish:

```bash
npm publish --access public --provenance
```

### CI publishing flow

1. Push a tag like `sdk-js-v0.2.0`, or run `Release TypeScript SDK` manually.
2. The workflow will:

```bash
cd sdks/typescript
npm install
npm run typecheck
npm run test:contract
npm run build
npm pack --dry-run
npm publish --access public --provenance
```

3. If trusted publishing is not configured yet, the workflow uses `NODE_AUTH_TOKEN` from `NPM_TOKEN`.

## Python SDK

Source of truth:

- `sdks/python`

### Prerequisites

1. Python 3.11+ installed.
2. Preferred: PyPI trusted publishing configured for the SDK repo.
3. Fallback: PyPI API token or username/password credentials available for manual publishing.

### Local release steps

1. Move into the package directory:

```bash
cd sdks/python
```

2. Create or activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

3. Install build tooling:

```bash
python3 -m pip install --upgrade pip build twine
python3 -m pip install -e .
```

4. Update the version in `pyproject.toml`.

5. Run checks:

```bash
python3 -m compileall src
python3 -m unittest discover -s tests -p "test_*.py"
```

6. Build source and wheel distributions:

```bash
python3 -m build
```

7. Validate the package metadata:

```bash
python3 -m twine check dist/*
```

8. Publish:

```bash
python3 -m twine upload dist/*
```

### CI publishing flow

1. Push a tag like `sdk-py-v0.2.0`, or run `Release Python SDK` manually.
2. The workflow will:

```bash
cd sdks/python
python3 -m pip install --upgrade pip build twine
python3 -m pip install -e .
python3 -m compileall src
python3 -m unittest discover -s tests -p "test_*.py"
python3 -m build
python3 -m twine check dist/*
```

3. The publish step uses `pypa/gh-action-pypi-publish`.

## CI expectations

The shared CI workflow should stay green before any release:

- TypeScript: `npm run typecheck`, `npm run test:contract`, `npm run build`
- Python: `python3 -m compileall src`, `python3 -m unittest discover -s tests -p "test_*.py"`

## Registry and naming guidance

Recommended public names:

- JavaScript/TypeScript: `@piaxis/sdk`
- Python: `piaxis-sdk`

If these names are already taken, choose names that still clearly map to Piaxis.

## Git tagging

Suggested tag formats:

- `sdk-js-v0.1.0`
- `sdk-py-v0.1.0`

Or if you want one coordinated release:

- `sdk-v0.1.0`

## Post-release checklist

1. Verify the package appears on npm or PyPI.
2. Install it in a clean sample project.
3. Run a real request against sandbox.
4. Confirm the example files still work.
5. Announce the release with install and upgrade notes.
