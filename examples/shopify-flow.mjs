// Connect a Shopify shop to a Piaxis store and inspect a checkout session.
//
// Prerequisites: the platform has the Shopify integration enabled, and the
// Piaxis store holds the `shopify_payments` entitlement. The connecting user
// must be the store owner.

import { PiaxisClient } from "@piaxis/sdk";

const piaxis = new PiaxisClient({
  accessToken: process.env.PIAXIS_ACCESS_TOKEN, // store owner session
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

// 1. Start the install. paymentMode decides where checkout money goes:
//    "direct" -> straight to store settlement; "escrow" -> held in a Piaxis
//    escrow until the normal release lifecycle completes.
const connect = await piaxis.shopify.connect({
  storeId: process.env.PIAXIS_STORE_ID,
  shopDomain: "your-shop.myshopify.com",
  paymentMode: "direct",
});
console.log("Send the merchant's browser to:", connect.installUrl);

// 2. After the merchant approves on Shopify, the connection activates via the
//    OAuth callback. Buyers then pay on the hosted page at checkout; each
//    payment session can be inspected for support/reporting:
if (process.env.PIAXIS_SHOPIFY_SESSION_ID) {
  const session = await piaxis.shopify.getSession(
    process.env.PIAXIS_SHOPIFY_SESSION_ID
  );
  console.log(
    `Session ${session.sessionId} -> ${session.status} ${session.amount} ${session.currency}`
  );
}

// 3. Disconnect whenever needed; the stored shop token is dropped immediately.
// await piaxis.shopify.disconnect("your-shop.myshopify.com");
