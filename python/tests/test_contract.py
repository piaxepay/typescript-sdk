from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "src"))

from piaxis_sdk import PiaxisClient  # noqa: E402


FIXTURES = json.loads((ROOT_DIR.parent / "contracts" / "payment-api-fixtures.json").read_text())


class FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.headers: dict[str, str] = {}

    def json(self) -> dict:
        return self._payload

    @property
    def text(self) -> str:
        return json.dumps(self._payload)

    @property
    def is_error(self) -> bool:
        return self.status_code >= 400


class FakeHttpxClient:
    def __init__(self, responses: list[dict]) -> None:
        self.responses = list(responses)
        self.calls: list[dict] = []

    def request(self, method, path, params=None, json=None, headers=None, timeout=None):
        self.calls.append(
            {
                "method": method,
                "path": path,
                "params": params,
                "json": json,
                "headers": headers or {},
                "timeout": timeout,
            }
        )
        if not self.responses:
            raise AssertionError(f"No fake response queued for {method} {path}")
        return FakeResponse(self.responses.pop(0))

    def close(self) -> None:
        return None


class ContractTests(unittest.TestCase):
    def test_auth_helpers_cover_authorize_and_token_exchange(self) -> None:
        client = PiaxisClient(base_url="https://sandbox.api.gopiaxis.com/api")
        fake_httpx = FakeHttpxClient(
            [FIXTURES["authorize_test"]["response"], FIXTURES["token"]["response"]]
        )
        client._http._client = fake_httpx

        authorize_url = client.build_authorize_url(
            merchant_id="merchant-123",
            external_user_id="external-user-789",
            redirect_uri="https://merchant.example.com/oauth/callback",
        )
        authorize_response = client.authorize_test(
            merchant_id="merchant-123",
            external_user_id="external-user-789",
            redirect_uri="https://merchant.example.com/oauth/callback",
        )
        token_response = client.exchange_token(
            code="auth-code-123",
            redirect_uri="https://merchant.example.com/oauth/callback",
            client_id="client_123",
            client_secret="secret_456",
        )

        parsed = urlparse(authorize_url)
        self.assertEqual(parsed.path, "/api/authorize")
        self.assertEqual(parse_qs(parsed.query)["merchant_id"], ["merchant-123"])
        self.assertEqual(authorize_response["redirect_url"], FIXTURES["authorize_test"]["response"]["redirect_url"])
        self.assertEqual(token_response["access_token"], FIXTURES["token"]["response"]["access_token"])
        self.assertEqual(fake_httpx.calls[0]["headers"]["x-test-request"], "true")
        self.assertNotIn("api-key", fake_httpx.calls[0]["headers"])
        self.assertEqual(fake_httpx.calls[1]["params"]["grant_type"], "authorization_code")

    def test_payment_and_otp_helpers_match_contract(self) -> None:
        client = PiaxisClient(
            api_key="test_api_key",
            base_url="https://sandbox.api.gopiaxis.com/api",
        )
        fake_httpx = FakeHttpxClient(
            [
                FIXTURES["otp_request"]["response"],
                FIXTURES["payment_create"]["response"],
                FIXTURES["payment_details"]["response"],
                FIXTURES["payment_list"]["response"],
            ]
        )
        client._http._client = fake_httpx

        otp_response = client.request_otp(
            {"email": "buyer@example.com", "phone_number": "+256700000000"}
        )
        payment_response = client.create_payment(
            {
                "amount": "15000",
                "currency": "UGX",
                "payment_method": "mtn",
                "user_info": {
                    "email": "buyer@example.com",
                    "phone_number": "+256700000000",
                    "otp": "123456",
                },
                "customer_pays_fees": True,
            },
            mfa_code="654321",
        )
        payment_details = client.get_payment("pay_123")
        payment_list = client.list_merchant_payments(
            {
                "status": "pending",
                "payment_method": "mtn",
                "limit": 20,
                "offset": 0,
            }
        )

        self.assertEqual(otp_response["verification_methods"]["phone_sent"], True)
        self.assertEqual(payment_response["payment_id"], "pay_123")
        self.assertEqual(payment_details["payment_method"], "mtn")
        self.assertEqual(payment_list["results"][0]["payment_id"], "pay_123")
        self.assertEqual(fake_httpx.calls[0]["headers"]["api-key"], "test_api_key")
        self.assertEqual(fake_httpx.calls[1]["params"]["mfa_code"], "654321")

    def test_escrow_helpers_match_contract(self) -> None:
        client = PiaxisClient(
            api_key="test_api_key",
            base_url="https://sandbox.api.gopiaxis.com/api",
        )
        fake_httpx = FakeHttpxClient(
            [
                FIXTURES["escrow_create"]["response"],
                FIXTURES["escrow_create"]["response"],
                FIXTURES["escrow_status"]["response"],
                FIXTURES["escrow_release"]["response"],
                FIXTURES["escrow_fulfill_term"]["response"],
                FIXTURES["escrow_reverse"]["response"],
                FIXTURES["escrow_dispute"]["response"],
            ]
        )
        client._http._client = fake_httpx

        created = client.create_escrow(
            {
                "receiver_id": "22222222-2222-2222-2222-222222222222",
                "amount": "50000",
                "currency_code": "UGX",
                "payment_method": "mtn",
                "user_info": {
                    "email": "buyer@example.com",
                    "phone_number": "+256700000000",
                    "otp": "123456",
                },
                "terms": [{"type": "manual_release", "data": {}}],
            }
        )
        fetched = client.get_escrow(created["id"])
        status = client.get_escrow_status(created["id"])
        released = client.release_escrow(
            created["id"],
            payload={"force": True, "reason": "Manual merchant release"},
        )
        fulfilled = client.fulfill_escrow_term(
            created["id"],
            "33333333-3333-3333-3333-333333333333",
            {
                "term_type": "meeting_delivery",
                "data": {
                    "buyer_latitude": 0.312,
                    "buyer_longitude": 32.582,
                    "device_info": {"platform": "web"},
                },
            },
        )
        reversed_escrow = client.reverse_escrow(
            created["id"],
            {"reason": "Buyer cancelled order"},
        )
        dispute = client.dispute_escrow(
            created["id"],
            {"reason": "Goods not delivered", "initiator_role": "sender"},
        )

        self.assertEqual(fetched["currency_code"], "UGX")
        self.assertEqual(status["buyer_info"]["phone_number"], "+256700000000")
        self.assertEqual(released["status"], "released")
        self.assertEqual(fulfilled["requires_other_party"], True)
        self.assertEqual(reversed_escrow["status"], "reversed")
        self.assertEqual(dispute["initiator_role"], "sender")
        self.assertEqual(fake_httpx.calls[0]["json"]["terms"][0]["type"], "manual_release")

    def test_disbursement_helpers_match_contract(self) -> None:
        client = PiaxisClient(
            api_key="test_api_key",
            base_url="https://sandbox.api.gopiaxis.com/api",
        )
        fake_httpx = FakeHttpxClient(
            [
                FIXTURES["disbursement_create"]["response"],
                FIXTURES["disbursement_detail"]["response"],
                FIXTURES["disbursement_list"]["response"],
                FIXTURES["disbursement_cancel"]["response"],
                FIXTURES["escrow_disbursement_create"]["response"],
                FIXTURES["escrow_disbursement_create"]["response"],
                FIXTURES["escrow_disbursement_list"]["response"],
                FIXTURES["escrow_disbursement_release"]["response"],
                FIXTURES["escrow_disbursement_cancel"]["response"],
            ]
        )
        client._http._client = fake_httpx

        disbursement = client.disburse(
            recipients=[
                {
                    "recipient_id": "recipient-001",
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
        detail = client.get_disbursement(disbursement["disbursement_id"])
        listing = client.list_disbursements(status="pending", limit=20, offset=0)
        cancelled = client.cancel_disbursement(
            disbursement["disbursement_id"],
            reason="Merchant cancelled batch",
        )

        escrow_batch = client.escrow_disburse(
            recipients=[
                {
                    "recipient_id": "recipient-001",
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
            user_location={"latitude": 0.31, "longitude": 32.58},
        )
        escrow_detail = client.get_escrow_disbursement(escrow_batch["disbursement_id"])
        escrow_listing = client.list_escrow_disbursements(status="pending", limit=20, offset=0)
        released = client.release_escrow_disbursement(
            escrow_batch["disbursement_id"],
            force=True,
            reason="Bulk release approved",
        )
        escrow_cancelled = client.cancel_escrow_disbursement(
            escrow_batch["disbursement_id"],
            reason="Merchant cancelled batch",
        )

        self.assertEqual(detail["payment_method"], "airtel")
        self.assertEqual(listing["results"][0]["status"], "pending")
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(escrow_detail["escrow_items"][0]["reference"], "courier-escrow-001")
        self.assertEqual(escrow_listing["results"][0]["status"], "pending")
        self.assertEqual(released["released_count"], 1)
        self.assertEqual(escrow_cancelled["cancellation_reason"], "Merchant cancelled batch")


if __name__ == "__main__":
    unittest.main()
