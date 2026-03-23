import { PiaxisClient } from "@piaxis/sdk";

const piaxis = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

const otp = await piaxis.requestOtp({
  email: "buyer@example.com",
  phoneNumber: "+256700000000",
});

console.log("OTP dispatch result:", otp);

const payment = await piaxis.createPayment({
  amount: "15000",
  currency: "UGX",
  paymentMethod: "mtn",
  userInfo: {
    email: "buyer@example.com",
    phone_number: "+256700000000",
    otp: process.env.PIAXIS_TEST_OTP ?? "123456",
  },
  customerPaysFees: true,
});

console.log(payment);
