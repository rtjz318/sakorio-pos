"""Cashier POS lifecycle acceptance tests for one table and one shared bill."""
from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlmodel import select

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestCashierOrderLifecycle(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Cashier Lifecycle Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"cashier-lifecycle-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("secret"),
            full_name="Cashier Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

        floor = models.Floor(name="Main Floor", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="Table 1",
            token=f"cashier-table-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=4,
            is_active=False,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        self.table_id = table.id

        product = models.Product(
            name="Cashier Test Bowl",
            price_cents=1450,
            tenant_id=tenant.id,
        )
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        self.product_id = product.id

    def _add_item(self) -> dict:
        response = self.client.post(
            "/orders/staff",
            json={
                "table_id": self.table_id,
                "items": [
                    {
                        "product_id": self.product_id,
                        "quantity": 1,
                        "source": "product",
                    }
                ],
            },
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _table_status(self) -> dict:
        response = self.client.get("/tables/with-status", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        return next(row for row in response.json() if row["id"] == self.table_id)

    def test_cashier_reuses_one_bill_until_payment_then_clears_table(self) -> None:
        activate = self.client.post(
            f"/tables/{self.table_id}/activate",
            headers=self.headers,
        )
        self.assertEqual(activate.status_code, 200, activate.text)
        self.assertIsNone(activate.json()["active_order_id"])

        first = self._add_item()
        self.assertEqual(first["status"], "created")
        order_id = first["order_id"]

        second = self._add_item()
        self.assertEqual(second["status"], "updated")
        self.assertEqual(second["order_id"], order_id)

        listed = self.client.get("/orders", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        listed_order = next(row for row in listed.json() if row["id"] == order_id)
        self.assertTrue(listed_order["table_is_active"])
        self.assertEqual(listed_order["table_active_order_id"], order_id)
        self.assertTrue(listed_order["is_current_table_session"])

        orders = self.session.exec(
            select(models.Order).where(models.Order.table_id == self.table_id)
        ).all()
        self.assertEqual(len(orders), 1)

        items = self.session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == order_id)
        ).all()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].quantity, 2)

        open_status = self._table_status()
        self.assertEqual(open_status["active_order_id"], order_id)
        self.assertEqual(open_status["operational_status"], "open_order")
        self.assertEqual(open_status["payment_status"], "none")

        paid = self.client.put(
            f"/orders/{order_id}/mark-paid",
            json={"payment_method": "cash", "tip_percent": None},
            headers=self.headers,
        )
        self.assertEqual(paid.status_code, 200, paid.text)

        paid_status = self._table_status()
        self.assertEqual(paid_status["active_order_id"], order_id)
        self.assertEqual(paid_status["payment_status"], "paid")

        close = self.client.post(
            f"/tables/{self.table_id}/close",
            headers=self.headers,
        )
        self.assertEqual(close.status_code, 200, close.text)

        available_status = self._table_status()
        self.assertFalse(available_status["is_active"])
        self.assertIsNone(available_status["active_order_id"])
        self.assertEqual(available_status["operational_status"], "available")

    def test_close_table_blocks_unpaid_current_session_tickets(self) -> None:
        activate = self.client.post(
            f"/tables/{self.table_id}/activate",
            headers=self.headers,
        )
        self.assertEqual(activate.status_code, 200, activate.text)

        order = self._add_item()
        order_id = order["order_id"]

        close = self.client.post(
            f"/tables/{self.table_id}/close",
            headers=self.headers,
        )
        self.assertEqual(close.status_code, 400, close.text)
        detail = close.json()["detail"]
        self.assertEqual(detail["code"], "table_has_unpaid_orders")
        self.assertIn(order_id, detail["order_ids"])

        still_open = self._table_status()
        self.assertTrue(still_open["is_active"])
        self.assertEqual(still_open["active_order_id"], order_id)

    def test_multiple_tickets_stay_current_until_table_close(self) -> None:
        activate = self.client.post(
            f"/tables/{self.table_id}/activate",
            headers=self.headers,
        )
        self.assertEqual(activate.status_code, 200, activate.text)

        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        activated_at = table.activated_at or datetime.now(timezone.utc)
        first_order = models.Order(
            table_id=self.table_id,
            tenant_id=table.tenant_id,
            status=models.OrderStatus.pending,
            created_at=activated_at + timedelta(minutes=1),
        )
        second_order = models.Order(
            table_id=self.table_id,
            tenant_id=table.tenant_id,
            status=models.OrderStatus.preparing,
            created_at=activated_at + timedelta(minutes=2),
        )
        self.session.add(first_order)
        self.session.add(second_order)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                order_id=first_order.id,
                product_id=self.product_id,
                product_name="First round",
                quantity=1,
                price_cents=1000,
            )
        )
        self.session.add(
            models.OrderItem(
                order_id=second_order.id,
                product_id=self.product_id,
                product_name="Second round",
                quantity=1,
                price_cents=1200,
            )
        )
        table.active_order_id = second_order.id
        self.session.add(table)
        self.session.commit()

        listed = self.client.get("/orders", headers=self.headers)
        self.assertEqual(listed.status_code, 200, listed.text)
        rows = {row["id"]: row for row in listed.json()}
        self.assertTrue(rows[first_order.id]["is_current_table_session"])
        self.assertTrue(rows[second_order.id]["is_current_table_session"])
        self.assertEqual(rows[first_order.id]["table_active_order_id"], second_order.id)
        self.assertEqual(rows[second_order.id]["table_active_order_id"], second_order.id)

        paid_at = datetime.now(timezone.utc)
        first_order.status = models.OrderStatus.paid
        first_order.paid_at = paid_at
        second_order.status = models.OrderStatus.paid
        second_order.paid_at = paid_at
        self.session.add(first_order)
        self.session.add(second_order)
        self.session.commit()

        close = self.client.post(
            f"/tables/{self.table_id}/close",
            headers=self.headers,
        )
        self.assertEqual(close.status_code, 200, close.text)

        relisted = self.client.get("/orders", headers=self.headers)
        self.assertEqual(relisted.status_code, 200, relisted.text)
        closed_rows = {row["id"]: row for row in relisted.json()}
        self.assertFalse(closed_rows[first_order.id]["is_current_table_session"])
        self.assertFalse(closed_rows[second_order.id]["is_current_table_session"])


if __name__ == "__main__":
    unittest.main()
