"""Queue and reservation seating must open a clean table ordering session."""
from __future__ import annotations

import unittest
from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    token = security.create_access_token(
        {
            "sub": user.email,
            "tenant_id": user.tenant_id,
            "provider_id": getattr(user, "provider_id", None),
            "token_version": user.token_version,
        },
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}


class TestSeatingActivatesTable(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name=f"Seating Tenant {uuid4().hex[:8]}")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"seating-owner-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="T1",
            token=f"table-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            seat_count=4,
            is_active=False,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)

        paid_order = models.Order(
            tenant_id=tenant.id,
            table_id=table.id,
            status=models.OrderStatus.paid,
            paid_at=table.activated_at,
            payment_method="cash",
        )
        self.session.add(paid_order)
        self.session.commit()
        self.session.refresh(paid_order)
        table.active_order_id = paid_order.id
        self.session.add(table)
        self.session.commit()

        self.tenant_id = tenant.id
        self.table_id = table.id

    def _assert_clean_active_session(self) -> None:
        self.session.expire_all()
        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        assert table is not None
        self.assertTrue(table.is_active)
        self.assertIsNone(table.order_pin)
        self.assertIsNone(table.active_order_id)
        self.assertIsNotNone(table.activated_at)

    def test_queue_seating_activates_table_and_clears_stale_order(self) -> None:
        stale_product = models.Product(
            tenant_id=self.tenant_id,
            name="Stale completed item",
            price_cents=100,
        )
        self.session.add(stale_product)
        self.session.commit()
        self.session.refresh(stale_product)
        stale_order = models.Order(
            tenant_id=self.tenant_id,
            table_id=self.table_id,
            status=models.OrderStatus.completed,
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        self.session.add(stale_order)
        self.session.commit()
        self.session.refresh(stale_order)
        self.session.add(
            models.OrderItem(
                order_id=stale_order.id,
                product_id=stale_product.id,
                product_name="Stale completed item",
                quantity=1,
                price_cents=100,
                status=models.OrderItemStatus.delivered,
            )
        )
        self.session.commit()

        entry = models.GuestQueueEntry(
            tenant_id=self.tenant_id,
            customer_name="Walk-in Party",
            customer_phone="+6590000000",
            party_size=2,
            status=models.GuestQueueStatus.waiting,
        )
        self.session.add(entry)
        self.session.commit()
        self.session.refresh(entry)

        response = self.client.put(
            f"/queue/{entry.id}/seat",
            headers=self.headers,
            json={"table_id": self.table_id},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "seated")
        self.assertEqual(response.json()["seated_table_id"], self.table_id)
        self._assert_clean_active_session()

        table_status_response = self.client.get("/tables/with-status", headers=self.headers)
        self.assertEqual(table_status_response.status_code, 200, table_status_response.text)
        table_status = next(
            item for item in table_status_response.json() if item["id"] == self.table_id
        )
        self.assertEqual(table_status["payment_summary"]["status"], "none")
        self.assertIsNone(table_status["active_order_id"])

    def test_future_reservation_does_not_block_queue_seating_today(self) -> None:
        future_reservation = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name="Future Booked Party",
            customer_phone="+6590000002",
            reservation_date=date.today() + timedelta(days=7),
            reservation_time=time(19, 0),
            party_size=2,
            status=models.ReservationStatus.booked,
            table_id=self.table_id,
            token=f"reservation-{uuid4().hex}",
        )
        entry = models.GuestQueueEntry(
            tenant_id=self.tenant_id,
            customer_name="Today's Walk-in",
            customer_phone="+6590000003",
            party_size=2,
            status=models.GuestQueueStatus.waiting,
        )
        self.session.add(future_reservation)
        self.session.add(entry)
        self.session.commit()
        self.session.refresh(entry)

        response = self.client.put(
            f"/queue/{entry.id}/seat",
            headers=self.headers,
            json={"table_id": self.table_id},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "seated")
        self.assertEqual(response.json()["seated_table_id"], self.table_id)

    def test_same_day_reservation_blocks_queue_seating(self) -> None:
        same_day_reservation = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name="Today's Booked Party",
            customer_phone="+6590000004",
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            party_size=2,
            status=models.ReservationStatus.booked,
            table_id=self.table_id,
            token=f"reservation-{uuid4().hex}",
        )
        entry = models.GuestQueueEntry(
            tenant_id=self.tenant_id,
            customer_name="Conflicting Walk-in",
            customer_phone="+6590000005",
            party_size=2,
            status=models.GuestQueueStatus.waiting,
        )
        self.session.add(same_day_reservation)
        self.session.add(entry)
        self.session.commit()
        self.session.refresh(entry)

        response = self.client.put(
            f"/queue/{entry.id}/seat",
            headers=self.headers,
            json={"table_id": self.table_id},
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(response.json()["detail"], "Table is already reserved")

    def test_reservation_seating_activates_table_and_clears_stale_order(self) -> None:
        reservation = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name="Booked Party",
            customer_phone="+6590000001",
            reservation_date=date.today(),
            reservation_time=time(19, 0),
            party_size=2,
            status=models.ReservationStatus.booked,
            token=f"reservation-{uuid4().hex}",
        )
        self.session.add(reservation)
        self.session.commit()
        self.session.refresh(reservation)

        response = self.client.put(
            f"/reservations/{reservation.id}/seat",
            headers=self.headers,
            json={"table_id": self.table_id},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "seated")
        self.assertEqual(response.json()["table_id"], self.table_id)
        self._assert_clean_active_session()

        table_status_response = self.client.get("/tables/with-status", headers=self.headers)
        self.assertEqual(table_status_response.status_code, 200, table_status_response.text)
        table_status = next(
            item for item in table_status_response.json() if item["id"] == self.table_id
        )
        self.assertEqual(table_status["operational_status"], "occupied")
        self.assertTrue(table_status["is_active"])
        self.assertIsNone(table_status["active_order_id"])
        self.assertEqual(
            table_status["seated_reservation"],
            {
                "reservation_id": reservation.id,
                "customer_name": "Booked Party",
                "party_size": 2,
            },
        )


if __name__ == "__main__":
    unittest.main()
