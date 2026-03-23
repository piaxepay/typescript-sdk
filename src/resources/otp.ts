import { PiaxisHttpClient } from "../http-client";
import {
  asObject,
  booleanValue,
  numberValue,
  optionalString,
} from "../transforms";
import type {
  OtpResponse,
  PiaxisRequestOptions,
  RequestOtpInput,
} from "../types";

export class OtpResource {
  constructor(private readonly http: PiaxisHttpClient) {}

  async request(
    input: RequestOtpInput,
    requestOptions?: PiaxisRequestOptions
  ): Promise<OtpResponse> {
    const response = await this.http.post<unknown>(
      "/request-otp",
      {
        email: input.email,
        phone_number: input.phoneNumber,
      },
      requestOptions
    );

    return normalizeOtpResponse(response);
  }
}

function normalizeOtpResponse(payload: unknown): OtpResponse {
  const data = asObject(payload);
  const verificationMethods = asObject(data.verification_methods);

  return {
    verificationMethods: {
      emailSent: booleanValue(verificationMethods.email_sent),
      phoneSent: booleanValue(verificationMethods.phone_sent),
    },
    expiresIn: numberValue(data.expires_in),
    otp: optionalString(data.otp),
  };
}
