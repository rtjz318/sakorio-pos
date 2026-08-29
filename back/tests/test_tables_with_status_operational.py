"""GET /tables/with-status: service-only operational_status + payment_status."""
from __future__ import annotations

import unittest
from datetime import datetime, timezone
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    from datetime import timedelta

    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestTablesWithStatusOperational(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="OpStatus Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"opstatus-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.owner = owner

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)
        self.floor_id = floor.id

        table = models.Table(
            name="T-op",
            token=f"tok-op-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=4,
            is_active=True,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)
        self.table_id = table.id
        self.tenant_id = tenant.id

        product = models.Product(
            name="Payment summary test item",
            price_cents=1200,
            tenant_id=tenant.id,
        )
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        self.product_id = product.id

    def _row(self) -> dict:
        h = _bearer_headers(self.owner)
        r = self.client.get("/tables/with-status", headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        rows = r.json()
        return next(x for x in rows if x["id"] == self.table_id)

    def _add_item(self, order: models.Order) -> models.OrderItem:
        assert order.id is not None
        item = models.OrderItem(
            order_id=order.id,
            product_id=self.product_id,
            product_name="Payment summary test item",
            quantity=1,
            price_cents=1200,
        )
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def test_open_order_when_preparing(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        row = self._row()
        self.assertEqual(row["operational_status"], "open_order")
        self.assertEqual(row["payment_status"], "none")

    def test_ready_to_serve_when_ready_and_no_bill_request(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
        )
        self.session.add(order)
        self.session.commit()
        row = self._row()
        self.assertEqual(row["operational_status"], "ready_to_serve")
        self.assertEqual(row["payment_status"], "none")

    def test_open_order_and_payment_pending_when_bill_requested_preparing(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
            bill_requested_at=datetime.now(timezone.utc),
            payment_method="terminal",
        )
        self.session.add(order)
        self.session.commit()
        row = self._row()
        self.assertEqual(row["operational_status"], "open_order")
        self.assertEqual(row["payment_status"], "pending")
        self.assertEqual(row["payment_summary"]["status"], "requested")
        self.assertEqual(row["payment_summary"]["method"], "terminal")
        self.assertIsNotNone(row["payment_summary"]["requested_at"])

    def test_ready_to_serve_and_payment_pending_when_ready_and_bill_requested(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        row = self._row()
        self.assertEqual(row["operational_status"], "ready_to_serve")
        self.assertEqual(row["payment_status"], "pending")

    def test_payment_pending_prefers_table_active_order_id_when_multiple_in_flight(self) -> None:
        """Older preparing order without bill must not hide bill/payment on the session order."""
        older = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(older)
        self.session.commit()
        self.session.refresh(older)

        newer = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(newer)
        self.session.commit()
        self.session.refresh(newer)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = newer.id
        self.session.add(table)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["operational_status"], "ready_to_serve")
        self.assertEqual(row["payment_status"], "pending")

    def test_ready_to_serve_and_payment_pending_when_completed_and_bill_requested(self) -> None:
        """All items delivered (completed) but unpaid — bill request must still surface on the floor."""
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.completed,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["operational_status"], "ready_to_serve")
        self.assertEqual(row["payment_status"], "pending")

    def test_payment_pending_after_unmark_paid_when_bill_was_requested(self) -> None:
        """GitHub #190: mark-paid must not wipe bill_requested_at or unmark cannot restore floor chip."""
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.ready,
            bill_requested_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()

        h = _bearer_headers(self.owner)
        r = self.client.put(
            f"/orders/{order.id}/mark-paid",
            json={"payment_method": "cash", "tip_percent": None},
            headers=h,
        )
        self.assertEqual(r.status_code, 200, r.text)
        r2 = self.client.put(f"/orders/{order.id}/unmark-paid", headers=h)
        self.assertEqual(r2.status_code, 200, r2.text)

        row = self._row()
        self.assertEqual(row["payment_status"], "pending")

    def test_payment_paid_when_table_links_paid_order_only(self) -> None:
        """No in-flight kitchen order, but table still references a paid order (session clearing)."""
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.paid,
            paid_at=datetime.now(timezone.utc),
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["operational_status"], "occupied")
        self.assertEqual(row["payment_status"], "paid")
        self.assertEqual(row["payment_summary"]["status"], "paid")
        self.assertEqual(row["payment_summary"]["order_ids"], [order.id])

    def test_payment_summary_unpaid_with_billable_items(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self._add_item(order)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["payment_summary"]["status"], "unpaid")
        self.assertIsNone(row["payment_summary"]["method"])
        self.assertEqual(row["payment_summary"]["order_ids"], [order.id])
        self.assertEqual(row["payment_status"], "none")

    def test_seated_queue_label_is_returned_on_assigned_table(self) -> None:
        queue_entry = models.GuestQueueEntry(
            tenant_id=self.tenant_id,
            customer_name="Queue Party",
            customer_phone="+6592000900",
            party_size=3,
            status=models.GuestQueueStatus.seated,
            seated_table_id=self.table_id,
            seated_at=datetime.now(timezone.utc),
        )
        self.session.add(queue_entry)
        self.session.commit()
        self.session.refresh(queue_entry)

        row = self._row()

        self.assertEqual(row["seated_queue_entry"]["id"], queue_entry.id)
        self.assertEqual(row["seated_queue_entry"]["queue_label"], "Q001")
        self.assertEqual(row["seated_queue_entry"]["customer_name"], "Queue Party")
        self.assertEqual(row["seated_queue_entry"]["party_size"], 3)

    def test_hitpay_request_is_requested_until_verified(self) -> None:
        order = models.Order(
            table_id=self.table_id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.completed,
            hitpay_payment_request_id=f"hp-{uuid4().hex}",
        )
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        self._add_item(order)

        table = self.session.get(models.Table, self.table_id)
        assert table is not None
        table.active_order_id = order.id
        self.session.add(table)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["payment_summary"]["status"], "requested")
        self.assertEqual(row["payment_summary"]["method"], "hitpay")
        self.assertIsNone(row["payment_summary"]["paid_at"])
        self.assertEqual(row["payment_status"], "pending")

    def test_joined_group_unpaid_overrides_paid(self) -> None:
        group = models.TableGroup(tenant_id=self.tenant_id)
        self.session.add(group)
        self.session.commit()
        self.session.refresh(group)

        first = self.session.get(models.Table, self.table_id)
        assert first is not None
        first.table_group_id = group.id

        second = models.Table(
            name="T-op-2",
            token=f"tok-op-{uuid4().hex}",
            floor_id=self.floor_id,
            tenant_id=self.tenant_id,
            table_group_id=group.id,
            is_active=True,
        )
        self.session.add(first)
        self.session.add(second)
        self.session.commit()
        self.session.refresh(second)

        paid_order = models.Order(
            table_id=first.id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.paid,
            paid_at=datetime.now(timezone.utc),
            payment_method="cash",
        )
        unpaid_order = models.Order(
            table_id=second.id,
            tenant_id=self.tenant_id,
            status=models.OrderStatus.preparing,
        )
        self.session.add(paid_order)
        self.session.add(unpaid_order)
        self.session.commit()
        self.session.refresh(paid_order)
        self.session.refresh(unpaid_order)
        self._add_item(paid_order)
        self._add_item(unpaid_order)

        first.active_order_id = paid_order.id
        second.active_order_id = unpaid_order.id
        self.session.add(first)
        self.session.add(second)
        self.session.commit()

        row = self._row()
        self.assertEqual(row["payment_summary"]["status"], "unpaid")
        self.assertEqual(
            row["payment_summary"]["order_ids"],
            sorted([paid_order.id, unpaid_order.id]),
        )


if __name__ == "__main__":
    unittest.main()
