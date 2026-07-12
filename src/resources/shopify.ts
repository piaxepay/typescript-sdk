import { PiaxisHttpClient } from "../http-client";
import { asObject, optionalString, stringValue } from "../transforms";
import type {
  PiaxisRequestOptions,
  ShopifyConnectInput,
  ShopifyConnectResponse,
  ShopifyDisconnectResponse,
  ShopifySessionStatus,
} from "../types";

/**
 * Shopify Payments App integration helpers.
 *
 * Merchant-side lifecycle for connecting a Shopify shop to a Piaxis store.
 * The integration is additive and gated server-side: the platform must have
 * Shopify enabled and the store must hold the `shopify_payments` entitlement.
 *
 * The webhook and OAuth-callback endpoints are Shopify-facing and are not
 * exposed here; the buyer's hosted payment page drives its own session calls.
 */
export class ShopifyResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  /**
   * Begin the install for a shop. Send the merchant's browser to the
   * returned `installUrl` (Shopify's authorize page). `paymentMode` chooses
   * where collected money goes: "direct" (store settlement) or "escrow"
   * (held in a Piaxis escrow until release).
   */
  async connect(
    input: ShopifyConnectInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<ShopifyConnectResponse> {
    const response = await this.http.post<unknown>(
      "/platforms/shopify/connect",
      {
        store_id: input.storeId,
        shop_domain: input.shopDomain,
        payment_mode: input.paymentMode,
      },
      requestOptions
    );
    const data = asObject(response);
    return {
      installUrl: stringValue(data.install_url),
      shopDomain: stringValue(data.shop_domain),
      paymentMode: stringValue(data.payment_mode),
    };
  }

  /** Revoke the integration for a shop; its stored token is dropped. */
  async disconnect(
    shopDomain: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<ShopifyDisconnectResponse> {
    const response = await this.http.request<unknown>(
      "DELETE",
      `/platforms/shopify/connect/${encodeURIComponent(shopDomain)}`,
      { ...requestOptions }
    );
    const data = asObject(response);
    return {
      shopDomain: stringValue(data.shop_domain),
      status: stringValue(data.status),
    };
  }

  /**
   * Public status of one payment session (support/reporting) — the same
   * public-safe shape the hosted payment page consumes.
   */
  async getSession(
    sessionId: string,
    requestOptions?: PiaxisRequestOptions
  ): Promise<ShopifySessionStatus> {
    const response = await this.http.get<unknown>(
      `/platforms/shopify/sessions/${encodeURIComponent(sessionId)}`,
      undefined,
      requestOptions
    );
    const data = asObject(response);
    return {
      sessionId: stringValue(data.session_id),
      status: stringValue(data.status),
      amount: stringValue(data.amount),
      currency: stringValue(data.currency),
      storeName: optionalString(data.store_name) ?? null,
      shopDomain: stringValue(data.shop_domain),
      testMode: Boolean(data.test_mode),
      methods: Array.isArray(data.methods) ? data.methods.map(String) : [],
      rejectReason: optionalString(data.reject_reason) ?? null,
    };
  }
}
