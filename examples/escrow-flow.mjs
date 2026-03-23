import { PiaxisClient } from "@piaxis/sdk";

const piaxis = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

await piaxis.requestOtp({
  email: "buyer@example.com",
  phoneNumber: "+256700000000",
});

const escrow = await piaxis.createEscrow({
  receiverId: process.env.PIAXIS_RECEIVER_ID,
  amount: "50000",
  currencyCode: "UGX",
  paymentMethod: "mtn",
  userInfo: {
    email: "buyer@example.com",
    phone_number: "+256700000000",
    otp: process.env.PIAXIS_TEST_OTP ?? "123456",
  },
  terms: [
    {
      type: "manual_release",
      data: {},
    },
  ],
});

const status = await piaxis.getEscrowStatus(escrow.id);
console.log("Escrow status:", status);

const released = await piaxis.releaseEscrow(escrow.id, {
  force: true,
  reason: "Sandbox manual release",
});

console.log(released);
