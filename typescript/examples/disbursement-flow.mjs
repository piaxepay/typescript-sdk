import { PiaxisClient } from "@piaxis/sdk";

const piaxis = new PiaxisClient({
  apiKey: process.env.PIAXIS_API_KEY,
  baseUrl: process.env.PIAXIS_API_BASE_URL ?? "https://sandbox.api.gopiaxis.com/api",
});

const disbursement = await piaxis.disburse({
  currency: "UGX",
  paymentMethod: "airtel",
  description: "Weekly supplier payout",
  recipients: [
    {
      recipientId: process.env.PIAXIS_REGISTERED_RECIPIENT_ID,
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

console.log("Direct disbursement:", disbursement);

const escrowBatch = await piaxis.escrowDisburse({
  currency: "UGX",
  paymentMethod: "mtn",
  description: "Courier escrow batch",
  userLocation: {
    latitude: 0.312,
    longitude: 32.582,
  },
  recipients: [
    {
      recipientId: process.env.PIAXIS_REGISTERED_RECIPIENT_ID,
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

console.log("Escrow disbursement:", escrowBatch);
