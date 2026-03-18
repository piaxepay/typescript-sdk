import os

from piaxis_sdk import PiaxisClient


base_url = os.getenv("PIAXIS_API_BASE_URL", "https://sandbox.api.gopiaxis.com/api")

auth_client = PiaxisClient(base_url=base_url)

authorize_url = auth_client.build_authorize_url(
    merchant_id=os.environ["PIAXIS_MERCHANT_ID"],
    external_user_id="customer-123",
    redirect_uri=os.environ["PIAXIS_REDIRECT_URI"],
)

print("Redirect the customer to:", authorize_url)

tokens = auth_client.exchange_token(
    code=os.environ["PIAXIS_AUTH_CODE"],
    redirect_uri=os.environ["PIAXIS_REDIRECT_URI"],
    client_id=os.environ["PIAXIS_OAUTH_CLIENT_ID"],
    client_secret=os.environ["PIAXIS_OAUTH_CLIENT_SECRET"],
)

payer_client = PiaxisClient(
    access_token=tokens["access_token"],
    base_url=base_url,
)

payment = payer_client.create_payment(
    {
        "amount": "15000",
        "currency": "UGX",
        "payment_method": "piaxis_external",
        "recipient_id": os.environ.get("PIAXIS_RECIPIENT_ID"),
        "customer_pays_fees": True,
    }
)

print(payment)
