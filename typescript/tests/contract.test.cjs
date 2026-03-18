const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixtures = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "..", "..", "contracts", "payment-api-fixtures.json"),
    "utf8"
  )
);

const { PiaxisClient } = require(path.resolve(
  __dirname,
  "..",
  ".contract-test-build",
  "src",
  "index.js"
));

function createMockFetch(responses, calls) {
  return async (url, init = {}) => {
    const headers = Object.fromEntries(new Headers(init.headers ?? {}).entries());
    calls.push({
      url: String(url),
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });

    const payload = responses.shift();
    if (!payload) {
      throw new Error(`No mock response queued for ${init.method ?? "GET"} ${url}`);
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
}

test("auth helpers cover authorize and token exchange", async () => {
  const calls = [];
  const client = new PiaxisClient({
    baseUrl: "https://sandbox.api.gopiaxis.com/api",
    fetch: createMockFetch(
      [fixtures.authorize_test.response, fixtures.token.response],
      calls
    ),
  });

  const authorizeUrl = client.buildAuthorizeUrl({
    merchantId: "merchant-123",
    externalUserId: "external-user-789",
    redirectUri: "https://merchant.example.com/oauth/callback",
  });

  assert.equal(
    authorizeUrl,
    "https://sandbox.api.gopiaxis.com/api/authorize?merchant_id=merchant-123&external_user_id=external-user-789&redirect_uri=https%3A%2F%2Fmerchant.example.com%2Foauth%2Fcallback"
  );

  const authorizeResponse = await client.authorizeTest({
    merchantId: "merchant-123",
    externalUserId: "external-user-789",
    redirectUri: "https://merchant.example.com/oauth/callback",
  });
  const tokenResponse = await client.exchangeToken({
    code: "auth-code-123",
    redirectUri: "https://merchant.example.com/oauth/callback",
    clientId: "client_123",
    clientSecret: "secret_456",
  });

  assert.equal(authorizeResponse.redirectUrl, fixtures.authorize_test.response.redirect_url);
  assert.equal(tokenResponse.accessToken, fixtures.token.response.access_token);

  const authorizeCall = calls[0];
  const authorizeUrlParsed = new URL(authorizeCall.url);
  assert.equal(authorizeCall.method, "GET");
  assert.equal(authorizeCall.headers["x-test-request"], "true");
  assert.equal(authorizeCall.headers["api-key"], undefined);
  assert.equal(authorizeUrlParsed.pathname, "/api/authorize");
  assert.equal(authorizeUrlParsed.searchParams.get("merchant_id"), "merchant-123");

  const tokenCall = calls[1];
  const tokenUrlParsed = new URL(tokenCall.url);
  assert.equal(tokenCall.method, "POST");
  assert.equal(tokenCall.body, undefined);
  assert.equal(tokenUrlParsed.pathname, "/api/token");
  assert.equal(tokenUrlParsed.searchParams.get("grant_type"), "authorization_code");
  assert.equal(tokenUrlParsed.searchParams.get("client_id"), "client_123");
});

test("OTP and direct payment helpers serialize requests and normalize responses", async () => {
  const calls = [];
  const client = new PiaxisClient({
    apiKey: "test_api_key",
    baseUrl: "https://sandbox.api.gopiaxis.com/api",
    fetch: createMockFetch(
      [
        fixtures.otp_request.response,
        fixtures.payment_create.response,
        fixtures.payment_details.response,
        fixtures.payment_list.response,
      ],
      calls
    ),
  });

  const otpResponse = await client.requestOtp({
    email: "buyer@example.com",
    phoneNumber: "+256700000000",
  });
  const paymentResponse = await client.createPayment(
    {
      amount: "15000",
      currency: "UGX",
      paymentMethod: "mtn",
      userInfo: {
        email: "buyer@example.com",
        phone_number: "+256700000000",
        otp: "123456",
      },
      customerPaysFees: true,
    },
    { mfaCode: "654321" }
  );
  const paymentDetails = await client.getPayment("pay_123");
  const paymentList = await client.listMerchantPayments({
    status: "pending",
    paymentMethod: "mtn",
    limit: 20,
    offset: 0,
  });

  assert.deepEqual(otpResponse.verificationMethods, {
    emailSent: true,
    phoneSent: true,
  });
  assert.equal(paymentResponse.paymentId, "pay_123");
  assert.equal(paymentDetails.paymentMethod, "mtn");
  assert.equal(paymentList.results[0].paymentId, "pay_123");

  assert.equal(calls[0].body.phone_number, "+256700000000");
  assert.equal(calls[0].headers["api-key"], "test_api_key");

  const paymentCall = calls[1];
  const paymentUrl = new URL(paymentCall.url);
  assert.equal(paymentCall.body.payment_method, "mtn");
  assert.equal(paymentCall.body.customer_pays_fees, true);
  assert.equal(paymentUrl.searchParams.get("mfa_code"), "654321");
});

test("escrow helpers cover create, read, status, fulfillment, release, reverse, and dispute", async () => {
  const calls = [];
  const client = new PiaxisClient({
    apiKey: "test_api_key",
    baseUrl: "https://sandbox.api.gopiaxis.com/api",
    fetch: createMockFetch(
      [
        fixtures.escrow_create.response,
        fixtures.escrow_create.response,
        fixtures.escrow_status.response,
        fixtures.escrow_release.response,
        fixtures.escrow_fulfill_term.response,
        fixtures.escrow_reverse.response,
        fixtures.escrow_dispute.response,
      ],
      calls
    ),
  });

  const createdEscrow = await client.createEscrow({
    receiverId: "22222222-2222-2222-2222-222222222222",
    amount: "50000",
    currencyCode: "UGX",
    paymentMethod: "mtn",
    userInfo: {
      email: "buyer@example.com",
      phone_number: "+256700000000",
      otp: "123456",
    },
    terms: [{ type: "manual_release", data: {} }],
  });
  const fetchedEscrow = await client.getEscrow(createdEscrow.id);
  const escrowStatus = await client.getEscrowStatus(createdEscrow.id);
  const releaseResponse = await client.releaseEscrow(createdEscrow.id, {
    force: true,
    reason: "Manual merchant release",
  });
  const fulfillResponse = await client.fulfillEscrowTerm(
    createdEscrow.id,
    "33333333-3333-3333-3333-333333333333",
    {
      termType: "meeting_delivery",
      data: {
        buyer_latitude: 0.312,
        buyer_longitude: 32.582,
        device_info: { platform: "web" },
      },
    }
  );
  const reverseResponse = await client.reverseEscrow(createdEscrow.id, {
    reason: "Buyer cancelled order",
  });
  const disputeResponse = await client.disputeEscrow(createdEscrow.id, {
    reason: "Goods not delivered",
    initiatorRole: "sender",
  });

  assert.equal(fetchedEscrow.currencyCode, "UGX");
  assert.equal(escrowStatus.buyerInfo.phoneNumber, "+256700000000");
  assert.equal(releaseResponse.escrowId, createdEscrow.id);
  assert.equal(fulfillResponse.requiresOtherParty, true);
  assert.equal(reverseResponse.status, "reversed");
  assert.equal(disputeResponse.initiatorRole, "sender");

  assert.deepEqual(calls[0].body, {
    receiver_id: "22222222-2222-2222-2222-222222222222",
    amount: "50000",
    currency_code: "UGX",
    payment_method: "mtn",
    terms: [{ type: "manual_release", data: {} }],
    user_info: {
      email: "buyer@example.com",
      phone_number: "+256700000000",
      otp: "123456",
    },
  });
  assert.equal(calls[4].body.term_type, "meeting_delivery");
  assert.equal(calls[6].body.initiator_role, "sender");
});

test("disbursement helpers cover create, detail, list, and cancel", async () => {
  const calls = [];
  const client = new PiaxisClient({
    apiKey: "test_api_key",
    baseUrl: "https://sandbox.api.gopiaxis.com/api",
    fetch: createMockFetch(
      [
        fixtures.disbursement_create.response,
        fixtures.disbursement_detail.response,
        fixtures.disbursement_list.response,
        fixtures.disbursement_cancel.response,
      ],
      calls
    ),
  });

  const disbursement = await client.disburse({
    currency: "UGX",
    paymentMethod: "airtel",
    description: "Weekly supplier payout",
    recipients: [
      {
        recipientId: "recipient-001",
        amount: "100000",
        reference: "supplier-001",
      },
      {
        phoneNumber: "+256711111111",
        amount: "50000",
        reference: "supplier-002",
      },
    ],
  });
  const detail = await client.getDisbursement(disbursement.disbursementId);
  const list = await client.listDisbursements({ status: "pending", limit: 20, offset: 0 });
  const cancelled = await client.cancelDisbursement(disbursement.disbursementId, {
    reason: "Merchant cancelled batch",
  });

  assert.equal(detail.paymentMethod, "airtel");
  assert.equal(list.results[0].disbursementId, disbursement.disbursementId);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(calls[0].body.recipients[1].phone_number, "+256711111111");
});

test("escrow disbursement helpers cover create, detail, list, release, and cancel", async () => {
  const calls = [];
  const client = new PiaxisClient({
    apiKey: "test_api_key",
    baseUrl: "https://sandbox.api.gopiaxis.com/api",
    fetch: createMockFetch(
      [
        fixtures.escrow_disbursement_create.response,
        fixtures.escrow_disbursement_create.response,
        fixtures.escrow_disbursement_list.response,
        fixtures.escrow_disbursement_release.response,
        fixtures.escrow_disbursement_cancel.response,
      ],
      calls
    ),
  });

  const created = await client.escrowDisburse({
    currency: "UGX",
    paymentMethod: "mtn",
    description: "Courier escrow batch",
    userLocation: { latitude: 0.31, longitude: 32.58 },
    recipients: [
      {
        recipientId: "recipient-001",
        amount: "100000",
        reference: "courier-escrow-001",
        terms: [{ type: "manual_release", data: {} }],
      },
      {
        phoneNumber: "+256722222222",
        amount: "150000",
        reference: "courier-escrow-002",
        terms: [{ type: "manual_release", data: {} }],
      },
    ],
  });
  const detail = await client.getEscrowDisbursement(created.disbursementId);
  const list = await client.listEscrowDisbursements({ status: "pending", limit: 20, offset: 0 });
  const released = await client.releaseEscrowDisbursement(created.disbursementId, {
    force: true,
    reason: "Bulk release approved",
  });
  const cancelled = await client.cancelEscrowDisbursement(created.disbursementId, {
    reason: "Merchant cancelled batch",
  });

  assert.equal(detail.escrowItems[0].reference, "courier-escrow-001");
  assert.equal(list.results[0].status, "pending");
  assert.equal(released.releasedCount, 1);
  assert.equal(cancelled.cancellationReason, "Merchant cancelled batch");
  assert.equal(calls[0].body.user_location.latitude, 0.31);
});
