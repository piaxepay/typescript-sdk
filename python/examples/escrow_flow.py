import os

from piaxis_sdk import PiaxisClient


piaxis = PiaxisClient(
    api_key=os.environ["PIAXIS_API_KEY"],
    base_url=os.getenv("PIAXIS_API_BASE_URL", "https://sandbox.api.gopiaxis.com/api"),
)

piaxis.request_otp(
    {
        "email": "buyer@example.com",
        "phone_number": "+256700000000",
    }
)

escrow = piaxis.create_escrow(
    {
        "receiver_id": os.environ["PIAXIS_RECEIVER_ID"],
        "amount": "50000",
        "currency_code": "UGX",
        "payment_method": "mtn",
        "user_info": {
            "email": "buyer@example.com",
            "phone_number": "+256700000000",
            "otp": os.getenv("PIAXIS_TEST_OTP", "123456"),
        },
        "terms": [{"type": "manual_release", "data": {}}],
    }
)

status = piaxis.get_escrow_status(escrow["id"])
print("Escrow status:", status)

released = piaxis.release_escrow(
    escrow["id"],
    payload={"force": True, "reason": "Sandbox manual release"},
)

print(released)
