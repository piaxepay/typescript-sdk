# Piaxis Python SDK

Official Python SDK scaffold for the Piaxis partner API.

## Install

```bash
pip install piaxis-sdk
```

## Quick start

```python
from piaxis_sdk import PiaxisClient

client = PiaxisClient(api_key="your_api_key")

result = client.disburse(
    recipients=[
        {
            "phone_number": "+256700000000",
            "amount": "15000",
            "reference": "vendor-payout-001",
        }
    ],
    currency="UGX",
    payment_method="airtel",
    description="Weekly vendor settlement",
)
```

```python
from piaxis_sdk import PiaxisClient

client = PiaxisClient.from_env()

result = client.escrow_disburse(
    recipients=[
        {
            "recipient_id": "80c989ec-9ce1-4d54-a88c-5b8fb7b65014",
            "amount": "25000",
            "reference": "courier-escrow-001",
            "terms": [
                {
                    "type": "manual_release",
                    "data": {},
                }
            ],
        }
    ],
    currency="UGX",
    payment_method="mtn",
    description="Courier escrow batch",
)
```

## Supported operations

Full public `paymentAPI` coverage:

- Auth: `build_authorize_url(...)`, `authorize_test(...)`, `exchange_token(...)`
- Escrows: `create_escrow(...)`, `get_escrow(...)`, `get_escrow_status(...)`, `release_escrow(...)`, `fulfill_escrow_term(...)`, `reverse_escrow(...)`, `dispute_escrow(...)`
- OTP: `request_otp(...)`
- Payments: `create_payment(...)`, `get_payment(...)`, `list_merchant_payments(...)`
- Disbursements: `disburse(...)`, `disbursements.get(...)`, `disbursements.list(...)`, `disbursements.cancel(...)`
- Escrow disbursements: `escrow_disburse(...)`, `escrow_disbursements.get(...)`, `escrow_disbursements.list(...)`, `escrow_disbursements.release(...)`, `escrow_disbursements.cancel(...)`

## Configuration

```python
client = PiaxisClient(
    api_key="your_api_key",
    base_url="https://api.gopiaxis.com/api",
    timeout=30.0,
)
```

Environment-based setup:

```python
client = PiaxisClient.from_env()
```

Supported environment variables:

- `PIAXIS_API_KEY`
- `PIAXIS_ACCESS_TOKEN`
- `PIAXIS_API_BASE_URL`

## Examples

- `examples/oauth_flow.py`
- `examples/direct_payment.py`
- `examples/escrow_flow.py`
- `examples/disbursement_flow.py`

## Contract tests

```bash
python3 -m compileall src
python3 -m unittest discover -s tests -p "test_*.py"
```
