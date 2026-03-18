import os

from piaxis_sdk import PiaxisClient


piaxis = PiaxisClient(
    api_key=os.environ["PIAXIS_API_KEY"],
    base_url=os.getenv("PIAXIS_API_BASE_URL", "https://sandbox.api.gopiaxis.com/api"),
)

disbursement = piaxis.disburse(
    recipients=[
        {
            "recipient_id": os.environ["PIAXIS_REGISTERED_RECIPIENT_ID"],
            "amount": "100000",
            "reference": "supplier-001",
        },
        {
            "phone_number": "+256711111111",
            "amount": "50000",
            "reference": "supplier-002",
        },
    ],
    currency="UGX",
    payment_method="airtel",
    description="Weekly supplier payout",
)

print("Direct disbursement:", disbursement)

escrow_batch = piaxis.escrow_disburse(
    recipients=[
        {
            "recipient_id": os.environ["PIAXIS_REGISTERED_RECIPIENT_ID"],
            "amount": "100000",
            "reference": "courier-escrow-001",
            "terms": [{"type": "manual_release", "data": {}}],
        },
        {
            "phone_number": "+256722222222",
            "amount": "150000",
            "reference": "courier-escrow-002",
            "terms": [{"type": "manual_release", "data": {}}],
        },
    ],
    currency="UGX",
    payment_method="mtn",
    description="Courier escrow batch",
    user_location={"latitude": 0.312, "longitude": 32.582},
)

print("Escrow disbursement:", escrow_batch)
