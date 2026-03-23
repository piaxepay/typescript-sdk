import { PiaxisClient } from "@piaxis/sdk";

const baseUrl =
  process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api";

const authClient = new PiaxisClient({ baseUrl });

const authorizeUrl = authClient.buildAuthorizeUrl({
  merchantId: process.env.PIAXIS_MERCHANT_ID,
  externalUserId: "customer-123",
  redirectUri: process.env.PIAXIS_REDIRECT_URI,
});

console.log("Redirect the customer to:", authorizeUrl);

const tokens = await authClient.exchangeToken({
  code: process.env.PIAXIS_AUTH_CODE,
  redirectUri: process.env.PIAXIS_REDIRECT_URI,
  clientId: process.env.PIAXIS_OAUTH_CLIENT_ID,
  clientSecret: process.env.PIAXIS_OAUTH_CLIENT_SECRET,
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
