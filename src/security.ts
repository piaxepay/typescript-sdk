import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface VerifyWebhookSignatureOptions {
  rawBody: string | Uint8Array;
  secret: string;
  signature?: string | null;
  signatureV2?: string | null;
  timestamp?: string | number | null;
  toleranceSeconds?: number;
}

export function generatePkcePair(): PkcePair {
  const codeVerifier = base64Url(randomBytes(48));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}

export function verifyWebhookSignature(options: VerifyWebhookSignatureOptions): boolean {
  const bodyBuffer = normalizeBody(options.rawBody);
  const toleranceSeconds = options.toleranceSeconds ?? 300;

  if (options.signatureV2) {
    if (options.timestamp === undefined || options.timestamp === null || options.timestamp === "") {
      return false;
    }
    const timestamp = Number(options.timestamp);
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    if (toleranceSeconds > 0 && Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds) {
      return false;
    }

    const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), bodyBuffer]);
    const expectedV2 = createHmac("sha256", options.secret).update(signedPayload).digest("hex");
    return safeEqual(expectedV2, options.signatureV2);
  }

  if (!options.signature) {
    return false;
  }

  const expected = createHmac("sha256", options.secret).update(bodyBuffer).digest("hex");
  return safeEqual(expected, options.signature);
}

function normalizeBody(rawBody: string | Uint8Array): Uint8Array {
  if (typeof rawBody === "string") {
    return Buffer.from(rawBody, "utf8");
  }
  return Buffer.from(rawBody);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function base64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
