#!/usr/bin/env node
// Opt-in cross-check: real SDK requests over real HTTP against the API's own
// security/external_api_auth.py::validate_external_api_signature
// (piaxepay/piaxepay origin/master 4baf740c), served by uvicorn + Starlette.
//
//   PIAXIS_API_DIR=<export with security/ piaxis/ helpers/> \
//   PIAXIS_API_PYTHON=<python with fastapi/starlette/uvicorn> \
//   node scripts/cross-check-api-signature.mjs
//
// Requires the contract build (npm run test:contract). Missing inputs => exit 2
// with "SKIPPED"; a skip is not a pass. Never loads any .env: the Python child
// gets a minimal environment with PIAXE_TEST_MODE=1 and throwaway secrets.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = process.env.PIAXIS_API_DIR;
const python = process.env.PIAXIS_API_PYTHON;
const sdkEntry = join(root, ".contract-test-build", "src", "index.js");

function skip(reason) {
  console.error(`SKIPPED (not a pass): ${reason}`);
  process.exit(2);
}
if (!apiDir || !existsSync(join(apiDir, "security", "external_api_auth.py"))) {
  skip("set PIAXIS_API_DIR to an export containing security/external_api_auth.py");
}
if (!python || !existsSync(python)) skip("set PIAXIS_API_PYTHON to a Python with fastapi/starlette/uvicorn");
if (!existsSync(sdkEntry)) skip("run `npm run test:contract` first to build .contract-test-build");

const { PiaxisClient } = createRequire(import.meta.url)(sdkEntry);
const secret = `pk_test_${randomBytes(24).toString("hex")}`;
const b64 = () => randomBytes(32).toString("base64url");
const cwd = mkdtempSync(join(tmpdir(), "piaxis-xcheck-")); // no .env here

async function startServer(httpImpl) {
  const child = spawn(
    python,
    ["-m", "uvicorn", "api_signature_app:app", "--host", "127.0.0.1", "--port", "0", "--http", httpImpl],
    {
      cwd,
      env: {
        PATH: "/usr/bin:/bin",
        HOME: cwd,
        PIAXE_TEST_MODE: "1",
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONPATH: `${join(root, "scripts", "cross-check")}:${apiDir}`,
        PIAXIS_XCHECK_SECRET: secret,
        SECRET_KEY: b64(),
        REFRESH_TOKEN_SECRET_KEY: b64(),
        FERNET_KEY: randomBytes(32).toString("base64url") + "=",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  let log = "";
  const started = new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error(`uvicorn did not start:\n${log}`)), 20000);
    const onData = (chunk) => {
      log += chunk;
      const match = log.match(/running on http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolvePort(Number(match[1]));
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`uvicorn exited ${code}:\n${log}`)));
  });
  try {
    return { child, port: await started };
  } catch (error) {
    await stopServer(child);
    throw error;
  }
}

// Terminate and reap the uvicorn child (SIGKILL if SIGTERM is ignored for 5 s).
async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((done) => child.once("exit", done));
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await exited;
  clearTimeout(timer);
}

function cases(baseUrl) {
  // Each request's response (or the SDK error) is recorded by the fetch shim.
  const make = (opts = {}) => new PiaxisClient({ apiKey: secret, piaxisClientId: "xcheck-client", baseUrl, ...opts });
  return [
    ["GET payments.get", "200 OK", (c) => c.payments.get("pay_123")],
    ["GET payments.list with query", "200 OK", (c) => c.payments.list({ status: "completed", limit: 5 })],
    ["POST payments.create non-ASCII body", "200 OK", (c) =>
      c.payments.create({ amount: "5000.50", currency: "UGX", paymentMethod: "mtn",
        userInfo: { name: "Nakato Ñandú 東京 😀", phone_number: "+256700000000" } })],
    ["POST escrows.create (trailing slash)", "200 OK", (c) =>
      c.escrows.create({ receiverId: "acct-1", amount: "100", currencyCode: "UGX", paymentMethod: "mtn",
        terms: [{ type: "time", data: { release_after: "2026-12-01T00:00:00Z" } }], metadata: { note: "café" } })],
    ["POST form exchangeToken", "200 OK", (c) =>
      c.exchangeToken({ code: "auth code/ü", redirectUri: "https://merchant.example.com/cb",
        clientId: "client-1", clientSecret: "s", codeVerifier: "v" })],
    ["DELETE shopify.disconnect encoded segment", "200 OK", (c) => c.shopify.disconnect("café shop.myshopify.com")],
    ["GET other base prefix /v2/piaxis-api", "200 OK", (c) => c.payments.get("pay_1"),
      { baseUrl: baseUrl.replace(/\/api$/, "/v2/piaxis-api/") }],
    ["GET id with bad escape %zz", "200 OK", (c) => c.payments.get("pay%zz")],
    ["GET id with invalid UTF-8 %FF", "200 OK", (c) => c.payments.get("pay%FF%C3%A9%E2%82z")],
    ["DELETE shop with ?", "200 OK", (c) => c.shopify.disconnect("a?b.myshopify.com")],
    ["DELETE shop with #", "200 OK", (c) => c.shopify.disconnect("a#b.myshopify.com")],
    ["DELETE shop with tab/LF/CR", "200 OK", (c) => c.shopify.disconnect("a\tb\nc\rd.myshopify.com")],
    ["GET id with literal %0A", "200 OK", (c) => c.payments.get("a%0Ab")],
    ["GET id with BOM %EF%BB%BF", "200 OK", (c) => c.payments.get("a%EF%BB%BFb")],
    ["DELETE shop with U+FEFF", "200 OK", (c) => c.shopify.disconnect("a\ufeffb.myshopify.com")],
    ["GET id with two leading BOMs", "200 OK", (c) => c.payments.get("%EF%BB%BF%EF%BB%BFx")],
    ["NEG wrong key", "401 INVALID_REQUEST_SIGNATURE", (c) => c.payments.get("pay_123"), { apiKey: "pk_test_wrong_key" }],
    ["NEG clock skewed -10 min", "401 STALE_REQUEST_SIGNATURE", (c) => c.payments.get("pay_123"), { clock: () => Date.now() - 600_000 }],
    ["NEG clock skewed +10 min", "401 STALE_REQUEST_SIGNATURE", (c) => c.payments.get("pay_123"), { clock: () => Date.now() + 600_000 }],
    ["NEG accessToken only (unsigned)", "400 MISSING_REQUEST_SIGNATURE", (c) => c.payments.get("pay_123"), { apiKey: undefined, accessToken: "oauth" }],
  ].map(([name, expected, run, opts]) => ({ name, expected, run, make: () => make(opts) }));
}

async function runAll(httpImpl) {
  const { child, port } = await startServer(httpImpl);
  const results = [];
  try {
    for (const c of cases(`http://127.0.0.1:${port}/api`)) {
      let observed;
      const realFetch = globalThis.fetch;
      globalThis.fetch = async (...args) => {
        const res = await realFetch(...args);
        observed = { status: res.status, body: await res.clone().json() };
        return res;
      };
      try {
        await c.run(c.make());
      } catch {
        // SDK raises on non-2xx; the observed status is what matters.
      } finally {
        globalThis.fetch = realFetch;
      }
      const detail = observed?.body?.detail?.code ?? (observed?.body?.ok ? "OK" : "");
      const got = `${observed?.status} ${detail}`;
      const ok = got === c.expected;
      results.push(ok);
      console.log(`${ok ? "PASS" : "FAIL"} [${httpImpl}] ${c.name}: expected ${c.expected}, got ${got} path=${JSON.stringify(observed?.body?.path)}`);
    }
  } finally {
    await stopServer(child);
  }
  return results;
}

let all = [];
try {
  for (const impl of ["httptools", "h11"]) all = all.concat(await runAll(impl));
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
const failed = all.filter((ok) => !ok).length;
console.log(`${all.length - failed}/${all.length} cross-check cases matched`);
process.exit(failed ? 1 : 0);
