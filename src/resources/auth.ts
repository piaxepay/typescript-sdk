import { PiaxisHttpClient } from "../http-client";
import { asObject, numberValue, stringValue } from "../transforms";
import type {
  AuthorizeTestResponse,
  OAuthAuthorizeParams,
  PiaxisRequestOptions,
  TokenExchangeInput,
  TokenResponse,
} from "../types";

export class AuthResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  buildAuthorizeUrl(params: OAuthAuthorizeParams): string {
    validateRedirectUri(params.redirectUri);
    return this.http.buildUrl("/authorize", {
      merchant_id: params.merchantId,
      external_user_id: params.externalUserId,
      redirect_uri: params.redirectUri,
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod,
    });
  }

  async authorizeTest(
    params: OAuthAuthorizeParams,
    requestOptions?: PiaxisRequestOptions
  ): Promise<AuthorizeTestResponse> {
    validateRedirectUri(params.redirectUri);
    const response = await this.http.get<unknown>(
      "/authorize",
      {
        merchant_id: params.merchantId,
        external_user_id: params.externalUserId,
        redirect_uri: params.redirectUri,
        state: params.state,
        code_challenge: params.codeChallenge,
        code_challenge_method: params.codeChallengeMethod,
      },
      {
        ...requestOptions,
        headers: {
          ...requestOptions?.headers,
          "x-test-request": "true",
        },
      }
    );

    return normalizeAuthorizeTestResponse(response);
  }

  async exchangeToken(
    input: TokenExchangeInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<TokenResponse> {
    validateRedirectUri(input.redirectUri);
    const response = await this.http.postForm<unknown>(
      "/token",
      {
        grant_type: input.grantType ?? "authorization_code",
        code: input.code,
        redirect_uri: input.redirectUri,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code_verifier: input.codeVerifier,
      },
      requestOptions
    );

    return normalizeTokenResponse(response);
  }

  async refreshToken(
    input: Pick<TokenExchangeInput, "refreshToken" | "clientId" | "clientSecret">,
    requestOptions?: PiaxisRequestOptions
  ): Promise<TokenResponse> {
    const response = await this.http.postForm<unknown>(
      "/token",
      {
        grant_type: "refresh_token",
        refresh_token: input.refreshToken,
        client_id: input.clientId,
        client_secret: input.clientSecret,
      },
      requestOptions
    );

    return normalizeTokenResponse(response);
  }
}

function validateRedirectUri(redirectUri: string): void {
  const url = new URL(redirectUri);
  if (url.protocol === "https:") {
    return;
  }

  const localhostHosts = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
  if (url.protocol === "http:" && localhostHosts.has(url.hostname)) {
    return;
  }

  throw new Error("redirectUri must use HTTPS unless targeting localhost.");
}

function normalizeAuthorizeTestResponse(payload: unknown): AuthorizeTestResponse {
  const data = asObject(payload);
  const tokenParameters = asObject(data.token_parameters);

  return {
    redirectUrl: stringValue(data.redirect_url),
    code: stringValue(data.code),
    nextStep: stringValue(data.next_step),
    tokenParameters: {
      grantType: stringValue(tokenParameters.grant_type || "authorization_code"),
      code: stringValue(tokenParameters.code),
      redirectUri: stringValue(tokenParameters.redirect_uri),
      clientId: stringValue(tokenParameters.client_id),
      clientSecret: stringValue(tokenParameters.client_secret),
    },
  };
}

export function normalizeTokenResponse(payload: unknown): TokenResponse {
  const data = asObject(payload);

  return {
    accessToken: stringValue(data.access_token),
    tokenType: stringValue(data.token_type),
    expiresIn: numberValue(data.expires_in),
    refreshToken: stringValue(data.refresh_token),
  };
}
