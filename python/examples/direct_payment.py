import os

from piaxis_sdk import PiaxisClient


piaxis = PiaxisClient(
    api_key=os.environ["PIAXIS_API_KEY"],
    base_url=os.getenv("PIAXIS_API_BASE_URL", "https://sandbox.api.gopiaxis.com/api"),
)

otp = piaxis.request_otp(
    {
        "email": "buyer@example.com",
        "phone_number": "+256700000000",
    }
)
print("OTP dispatch result:", otp)

payment = piaxis.create_payment(
    {
        "amount": "15000",
        "currency": "UGX",
        "payment_method": "mtn",
        "user_info": {
            "email": "buyer@example.com",
            "phone_number": "+256700000000",
            "otp": os.getenv("PIAXIS_TEST_OTP", "123456"),
        },
        "customer_pays_fees": True,
    }
)

print(payment)
