// Merchant-API request signing contract tests (independent tester).
//
// Oracle: piaxepay/piaxepay origin/master 4baf740c
//   security/external_api_auth.py :: validate_external_api_signature
//   docs/source/external_api/authentication.rst "Request signatures"
// The server signs "\n".join([METHOD.upper(), request.url.path, timestamp,
// sha256_hex(raw_body)]) with HMAC-SHA256 keyed by the merchant API key and
// compares against X-piaxis-Signature minus "sha256=". request.url.path is the
// uvicorn-percent-decoded request path (no query string). Tolerance 300 s.
// Expected vectors below were computed with the docs' Python sign_request().
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

const { PiaxisClient } = require(path.resolve(
  __dirname,
  "..",
  ".contract-test-build",
  "src",
  "index.js"
));

const KEY = "pk_test_vector_key";
const CLIENT_ID = "client-vector-1";
const FIXED_MS = 1785751200999; // floor(ms / 1000) === 1785751200

// Server path oracle = Starlette 1.3.1 request.url.path:
//  1. uvicorn 0.27.0 (httptools_impl.py / h11_impl.py): scope["path"] =
//     urllib.parse.unquote(raw_path) (utf-8, errors="replace": bad escapes stay
//     literal, invalid UTF-8 -> U+FFFD).
//  2. starlette/datastructures.py URL.__init__(scope): SplitResult(scheme,
//     netloc, path, query, "").geturl(), then .path re-runs urlsplit, which
//     (CPython 3.12 urllib/parse.py urlsplit) removes _UNSAFE_URL_BYTES_TO_REMOVE
//     ("\t", "\r", "\n") and ends the path at the first "#" or "?".
// The hard-coded server paths in the edge-case test were produced by running
// the real starlette.datastructures.URL(scope=...) on unquote(raw_path).
function starlettePath(wirePath) {
  return unquote(wirePath).replace(/[\t\r\n]/g, "").split(/[?#]/)[0];
}

// Python urllib.parse.unquote equivalent for an ASCII wire path (uvicorn).
function unquote(wirePath) {
  const bytes = [];
  for (let i = 0; i < wirePath.length; i += 1) {
    const hex = wirePath.slice(i + 1, i + 3);
    if (wirePath[i] === "%" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(wirePath[i], "utf8"));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

class SignatureError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

// Transcription of validate_external_api_signature(require_signature=True).
function verify(captured, secret, nowSeconds) {
  const signature = (captured.headers.get("x-piaxis-signature") || "").trim();
  const timestamp = (captured.headers.get("x-piaxis-timestamp") || "").trim();
  if (!secret) throw new SignatureError(403, "MERCHANT_SIGNATURE_SECRET_NOT_CONFIGURED");
  if (!signature || !timestamp) throw new SignatureError(400, "MISSING_REQUEST_SIGNATURE");
  if (!/^[+-]?\d+$/.test(timestamp)) throw new SignatureError(400, "INVALID_REQUEST_TIMESTAMP");
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) {
    throw new SignatureError(401, "STALE_REQUEST_SIGNATURE");
  }
  const bodyHash = crypto.createHash("sha256").update(captured.body).digest("hex");
  const payload = [captured.method.toUpperCase(), captured.serverPath, timestamp, bodyHash].join("\n");
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const supplied = (signature.startsWith("sha256=") ? signature.slice(7) : signature).trim();
  if (expected !== supplied) throw new SignatureError(401, "INVALID_REQUEST_SIGNATURE");
}

// Captures exactly what fetch would put on the wire: Request normalizes the
// URL/headers and yields the final body bytes.
function capturingFetch(calls, response = {}) {
  return async (url, init = {}) => {
    const request = new Request(url, init);
    const body = Buffer.from(await request.arrayBuffer());
    const parsed = new URL(request.url);
    calls.push({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body,
      serverPath: starlettePath(parsed.pathname),
    });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

function signedClient(calls, overrides = {}) {
  return new PiaxisClient({
    apiKey: KEY,
    piaxisClientId: CLIENT_ID,
    baseUrl: "https://api.gopiaxis.com/api",
    fetch: capturingFetch(calls),
    clock: () => FIXED_MS,
    ...overrides,
  });
}

const NOW = Math.floor(FIXED_MS / 1000);

test("signing: GET known vector, exact timestamp from injected ms clock, /api prefix kept", async () => {
  const calls = [];
  await signedClient(calls).payments.get("pay_vector_1");
  const [call] = calls;
  assert.equal(call.headers.get("x-piaxis-timestamp"), "1785751200");
  assert.equal(
    call.headers.get("x-piaxis-signature"),
    "sha256=5193d06774252a7723eac0f1b6e70d4fd470124cd8f95ddb2d9f49669f2676c8"
  );
  assert.equal(call.headers.get("api-key"), KEY);
  assert.equal(call.headers.get("x-piaxis-client-id"), CLIENT_ID);
  verify(call, KEY, NOW);
});

test("signing: each request reads the clock (fresh timestamp per request)", async () => {
  const calls = [];
  let ms = FIXED_MS;
  const client = signedClient(calls, { clock: () => ms });
  await client.payments.get("p1");
  ms += 61_000;
  await client.payments.get("p1");
  assert.equal(calls[0].headers.get("x-piaxis-timestamp"), "1785751200");
  assert.equal(calls[1].headers.get("x-piaxis-timestamp"), "1785751261");
  verify(calls[1], KEY, NOW + 61);
});

test("signing: query string is excluded from the signed path", async () => {
  const calls = [];
  await signedClient(calls).payments.list({ status: "completed", limit: 5, offset: 10 });
  const [call] = calls;
  assert.match(call.url, /\/api\/merchant-payments\?.*limit=5/);
  assert.equal(call.serverPath, "/api/merchant-payments");
  verify(call, KEY, NOW);
  // Negative control: the same request signed over path+query must not verify.
  assert.throws(
    () => verify({ ...call, serverPath: `${call.serverPath}${new URL(call.url).search}` }, KEY, NOW),
    { code: "INVALID_REQUEST_SIGNATURE" }
  );
});

test("signing: JSON POST signs the exact UTF-8 body bytes (non-ASCII) and keeps idempotency/client headers", async () => {
  const calls = [];
  const userInfo = { name: "Nakato Ñandú 東京 😀", phone_number: "+256700000000" };
  await signedClient(calls).payments.create({
    amount: "5000.50",
    currency: "UGX",
    paymentMethod: "mtn",
    userInfo,
  });
  const [call] = calls;
  assert.equal(call.method, "POST");
  assert.equal(call.serverPath, "/api/payments/create");
  assert.deepEqual(JSON.parse(call.body.toString("utf8")).user_info, userInfo);
  assert.ok(call.body.includes(Buffer.from("東京 😀", "utf8")));
  assert.ok(call.headers.get("x-idempotency-key"));
  assert.equal(call.headers.get("x-piaxis-client-id"), CLIENT_ID);
  verify(call, KEY, NOW);
});

test("signing: caller idempotency key preserved and escrow create (trailing slash path) verifies", async () => {
  const calls = [];
  await signedClient(calls).escrows.create(
    {
      receiverId: "acct-1",
      amount: "100",
      currencyCode: "UGX",
      paymentMethod: "mtn",
      terms: [{ type: "time", data: { release_after: "2026-12-01T00:00:00Z" } }],
      metadata: { note: "café" },
    },
    { headers: { "X-Idempotency-Key": "caller-key-1" } }
  );
  const [call] = calls;
  assert.equal(call.serverPath, "/api/escrows/");
  assert.equal(call.headers.get("x-idempotency-key"), "caller-key-1");
  verify(call, KEY, NOW);
});

test("signing: form-encoded token exchange is signed when an apiKey is configured", async () => {
  const calls = [];
  await signedClient(calls).exchangeToken({
    code: "auth code/ü",
    redirectUri: "https://merchant.example.com/oauth/callback",
    clientId: "client-1",
    clientSecret: "client-secret-1",
    codeVerifier: "verifier-1",
  });
  const [call] = calls;
  assert.match(call.headers.get("content-type"), /application\/x-www-form-urlencoded/);
  assert.equal(call.serverPath, "/api/token");
  assert.equal(new URLSearchParams(call.body.toString("utf8")).get("code"), "auth code/ü");
  verify(call, KEY, NOW);
});

test("signing: DELETE with an encodeURIComponent'd segment signs the percent-decoded path", async () => {
  const calls = [];
  await signedClient(calls).shopify.disconnect("café shop.myshopify.com");
  const [call] = calls;
  assert.equal(call.method, "DELETE");
  assert.match(call.url, /\/connect\/caf%C3%A9%20shop\.myshopify\.com$/);
  assert.equal(call.serverPath, "/api/platforms/shopify/connect/café shop.myshopify.com");
  assert.equal(
    call.headers.get("x-piaxis-signature"),
    "sha256=f7a527900efa71b44ee9c04f75857030b403f84fd78b6e9498d09953c0fbb795"
  );
  verify(call, KEY, NOW);
});

test("signing: a different base URL path prefix is part of the signed path", async () => {
  for (const baseUrl of [
    "https://sandbox.example.com/v2/piaxis-api",
    "https://sandbox.example.com/v2/piaxis-api/",
  ]) {
    const calls = [];
    await signedClient(calls, { baseUrl }).payments.get("pay_1");
    const [call] = calls;
    assert.equal(call.serverPath, "/v2/piaxis-api/payments/pay_1");
    verify(call, KEY, NOW);
  }
});

test("signing: default clock is Date.now in milliseconds -> UNIX seconds", async () => {
  const calls = [];
  const before = Math.floor(Date.now() / 1000);
  await signedClient(calls, { clock: undefined }).payments.get("p1");
  const after = Math.floor(Date.now() / 1000);
  const ts = Number(calls[0].headers.get("x-piaxis-timestamp"));
  assert.ok(ts >= before && ts <= after, `timestamp ${ts} not in [${before}, ${after}]`);
  verify(calls[0], KEY, after);
});

test("signing: OAuth accessToken-only client sends no signature headers", async () => {
  const calls = [];
  const client = new PiaxisClient({
    accessToken: "oauth-token-1",
    baseUrl: "https://api.gopiaxis.com/api",
    fetch: capturingFetch(calls),
    clock: () => FIXED_MS,
  });
  await client.payments.create({ amount: "1", currency: "UGX", paymentMethod: "mtn" });
  const [call] = calls;
  assert.equal(call.headers.get("authorization"), "Bearer oauth-token-1");
  assert.equal(call.headers.get("x-piaxis-signature"), null);
  assert.equal(call.headers.get("x-piaxis-timestamp"), null);
  assert.equal(call.headers.get("api-key"), null);
  assert.ok(call.headers.get("x-idempotency-key"));
});

test("signing: verifier rejects wrong key, tampered body, and stale timestamps (boundary 300 s)", async () => {
  const calls = [];
  await signedClient(calls).payments.create({ amount: "10", currency: "UGX", paymentMethod: "mtn" });
  const [call] = calls;
  verify(call, KEY, NOW);
  assert.throws(() => verify(call, "pk_test_other_key", NOW), { status: 401, code: "INVALID_REQUEST_SIGNATURE" });
  const tampered = Buffer.from(call.body.toString("utf8").replace('"10"', '"11"'), "utf8");
  assert.notDeepEqual(tampered, call.body);
  assert.throws(() => verify({ ...call, body: tampered }, KEY, NOW), { code: "INVALID_REQUEST_SIGNATURE" });
  const reserialized = Buffer.from(JSON.stringify(JSON.parse(call.body.toString("utf8")), null, 1));
  assert.throws(() => verify({ ...call, body: reserialized }, KEY, NOW), { code: "INVALID_REQUEST_SIGNATURE" });
  verify(call, KEY, NOW + 300);
  verify(call, KEY, NOW - 300);
  assert.throws(() => verify(call, KEY, NOW + 301), { status: 401, code: "STALE_REQUEST_SIGNATURE" });
  assert.throws(() => verify(call, KEY, NOW - 301), { status: 401, code: "STALE_REQUEST_SIGNATURE" });
});

{
  // Path edge cases must match Starlette request.url.path.
  // [label, call, wire path suffix, server path from real Starlette/unquote]
  const cases = [
    ["%zz kept literal", (c) => c.payments.get("pay%zz"), "/api/payments/pay%zz", "/api/payments/pay%zz"],
    ["invalid UTF-8 -> U+FFFD", (c) => c.payments.get("pay%FF%C3%A9%E2%82z"),
      "/api/payments/pay%FF%C3%A9%E2%82z", "/api/payments/pay\ufffd\u00e9\ufffdz"],
    ["decoded ? ends path", (c) => c.shopify.disconnect("a?b.myshopify.com"),
      "/api/platforms/shopify/connect/a%3Fb.myshopify.com", "/api/platforms/shopify/connect/a"],
    ["decoded # ends path", (c) => c.shopify.disconnect("a#b.myshopify.com"),
      "/api/platforms/shopify/connect/a%23b.myshopify.com", "/api/platforms/shopify/connect/a"],
    ["decoded tab/LF/CR dropped", (c) => c.shopify.disconnect("a\tb\nc\rd.myshopify.com"),
      "/api/platforms/shopify/connect/a%09b%0Ac%0Dd.myshopify.com", "/api/platforms/shopify/connect/abcd.myshopify.com"],
    ["literal %0A in raw id dropped", (c) => c.payments.get("a%0Ab"), "/api/payments/a%0Ab", "/api/payments/ab"],
  ];
  for (const [label, run, wirePath, serverPath] of cases) {
    test(`signing edge: ${label}`, async () => {
      const calls = [];
      await run(signedClient(calls));
      const [call] = calls;
      assert.equal(new URL(call.url).pathname, wirePath, label);
      assert.equal(call.serverPath, serverPath, label);
      assert.doesNotThrow(() => verify(call, KEY, NOW), label);
    });
  }
}

test("signing edge: exact vector for GET pay%zz", async () => {
  // Exact vector for the GET %zz case (computed in Python with the server formula).
  const calls = [];
  await signedClient(calls).payments.get("pay%zz");
  assert.equal(
    calls[0].headers.get("x-piaxis-signature"),
    "sha256=77b96b5bc14006f7e7bdfa830a804b02d5ae9be9c3a5ec2318b672717a76297a"
  );
});
