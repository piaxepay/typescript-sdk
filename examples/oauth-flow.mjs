import crypto from "node:crypto";
import { PiaxisClient, generatePkcePair } from "@piaxis/sdk";

const baseUrl =
  process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api";

const authClient = new PiaxisClient({ baseUrl });
const pkce = generatePkcePair();
const oauthState = crypto.randomBytes(18).toString("hex");

const authorizeUrl = authClient.buildAuthorizeUrl({
  merchantId: process.env.PIAXIS_MERCHANT_ID,
  externalUserId: "customer-123",
  redirectUri: process.env.PIAXIS_REDIRECT_URI,
  state: oauthState,
  codeChallenge: pkce.codeChallenge,
  codeChallengeMethod: pkce.codeChallengeMethod,
});

console.log("Redirect the customer to:", authorizeUrl);

const tokens = await authClient.exchangeToken({
  code: process.env.PIAXIS_AUTH_CODE,
  redirectUri: process.env.PIAXIS_REDIRECT_URI,
  clientId: process.env.PIAXIS_OAUTH_CLIENT_ID,
  clientSecret: process.env.PIAXIS_OAUTH_CLIENT_SECRET,
  codeVerifier: pkce.codeVerifier,
});

const payerClient = new PiaxisClient({
  accessToken: tokens.accessToken,
  baseUrl,
});

const payment = await payerClient.createPayment({
  amount: "15000",
  currency: "UGX",
  paymentMethod: "piaxis_external",
  recipientId: process.env.PIAXIS_RECIPIENT_ID,
  customerPaysFees: true,
});

console.log(payment);
