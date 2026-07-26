import hashlib
import hmac
import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

import requests
from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import main, models


class TestPaymentSecurity(PgClientTestCase):
    def setUp(self):
        super().setUp()
        self.setup_data()

    def setup_data(self):
        self.tenant = models.Tenant(
            name="Test Restaurant",
            currency_code="SGD",
            currency="$",
            hitpay_api_key="hitpay_test_key",
            hitpay_webhook_salt="hitpay_webhook_salt",
            hitpay_mode="sandbox",
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(self.floor)
        self.session.commit()

        self.table = models.Table(
            name="Take Away",
            tenant_id=self.tenant.id,
            floor_id=self.floor.id,
            is_active=True,
            order_pin="1234",
        )
        self.session.add(self.table)
        self.session.commit()
        self.session.refresh(self.table)

        self.product = models.Product(
            name="Expensive Wine",
            price_cents=10000,
            tenant_id=self.tenant.id,
        )
        self.session.add(self.product)
        self.session.commit()
        self.session.refresh(self.product)

    def _create_order(self) -> int:
        response = self.client.post(
            f"/menu/{self.table.token}/order",
            json={
                "items": [{"product_id": self.product.id, "quantity": 1}],
                "notes": "Expensive Order",
            },
        )
        self.assertEqual(response.status_code, 200)
        order_id = response.json()["order_id"]
        order = self.session.get(models.Order, order_id)
        self.assertIsNotNone(order)
        return order_id

    def _create_order_with_hitpay_request(self, request_id: str = "hp_req_123") -> int:
        order_id = self._create_order()
        order = self.session.get(models.Order, order_id)
        self.assertIsNotNone(order)
        order.hitpay_payment_request_id = request_id
        self.session.add(order)
        self.session.commit()
        return order_id

    def test_hitpay_create_posts_form_payload(self):
        order_id = self._create_order()
        order = self.session.get(models.Order, order_id)
        self.assertIsNotNone(order)

        class _Response:
            status_code = 200
            text = '{"id":"hp_req_123","url":"https://checkout.test"}'

            def raise_for_status(self):
                return None

            def json(self):
                return {"id": "hp_req_123", "url": "https://checkout.test"}

        with patch("app.main.requests.post", return_value=_Response()) as mock_post:
            data = main._hitpay_create_payment_request(
                api_key="hitpay_test_key",
                mode="sandbox",
                amount_cents=10000,
                currency="SGD",
                order=order,
                table=self.table,
                tenant=self.tenant,
                redirect_url="http://testserver/menu/success",
            )

        self.assertEqual(data["id"], "hp_req_123")
        _, kwargs = mock_post.call_args
        self.assertNotIn("json", kwargs)
        self.assertEqual(kwargs["data"]["amount"], "100.00")
        self.assertEqual(kwargs["data"]["currency"], "SGD")
        self.assertEqual(kwargs["data"]["reference_number"], f"pos-order-{order_id}")
        self.assertEqual(kwargs["data"]["allow_repeated_payments"], "false")
        self.assertNotIn("metadata", kwargs["data"])
        self.assertEqual(
            kwargs["headers"]["Content-Type"], "application/x-www-form-urlencoded"
        )

    @patch("app.main._hitpay_create_payment_request")
    def test_create_hitpay_payment_request_success_stores_request_id(self, mock_create):
        order_id = self._create_order()
        mock_create.return_value = {
            "id": "hp_req_created",
            "url": "https://checkout.test/hp_req_created",
        }

        response = self.client.post(
            f"/orders/{order_id}/create-hitpay-payment-request",
            params={"table_token": self.table.token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["checkout_url"], "https://checkout.test/hp_req_created"
        )
        order = self.session.get(models.Order, order_id)
        self.assertEqual(order.hitpay_payment_request_id, "hp_req_created")
        _, kwargs = mock_create.call_args
        self.assertEqual(kwargs["currency"], "SGD")
        self.assertEqual(kwargs["mode"], "sandbox")

    @patch("app.main._hitpay_create_payment_request")
    def test_create_hitpay_payment_request_provider_error_is_not_exposed(self, mock_create):
        order_id = self._create_order()
        provider_response = requests.Response()
        provider_response.status_code = 500
        provider_response._content = b'{"error":"invalid key hitpay_test_key"}'
        mock_create.side_effect = requests.HTTPError(
            "500 Server Error", response=provider_response
        )

        response = self.client.post(
            f"/orders/{order_id}/create-hitpay-payment-request",
            params={"table_token": self.table.token},
        )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"], "HitPay request failed")
        self.assertNotIn("hitpay_test_key", response.text)
        self.assertNotIn("invalid key", response.text)

    @patch("app.main._hitpay_retrieve_payment_request")
    def test_prevent_payment_bypass_amount_mismatch(self, mock_retrieve):
        order_id = self._create_order_with_hitpay_request()
        mock_retrieve.return_value = {
            "id": "hp_req_123",
            "status": "completed",
            "amount": "1.00",
            "currency": "SGD",
            "reference_number": f"pos-order-{order_id}",
        }

        response = self.client.post(
            f"/orders/{order_id}/confirm-hitpay-payment",
            params={"table_token": self.table.token},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("amount does not match", response.json()["detail"])

    @patch("app.main._hitpay_retrieve_payment_request")
    def test_prevent_payment_bypass_order_mismatch(self, mock_retrieve):
        order_id = self._create_order_with_hitpay_request()
        mock_retrieve.return_value = {
            "id": "hp_req_123",
            "status": "completed",
            "amount": "100.00",
            "currency": "SGD",
            "reference_number": "pos-order-9999",
        }

        response = self.client.post(
            f"/orders/{order_id}/confirm-hitpay-payment",
            params={"table_token": self.table.token},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("reference does not belong", response.json()["detail"])

    @patch("app.main._hitpay_retrieve_payment_request")
    def test_payment_success(self, mock_retrieve):
        order_id = self._create_order_with_hitpay_request()
        mock_retrieve.return_value = {
            "id": "hp_req_123",
            "status": "completed",
            "amount": "100.00",
            "currency": "SGD",
            "reference_number": f"pos-order-{order_id}",
        }

        response = self.client.post(
            f"/orders/{order_id}/confirm-hitpay-payment",
            params={"table_token": self.table.token},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "paid")

    @patch("app.main._hitpay_retrieve_payment_request")
    def test_confirm_hitpay_paid_order_is_idempotent(self, mock_retrieve):
        order_id = self._create_order_with_hitpay_request()
        order = self.session.get(models.Order, order_id)
        self.assertIsNotNone(order)
        order.status = models.OrderStatus.paid
        order.paid_at = datetime.now(timezone.utc)
        order.payment_method = "hitpay"
        self.session.add(order)
        self.session.commit()

        response = self.client.post(
            f"/orders/{order_id}/confirm-hitpay-payment",
            params={"table_token": self.table.token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "paid")
        self.assertTrue(response.json()["already_paid"])
        mock_retrieve.assert_not_called()

    def test_hitpay_webhook_replay_is_idempotent(self):
        order_id = self._create_order_with_hitpay_request()
        payload = {
            "id": "hp_req_123",
            "status": "completed",
            "amount": "100.00",
            "currency": "SGD",
            "reference_number": f"pos-order-{order_id}",
        }
        raw_body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(
            b"hitpay_webhook_salt", raw_body, hashlib.sha256
        ).hexdigest()
        headers = {
            "Content-Type": "application/json",
            "Hitpay-Signature": signature,
            "Hitpay-Event-Type": "payment_request.completed",
            "Hitpay-Event-Object": "payment_request",
        }

        first = self.client.post(
            "/payments/hitpay/webhook",
            content=raw_body,
            headers=headers,
        )
        second = self.client.post(
            "/payments/hitpay/webhook",
            content=raw_body,
            headers=headers,
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["status"], "paid")
        self.assertEqual(second.json()["status"], "paid")

        self.session.expire_all()
        order = self.session.get(models.Order, order_id)
        self.assertIsNotNone(order)
        self.assertEqual(order.status, models.OrderStatus.paid)
        self.assertEqual(order.payment_method, "hitpay")

        jobs = self.session.exec(
            select(models.PrintJob).where(models.PrintJob.order_id == order_id)
        ).all()
        customer_receipts = [
            job for job in jobs if job.job_type == "customer_receipt"
        ]
        self.assertEqual(len(customer_receipts), 1)

    def test_hitpay_webhook_unknown_request_id_is_generic_ignored(self):
        payload = {
            "id": "hp_req_unknown",
            "status": "completed",
            "amount": "100.00",
            "currency": "SGD",
        }
        response = self.client.post(
            "/payments/hitpay/webhook",
            json=payload,
            headers={"Hitpay-Signature": "invalid"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ignored"})
        self.assertNotIn("Order not found", response.text)

    def test_public_menu_order_history_does_not_expose_previous_diners(self):
        old_order = models.Order(
            tenant_id=self.tenant.id,
            table_id=self.table.id,
            status=models.OrderStatus.paid,
            payment_method="cash",
        )
        self.session.add(old_order)
        self.session.commit()
        self.session.refresh(old_order)

        self.session.add(
            models.OrderItem(
                order_id=old_order.id,
                product_id=self.product.id,
                product_name=self.product.name,
                quantity=2,
                price_cents=self.product.price_cents,
            )
        )
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}/order-history")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_public_menu_exposes_table_session_marker(self):
        activated_at = datetime(2026, 7, 18, 12, 34, 56, tzinfo=timezone.utc)
        self.table.activated_at = activated_at
        self.session.add(self.table)
        self.session.commit()

        response = self.client.get(f"/menu/{self.table.token}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["table_session_started_at"],
            activated_at.isoformat(),
        )

    def test_customer_qr_rejects_cash_payment_request(self):
        order_id = self._create_order()

        response = self.client.post(
            f"/menu/{self.table.token}/order/{order_id}/request-payment",
            json={"payment_method": "cash", "message": "cash please"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("only support terminal", response.json()["detail"])

    def test_customer_qr_accepts_terminal_payment_request(self):
        order_id = self._create_order()

        response = self.client.post(
            f"/menu/{self.table.token}/order/{order_id}/request-payment",
            json={"payment_method": "card_terminal", "message": "terminal please"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["payment_method"], "terminal")
        order = self.session.get(models.Order, order_id)
        self.assertEqual(order.payment_method, "terminal")
        self.assertIsNotNone(order.bill_requested_at)


if __name__ == "__main__":
    unittest.main()
